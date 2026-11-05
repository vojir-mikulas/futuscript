import { describe, expect, it } from "vitest"
import { print } from "@futuscript/firmware"
import App from "../src/App.fs"
import { highlight } from "../src/highlight.ts"
import { codes, modes, useCases } from "../src/content.ts"

describe("site (written in Futuscript)", () => {
  it("prints every section and reacts", () => {
    const plate = document.createElement("div")
    document.body.append(plate)
    const unprint = print(App, plate)
    const $ = <T extends Element>(s: string) => plate.querySelector<T>(s)!

    expect($("h1").textContent).toContain("Good news, everyone!")
    for (const id of ["why", "syntax", "use-cases", "playground", "rendering", "errors", "start"]) {
      expect(plate.querySelector(`#${id}`), id).not.toBeNull()
    }
    expect(plate.querySelectorAll("#syntax tbody tr")).toHaveLength(codes.length)
    expect(plate.querySelectorAll("#use-cases article")).toHaveLength(useCases.length)
    expect($("#playground pre").textContent).toContain("M104 temp = 210")
    expect($("#playground svg")).not.toBeNull()

    const range = $<HTMLInputElement>("#playground input")
    range.value = "270"
    range.dispatchEvent(new Event("input"))
    expect($("#playground .live").textContent).toContain("that's spaghetti")

    const tabs = Array.from(plate.querySelectorAll<HTMLButtonElement>("#rendering [role=tab]"))
    expect(tabs).toHaveLength(modes.length)
    const ssg = tabs.find((b) => b.textContent!.trim() === "SSG")!
    ssg.click()
    expect($("#rendering h3").textContent).toBe("Applied Cryogenics")
    expect($("#rendering [role=tabpanel] pre").textContent).toBe("(<procedureDone> export </procedureDone>)")
    expect(ssg.className).toContain("active")

    $<HTMLButtonElement>("#errors button").click()
    expect($("#errors .err").textContent).toContain("did you mean M104")
    expect($("#errors button").textContent).toBe("Let Printer fix it")

    unprint()
  })
})

describe("highlight", () => {
  const kinds = (code: string) => highlight(code).filter((t) => t.k).map((t) => `${t.k}:${t.t}`)

  it("keeps the text intact", () => {
    const src = `(<each> p of list by p.id )\n  <Row {p} />\n(</each>)`
    expect(highlight(src).map((t) => t.t).join("")).toBe(src)
  })

  it("knows instructions and G-codes only at line start", () => {
    expect(kinds("(<if> ok )")).toEqual(["i:(<if>", "i:)"])
    expect(kinds("  M104 x = 0")).toEqual(["g:M104", "n:0"])
    expect(kinds("const a = M104")).toEqual(["k:const"])
    expect(kinds("(<procedureDone> export </procedureDone>)")).toEqual(["i:(<procedureDone>", "k:export", "i:</procedureDone>)"])
  })

  it("doesn't mistake arrows and comparisons for tags", () => {
    expect(kinds("x => a > 3")).toEqual(["n:3"])
  })
})
