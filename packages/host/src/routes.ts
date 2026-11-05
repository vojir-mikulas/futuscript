export interface Route {
  file: string
  kind: "page" | "endpoint"
  pattern: RegExp
  keys: string[]
  layouts: string[]
  score: number
}

export interface Match {
  route: Route
  params: Record<string, string>
}

export function routes(files: string[]): { routes: Route[]; notFound: string | null } {
  const rel = files.map((f) => f.replace(/\\/g, "/"))
  const layouts = new Set(rel.filter((f) => /(^|\/)_raft\.fs$/.test(f)))
  const pages = rel.filter(
    (f) => (f.endsWith(".fs") || (f.endsWith(".ts") && !f.endsWith(".d.ts"))) && !/(^|\/)_[^/]*$/.test(f),
  )

  const out = pages.map((file) => {
    const segments = file.replace(/\.(fs|ts)$/, "").split("/")
    if (segments.at(-1) === "index") segments.pop()
    const keys: string[] = []
    let score = 0
    const source = segments
      .map((s) => {
        const dyn = /^\[(\.\.\.)?([^\]]+)\]$/.exec(s)
        if (!dyn) {
          score += 3
          return "/" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        }
        keys.push(dyn[2]!)
        if (dyn[1]) return "(?:/(.*))?"
        score += 1
        return "/([^/]+)"
      })
      .join("")
    const dirs = file.split("/").slice(0, -1)
    const chain = ["", ...dirs.map((_, i) => dirs.slice(0, i + 1).join("/") + "/")]
      .map((d) => `${d}_raft.fs`)
      .filter((l) => layouts.has(l))
    const kind = file.endsWith(".ts") ? ("endpoint" as const) : ("page" as const)
    return { file, kind, pattern: new RegExp(`^${source || "/"}/?$`), keys, layouts: kind === "page" ? chain : [], score }
  })
  out.sort((a, b) => b.score - a.score || b.file.length - a.file.length)
  const notFound = rel.find((f) => f === "_spaghetti.fs") ?? null
  return { routes: out, notFound }
}

export function match(table: Route[], pathname: string): Match | null {
  for (const route of table) {
    const m = route.pattern.exec(pathname)
    if (!m) continue
    const params: Record<string, string> = {}
    route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1] ?? "")))
    return { route, params }
  }
  return null
}
