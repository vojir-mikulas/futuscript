import { describe, expect, it } from "vitest"
import { match, renderPage, routes } from "../src/index.ts"
import { start } from "../src/client.ts"
import Layout from "../../../demo/src/plates/_raft.fs"
import LayoutSSR from "../../../demo/src/plates/_raft.fs?ssr"
import Blog from "../../../demo/src/plates/blog/[slug].fs"
import BlogSSR from "../../../demo/src/plates/blog/[slug].fs?ssr"

describe("stránka: router → layout → SSR → start() hydratace", () => {
  it("blog/[slug]", async () => {
    const table = routes(["_raft.fs", "index.fs", "blog/[slug].fs"])
    const m = match(table.routes, "/blog/kytara")!
    expect(m.route.layouts).toEqual(["_raft.fs"])

    const state = {
      page: "/plates/blog/[slug].fs",
      layouts: ["/plates/_raft.fs"],
      props: { params: m.params, url: "/blog/kytara", locals: { visits: 3 } },
    }
    const html = await renderPage({ page: BlogSSR, layouts: [LayoutSSR], state, entry: "/entry.js" })
    expect(html).toContain("<h1>Článek: kytara</h1>")
    expect(html).toContain('window.__FUTU__={"page":"/plates/blog/[slug].fs"')
    expect(html).toContain("<title>kytara · Blog · Futuscript</title>")
    expect(html).toContain('<!--fh--><meta name="description" content="Stránky, které se tisknou."><meta property="og:title" content="kytara"><!--/fh-->')
    expect(html.match(/<title>/g)).toHaveLength(1)

    document.head.innerHTML = /<head>(.*)<\/head>/s.exec(html)![1]!
    document.body.innerHTML = /<body>(.*)<script>/s.exec(html)![1]!
    window.__FUTU__ = state
    const button = document.querySelector<HTMLButtonElement>("button.like")!
    const nav = document.querySelector("nav")!
    await start({
      "/plates/blog/[slug].fs": async () => ({ default: Blog }),
      "/plates/_raft.fs": async () => ({ default: Layout }),
    })
    expect(document.querySelector("button.like")).toBe(button)
    expect(document.querySelector("nav")).toBe(nav)
    expect(document.querySelectorAll("article")).toHaveLength(1)
    button.click()
    button.click()
    expect(button.textContent).toBe("♥ 2")
    expect(document.title).toBe("kytara · Blog · Futuscript")
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1)
  })
})
