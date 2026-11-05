import { component, esc, renderToString, renderable, styles, takeHead } from "@futuscript/firmware/server"
import type { Model } from "@futuscript/firmware"
import { compose, type PageProps } from "./compose.ts"

export { match, routes, type Match, type Route } from "./routes.ts"
export { compose, type PageProps } from "./compose.ts"
export { pathFor, prerenderable, render, renderUrl, table, type App, type Assets, type PageModule } from "./app.ts"
export { runPreheat, parseCookies, type Preheat, type PreheatContext, type CookieOptions } from "./preheat.ts"

export interface PageState {
  page: string
  layouts: string[]
  props: PageProps
}

export const ENTRY = "virtual:futuscript/entry"

const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c")

export function renderPage(opts: {
  page: Model<any>
  layouts: Model<any>[]
  state: PageState
  entry: string
  lang?: string
  headExtra?: string
}): string {
  const app = compose({ component, renderable }, opts.layouts, opts.page)
  takeHead()
  const body = renderToString(app, opts.state.props)
  const head = takeHead()
  return [
    "<!doctype html>",
    `<html lang="${opts.lang ?? "cs"}">`,
    '<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />',
    head.title != null ? `<title>${esc(head.title)}</title>` : "",
    `<!--fh-->${head.html}<!--/fh-->`,
    opts.headExtra ?? "",
    styles(),
    "</head>",
    `<body><div id="plate">${body}</div>`,
    `<script>window.__FUTU__=${json(opts.state)}</script>`,
    `<script type="module" src="${opts.entry}"></script>`,
    "</body></html>",
  ].join("")
}
