//! Projekce `(<extruderInitialization>)` do TypeScriptu.
//!
//! G-kódy se přepíšou jen výměnou prefixu, zbytek řádku je obyčejný TS a parsuje ho Oxc:
//! - `M98 name: T = v`  → `let name: T = v`        (prop)
//! - `M104 x = v`       → `let x = v`              (state)
//! - `M105 x = e`       → `const x = e`            (derived)
//! - `M106 { … }`       → `M106: { … }`            (label; přepíše se až podle AST)
//! - `M117 expr`        → `M117: expr`

use crate::diagnostic::Diagnostic;
use crate::instruction::{self, Kind};
use crate::projection::Projection;
use crate::suggest;

/// G-kódy a jejich význam (pro hlášky a nápovědy).
pub const CODES: &[(&str, &str)] = &[
    ("M98", "prop"),
    ("M104", "state"),
    ("M105", "derived"),
    ("M109", "async derived"),
    ("M106", "effect"),
    ("M107", "on destroy"),
    ("M141", "context"),
    ("M117", "dev log"),
    ("M600", "view transition"),
    ("G0", "navigace"),
    ("G28", "redirect"),
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeclKind {
    Prop,
    State,
    Derived,
    /// Položka nebo index z `(<each>)`. Je to signál, jen pro čtení.
    EachItem,
}

impl DeclKind {
    pub fn code(self) -> &'static str {
        match self {
            DeclKind::Prop => "M98",
            DeclKind::State => "M104",
            DeclKind::Derived => "M105",
            DeclKind::EachItem => "(<each>)",
        }
    }
}

#[derive(Debug, Clone)]
pub struct GDecl {
    pub kind: DeclKind,
    /// Pozice `let`/`const` v projekci = začátek VariableDeclaration v AST.
    pub proj_start: usize,
    pub code_span: (usize, usize),
}

#[derive(Debug, Default)]
pub struct Setup {
    pub decls: Vec<GDecl>,
    pub pragmas: Vec<String>,
}

pub struct GPrefix<'a> {
    pub module: bool,
    pub code: &'a str,
    pub len: usize,
}

/// `M104 …`, `G0 …`, `:M104 …`. Za kódem musí být mezera, `{` nebo konec řádku.
pub fn gcode_prefix(t: &str) -> Option<GPrefix<'_>> {
    let b = t.as_bytes();
    let module = b.first() == Some(&b':');
    let i = usize::from(module);
    if !matches!(b.get(i), Some(b'G' | b'M')) {
        return None;
    }
    let mut j = i + 1;
    while j < b.len() && b[j].is_ascii_digit() {
        j += 1;
    }
    if j == i + 1 || !matches!(b.get(j), None | Some(b' ' | b'\t' | b'{')) {
        return None;
    }
    Some(GPrefix { module, code: &t[i..j], len: j })
}

pub fn unknown_gcode(code: &str, start: usize, end: usize) -> Diagnostic {
    match suggest::closest(code, CODES.iter().map(|(c, _)| *c)) {
        Some(s) => {
            let meaning = CODES.iter().find(|(c, _)| *c == s).map_or("", |(_, m)| m);
            Diagnostic::new(format!("neznámý G-kód. Mysleli jste {s} ({meaning})?"), start, end)
        }
        None => Diagnostic::new("neznámý G-kód", start, end).with_help(
            "známé kódy: M98 prop, M104 state, M105 derived, M106 effect, M107 on destroy, M117 log, M600 view transition",
        ),
    }
}

pub fn project(src: &str, range: (usize, usize), p: &mut Projection, diags: &mut Vec<Diagnostic>) -> Setup {
    let mut setup = Setup::default();
    for line in instruction::lines(src, range.0, range.1) {
        let indent = line.text.len() - line.text.trim_start().len();
        let t = &line.text[indent..];
        let t_start = line.start + indent;
        p.src(&line.text[..indent], line.start);

        if t.starts_with("(<") {
            match instruction::parse(t, t_start) {
                Ok(i) if i.kind == Kind::Standalone && i.name == "procedureDone" => {
                    setup.pragmas.push(i.args.to_string());
                }
                Ok(i) => diags.push(Diagnostic::new(
                    "v (<extruderInitialization>) smí být z instrukcí jen (<procedureDone> … </procedureDone>)",
                    i.name_start,
                    i.name_end,
                )),
                Err(d) => diags.push(d),
            }
        } else if let Some(g) = gcode_prefix(t) {
            project_gcode(&g, t, t_start, p, &mut setup, diags);
        } else {
            p.src(t, t_start);
        }

        if line.has_newline {
            p.src("\n", line.start + line.text.len());
        }
    }
    setup
}

fn project_gcode(
    g: &GPrefix,
    t: &str,
    t_start: usize,
    p: &mut Projection,
    setup: &mut Setup,
    diags: &mut Vec<Diagnostic>,
) {
    let code_start = t_start + usize::from(g.module);
    let code_end = t_start + g.len;
    let rest_raw = &t[g.len..];
    let rest = rest_raw.trim_start();
    let rest_start = code_end + (rest_raw.len() - rest.len());
    let err = |msg: String| Diagnostic::new(msg, code_start, code_end);

    if g.module {
        diags.push(err(format!(":{} (sdílené mezi instancemi) zatím Slicer neumí", g.code)));
        return;
    }

    match g.code {
        "M98" => {
            if rest.starts_with("...") {
                diags.push(err("`M98 ...rest` zatím Slicer neumí".into()));
                return;
            }
            let name_len = rest.find(|c: char| !(c.is_alphanumeric() || c == '_' || c == '$')).unwrap_or(rest.len());
            if name_len == 0 {
                diags.push(err("za M98 čekám jméno propu".into()).with_help("třeba `M98 title: string = \"Úkoly\"`"));
                return;
            }
            let optional = rest[name_len..].starts_with('?');
            let proj_start = p.len();
            p.r#gen("let ", code_start);
            p.src(&rest[..name_len], rest_start);
            let after = name_len + usize::from(optional);
            p.src(&rest[after..], rest_start + after);
            setup.decls.push(GDecl { kind: DeclKind::Prop, proj_start, code_span: (code_start, code_end) });
        }
        "M104" | "M105" => {
            let (kind, keyword) =
                if g.code == "M104" { (DeclKind::State, "let ") } else { (DeclKind::Derived, "const ") };
            if rest.is_empty() {
                diags.push(err(format!("za {} čekám deklaraci, třeba `{} x = 0`", g.code, g.code)));
                return;
            }
            let proj_start = p.len();
            p.r#gen(keyword, code_start);
            p.src(rest, rest_start);
            setup.decls.push(GDecl { kind, proj_start, code_span: (code_start, code_end) });
        }
        "M106" | "M107" | "M600" => {
            if !rest.starts_with('{') {
                diags.push(err(format!("{} čeká blok kódu", g.code)).with_help(format!("{} {{ … }}", g.code)));
                return;
            }
            p.r#gen(&format!("{}: ", g.code), code_start);
            p.src(rest, rest_start);
        }
        "M117" => {
            if rest.is_empty() {
                diags.push(err("M117 čeká, co má vypsat".into()).with_help("M117 `count je ${count}`"));
                return;
            }
            p.r#gen("M117: ", code_start);
            p.src(rest, rest_start);
        }
        "M109" => diags.push(err("M109 (async derived) přijde ve fázi 2 spolu s (<layer>)".into())),
        "M141" => diags.push(err("M141 (context) zatím Slicer neumí".into())),
        "G0" | "G28" => diags.push(err(format!("{} přijde s routerem ve fázi 3", g.code))),
        other => diags.push(unknown_gcode(other, code_start, code_end)),
    }
}
