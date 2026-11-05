import { describe, expect, it } from "vitest"
import { heat, print } from "@futuscript/firmware"
import { LAYER_SWAP, renderToString } from "@futuscript/firmware/server"
import Layered from "../../../playground/test/fixtures/Layered.fs"
import LayeredSSR from "../../../playground/test/fixtures/Layered.fs?ssr"

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))
const props = (okMs: number) => ({
  ok: () => new Promise<string>((r) => setTimeout(() => r("hotovo"), okMs)),
  bad: () => new Promise<string>((_, j) => setTimeout(() => j(new Error("ucpaná tryska")), 5)),
})

describe("(<layer>)", () => {
  it("streaming: fallback hned, obsah a catch dorazí jako template", async () => {
    const chunks: string[] = []
    const r = await renderToString(LayeredSSR, props(30), (c) => chunks.push(c))
    expect(r.html).toContain("<!--[L:0--><p class=\"pending\">čekám</p><!--]L-->")
    expect(r.html).not.toContain("hotovo")
    await r.done
    expect(chunks.join("")).toContain('<template id="fL:1"><p class="err">ucpaná tryska</p></template>')
    expect(chunks.join("")).toContain('<template id="fL:0"><p class="v">hotovo</p></template>')
    expect(r.layers["0"]).toEqual({ data: ["hotovo"] })
    expect(r.layers["1"]).toEqual({ data: [], error: { message: "ucpaná tryska" } })

    document.body.innerHTML = `<div id="p">${r.html}</div>` + chunks.join("").replace(/<script>.*?<\/script>/g, "")
    new Function(/<script>(.*)<\/script>/.exec(LAYER_SWAP)![1]!)()
    const swap = (globalThis as unknown as { $fL: (id: string) => void }).$fL
    swap("1")
    swap("0")
    const plate = document.getElementById("p")!
    expect(plate.querySelector(".v")!.textContent).toBe("hotovo")
    expect(plate.querySelector(".err")!.textContent).toBe("ucpaná tryska")
    expect(plate.querySelector(".pending")).toBeNull()
    expect(document.querySelector("template")).toBeNull()

    const v = plate.querySelector(".v")!
    let calls = 0
    heat(Layered, plate, { ok: () => (calls++, Promise.resolve("x")), bad: () => (calls++, Promise.resolve("y")) }, r.data, r.layers)
    await tick()
    expect(calls).toBeLessThanOrEqual(1)
    expect(plate.querySelector(".v")).toBe(v)
    expect(v.textContent).toBe("hotovo")
    expect(plate.querySelector(".err")!.textContent).toBe("ucpaná tryska")
  })

  it("bez streamu se vrstva počká a vyrenderuje rovnou", async () => {
    const r = await renderToString(LayeredSSR, props(5))
    expect(r.html).toContain('<!--[L--><p class="v">hotovo</p><!--]L-->')
    expect(r.html).toContain('<!--[L--><p class="err">ucpaná tryska</p><!--]L-->')
  })

  it("v klientu: pending → obsah, chyba → catch", async () => {
    const plate = document.createElement("div")
    document.body.append(plate)
    print(Layered, plate, props(20))
    expect(plate.querySelectorAll(".pending")).toHaveLength(2)
    await tick(10)
    expect(plate.querySelector(".err")!.textContent).toBe("ucpaná tryska")
    expect(plate.querySelectorAll(".pending")).toHaveLength(1)
    await tick(30)
    expect(plate.querySelector(".v")!.textContent).toBe("hotovo")
    expect(plate.querySelector(".pending")).toBeNull()
  })
})
