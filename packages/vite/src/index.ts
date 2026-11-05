import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, statSync } from "node:fs"
import { relative, resolve } from "node:path"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin, ViteDevServer } from "vite"
import { ENTRY, match, routes, runPreheat, type Preheat } from "@futuscript/host"

export interface Options {
  bin?: string
  binding?: string | false
  plates?: string
}

interface VitestHooks {
  configureVitest?: (ctx: {
    defineCacheKeyGenerator?: (cb: (c: { id: string }) => string | undefined) => void
  }) => void
}

type Slice = (source: string, filename: string, dev: boolean, server: boolean) => string

const target = resolve(import.meta.dirname, "../../../target/debug")
const libName = {
  darwin: "libfutuscript_slicer_node.dylib",
  linux: "libfutuscript_slicer_node.so",
  win32: "futuscript_slicer_node.dll",
}[process.platform as string]

function loadCompiler(options: Options): { slice: Slice; path: string } {
  const binding =
    options.binding === false ? undefined : (options.binding ?? process.env.FUTU_SLICE_BINDING ?? (libName && resolve(target, libName)))
  if (binding && existsSync(binding)) {
    const mod = { exports: {} as { slice: Slice } }
    process.dlopen(mod, binding)
    return { slice: mod.exports.slice, path: binding }
  }

  const bin = options.bin ?? process.env.FUTU_SLICE_BIN ?? resolve(target, "futu-slice")
  if (!existsSync(bin)) throw new Error(`Slicer nenalezen (${binding ?? bin}). Spusť \`cargo build\`.`)
  const slice: Slice = (source, filename, dev, server) => {
    try {
      return execFileSync(bin, ["--stdin", "--filename", filename, ...(dev ? [] : ["--prod"]), ...(server ? ["--server"] : [])], {
        input: source,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      })
    } catch (e) {
      const err = e as { stderr?: string; message: string }
      throw new Error(err.stderr?.trim() || err.message)
    }
  }
  return { slice, path: bin }
}

export const SERVER_ENTRY = "virtual:futuscript/server"

export default function futuscript(options: Options = {}): Plugin & VitestHooks {
  let dev = true
  let root = process.cwd()
  let compiler: ReturnType<typeof loadCompiler> | undefined
  const get = () => (compiler ??= loadCompiler(options))

  const isFs = (id: string) => id.split("?")[0]!.endsWith(".fs") && !/[?&]raw\b/.test(id)
  const plates = (options.plates ?? "src/plates").replace(/^\/|\/$/g, "")

  return {
    name: "futuscript",
    resolveId(id) {
      if (id === ENTRY || id === SERVER_ENTRY) return "\0" + id
    },
    load(id) {
      if (id === "\0" + ENTRY) {
        return `import { start } from "@futuscript/host/client"\nstart(import.meta.glob("/${plates}/**/*.fs"))\n`
      }
      if (id === "\0" + SERVER_ENTRY) {
        return [
          `import * as host from "@futuscript/host"`,
          `const pages = import.meta.glob("/${plates}/**/*.fs", { eager: true, query: "?ssr" })`,
          `const endpoints = import.meta.glob(["/${plates}/**/*.ts", "!/${plates}/**/_*", "!/${plates}/**/*.d.ts"], { eager: true })`,
          `const pre = import.meta.glob("/${plates}/_preheat.{ts,js}", { eager: true })`,
          `export const preheat = Object.values(pre)[0]?.default`,
          `export const app = { plates: "/${plates}/", pages, endpoints }`,
          `export { host }`,
        ].join("\n")
      }
    },
    configureServer(server) {
      const dir = resolve(server.config.root, plates)
      if (!existsSync(dir)) return
      server.middlewares.use((req, res, next) => {
        servePage(server, dir, plates, req).then(
          async (page) => {
            if (!page) return next()
            await send(res, page)
          },
          (e: Error) => {
            server.ssrFixStacktrace(e)
            next(e)
          },
        )
      })
    },
    configureVitest(ctx) {
      // Výstup závisí i na verzi kompilátoru, ne jen na zdroji.
      ctx.defineCacheKeyGenerator?.(({ id }) => {
        if (!isFs(id)) return undefined
        const st = statSync(get().path)
        return `futu-slice:${st.size}:${st.mtimeMs}`
      })
    },
    enforce: "pre",
    config() {
      return { envPrefix: ["PUBLIC_", "VITE_"] }
    },
    configResolved(config) {
      dev = config.command === "serve"
      root = config.root
    },
    transform(code, id, opts) {
      if (!isFs(id)) return
      const name = relative(root, id.split("?")[0]!)
      const server = /[?&]ssr\b/.test(id) || !!opts?.ssr
      try {
        return { code: get().slice(code, name, dev, server), map: null }
      } catch (e) {
        this.error((e as Error).message)
      }
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".fs")) {
        server.ws.send({ type: "full-reload" })
        return []
      }
    },
  }
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v)
    else if (Array.isArray(v)) v.forEach((x) => headers.append(k, x))
  }
  const method = req.method ?? "GET"
  let body: Uint8Array | undefined
  if (method !== "GET" && method !== "HEAD") {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    body = new Uint8Array(Buffer.concat(chunks))
  }
  return new Request(`http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`, { method, headers, body: body as BodyInit | undefined })
}

async function send(res: ServerResponse, r: Response) {
  res.statusCode = r.status
  r.headers.forEach((v, k) => {
    if (k !== "set-cookie") res.setHeader(k, v)
  })
  const cookies = r.headers.getSetCookie()
  if (cookies.length) res.setHeader("Set-Cookie", cookies)
  if (r.body) for await (const chunk of r.body) res.write(chunk)
  res.end()
}

async function servePage(server: ViteDevServer, dir: string, plates: string, req: IncomingMessage): Promise<Response | null> {
  const rawUrl = req.url ?? "/"
  const url = new URL(rawUrl, "http://futuscript.local")
  const preheatFile = ["_preheat.ts", "_preheat.js"].find((f) => existsSync(resolve(dir, f)))
  const preheat: Preheat | undefined = preheatFile
    ? (await server.ssrLoadModule(`/${plates}/${preheatFile}`)).default
    : undefined
  const all = (readdirSync(dir, { recursive: true }) as string[]).map((f) => f.replace(/\\/g, "/"))
  const table = routes(all)
  const endpoint = match(table.routes.filter((r) => r.kind === "endpoint"), url.pathname)
  const isRpc = url.pathname === "/_futu/rpc"
  const isPage = req.method === "GET" && !!req.headers.accept?.includes("text/html")
  if (!endpoint && !isPage && !isRpc) return null
  const request = await toRequest(req)
  const pre = await runPreheat(preheat, request)
  if (pre.response) return pre.response
  if (isRpc) {
    const host = (await server.ssrLoadModule("@futuscript/host")) as typeof import("@futuscript/host")
    return host.handleRpc(request, pre.locals, (file) => server.ssrLoadModule(`/${file}?ssr`))
  }
  if (endpoint) {
    const host = (await server.ssrLoadModule("@futuscript/host")) as typeof import("@futuscript/host")
    const mod = await server.ssrLoadModule(`/${plates}/${endpoint.route.file}`)
    const res = await host.runWithRequest({ request, locals: pre.locals }, () =>
      host.callEndpoint(mod, { request, url: new URL(request.url), params: endpoint.params, locals: pre.locals }),
    )
    for (const c of pre.setCookies) res.headers.append("Set-Cookie", c)
    return res
  }
  const files = all.filter((f) => f.endsWith(".fs"))
  const m = match(table.routes.filter((r) => r.kind === "page"), url.pathname)
  const file = m?.route.file ?? table.notFound
  if (!file) return null
  const layouts = m?.route.layouts ?? (files.includes("_raft.fs") ? ["_raft.fs"] : [])
  const id = (f: string) => `/${plates}/${f}`
  const load = async (f: string) => (await server.ssrLoadModule(`${id(f)}?ssr`)).default
  // Přes runner Vite, aby render sdílel instanci runtime s komponentami (head, CSS, kontext).
  const host = (await server.ssrLoadModule("@futuscript/host")) as typeof import("@futuscript/host")
  const draw = async (file: string, layouts: string[], params: Record<string, string>) => {
    const [page, ...chain] = await Promise.all([load(file), ...layouts.map(load)])
    return host.renderPageStream({
      page,
      layouts: chain,
      state: { page: id(file), layouts: layouts.map(id), props: { params, url: url.pathname, locals: pre.locals } },
      entry: `/@id/__x00__${ENTRY}`,
      headExtra: '<script type="module" src="/@vite/client"></script>',
    })
  }
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8" })
  for (const c of pre.setCookies) headers.append("Set-Cookie", c)
  let html: ReadableStream<Uint8Array>
  let status = m ? 200 : 404
  try {
    html = await host.runWithRequest({ request, locals: pre.locals }, () => draw(file, layouts, m?.params ?? {}))
  } catch (e) {
    if (!host.isInterrupt(e)) throw e
    if (e.futuscript === "redirect") return new Response(null, { status: e.status ?? 307, headers: { Location: e.to! } })
    if (!table.notFound) return null
    status = 404
    html = await draw(table.notFound, files.includes("_raft.fs") ? ["_raft.fs"] : [], {})
  }
  return new Response(html, { status, headers })
}
