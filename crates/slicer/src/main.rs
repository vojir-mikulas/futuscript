use std::io::Read;
use std::process::ExitCode;

use futuscript_slicer::{Options, render, slice};

const USAGE: &str = "futu-slice <soubor.fs> [--prod] [--server]\nfutu-slice --stdin --filename <jméno.fs> [--prod]";

fn main() -> ExitCode {
    let mut args = std::env::args().skip(1);
    let (mut path, mut filename, mut stdin, mut dev, mut server) = (None, None, false, true, false);
    while let Some(a) = args.next() {
        match a.as_str() {
            "--stdin" => stdin = true,
            "--filename" => filename = args.next(),
            "--prod" => dev = false,
            "--server" => server = true,
            "-h" | "--help" => {
                println!("{USAGE}");
                return ExitCode::SUCCESS;
            }
            _ => path = Some(a),
        }
    }

    let source = if stdin {
        let mut s = String::new();
        if let Err(e) = std::io::stdin().read_to_string(&mut s) {
            eprintln!("nejde číst stdin: {e}");
            return ExitCode::FAILURE;
        }
        s
    } else {
        let Some(p) = &path else {
            eprintln!("{USAGE}");
            return ExitCode::FAILURE;
        };
        match std::fs::read_to_string(p) {
            Ok(s) => s,
            Err(e) => {
                eprintln!("nejde číst {p}: {e}");
                return ExitCode::FAILURE;
            }
        }
    };

    let name = filename.or(path).unwrap_or_else(|| "stdin.fs".into());
    match slice(&source, &Options { filename: &name, dev, server }) {
        Ok(js) => {
            print!("{js}");
            ExitCode::SUCCESS
        }
        Err(diags) => {
            eprint!("{}", render(&diags, &source, &name));
            ExitCode::FAILURE
        }
    }
}
