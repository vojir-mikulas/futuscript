//! Řádkové instrukce v závorkách: `(<name> args )`, `(</name>)` a `(<name> args </name>)`.

use crate::diagnostic::Diagnostic;

/// Jeden řádek zdroje (bez `\n` a bez koncového `\r`).
pub struct Line<'a> {
    pub start: usize,
    pub text: &'a str,
    pub has_newline: bool,
    /// Začátek dalšího řádku.
    pub next: usize,
}

pub fn lines(src: &str, from: usize, to: usize) -> Vec<Line<'_>> {
    let mut out = Vec::new();
    let mut pos = from;
    while pos < to {
        let (end, has_newline) = match src[pos..to].find('\n') {
            Some(i) => (pos + i, true),
            None => (to, false),
        };
        let text = src[pos..end].trim_end_matches('\r');
        let next = if has_newline { end + 1 } else { end };
        out.push(Line { start: pos, text, has_newline, next });
        pos = next;
    }
    out
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    /// `(<if> user )`: otevírá blok nebo segment (separátory jako `else`).
    Open,
    /// `(</if>)`
    Close,
    /// `(<procedureDone> export </procedureDone>)`: samostatná instrukce bez těla.
    Standalone,
}

#[derive(Debug, Clone, Copy)]
pub struct Instr<'a> {
    pub kind: Kind,
    pub name: &'a str,
    pub name_start: usize,
    pub name_end: usize,
    /// Argumenty bez okrajových mezer. Prázdné u `Close`.
    pub args: &'a str,
    pub args_start: usize,
}

/// `text` je řádek oříznutý zleva, začíná `(<`. `offset` je pozice `text` ve zdroji.
pub fn parse(text: &str, offset: usize) -> Result<Instr<'_>, Diagnostic> {
    let t = text.trim_end();
    let closing = t.starts_with("(</");
    let name_from = if closing { 3 } else { 2 };
    let rest = &t[name_from..];
    let name_len = rest.find(|c: char| !c.is_ascii_alphanumeric()).unwrap_or(rest.len());
    let name = &rest[..name_len];
    let name_start = offset + name_from;
    let name_end = name_start + name_len;

    if name.is_empty() || !name.as_bytes()[0].is_ascii_alphabetic() {
        return Err(Diagnostic::new(
            "tady čekám jméno instrukce",
            offset,
            name_start + 1,
        )
        .with_help("instrukce vypadá takhle: (<if> podmínka ), zavírací takhle: (</if>). Doslovný text napiš jako \\(<"));
    }

    let after = &rest[name_len..];
    let Some(after) = after.strip_prefix('>') else {
        return Err(Diagnostic::new(format!("za jménem `{name}` chybí `>`"), name_end, name_end + 1));
    };
    let after_start = name_end + 1;

    if closing {
        if after.trim() != ")" {
            return Err(Diagnostic::new(
                format!("zavírací instrukce má tvar (</{name}>)"),
                offset,
                offset + t.len(),
            ));
        }
        return Ok(Instr { kind: Kind::Close, name, name_start, name_end, args: "", args_start: after_start });
    }

    let Some(inner) = after.strip_suffix(')') else {
        let end = offset + t.len();
        return Err(Diagnostic::new("instrukce musí končit `)` na stejném řádku", end, end)
            .with_help(format!("(<{name}>{after} )")));
    };

    let closer = format!("</{name}>");
    let (body, kind) = match inner.trim_end().strip_suffix(closer.as_str()) {
        Some(body) => (body, Kind::Standalone),
        None => (inner, Kind::Open),
    };
    let lead = body.len() - body.trim_start().len();
    Ok(Instr { kind, name, name_start, name_end, args: body.trim(), args_start: after_start + lead })
}
