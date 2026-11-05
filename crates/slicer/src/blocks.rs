//! Rozdělení `.fs` souboru na top-level bloky.

use crate::diagnostic::Diagnostic;
use crate::instruction::{self, Kind};
use crate::suggest;

pub const HOST: &str = "host";
pub const SETUP: &str = "extruderInitialization";
pub const TEMPLATE: &str = "extrusion";
pub const STYLE: &str = "filament";
pub const TOP: [&str; 4] = [HOST, SETUP, TEMPLATE, STYLE];

#[derive(Debug, Clone, Copy)]
pub struct Block {
    /// Pozice jména v otevíracím tagu (pro chybové hlášky).
    pub name_span: (usize, usize),
    /// Obsah mezi otevíracím a zavíracím řádkem.
    pub content: (usize, usize),
}

#[derive(Debug, Default)]
pub struct Blocks {
    pub host: Option<Block>,
    pub setup: Option<Block>,
    pub template: Option<Block>,
    pub style: Option<Block>,
}

impl Blocks {
    fn slot(&mut self, name: &str) -> &mut Option<Block> {
        match name {
            HOST => &mut self.host,
            SETUP => &mut self.setup,
            TEMPLATE => &mut self.template,
            _ => &mut self.style,
        }
    }
}

struct Open<'a> {
    name: &'a str,
    name_span: (usize, usize),
    content_start: usize,
}

pub fn split(src: &str, diags: &mut Vec<Diagnostic>) -> Blocks {
    let lines = instruction::lines(src, 0, src.len());

    let is_top_open = |t: &str, start: usize| {
        t.starts_with("(<")
            && !t.starts_with("(</")
            && instruction::parse(t, start).is_ok_and(|i| TOP.contains(&i.name))
    };
    // Soubor bez jediného bloku je celý šablona.
    if !lines.iter().any(|l| {
        let t = l.text.trim_start();
        is_top_open(t, l.start + l.text.len() - t.len())
    }) {
        return Blocks {
            template: Some(Block { name_span: (0, 0), content: (0, src.len()) }),
            ..Blocks::default()
        };
    }

    let mut blocks = Blocks::default();
    let mut current: Option<Open> = None;
    let mut in_comment = false;

    for line in &lines {
        let t = line.text.trim_start();
        let t_start = line.start + line.text.len() - t.len();
        let t = t.trim_end();

        if let Some(open) = &current {
            if t.starts_with("(<") {
                let Ok(instr) = instruction::parse(t, t_start) else { continue };
                if !TOP.contains(&instr.name) {
                    continue; // vnořené instrukce řeší šablona/setup
                }
                if instr.kind == Kind::Close && instr.name == open.name {
                    *blocks.slot(open.name) =
                        Some(Block { name_span: open.name_span, content: (open.content_start, line.start) });
                    current = None;
                } else if instr.kind == Kind::Close {
                    diags.push(
                        Diagnostic::new(
                            format!("tady čekám (</{}>), ne (</{}>)", open.name, instr.name),
                            instr.name_start,
                            instr.name_end,
                        )
                        .with_help(format!("blok (<{}>) se otevřel dřív a ještě není uzavřený", open.name)),
                    );
                } else {
                    diags.push(
                        Diagnostic::new(
                            format!("blok (<{}>) není uzavřený", open.name),
                            open.name_span.0,
                            open.name_span.1,
                        )
                        .with_help(format!("přidej (</{}>) před (<{}>)", open.name, instr.name)),
                    );
                    // Pokračujeme, jako by tu nový blok začínal, ať najdeme další chyby.
                    current = start_block(&blocks, instr, line, diags);
                }
            }
            continue;
        }

        if in_comment {
            in_comment = !t.contains("-->");
            continue;
        }
        if t.is_empty() {
            continue;
        }
        if t.starts_with("<!--") {
            in_comment = !t.contains("-->");
            continue;
        }
        if t.starts_with("(<") {
            match instruction::parse(t, t_start) {
                Ok(instr) if instr.kind == Kind::Open && TOP.contains(&instr.name) => {
                    current = start_block(&blocks, instr, line, diags);
                }
                Ok(instr) if instr.kind == Kind::Close => diags.push(Diagnostic::new(
                    format!("(</{}>) zavírá blok, který není otevřený", instr.name),
                    instr.name_start,
                    instr.name_end,
                )),
                Ok(instr) => {
                    let mut d = Diagnostic::new(
                        format!("`{}` není top-level blok", instr.name),
                        instr.name_start,
                        instr.name_end,
                    );
                    d = match suggest::closest(instr.name, TOP) {
                        Some(s) => d.with_help(format!("mysleli jste (<{s}>)?")),
                        None => d.with_help(
                            "top-level bloky jsou (<host>), (<extruderInitialization>), (<extrusion>) a (<filament>)",
                        ),
                    };
                    diags.push(d);
                }
                Err(d) => diags.push(d),
            }
            continue;
        }
        diags.push(
            Diagnostic::new("tenhle text je mimo blok", t_start, t_start + t.len())
                .with_help("šablona patří do (<extrusion>) … (</extrusion>), kód do (<extruderInitialization>) … (</extruderInitialization>)"),
        );
    }

    if let Some(open) = current {
        diags.push(
            Diagnostic::new(format!("blok (<{}>) není uzavřený", open.name), open.name_span.0, open.name_span.1)
                .with_help(format!("přidej (</{}>) na konec bloku", open.name)),
        );
    }
    blocks
}

fn start_block<'a>(
    blocks: &Blocks,
    instr: instruction::Instr<'a>,
    line: &instruction::Line,
    diags: &mut Vec<Diagnostic>,
) -> Option<Open<'a>> {
    let exists = match instr.name {
        HOST => blocks.host.is_some(),
        SETUP => blocks.setup.is_some(),
        TEMPLATE => blocks.template.is_some(),
        _ => blocks.style.is_some(),
    };
    if exists {
        diags.push(Diagnostic::new(
            format!("blok (<{}>) smí být v souboru jen jednou", instr.name),
            instr.name_start,
            instr.name_end,
        ));
    }
    if !instr.args.is_empty() {
        diags.push(Diagnostic::new(
            format!("(<{}>) nebere žádné argumenty", instr.name),
            instr.args_start,
            instr.args_start + instr.args.len(),
        ));
    }
    Some(Open { name: instr.name, name_span: (instr.name_start, instr.name_end), content_start: line.next })
}
