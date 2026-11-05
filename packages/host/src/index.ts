import { LAYER_SWAP, component, esc, getOwner, renderToString, renderable, styles, text } from "@futuscript/firmware/server"
import type { Model } from "@futuscript/firmware"
import { compose, type PageProps } from "./compose.ts"

export { match, routes, type Match, type Route } from "./routes.ts"
export { compose, type PageProps } from "./compose.ts"
export {
  callEndpoint,
  handleEndpoint,
  pathFor,
  prerenderable,
  render,
  renderUrl,
  table,
  type App,
  type Assets,
  type EndpointContext,
  type EndpointModule,
  type Handler,
  type PageModule,
} from "./app.ts"
export { runPreheat, parseCookies, type Preheat, type PreheatContext, type CookieOptions } from "./preheat.ts"

export interface PageState {
  page: string
  layouts: string[]
  props: PageProps
  data?: unknown[]
  layers?: Record<string, { data: unknown[]; error?: { message: string } }>
}

export { action, query, handleRpc, RPC_PATH } from "./rpc.ts"
export { cookies, headers, locals, request, runWithRequest, type RequestContext } from "./context.ts"

export const ENTRY = "virtual:futuscript/entry"
export { isInterrupt } from "@futuscript/firmware/server"

const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c")

interface PageOptions {
  page: Model<any>
  layouts: Model<any>[]
  state: PageState
  entry: string
  lang?: string
  headExtra?: string
}

function app(opts: PageOptions) {
  return compose(
    {
      component: (out, model, props) => component(out, model, props, getOwner()),
      renderable,
      page: async (out, build) => (out as string[]).push(await text(renderable(build))),
    },
    opts.layouts,
    opts.page,
  )
}

function shell(opts: PageOptions, r: { title: string | null; head: string; html: string }) {
  return [
    "<!doctype html>",
    `<html lang="${opts.lang ?? "cs"}">`,
    '<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />',
    r.title != null ? `<title>${esc(r.title)}</title>` : "",
    `<!--fh-->${r.head}<!--/fh-->`,
    opts.headExtra ?? "",
    styles(),
    "</head>",
    `<body>${LAYER_SWAP}<div id="plate">${r.html}</div>`,
  ].join("")
}

function tail(opts: PageOptions, r: { data: unknown[]; layers: PageState["layers"] }) {
  const state: PageState = { ...opts.state, data: r.data, layers: r.layers }
  return `<script>window.__FUTU__=${json(state)}</script><script type="module" src="${opts.entry}"></script></body></html>`
}

export async function renderPage(opts: PageOptions): Promise<string> {
  const r = await renderToString(app(opts), opts.state.props)
  return shell(opts, r) + tail(opts, r)
}

export async function renderPageStream(opts: PageOptions): Promise<ReadableStream<Uint8Array>> {
  const enc = new TextEncoder()
  let ctrl!: ReadableStreamDefaultController<Uint8Array>
  const early: string[] = []
  let open = false
  const push = (chunk: string) => (open ? ctrl.enqueue(enc.encode(chunk)) : early.push(chunk))
  const r = await renderToString(app(opts), opts.state.props, push)
  return new ReadableStream({
    async start(c) {
      ctrl = c
      c.enqueue(enc.encode(shell(opts, r)))
      open = true
      for (const chunk of early) c.enqueue(enc.encode(chunk))
      try {
        await r.done
        c.enqueue(enc.encode(tail(opts, r)))
      } catch (e) {
        console.error(e)
        c.enqueue(enc.encode("</body></html>"))
      }
      c.close()
    },
  })
}
