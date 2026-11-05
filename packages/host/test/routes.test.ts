import { describe, expect, it } from "vitest"
import { match, routes } from "../src/routes.ts"

describe("routy z src/plates", () => {
  const { routes: table, notFound } = routes([
    "index.fs",
    "_raft.fs",
    "_spaghetti.fs",
    "about.fs",
    "[lang]/index.fs",
    "[lang]/_raft.fs",
    "[lang]/projects/index.fs",
    "[lang]/projects/[slug].fs",
    "[lang]/projects/new.fs",
  ])

  it("statické, dynamické a layouty", () => {
    expect(match(table, "/")!.route.file).toBe("index.fs")
    expect(match(table, "/about")!.route.file).toBe("about.fs")
    expect(match(table, "/cs")).toMatchObject({ route: { file: "[lang]/index.fs" }, params: { lang: "cs" } })
    expect(match(table, "/en/projects/")!.route.file).toBe("[lang]/projects/index.fs")
    const p = match(table, "/en/projects/kanforge")!
    expect(p.route.file).toBe("[lang]/projects/[slug].fs")
    expect(p.params).toEqual({ lang: "en", slug: "kanforge" })
    expect(p.route.layouts).toEqual(["_raft.fs", "[lang]/_raft.fs"])
    expect(match(table, "/en/projects/new")!.route.file).toBe("[lang]/projects/new.fs")
    expect(match(table, "/a/b/c/d")).toBeNull()
    expect(notFound).toBe("_spaghetti.fs")
  })
})
