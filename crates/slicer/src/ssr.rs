use std::collections::HashMap;

use crate::codegen::{js_str, normalize_ws};
use crate::template::{Attr, AttrValue, ExprId, Node};

const VOID: &[&str] =
    &["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"];

pub struct Ssr<'a> {
    out: String,
    n: usize,
    scope: Option<&'a str>,
    exprs: &'a [String],
    each_names: &'a HashMap<usize, Vec<String>>,
    src: &'a str,
}

fn esc(s: &str) -> String {
    s.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}

impl<'a> Ssr<'a> {
    pub fn new(
        scope: Option<&'a str>,
        exprs: &'a [String],
        each_names: &'a HashMap<usize, Vec<String>>,
        src: &'a str,
    ) -> Self {
        Self { out: String::new(), n: 0, scope, exprs, each_names, src }
    }

    pub fn root(mut self, nodes: &[Node]) -> String {
        self.children(nodes, "__out");
        self.out
    }

    fn var(&mut self, prefix: &str) -> String {
        self.n += 1;
        format!("__{prefix}{}", self.n)
    }

    fn line(&mut self, l: impl AsRef<str>) {
        self.out.push_str(l.as_ref());
        self.out.push('\n');
    }

    fn builder(&mut self, nodes: &[Node]) -> String {
        let o = self.var("o");
        let saved = std::mem::take(&mut self.out);
        self.children(nodes, &o);
        let body = std::mem::replace(&mut self.out, saved);
        format!("async ({o}) => {{\n{body}}}")
    }

    fn e(&self, id: ExprId) -> &str {
        &self.exprs[id]
    }

    fn children(&mut self, nodes: &[Node], out: &str) {
        for node in nodes {
            if let Node::Macro { name, params, children } = node {
                let params = params.map_or(String::new(), |(s, e)| self.src[s..e].to_string());
                let body = self.builder(children);
                self.line(format!("const {} = ({params}) => __f.renderable({body});", name.name));
            }
        }
        let last = nodes.len().saturating_sub(1);
        for (i, node) in nodes.iter().enumerate() {
            match node {
                Node::Macro { .. } | Node::Listen { .. } | Node::Portal { .. } => {}
                Node::Layer { body, pending, catch } => {
                    // Uvnitř vrstvy platí vlastník vrstvy (její kontext a data), ne komponenty.
                    let own = |b: String| b.replacen("=> {\n", "=> {\nconst __owner = __f.getOwner();\n", 1);
                    let b = own(self.builder(body));
                    let p = pending.as_ref().map_or("null".to_string(), |p| own(self.builder(p)));
                    let c = match catch {
                        Some((err, children)) => {
                            let o = self.var("o");
                            let saved = std::mem::take(&mut self.out);
                            self.children(children, &o);
                            let body = std::mem::replace(&mut self.out, saved);
                            let e = err.as_ref().map_or("__err".to_string(), |b| b.name.clone());
                            format!("async ({o}, {e}) => {{\nconst __owner = __f.getOwner();\n{body}}}")
                        }
                        None => "null".to_string(),
                    };
                    self.line(format!("await __f.layer({out}, __owner, {b}, {p}, {c});\n__f.setOwner(__owner);"));
                }
                Node::Head { children } => {
                    let (title, others) = crate::template::split_title(children);
                    let title = title.map_or("null".to_string(), |t| format!("() => {}", crate::codegen::title_expr(&t, self.exprs)));
                    let o = self.var("o");
                    let scope = self.scope.take();
                    let saved = std::mem::take(&mut self.out);
                    for n in &others {
                        self.children(std::slice::from_ref(*n), &o);
                    }
                    let body = std::mem::replace(&mut self.out, saved);
                    self.scope = scope;
                    self.line(format!("await __f.head(async ({o}) => {{\n{body}}}, {title});\n__f.setOwner(__owner);"));
                }
                Node::Text(t) => {
                    if let Some(t) = normalize_ws(t, i == 0, i == last) {
                        self.line(format!("{out}.push({});", js_str(&esc(&t))));
                    }
                }
                Node::Expr(id) => self.line(format!("{out}.push(await __f.text({}));\n__f.setOwner(__owner);", self.e(*id))),
                Node::Local { name, expr, .. } => {
                    self.line(format!("const {} = __f.computed(() => ({}));", name.name, self.e(*expr)));
                }
                Node::Element { tag, attrs, children } => self.element(tag, attrs, children, out),
                Node::If { branches } => {
                    self.line(format!("{out}.push(\"<!---->\");"));
                    for (i, (cond, children)) in branches.iter().enumerate() {
                        let head = match cond {
                            Some(c) if i == 0 => format!("if ({}) {{", self.e(*c)),
                            Some(c) => format!("else if ({}) {{", self.e(*c)),
                            None => "else {".to_string(),
                        };
                        self.line(head);
                        self.children(children, out);
                        self.line("}");
                    }
                    self.line(format!("{out}.push(\"<!---->\");"));
                }
                Node::Match { subject, cases } => {
                    let m = self.var("m");
                    self.line(format!("{out}.push(\"<!---->\");"));
                    self.line(format!("{{ const {m} = ({});", self.e(*subject)));
                    for (i, (case, children)) in cases.iter().enumerate() {
                        let head = match case {
                            Some(c) => format!("{}if ({m} === ({})) {{", if i == 0 { "" } else { "else " }, self.e(*c)),
                            None if i == 0 => "{".to_string(),
                            None => "else {".to_string(),
                        };
                        self.line(head);
                        self.children(children, out);
                        self.line("}");
                    }
                    self.line("}");
                    self.line(format!("{out}.push(\"<!---->\");"));
                }
                Node::Each { head, children, empty } => {
                    let (any, i, v) = (self.var("any"), self.var("i"), self.var("v"));
                    let item = &head.item.name;
                    let index = head.index.as_ref().map_or("__ix", |x| x.name.as_str());
                    self.line(format!("{{ let {any} = false;"));
                    self.line(format!("for (const [{i}, {v}] of __f.list({})) {{ {any} = true;", self.e(head.iter)));
                    match self.each_names.get(&head.item.pos) {
                        Some(names) => {
                            let it = self.var("it");
                            self.line(format!("const {it} = __f.value({v});"));
                            for n in names {
                                self.line(format!(
                                    "const {n} = __f.computed(() => {{ const {item} = {it}.get(); return {n}; }});"
                                ));
                            }
                        }
                        None => self.line(format!("const {item} = __f.value({v});")),
                    }
                    self.line(format!("const {index} = __f.value({i});"));
                    self.line(format!("{out}.push(\"<!---->\");"));
                    self.children(children, out);
                    self.line(format!("{out}.push(\"<!---->\");"));
                    self.line("}");
                    if let Some(empty) = empty {
                        self.line(format!("if (!{any}) {{ {out}.push(\"<!---->\");"));
                        self.children(empty, out);
                        self.line(format!("{out}.push(\"<!---->\"); }}"));
                    }
                    self.line(format!("{out}.push(\"<!---->\"); }}"));
                }
                Node::Component { name, attrs, infill, named, .. } => {
                    let props = self.component_props(attrs, infill, named);
                    self.line(format!("await __f.component({out}, {name}, {props}, __owner);\n__f.setOwner(__owner);"));
                }
            }
        }
    }

    fn component_props(&mut self, attrs: &[Attr], infill: &[Node], named: &[(String, Vec<Node>)]) -> String {
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
                AttrValue::Expr(id) => fields.push(format!("get {}() {{ return ({}); }}", js_str(&a.name), self.e(*id))),
                AttrValue::Static(s) => fields.push(format!("{}: {}", js_str(&a.name), js_str(s))),
                AttrValue::Bool => fields.push(format!("{}: true", js_str(&a.name))),
                AttrValue::Spread(id) => {
                    flush(&mut fields, &mut sources);
                    sources.push(format!("() => ({})", self.e(*id)));
                }
                AttrValue::Use { .. } => {}
            }
        }
        if !infill.is_empty() {
            let b = self.builder(infill);
            fields.push(format!("infill: __f.renderable({b})"));
        }
        for (name, children) in named {
            let b = self.builder(children);
            fields.push(format!("{}: __f.renderable({b})", js_str(name)));
        }
        flush(&mut fields, &mut sources);
        match sources.len() {
            0 => "{}".to_string(),
            1 if !sources[0].starts_with("()") => sources.remove(0),
            _ => format!("__f.props([{}])", sources.join(", ")),
        }
    }

    fn element(&mut self, tag: &str, attrs: &[Attr], children: &[Node], out: &str) {
        let mut parts: Vec<String> = vec![js_str(&format!("<{tag}"))];
        let static_class = attrs.iter().find_map(|a| match (&a.value, a.name.as_str()) {
            (AttrValue::Static(s), "class") => Some(s.clone()),
            _ => None,
        });
        let dynamic_class = attrs.iter().find_map(|a| match (&a.value, a.name.as_str()) {
            (AttrValue::Expr(id), "class") => Some(self.e(*id).to_string()),
            _ => None,
        });
        let spreads: Vec<String> = attrs
            .iter()
            .filter_map(|a| if let AttrValue::Spread(id) = a.value { Some(self.e(id).to_string()) } else { None })
            .collect();
        let base: Vec<String> = [static_class.as_ref().map(|c| js_str(c)), dynamic_class.clone(), self.scope.map(js_str)]
            .into_iter()
            .flatten()
            .collect();
        if !spreads.is_empty() {
            let spread = if spreads.len() == 1 {
                spreads[0].clone()
            } else {
                format!("Object.assign({{}}, {})", spreads.iter().map(|s| format!("({s})")).collect::<Vec<_>>().join(", "))
            };
            parts.push(format!("__f.spread({spread}, __f.clsx([{}]))", base.join(", ")));
        } else if dynamic_class.is_some() {
            parts.push(format!("__f.attr(\"class\", __f.clsx([{}]) || null)", base.join(", ")));
        } else {
            let c = [static_class.as_deref(), self.scope].into_iter().flatten().collect::<Vec<_>>().join(" ");
            if !c.trim().is_empty() {
                parts.push(js_str(&format!(" class=\"{}\"", esc(c.trim()))));
            }
        }
        let static_value = attrs.iter().find_map(|a| match (&a.value, a.name.as_str()) {
            (AttrValue::Static(s), "value") => Some(s.clone()),
            _ => None,
        });

        for a in attrs {
            let name = a.name.as_str();
            if name == "class" {
                continue;
            }
            match &a.value {
                AttrValue::Spread(_) | AttrValue::Use { .. } => {}
                AttrValue::Static(s) => parts.push(js_str(&format!(" {name}=\"{}\"", esc(s)))),
                AttrValue::Bool => parts.push(js_str(&format!(" {name}"))),
                AttrValue::Expr(id) => {
                    let e = self.e(*id);
                    match name {
                        "bind:this" => {}
                        "bind:value" => parts.push(format!("__f.attr(\"value\", {e})")),
                        "bind:checked" => parts.push(format!("__f.attr(\"checked\", !!({e}))")),
                        "bind:group" => {
                            let v = js_str(static_value.as_deref().unwrap_or(""));
                            parts.push(format!("__f.attr(\"checked\", __f.group({e}, {v}))"));
                        }
                        "style" => parts.push(format!("__f.style({e})")),
                        n if n.len() > 2 && n.starts_with("on") => {}
                        n => parts.push(format!("__f.attr({}, {e})", js_str(n))),
                    }
                }
            }
        }
        parts.push(js_str(">"));
        self.line(format!("{out}.push({});", parts.join(", ")));
        if VOID.contains(&tag.to_ascii_lowercase().as_str()) {
            return;
        }
        self.children(children, out);
        self.line(format!("{out}.push({});", js_str(&format!("</{tag}>"))));
    }
}
