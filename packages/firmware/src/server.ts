import { context, getOwner, provide, root, setOwner, untrack, type Owner } from "./reactive.ts"
import { RENDER, clsx, isInterrupt, isRenderable, styleText, toText, type Model, type Renderable } from "./shared.ts"

export * from "./reactive.ts"
export { clsx, isInterrupt, props, renderable, rest, toText } from "./shared.ts"
export type { Macro, Model, Renderable } from "./shared.ts"

export type Out = string[]

export const isServer = true

export function redirect(to: string, status = 307): never {
  throw { futuscript: "redirect", to, status }
}
export const navigate = (to: string): never => redirect(to)
export function notFound(): never {
  throw { futuscript: "notFound" }
}

export function userEffect(): void {}
export const onDestroy = (): void => {}
export function transition(fn: () => void): void {
  fn()
}

export interface LayerData {
  data: unknown[]
  error?: { message: string }
}

interface RenderState {
  data: unknown[]
  head: string[]
  title: string | null
  count: number
  layers: Record<string, LayerData>
  stream: ((chunk: string) => void) | null
  pending: Promise<void>[]
}

interface LayerState {
  id: string
  data: unknown[]
  count: number
}

const Render = context<RenderState | null>(null)
const Layer = context<LayerState | null>(null)

function state(owner: Owner | null): RenderState {
  setOwner(owner)
  const s = Render.use()
  if (!s) throw new Error("Futuscript: render mimo renderToString")
  return s
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }
export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ESC[c]!)

export async function text(v: unknown): Promise<string> {
  if (isRenderable(v)) return "<!---->" + (await renderTo(v))
  return esc(toText(v))
}

async function renderTo(r: Renderable<Out>): Promise<string> {
  const out: Out = []
  await r[RENDER](out)
  return out.join("")
}

type HostFn = ((...args: unknown[]) => unknown) & { url?: string; kind?: string }

export function attr(name: string, v: unknown): string {
  if (typeof v === "function") {
    const url = (v as HostFn).url
    return name === "action" && url ? ` action="${esc(url)}" method="post"` : ""
  }
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

export function data<T>(owner: Owner | null, v: T): { get: () => T } {
  const s = state(owner)
  ;(Layer.use() ?? s).data.push(v)
  return value(v)
}

const errorInfo = (e: unknown) => ({ message: e instanceof Error ? e.message : String(e) })

type Builder = (out: Out) => Promise<void>

export async function layer(
  out: Out,
  owner: Owner | null,
  body: Builder,
  pending: Builder | null,
  caught: ((out: Out, err: { message: string }) => Promise<void>) | null,
): Promise<void> {
  const s = state(owner)
  const parent = Layer.use()
  const id = parent ? `${parent.id}.${parent.count++}` : String(s.count++)
  const L: LayerState = { id, data: [], count: 0 }
  let lowner: Owner | null = null
  root(() => {
    provide(Layer, () => L)
    lowner = getOwner()
  })
  const run = async (): Promise<string> => {
    const o: Out = []
    try {
      setOwner(lowner)
      await body(o)
      s.layers[id] = { data: L.data }
      return o.join("")
    } catch (e) {
      if (isInterrupt(e) || !caught) throw e
      const err = errorInfo(e)
      const co: Out = []
      setOwner(lowner)
      await caught(co, err)
      s.layers[id] = { data: [], error: err }
      return co.join("")
    }
  }
  if (s.stream && !parent && pending) {
    const po: Out = []
    setOwner(lowner)
    await pending(po)
    out.push(`<!--[L:${id}-->`, po.join(""), "<!--]L-->")
    const stream = s.stream
    s.pending.push(
      run().then((html) => stream(`<template id="fL:${id}">${html}</template><script>$fL("${id}")</script>`)),
    )
    setOwner(owner)
    return
  }
  const html = await run()
  setOwner(owner)
  out.push("<!--[L-->", html, "<!--]L-->")
}

export const LAYER_SWAP =
  "<script>$fL=(i)=>{const t=document.getElementById('fL:'+i),w=document.createTreeWalker(document.body,128);let a,n;while((n=w.nextNode()))if(n.data==='[L:'+i){a=n;break}if(!a||!t)return;let e=a.nextSibling;while(e&&!(e.nodeType===8&&e.data===']L')){const x=e.nextSibling;e.remove();e=x}a.after(t.content);a.data='[L';t.remove()}</script>"

export async function component<P>(out: Out, model: Model<P, Out>, props: P, owner: Owner | null = null): Promise<void> {
  setOwner(owner)
  let done!: Promise<void>
  untrack(() =>
    root(() => {
      done = Promise.resolve(model(props, out) as unknown as Promise<void>)
    }),
  )
  await done
}

export async function head(build: (out: Out) => Promise<void> | void, title: (() => string) | null): Promise<void> {
  const owner = getOwner()
  const out: Out = []
  await build(out)
  const s = state(owner)
  s.head.push(out.join(""))
  if (title) s.title = untrack(title)
}

const registry = new Map<string, string>()

export function css(id: string, text: string): void {
  registry.set(id, text)
}

export function styles(): string {
  return [...registry].map(([id, css]) => `<style data-futu="${id}">${css}</style>`).join("")
}

const hostFns = new Map<string, HostFn>()

export function host(file: string, exports: Record<string, unknown>): void {
  for (const [name, fn] of Object.entries(exports)) {
    if (typeof fn !== "function") continue
    const id = `${file}#${name}`
    ;(fn as HostFn).url = `/_futu/rpc?id=${encodeURIComponent(id)}`
    hostFns.set(id, fn as HostFn)
  }
}

export const hostFn = (id: string): HostFn | undefined => hostFns.get(id)

export interface Rendered {
  html: string
  head: string
  title: string | null
  data: unknown[]
  layers: Record<string, LayerData>
  done: Promise<void>
}

export async function renderToString<P>(
  model: Model<P, Out>,
  props?: P,
  stream: ((chunk: string) => void) | null = null,
): Promise<Rendered> {
  const s: RenderState = { data: [], head: [], title: null, count: 0, layers: {}, stream, pending: [] }
  const out: Out = []
  let dispose!: () => void
  let owner: Owner | null = null
  root((d) => {
    dispose = d
    provide(Render, () => s)
    owner = getOwner()
  })
  try {
    await component(out, model, props ?? ({} as P), owner)
  } catch (e) {
    dispose()
    setOwner(null)
    throw e
  }
  setOwner(null)
  const done = (async () => {
    for (let i = 0; i < s.pending.length; i++) await s.pending[i]
  })().finally(dispose)
  if (!stream) await done
  return { html: out.join(""), head: s.head.join(""), title: s.title, data: s.data, layers: s.layers, done }
}
