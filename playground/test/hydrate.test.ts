import { describe, expect, it } from "vitest"
import { heat } from "@futuscript/firmware"
import { renderToString, styles } from "@futuscript/firmware/server"
import Counter from "../../examples/Counter.fs"
import CounterSSR from "../../examples/Counter.fs?ssr"
import Todo from "../../examples/Todo.fs"
import TodoSSR from "../../examples/Todo.fs?ssr"
import Kitchen from "./fixtures/Kitchen.fs"
import KitchenSSR from "./fixtures/Kitchen.fs?ssr"

function serve(html: string) {
  const plate = document.createElement("div")
  plate.innerHTML = html
  document.body.append(plate)
  return plate
}

describe("SSR + hydratace", () => {
  it("Counter: server HTML, heat převezme stejné uzly", async () => {
    const html = (await renderToString(CounterSSR, { start: 9 })).html
    expect(html).toContain("<button")
    expect(html).toContain("Klik 9")
    expect(html).toContain("Dvojnásobek: 18")
    expect(styles()).toContain("button.f-")

    const plate = serve(html)
    const button = plate.querySelector("button")!
    const p = plate.querySelector("p")!
    heat(Counter, plate, { start: 9 })
    expect(plate.querySelector("button")).toBe(button)
    expect(plate.querySelector("p")).toBe(p)

    button.click()
    expect(button.textContent).toBe("Klik 10")
    expect(plate.querySelector("p")!.textContent).toBe("Dost. Vychladni.")
    expect(button.hasAttribute("disabled")).toBe(true)
  })

  it("Todo: each, komponenty a bind po hydrataci", async () => {
    const plate = serve((await renderToString(TodoSSR)).html)
    expect(plate.querySelector("p.hint")!.textContent).toBe("Hotovo. Jdi si pro pivo.")
    const h1 = plate.querySelector("h1")!
    heat(Todo, plate)
    expect(plate.querySelector("h1")).toBe(h1)

    const input = plate.querySelector<HTMLInputElement>("input:not([type])")!
    input.value = "Kytara"
    input.dispatchEvent(new Event("input"))
    plate.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }))
    expect(plate.querySelector("label.todo")!.textContent!.trim()).toBe("Kytara")
    expect(plate.querySelector("p.hint")).toBeNull()
    expect(h1.textContent).toBe("Úkoly (1)")
  })

  it("Kitchen: infill, makra, match, destrukturování, SVG bez rozbití", async () => {
    const html = (await renderToString(KitchenSSR)).html
    expect(html).toContain('class="card extra"')
    expect(html).toContain("vlastní hlavička")
    expect(html).toContain("#1 Filament")
    expect(html).toContain("čeká")
    const plate = serve(html)
    const article = plate.querySelector("article")!
    const path = plate.querySelector("path")!
    heat(Kitchen, plate)
    expect(plate.querySelector("article")).toBe(article)
    expect(plate.querySelector("path")).toBe(path)
    expect(plate.querySelectorAll("article")).toHaveLength(2)
    plate.querySelector<HTMLButtonElement>("button.busy")!.click()
    expect(plate.querySelector("p.status")!.textContent).toBe("tiskne")
    plate.querySelector<HTMLButtonElement>("button.rename")!.click()
    expect(plate.querySelector("li.item")!.textContent).toBe("1: PLA")
  })
})
