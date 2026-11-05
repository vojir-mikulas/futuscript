export const RENDER = Symbol.for("futuscript.renderable")

export interface Renderable<Into = any> {
  readonly [RENDER]: (into: Into) => void
}
export type Macro = Renderable

export function renderable<Into>(build: (into: Into) => void): Renderable<Into> {
  return { [RENDER]: build }
}

export const isRenderable = (v: unknown): v is Renderable => typeof v === "object" && v !== null && RENDER in v

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

export function styleText(v: unknown): string | null {
  if (v == null || v === false) return null
  if (typeof v !== "object") return String(v)
  return Object.entries(v as Record<string, unknown>)
    .filter(([, x]) => x != null && x !== false)
    .map(([k, x]) => `${k.startsWith("--") ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${x}`)
    .join(";")
}

export const toText = (v: unknown): string => (v == null || typeof v === "boolean" ? "" : String(v))

type Source = Record<string, unknown> | (() => Record<string, unknown> | null | undefined)

export function props(sources: Source[]): Record<string, unknown> {
  const resolve = (s: Source) => (typeof s === "function" ? s() : s) ?? {}
  const find = (key: string | symbol) => {
    for (let i = sources.length - 1; i >= 0; i--) {
      const o = resolve(sources[i]!)
      if (key in o) return o
    }
  }
  return new Proxy({} as Record<string, unknown>, {
    get: (_, key) => find(key)?.[key as string],
    has: (_, key) => !!find(key),
    ownKeys: () => [...new Set(sources.flatMap((s) => Reflect.ownKeys(resolve(s))))],
    getOwnPropertyDescriptor: (_, key) => {
      const o = find(key)
      return o ? { enumerable: true, configurable: true, value: o[key as string] } : undefined
    },
  })
}

export function rest(all: Record<string, unknown>, exclude: string[]): Record<string, unknown> {
  const skip = new Set<string | symbol>(exclude)
  return new Proxy({} as Record<string, unknown>, {
    get: (_, key) => (skip.has(key) ? undefined : all[key as string]),
    has: (_, key) => !skip.has(key) && key in all,
    ownKeys: () => Reflect.ownKeys(all).filter((k) => !skip.has(k)),
    getOwnPropertyDescriptor: (_, key) =>
      !skip.has(key) && key in all ? { enumerable: true, configurable: true, value: all[key as string] } : undefined,
  })
}

export type Model<P = Record<string, unknown>, Into = any> = (props: P, into: Into) => void
