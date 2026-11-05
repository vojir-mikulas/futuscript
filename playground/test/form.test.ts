import { describe, expect, it } from "vitest"
import { print } from "@futuscript/firmware"
import Form from "./fixtures/Form.fs"

describe("bind na vlastnosti, bind:group, mutace, lokální M105", () => {
  it("funguje", () => {
    const plate = document.createElement("div")
    document.body.append(plate)
    const unprint = print(Form, plate)
    const $ = <T extends Element>(s: string) => plate.querySelector<T>(s)!
    const $$ = <T extends Element>(s: string) => Array.from(plate.querySelectorAll<T>(s))
    const out = () => $("p.out").textContent

    expect(out()).toBe("|pla|fan|0")
    const [pla, petg] = $$<HTMLInputElement>("input[type=radio]")
    const [fan, led] = $$<HTMLInputElement>("input[type=checkbox]")
    expect(pla!.checked).toBe(true)
    expect(fan!.checked).toBe(true)

    const email = $<HTMLInputElement>("input.email")
    email.value = "bender@planetexpress.com"
    email.dispatchEvent(new Event("input"))
    petg!.checked = true
    petg!.dispatchEvent(new Event("change"))
    led!.checked = true
    led!.dispatchEvent(new Event("change"))
    fan!.checked = false
    fan!.dispatchEvent(new Event("change"))
    $<HTMLButtonElement>("button").click()
    $<HTMLButtonElement>("button").click()
    expect(out()).toBe("bender@planetexpress.com|petg|led|2")
    expect(pla!.checked).toBe(false)

    expect($$("li").map((l) => l.className)).toEqual(["late", ""])
    $<HTMLButtonElement>("button.later").click()
    expect($$("li").map((l) => l.className)).toEqual(["late", "late"])
    unprint()
  })
})
