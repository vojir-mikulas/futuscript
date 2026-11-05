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
    each_names: &'a HashMap<usize, Vec<String>>,
    src: &'a str,
    pub diags: Vec<Diagnostic>,
}

const SVG_ROOT: &str = "svg";

impl<'a> Gen<'a> {
    pub fn new(
        scope: Option<&'a str>,
        exprs: &'a [String],
        setters: &'a HashMap<ExprId, String>,
        each_names: &'a HashMap<usize, Vec<String>>,
        src: &'a str,
    ) -> Self {
        Self { out: String::new(), n: 0, scope, exprs, setters, each_names, src, diags: Vec::new() }
    }

    pub fn root(mut self, nodes: &[Node]) -> (String, Vec<Diagnostic>) {
        self.children(nodes, "__root", false);
        (self.out, self.diags)
    }

    fn var(&mut self) -> String {
        self.n += 1;
        format!("__n{}", self.n)
    }

    fn line(&mut self, l: impl AsRef<str>) {
        self.out.push_str(l.as_ref());
        self.out.push('\n');
    }

    fn builder(&mut self, nodes: &[Node], svg: bool) -> String {
        let p = self.var();
        let saved = std::mem::take(&mut self.out);
        self.children(nodes, &p, svg);
        let body = std::mem::replace(&mut self.out, saved);
        format!("({p}) => {{\n{body}}}")
    }

    fn children(&mut self, nodes: &[Node], parent: &str, svg: bool) {
        for node in nodes {
            if let Node::Macro { name, params, children } = node {
                let params = params.map_or(String::new(), |(s, e)| self.src[s..e].to_string());
                let body = self.builder(children, svg);
                self.line(format!("const {} = ({params}) => __f.renderable({body});", name.name));
            }
        }
        let last = nodes.len().saturating_sub(1);
        for (i, node) in nodes.iter().enumerate() {
            match node {
                Node::Macro { .. } => {}
                Node::Local { name, expr, .. } => {
                    self.line(format!("const {} = __f.computed(() => ({}));", name.name, self.exprs[*expr]));
                }
                Node::Text(t) => {
                    if let Some(t) = normalize_ws(t, i == 0, i == last) {
                        self.line(format!("__f.text({parent}, {});", js_str(&t)));
                    }
                }
                Node::Expr(id) => self.line(format!("__f.insert({parent}, () => ({}));", self.exprs[*id])),
                Node::Element { tag, attrs, children } => self.element(tag, attrs, children, parent, svg),
                Node::If { branches } => {
                    let conds: Vec<String> = branches
                        .iter()
                        .filter_map(|(c, _)| c.map(|id| format!("() => ({})", self.exprs[id])))
                        .collect();
                    let builders: Vec<String> = branches.iter().map(|(_, ch)| self.builder(ch, svg)).collect();
                    self.line(format!("__f.branch({parent}, [{}], [{}]);", conds.join(", "), builders.join(", ")));
                }
                Node::Match { subject, cases } => {
                    let subject = &self.exprs[*subject];
                    let conds: Vec<String> = cases
                        .iter()
                        .filter_map(|(c, _)| c.map(|id| format!("() => ({subject}) === ({})", self.exprs[id])))
                        .collect();
                    let builders: Vec<String> = cases.iter().map(|(_, ch)| self.builder(ch, svg)).collect();
                    self.line(format!("__f.branch({parent}, [{}], [{}]);", conds.join(", "), builders.join(", ")));
                }
                Node::Each { head, children, empty } => {
                    let item = &head.item.name;
                    let names = self.each_names.get(&head.item.pos);
                    let index = head.index.as_ref().map_or("__i", |i| i.name.as_str());
                    let key = head.key.map_or("null".to_string(), |k| match &head.index {
                        Some(i) => format!("({item}, {}) => ({})", i.name, self.exprs[k]),
                        None => format!("({item}) => ({})", self.exprs[k]),
                    });
                    let (param, prelude) = match names {
                        Some(names) => {
                            let it = self.var();
                            let defs: String = names
                                .iter()
                                .map(|n| format!("const {n} = __f.computed(() => {{ const {item} = {it}.get(); return {n}; }});\n"))
                                .collect();
                            (it, defs)
                        }
                        None => (item.clone(), String::new()),
                    };
                    let p = self.var();
                    let saved = std::mem::take(&mut self.out);
                    self.out.push_str(&prelude);
                    self.children(children, &p, svg);
                    let body = std::mem::replace(&mut self.out, saved);
                    let empty = empty.as_ref().map(|e| format!(", {}", self.builder(e, svg))).unwrap_or_default();
                    self.line(format!(
                        "__f.each({parent}, () => ({}), {key}, ({p}, {param}, {index}) => {{\n{body}}}{empty});",
                        self.exprs[head.iter]
                    ));
                }
                Node::Component { name, attrs, infill, named, .. } => {
                    let props = self.component_props(attrs, infill, named, svg);
                    self.line(format!("__f.component({parent}, {name}, {props});"));
                }
                Node::Listen { target, attrs } => {
                    for a in attrs {
                        if let AttrValue::Expr(id) = a.value {
                            self.line(format!("__f.on({target}, {}, () => ({}));", js_str(&a.name[2..]), self.exprs[id]));
                        }
                    }
                }
                Node::Layer { body, pending, catch } => {
                    let b = self.builder(body, svg);
                    let p = pending.as_ref().map_or("null".to_string(), |p| self.builder(p, svg));
                    let c = match catch {
                        Some((err, children)) => {
                            let v = self.var();
                            let saved = std::mem::take(&mut self.out);
                            self.children(children, &v, svg);
                            let body = std::mem::replace(&mut self.out, saved);
                            let e = err.as_ref().map_or("__err".to_string(), |b| b.name.clone());
                            format!("({v}, {e}) => {{\n{body}}}")
                        }
                        None => "null".to_string(),
                    };
                    self.line(format!("__f.layer({parent}, {b}, {p}, {c});"));
                }
                Node::Head { children } => {
                    let (title, others) = crate::template::split_title(children);
                    let title = title.map_or("null".to_string(), |t| format!("() => {}", title_expr(&t, self.exprs)));
                    let scope = self.scope.take();
                    let body = self.builder_refs(&others);
                    self.scope = scope;
                    self.line(format!("__f.head({body}, {title});"));
                }
                Node::Portal { target, children } => {
                    let target = target.map_or("document.body".to_string(), |t| format!("({})", self.exprs[t]));
                    let body = self.builder(children, false);
                    self.line(format!("__f.portal(() => {target}, {body});"));
                }
            }
        }
    }

    fn builder_refs(&mut self, nodes: &[&Node]) -> String {
        let p = self.var();
        let saved = std::mem::take(&mut self.out);
        for n in nodes {
            self.children(std::slice::from_ref(*n), &p, false);
        }
        let body = std::mem::replace(&mut self.out, saved);
        format!("({p}) => {{\n{body}}}")
    }

    fn component_props(
        &mut self,
        attrs: &[crate::template::Attr],
        infill: &[Node],
        named: &[(String, Vec<Node>)],
        svg: bool,
    ) -> String {
        let mut sources: Vec<String> = Vec::new();
        let mut fields: Vec<String> = Vec::new();
        let flush = |fields: &mut Vec<String>, sources: &mut Vec<String>| {
            if !fields.is_empty() {
                sources.push(format!("{{ {} }}", fields.join(", ")));
                fields.clear();
            }
        };
        for a in attrs {
            match &a.value {
                AttrValue::Expr(id) => fields.push(format!("get {}() {{ return ({}); }}", js_str(&a.name), self.exprs[*id])),
                AttrValue::Static(s) => fields.push(format!("{}: {}", js_str(&a.name), js_str(s))),
                AttrValue::Bool => fields.push(format!("{}: true", js_str(&a.name))),
                AttrValue::Spread(id) => {
                    flush(&mut fields, &mut sources);
                    sources.push(format!("() => ({})", self.exprs[*id]));
                }
                AttrValue::Use { .. } => self.diags.push(Diagnostic::new(
                    "`use:` patří na element, ne na komponentu",
                    a.span.0,
                    a.span.1,
                )),
            }
        }
        if !infill.is_empty() {
            let b = self.builder(infill, svg);
            fields.push(format!("infill: __f.renderable({b})"));
        }
        for (name, children) in named {
            let b = self.builder(children, svg);
            fields.push(format!("{}: __f.renderable({b})", js_str(name)));
        }
        flush(&mut fields, &mut sources);
        match sources.len() {
            0 => "{}".to_string(),
            1 if !sources[0].starts_with("()") => sources.remove(0),
            _ => format!("__f.props([{}])", sources.join(", ")),
        }
    }

    fn element(&mut self, tag: &str, attrs: &[crate::template::Attr], children: &[Node], parent: &str, svg: bool) {
        let svg = svg || tag == SVG_ROOT;
        let v = self.var();
        let create = if svg { "svg" } else { "el" };
        self.line(format!("const {v} = __f.{create}({parent}, {});", js_str(tag)));

        let scope_js = self.scope.map_or("undefined".to_string(), js_str);
        let static_class = attrs.iter().find_map(|a| match (&a.value, a.name.as_str()) {
            (AttrValue::Static(s), "class") => Some(s.clone()),
            _ => None,
        });
        let dynamic_class = attrs.iter().find_map(|a| match (&a.value, a.name.as_str()) {
            (AttrValue::Expr(id), "class") => Some(self.exprs[*id].clone()),
            _ => None,
        });
        let spreads: Vec<String> = attrs
            .iter()
            .filter_map(|a| if let AttrValue::Spread(id) = a.value { Some(self.exprs[id].clone()) } else { None })
            .collect();

        let base: Vec<String> = [static_class.as_ref().map(|c| js_str(c)), dynamic_class.clone(), self.scope.map(js_str)]
            .into_iter()
            .flatten()
            .collect();
        if !spreads.is_empty() {
            let base = if base.is_empty() { "undefined".to_string() } else { format!("() => __f.clsx([{}])", base.join(", ")) };
            let spread = if spreads.len() == 1 {
                spreads[0].clone()
            } else {
                format!("Object.assign({{}}, {})", spreads.iter().map(|s| format!("({s})")).collect::<Vec<_>>().join(", "))
            };
            self.line(format!("__f.spread({v}, () => ({spread}), {base});"));
        } else if let Some(d) = &dynamic_class {
            let merged = match &static_class {
                Some(sc) => format!("[{}, {d}]", js_str(sc)),
                None => d.clone(),
            };
            self.line(format!("__f.cls({v}, () => ({merged}), {scope_js});"));
        } else {
            let c = [static_class.as_deref(), self.scope].into_iter().flatten().collect::<Vec<_>>().join(" ");
            if !c.is_empty() {
                self.line(format!("{v}.setAttribute(\"class\", {});", js_str(c.trim())));
            }
        }

        for a in attrs {
            let name = a.name.as_str();
            if name == "class" {
                continue;
            }
            let line = match (&a.value, name) {
                (AttrValue::Spread(_), _) => continue,
                (AttrValue::Use { action, params }, _) => match params {
                    Some(p) => format!("__f.use({v}, {}, () => ({}));", self.exprs[*action], self.exprs[*p]),
                    None => format!("__f.use({v}, {});", self.exprs[*action]),
                },
                (AttrValue::Expr(id), "bind:this") => format!("__f.bindThis({v}, {});", self.setters[id]),
                (AttrValue::Expr(id), "bind:group") => {
                    format!("__f.bindGroup({v}, () => ({}), {});", self.exprs[*id], self.setters[id])
                }
                (AttrValue::Expr(id), n) if n.starts_with("bind:") => {
                    format!("__f.bind({v}, {}, () => ({}), {});", js_str(&n[5..]), self.exprs[*id], self.setters[id])
                }
                (AttrValue::Expr(id), n) if n.len() > 2 && n.starts_with("on") => {
                    format!("__f.on({v}, {}, () => ({}));", js_str(&n[2..]), self.exprs[*id])
                }
                (AttrValue::Expr(id), "style") => format!("__f.style({v}, () => ({}));", self.exprs[*id]),
                (AttrValue::Expr(id), n @ ("value" | "checked")) if !svg => {
                    format!("__f.prop({v}, {}, () => ({}));", js_str(n), self.exprs[*id])
                }
                (AttrValue::Expr(id), n) => format!("__f.attr({v}, {}, () => ({}));", js_str(n), self.exprs[*id]),
                (AttrValue::Static(s), n) => format!("{v}.setAttribute({}, {});", js_str(n), js_str(s)),
                (AttrValue::Bool, n) => format!("{v}.setAttribute({}, \"\");", js_str(n)),
            };
            self.line(line);
        }
        self.children(children, &v, svg && tag != "foreignObject");
    }
}

pub(crate) fn title_expr(nodes: &[&Node], exprs: &[String]) -> String {
    let parts: Vec<String> = nodes
        .iter()
        .filter_map(|n| match n {
            Node::Text(t) => Some(js_str(t)),
            Node::Expr(id) => Some(format!("__f.toText({})", exprs[*id])),
            _ => None,
        })
        .collect();
    format!("[{}].join(\"\").replace(/\\s+/g, \" \").trim()", parts.join(", "))
}

pub(crate) fn normalize_ws(t: &str, first: bool, last: bool) -> Option<String> {
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
