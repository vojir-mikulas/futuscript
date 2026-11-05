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
          `const pre = import.meta.glob("/${plates}/_preheat.{ts,js}", { eager: true })`,
          `export const preheat = Object.values(pre)[0]?.default`,
          `export const app = { plates: "/${plates}/", pages }`,
          `export { host }`,
        ].join("\n")
      }
    },
    configureServer(server) {
      const dir = resolve(server.config.root, plates)
      if (!existsSync(dir)) return
      server.middlewares.use((req, res, next) => {
        if (req.method !== "GET" || !req.headers.accept?.includes("text/html")) return next()
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

function toRequest(req: IncomingMessage): Request {
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v)
    else if (Array.isArray(v)) v.forEach((x) => headers.append(k, x))
  }
  return new Request(`http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`, { method: req.method, headers })
}

async function send(res: ServerResponse, r: Response) {
  res.statusCode = r.status
  r.headers.forEach((v, k) => {
    if (k !== "set-cookie") res.setHeader(k, v)
  })
  const cookies = r.headers.getSetCookie()
  if (cookies.length) res.setHeader("Set-Cookie", cookies)
  res.end(Buffer.from(await r.arrayBuffer()))
}

async function servePage(server: ViteDevServer, dir: string, plates: string, req: IncomingMessage): Promise<Response | null> {
  const rawUrl = req.url ?? "/"
  const url = new URL(rawUrl, "http://futuscript.local")
  const preheatFile = ["_preheat.ts", "_preheat.js"].find((f) => existsSync(resolve(dir, f)))
  const preheat: Preheat | undefined = preheatFile
    ? (await server.ssrLoadModule(`/${plates}/${preheatFile}`)).default
    : undefined
  const pre = await runPreheat(preheat, toRequest(req))
  if (pre.response) return pre.response
  const files = (readdirSync(dir, { recursive: true }) as string[]).filter((f) => f.endsWith(".fs"))
  const table = routes(files)
  const m = match(table.routes, url.pathname)
  const file = m?.route.file ?? table.notFound
  if (!file) return null
  const layouts = m?.route.layouts ?? (files.includes("_raft.fs") ? ["_raft.fs"] : [])
  const id = (f: string) => `/${plates}/${f}`
  const load = async (f: string) => (await server.ssrLoadModule(`${id(f)}?ssr`)).default
  const [page, ...chain] = await Promise.all([load(file), ...layouts.map(load)])
  // Přes runner Vite, aby render sdílel instanci runtime s komponentami (head, CSS, kontext).
  const { renderPage } = (await server.ssrLoadModule("@futuscript/host")) as typeof import("@futuscript/host")
  const html = renderPage({
    page,
    layouts: chain,
    state: { page: id(file), layouts: layouts.map(id), props: { params: m?.params ?? {}, url: url.pathname, locals: pre.locals } },
    entry: `/@id/__x00__${ENTRY}`,
  })
  const headers = new Headers({ "Content-Type": "text/html; charset=utf-8" })
  for (const c of pre.setCookies) headers.append("Set-Cookie", c)
  return new Response(await server.transformIndexHtml(rawUrl, html), { status: m ? 200 : 404, headers })
}
