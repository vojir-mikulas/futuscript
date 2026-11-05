import { describe, expect, it } from "vitest"
import { batch, computed, effect, onCleanup, root, signal, untrack } from "../src/reactive.ts"

describe("signály", () => {
  it("computed je líný a cachovaný", () => {
    const a = signal(1)
    let runs = 0
    const double = computed(() => (runs++, a.get() * 2))
    expect(runs).toBe(0)
    expect(double.get()).toBe(2)
    expect(double.get()).toBe(2)
    expect(runs).toBe(1)
    a.set(5)
    expect(double.get()).toBe(10)
    expect(runs).toBe(2)
  })

  it("diamant se přepočítá jednou a bez glitche", () => {
    const a = signal(1)
    const b = computed(() => a.get() + 1)
    const c = computed(() => a.get() * 10)
    const seen: string[] = []
    effect(() => {
      seen.push(`${b.get()}/${c.get()}`)
    })
    a.set(2)
    expect(seen).toEqual(["2/10", "3/20"])
  })

  it("efekt neběží, když se computed nezmění", () => {
    const a = signal(1)
    const parity = computed(() => a.get() % 2)
    let runs = 0
    effect(() => {
      parity.get()
      runs++
    })
    a.set(3)
    expect(runs).toBe(1)
    a.set(4)
    expect(runs).toBe(2)
  })

  it("batch spojí víc zápisů do jednoho běhu efektu", () => {
    const a = signal(1)
    const b = signal(2)
    let runs = 0
    effect(() => {
      a.get()
      b.get()
      runs++
    })
    batch(() => {
      a.set(10)
      b.set(20)
    })
    expect(runs).toBe(2)
  })

  it("dynamické závislosti: neaktivní větev se nesleduje", () => {
    const flag = signal(true)
    const x = signal(1)
    let runs = 0
    effect(() => {
      runs++
      if (flag.get()) x.get()
    })
    flag.set(false)
    x.set(2)
    expect(runs).toBe(2)
  })

  it("untrack nečte jako závislost", () => {
    const a = signal(1)
    let runs = 0
    effect(() => {
      untrack(() => a.get())
      runs++
    })
    a.set(2)
    expect(runs).toBe(1)
  })

  it("cleanup a dispose přes root", () => {
    const a = signal(1)
    const log: string[] = []
    let dispose!: () => void
    root((d) => {
      dispose = d
      effect(() => {
        const v = a.get()
        log.push(`run ${v}`)
        onCleanup(() => log.push(`clean ${v}`))
      })
    })
    a.set(2)
    dispose()
    a.set(3)
    expect(log).toEqual(["run 1", "clean 1", "run 2", "clean 2"])
  })

  it("computed nejde přepsat", () => {
    const c = computed(() => 1) as unknown as { set(v: number): void }
    expect(() => c.set(2)).toThrow()
  })
})
