#!/usr/bin/env node
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { dirname, extname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { build } from "vite"
import { ENTRY } from "@futuscript/host"
import type * as Host from "@futuscript/host"
import { SERVER_ENTRY } from "./index.ts"

type ServerBundle = { host: typeof Host; app: Host.App; preheat?: Host.Preheat }

const root = resolve(process.argv[3] ?? ".")
const dist = resolve(root, "dist")

async function slice() {
  const t0 = performance.now()
  await build({
    root,
    logLevel: "warn",
    build: { outDir: join(dist, "client"), emptyOutDir: true, manifest: true, rollupOptions: { input: ENTRY } },
  })
  await build({
    root,
    logLevel: "warn",
    ssr: { noExternal: [/^@futuscript\//] },
    build: {
      ssr: true,
      outDir: join(dist, "server"),
      emptyOutDir: true,
      rollupOptions: { input: SERVER_ENTRY, output: { entryFileNames: "entry.js" } },
    },
  })
  const { host, app } = await load()
  const assets = readAssets()
  const plan = await host.prerenderable(app)
  for (const p of plan.pages) {
    const html = host.render(app, assets, p.route.file, p.route.layouts, { params: p.params, url: p.path, locals: {} })
    const file = join(dist, "client", p.path, "index.html")
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, html)
  }
  if (plan.notFound) {
    const html = host.render(app, assets, plan.notFound, plan.rootLayout, { params: {}, url: "/404", locals: {} })
    writeFileSync(join(dist, "client", "404.html"), html)
  }
  const ms = Math.round(performance.now() - t0)
  console.log(`✓ vytištěno za ${ms} ms: ${plan.pages.length} statických stránek${plan.notFound ? " + 404" : ""}`)
  for (const p of plan.pages) console.log(`  ${p.path}`)
}

async function load(): Promise<ServerBundle> {
  return import(pathToFileURL(join(dist, "server", "entry.js")).href)
}

function readAssets(): Host.Assets {
  const manifest = JSON.parse(readFileSync(join(dist, "client", ".vite", "manifest.json"), "utf8")) as Record<
    string,
    { file: string; isEntry?: boolean; css?: string[] }
  >
  const entry = Object.values(manifest).find((c) => c.isEntry)
  if (!entry) throw new Error("Futuscript: v manifestu chybí vstup klienta")
  const css = (entry.css ?? []).map((c) => `<link rel="stylesheet" href="/${c}" />`).join("")
  return { entry: `/${entry.file}`, headExtra: css }
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
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

async function serve() {
  const { host, app, preheat } = await load()
  const assets = readAssets()
  const client = join(dist, "client")
  const port = Number(process.env.PORT ?? 3000)

  createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://x")
      const path = decodeURIComponent(url.pathname)
      const file = join(client, path)
      if (file.startsWith(client) && existsSync(file) && statSync(file).isFile() && !path.endsWith(".html")) {
        res.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream")
        if (path.startsWith("/assets/")) res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
        return createReadStream(file).pipe(res)
      }
      const pre = await host.runPreheat(preheat, toRequest(req))
      if (pre.response) return send(res, pre.response)
      const headers = new Headers({ "Content-Type": "text/html; charset=utf-8" })
      for (const c of pre.setCookies) headers.append("Set-Cookie", c)

      const prerendered = join(client, path, "index.html")
      if (prerendered.startsWith(client) && existsSync(prerendered)) {
        headers.set("X-Futuscript", "static")
        return send(res, new Response(readFileSync(prerendered), { headers }))
      }
      const page = host.renderUrl(app, assets, path, pre.locals)
      if (!page) return send(res, new Response("Not found", { status: 404 }))
      headers.set("X-Futuscript", "ssr")
      return send(res, new Response(page.html, { status: page.status, headers }))
    } catch (e) {
      console.error(e)
      res.statusCode = 500
      res.end("Spaghetti: chyba serveru")
    }
  }).listen(port, () => console.log(`futu serve: http://localhost:${port}`))
}

const cmd = process.argv[2]
if (cmd === "slice") await slice()
else if (cmd === "serve") await serve()
else console.log("futu slice [složka]   build + předrenderování\nfutu serve [složka]   produkční server")
