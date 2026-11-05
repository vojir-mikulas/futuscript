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
    pub hoisted: Vec<String>,
    pub each_names: HashMap<usize, Vec<String>>,
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
    let mut prop_names: Vec<String> = Vec::new();
    let mut rest_decl: Option<(u32, u32, String)> = None;

    for stmt in &program.body {
        let span = stmt.span();
        if span.start as usize >= setup_end {
            break;
        }
        match stmt {
            Statement::ImportDeclaration(_) => {
                // Poslední příkaz setupu může spolknout `;` oddělovače za ním.
                let span = Span::new(span.start, span.end.min(setup_end as u32));
                out.hoisted.push(span.source_text(text).to_string());
                out.edits.push(Edit::new(span.start, span.end, ""));
            }
            Statement::ExportDeclaration(e) if exports_entries(e) => {
                let span = Span::new(span.start, span.end.min(setup_end as u32));
                out.hoisted.push(span.source_text(text).to_string());
                out.edits.push(Edit::new(span.start, span.end, ""));
            }
            Statement::ExportNamedDeclaration(_)
            | Statement::ExportDeclaration(_)
            | Statement::ExportFromDeclaration(_)
            | Statement::ExportDefaultDeclaration(_)
            | Statement::ExportAllDeclaration(_) => errors.push((
                span,
                "z (<extruderInitialization>) jde exportovat jen `entries` (parametry pro SSG), sdílený kód dej do .ts souboru".into(),
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
                if g.rest {
                    rest_decl = Some((v.span.start, d.span.end, name.to_string()));
                    continue;
                }
                if g.kind == DeclKind::Prop {
                    prop_names.push(name.to_string());
                }
                let generic = d
                    .type_annotation
                    .as_ref()
                    .map(|t| format!("<{}>", t.type_annotation.span().source_text(text)))
                    .unwrap_or_default();
                match (g.kind, &d.init) {
                    (DeclKind::State, Some(init)) => {
                        wrap(&mut out.edits, v.span, init.span(), format!("const {name} = __f.signal{generic}("), ")")
                    }
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

    for symbol in scoping.symbol_ids() {
        let at = scoping.symbol_span(symbol).start as usize;
        if tpl.locals.contains(&at) {
            reactive.insert(symbol, DeclKind::Derived);
            continue;
        }
        if tpl.each_items.iter().any(|&(s, e)| at >= s && at < e) {
            reactive.insert(symbol, DeclKind::EachItem);
            if let Some((s, _)) = tpl.each_patterns.values().find(|&&(s, e)| at >= s && at < e) {
                out.each_names.entry(*s).or_default().push(scoping.symbol_name(symbol).to_string());
            }
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

    if let Some((start, end, name)) = rest_decl {
        let names: Vec<String> = prop_names.iter().map(|n| format!("{n:?}")).collect();
        out.edits.push(Edit::new(
            start,
            end,
            format!("const {name} = __f.computed(() => __f.rest(__props, [{}]))", names.join(", ")),
        ));
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

fn wrap(edits: &mut Vec<Edit>, stmt: Span, inner: Span, open: String, close: &str) {
    edits.push(Edit::new(stmt.start, inner.start, open));
    edits.push(Edit::new(inner.end, inner.end, close));
}

pub fn apply(text: &str, edits: &[Edit], start: usize, end: usize) -> String {
    let mut out = String::with_capacity(end - start);
    let mut pos = start;
    for e in edits.iter().filter(|e| e.start >= start && e.start < end || e.start == end && e.end == end) {
        // Úprava přes hranici by se jinak potichu ztratila.
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

fn exports_entries(e: &ExportDeclaration) -> bool {
    match &e.declaration {
        Declaration::FunctionDeclaration(f) => f.id.as_ref().is_some_and(|id| id.name == "entries"),
        Declaration::VariableDeclaration(v) => v.declarations.iter().all(|d| {
            matches!(&d.id, BindingPattern::BindingIdentifier(id) if id.name == "entries")
        }),
        _ => false,
    }
}

fn member_root<'b, 'a>(e: &'b Expression<'a>) -> Option<&'b IdentifierReference<'a>> {
    match e {
        Expression::Identifier(id) => Some(id),
        Expression::StaticMemberExpression(m) => member_root(&m.object),
        Expression::ComputedMemberExpression(m) => member_root(&m.object),
        _ => None,
    }
}

fn target_root<'b, 'a>(t: &'b AssignmentTarget<'a>) -> Option<&'b IdentifierReference<'a>> {
    match t {
        AssignmentTarget::StaticMemberExpression(m) => member_root(&m.object),
        AssignmentTarget::ComputedMemberExpression(m) => member_root(&m.object),
        _ => None,
    }
}

fn simple_target_root<'b, 'a>(t: &'b SimpleAssignmentTarget<'a>) -> Option<&'b IdentifierReference<'a>> {
    match t {
        SimpleAssignmentTarget::StaticMemberExpression(m) => member_root(&m.object),
        SimpleAssignmentTarget::ComputedMemberExpression(m) => member_root(&m.object),
        _ => None,
    }
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

    /// `form.email = v` na M104 → `__f.mutate(form, () => (form.get().email = v))`.
    fn mutation(&mut self, root: &IdentifierReference, span: Span, walk: impl FnOnce(&mut Self)) {
        match self.kind(root) {
            Some(DeclKind::State) => {
                self.edits.push(Edit::new(span.start, span.start, format!("__f.mutate({}, () => (", root.name)));
                self.edits.push(Edit::new(span.end, span.end, "))"));
            }
            Some(kind) => return self.read_only(root, kind),
            None => {}
        }
        walk(self);
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
    // Typy se nepřepisují (`typeof x` v typu musí zůstat).
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
        if let Some(root) = target_root(&it.left) {
            return self.mutation(root, it.span, |v| walk::walk_assignment_expression(v, it));
        }
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
        if let Some(root) = simple_target_root(&it.argument) {
            return self.mutation(root, it.span, |v| walk::walk_update_expression(v, it));
        }
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
        let open = match it.label.name.as_str() {
            "M106" => Some("__f.userEffect("),
            "M107" => Some("__f.onDestroy("),
            "M600" => Some("__f.transition("),
            _ => None,
        };
        if let (Some(open), Statement::ExpressionStatement(e)) = (open, &it.body) {
            let arrow = e.expression.span();
            self.edits.push(Edit::new(it.span.start, arrow.start, open));
            self.edits.push(Edit::new(arrow.end, arrow.end, ")"));
            self.visit_expression(&e.expression);
            return;
        }
        match it.label.name.as_str() {
            "M141" => {
                let Statement::ExpressionStatement(e) = &it.body else { return };
                self.edits.push(Edit::new(it.span.start, e.expression.span().start, ""));
                self.visit_expression(&e.expression);
            }
            "M117" => {
                let Statement::ExpressionStatement(e) = &it.body else {
                    return walk::walk_labeled_statement(self, it);
                };
                let expr = e.expression.span();
                if !self.dev {
                    self.edits.push(Edit::new(it.span.start, expr.end, ""));
                    return;
                }
                self.edits.push(Edit::new(it.span.start, expr.start, "console.debug("));
                self.edits.push(Edit::new(expr.end, expr.end, ")"));
                self.visit_expression(&e.expression);
            }
            _ => walk::walk_labeled_statement(self, it),
        }
    }
}
