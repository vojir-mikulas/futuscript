import type { Model } from "@futuscript/firmware"
import { match, routes, type Route } from "./routes.ts"
import { renderPage } from "./index.ts"

export interface PageModule {
  default: Model<any>
  procedureDone?: string[]
  entries?: () => Record<string, string>[] | Promise<Record<string, string>[]>
}

export interface App {
  plates: string
  pages: Record<string, PageModule>
}

export interface Assets {
  entry: string
  headExtra?: string
}

const fileOf = (app: App, key: string) => key.split("?")[0]!.slice(app.plates.length)

export function table(app: App) {
  return routes(Object.keys(app.pages).map((k) => fileOf(app, k)))
}

function moduleFor(app: App, file: string): PageModule {
  const key = Object.keys(app.pages).find((k) => fileOf(app, k) === file)
  if (!key) throw new Error(`Futuscript: chybí modul ${file}`)
  return app.pages[key]!
}

export function render(
  app: App,
  assets: Assets,
  file: string,
  layouts: string[],
  props: { params: Record<string, string>; url: string; locals: Record<string, unknown> },
): string {
  return renderPage({
    page: moduleFor(app, file).default,
    layouts: layouts.map((l) => moduleFor(app, l).default),
    state: { page: app.plates + file, layouts: layouts.map((l) => app.plates + l), props },
    entry: assets.entry,
    headExtra: assets.headExtra,
  })
}

export function renderUrl(app: App, assets: Assets, pathname: string, locals: Record<string, unknown>) {
  const t = table(app)
  const m = match(t.routes, pathname)
  const file = m?.route.file ?? t.notFound
  if (!file) return null
  const layouts = m?.route.layouts ?? rootLayout(app)
  const html = render(app, assets, file, layouts, { params: m?.params ?? {}, url: pathname, locals })
  return { status: m ? 200 : 404, html }
}

function rootLayout(app: App): string[] {
  return Object.keys(app.pages).some((k) => fileOf(app, k) === "_raft.fs") ? ["_raft.fs"] : []
}

export function pathFor(route: Route, params: Record<string, string>): string {
  const segs = route.file.replace(/\.fs$/, "").split("/")
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
  for (const route of t.routes) {
    const mod = moduleFor(app, route.file)
    if (!mod.procedureDone?.some((p) => p.split(/\s+/)[0] === "export")) continue
    if (route.keys.length && !mod.entries) {
      throw new Error(`Futuscript: ${route.file} má (<procedureDone> export </procedureDone>), ale chybí export const entries`)
    }
    const list = route.keys.length ? await mod.entries!() : [{}]
    for (const params of list) out.push({ route, params, path: pathFor(route, params) })
  }
  return { pages: out, notFound: t.notFound, rootLayout: rootLayout(app) }
}
