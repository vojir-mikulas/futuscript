use crate::diagnostic::Diagnostic;
use crate::instruction::{self, Kind};
use crate::projection::Projection;
use crate::suggest;

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
    Async,
    EachItem,
}

impl DeclKind {
    pub fn code(self) -> &'static str {
        match self {
            DeclKind::Prop => "M98",
            DeclKind::State => "M104",
            DeclKind::Derived => "M105",
            DeclKind::Async => "M109",
            DeclKind::EachItem => "(<each>)",
        }
    }
}

#[derive(Debug, Clone)]
pub struct GDecl {
    pub kind: DeclKind,
    pub proj_start: usize,
    pub code_span: (usize, usize),
    pub rest: bool,
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
            if let Some(name) = rest.strip_prefix("...") {
                let name = name.trim();
                if name.is_empty() || !name.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '$') {
                    diags.push(err("za M98 ... čekám jméno".into()).with_help("M98 ...rest"));
                    return;
                }
                let proj_start = p.len();
                p.r#gen("let ", code_start);
                p.src(name, rest_start + 3);
                setup.decls.push(GDecl { kind: DeclKind::Prop, proj_start, code_span: (code_start, code_end), rest: true });
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
            setup.decls.push(GDecl { kind: DeclKind::Prop, proj_start, code_span: (code_start, code_end), rest: false });
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
            setup.decls.push(GDecl { kind, proj_start, code_span: (code_start, code_end), rest: false });
        }
        "M106" | "M107" | "M600" => {
            if !rest.starts_with('{') {
                diags.push(err(format!("{} čeká blok kódu", g.code)).with_help(format!("{} {{ … }}", g.code)));
                return;
            }
            // Šipka, aby v těle fungoval `return cleanup`.
            p.r#gen(&format!("{}: () => ", g.code), code_start);
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
        "M109" => {
            if !rest.contains("await") {
                diags.push(err("M109 čeká await".into()).with_help("M109 post = await getPost(slug)"));
                return;
            }
            let proj_start = p.len();
            p.r#gen("const ", code_start);
            p.src(rest, rest_start);
            setup.decls.push(GDecl { kind: DeclKind::Async, proj_start, code_span: (code_start, code_end), rest: false });
        }
        "M141" => {
            let name_len = rest.find(|c: char| !(c.is_alphanumeric() || c == '_' || c == '$' || c == '.')).unwrap_or(rest.len());
            let after = rest[name_len..].trim_start();
            let Some(value) = after.strip_prefix('=').filter(|v| !v.starts_with('=')) else {
                diags.push(
                    err("M141 poskytuje kontext celému podstromu".into())
                        .with_help("M141 Theme = \"dark\"   (Theme = context(\"light\") z .ts souboru), číst přes Theme.use()"),
                );
                return;
            };
            let value_start = rest_start + (rest.len() - value.len());
            let value_trim = value.trim_start();
            let value_start = value_start + (value.len() - value_trim.len());
            p.r#gen("M141: __f.provide(", code_start);
            p.src(&rest[..name_len], rest_start);
            p.r#gen(", () => (", value_start);
            p.src(value_trim, value_start);
            p.r#gen("))", value_start + value_trim.len());
        }
        "G0" | "G28" => {
            if g.code == "G0" && rest.is_empty() {
                diags.push(err("G0 čeká cíl navigace".into()).with_help("G0 \"/projekty\""));
                return;
            }
            p.r#gen(&format!("{}: ", g.code), code_start);
            p.src(if rest.is_empty() { "\"/\"" } else { rest }, rest_start);
        }
        other => diags.push(unknown_gcode(other, code_start, code_end)),
    }
}
