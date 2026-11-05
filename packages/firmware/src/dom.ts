/** DOM helpery, na které Slicer kompiluje šablony. Žádný VDOM, jen přímé operace a efekty. */

import {
  batch,
  computed,
  effect,
  flushMount,
  getOwner,
  onCleanup,
  root,
  runWithOwner,
  signal,
  untrack,
  type Computed,
  type Signal,
} from "./reactive.ts"

export const frag = (): DocumentFragment => document.createDocumentFragment()
export const el = (tag: string): HTMLElement => document.createElement(tag)
const marker = (): Comment => document.createComment("")

/** Odebere uzly od `start` do `end` včetně. */
function removeRange(start: Node, end: Node) {
  let n: Node | null = start
  while (n) {
    const next: Node | null = n.nextSibling
    n.parentNode?.removeChild(n)
    if (n === end) break
    n = next
  }
}

/** Odebere uzly mezi `start` a `end` (bez nich). */
function clearBetween(start: Node, end: Node) {
  let n = start.nextSibling
  while (n && n !== end) {
    const next = n.nextSibling
    n.parentNode!.removeChild(n)
    n = next
  }
}

/** Přesune uzly od `start` do `end` včetně před `before`. */
function moveRange(start: Node, end: Node, parent: Node, before: Node) {
  let n: Node | null = start
  while (n) {
    const next: Node | null = n.nextSibling
    parent.insertBefore(n, before)
    if (n === end) break
    n = next
  }
}

/** `{výraz}` v textu. */
export function insert(parent: Node, get: () => unknown): void {
  const text = document.createTextNode("")
  parent.appendChild(text)
  effect(() => {
    const v = get()
    const s = v == null || typeof v === "boolean" ? "" : String(v)
    if (text.data !== s) text.data = s
  })
}

/** Dynamický atribut. `false`/`null`/`undefined` atribut odebere, `true` ho nastaví prázdný. */
export function attr(node: Element, name: string, get: () => unknown): void {
  effect(() => {
    const v = get()
    if (v == null || v === false) node.removeAttribute(name)
    else node.setAttribute(name, v === true ? "" : String(v))
  })
}

/** Vlastnost elementu (`value`, `checked`). */
export function prop(node: Element, name: string, get: () => unknown): void {
  effect(() => {
    ;(node as unknown as Record<string, unknown>)[name] = get()
  })
}

/** `class` jako string, pole nebo objekt (clsx sémantika). */
export function cls(node: Element, get: () => unknown, scope?: string): void {
  effect(() => {
    const c = clsx(get())
    node.className = scope ? (c ? `${c} ${scope}` : scope) : c
  })
}

export function clsx(v: unknown): string {
  if (!v) return ""
  if (typeof v === "string") return v
  if (Array.isArray(v)) return v.map(clsx).filter(Boolean).join(" ")
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, on]) => on)
      .map(([k]) => k)
      .join(" ")
  }
  return String(v)
}

/** `onclick={handler}`. Handler se čte až při eventu, takže smí být reaktivní výraz. */
export function on(node: Element, type: string, get: () => unknown): void {
  node.addEventListener(type, (event) => {
    const handler = untrack(get)
    if (typeof handler === "function") batch(() => handler.call(node, event))
  })
}

/**
 * `(<if>) … (<elseif>) … (<else>) … (</if>)`. Větev se přestaví jen při změně indexu,
 * ne při každé změně podmínky.
 */
export function branch(
  parent: Node,
  conds: (() => unknown)[],
  builders: ((into: DocumentFragment) => void)[],
): void {
  // Větev žije mezi dvěma značkami, takže se uklidí celá, i když do ní vnořený each později přidal uzly.
  const start = marker()
  const end = marker()
  parent.appendChild(start)
  parent.appendChild(end)
  const index = computed(() => {
    for (let i = 0; i < conds.length; i++) if (conds[i]!()) return i
    return conds.length
  })
  effect(() => {
    const build = builders[index.get()]
    if (!build) return
    untrack(() => {
      const f = frag()
      root(() => build(f))
      end.parentNode!.insertBefore(f, end)
      onCleanup(() => clearBetween(start, end))
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

/**
 * `(<each> item, index of list by key )` … `(<empty>)` … `(</each>)`.
 *
 * Položky se párují podle klíče (bez `by` podle indexu). Existující položka se nepřestaví,
 * jen dostane novou hodnotu do svého signálu, takže DOM i stav uvnitř zůstanou.
 */
export function each<T>(
  parent: Node,
  list: () => Iterable<T> | ArrayLike<T> | null | undefined,
  key: ((item: T, index: number) => unknown) | null,
  build: (into: DocumentFragment, item: Computed<T>, index: Computed<number>) => void,
  empty?: (into: DocumentFragment) => void,
): void {
  const owner = getOwner()
  const anchor = marker()
  parent.appendChild(anchor)
  let entries = new Map<unknown, Entry<T>>()
  let emptyRange: { start: Comment; end: Comment; dispose: () => void } | null = null

  // Položky patří vlastníkovi celé smyčky, ne efektu: přežijí jeho další běh.
  const mount = (fill: (f: DocumentFragment) => void) => {
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
            const m = mount((f) => build(f, item, index))
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
          p.insertBefore(m.f, anchor)
          emptyRange = m
        }
      }),
    )
  })
}

/** `<TodoItem {todo} />`. Props jsou gettery, takže dítě čte vždycky aktuální hodnotu. */
export function component<P>(parent: Node, model: Model<P>, props: P): void {
  parent.appendChild(untrack(() => model(props)))
}

/** `bind:value={x}` a `bind:checked={x}`. U `type="number"` a `"range"` vrací číslo. */
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

/** Scoped CSS z `(<filament>)`, vloží se jednou na komponentu. */
export function css(id: string, text: string): void {
  if (styles.has(id) || typeof document === "undefined") return
  styles.add(id)
  const style = document.createElement("style")
  style.dataset.futu = id
  style.textContent = text
  document.head.appendChild(style)
}

/** `M600 { … }`: změna stavu uvnitř View Transition, pokud ji prohlížeč umí. */
export function transition(fn: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown }
  if (doc.startViewTransition) doc.startViewTransition(() => batch(fn))
  else batch(fn)
}

export type Model<P = Record<string, unknown>> = (props: P) => Node

/** Vytiskne komponentu do elementu (mount). Vrací funkci, která ji zase sundá z build plate. */
export function print<P>(model: Model<P>, plate: Element, props?: P): () => void {
  const start = marker()
  const end = marker()
  let disposeRoot!: () => void
  const node = root((dispose) => {
    disposeRoot = dispose
    return untrack(() => model(props ?? ({} as P)))
  })
  plate.append(start, node, end)
  flushMount()
  return () => {
    disposeRoot()
    removeRange(start, end)
  }
}
