// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest"
import { print } from "@futuscript/firmware"
import Counter from "../../examples/Counter.fs"

const tick = () => new Promise((r) => setTimeout(r, 0))

describe("Counter.fs end-to-end (Slicer → Firmware → DOM)", () => {
  it("vytiskne, kliká a přepíná (<if>)", async () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {})
    const plate = document.createElement("div")
    document.body.append(plate)
    const unprint = print(Counter, plate, { start: 8 })

    const button = plate.querySelector("button")!
    const p = () => plate.querySelector("p")!.textContent
    expect(button.textContent).toBe("Klik 8")
    expect(p()).toBe("Dvojnásobek: 16")
    expect(button.hasAttribute("disabled")).toBe(false)

    button.click()
    expect(button.textContent).toBe("Klik 9")
    expect(p()).toBe("Dvojnásobek: 18")

    button.click()
    expect(button.textContent).toBe("Klik 10")
    expect(p()).toBe("Dost. Vychladni.")
    expect(plate.querySelectorAll("p")).toHaveLength(1)
    expect(button.hasAttribute("disabled")).toBe(true)

    // scoped CSS: třída na elementech + <style> v head
    const scope = button.className
    expect(scope).toMatch(/^f-[0-9a-z]{6}$/)
    expect(document.head.querySelector(`style[data-futu="${scope}"]`)!.textContent).toContain(`button.${scope}`)

    // M106 + M117: efekt běží po mountu a při každé změně
    await tick()
    expect(debug.mock.calls.map((c) => c[0])).toEqual(["count je 8", "count je 9", "count je 10"])

    unprint()
    expect(plate.innerHTML).toBe("")
  })
})
