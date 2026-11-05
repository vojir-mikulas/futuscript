//! Analýza projekce přes Oxc a přepis reaktivních proměnných na signály.
//!
//! Oxc vyřeší scope, takže víme, který identifikátor opravdu odkazuje na `M104` stav
//! (a ne třeba na stejně pojmenovaný parametr funkce). Výstupem jsou textové úpravy.
//!
//! | Zdroj              | Výstup                                  |
//! |--------------------|-----------------------------------------|
//! | `M104 x = v`       | `const x = __f.signal(v)`               |
//! | `M105 x = e`       | `const x = __f.computed(() => (e))`     |
//! | `M98 x = d`        | `const x = __f.computed(() => __props.x ?? (d))` |
//! | čtení `x`          | `x.get()`                               |
//! | `x = e`, `x += e`  | `x.set(e)`, `x.set(x.get() + (e))`      |
//! | `M106 { … }`       | `__f.userEffect(() => { … });`          |

use std::collections::{HashMap, HashSet};

use oxc::allocator::Allocator;
use oxc::ast::ast::*;
use oxc::ast_visit::{Visit, walk};
use oxc::parser::Parser;
use oxc::semantic::{Scoping, SemanticBuilder, SymbolId};
use oxc::span::{GetSpan, SourceType, Span};

use crate::diagnostic::Diagnostic;
use crate::projection::Projection;
use crate::setup::{DeclKind, Setup};
use crate::template::Projected;

#[derive(Debug, Clone)]
pub struct Edit {
    pub start: usize,
    pub end: usize,
    pub text: String,
}

impl Edit {
    fn new(start: u32, end: u32, text: impl Into<String>) -> Self {
        Self { start: start as usize, end: end as usize, text: text.into() }
    }
}

#[derive(Debug, Default)]
pub struct Rewritten {
    pub edits: Vec<Edit>,
    /// Importy ze setupu, které se přesunou na úroveň modulu.
    pub hoisted: Vec<String>,
}

pub fn analyze(
    proj: &Projection,
    setup: &Setup,
    setup_end: usize,
    tpl: &Projected,
    dev: bool,
    diags: &mut Vec<Diagnostic>,
) -> Rewritten {
    let text = proj.text.as_str();
    let allocator = Allocator::default();
    let ret = Parser::new(&allocator, text, SourceType::ts()).parse();
    if !ret.diagnostics.is_empty() {
        for e in ret.diagnostics {
            diags.push(from_oxc(&e, proj));
        }
        return Rewritten::default();
    }
    let program = ret.program;
    let semantic = SemanticBuilder::new().with_check_syntax_error(true).build(&program);
    if !semantic.diagnostics.is_empty() {
        for e in semantic.diagnostics {
            diags.push(from_oxc(&e, proj));
        }
        return Rewritten::default();
    }
    let scoping = semantic.semantic.scoping();

    let mut out = Rewritten::default();
    let mut reactive: HashMap<SymbolId, DeclKind> = HashMap::new();
    let decl_at: HashMap<usize, _> = setup.decls.iter().map(|d| (d.proj_start, d)).collect();
    let mut found = HashSet::new();
    let mut errors: Vec<(Span, String)> = Vec::new();

    for stmt in &program.body {
        let span = stmt.span();
        if span.start as usize >= setup_end {
            break;
        }
        match stmt {
            Statement::ImportDeclaration(_) => {
                out.hoisted.push(span.source_text(text).to_string());
                out.edits.push(Edit::new(span.start, span.end, ""));
            }
            Statement::ExportNamedDeclaration(_)
            | Statement::ExportDefaultDeclaration(_)
            | Statement::ExportAllDeclaration(_) => errors.push((
                span,
                "export v (<extruderInitialization>) nedává smysl, sdílený kód dej do .ts souboru".into(),
            )),
            Statement::VariableDeclaration(v) => {
                let Some(g) = decl_at.get(&(v.span.start as usize)) else { continue };
                found.insert(g.proj_start);
                let code_span = g.code_span;
                let code = g.kind.code();
                if v.declarations.len() != 1 {
                    diags.push(Diagnostic::new(
                        format!("jeden {code} = jedna proměnná, rozděl to na víc řádků"),
                        code_span.0,
                        code_span.1,
                    ));
                    continue;
                }
                let d = &v.declarations[0];
                let BindingPattern::BindingIdentifier(id) = &d.id else {
                    diags.push(Diagnostic::new(
                        format!("destrukturování u {code} zatím Slicer neumí"),
                        code_span.0,
                        code_span.1,
                    ));
                    continue;
                };
                let Some(symbol) = id.symbol_id.get() else { continue };
                reactive.insert(symbol, g.kind);
                let name = id.name.as_str();
                let generic = d
                    .type_annotation
                    .as_ref()
                    .map(|t| format!("<{}>", t.type_annotation.span().source_text(text)))
                    .unwrap_or_default();
                match (g.kind, &d.init) {
                    (DeclKind::State, Some(init)) => {
                        wrap(&mut out.edits, v.span, init.span(), format!("const {name} = __f.signal{generic}("), ")")
                    }
                    // Konec deklarátoru, ne celé deklarace: ta může spolknout `;` za hranicí setupu.
                    (DeclKind::State, None) => out.edits.push(Edit::new(
                        v.span.start,
                        d.span.end,
                        format!("const {name} = __f.signal{generic}(undefined)"),
                    )),
                    (DeclKind::Derived, Some(init)) => wrap(
                        &mut out.edits,
                        v.span,
                        init.span(),
                        format!("const {name} = __f.computed{generic}(() => ("),
                        "))",
                    ),
                    (DeclKind::Derived, None) => diags.push(
                        Diagnostic::new("M105 potřebuje výraz", code_span.0, code_span.1)
                            .with_help(format!("M105 {name} = …")),
                    ),
                    (DeclKind::Prop, Some(init)) => wrap(
                        &mut out.edits,
                        v.span,
                        init.span(),
                        format!("const {name} = __f.computed{generic}(() => __props.{name} ?? ("),
                        "))",
                    ),
                    (DeclKind::Prop, None) => out.edits.push(Edit::new(
                        v.span.start,
                        d.span.end,
                        format!("const {name} = __f.computed{generic}(() => __props.{name})"),
                    )),
                    (DeclKind::EachItem, _) => unreachable!("položky each nejsou G-kódové deklarace"),
                }
            }
            _ => {}
        }
    }

    // Položky z (<each>) jsou signály: najdeme jejich symboly podle pozice v projekci.
    let each_at: HashSet<u32> = tpl.each_items.iter().map(|p| *p as u32).collect();
    for symbol in scoping.symbol_ids() {
        if each_at.contains(&scoping.symbol_span(symbol).start) {
            reactive.insert(symbol, DeclKind::EachItem);
        }
    }

    let unresolved = scoping.root_unresolved_references();
    for (name, pos) in &tpl.components {
        if unresolved.contains_key(name.as_str()) {
            diags.push(
                Diagnostic::new(format!("komponenta `{name}` není importovaná"), *pos, pos + name.len())
                    .with_help(format!("přidej do (<extruderInitialization>): import {name} from \"./{name}.fs\"")),
            );
        }
    }

    for g in &setup.decls {
        if !found.contains(&g.proj_start) {
            diags.push(Diagnostic::new(
                format!("{} smí být jen na nejvyšší úrovni (<extruderInitialization>)", g.kind.code()),
                g.code_span.0,
                g.code_span.1,
            ));
        }
    }

    let mut rw = Rewriter { scoping, reactive: &reactive, edits: Vec::new(), errors: Vec::new(), dev };
    rw.visit_program(&program);
    out.edits.extend(rw.edits);
    errors.extend(rw.errors);
    for (span, msg) in errors {
        diags.push(Diagnostic::new(msg, proj.to_src(span.start as usize), proj.to_src(span.end as usize)));
    }

    out.edits.sort_by_key(|e| (e.start, e.end));
    out
}

/// `[stmt.start, inner.start)` → `open`, za `inner` se vloží `close`.
fn wrap(edits: &mut Vec<Edit>, stmt: Span, inner: Span, open: String, close: &str) {
    edits.push(Edit::new(stmt.start, inner.start, open));
    edits.push(Edit::new(inner.end, inner.end, close));
}

/// Aplikuje úpravy v rozsahu `[start, end)` projekce.
pub fn apply(text: &str, edits: &[Edit], start: usize, end: usize) -> String {
    let mut out = String::with_capacity(end - start);
    let mut pos = start;
    for e in edits.iter().filter(|e| e.start >= start && e.start < end || e.start == end && e.end == end) {
        // Úprava přes hranici rozsahu by se jinak potichu ztratila (a vznikl by špatný kód).
        assert!(e.end <= end, "úprava přesahuje rozsah {start}..{end}: {e:?}");
        if e.start < pos {
            debug_assert!(false, "překrývající se úpravy: {e:?}");
            continue;
        }
        out.push_str(&text[pos..e.start]);
        out.push_str(&e.text);
        pos = e.end;
    }
    out.push_str(&text[pos..end]);
    out
}

fn from_oxc(e: &oxc::diagnostics::OxcDiagnostic, proj: &Projection) -> Diagnostic {
    let (start, end) = e
        .labels
        .first()
        .map(|l| (proj.to_src(l.offset() as usize), proj.to_src((l.offset() + l.len()) as usize)))
        .unwrap_or((0, 0));
    let mut d = Diagnostic::new(format!("TypeScript: {}", e.message), start, end);
    if let Some(help) = &e.help {
        d = d.with_help(help.to_string());
    }
    d
}

struct Rewriter<'s> {
    scoping: &'s Scoping,
    reactive: &'s HashMap<SymbolId, DeclKind>,
    edits: Vec<Edit>,
    errors: Vec<(Span, String)>,
    dev: bool,
}

impl Rewriter<'_> {
    fn kind(&self, id: &IdentifierReference) -> Option<DeclKind> {
        let reference = self.scoping.get_reference(id.reference_id.get()?);
        self.reactive.get(&reference.symbol_id()?).copied()
    }

    fn read_only(&mut self, id: &IdentifierReference, kind: DeclKind) {
        let what = match kind {
            DeclKind::Prop => "prop (M98) se nedá přepsat, je jen pro čtení",
            DeclKind::Derived => "M105 je odvozená hodnota, nedá se přepsat",
            DeclKind::EachItem => "položka (<each>) je jen pro čtení, změň místo ní seznam",
            DeclKind::State => unreachable!(),
        };
        self.errors.push((id.span, format!("`{}`: {what}", id.name)));
    }
}

impl<'a> Visit<'a> for Rewriter<'_> {
    // Typy nepřepisujeme (`typeof filter` v typu musí zůstat).
    fn visit_ts_type(&mut self, _: &TSType<'a>) {}

    fn visit_identifier_reference(&mut self, it: &IdentifierReference<'a>) {
        let Some(kind) = self.kind(it) else { return };
        let reference = self.scoping.get_reference(it.reference_id.get().unwrap());
        if reference.is_write() {
            self.errors.push((
                it.span,
                format!("tenhle zápis do {} Slicer zatím neumí, použij `{} = …`", kind.code(), it.name),
            ));
            return;
        }
        self.edits.push(Edit::new(it.span.start, it.span.end, format!("{}.get()", it.name)));
    }

    fn visit_object_property(&mut self, it: &ObjectProperty<'a>) {
        if it.shorthand
            && let Expression::Identifier(id) = &it.value
            && self.kind(id).is_some()
        {
            self.edits.push(Edit::new(it.span.start, it.span.end, format!("{0}: {0}.get()", id.name)));
            return;
        }
        walk::walk_object_property(self, it);
    }

    fn visit_assignment_expression(&mut self, it: &AssignmentExpression<'a>) {
        let AssignmentTarget::AssignmentTargetIdentifier(id) = &it.left else {
            return walk::walk_assignment_expression(self, it);
        };
        let Some(kind) = self.kind(id) else {
            return walk::walk_assignment_expression(self, it);
        };
        if kind != DeclKind::State {
            self.read_only(id, kind);
        } else {
            let name = id.name.as_str();
            let rhs = it.right.span();
            let (open, close) = match it.operator {
                AssignmentOperator::Assign => (format!("{name}.set("), ")"),
                op => {
                    let bin = op
                        .to_binary_operator()
                        .map(|b| b.as_str())
                        .or_else(|| op.to_logical_operator().map(|l| l.as_str()))
                        .unwrap_or("+");
                    (format!("{name}.set({name}.get() {bin} ("), "))")
                }
            };
            self.edits.push(Edit::new(it.span.start, rhs.start, open));
            self.edits.push(Edit::new(rhs.end, it.span.end, close));
        }
        self.visit_expression(&it.right);
    }

    fn visit_update_expression(&mut self, it: &UpdateExpression<'a>) {
        let SimpleAssignmentTarget::AssignmentTargetIdentifier(id) = &it.argument else {
            return walk::walk_update_expression(self, it);
        };
        let Some(kind) = self.kind(id) else {
            return walk::walk_update_expression(self, it);
        };
        if kind != DeclKind::State {
            return self.read_only(id, kind);
        }
        let delta = if it.operator == UpdateOperator::Increment { 1 } else { -1 };
        let postfix = !it.prefix;
        self.edits.push(Edit::new(it.span.start, it.span.end, format!("__f.update({}, {delta}, {postfix})", id.name)));
    }

    fn visit_labeled_statement(&mut self, it: &LabeledStatement<'a>) {
        let body = it.body.span();
        let (open, close) = match it.label.name.as_str() {
            "M106" => ("__f.userEffect(() => ", ");"),
            "M107" => ("__f.onDestroy(() => ", ");"),
            "M600" => ("__f.transition(() => ", ");"),
            "M117" => {
                let Statement::ExpressionStatement(e) = &it.body else {
                    return walk::walk_labeled_statement(self, it);
                };
                let expr = e.expression.span();
                if !self.dev {
                    // M117 je jen pro vývoj, v produkci se vystřihne.
                    self.edits.push(Edit::new(it.span.start, expr.end, ""));
                    return;
                }
                self.edits.push(Edit::new(it.span.start, expr.start, "console.debug("));
                self.edits.push(Edit::new(expr.end, expr.end, ")"));
                self.visit_expression(&e.expression);
                return;
            }
            _ => return walk::walk_labeled_statement(self, it),
        };
        self.edits.push(Edit::new(it.span.start, body.start, open));
        self.edits.push(Edit::new(body.end, it.span.end, close));
        self.visit_statement(&it.body);
    }
}
