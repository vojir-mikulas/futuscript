import { describe, expect, it } from "vitest"
import { print } from "@futuscript/firmware"
import Kitchen from "./fixtures/Kitchen.fs"

const tick = () => new Promise((r) => setTimeout(r, 0))

describe("část A: kompilátor + runtime", () => {
  it("infill, makra, match, portál, spread, styl, SVG, akce, kontext, window", async () => {
    const plate = document.createElement("div")
    document.body.append(plate)
    const unprint = print(Kitchen, plate)
    const $ = <T extends Element>(s: string) => plate.querySelector<T>(s)!
    const $$ = (s: string) => Array.from(plate.querySelectorAll(s))

    const [first, second] = $$("article")
    expect(first!.querySelector("h2")!.textContent).toBe("Základ")
    expect(first!.querySelector("p.body")!.textContent).toBe("obsah karty")
    expect(second!.querySelector("header strong.custom")!.textContent).toBe("vlastní hlavička")
    expect(second!.querySelector("h2")).toBeNull()

    expect(first!.getAttribute("class")).toBe("card extra")
    expect(first!.id).toBe("first")
    expect(first!.hasAttribute("title")).toBe(false)

    expect(first!.getAttribute("data-theme")).toBe("dark")

    expect($$("li.item").map((l) => l.textContent)).toEqual(["1: Filament", "2: Tryska"])
    expect($$("li.item").map((l) => l.getAttribute("data-i"))).toEqual(["0", "1"])

    expect($$("li.row").map((l) => l.textContent)).toEqual(["#1 Filament", "#2 Tryska"])

    expect($("p.status").textContent).toBe("čeká")

    const styled = $("div.styled").getAttribute("style")!
    expect(styled).toContain("color:red")
    expect(styled).toContain("--size:2px")
    expect(styled).toContain("font-size:12px")

    expect($("svg").namespaceURI).toBe("http://www.w3.org/2000/svg")
    expect($("path").namespaceURI).toBe("http://www.w3.org/2000/svg")
    expect($("path").getAttribute("fill")).toBe("red")
    expect($("svg").getAttribute("class")).toBe("icon")

    await tick()
    expect($("p.canvas").textContent).toBe("true")
    expect($("p.log").textContent).toBe("tilt 45 CANVAS")
    expect(document.body.querySelector(".modal")).toBeNull()

    $<HTMLButtonElement>("button.busy").click()
    expect($("p.status").textContent).toBe("tiskne")
    $<HTMLButtonElement>("button.theme").click()
    expect(first!.getAttribute("data-theme")).toBe("light")
    const li = $$("li.item")[0]
    $<HTMLButtonElement>("button.rename").click()
    expect($$("li.item")[0]).toBe(li)
    expect(li!.textContent).toBe("1: PLA")
    expect($$("li.row")[0]!.textContent).toBe("#1 PLA")

    first!.dispatchEvent(new Event("click"))
    expect(document.body.querySelector(".modal")!.textContent).toBe("modál")
    expect(plate.querySelector(".modal")).toBeNull()
    first!.dispatchEvent(new Event("click"))
    expect(document.body.querySelector(".modal")).toBeNull()

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "g" }))
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "o" }))
    expect($("p.keys").textContent).toBe("go")
    unprint()
    expect(document.body.querySelector(".modal")).toBeNull()
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }))
    expect(plate.innerHTML).toBe("")
  })
})
