import {
  component,
  heat,
  insert,
  print,
  props,
  renderable,
  setNavigator,
  signal,
  transition,
  type Model,
  type NavigateOptions,
} from "@futuscript/firmware"
import type { PageProps } from "./compose.ts"
import type { PageState } from "./index.ts"
import { match, routes } from "./routes.ts"

type Modules = Record<string, () => Promise<{ default: Model<any> }>>

declare global {
  interface Window {
    __FUTU__?: PageState
  }
}

export const url = signal(typeof location === "undefined" ? "/" : location.pathname)

interface View {
  page: Model<any>
  props: PageProps
}

export async function start(modules: Modules, plate = document.getElementById("plate")!): Promise<void> {
  const initial = window.__FUTU__
  if (!initial) return
  const cache = new Map<string, Promise<Model<any>>>()
  const load = (file: string) => {
    let p = cache.get(file)
    if (!p) {
      const mod = modules[file]
      if (!mod) return Promise.reject(new Error(`Futuscript: modul ${file} chybí v import.meta.glob`))
      p = mod().then((m) => m.default)
      cache.set(file, p)
    }
    return p
  }

  const prefix = initial.page.slice(0, initial.page.lastIndexOf("/plates/") + "/plates/".length) || "/src/plates/"
  const table = routes(Object.keys(modules).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)))
  const locals = initial.props.locals

  let layoutKey = initial.layouts.join("|")
  let view = signal<View>({ page: await load(initial.page), props: initial.props })
  let dispose = mountShell(
    (model, el) => heat(model, el, undefined, initial.data ?? [], initial.layers ?? {}),
    await Promise.all(initial.layouts.map(load)),
    view,
    plate,
  )

  const resolve = (pathname: string) => {
    const m = match(table.routes, pathname)
    if (!m) return null
    return { file: prefix + m.route.file, layouts: m.route.layouts.map((l) => prefix + l), params: m.params }
  }

  async function go(to: string, opts: NavigateOptions & { pop?: boolean } = {}) {
    const target = new URL(to, location.href)
    if (target.origin !== location.origin) return location.assign(target.href)
    const r = resolve(target.pathname)
    if (!r) return location.assign(target.href)
    let page: Model<any>
    let layouts: Model<any>[]
    try {
      ;[page, ...layouts] = await Promise.all([load(r.file), ...r.layouts.map(load)])
    } catch {
      return location.assign(target.href)
    }
    if (!opts.pop) {
      history.replaceState({ ...history.state, scroll: scrollY }, "")
      if (opts.replace) history.replaceState({ scroll: 0 }, "", target.href)
      else history.pushState({ scroll: 0 }, "", target.href)
    }
    const next: View = { page: page!, props: { params: r.params, url: target.pathname, locals } }
    const swap = () => {
      url.set(target.pathname)
      const key = r.layouts.join("|")
      if (key === layoutKey) view.set(next)
      else {
        dispose()
        layoutKey = key
        view = signal(next)
        dispose = mountShell(print, layouts, view, plate)
      }
    }
    transition(swap)
    const y = opts.pop ? (history.state?.scroll ?? 0) : 0
    requestAnimationFrame(() => (target.hash ? document.querySelector(target.hash)?.scrollIntoView() : scrollTo(0, y)))
  }

  setNavigator((to, opts) => void go(to, opts))
  addEventListener("popstate", () => void go(location.href, { pop: true }))

  document.addEventListener("click", (e) => {
    const a = linkFrom(e)
    if (!a) return
    e.preventDefault()
    void go(a.href)
  })
  const prefetch = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.("a")
    if (!a || a.origin !== location.origin) return
    const r = resolve(a.pathname)
    if (r) [r.file, ...r.layouts].forEach((f) => void load(f).catch(() => {}))
  }
  document.addEventListener("pointerover", prefetch)
  document.addEventListener("focusin", prefetch)
}

function linkFrom(e: MouseEvent): HTMLAnchorElement | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null
  const a = (e.target as Element | null)?.closest?.("a")
  if (!a || !a.href || a.target || a.hasAttribute("download") || a.dataset.reload != null) return null
  if (a.origin !== location.origin) return null
  if (a.pathname === location.pathname && a.hash) return null
  return a
}

function mountShell(
  mount: (model: Model<unknown>, plate: Element) => () => void,
  layouts: Model<any>[],
  view: ReturnType<typeof signal<View>>,
  plate: Element,
): () => void {
  const app: Model<unknown> = (_, into) => {
    let inner = (o: Node) =>
      insert(o, () => {
        const v = view.get()
        return renderable((i: Node) => component(i, v.page, v.props))
      })
    for (const layout of [...layouts].reverse()) {
      const child = inner
      const infill = renderable(child)
      inner = (o) => component(o, layout, props([() => view.get().props as unknown as Record<string, unknown>, { infill }]))
    }
    inner(into as Node)
  }
  if (mount === print) plate.replaceChildren()
  return mount(app, plate)
}
