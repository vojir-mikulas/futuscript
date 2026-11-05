//! Parser šablony `(<extrusion>)`: HTML + `{výraz}` + řádkové instrukce `(<if> … )`.

use std::collections::HashMap;

use crate::blocks::TOP;
use crate::diagnostic::Diagnostic;
use crate::instruction::{self, Kind};
use crate::projection::Projection;
use crate::setup::gcode_prefix;
use crate::suggest;

pub type ExprId = usize;

/// JS výraz ze šablony, rozsah ve zdroji.
#[derive(Debug, Clone, Copy)]
pub struct Expr {
    pub start: usize,
    pub end: usize,
}

#[derive(Debug)]
pub enum AttrValue {
    Static(String),
    Expr(ExprId),
    /// `<input disabled>`
    Bool,
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
    /// Větve `if`/`elseif`/`else`. `None` = `else`.
    If { branches: Vec<(Option<ExprId>, Vec<Node>)> },
    /// `(<each> item, index of iter by key )` … `(<empty>)` … `(</each>)`
    Each { head: EachHead, children: Vec<Node>, empty: Option<Vec<Node>> },
    /// `<TodoItem {todo} />`
    Component { name: String, attrs: Vec<Attr>, span: (usize, usize) },
}

/// Jméno proměnné a jeho pozice ve zdroji.
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
    "macro", "head", "window", "document", "procedureDone",
];

/// Instrukce, které jsou v návrhu, ale Slicer je ještě neumí.
const LATER_BLOCKS: &[(&str, &str)] = &[
    ("match", "brzy"),
    ("layer", "ve fázi 2"),
    ("infill", "brzy"),
    ("macro", "brzy"),
    ("head", "ve fázi 2"),
];
const LATER_SEPARATORS: &[&str] = &["case", "default", "pending", "catch"];

enum Frame {
    Root(Vec<Node>),
    Element { tag: String, attrs: Vec<Attr>, children: Vec<Node>, span: (usize, usize) },
    If { branches: Vec<(Option<ExprId>, Vec<Node>)>, span: (usize, usize), has_else: bool },
    Each { head: EachHead, children: Vec<Node>, empty: Option<Vec<Node>>, span: (usize, usize) },
    Component { name: String, attrs: Vec<Attr>, children: Vec<Node>, span: (usize, usize) },
    /// Instrukce, kterou zatím neumíme. Obsah zahodíme, chyba už je nahlášená.
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
            | Frame::Later { children: c, .. } => c,
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

    /// Řádek začínající instrukcí, escapem `\(<` nebo G-kódem. Vrací `true`, pokud řádek zpracoval.
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
            self.diags.push(Diagnostic::new(
                "G-kódy v šabloně (lokální M105 v každé položce) zatím Slicer neumí",
                t_start,
                t_start + g.len,
            ));
            self.pos = next;
            return true;
        }
        false
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
            (_, name @ ("window" | "document")) => self.diags.push(Diagnostic::new(
                format!("(<{name}>) zatím Slicer neumí"),
                name_span.0,
                name_span.1,
            )),
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
        let mut attrs = Vec::new();
        let self_closing;
        loop {
            self.skip_ws();
            let rest = &self.src[self.pos..self.end];
            if rest.is_empty() {
                return self.fail(Diagnostic::new(format!("<{tag}> není dokončený, chybí `>`"), span.0, span.1));
            }
            if rest.starts_with("/>") {
                self.pos += 2;
                self_closing = true;
                break;
            }
            if rest.starts_with('>') {
                self.pos += 1;
                self_closing = false;
                break;
            }
            if rest.starts_with('{') {
                if !self.shorthand_attr(&mut attrs) {
                    return;
                }
                continue;
            }
            let name_start = self.pos;
            let name =
                self.read_while(|c| !c.is_whitespace() && !matches!(c, '=' | '>' | '/' | '{' | '"' | '\'')).to_string();
            if name.is_empty() {
                let c = rest.chars().next().unwrap();
                return self.fail(Diagnostic::new(
                    format!("nečekaný znak `{c}` v <{tag}>"),
                    self.pos,
                    self.pos + c.len_utf8(),
                ));
            }
            let span = (name_start, self.pos);
            self.skip_ws();
            let value = if self.src[self.pos..self.end].starts_with('=') {
                self.pos += 1;
                self.skip_ws();
                match self.attr_value() {
                    Some(v) => v,
                    None => return,
                }
            } else {
                AttrValue::Bool
            };
            attrs.push(Attr { name, span, value });
        }

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
                self.push(Node::Component { name: tag, attrs, span });
            } else {
                self.stack.push(Frame::Component { name: tag, attrs, children: Vec::new(), span });
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

    fn check_bind(&mut self, a: &Attr) {
        let Some(what) = a.name.strip_prefix("bind:") else { return };
        if !matches!(what, "value" | "checked") {
            self.diags.push(Diagnostic::new(format!("`bind:{what}` zatím Slicer neumí, jen bind:value a bind:checked"), a.span.0, a.span.1));
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
        if !is_ident(target) {
            self.diags.push(
                Diagnostic::new(format!("`bind:{what}` zatím umí jen M104 proměnnou, ne výraz"), e.start, e.end)
                    .with_help("bind:value={draft}"),
            );
        }
    }

    /// `{user}` jako zkratka za `user={user}`.
    fn shorthand_attr(&mut self, attrs: &mut Vec<Attr>) -> bool {
        let open = self.pos;
        let Some(close) = scan_braces(self.src.as_bytes(), open + 1, self.end) else {
            self.fail(Diagnostic::new("`{` není uzavřená", open, open + 1));
            return false;
        };
        let inner = &self.src[open + 1..close];
        let name = inner.trim();
        self.pos = close + 1;
        if name.starts_with("...") {
            self.diags.push(Diagnostic::new("spread atributů {...x} zatím Slicer neumí", open, close + 1));
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
            Some(Frame::Component { name: n, attrs, children, span }) if n == name => {
                if children.iter().any(|c| !matches!(c, Node::Text(t) if t.trim().is_empty())) {
                    self.diags.push(
                        Diagnostic::new(format!("obsah uvnitř <{n}> (infill) zatím Slicer neumí"), span.0, span.1)
                            .with_help(format!("zatím napiš <{n} />")),
                    );
                }
                self.push(Node::Component { name: n, attrs, span });
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
        // První znak bereme vždycky, jinak by se `<!DOCTYPE` nebo `< 5` zacyklily.
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
        Frame::Later { name, .. } => Diagnostic::new(format!("tady čekám (</{name}>), ne {found}"), at.0, at.1),
        Frame::Root(_) => Diagnostic::new(format!("{found} nic neuzavírá"), at.0, at.1),
    }
}

fn is_ident(s: &str) -> bool {
    !s.is_empty()
        && !s.starts_with(|c: char| c.is_ascii_digit())
        && s.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '$')
}

type Range = (usize, usize);

/// `todo, i of todos by todo.id` → (položka, index, rozsah seznamu, rozsah klíče).
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
    for part in args[..of].split(',') {
        let name = part.trim();
        let pos = start + offset + (part.len() - part.trim_start().len());
        offset += part.len() + 1;
        if !is_ident(name) {
            let msg = if name.is_empty() { "tady chybí jméno položky" } else { "destrukturování v (<each>) zatím Slicer neumí" };
            return Err(Diagnostic::new(msg, pos, pos + name.len().max(1))
                .with_help("(<each> todo of todos by todo.id ), pak {todo.text}"));
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

/// Pozice slova `word` mimo závorky a řetězce (první nebo poslední výskyt).
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

/// Najde `}`, která uzavírá výraz začínající na `i` (za otevírací `{`).
/// Zná řetězce, template literály s `${}` a komentáře.
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

/// Co se ze šablony dostalo do projekce.
#[derive(Debug, Default)]
pub struct Projected {
    /// Rozsah každého výrazu v projekci.
    pub ranges: Vec<(usize, usize)>,
    /// `bind:` setter `(__v) => { x = __v }` pro výraz s daným ID.
    pub setters: HashMap<ExprId, (usize, usize)>,
    /// Pozice položek a indexů z `(<each>)` v projekci (jsou to signály).
    pub each_items: Vec<usize>,
    /// Komponenty použité v šabloně: jméno a pozice ve zdroji.
    pub components: Vec<(String, usize)>,
}

/// Výrazy ze šablony se přidají do projekce, aby je Oxc analyzoval ve stejném scope jako setup.
/// `(<each>)` se promítne jako `for (const todo of …) { … }`, takže položka má vlastní scope.
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
        let AttrValue::Expr(id) = a.value else { continue };
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
            Node::Component { name, attrs, span } => {
                out.components.push((name.clone(), span.0));
                // Odkaz na komponentu, ať Oxc pozná, jestli je importovaná.
                p.r#gen("(", span.0);
                p.src(name, span.0);
                p.r#gen(");\n", span.0);
                project_attrs(attrs, t, src, p, out);
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
                out.each_items.push(p.len());
                p.src(&item.name, item.pos);
                emit(head.iter, " of (", ")) {\n", t, src, p, out);
                if let Some(key) = head.key {
                    // Klíč dostává položku jako obyčejnou hodnotu, ne signál: vlastní parametry ho zastíní.
                    let params = match &head.index {
                        Some(i) => format!("(({}, {}) => (", item.name, i.name),
                        None => format!("(({}) => (", item.name),
                    };
                    emit(key, &params, "));\n", t, src, p, out);
                }
                if let Some(index) = &head.index {
                    p.r#gen("let ", index.pos);
                    out.each_items.push(p.len());
                    p.src(&index.name, index.pos);
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
