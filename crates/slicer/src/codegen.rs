//! Klientský codegen: šablona → přímé DOM operace + jemné efekty (žádný VDOM).

use std::collections::HashMap;
use std::fmt::Write;
use std::path::Path;

use oxc::allocator::Allocator;
use oxc::codegen::Codegen;
use oxc::parser::Parser;
use oxc::semantic::SemanticBuilder;
use oxc::span::SourceType;
use oxc::transformer::{TransformOptions, Transformer};

use crate::diagnostic::Diagnostic;
use crate::template::{AttrValue, ExprId, Node};

pub struct Gen<'a> {
    out: String,
    n: usize,
    scope: Option<&'a str>,
    exprs: &'a [String],
    setters: &'a HashMap<ExprId, String>,
    pub diags: Vec<Diagnostic>,
}

impl<'a> Gen<'a> {
    pub fn new(scope: Option<&'a str>, exprs: &'a [String], setters: &'a HashMap<ExprId, String>) -> Self {
        Self { out: String::new(), n: 0, scope, exprs, setters, diags: Vec::new() }
    }

    pub fn root(mut self, nodes: &[Node]) -> (String, Vec<Diagnostic>) {
        self.children(nodes, "__root");
        (self.out, self.diags)
    }

    fn var(&mut self) -> String {
        self.n += 1;
        format!("__n{}", self.n)
    }

    fn children(&mut self, nodes: &[Node], parent: &str) {
        let last = nodes.len().saturating_sub(1);
        for (i, node) in nodes.iter().enumerate() {
            match node {
                Node::Text(t) => {
                    if let Some(t) = normalize_ws(t, i == 0, i == last) {
                        let _ = writeln!(self.out, "{parent}.append({});", js_str(&t));
                    }
                }
                Node::Expr(id) => {
                    let _ = writeln!(self.out, "__f.insert({parent}, () => ({}));", self.exprs[*id]);
                }
                Node::Element { tag, attrs, children } => self.element(tag, attrs, children, parent),
                Node::If { branches } => {
                    let conds: Vec<String> = branches
                        .iter()
                        .filter_map(|(c, _)| c.map(|id| format!("() => ({})", self.exprs[id])))
                        .collect();
                    let _ = writeln!(self.out, "__f.branch({parent}, [{}], [", conds.join(", "));
                    for (_, children) in branches {
                        let p = self.var();
                        let _ = writeln!(self.out, "({p}) => {{");
                        self.children(children, &p);
                        let _ = writeln!(self.out, "}},");
                    }
                    let _ = writeln!(self.out, "]);");
                }
                Node::Each { head, children, empty } => {
                    let item = &head.item.name;
                    let index = head.index.as_ref().map_or("__i", |i| i.name.as_str());
                    let key = head.key.map_or("null".to_string(), |k| match &head.index {
                        Some(i) => format!("({item}, {}) => ({})", i.name, self.exprs[k]),
                        None => format!("({item}) => ({})", self.exprs[k]),
                    });
                    let p = self.var();
                    let _ = writeln!(
                        self.out,
                        "__f.each({parent}, () => ({}), {key}, ({p}, {item}, {index}) => {{",
                        self.exprs[head.iter]
                    );
                    self.children(children, &p);
                    let _ = write!(self.out, "}}");
                    if let Some(empty) = empty {
                        let q = self.var();
                        let _ = writeln!(self.out, ", ({q}) => {{");
                        self.children(empty, &q);
                        let _ = write!(self.out, "}}");
                    }
                    let _ = writeln!(self.out, ");");
                }
                Node::Component { name, attrs, .. } => {
                    let props: Vec<String> = attrs
                        .iter()
                        .map(|a| match &a.value {
                            AttrValue::Expr(id) => format!("get {}() {{ return ({}); }}", js_str(&a.name), self.exprs[*id]),
                            AttrValue::Static(s) => format!("{}: {}", js_str(&a.name), js_str(s)),
                            AttrValue::Bool => format!("{}: true", js_str(&a.name)),
                        })
                        .collect();
                    let _ = writeln!(self.out, "__f.component({parent}, {name}, {{ {} }});", props.join(", "));
                }
            }
        }
    }

    fn element(&mut self, tag: &str, attrs: &[crate::template::Attr], children: &[Node], parent: &str) {
        let v = self.var();
        let _ = writeln!(self.out, "const {v} = __f.el({});", js_str(tag));
        let mut has_class = false;
        let scope_js = self.scope.map_or("undefined".to_string(), js_str);
        for a in attrs {
            let name = a.name.as_str();
            let expr = |id: &usize| &self.exprs[*id];
            let line = match (&a.value, name) {
                (AttrValue::Expr(id), n) if n.starts_with("bind:") => {
                    let setter = &self.setters[id];
                    format!("__f.bind({v}, {}, () => ({}), {setter});", js_str(&n[5..]), expr(id))
                }
                (AttrValue::Expr(id), n) if n.len() > 2 && n.starts_with("on") => {
                    format!("__f.on({v}, {}, () => ({}));", js_str(&n[2..]), expr(id))
                }
                (AttrValue::Expr(id), "class") => {
                    has_class = true;
                    format!("__f.cls({v}, () => ({}), {scope_js});", expr(id))
                }
                (AttrValue::Static(s), "class") => {
                    has_class = true;
                    let c = self.scope.map_or_else(|| s.clone(), |sc| format!("{s} {sc}"));
                    format!("{v}.className = {};", js_str(c.trim()))
                }
                (AttrValue::Expr(id), n @ ("value" | "checked")) => {
                    format!("__f.prop({v}, {}, () => ({}));", js_str(n), expr(id))
                }
                (AttrValue::Expr(id), n) => format!("__f.attr({v}, {}, () => ({}));", js_str(n), expr(id)),
                (AttrValue::Static(s), n) => format!("{v}.setAttribute({}, {});", js_str(n), js_str(s)),
                (AttrValue::Bool, n) => format!("{v}.setAttribute({}, \"\");", js_str(n)),
            };
            let _ = writeln!(self.out, "{line}");
        }
        if !has_class && let Some(sc) = self.scope {
            let _ = writeln!(self.out, "{v}.className = {};", js_str(sc));
        }
        let _ = writeln!(self.out, "{parent}.append({v});");
        self.children(children, &v);
    }
}

/// Bílé znaky jako v HTML šablonách Svelte/Vue: mezery s odřádkováním mezi tagy zmizí,
/// jinak se sloučí do jedné mezery.
fn normalize_ws(t: &str, first: bool, last: bool) -> Option<String> {
    if t.trim().is_empty() {
        return (!t.contains('\n') && !first && !last).then(|| " ".to_string());
    }
    let mut out = String::with_capacity(t.len());
    let lead = &t[..t.len() - t.trim_start().len()];
    let trail = &t[t.trim_end().len()..];
    if !lead.is_empty() && !lead.contains('\n') && !first {
        out.push(' ');
    }
    let mut prev_ws = false;
    for c in t.trim().chars() {
        if c.is_whitespace() && c != '\u{a0}' {
            if !prev_ws {
                out.push(' ');
            }
            prev_ws = true;
        } else {
            out.push(c);
            prev_ws = false;
        }
    }
    if !trail.is_empty() && !trail.contains('\n') && !last {
        out.push(' ');
    }
    Some(out)
}

pub fn js_str(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{2028}' => out.push_str("\\u2028"),
            '\u{2029}' => out.push_str("\\u2029"),
            c if (c as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// Vygenerovaný TS → JS přes Oxc transformer (odstraní typy) a codegen.
pub fn strip_types(ts: &str) -> Result<String, String> {
    let allocator = Allocator::default();
    let ret = Parser::new(&allocator, ts, SourceType::ts()).parse();
    if !ret.diagnostics.is_empty() {
        return Err(ret.diagnostics.iter().map(ToString::to_string).collect::<Vec<_>>().join("; "));
    }
    let mut program = ret.program;
    let scoping = SemanticBuilder::new().build(&program).semantic.into_scoping();
    let ret = Transformer::new(&allocator, Path::new("model.ts"), &TransformOptions::default())
        .build_with_scoping(scoping, &mut program);
    if !ret.diagnostics.is_empty() {
        return Err(ret.diagnostics.iter().map(ToString::to_string).collect::<Vec<_>>().join("; "));
    }
    Ok(Codegen::new().build(&program).code)
}
