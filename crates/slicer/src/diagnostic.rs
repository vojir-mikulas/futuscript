use std::fmt::Write;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Diagnostic {
    pub message: String,
    pub start: usize,
    pub end: usize,
    pub help: Option<String>,
}

impl Diagnostic {
    pub fn new(message: impl Into<String>, start: usize, end: usize) -> Self {
        Self { message: message.into(), start, end: end.max(start), help: None }
    }

    pub fn with_help(mut self, help: impl Into<String>) -> Self {
        self.help = Some(help.into());
        self
    }
}

pub fn render(diags: &[Diagnostic], source: &str, filename: &str) -> String {
    let mut out = String::new();
    for (i, d) in diags.iter().enumerate() {
        if i > 0 {
            out.push('\n');
        }
        let start = floor_char_boundary(source, d.start.min(source.len()));
        let line_start = source[..start].rfind('\n').map_or(0, |i| i + 1);
        let line_end = source[start..].find('\n').map_or(source.len(), |i| start + i);
        let line = source[line_start..line_end].trim_end_matches('\r');
        let line_no = source[..line_start].matches('\n').count() + 1;
        let col = source[line_start..start].chars().count() + 1;

        let gutter = line_no.to_string();
        let pad = " ".repeat(gutter.len());
        let lead: String =
            source[line_start..start].chars().map(|c| if c == '\t' { '\t' } else { ' ' }).collect();
        let end = floor_char_boundary(source, d.end.min(line_end).max(start));
        let width = source[start..end].chars().count().max(1);

        let _ = writeln!(out, "Spaghetti v {filename}:{line_no}:{col}");
        let _ = writeln!(out, " {gutter} │ {line}");
        let _ = writeln!(out, " {pad} │ {lead}{} {}", "^".repeat(width), d.message);
        if let Some(help) = &d.help {
            let _ = writeln!(out, " {pad} = pomoc: {help}");
        }
    }
    out
}

fn floor_char_boundary(s: &str, mut i: usize) -> usize {
    while i > 0 && !s.is_char_boundary(i) {
        i -= 1;
    }
    i
}
