import { root, untrack } from "./reactive.ts"
import { RENDER, clsx, isRenderable, styleText, toText, type Model, type Renderable } from "./shared.ts"

export * from "./reactive.ts"
export { clsx, props, renderable, rest, toText } from "./shared.ts"
export type { Macro, Model, Renderable } from "./shared.ts"

export type Out = string[]

export const isServer = true

export function userEffect(): void {}
export const onDestroy = (): void => {}
export function transition(fn: () => void): void {
  fn()
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }
export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ESC[c]!)

export function text(v: unknown): string {
  if (isRenderable(v)) return "<!---->" + renderTo(v)
  return esc(toText(v))
}

function renderTo(r: Renderable<Out>): string {
  const out: Out = []
  untrack(() => root(() => r[RENDER](out)))
  return out.join("")
}

export function attr(name: string, v: unknown): string {
  if (v == null || v === false) return ""
  if (v === true) return ` ${name}`
  return ` ${name}="${esc(String(v))}"`
}

export const style = (v: unknown): string => attr("style", styleText(v))

export function group(g: unknown, value: string): boolean {
  return Array.isArray(g) ? g.includes(value) : g === value
}

export function spread(obj: Record<string, unknown> | null | undefined, base?: string): string {
  let out = ""
  let cls: unknown
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k === "class") cls = v
    else if (k === "style") out += style(v)
    else if (typeof v !== "function" && !isRenderable(v)) out += attr(k, v)
  }
  return attr("class", clsx([base, cls]) || null) + out
}

export function list<T>(v: Iterable<T> | ArrayLike<T> | null | undefined): [number, T][] {
  return Array.from(v ?? []).map((x, i) => [i, x])
}

export const value = <T>(v: T) => ({ get: () => v })

export function component<P>(out: Out, model: Model<P, Out>, props: P): void {
  untrack(() => root(() => model(props, out)))
}

let headParts: string[] = []
let headTitle: string | null = null

export function head(build: (out: Out) => void, title: (() => string) | null): void {
  const out: Out = []
  untrack(() => root(() => build(out)))
  headParts.push(out.join(""))
  if (title) headTitle = untrack(title)
}

export function takeHead(): { title: string | null; html: string } {
  const r = { title: headTitle, html: headParts.join("") }
  headParts = []
  headTitle = null
  return r
}

const registry = new Map<string, string>()

export function css(id: string, text: string): void {
  registry.set(id, text)
}

export function styles(): string {
  return [...registry].map(([id, css]) => `<style data-futu="${id}">${css}</style>`).join("")
}

export function renderToString<P>(model: Model<P, Out>, props?: P): string {
  const out: Out = []
  root((dispose) => {
    untrack(() => model(props ?? ({} as P), out))
    dispose()
  })
  return out.join("")
}
