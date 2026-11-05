use std::collections::HashMap;

use crate::blocks::TOP;
use crate::diagnostic::Diagnostic;
use crate::instruction::{self, Kind};
use crate::projection::Projection;
use crate::setup::gcode_prefix;
use crate::suggest;

pub type ExprId = usize;

#[derive(Debug, Clone, Copy)]
pub struct Expr {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug)]
pub enum AttrValue {
    Static(String),
    Expr(ExprId),
    Bool,
    Spread(ExprId),
    Use { action: ExprId, params: Option<ExprId> },
}

#[derive(Debug)]
pub struct Attr {
    pub name: String,
    pub span: (usize, usize),
    pub value: AttrValue,
}

#[derive(Debug)]
pub enum Node {
    Element { tag: String, attrs: Vec<Attr>, children: Vec<Node> },
    Text(String),
    Expr(ExprId),
    If { branches: Vec<(Option<ExprId>, Vec<Node>)> },
    Each { head: EachHead, children: Vec<Node>, empty: Option<Vec<Node>> },
    Component {
        name: String,
        attrs: Vec<Attr>,
        span: (usize, usize),
        infill: Vec<Node>,
        named: Vec<(String, Vec<Node>)>,
    },
    Macro { name: Binding, params: Option<(usize, usize)>, children: Vec<Node> },
    Listen { target: &'static str, attrs: Vec<Attr> },
    Portal { target: Option<ExprId>, children: Vec<Node> },
    Local { name: Binding, ty: Option<(usize, usize)>, expr: ExprId },
    Head { children: Vec<Node> },
    /// `(<layer>)` … `(<pending>)` … `(<catch> err )` … `(</layer>)`
    Layer { body: Vec<Node>, pending: Option<Vec<Node>>, catch: Option<(Option<Binding>, Vec<Node>)> },
    Match { subject: ExprId, cases: Vec<(Option<ExprId>, Vec<Node>)> },
}

#[derive(Debug, Clone)]
pub struct Binding {
    pub name: String,
    pub pos: usize,
}

#[derive(Debug)]
pub struct EachHead {
    pub item: Binding,
    pub index: Option<Binding>,
    pub iter: ExprId,
    pub key: Option<ExprId>,
}

#[derive(Debug, Default)]
pub struct Template {
    pub nodes: Vec<Node>,
    pub exprs: Vec<Expr>,
}

const VOID: &[&str] =
    &["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"];

const INSTRUCTIONS: &[&str] = &[
    "if", "elseif", "else", "each", "empty", "match", "case", "default", "layer", "pending", "catch", "infill",
    "macro", "head", "window", "document", "portal", "procedureDone",
];

const LATER_BLOCKS: &[(&str, &str)] = &[];
const LATER_SEPARATORS: &[&str] = &[];

#[derive(Debug)]
#[allow(clippy::enum_variant_names)]
enum Case {
    Pre,
    Case(ExprId),
    Default,
}

enum Frame {
    Root(Vec<Node>),
    Element { tag: String, attrs: Vec<Attr>, children: Vec<Node>, span: (usize, usize) },
    If { branches: Vec<(Option<ExprId>, Vec<Node>)>, span: (usize, usize), has_else: bool },
    Each { head: EachHead, children: Vec<Node>, empty: Option<Vec<Node>>, span: (usize, usize) },
    Component {
        name: String,
        attrs: Vec<Attr>,
        children: Vec<Node>,
        named: Vec<(String, Vec<Node>)>,
        span: (usize, usize),
    },
    Infill { name: String, children: Vec<Node>, span: (usize, usize) },
    Macro { name: Binding, params: Option<(usize, usize)>, children: Vec<Node>, span: (usize, usize) },
    Portal { target: Option<ExprId>, children: Vec<Node>, span: (usize, usize) },
    Head { children: Vec<Node>, span: (usize, usize) },
    Layer {
        body: Vec<Node>,
        pending: Option<Vec<Node>>,
        catch: Option<(Option<Binding>, Vec<Node>)>,
        span: (usize, usize),
    },
    Match { subject: ExprId, cases: Vec<(Case, Vec<Node>)>, span: (usize, usize) },
    Later { name: String, children: Vec<Node> },
}

struct Parser<'s, 'd> {
    src: &'s str,
    start: usize,
    pos: usize,
    end: usize,
    stack: Vec<Frame>,
    exprs: Vec<Expr>,
    diags: &'d mut Vec<Diagnostic>,
    fatal: bool,
}

pub fn parse(src: &str, range: (usize, usize), diags: &mut Vec<Diagnostic>) -> Template {
    let mut p = Parser {
        src,
        start: range.0,
        pos: range.0,
        end: range.1,
        stack: vec![Frame::Root(Vec::new())],
        exprs: Vec::new(),
        diags,
        fatal: false,
    };
    p.run();
    let nodes = match p.stack.into_iter().next() {
        Some(Frame::Root(nodes)) => nodes,
        _ => Vec::new(),
    };
    Template { nodes, exprs: p.exprs }
}

impl Parser<'_, '_> {
    fn run(&mut self) {
        while self.pos < self.end && !self.fatal {
            if self.at_line_start() && self.line_directive() {
                continue;
            }
            let rest = &self.src[self.pos..self.end];
            if rest.starts_with("<!--") {
                self.comment();
            } else if rest.starts_with("</") {
                self.close_tag();
            } else if rest.starts_with('<') && rest[1..].starts_with(|c: char| c.is_ascii_alphabetic()) {
                self.open_tag();
            } else if rest.starts_with('{') {
                self.interpolation();
            } else {
                self.text();
            }
        }
        if self.fatal {
            return;
        }
        while self.stack.len() > 1 {
            let frame = self.stack.pop().unwrap();
            let d = match frame {
                Frame::Element { tag, span, .. } => {
                    Diagnostic::new(format!("<{tag}> není uzavřený"), span.0, span.1)
                        .with_help(format!("přidej </{tag}>"))
                }
                Frame::If { span, .. } => Diagnostic::new("(<if>) není uzavřené", span.0, span.1)
                    .with_help("přidej (</if>) na konec podmínky"),
                Frame::Each { span, .. } => Diagnostic::new("(<each>) není uzavřené", span.0, span.1)
                    .with_help("přidej (</each>) na konec smyčky"),
                Frame::Component { name, span, .. } => {
                    Diagnostic::new(format!("<{name}> není uzavřená", ), span.0, span.1)
                        .with_help(format!("přidej </{name}> nebo napiš <{name} />"))
                }
                Frame::Infill { span, .. } => Diagnostic::new("(<infill>) není uzavřený", span.0, span.1)
                    .with_help("přidej (</infill>)"),
                Frame::Macro { span, .. } => Diagnostic::new("(<macro>) není uzavřené", span.0, span.1)
                    .with_help("přidej (</macro>)"),
                Frame::Portal { span, .. } => Diagnostic::new("(<portal>) není uzavřený", span.0, span.1)
                    .with_help("přidej (</portal>)"),
                Frame::Head { span, .. } => Diagnostic::new("(<head>) není uzavřený", span.0, span.1)
                    .with_help("přidej (</head>)"),
                Frame::Layer { span, .. } => Diagnostic::new("(<layer>) není uzavřená", span.0, span.1)
                    .with_help("přidej (</layer>)"),
                Frame::Match { span, .. } => Diagnostic::new("(<match>) není uzavřený", span.0, span.1)
                    .with_help("přidej (</match>)"),
                Frame::Later { .. } | Frame::Root(_) => continue,
            };
            self.diags.push(d);
        }
    }

    fn fail(&mut self, d: Diagnostic) {
        self.diags.push(d);
        self.fatal = true;
    }

    fn at_line_start(&self) -> bool {
        self.pos == self.start || self.src.as_bytes()[self.pos - 1] == b'\n'
    }

    fn children(&mut self) -> &mut Vec<Node> {
        match self.stack.last_mut().expect("root frame") {
            Frame::Root(c)
            | Frame::Element { children: c, .. }
            | Frame::Component { children: c, .. }
            | Frame::Infill { children: c, .. }
            | Frame::Macro { children: c, .. }
            | Frame::Portal { children: c, .. }
            | Frame::Head { children: c, .. }
            | Frame::Layer { catch: Some((_, c)), .. }
            | Frame::Layer { catch: None, pending: Some(c), .. }
            | Frame::Layer { catch: None, pending: None, body: c, .. }
            | Frame::Later { children: c, .. } => c,
            Frame::Match { cases, .. } => &mut cases.last_mut().expect("match case").1,
            Frame::If { branches, .. } => &mut branches.last_mut().expect("if branch").1,
            Frame::Each { empty: Some(c), .. } | Frame::Each { children: c, .. } => c,
        }
    }

    fn push(&mut self, node: Node) {
        let children = self.children();
        if let (Node::Text(new), Some(Node::Text(prev))) = (&node, children.last_mut()) {
            prev.push_str(new);
            return;
        }
        children.push(node);
    }

    fn add_expr(&mut self, start: usize, end: usize) -> ExprId {
        let raw = &self.src[start..end];
        let lead = raw.len() - raw.trim_start().len();
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            self.diags.push(Diagnostic::new("tady chybí výraz", start, end));
        }
        self.exprs.push(Expr { start: start + lead, end: start + lead + trimmed.len() });
        self.exprs.len() - 1
    }

    fn line_directive(&mut self) -> bool {
        let line_end = self.src[self.pos..self.end].find('\n').map_or(self.end, |i| self.pos + i);
        let line = self.src[self.pos..line_end].trim_end_matches('\r');
        let t = line.trim_start();
        let t_start = self.pos + (line.len() - t.len());
        let next = if line_end < self.end { line_end + 1 } else { line_end };

        if t.starts_with("(<") {
            self.instruction(t, t_start);
            self.pos = next;
            return true;
        }
        if t.starts_with("\\(<") {
            self.push(Node::Text(format!("{}(<", &line[..line.len() - t.len()])));
            self.pos = t_start + 3;
            return true;
        }
        if let Some(g) = gcode_prefix(t.trim_end()) {
            let code_end = t_start + g.len;
            if g.code != "M105" || g.module {
                self.diags.push(
                    Diagnostic::new("v šabloně smí být jen lokální M105", t_start, code_end)
                        .with_help("M105 overdue = todo.due < now"),
                );
            } else {
                self.local(&t[g.len..], code_end, (t_start, code_end));
            }
            self.pos = next;
            return true;
        }
        false
    }

    fn local(&mut self, rest: &str, at: usize, code: (usize, usize)) {
        let rest = strip_line_comment(rest);
        let lead = rest.len() - rest.trim_start().len();
        let decl = rest.trim();
        let start = at + lead;
        let name_len = decl.find(|c: char| !(c.is_alphanumeric() || c == '_' || c == '$')).unwrap_or(decl.len());
        let Some(eq) = find_assign(decl) else {
            return self.diags.push(Diagnostic::new("M105 potřebuje výraz", code.0, code.1).with_help("M105 overdue = todo.due < now"));
        };
        let between = decl[name_len..eq].trim();
        if name_len == 0 || !(between.is_empty() || between.starts_with(':')) {
            return self.diags.push(Diagnostic::new("za M105 čekám `jméno = výraz`", code.0, code.1));
        }
        let ty = between.strip_prefix(':').map(|t| {
            let t = t.trim();
            let s = start + decl[..eq].find(t).unwrap_or(name_len);
            (s, s + t.len())
        });
        let name = Binding { name: decl[..name_len].to_string(), pos: start };
        let expr = self.add_expr(start + eq + 1, start + decl.len());
        self.push(Node::Local { name, ty, expr });
    }

    fn instruction(&mut self, t: &str, t_start: usize) {
        let instr = match instruction::parse(t, t_start) {
            Ok(i) => i,
            Err(d) => return self.diags.push(d),
        };
        let name_span = (instr.name_start, instr.name_end);
        let args_expr = |p: &mut Self| {
            if instr.args.is_empty() {
                p.diags.push(
                    Diagnostic::new(format!("(<{}>) čeká podmínku", instr.name), name_span.0, name_span.1)
                        .with_help(format!("(<{}> user )", instr.name)),
                );
            }
            p.add_expr(instr.args_start, instr.args_start + instr.args.len())
        };

        match (instr.kind, instr.name) {
            (Kind::Open, "if") => {
                let id = args_expr(self);
                self.stack.push(Frame::If { branches: vec![(Some(id), Vec::new())], span: name_span, has_else: false });
            }
            (Kind::Open, name @ ("elseif" | "else")) => {
                if !matches!(self.stack.last(), Some(Frame::If { .. })) {
                    if !matches!(self.stack.last(), Some(Frame::Later { .. })) {
                        self.diags.push(Diagnostic::new(format!("(<{name}>) je mimo (<if>)"), name_span.0, name_span.1));
                    }
                    return;
                }
                let cond = if name == "elseif" {
                    Some(args_expr(self))
                } else {
                    if !instr.args.is_empty() {
                        self.diags.push(
                            Diagnostic::new(
                                "(<else>) nebere podmínku",
                                instr.args_start,
                                instr.args_start + instr.args.len(),
                            )
                            .with_help(format!("mysleli jste (<elseif> {} )?", instr.args)),
                        );
                    }
                    None
                };
                let Some(Frame::If { branches, has_else, .. }) = self.stack.last_mut() else { unreachable!() };
                if *has_else {
                    self.diags.push(Diagnostic::new(
                        format!("(<{name}>) už nemůže být za (<else>)"),
                        name_span.0,
                        name_span.1,
                    ));
                }
                *has_else |= cond.is_none();
                branches.push((cond, Vec::new()));
            }
            (Kind::Open, "each") => match parse_each_head(instr.args, instr.args_start) {
                Ok((item, index, iter, key)) => {
                    let iter = self.add_expr(iter.0, iter.1);
                    let key = key.map(|(s, e)| self.add_expr(s, e));
                    let head = EachHead { item, index, iter, key };
                    self.stack.push(Frame::Each { head, children: Vec::new(), empty: None, span: name_span });
                }
                Err(d) => {
                    self.diags.push(d);
                    self.stack.push(Frame::Later { name: "each".into(), children: Vec::new() });
                }
            },
            (Kind::Open, "empty") => match self.stack.last_mut() {
                Some(Frame::Each { empty, .. }) => {
                    if empty.is_some() {
                        self.diags.push(Diagnostic::new("(<empty>) už v tomhle (<each>) je", name_span.0, name_span.1));
                    }
                    *empty = Some(Vec::new());
                }
                Some(Frame::Later { .. }) => {}
                _ => self.diags.push(Diagnostic::new("(<empty>) patří do (<each>)", name_span.0, name_span.1)),
            },
            (Kind::Close, "each") => match self.stack.pop() {
                Some(Frame::Each { head, children, empty, .. }) => self.push(Node::Each { head, children, empty }),
                Some(Frame::Later { name, .. }) if name == "each" => {}
                Some(other) => {
                    let d = mismatch(&other, "(</each>)", name_span);
                    self.stack.push(other);
                    self.fail(d);
                }
                None => unreachable!(),
            },
            (Kind::Open, "infill") => {
                if !matches!(self.stack.last(), Some(Frame::Component { .. })) {
                    self.diags.push(
                        Diagnostic::new("(<infill>) patří přímo dovnitř komponenty", name_span.0, name_span.1)
                            .with_help("<Card> (<infill> header ) … (</infill>) </Card>"),
                    );
                    return self.stack.push(Frame::Later { name: "infill".into(), children: Vec::new() });
                }
                if !is_ident(instr.args) {
                    return self.diags.push(
                        Diagnostic::new("(<infill>) čeká jméno slotu", name_span.0, name_span.1)
                            .with_help("(<infill> header )"),
                    );
                }
                self.stack.push(Frame::Infill { name: instr.args.to_string(), children: Vec::new(), span: name_span });
            }
            (Kind::Close, "infill") => match self.stack.pop() {
                Some(Frame::Infill { name, children, .. }) => {
                    let Some(Frame::Component { named, .. }) = self.stack.last_mut() else { unreachable!() };
                    named.push((name, children));
                }
                Some(Frame::Later { name, .. }) if name == "infill" => {}
                Some(other) => {
                    let d = mismatch(&other, "(</infill>)", name_span);
                    self.stack.push(other);
                    self.fail(d);
                }
                None => unreachable!(),
            },
            (Kind::Open, "macro") => {
                let name_len = instr.args.find(|c: char| !(c.is_alphanumeric() || c == '_' || c == '$')).unwrap_or(instr.args.len());
                let name = &instr.args[..name_len];
                let rest = instr.args[name_len..].trim();
                if !is_ident(name) || !(rest.is_empty() || rest.starts_with('(') && rest.ends_with(')')) {
                    return self.diags.push(
                        Diagnostic::new("(<macro>) čeká jméno a případně parametry", name_span.0, name_span.1)
                            .with_help("(<macro> row(item: Todo) )"),
                    );
                }
                let params = (!rest.is_empty()).then(|| {
                    let open = instr.args_start + instr.args.find('(').unwrap() + 1;
                    let close = instr.args_start + instr.args.rfind(')').unwrap();
                    (open, close)
                });
                let name = Binding { name: name.to_string(), pos: instr.args_start };
                self.stack.push(Frame::Macro { name, params, children: Vec::new(), span: name_span });
            }
            (Kind::Close, "macro") => match self.stack.pop() {
                Some(Frame::Macro { name, params, children, .. }) => self.push(Node::Macro { name, params, children }),
                Some(other) => {
                    let d = mismatch(&other, "(</macro>)", name_span);
                    self.stack.push(other);
                    self.fail(d);
                }
                None => unreachable!(),
            },
            (Kind::Open, "layer") => {
                if !instr.args.is_empty() {
                    self.diags.push(Diagnostic::new(
                        "atributy vrstvy (heat, host, priorita) přijdou ve fázi 4",
                        instr.args_start,
                        instr.args_start + instr.args.len(),
                    ));
                }
                self.stack.push(Frame::Layer { body: Vec::new(), pending: None, catch: None, span: name_span });
            }
            (Kind::Open, name @ ("pending" | "catch")) => {
                let Some(Frame::Layer { pending, catch, .. }) = self.stack.last_mut() else {
                    return self.diags.push(Diagnostic::new(format!("(<{name}>) patří do (<layer>)"), name_span.0, name_span.1));
                };
                if name == "pending" {
                    if pending.is_some() || catch.is_some() {
                        return self.diags.push(Diagnostic::new("(<pending>) musí být jednou a před (<catch>)", name_span.0, name_span.1));
                    }
                    *pending = Some(Vec::new());
                } else {
                    if catch.is_some() {
                        return self.diags.push(Diagnostic::new("(<catch>) už ve vrstvě je", name_span.0, name_span.1));
                    }
                    let err = (!instr.args.is_empty()).then(|| Binding { name: instr.args.to_string(), pos: instr.args_start });
                    if err.as_ref().is_some_and(|b| !is_ident(&b.name)) {
                        return self.diags.push(Diagnostic::new("(<catch>) bere jen jméno chyby", name_span.0, name_span.1).with_help("(<catch> err )"));
                    }
                    *catch = Some((err, Vec::new()));
                }
            }
            (Kind::Close, "layer") => match self.stack.pop() {
                Some(Frame::Layer { body, pending, catch, .. }) => self.push(Node::Layer { body, pending, catch }),
                Some(other) => {
                    let d = mismatch(&other, "(</layer>)", name_span);
                    self.stack.push(other);
                    self.fail(d);
                }
                None => unreachable!(),
            },
            (Kind::Open, "head") => self.stack.push(Frame::Head { children: Vec::new(), span: name_span }),
            (Kind::Close, "head") => match self.stack.pop() {
                Some(Frame::Head { children, .. }) => self.push(Node::Head { children }),
                Some(other) => {
                    let d = mismatch(&other, "(</head>)", name_span);
                    self.stack.push(other);
                    self.fail(d);
                }
                None => unreachable!(),
            },
            (Kind::Open, "portal") => {
                let target = (!instr.args.is_empty()).then(|| args_expr(self));
                self.stack.push(Frame::Portal { target, children: Vec::new(), span: name_span });
            }
            (Kind::Close, "portal") => match self.stack.pop() {
                Some(Frame::Portal { target, children, .. }) => self.push(Node::Portal { target, children }),
                Some(other) => {
                    let d = mismatch(&other, "(</portal>)", name_span);
                    self.stack.push(other);
                    self.fail(d);
                }
                None => unreachable!(),
            },
            (Kind::Open, "match") => {
                let subject = args_expr(self);
                self.stack.push(Frame::Match { subject, cases: vec![(Case::Pre, Vec::new())], span: name_span });
            }
            (Kind::Open, name @ ("case" | "default")) => {
                if !matches!(self.stack.last(), Some(Frame::Match { .. })) {
                    return self.diags.push(Diagnostic::new(format!("(<{name}>) patří do (<match>)"), name_span.0, name_span.1));
                }
                let case = if name == "case" { Case::Case(args_expr(self)) } else { Case::Default };
                let Some(Frame::Match { cases, .. }) = self.stack.last_mut() else { unreachable!() };
                if cases.iter().any(|(c, _)| matches!(c, Case::Default)) {
                    self.diags.push(Diagnostic::new("za (<default>) už nic dalšího", name_span.0, name_span.1));
                }
                cases.push((case, Vec::new()));
            }
            (Kind::Close, "match") => match self.stack.pop() {
                Some(Frame::Match { subject, cases, span }) => {
                    let mut out = Vec::new();
                    for (case, children) in cases {
                        match case {
                            Case::Pre => {
                                if children.iter().any(|c| !matches!(c, Node::Text(t) if t.trim().is_empty())) {
                                    self.diags.push(Diagnostic::new("obsah (<match>) musí být v (<case>)", span.0, span.1));
                                }
                            }
                            Case::Case(id) => out.push((Some(id), children)),
                            Case::Default => out.push((None, children)),
                        }
                    }
                    self.push(Node::Match { subject, cases: out });
                }
                Some(other) => {
                    let d = mismatch(&other, "(</match>)", name_span);
                    self.stack.push(other);
                    self.fail(d);
                }
                None => unreachable!(),
            },
            (Kind::Standalone, name @ ("window" | "document")) => {
                let target = if name == "window" { "window" } else { "document" };
                let (pos, end) = (self.pos, self.end);
                self.pos = instr.args_start;
                self.end = instr.args_start + instr.args.len();
                let attrs = self.attr_list(name);
                self.pos = pos;
                self.end = end;
                let Some(attrs) = attrs else { return };
                for a in &attrs {
                    if !(a.name.len() > 2 && a.name.starts_with("on") && matches!(a.value, AttrValue::Expr(_))) {
                        self.diags.push(
                            Diagnostic::new(format!("(<{name}>) bere jen eventy, třeba onkeydown={{h}}"), a.span.0, a.span.1),
                        );
                    }
                }
                self.push(Node::Listen { target, attrs });
            }
            (Kind::Close, "if") => match self.stack.pop() {
                Some(Frame::If { branches, .. }) => self.push(Node::If { branches }),
                Some(other) => {
                    let d = mismatch(&other, "(</if>)", name_span);
                    self.stack.push(other);
                    self.fail(d);
                }
                None => unreachable!(),
            },
            (kind, name) if LATER_BLOCKS.iter().any(|(n, _)| *n == name) => match kind {
                Kind::Open | Kind::Standalone => {
                    let when = LATER_BLOCKS.iter().find(|(n, _)| *n == name).map_or("", |(_, w)| w);
                    self.diags.push(Diagnostic::new(
                        format!("(<{name}>) zatím Slicer neumí, přijde {when}"),
                        name_span.0,
                        name_span.1,
                    ));
                    if kind == Kind::Open {
                        self.stack.push(Frame::Later { name: name.to_string(), children: Vec::new() });
                    }
                }
                Kind::Close => {
                    if matches!(self.stack.last(), Some(Frame::Later { name: n, .. }) if n == name) {
                        self.stack.pop();
                    }
                }
            },
            (_, name) if LATER_SEPARATORS.contains(&name) => {
                if !matches!(self.stack.last(), Some(Frame::Later { .. })) {
                    self.diags.push(Diagnostic::new(
                        format!("(<{name}>) zatím Slicer neumí"),
                        name_span.0,
                        name_span.1,
                    ));
                }
            }
            (_, name @ ("window" | "document")) => self.diags.push(
                Diagnostic::new(format!("(<{name}>) je samostatná instrukce"), name_span.0, name_span.1)
                    .with_help(format!("(<{name}> onkeydown={{handleKey}} </{name}>)")),
            ),
            (_, name) if TOP.contains(&name) => self.diags.push(Diagnostic::new(
                format!("(<{name}>) je top-level blok, nemůže být uvnitř (<extrusion>)"),
                name_span.0,
                name_span.1,
            )),
            (_, name) => {
                let d = Diagnostic::new(format!("neznámá instrukce `{name}`"), name_span.0, name_span.1);
                self.diags.push(match suggest::closest(name, INSTRUCTIONS.iter().copied()) {
                    Some(s) => d.with_help(format!("mysleli jste (<{s}>)?")),
                    None => d.with_help("doslovný text začínající `(<` napiš jako \\(<"),
                });
            }
        }
    }

    fn comment(&mut self) {
        match self.src[self.pos..self.end].find("-->") {
            Some(i) => self.pos += i + 3,
            None => {
                let d = Diagnostic::new("komentář není uzavřený", self.pos, self.pos + 4).with_help("přidej -->");
                self.fail(d);
            }
        }
    }

    fn open_tag(&mut self) {
        let lt = self.pos;
        self.pos += 1;
        let tag = self.read_while(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | ':' | '.')).to_string();
        let span = (lt + 1, lt + 1 + tag.len());
        let Some(attrs) = self.attr_list(&tag) else { return };
        let rest = &self.src[self.pos..self.end];
        let self_closing = if rest.starts_with("/>") {
            self.pos += 2;
            true
        } else if rest.starts_with('>') {
            self.pos += 1;
            false
        } else {
            return self.fail(Diagnostic::new(format!("<{tag}> není dokončený, chybí `>`"), span.0, span.1));
        };

        match tag.as_str() {
            "style" => {
                return self.fail(Diagnostic::new("<style> patří do (<filament>)", span.0, span.1));
            }
            "script" => {
                return self.fail(Diagnostic::new("kód patří do (<extruderInitialization>)", span.0, span.1));
            }
            _ => {}
        }
        if tag.starts_with(|c: char| c.is_ascii_uppercase()) {
            for a in &attrs {
                if a.name.starts_with("bind:") {
                    self.diags.push(Diagnostic::new("`bind:` na komponentě zatím Slicer neumí", a.span.0, a.span.1));
                }
            }
            if self_closing {
                self.push(Node::Component { name: tag, attrs, span, infill: Vec::new(), named: Vec::new() });
            } else {
                self.stack.push(Frame::Component { name: tag, attrs, children: Vec::new(), named: Vec::new(), span });
            }
            return;
        }
        for a in &attrs {
            self.check_bind(a);
        }
        if self_closing || VOID.contains(&tag.to_ascii_lowercase().as_str()) {
            self.push(Node::Element { tag, attrs, children: Vec::new() });
        } else {
            self.stack.push(Frame::Element { tag, attrs, children: Vec::new(), span });
        }
    }

    fn attr_list(&mut self, tag: &str) -> Option<Vec<Attr>> {
        let mut attrs = Vec::new();
        loop {
            self.skip_ws();
            let rest = &self.src[self.pos..self.end];
            if rest.is_empty() || rest.starts_with("/>") || rest.starts_with('>') {
                return Some(attrs);
            }
            if rest.starts_with('{') {
                if !self.shorthand_attr(&mut attrs) {
                    return None;
                }
                continue;
            }
            let name_start = self.pos;
            let name =
                self.read_while(|c| !c.is_whitespace() && !matches!(c, '=' | '>' | '/' | '{' | '"' | '\'')).to_string();
            if name.is_empty() {
                let c = rest.chars().next().unwrap();
                self.fail(Diagnostic::new(format!("nečekaný znak `{c}` v <{tag}>"), self.pos, self.pos + c.len_utf8()));
                return None;
            }
            let span = (name_start, self.pos);
            self.skip_ws();
            let mut value = if self.src[self.pos..self.end].starts_with('=') {
                self.pos += 1;
                self.skip_ws();
                self.attr_value()?
            } else {
                AttrValue::Bool
            };
            if let Some(action) = name.strip_prefix("use:") {
                if !is_ident(action) {
                    self.diags.push(Diagnostic::new("`use:` čeká jméno funkce akce", span.0, span.1).with_help("use:magnetic"));
                    continue;
                }
                let action_id = self.add_expr(name_start + 4, span.1);
                value = match value {
                    AttrValue::Expr(id) => AttrValue::Use { action: action_id, params: Some(id) },
                    AttrValue::Bool => AttrValue::Use { action: action_id, params: None },
                    _ => {
                        self.diags.push(Diagnostic::new("parametry akce piš jako výraz: use:x={…}", span.0, span.1));
                        continue;
                    }
                };
            }
            attrs.push(Attr { name, span, value });
        }
    }

    fn check_bind(&mut self, a: &Attr) {
        let Some(what) = a.name.strip_prefix("bind:") else { return };
        if !matches!(what, "value" | "checked" | "group" | "this") {
            self.diags.push(Diagnostic::new(format!("`bind:{what}` zatím Slicer neumí, jen bind:value, bind:checked, bind:group a bind:this"), a.span.0, a.span.1));
            return;
        }
        let AttrValue::Expr(id) = a.value else {
            self.diags.push(
                Diagnostic::new(format!("`bind:{what}` čeká proměnnou"), a.span.0, a.span.1)
                    .with_help(format!("bind:{what}={{draft}}")),
            );
            return;
        };
        let e = self.exprs[id];
        let target = &self.src[e.start..e.end];
        if !is_path(target) {
            self.diags.push(
                Diagnostic::new(format!("`bind:{what}` čeká proměnnou nebo její vlastnost"), e.start, e.end)
                    .with_help("bind:value={draft} nebo bind:value={form.email}"),
            );
        }
    }

    fn shorthand_attr(&mut self, attrs: &mut Vec<Attr>) -> bool {
        let open = self.pos;
        let Some(close) = scan_braces(self.src.as_bytes(), open + 1, self.end) else {
            self.fail(Diagnostic::new("`{` není uzavřená", open, open + 1));
            return false;
        };
        let inner = &self.src[open + 1..close];
        let name = inner.trim();
        self.pos = close + 1;
        if let Some(spread) = name.strip_prefix("...") {
            let at = open + 1 + inner.find("...").unwrap() + 3;
            let id = self.add_expr(at, at + spread.len());
            attrs.push(Attr { name: "...".into(), span: (open, close + 1), value: AttrValue::Spread(id) });
        } else if is_ident(name) {
            let lead = inner.len() - inner.trim_start().len();
            let id = self.add_expr(open + 1 + lead, open + 1 + lead + name.len());
            attrs.push(Attr { name: name.to_string(), span: (open, close + 1), value: AttrValue::Expr(id) });
        } else {
            self.diags.push(
                Diagnostic::new("zkratka {x} bere jen jméno proměnné", open, close + 1)
                    .with_help("jinak napiš atribut celý: name={výraz}"),
            );
        }
        true
    }

    fn attr_value(&mut self) -> Option<AttrValue> {
        let rest = &self.src[self.pos..self.end];
        match rest.chars().next() {
            Some(q @ ('"' | '\'')) => match rest[1..].find(q) {
                Some(i) => {
                    let v = decode_entities(&rest[1..1 + i]);
                    self.pos += i + 2;
                    Some(AttrValue::Static(v))
                }
                None => {
                    self.fail(Diagnostic::new("hodnota atributu není uzavřená", self.pos, self.pos + 1));
                    None
                }
            },
            Some('{') => {
                let open = self.pos;
                match scan_braces(self.src.as_bytes(), open + 1, self.end) {
                    Some(close) => {
                        let id = self.add_expr(open + 1, close);
                        self.pos = close + 1;
                        Some(AttrValue::Expr(id))
                    }
                    None => {
                        self.fail(Diagnostic::new("`{` není uzavřená", open, open + 1));
                        None
                    }
                }
            }
            _ => {
                let v = self.read_while(|c| !c.is_whitespace() && c != '>').to_string();
                Some(AttrValue::Static(v))
            }
        }
    }

    fn close_tag(&mut self) {
        let lt = self.pos;
        self.pos += 2;
        let name = self.read_while(|c| c != '>').trim().to_string();
        let name_span = (lt + 2, lt + 2 + name.len());
        if self.pos < self.end {
            self.pos += 1;
        }
        match self.stack.pop() {
            Some(Frame::Element { tag, attrs, children, .. }) if tag == name => {
                self.push(Node::Element { tag, attrs, children });
            }
            Some(Frame::Component { name: n, attrs, children, named, span }) if n == name => {
                let infill =
                    if children.iter().all(|c| matches!(c, Node::Text(t) if t.trim().is_empty())) { Vec::new() } else { children };
                self.push(Node::Component { name: n, attrs, span, infill, named });
            }
            Some(other) => {
                let d = mismatch(&other, &format!("</{name}>"), name_span);
                self.stack.push(other);
                self.fail(d);
            }
            None => unreachable!(),
        }
    }

    fn interpolation(&mut self) {
        let open = self.pos;
        let Some(close) = scan_braces(self.src.as_bytes(), open + 1, self.end) else {
            return self.fail(Diagnostic::new("`{` není uzavřená", open, open + 1).with_help("doslovnou `{` napiš jako {\"{\"}"));
        };
        let inner = self.src[open + 1..close].trim_start();
        if inner.starts_with('#') || inner.starts_with('@') || inner.starts_with(':') || inner.starts_with('/') {
            self.diags.push(
                Diagnostic::new("tohle je Svelte syntaxe", open, close + 1)
                    .with_help("podmínky a smyčky jsou řádkové instrukce: (<if> x ) … (</if>)"),
            );
        }
        let id = self.add_expr(open + 1, close);
        self.pos = close + 1;
        self.push(Node::Expr(id));
    }

    fn text(&mut self) {
        let start = self.pos;
        let b = self.src.as_bytes();
        self.pos += self.src[self.pos..].chars().next().map_or(1, char::len_utf8);
        while self.pos < self.end {
            let c = b[self.pos];
            if c == b'{' || b[self.pos - 1] == b'\n' {
                break;
            }
            if c == b'<' && b.get(self.pos + 1).is_some_and(|n| n.is_ascii_alphabetic() || *n == b'/' || *n == b'!') {
                break;
            }
            self.pos += 1;
        }
        let t = decode_entities(&self.src[start..self.pos]);
        self.push(Node::Text(t));
    }

    fn skip_ws(&mut self) {
        self.read_while(char::is_whitespace);
    }

    fn read_while(&mut self, f: impl Fn(char) -> bool) -> &str {
        let start = self.pos;
        let len = self.src[start..self.end].find(|c: char| !f(c)).unwrap_or(self.end - start);
        self.pos += len;
        &self.src[start..self.pos]
    }
}

fn mismatch(open: &Frame, found: &str, at: (usize, usize)) -> Diagnostic {
    match open {
        Frame::Element { tag, .. } => {
            Diagnostic::new(format!("tady čekám </{tag}>, ne {found}"), at.0, at.1)
                .with_help(format!("<{tag}> výš ještě není uzavřený"))
        }
        Frame::If { span, .. } => Diagnostic::new("(<if>) není uzavřené", span.0, span.1)
            .with_help(format!("přidej (</if>) před {found}")),
        Frame::Each { span, .. } => Diagnostic::new("(<each>) není uzavřené", span.0, span.1)
            .with_help(format!("přidej (</each>) před {found}")),
        Frame::Component { name, .. } => Diagnostic::new(format!("tady čekám </{name}>, ne {found}"), at.0, at.1)
            .with_help(format!("<{name}> výš ještě není uzavřená")),
        Frame::Infill { span, .. } => Diagnostic::new("(<infill>) není uzavřený", span.0, span.1)
            .with_help(format!("přidej (</infill>) před {found}")),
        Frame::Macro { span, .. } => Diagnostic::new("(<macro>) není uzavřené", span.0, span.1)
            .with_help(format!("přidej (</macro>) před {found}")),
        Frame::Portal { span, .. } => Diagnostic::new("(<portal>) není uzavřený", span.0, span.1)
            .with_help(format!("přidej (</portal>) před {found}")),
        Frame::Head { span, .. } => Diagnostic::new("(<head>) není uzavřený", span.0, span.1)
            .with_help(format!("přidej (</head>) před {found}")),
        Frame::Layer { span, .. } => Diagnostic::new("(<layer>) není uzavřená", span.0, span.1)
            .with_help(format!("přidej (</layer>) před {found}")),
        Frame::Match { span, .. } => Diagnostic::new("(<match>) není uzavřený", span.0, span.1)
            .with_help(format!("přidej (</match>) před {found}")),
        Frame::Later { name, .. } => Diagnostic::new(format!("tady čekám (</{name}>), ne {found}"), at.0, at.1),
        Frame::Root(_) => Diagnostic::new(format!("{found} nic neuzavírá"), at.0, at.1),
    }
}

fn strip_line_comment(s: &str) -> &str {
    let b = s.as_bytes();
    let mut i = 0;
    while i < b.len() {
        match b[i] {
            b'\'' | b'"' => i = skip_string(b, i, b.len()).unwrap_or(b.len()),
            b'`' => i = skip_template(b, i, b.len()).unwrap_or(b.len()),
            b'/' if b.get(i + 1) == Some(&b'/') => return &s[..i],
            _ => {}
        }
        i += 1;
    }
    s
}

/// První `=` přiřazení (ne `==`, `=>`, `<=`, `>=`, `!=`) mimo závorky.
fn find_assign(s: &str) -> Option<usize> {
    let b = s.as_bytes();
    let mut depth = 0i32;
    for i in 0..b.len() {
        match b[i] {
            b'(' | b'[' | b'{' | b'<' => depth += 1,
            b')' | b']' | b'}' => depth -= 1,
            b'>' if i > 0 && b[i - 1] != b'=' => depth -= 1,
            b'=' if depth <= 0
                && !matches!(b.get(i + 1), Some(b'=' | b'>'))
                && !(i > 0 && matches!(b[i - 1], b'=' | b'!' | b'<' | b'>')) =>
            {
                return Some(i);
            }
            _ => {}
        }
    }
    None
}

/// `x`, `form.email`, `rows[i].name`
fn is_path(s: &str) -> bool {
    let root_len = s.find(['.', '[']).unwrap_or(s.len());
    is_ident(&s[..root_len])
        && !s.contains(['(', ' ', '='])
}

fn is_ident(s: &str) -> bool {
    !s.is_empty()
        && !s.starts_with(|c: char| c.is_ascii_digit())
        && s.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '$')
}

type Range = (usize, usize);

fn parse_each_head(
    args: &str,
    start: usize,
) -> Result<(Binding, Option<Binding>, Range, Option<Range>), Diagnostic> {
    let whole = (start, start + args.len());
    let Some(of) = find_word(args, "of", false) else {
        return Err(Diagnostic::new("(<each>) čeká `položka of seznam`", whole.0, whole.1)
            .with_help("(<each> todo of todos by todo.id )"));
    };
    let rest = of + 2;
    let (iter, key) = match find_word(&args[rest..], "by", true) {
        Some(by) => ((start + rest, start + rest + by), Some((start + rest + by + 2, whole.1))),
        None => ((start + rest, whole.1), None),
    };

    let mut names = Vec::new();
    let mut offset = 0;
    for part in split_top_level(&args[..of]) {
        let name = part.trim();
        let pos = start + offset + (part.len() - part.trim_start().len());
        offset += part.len() + 1;
        let pattern = names.is_empty() && (name.starts_with('{') || name.starts_with('['));
        if !is_ident(name) && !pattern {
            let msg = if name.is_empty() { "tady chybí jméno položky" } else { "položka musí být jméno nebo vzor { a, b }" };
            return Err(Diagnostic::new(msg, pos, pos + name.len().max(1))
                .with_help("(<each> todo of todos by todo.id ) nebo (<each> { id, text } of todos by id )"));
        }
        names.push(Binding { name: name.to_string(), pos });
    }
    if names.len() > 2 {
        let extra = &names[2];
        return Err(Diagnostic::new("(<each>) bere nejvýš položku a index", extra.pos, extra.pos + extra.name.len())
            .with_help("(<each> todo, i of todos by todo.id )"));
    }
    let index = names.get(1).cloned();
    let item = names.swap_remove(0);
    Ok((item, index, iter, key))
}

fn split_top_level(s: &str) -> Vec<&str> {
    let mut out = Vec::new();
    let (mut depth, mut start) = (0i32, 0);
    for (i, c) in s.bytes().enumerate() {
        match c {
            b'{' | b'[' | b'(' => depth += 1,
            b'}' | b']' | b')' => depth -= 1,
            b',' if depth == 0 => {
                out.push(&s[start..i]);
                start = i + 1;
            }
            _ => {}
        }
    }
    out.push(&s[start..]);
    out
}

fn find_word(s: &str, word: &str, last: bool) -> Option<usize> {
    let b = s.as_bytes();
    let ident = |c: u8| c.is_ascii_alphanumeric() || c == b'_' || c == b'$';
    let (mut depth, mut i, mut found) = (0i32, 0, None);
    while i < b.len() {
        match b[i] {
            b'\'' | b'"' => i = skip_string(b, i, b.len()).unwrap_or(b.len()),
            b'`' => i = skip_template(b, i, b.len()).unwrap_or(b.len()),
            b'(' | b'[' | b'{' => depth += 1,
            b')' | b']' | b'}' => depth -= 1,
            _ if depth == 0
                && s[i..].starts_with(word)
                && (i == 0 || !ident(b[i - 1]))
                && b.get(i + word.len()).is_none_or(|c| !ident(*c)) =>
            {
                found = Some(i);
                if !last {
                    return found;
                }
            }
            _ => {}
        }
        i += 1;
    }
    found
}

pub fn scan_braces(b: &[u8], mut i: usize, end: usize) -> Option<usize> {
    let mut depth = 0usize;
    while i < end {
        match b[i] {
            b'\'' | b'"' => i = skip_string(b, i, end)?,
            b'`' => i = skip_template(b, i, end)?,
            b'/' if b.get(i + 1) == Some(&b'/') => {
                while i < end && b[i] != b'\n' {
                    i += 1;
                }
                continue;
            }
            b'/' if b.get(i + 1) == Some(&b'*') => {
                i += 2;
                while i + 1 < end && !(b[i] == b'*' && b[i + 1] == b'/') {
                    i += 1;
                }
                i += 1;
            }
            b'{' | b'(' | b'[' => depth += 1,
            b'}' if depth == 0 => return Some(i),
            b'}' | b')' | b']' => depth = depth.saturating_sub(1),
            _ => {}
        }
        i += 1;
    }
    None
}

fn skip_string(b: &[u8], i: usize, end: usize) -> Option<usize> {
    let q = b[i];
    let mut j = i + 1;
    while j < end {
        match b[j] {
            b'\\' => j += 2,
            b'\n' => return None,
            c if c == q => return Some(j),
            _ => j += 1,
        }
    }
    None
}

fn skip_template(b: &[u8], i: usize, end: usize) -> Option<usize> {
    let mut j = i + 1;
    while j < end {
        match b[j] {
            b'\\' => j += 2,
            b'`' => return Some(j),
            b'$' if b.get(j + 1) == Some(&b'{') => j = scan_braces(b, j + 2, end)? + 1,
            _ => j += 1,
        }
    }
    None
}

fn decode_entities(s: &str) -> String {
    if !s.contains('&') {
        return s.to_string();
    }
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(i) = rest.find('&') {
        out.push_str(&rest[..i]);
        rest = &rest[i..];
        let semi = rest.find(';').filter(|j| *j <= 10);
        let decoded = semi.and_then(|j| {
            let name = &rest[1..j];
            let c = match name {
                "amp" => Some('&'),
                "lt" => Some('<'),
                "gt" => Some('>'),
                "quot" => Some('"'),
                "apos" | "#39" => Some('\''),
                "nbsp" => Some('\u{a0}'),
                n if n.starts_with("#x") => u32::from_str_radix(&n[2..], 16).ok().and_then(char::from_u32),
                n if n.starts_with('#') => n[1..].parse().ok().and_then(char::from_u32),
                _ => None,
            };
            c.map(|c| (c, j))
        });
        match decoded {
            Some((c, j)) => {
                out.push(c);
                rest = &rest[j + 1..];
            }
            None => {
                out.push('&');
                rest = &rest[1..];
            }
        }
    }
    out.push_str(rest);
    out
}

#[derive(Debug, Default)]
pub struct Projected {
    pub ranges: Vec<(usize, usize)>,
    pub setters: HashMap<ExprId, (usize, usize)>,
    pub each_items: Vec<(usize, usize)>,
    pub each_patterns: HashMap<usize, (usize, usize)>,
    pub components: Vec<(String, usize)>,
    pub locals: Vec<usize>,
}

pub fn project(t: &Template, src: &str, p: &mut Projection) -> Projected {
    let mut out = Projected { ranges: vec![(0, 0); t.exprs.len()], ..Projected::default() };
    project_nodes(&t.nodes, t, src, p, &mut out);
    out
}

fn emit(id: ExprId, before: &str, after: &str, t: &Template, src: &str, p: &mut Projection, out: &mut Projected) {
    let e = t.exprs[id];
    p.r#gen(before, e.start);
    let s = p.len();
    p.src(&src[e.start..e.end], e.start);
    out.ranges[id] = (s, p.len());
    p.r#gen(after, e.end);
}

fn project_attrs(attrs: &[Attr], t: &Template, src: &str, p: &mut Projection, out: &mut Projected) {
    for a in attrs {
        let id = match a.value {
            AttrValue::Expr(id) => id,
            AttrValue::Spread(id) => {
                emit(id, "(", ");\n", t, src, p, out);
                continue;
            }
            AttrValue::Use { action, params } => {
                emit(action, "(", ");\n", t, src, p, out);
                if let Some(id) = params {
                    emit(id, "(", ");\n", t, src, p, out);
                }
                continue;
            }
            _ => continue,
        };
        emit(id, "(", ");\n", t, src, p, out);
        if a.name.starts_with("bind:") {
            let e = t.exprs[id];
            p.r#gen("(", e.start);
            let s = p.len();
            p.r#gen("(__v) => { ", e.start);
            p.src(&src[e.start..e.end], e.start);
            p.r#gen(" = __v }", e.end);
            out.setters.insert(id, (s, p.len()));
            p.r#gen(");\n", e.end);
        }
    }
}

fn project_nodes(nodes: &[Node], t: &Template, src: &str, p: &mut Projection, out: &mut Projected) {
    for node in nodes {
        match node {
            Node::Element { attrs, children, .. } => {
                project_attrs(attrs, t, src, p, out);
                project_nodes(children, t, src, p, out);
            }
            Node::Component { name, attrs, span, infill, named } => {
                out.components.push((name.clone(), span.0));
                p.r#gen("(", span.0);
                p.src(name, span.0);
                p.r#gen(");\n", span.0);
                project_attrs(attrs, t, src, p, out);
                project_nodes(infill, t, src, p, out);
                for (_, children) in named {
                    project_nodes(children, t, src, p, out);
                }
            }
            Node::Macro { name, params, children } => {
                p.r#gen("function ", name.pos);
                p.src(&name.name, name.pos);
                p.r#gen("(", name.pos);
                if let Some((s, e)) = params {
                    p.src(&src[*s..*e], *s);
                }
                p.r#gen(") {\n", name.pos);
                project_nodes(children, t, src, p, out);
                p.r#gen("}\n", 0);
            }
            Node::Listen { attrs, .. } => project_attrs(attrs, t, src, p, out),
            Node::Local { name, ty, expr } => {
                p.r#gen("const ", name.pos);
                out.locals.push(p.len());
                p.src(&name.name, name.pos);
                if let Some((s, e)) = ty {
                    p.r#gen(": ", *s);
                    p.src(&src[*s..*e], *s);
                }
                emit(*expr, " = (", "\n);\n", t, src, p, out);
            }
            Node::Layer { body, pending, catch } => {
                p.r#gen("{\n", 0);
                project_nodes(body, t, src, p, out);
                p.r#gen("}\n{\n", 0);
                if let Some(pending) = pending {
                    project_nodes(pending, t, src, p, out);
                }
                p.r#gen("}\n", 0);
                if let Some((err, children)) = catch {
                    p.r#gen("((", 0);
                    if let Some(b) = err {
                        p.src(&b.name, b.pos);
                        p.r#gen(": any", b.pos);
                    }
                    p.r#gen(") => {\n", 0);
                    project_nodes(children, t, src, p, out);
                    p.r#gen("});\n", 0);
                }
            }
            Node::Head { children } => {
                p.r#gen("{\n", 0);
                project_nodes(children, t, src, p, out);
                p.r#gen("}\n", 0);
            }
            Node::Portal { target, children } => {
                if let Some(id) = target {
                    emit(*id, "(", ");\n", t, src, p, out);
                }
                p.r#gen("{\n", 0);
                project_nodes(children, t, src, p, out);
                p.r#gen("}\n", 0);
            }
            Node::Match { subject, cases } => {
                emit(*subject, "(", ");\n", t, src, p, out);
                for (case, children) in cases {
                    match case {
                        Some(id) => emit(*id, "if (", ") {\n", t, src, p, out),
                        None => p.r#gen("{\n", 0),
                    }
                    project_nodes(children, t, src, p, out);
                    p.r#gen("}\n", 0);
                }
            }
            Node::Expr(id) => emit(*id, "(", ");\n", t, src, p, out),
            Node::Text(_) => {}
            Node::If { branches } => {
                for (i, (cond, children)) in branches.iter().enumerate() {
                    match cond {
                        Some(id) => emit(*id, if i == 0 { "if (" } else { " else if (" }, ") {\n", t, src, p, out),
                        None => p.r#gen(" else {\n", 0),
                    }
                    project_nodes(children, t, src, p, out);
                    p.r#gen("}", 0);
                }
                p.r#gen("\n", 0);
            }
            Node::Each { head, children, empty } => {
                let item = &head.item;
                p.r#gen("for (const ", item.pos);
                let s = p.len();
                p.src(&item.name, item.pos);
                out.each_items.push((s, p.len()));
                if !is_ident(&item.name) {
                    out.each_patterns.insert(item.pos, (s, p.len()));
                }
                emit(head.iter, " of (", ")) {\n", t, src, p, out);
                // Klíč dostává položku jako hodnotu: vlastní parametry ji zastíní.
                if let Some(key) = head.key {
                    let params = match &head.index {
                        Some(i) => format!("(({}, {}) => (", item.name, i.name),
                        None => format!("(({}) => (", item.name),
                    };
                    emit(key, &params, "));\n", t, src, p, out);
                }
                if let Some(index) = &head.index {
                    p.r#gen("let ", index.pos);
                    let s = p.len();
                    p.src(&index.name, index.pos);
                    out.each_items.push((s, p.len()));
                    p.r#gen(" = 0;\n", index.pos);
                }
                project_nodes(children, t, src, p, out);
                p.r#gen("}\n", 0);
                if let Some(empty) = empty {
                    p.r#gen("{\n", 0);
                    project_nodes(empty, t, src, p, out);
                    p.r#gen("}\n", 0);
                }
            }
        }
    }
}

/// `<title>` z `(<head>)` zvlášť: titulek se nastavuje přes `document.title`, poslední vyhrává.
pub fn split_title(children: &[Node]) -> (Option<Vec<&Node>>, Vec<&Node>) {
    let mut title = None;
    let mut rest = Vec::new();
    for c in children {
        match c {
            Node::Element { tag, children, .. } if tag == "title" => title = Some(children.iter().collect()),
            other => rest.push(other),
        }
    }
    (title, rest)
}
