mod blocks;
mod codegen;
mod css;
mod diagnostic;
mod instruction;
mod projection;
mod rewrite;
mod setup;
mod ssr;
mod suggest;
mod template;

pub use diagnostic::{Diagnostic, render};

pub struct Options<'a> {
    pub filename: &'a str,
    pub dev: bool,
    /// Serverový výstup: komponenta zapisuje HTML do pole stringů.
    pub server: bool,
}

pub fn slice(source: &str, opts: &Options) -> Result<String, Vec<Diagnostic>> {
    let mut diags = Vec::new();
    let blocks = blocks::split(source, &mut diags);
    if let Some(host) = &blocks.host {
        diags.push(Diagnostic::new(
            "(<host>) zatím Slicer neumí, přijde ve fázi 2 (server)",
            host.name_span.0,
            host.name_span.1,
        ));
    }

    let mut proj = projection::Projection::default();
    let setup = match &blocks.setup {
        Some(b) => setup::project(source, b.content, &mut proj, &mut diags),
        None => setup::Setup::default(),
    };
    let setup_end = proj.len();
    proj.r#gen("\n;\n", source.len());
    let template = match &blocks.template {
        Some(b) => template::parse(source, b.content, &mut diags),
        None => template::Template::default(),
    };
    if !diags.is_empty() {
        return Err(diags);
    }

    let tpl = template::project(&template, source, &mut proj);
    let rw = rewrite::analyze(&proj, &setup, setup_end, &tpl, opts.dev, &mut diags);
    if !diags.is_empty() {
        return Err(diags);
    }
    let setup_ts = rewrite::apply(&proj.text, &rw.edits, 0, setup_end);
    let apply = |&(s, e): &(usize, usize)| rewrite::apply(&proj.text, &rw.edits, s, e);
    let exprs: Vec<String> = tpl.ranges.iter().map(apply).collect();
    let setters = tpl.setters.iter().map(|(id, r)| (*id, apply(r))).collect();
    let each_names: std::collections::HashMap<usize, Vec<String>> = tpl
        .each_patterns
        .iter()
        .map(|(src_pos, (proj, _))| (*src_pos, rw.each_names.get(proj).cloned().unwrap_or_default()))
        .collect();

    let style = blocks.style.map(|b| &source[b.content.0..b.content.1]).filter(|s| !s.trim().is_empty());
    let scope = style.map(|css| css::class_for(opts.filename, css));
    let template_ts = if opts.server {
        ssr::Ssr::new(scope.as_deref(), &exprs, &each_names, source).root(&template.nodes)
    } else {
        let (code, gen_diags) =
            codegen::Gen::new(scope.as_deref(), &exprs, &setters, &each_names, source).root(&template.nodes);
        if !gen_diags.is_empty() {
            return Err(gen_diags);
        }
        code
    };

    let (runtime, into) = if opts.server { ("@futuscript/firmware/server", "__out") } else { ("@futuscript/firmware", "__root") };
    let mut ts = format!("import * as __f from \"{runtime}\";\n");
    for import in &rw.hoisted {
        // Na serveru se i importované komponenty kompilují serverově.
        let import = if opts.server { import.replace(".fs\"", ".fs?ssr\"").replace(".fs'", ".fs?ssr'") } else { import.clone() };
        ts.push_str(&import);
        ts.push('\n');
    }
    if let (Some(css), Some(scope)) = (style, &scope) {
        let scoped = css::scope(css.trim(), scope);
        ts.push_str(&format!("__f.css({}, {});\n", codegen::js_str(scope), codegen::js_str(&scoped)));
    }
    if !setup.pragmas.is_empty() {
        let list: Vec<String> = setup.pragmas.iter().map(|p| codegen::js_str(p)).collect();
        ts.push_str(&format!("export const procedureDone = [{}];\n", list.join(", ")));
    }
    ts.push_str(&format!("export default function {}(__props: any = {{}}, {into}: any) {{\n", component_name(opts.filename)));
    ts.push_str(&setup_ts);
    ts.push('\n');
    ts.push_str(&template_ts);
    ts.push_str("}\n");

    codegen::strip_types(&ts).map_err(|e| {
        vec![
            Diagnostic::new(format!("interní chyba Slicer, vygenerovaný kód nejde přeložit: {e}"), 0, 0)
                .with_help(format!("vygenerovaný kód:\n{ts}")),
        ]
    })
}

fn component_name(filename: &str) -> String {
    let stem = std::path::Path::new(filename).file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let name: String = stem.chars().filter(|c| c.is_alphanumeric() || *c == '_').collect();
    if name.is_empty() || name.starts_with(|c: char| c.is_ascii_digit()) { "Model".into() } else { name }
}
