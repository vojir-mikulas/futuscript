// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { print } from "@futuscript/firmware"
import Todo from "../../examples/Todo.fs"

describe("Todo.fs end-to-end", () => {
  it("přidává, odškrtává a filtruje úkoly", () => {
    const plate = document.createElement("div")
    document.body.append(plate)
    const unprint = print(Todo, plate)

    const $ = <T extends Element>(sel: string) => plate.querySelector<T>(sel)!
    const $$ = (sel: string) => Array.from(plate.querySelectorAll(sel))
    const input = $<HTMLInputElement>("input:not([type])")
    const add = (text: string) => {
      input.value = text
      input.dispatchEvent(new Event("input"))
      $("form").dispatchEvent(new Event("submit", { cancelable: true }))
    }
    const items = () => $$("label.todo").map((l) => l.textContent!.trim())
    const nav = (name: string) => $$("nav button").find((b) => b.textContent === name) as HTMLButtonElement

    // prázdný stav = (<empty>) s komponentou Beer.fs
    expect($("h1").textContent).toBe("Úkoly (0)")
    expect($("p.hint").textContent).toBe("Hotovo. Jdi si pro pivo.")
    expect(nav("all").className).toContain("active")

    add("Koupit filament")
    add("  Vytisknout kytaru  ")
    expect(input.value).toBe("") // draft = "" se přes bind:value propsal do inputu
    add("   ") // prázdný se nepřidá
    expect(items()).toEqual(["Koupit filament", "Vytisknout kytaru"])
    expect($("h1").textContent).toBe("Úkoly (2)")
    expect(plate.querySelector("p.hint")).toBeNull()

    // odškrtnutí: klíčovaná smyčka zachová stejný DOM uzel, jen ho aktualizuje
    const first = $$("label.todo")[0]!
    const checkbox = first.querySelector("input") as HTMLInputElement
    checkbox.checked = true
    checkbox.dispatchEvent(new Event("change"))
    expect($$("label.todo")[0]).toBe(first)
    expect(first.className).toContain("todo--done")
    expect(checkbox.checked).toBe(true)
    expect($("h1").textContent).toBe("Úkoly (1)")

    // filtry (each bez `by` + class jako objekt)
    nav("done").click()
    expect(items()).toEqual(["Koupit filament"])
    expect(nav("done").className).toContain("active")
    expect(nav("all").className).not.toContain("active")
    nav("open").click()
    expect(items()).toEqual(["Vytisknout kytaru"])

    // když filtr nic nenajde, vrátí se (<empty>)
    nav("done").click()
    const done = $$("label.todo")[0]!.querySelector("input") as HTMLInputElement
    done.checked = false
    done.dispatchEvent(new Event("change"))
    expect(items()).toEqual([])
    expect($("p.hint").textContent).toBe("Hotovo. Jdi si pro pivo.")

    nav("all").click()
    expect(items()).toEqual(["Koupit filament", "Vytisknout kytaru"])

    unprint()
    expect(plate.innerHTML).toBe("")
  })
})
