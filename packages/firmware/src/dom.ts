import {
  batch,
  computed,
  effect,
  flushMount,
  getOwner,
  onCleanup,
  provide,
  root,
  runWithOwner,
  signal,
  untrack,
  userEffect,
  type Computed,
  type Signal,
} from "./reactive.ts"
import { RENDER, clsx, isRenderable, styleText, toText, type Model } from "./shared.ts"
import {
  LayerCtx,
  hydrationLayer,
  nextLayerId,
  resource as makeResource,
  setHydrationData,
  type ClientLayer,
  type Rpc,
} from "./data.ts"

export const frag = (): DocumentFragment => document.createDocumentFragment()
const marker = (): Comment => document.createComment("")

let hydrating = false
let cursors = new WeakMap<Node, Node | null>()

function peek(parent: Node): Node | null {
  return cursors.has(parent) ? cursors.get(parent)! : parent.firstChild
}

function mismatch(what: string, found: Node | null) {
  console.warn(`hydratace: čekal jsem ${what}, našel jsem`, found)
}

function claimElement(parent: Node, tag: string, create: () => Element): Element {
  const n = peek(parent)
  if (n instanceof Element && n.localName === tag.toLowerCase()) {
    cursors.set(parent, n.nextSibling)
    return n
  }
  mismatch(`<${tag}>`, n)
  const e = create()
  parent.insertBefore(e, n)
  return e
}

function claimComment(parent: Node): Comment {
  const n = peek(parent)
  if (n?.nodeType === 8) {
    cursors.set(parent, n.nextSibling)
    return n as Comment
  }
  mismatch("<!---->", n)
  const c = marker()
  parent.insertBefore(c, n)
  return c
}

function claimText(parent: Node, s: string): Text {
  const n = peek(parent)
  if (s && n?.nodeType === 3) {
    const t = n as Text
    if (t.data.length > s.length) t.splitText(s.length)
    if (t.data !== s) mismatch(JSON.stringify(s), t)
    cursors.set(parent, t.nextSibling)
    return t
  }
  if (s) mismatch(JSON.stringify(s), n)
  const t = document.createTextNode(s)
  parent.insertBefore(t, n)
  return t
}

function comment(parent: Node): Comment {
  if (hydrating) return claimComment(parent)
  const c = marker()
  parent.appendChild(c)
  return c
}

export function el(parent: Node, tag: string): HTMLElement {
  if (hydrating) return claimElement(parent, tag, () => document.createElement(tag)) as HTMLElement
  const e = document.createElement(tag)
  parent.appendChild(e)
  return e
}

export function svg(parent: Node, tag: string): SVGElement {
  const create = () => document.createElementNS("http://www.w3.org/2000/svg", tag)
  if (hydrating) return claimElement(parent, tag, create) as SVGElement
  const e = create()
  parent.appendChild(e)
  return e
}

export function text(parent: Node, s: string): void {
  if (hydrating) claimText(parent, s)
  else parent.appendChild(document.createTextNode(s))
}

function removeRange(start: Node, end: Node) {
  let n: Node | null = start
  while (n) {
    const next: Node | null = n.nextSibling
    n.parentNode?.removeChild(n)
    if (n === end) break
    n = next
  }
}

function clearBetween(start: Node, end: Node) {
  let n = start.nextSibling
  while (n && n !== end) {
    const next = n.nextSibling
    n.parentNode!.removeChild(n)
    n = next
  }
}

function moveRange(start: Node, end: Node, parent: Node, before: Node) {
  let n: Node | null = start
  while (n) {
    const next: Node | null = n.nextSibling
    parent.insertBefore(n, before)
    if (n === end) break
    n = next
  }
}

export function insert(parent: Node, get: () => unknown): void {
  let node: Text | null = hydrating ? null : parent.appendChild(document.createTextNode(""))
  let start: Comment | null = null
  effect(() => {
    const v = get()
    if (isRenderable(v)) {
      untrack(() => {
        if (!node) {
          start = claimComment(parent)
          root(() => v[RENDER](parent))
          node = claimText(parent, "")
        } else {
          if (node.data) node.data = ""
          if (!start) {
            start = marker()
            node.parentNode!.insertBefore(start, node)
          }
          const f = frag()
          root(() => v[RENDER](f))
          node.parentNode!.insertBefore(f, node)
        }
        const s = start!
        const end = node
        onCleanup(() => clearBetween(s, end))
      })
      return
    }
    const s = toText(v)
    if (!node) node = claimText(parent, s)
    else if (node.data !== s) node.data = s
  })
}

const enhanced = new WeakSet<Element>()

export function attr(node: Element, name: string, get: () => unknown): void {
  effect(() => {
    const v = get()
    if (name === "action" && typeof v === "function" && (v as Rpc).url) return formAction(node as HTMLFormElement, v as Rpc)
    setAttr(node, name, v)
  })
}

function formAction(form: HTMLFormElement, fn: Rpc) {
  form.setAttribute("action", fn.url)
  form.setAttribute("method", "post")
  ;(form as unknown as { __futuAction: Rpc }).__futuAction = fn
  if (enhanced.has(form)) return
  enhanced.add(form)
  form.addEventListener("submit", (e) => {
    e.preventDefault()
    const action = (form as unknown as { __futuAction: Rpc }).__futuAction
    void action(new FormData(form)).then(() => form.reset())
  })
}

export function resource<T>(fn: () => Promise<T> | T) {
  return makeResource(fn, hydrating)
}

function setAttr(node: Element, name: string, v: unknown) {
  if (v == null || v === false) node.removeAttribute(name)
  else node.setAttribute(name, v === true ? "" : String(v))
}

export function style(node: Element, get: () => unknown): void {
  effect(() => setStyle(node, get()))
}

function setStyle(node: Element, v: unknown) {
  const css = styleText(v)
  if (css == null) node.removeAttribute("style")
  else node.setAttribute("style", css)
}

export function prop(node: Element, name: string, get: () => unknown): void {
  effect(() => {
    ;(node as unknown as Record<string, unknown>)[name] = get()
  })
}

export function cls(node: Element, get: () => unknown, scope?: string): void {
  effect(() => {
    const c = clsx([get(), scope])
    node.setAttribute("class", c)
  })
}

export function on(node: EventTarget, type: string, get: () => unknown): void {
  const listener = (event: Event) => {
    const handler = untrack(get)
    if (typeof handler === "function") batch(() => handler.call(node, event))
  }
  node.addEventListener(type, listener)
  if (!(node instanceof Element)) onCleanup(() => node.removeEventListener(type, listener))
}

export function spread(node: Element, get: () => Record<string, unknown> | null | undefined, base?: () => string): void {
  let prev = new Map<string, unknown>()
  const listeners = new Map<string, EventListener>()
  effect(() => {
    const next = new Map(Object.entries(get() ?? {}))
    untrack(() => {
      for (const [k] of prev) {
        if (next.has(k)) continue
        if (listeners.has(k)) {
          node.removeEventListener(k.slice(2), listeners.get(k)!)
          listeners.delete(k)
        } else if (k !== "class") node.removeAttribute(k)
      }
      for (const [k, v] of next) {
        if (k === "class") continue
        if (k.startsWith("on") && typeof v === "function") {
          if (prev.get(k) === v) continue
          const old = listeners.get(k)
          if (old) node.removeEventListener(k.slice(2), old)
          const l: EventListener = (e) => batch(() => (v as (e: Event) => void).call(node, e))
          listeners.set(k, l)
          node.addEventListener(k.slice(2), l)
        } else if (k === "style") setStyle(node, v)
        else if (typeof v !== "function" && !isRenderable(v)) setAttr(node, k, v)
      }
    })
    const c = clsx([base?.(), next.get("class")])
    if (c) node.setAttribute("class", c)
    else node.removeAttribute("class")
    prev = next
  })
}

export function bindGroup(node: Element, get: () => unknown, set: (v: unknown) => void): void {
  const input = node as HTMLInputElement
  effect(() => {
    const g = get()
    input.checked = Array.isArray(g) ? g.includes(input.value) : g === input.value
  })
  input.addEventListener("change", () => {
    const g = untrack(get)
    batch(() => {
      if (!Array.isArray(g)) return input.checked && set(input.value)
      const without = g.filter((v) => v !== input.value)
      set(input.checked ? [...without, input.value] : without)
    })
  })
}

export function bindThis(node: Element, set: (el: Element | null) => void): void {
  set(node)
  onCleanup(() => set(null))
}

export type Action<P = any> = (node: Element, params: P) => void | (() => void) | { destroy(): void }

export function use<P>(node: Element, action: Action<P>, params?: () => P): void {
  userEffect(() => {
    const p = params?.() as P
    const r = untrack(() => action(node, p))
    if (typeof r === "function") return r
    if (r && typeof r === "object" && "destroy" in r) return () => r.destroy()
  })
}

let serverHeadCleared = false

const titles: { v: string }[] = []
const applyTitle = () => {
  const t = titles.at(-1)
  if (t) document.title = t.v
}

export function head(build: (into: Node) => void, title: (() => string) | null): void {
  if (title) {
    const entry = { v: "" }
    titles.push(entry)
    onCleanup(() => {
      titles.splice(titles.indexOf(entry), 1)
      applyTitle()
    })
    effect(() => {
      entry.v = title()
      applyTitle()
    })
  }
  untrack(() => {
    if (!serverHeadCleared) {
      serverHeadCleared = true
      const nodes = Array.from(document.head.childNodes)
      const s = nodes.findIndex((n) => n.nodeType === 8 && (n as Comment).data === "fh")
      const e = nodes.findIndex((n) => n.nodeType === 8 && (n as Comment).data === "/fh")
      if (s >= 0 && e > s) nodes.slice(s, e + 1).forEach((n) => n.remove())
    }
    const was = hydrating
    hydrating = false
    try {
      const start = marker()
      const end = marker()
      const f = frag()
      f.appendChild(start)
      root(() => build(f))
      f.appendChild(end)
      if (start.nextSibling !== end) {
        document.head.appendChild(f)
        onCleanup(() => removeRange(start, end))
      }
    } finally {
      hydrating = was
    }
  })
}

type Build = (into: Node) => void

export function layer(
  parent: Node,
  build: Build,
  pending: Build | null,
  caught: ((into: Node, err: unknown) => void) | null,
): void {
  const owner = getOwner()
  const id = nextLayerId(LayerCtx.use())
  const L: ClientLayer = { id, count: 0, waiting: signal(0), error: signal<unknown>(undefined), data: [], index: 0 }
  const scoped = (fn: () => void) =>
    runWithOwner(owner, () =>
      root((d) => {
        provide(LayerCtx, () => L)
        fn()
        return d
      }),
    )

  const start = comment(parent)
  let end: Comment | null = null
  let shown: "pending" | "body" | "error" | null = null
  let disposeBody: (() => void) | null = null
  let disposePending: (() => void) | null = null
  let bodyFrag: DocumentFragment | null = null

  if (hydrating) {
    const h = hydrationLayer(id)
    L.data = h?.data ?? []
    if (h?.error && caught) {
      scoped(() => caught(parent, h.error))
      shown = "error"
    } else {
      disposeBody = scoped(() => build(parent))
      shown = "body"
    }
    end = claimComment(parent)
  } else {
    end = comment(parent)
    bodyFrag = frag()
    try {
      const f = bodyFrag
      disposeBody = scoped(() => build(f))
    } catch (e) {
      L.error.set(e)
    }
  }

  const insert = (f: Node) => end!.parentNode!.insertBefore(f, end)
  effect(() => {
    const err = L.error.get()
    const waiting = L.waiting.get() > 0
    untrack(() => {
      if (err !== undefined) {
        if (shown === "error") return
        disposeBody?.()
        disposePending?.()
        clearBetween(start, end!)
        shown = "error"
        if (!caught) return console.error(err)
        const f = frag()
        scoped(() => caught(f, err))
        insert(f)
        return
      }
      if (shown === "body" || shown === "error") return
      if (waiting && pending) {
        if (shown === "pending") return
        const f = frag()
        disposePending = scoped(() => pending(f))
        insert(f)
        shown = "pending"
        return
      }
      if (waiting) return
      disposePending?.()
      clearBetween(start, end!)
      insert(bodyFrag!)
      shown = "body"
    })
  })
}

export function portal(target: () => Node | null | undefined, build: (into: Node) => void): void {
  effect(() => {
    const t = target() ?? document.body
    untrack(() => {
      const was = hydrating
      hydrating = false
      try {
        const start = marker()
        const end = marker()
        const f = frag()
        f.appendChild(start)
        root(() => build(f))
        f.appendChild(end)
        t.appendChild(f)
        onCleanup(() => removeRange(start, end))
      } finally {
        hydrating = was
      }
    })
  })
}

export function branch(parent: Node, conds: (() => unknown)[], builders: ((into: Node) => void)[]): void {
  const start = comment(parent)
  let end: Comment | null = hydrating ? null : comment(parent)
  const index = computed(() => {
    for (let i = 0; i < conds.length; i++) if (conds[i]!()) return i
    return conds.length
  })
  effect(() => {
    const build = builders[index.get()]
    untrack(() => {
      if (!end) {
        if (build) root(() => build(parent))
        end = claimComment(parent)
      } else if (build) {
        const f = frag()
        root(() => build(f))
        end.parentNode!.insertBefore(f, end)
      }
      const e = end
      if (build) onCleanup(() => clearBetween(start, e))
    })
  })
}

interface Entry<T> {
  start: Comment
  end: Comment
  item: Signal<T>
  index: Signal<number>
  dispose: () => void
}

export function each<T>(
  parent: Node,
  list: () => Iterable<T> | ArrayLike<T> | null | undefined,
  key: ((item: T, index: number) => unknown) | null,
  build: (into: Node, item: Computed<T>, index: Computed<number>) => void,
  empty?: (into: Node) => void,
): void {
  const owner = getOwner()
  let anchor: Comment | null = hydrating ? null : comment(parent)
  let entries = new Map<unknown, Entry<T>>()
  let emptyRange: { start: Comment; end: Comment; dispose: () => void } | null = null

  // Položky patří vlastníkovi smyčky, ne efektu, aby přežily jeho další běh.
  const mount = (fill: (into: Node) => void) => {
    if (!anchor) {
      const start = claimComment(parent)
      const dispose = runWithOwner(owner, () =>
        root((d) => {
          fill(parent)
          return d
        }),
      )
      return { start, end: claimComment(parent), dispose, f: null }
    }
    const start = marker()
    const end = marker()
    const f = frag()
    f.appendChild(start)
    const dispose = runWithOwner(owner, () =>
      root((d) => {
        fill(f)
        return d
      }),
    )
    f.appendChild(end)
    return { start, end, dispose, f }
  }

  effect(() => {
    const items = Array.from(list() ?? [])
    untrack(() =>
      batch(() => {
        const next = new Map<unknown, Entry<T>>()
        const ordered: Entry<T>[] = []
        items.forEach((value, i) => {
          let k: unknown = key ? key(value, i) : i
          if (next.has(k)) {
            console.warn(`(<each>): klíč ${String(k)} je tu dvakrát, položky se můžou splést`)
            k = Symbol()
          }
          let e = entries.get(k)
          if (e) {
            entries.delete(k)
            e.item.set(value)
            e.index.set(i)
          } else {
            const item = signal(value)
            const index = signal(i)
            const m = mount((into) => build(into, item, index))
            e = { start: m.start, end: m.end, item, index, dispose: m.dispose }
          }
          next.set(k, e)
          ordered.push(e)
        })
        for (const e of entries.values()) {
          e.dispose()
          removeRange(e.start, e.end)
        }
        entries = next

        if (!anchor) {
          if (!ordered.length && empty) emptyRange = mount(empty)
          anchor = claimComment(parent)
          return
        }

        const p = anchor.parentNode!
        let ref: Node = anchor
        for (let j = ordered.length - 1; j >= 0; j--) {
          const e = ordered[j]!
          if (e.end.nextSibling !== ref) moveRange(e.start, e.end, p, ref)
          ref = e.start
        }

        if (ordered.length && emptyRange) {
          emptyRange.dispose()
          removeRange(emptyRange.start, emptyRange.end)
          emptyRange = null
        } else if (!ordered.length && empty && !emptyRange) {
          const m = mount(empty)
          p.insertBefore(m.f!, anchor)
          emptyRange = m
        }
      }),
    )
  })
}

export function component<P>(parent: Node, model: Model<P>, props: P): void {
  untrack(() => root(() => model(props, parent)))
}

export function bind(
  node: Element,
  prop: "value" | "checked",
  get: () => unknown,
  set: (value: unknown) => void,
): void {
  const input = node as HTMLInputElement
  effect(() => {
    const v = get()
    if (prop === "checked") input.checked = !!v
    else {
      const s = v == null ? "" : String(v)
      if (input.value !== s) input.value = s
    }
  })
  const type = prop === "checked" || input.tagName === "SELECT" ? "change" : "input"
  input.addEventListener(type, () => {
    const numeric = input.type === "number" || input.type === "range"
    batch(() => set(prop === "checked" ? input.checked : numeric ? input.valueAsNumber : input.value))
  })
}

const styles = new Set<string>()

export function css(id: string, text: string): void {
  if (styles.has(id) || typeof document === "undefined") return
  styles.add(id)
  if (document.head.querySelector(`style[data-futu="${id}"]`)) return
  const style = document.createElement("style")
  style.dataset.futu = id
  style.textContent = text
  document.head.appendChild(style)
}

export function transition(fn: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition) doc.startViewTransition(() => batch(fn))
  else batch(fn)
}

export function print<P>(model: Model<P>, plate: Element, props?: P): () => void {
  const start = marker()
  const end = marker()
  plate.appendChild(start)
  let disposeRoot!: () => void
  root((dispose) => {
    disposeRoot = dispose
    untrack(() => model(props ?? ({} as P), plate))
  })
  plate.appendChild(end)
  flushMount()
  return () => {
    disposeRoot()
    removeRange(start, end)
  }
}

export function heat<P>(
  model: Model<P>,
  plate: Element,
  props?: P,
  data: unknown[] = [],
  layers: Record<string, { data: unknown[]; error?: { message: string } }> = {},
): () => void {
  let disposeRoot!: () => void
  setHydrationData(data, layers)
  hydrating = true
  cursors = new WeakMap()
  try {
    root((dispose) => {
      disposeRoot = dispose
      untrack(() => model(props ?? ({} as P), plate))
    })
  } finally {
    hydrating = false
  }
  flushMount()
  return () => {
    disposeRoot()
    plate.replaceChildren()
  }
}
