import { isInterrupt, type Model } from "@futuscript/firmware"
import { match, routes, type Route } from "./routes.ts"
import { renderPage, renderPageStream } from "./index.ts"

export interface PageModule {
  default: Model<any>
  procedureDone?: string[]
  entries?: () => Record<string, string>[] | Promise<Record<string, string>[]>
}

export interface EndpointContext {
  request: Request
  url: URL
  params: Record<string, string>
  locals: Record<string, unknown>
}

export type Handler = (ctx: EndpointContext) => Response | Promise<Response>

export interface EndpointModule {
  prerender?: boolean
  [method: string]: Handler | boolean | undefined
}

export interface App {
  plates: string
  pages: Record<string, PageModule>
  endpoints?: Record<string, EndpointModule>
}

export async function callEndpoint(
  mod: EndpointModule,
  ctx: EndpointContext,
): Promise<Response> {
  const method = ctx.request.method.toUpperCase()
  const handler = (mod[method] ?? (method === "HEAD" ? mod.GET : undefined) ?? mod.default) as Handler | undefined
  if (typeof handler !== "function") {
    const allow = ["GET", "POST", "PUT", "PATCH", "DELETE"].filter((m) => typeof mod[m] === "function")
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: allow.join(", ") } })
  }
  return handler(ctx)
}

export async function handleEndpoint(app: App, request: Request, locals: Record<string, unknown>): Promise<Response | null> {
  const url = new URL(request.url)
  const m = match(table(app).routes.filter((r) => r.kind === "endpoint"), url.pathname)
  if (!m) return null
  return callEndpoint(endpointFor(app, m.route.file), { request, url, params: m.params, locals })
}

function endpointFor(app: App, file: string): EndpointModule {
  const all = app.endpoints ?? {}
  const key = Object.keys(all).find((k) => fileOf(app, k) === file)
  if (!key) throw new Error(`Futuscript: chybí endpoint ${file}`)
  return all[key]!
}

export interface Assets {
  entry: string
  headExtra?: string
}

const fileOf = (app: App, key: string) => key.split("?")[0]!.slice(app.plates.length)

export function table(app: App) {
  return routes([...Object.keys(app.pages), ...Object.keys(app.endpoints ?? {})].map((k) => fileOf(app, k)))
}

function moduleFor(app: App, file: string): PageModule {
  const key = Object.keys(app.pages).find((k) => fileOf(app, k) === file)
  if (!key) throw new Error(`Futuscript: chybí modul ${file}`)
  return app.pages[key]!
}

export async function render(
  app: App,
  assets: Assets,
  file: string,
  layouts: string[],
  props: { params: Record<string, string>; url: string; locals: Record<string, unknown> },
): Promise<string> {
  return renderPage({
    page: moduleFor(app, file).default,
    layouts: layouts.map((l) => moduleFor(app, l).default),
    state: { page: app.plates + file, layouts: layouts.map((l) => app.plates + l), props },
    entry: assets.entry,
    headExtra: assets.headExtra,
  })
}

export type RenderResult =
  | { status: number; body: ReadableStream<Uint8Array> }
  | { redirect: string; status: number }
  | null

function renderStream(
  app: App,
  assets: Assets,
  file: string,
  layouts: string[],
  props: { params: Record<string, string>; url: string; locals: Record<string, unknown> },
) {
  return renderPageStream({
    page: moduleFor(app, file).default,
    layouts: layouts.map((l) => moduleFor(app, l).default),
    state: { page: app.plates + file, layouts: layouts.map((l) => app.plates + l), props },
    entry: assets.entry,
    headExtra: assets.headExtra,
  })
}

export async function renderUrl(app: App, assets: Assets, pathname: string, locals: Record<string, unknown>): Promise<RenderResult> {
  const t = table(app)
  const m = match(t.routes.filter((r) => r.file.endsWith(".fs")), pathname)
  const notFound = async () => {
    if (!t.notFound) return null
    const body = await renderStream(app, assets, t.notFound, rootLayout(app), { params: {}, url: pathname, locals })
    return { status: 404, body }
  }
  if (!m) return notFound()
  try {
    return { status: 200, body: await renderStream(app, assets, m.route.file, m.route.layouts, { params: m.params, url: pathname, locals }) }
  } catch (e) {
    if (!isInterrupt(e)) throw e
    if (e.futuscript === "redirect") return { redirect: e.to!, status: e.status ?? 307 }
    return notFound()
  }
}

function rootLayout(app: App): string[] {
  return Object.keys(app.pages).some((k) => fileOf(app, k) === "_raft.fs") ? ["_raft.fs"] : []
}

export function pathFor(route: Route, params: Record<string, string>): string {
  const segs = route.file.replace(/\.(fs|ts)$/, "").split("/")
  if (segs.at(-1) === "index") segs.pop()
  const path = segs
    .map((s) => {
      const dyn = /^\[(?:\.\.\.)?([^\]]+)\]$/.exec(s)
      if (!dyn) return s
      const v = params[dyn[1]!]
      if (v == null) throw new Error(`Futuscript: entries() pro ${route.file} nevrátilo parametr ${dyn[1]}`)
      return v
    })
    .join("/")
  return "/" + path
}

export async function prerenderable(app: App) {
  const t = table(app)
  const out: { route: Route; params: Record<string, string>; path: string }[] = []
  const files: { path: string; render: () => Promise<Response> }[] = []
  for (const route of t.routes) {
    if (route.kind === "endpoint") {
      const mod = endpointFor(app, route.file)
      if (!mod.prerender || route.keys.length) continue
      const path = pathFor(route, {})
      const url = new URL(path, "http://localhost")
      files.push({ path, render: () => callEndpoint(mod, { request: new Request(url), url, params: {}, locals: {} }) })
      continue
    }
    const mod = moduleFor(app, route.file)
    if (!mod.procedureDone?.some((p) => p.split(/\s+/)[0] === "export")) continue
    if (route.keys.length && !mod.entries) {
      throw new Error(`Futuscript: ${route.file} má (<procedureDone> export </procedureDone>), ale chybí export const entries`)
    }
    const list = route.keys.length ? await mod.entries!() : [{}]
    for (const params of list) out.push({ route, params, path: pathFor(route, params) })
  }
  return { pages: out, files, notFound: t.notFound, rootLayout: rootLayout(app) }
}
