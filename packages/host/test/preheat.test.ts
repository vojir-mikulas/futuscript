// @vitest-environment node
import { describe, expect, it } from "vitest"
import { runPreheat } from "../src/preheat.ts"

describe("_preheat", () => {
  it("cookies, locals a redirect", async () => {
    const req = (path: string) => new Request(`http://x${path}`, { headers: { cookie: "skin=win98; ref=hn" } })
    const r = await runPreheat((ctx) => {
      ctx.locals.skin = ctx.cookies.get("skin")
      if (!ctx.cookies.has("lang")) ctx.cookies.set("lang", "cs", { maxAge: 60 })
    }, req("/"))
    expect(r.response).toBeNull()
    expect(r.locals).toEqual({ skin: "win98" })
    expect(r.setCookies).toEqual(["lang=cs; Path=/; Max-Age=60; SameSite=lax"])

    const red = await runPreheat((ctx) => {
      ctx.cookies.set("ref", "x")
      return ctx.redirect("/cs")
    }, req("/"))
    expect(red.response!.status).toBe(307)
    expect(red.response!.headers.get("location")).toBe("/cs")
    expect(red.response!.headers.getSetCookie()).toEqual(["ref=x; Path=/; SameSite=lax"])
  })
})
