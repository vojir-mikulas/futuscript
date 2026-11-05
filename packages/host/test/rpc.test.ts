import { afterEach, describe, expect, it, vi } from "vitest"
import { renderPage, runWithRequest } from "../src/index.ts"
import { start } from "../src/client.ts"
import Todos from "../../../demo/src/plates/todos.fs"
import TodosSSR from "../../../demo/src/plates/todos.fs?ssr"

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

describe("(<host>) + M109 + form action", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("SSR data, hydratace bez requestu, akce obnoví query", async () => {
    history.replaceState(null, "", "/todos")
    const state = { page: "/src/plates/todos.fs", layouts: [], props: { params: {}, url: "/todos", locals: {} } }
    const request = new Request("http://x/todos")
    const html = await runWithRequest({ request, locals: {} }, () =>
      renderPage({ page: TodosSSR, layouts: [], state, entry: "/e.js" }),
    )
    expect(html).toContain("cookie visits = ?")
    expect(html).toContain("<li>Koupit filament</li>")
    const futu = JSON.parse(/window.__FUTU__=(.*?)<\/script>/s.exec(html)![1]!)
    expect(futu.data[0]).toEqual([{ id: 1, text: "Koupit filament" }])

    document.body.innerHTML = /<body>(.*)<script>/s.exec(html)![1]!
    window.__FUTU__ = futu
    const server = [{ id: 1, text: "Koupit filament" }]
    const fetch = vi.fn(async (url: string, init: RequestInit) => {
      const isForm = init.body instanceof FormData
      if (isForm) {
        server.push({ id: 2, text: String((init.body as FormData).get("text")) })
        return Response.json({ result: null, kind: "action" })
      }
      const { id } = JSON.parse(init.body as string)
      return Response.json({ result: id.endsWith("#getTodos") ? [...server] : "?", kind: "query" })
    })
    vi.stubGlobal("fetch", fetch)

    const li = document.querySelector("li")!
    await start({ "/src/plates/todos.fs": async () => ({ default: Todos }) })
    expect(fetch).not.toHaveBeenCalled()
    expect(document.querySelector("li")).toBe(li)

    const form = document.querySelector("form")!
    expect(form.getAttribute("action")).toContain("/_futu/rpc?id=")
    form.querySelector("input")!.value = "Vytisknout kytaru"
    form.dispatchEvent(new Event("submit", { cancelable: true }))
    await tick(20)
    expect(fetch.mock.calls[0]![0]).toContain("addTodo")
    expect(Array.from(document.querySelectorAll("li")).map((l) => l.textContent)).toEqual([
      "Koupit filament",
      "Vytisknout kytaru",
    ])
    expect(document.querySelector("li")).toBe(li)
  })
})
