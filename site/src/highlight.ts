export type Token = { t: string; k: string }

const keywords = new Set([
  "import", "from", "export", "const", "let", "function", "return", "await", "async", "of", "by", "new", "if",
])

export function highlight(code: string): Token[] {
  const out: Token[] = []
  let plain = ""
  let i = 0
  let lineStart = true
  let inInstr = false
  let inTag = false

  const push = (t: string, k: string) => {
    if (!k) {
      plain += t
    } else {
      if (plain) out.push({ t: plain, k: "" })
      plain = ""
      out.push({ t, k })
    }
    i += t.length
    lineStart = false
  }

  while (i < code.length) {
    const rest = code.slice(i)
    let m: RegExpExecArray | null
    const afterSpace = i === 0 || /\s/.test(code[i - 1]!)
    if (
      (m = /^<!--[\s\S]*?-->/.exec(rest)) ||
      (!inTag && (m = /^\/\/[^\n]*/.exec(rest))) ||
      (afterSpace && (m = /^# [^\n]*/.exec(rest)))
    ) {
      push(m[0], "c")
    } else if (lineStart && (m = /^\(<\/?[A-Za-z]+>/.exec(rest))) {
      push(m[0], "i")
      inInstr = true
    } else if (inInstr && (m = /^<\/[A-Za-z]+>\)/.exec(rest))) {
      push(m[0], "i")
      inInstr = false
    } else if (inInstr && /^\)[ \t]*(\n|$)/.test(rest)) {
      push(")", "i")
      inInstr = false
    } else if (lineStart && (m = /^[MG]\d+\b/.exec(rest))) {
      push(m[0], "g")
    } else if ((m = /^"[^"\n]*"|^'[^'\n]*'|^`[^`]*`/.exec(rest))) {
      push(m[0], "s")
    } else if ((m = /^=>/.exec(rest))) {
      push(m[0], "")
    } else if (!inInstr && (m = /^<\/?[A-Za-z][\w.]*/.exec(rest))) {
      push(m[0], "t")
      inTag = true
    } else if (inTag && (m = /^\/?>/.exec(rest))) {
      push(m[0], "t")
      inTag = false
    } else if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) {
      const loopWord = m[0] === "of" || m[0] === "by"
      if (keywords.has(m[0]) && (!loopWord || inInstr)) push(m[0], "k")
      else push(m[0], inTag && rest[m[0].length] === "=" ? "a" : "")
    } else if ((m = /^\d+(\.\d+)?(s|ms|px)?/.exec(rest))) {
      push(m[0], "n")
    } else if (rest[0] === "{" || rest[0] === "}") {
      push(rest[0], "p")
    } else {
      const c = rest[0]!
      plain += c
      i += 1
      if (c === "\n") lineStart = true
      else if (c !== " " && c !== "\t") lineStart = false
    }
  }
  if (plain) out.push({ t: plain, k: "" })
  return out
}
