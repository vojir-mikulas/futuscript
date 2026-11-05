import { context, effect, signal, untrack, type Signal } from "./reactive.ts"

export interface ClientLayer {
  id: string
  count: number
  waiting: Signal<number>
  error: Signal<unknown>
  data: unknown[]
  index: number
}

export const LayerCtx = context<ClientLayer | null>(null)

interface HydrationLayer {
  data: unknown[]
  error?: { message: string }
}

let hydrationData: unknown[] = []
let hydrationIndex = 0
let hydrationLayers: Record<string, HydrationLayer> = {}
let layerCounter = 0
let muted = false

export function setHydrationData(data: unknown[], layers: Record<string, HydrationLayer> = {}): void {
  hydrationData = data
  hydrationIndex = 0
  hydrationLayers = layers
  layerCounter = 0
}

export function nextLayerId(parent: ClientLayer | null): string {
  return parent ? `${parent.id}.${parent.count++}` : String(layerCounter++)
}

export const hydrationLayer = (id: string): HydrationLayer | undefined => hydrationLayers[id]

function takeHydrationData(L: ClientLayer | null): { ok: boolean; value?: unknown } {
  if (L) return L.index < L.data.length ? { ok: true, value: L.data[L.index++] } : { ok: false }
  if (hydrationIndex < hydrationData.length) return { ok: true, value: hydrationData[hydrationIndex++] }
  return { ok: false }
}

export interface Resource<T> {
  get(): T | undefined
  loading(): boolean
  error(): unknown
}

export function resource<T>(fn: () => Promise<T> | T, hydrating: boolean): Resource<T> {
  const value = signal<T | undefined>(undefined)
  const loading = signal(true)
  const error = signal<unknown>(undefined)
  let skipFirst = false
  const L = LayerCtx.use()
  let counted = false
  const wait = (on: boolean) => {
    if (!L || on === counted) return
    counted = on
    untrack(() => L.waiting.set(L.waiting.get() + (on ? 1 : -1)))
  }
  if (hydrating) {
    const d = takeHydrationData(L)
    if (d.ok) {
      value.set(d.value as T)
      loading.set(false)
      skipFirst = true
    }
  }
  let run = 0
  effect(() => {
    const id = ++run
    if (skipFirst) {
      skipFirst = false
      muted = true
      try {
        fn()
      } finally {
        muted = false
      }
      return
    }
    let p: Promise<T> | T
    try {
      p = fn()
    } catch (e) {
      error.set(e)
      if (L) untrack(() => L.error.set(e))
      return
    }
    untrack(() => loading.set(true))
    wait(true)
    Promise.resolve(p).then(
      (v) => {
        if (id !== run) return
        value.set(v)
        error.set(undefined)
        loading.set(false)
        wait(false)
      },
      (e) => {
        if (id !== run) return
        error.set(e)
        loading.set(false)
        wait(false)
        if (L) L.error.set(e)
      },
    )
  })
  return { get: () => value.get(), loading: () => loading.get(), error: () => error.get() }
}

const version = signal(0)

export type Rpc = ((...args: unknown[]) => Promise<unknown>) & { url: string; refresh(): void }

export function rpc(id: string): Rpc {
  const url = `/_futu/rpc?id=${encodeURIComponent(id)}`
  const call = ((...args: unknown[]) => {
    version.get()
    if (muted) return new Promise(() => {})
    const form = args.length === 1 && args[0] instanceof FormData
    const init: RequestInit = form
      ? { method: "POST", headers: { "x-futu-rpc": "1" }, body: args[0] as FormData }
      : { method: "POST", headers: { "content-type": "application/json", "x-futu-rpc": "1" }, body: JSON.stringify({ id, args }) }
    return fetch(url, init).then(async (r) => {
      const j = (await r.json()) as { result?: unknown; error?: string; kind?: string }
      if (!r.ok) throw new Error(j.error ?? `RPC ${id} selhalo (${r.status})`)
      if (j.kind === "action") version.set(version.get() + 1)
      return j.result
    })
  }) as Rpc
  call.url = url
  call.refresh = () => version.set(version.get() + 1)
  return call
}
