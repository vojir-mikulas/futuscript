/**
 * Reaktivní jádro: push-pull signály (algoritmus ve stylu Reactively / alien-signals).
 *
 * - `signal` drží hodnotu, `computed` je líná a cachovaná, `effect` běží při změně závislostí.
 * - Zápis jen označí závislé uzly (DIRTY přímé, CHECK tranzitivní). Přepočet proběhne až při
 *   čtení nebo flushi efektů, takže nevznikají glitche (diamant se přepočítá jednou).
 * - Ownership: efekty vytvořené uvnitř efektu/rootu jsou jeho děti a uklidí se s ním.
 */

const CLEAN = 0
const CHECK = 1
const DIRTY = 2
type State = typeof CLEAN | typeof CHECK | typeof DIRTY

export interface Owner {
  owner: Owner | null
  children: Owner[] | null
  cleanups: (() => void)[] | null
  disposed: boolean
}

class ReactiveNode<T = unknown> implements Owner {
  value: T
  fn: (() => T) | null
  isEffect: boolean
  state: State
  sources: ReactiveNode[] = []
  observers = new Set<ReactiveNode>()
  owner: Owner | null
  children: Owner[] | null = null
  cleanups: (() => void)[] | null = null
  disposed = false

  constructor(value: T, fn: (() => T) | null, isEffect: boolean) {
    this.value = value
    this.fn = fn
    this.isEffect = isEffect
    this.state = fn ? DIRTY : CLEAN
    this.owner = fn ? currentOwner : null
    if (fn && currentOwner) (currentOwner.children ??= []).push(this)
  }

  get(): T {
    if (currentObserver && !currentObserver.disposed && !currentObserver.sources.includes(this)) {
      currentObserver.sources.push(this)
      this.observers.add(currentObserver)
    }
    if (this.fn) updateIfNecessary(this)
    return this.value
  }

  /** Vrací zapsanou hodnotu, aby `x = 5` fungovalo i jako výraz. */
  set(value: T): T {
    if (this.fn) throw new Error("computed hodnota se nedá přepsat")
    if (Object.is(this.value, value)) return value
    this.value = value
    for (const o of this.observers) mark(o, DIRTY)
    if (!batchDepth) flush()
    return value
  }
}

export type Signal<T> = Pick<ReactiveNode<T>, "get" | "set">
export type Computed<T> = Pick<ReactiveNode<T>, "get">

let currentObserver: ReactiveNode | null = null
let currentOwner: Owner | null = null
let batchDepth = 0
let flushing = false
const queue: ReactiveNode[] = []

function mark(node: ReactiveNode, state: State) {
  if (node.state >= state) return
  const wasClean = node.state === CLEAN
  node.state = state
  if (!wasClean) return
  if (node.isEffect) queue.push(node)
  else for (const o of node.observers) mark(o, CHECK)
}

function updateIfNecessary(node: ReactiveNode) {
  if (node.state === CHECK) {
    for (const s of node.sources) {
      if (s.fn) updateIfNecessary(s)
      if ((node.state as State) === DIRTY) break
    }
  }
  if (node.state === DIRTY) run(node)
  node.state = CLEAN
}

function run(node: ReactiveNode) {
  clean(node)
  const prevObserver = currentObserver
  const prevOwner = currentOwner
  currentObserver = node
  currentOwner = node
  try {
    const value = node.fn!()
    if (node.isEffect) {
      if (typeof value === "function") (node.cleanups ??= []).push(value as () => void)
    } else if (!Object.is(value, node.value)) {
      node.value = value
      for (const o of node.observers) o.state = DIRTY
    }
  } finally {
    currentObserver = prevObserver
    currentOwner = prevOwner
  }
}

/** Uklidí děti, cleanupy a odpojí zdroje (před re-runem nebo při dispose). */
function clean(owner: Owner) {
  if (owner.children) {
    const children = owner.children
    owner.children = null
    for (const c of children) dispose(c)
  }
  if (owner.cleanups) {
    const cleanups = owner.cleanups
    owner.cleanups = null
    for (const c of cleanups) c()
  }
  if (owner instanceof ReactiveNode) {
    for (const s of owner.sources) s.observers.delete(owner)
    owner.sources = []
  }
}

function dispose(owner: Owner) {
  if (owner.disposed) return
  owner.disposed = true
  // Odpojit od rodiče, ať se v dlouho žijících seznamech nehromadí mrtví vlastníci.
  const siblings = owner.owner?.children
  if (siblings) {
    const i = siblings.indexOf(owner)
    if (i >= 0) siblings.splice(i, 1)
  }
  clean(owner)
}

function flush() {
  if (flushing) return
  flushing = true
  try {
    for (let i = 0; i < queue.length; i++) {
      const e = queue[i]!
      if (!e.disposed) updateIfNecessary(e)
    }
  } finally {
    queue.length = 0
    flushing = false
  }
}

/** `x++` / `++x` na signálu se správnou návratovou hodnotou (stará / nová). */
export function update(s: Signal<number>, delta: number, postfix: boolean): number {
  const old = s.get()
  s.set(old + delta)
  return postfix ? old : old + delta
}

export function signal<T>(value: T): Signal<T> {
  return new ReactiveNode(value, null, false)
}

export function computed<T>(fn: () => T): Computed<T> {
  return new ReactiveNode<T>(undefined as T, fn, false)
}

/** Efekt běží hned a pak při každé změně závislostí. Smí vrátit cleanup. */
export function effect(fn: () => void | (() => void)): () => void {
  const node = new ReactiveNode<unknown>(undefined, fn, true)
  run(node)
  node.state = CLEAN
  return () => dispose(node)
}

export function batch<T>(fn: () => T): T {
  batchDepth++
  try {
    return fn()
  } finally {
    if (--batchDepth === 0) flush()
  }
}

export function untrack<T>(fn: () => T): T {
  const prev = currentObserver
  currentObserver = null
  try {
    return fn()
  } finally {
    currentObserver = prev
  }
}

/** Nový owner. Pokud vzniká uvnitř jiného ownera, uklidí se s ním. */
export function root<T>(fn: (dispose: () => void) => T): T {
  const owner: Owner = { owner: currentOwner, children: null, cleanups: null, disposed: false }
  if (currentOwner) (currentOwner.children ??= []).push(owner)
  const prevOwner = currentOwner
  const prevObserver = currentObserver
  currentOwner = owner
  currentObserver = null
  try {
    return fn(() => dispose(owner))
  } finally {
    currentOwner = prevOwner
    currentObserver = prevObserver
  }
}

export function onCleanup(fn: () => void): void {
  if (currentOwner) (currentOwner.cleanups ??= []).push(fn)
}

/** `M107 { … }` */
export const onDestroy = onCleanup

export function getOwner(): Owner | null {
  return currentOwner
}

export function runWithOwner<T>(owner: Owner | null, fn: () => T): T {
  const prevOwner = currentOwner
  const prevObserver = currentObserver
  currentOwner = owner
  currentObserver = null
  try {
    return fn()
  } finally {
    currentOwner = prevOwner
    currentObserver = prevObserver
  }
}

const mountQueue: { owner: Owner | null; fn: () => void | (() => void) }[] = []
let mountScheduled = false

/**
 * `M106 { … }`: uživatelský efekt. Poprvé běží až po vložení do DOM (jako `$effect` ve Svelte),
 * takže v něm jde sahat na elementy.
 */
export function userEffect(fn: () => void | (() => void)): void {
  mountQueue.push({ owner: currentOwner, fn })
  if (!mountScheduled) {
    mountScheduled = true
    queueMicrotask(flushMount)
  }
}

export function flushMount(): void {
  mountScheduled = false
  const items = mountQueue.splice(0)
  for (const { owner, fn } of items) {
    if (owner?.disposed) continue
    runWithOwner(owner, () => effect(fn))
  }
}
