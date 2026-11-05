pub fn class_for(filename: &str, css: &str) -> String {
    let mut h: u32 = 0x811c9dc5;
    for b in filename.bytes().chain([0]).chain(css.bytes()) {
        h ^= u32::from(b);
        h = h.wrapping_mul(0x0100_0193);
    }
    let mut s = String::new();
    let mut n = h;
    for _ in 0..6 {
        s.push(char::from_digit(n % 36, 36).unwrap());
        n /= 36;
    }
    format!("f-{s}")
}

pub fn scope(css: &str, class: &str) -> String {
    let mut out = String::with_capacity(css.len() + 64);
    scope_rules(css, 0, css.len(), &format!(".{class}"), &mut out);
    out
}

fn scope_rules(css: &str, mut i: usize, end: usize, sel: &str, out: &mut String) {
    let b = css.as_bytes();
    while i < end {
        let start = i;
        while i < end && !matches!(b[i], b'{' | b';') {
            i = skip_atom(b, i, end);
        }
        if i >= end {
            out.push_str(&css[start..end]);
            return;
        }
        if b[i] == b';' {
            out.push_str(&css[start..=i]);
            i += 1;
            continue;
        }
        let prelude = css[start..i].trim();
        let close = block_end(b, i + 1, end);
        let lead = &css[start..start + (css[start..i].len() - css[start..i].trim_start().len())];
        out.push_str(lead);
        if let Some(at) = prelude.strip_prefix('@') {
            let name = at.split(|c: char| !c.is_ascii_alphabetic() && c != '-').next().unwrap_or("");
            out.push_str(prelude);
            out.push_str(" {");
            if matches!(name, "media" | "supports" | "container" | "layer") {
                scope_rules(css, i + 1, close, sel, out);
            } else {
                out.push_str(&css[i + 1..close]);
            }
        } else {
            out.push_str(&scope_selector_list(prelude, sel));
            out.push_str(" {");
            out.push_str(&css[i + 1..close]);
        }
        out.push('}');
        i = (close + 1).min(end);
    }
}

fn skip_atom(b: &[u8], i: usize, end: usize) -> usize {
    match b[i] {
        q @ (b'"' | b'\'') => {
            let mut j = i + 1;
            while j < end && b[j] != q {
                j += if b[j] == b'\\' { 2 } else { 1 };
            }
            (j + 1).min(end)
        }
        b'/' if b.get(i + 1) == Some(&b'*') => {
            let mut j = i + 2;
            while j + 1 < end && !(b[j] == b'*' && b[j + 1] == b'/') {
                j += 1;
            }
            (j + 2).min(end)
        }
        _ => i + 1,
    }
}

fn block_end(b: &[u8], mut i: usize, end: usize) -> usize {
    let mut depth = 0;
    while i < end {
        match b[i] {
            b'{' => depth += 1,
            b'}' if depth == 0 => return i,
            b'}' => depth -= 1,
            _ => {
                i = skip_atom(b, i, end);
                continue;
            }
        }
        i += 1;
    }
    end
}

fn scope_selector_list(list: &str, sel: &str) -> String {
    split_top(list, b',').into_iter().map(|s| scope_selector(s.trim(), sel)).collect::<Vec<_>>().join(", ")
}

fn scope_selector(s: &str, sel: &str) -> String {
    if let Some(inner) = s.strip_prefix(":global(").and_then(|r| r.strip_suffix(')')) {
        return inner.to_string();
    }
    let b = s.as_bytes();
    let mut depth = 0;
    let mut last = 0;
    for (i, c) in b.iter().enumerate() {
        match c {
            b'(' | b'[' => depth += 1,
            b')' | b']' => depth -= 1,
            b' ' | b'>' | b'+' | b'~' if depth == 0 => last = i + 1,
            _ => {}
        }
    }
    let compound = &s[last..];
    let mut depth = 0;
    let mut insert = s.len();
    for (i, c) in compound.bytes().enumerate() {
        match c {
            b'(' | b'[' => depth += 1,
            b')' | b']' => depth -= 1,
            b':' if depth == 0 => {
                insert = last + i;
                break;
            }
            _ => {}
        }
    }
    format!("{}{sel}{}", &s[..insert], &s[insert..])
}

fn split_top(s: &str, sep: u8) -> Vec<&str> {
    let mut out = Vec::new();
    let mut depth = 0;
    let mut start = 0;
    for (i, c) in s.bytes().enumerate() {
        match c {
            b'(' | b'[' => depth += 1,
            b')' | b']' => depth -= 1,
            c if c == sep && depth == 0 => {
                out.push(&s[start..i]);
                start = i + 1;
            }
            _ => {}
        }
    }
    out.push(&s[start..]);
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scopes_selectors() {
        let css = "button { color: red }\n a:hover, .x > li::before { x: y }\n@media (max-width: 600px) { h1 { a: b } }\n:global(body) { m: 0 }";
        let out = scope(css, "f-x");
        assert_eq!(
            out,
            "button.f-x { color: red }\n a.f-x:hover, .x > li.f-x::before { x: y }\n@media (max-width: 600px) { h1.f-x { a: b } }\nbody { m: 0 }"
        );
    }
}
