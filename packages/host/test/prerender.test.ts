// @vitest-environment node
import { describe, expect, it } from "vitest"
import { pathFor, prerenderable, routes } from "../src/index.ts"

const page = (procedureDone?: string[], entries?: () => Record<string, string>[]) => ({
  default: () => {},
  procedureDone,
  entries,
})

describe("SSG plán", () => {
  it("statické stránky, entries pro [slug], dynamické se přeskočí", async () => {
    const app = {
      plates: "/src/plates/",
      pages: {
        "/src/plates/index.fs": page(["export"]),
        "/src/plates/counter.fs": page(),
        "/src/plates/_raft.fs": page(),
        "/src/plates/_spaghetti.fs": page(),
        "/src/plates/[lang]/projects/[slug].fs": page(["export"], () => [
          { lang: "cs", slug: "kanforge" },
          { lang: "en", slug: "kanforge" },
        ]),
      },
    }
    const plan = await prerenderable(app)
    expect(plan.pages.map((p) => p.path).sort()).toEqual(["/", "/cs/projects/kanforge", "/en/projects/kanforge"])
    expect(plan.notFound).toBe("_spaghetti.fs")
    expect(plan.rootLayout).toEqual(["_raft.fs"])
  })

  it("chybějící entries je chyba", async () => {
    const app = { plates: "/p/", pages: { "/p/[slug].fs": page(["export"]) } }
    await expect(prerenderable(app)).rejects.toThrow("chybí export const entries")
  })

  it("pathFor", () => {
    const r = routes(["blog/[slug].fs"]).routes[0]!
    expect(pathFor(r, { slug: "a b" })).toBe("/blog/a b")
    expect(() => pathFor(r, {})).toThrow("slug")
  })
})
