import { describe, expect, it } from "vitest"
import { renderPage } from "../src/index.ts"
import { start, url } from "../src/client.ts"
import Layout from "../../../demo/src/plates/_raft.fs"
import LayoutSSR from "../../../demo/src/plates/_raft.fs?ssr"
import Blog from "../../../demo/src/plates/blog/[slug].fs"
import BlogSSR from "../../../demo/src/plates/blog/[slug].fs?ssr"
import Home from "../../../demo/src/plates/index.fs"

const tick = () => new Promise((r) => setTimeout(r, 0))

describe("router v klientu", () => {
  it("navigace bez reloadu, layout zůstává, titulek a zpět", async () => {
    history.replaceState(null, "", "/blog/kytara")
    const state = {
      page: "/src/plates/blog/[slug].fs",
      layouts: ["/src/plates/_raft.fs"],
      props: { params: { slug: "kytara" }, url: "/blog/kytara", locals: { visits: 1 } },
    }
    const html = await renderPage({ page: BlogSSR, layouts: [LayoutSSR], state, entry: "/e.js" })
    document.head.innerHTML = /<head>(.*)<\/head>/s.exec(html)![1]!
    document.body.innerHTML = /<body>(.*)<script>/s.exec(html)![1]!
    window.__FUTU__ = state

    await start({
      "/src/plates/_raft.fs": async () => ({ default: Layout }),
      "/src/plates/index.fs": async () => ({ default: Home }),
      "/src/plates/blog/[slug].fs": async () => ({ default: Blog }),
    })
    const nav = document.querySelector("nav")!
    const like = document.querySelector<HTMLButtonElement>("button.like")!
    like.click()
    expect(like.textContent).toBe("♥ 1")
    expect(document.title).toBe("kytara · Blog · Futuscript")

    document.querySelector<HTMLAnchorElement>('nav a[href="/"]')!.click()
    await tick()
    expect(location.pathname).toBe("/")
    expect(url.get()).toBe("/")
    expect(document.querySelector("h1")!.textContent).toBe("Futuscript SSR")
    expect(document.querySelector("nav")).toBe(nav)
    expect(nav.querySelector("a.on")!.getAttribute("href")).toBe("/")
    expect(document.title).toBe("Futuscript demo")
    expect(document.querySelector("footer")!.textContent).toContain("Návštěva č. 1")

    document.querySelector<HTMLAnchorElement>('nav a[href="/blog/kytara"]')!.click()
    await tick()
    expect(document.querySelector("h1")!.textContent).toBe("Článek: kytara")
    expect(document.title).toBe("kytara · Blog · Futuscript")
    expect(document.head.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)

    history.back()
    await new Promise((r) => setTimeout(r, 50))
    expect(document.querySelector("h1")!.textContent).toBe("Futuscript SSR")

    const ext = document.createElement("a")
    ext.href = "https://example.com/"
    document.body.append(ext)
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true })
    ext.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(false)
  })
})
