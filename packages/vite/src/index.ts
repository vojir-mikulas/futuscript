/**
 * Vite plugin pro `.fs` soubory. Fáze 0: volá Rust binárku `futu-slice` přes stdin/stdout.
 * Později ji nahradí napi-rs binding (bez spouštění procesu na každý soubor).
 */
import { execFileSync } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import { relative, resolve } from "node:path"
import type { Plugin } from "vite"

export interface Options {
  /** Cesta k binárce `futu-slice`. Default: `$FUTU_SLICE_BIN` nebo `target/debug/futu-slice` v repu. */
  bin?: string
}

/** Hook, který volá Vitest (typy z `vitest/node` sem netaháme). */
interface VitestHooks {
  configureVitest?: (ctx: {
    defineCacheKeyGenerator?: (cb: (c: { id: string }) => string | undefined) => void
  }) => void
}

export default function futuscript(options: Options = {}): Plugin & VitestHooks {
  let dev = true
  let root = process.cwd()
  const bin = () => {
    const path =
      options.bin ?? process.env.FUTU_SLICE_BIN ?? resolve(import.meta.dirname, "../../../target/debug/futu-slice")
    if (!existsSync(path)) throw new Error(`futu-slice nenalezen (${path}). Spusť \`cargo build\`.`)
    return path
  }

  const isFs = (id: string) => id.split("?")[0]!.endsWith(".fs")

  return {
    name: "futuscript",
    configureVitest(ctx) {
      // Vitest cachuje přeložené moduly na disk podle obsahu zdroje. Výstup ale závisí i na
      // verzi kompilátoru, takže do klíče přidáme otisk binárky.
      ctx.defineCacheKeyGenerator?.(({ id }) => {
        if (!isFs(id)) return undefined
        const st = statSync(bin())
        return `futu-slice:${st.size}:${st.mtimeMs}`
      })
    },
    enforce: "pre",
    configResolved(config) {
      dev = config.command === "serve"
      root = config.root
    },
    transform(code, id) {
      if (!isFs(id)) return
      const file = id.split("?")[0]!
      const name = relative(root, file)
      try {
        const js = execFileSync(bin(), ["--stdin", "--filename", name, ...(dev ? [] : ["--prod"])], {
          input: code,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
        })
        return { code: js, map: null }
      } catch (e) {
        const err = e as { stderr?: string; message: string }
        this.error(err.stderr?.trim() || err.message)
      }
    },
    handleHotUpdate({ file, server }) {
      // Fáze 0: celý reload. HMR se zachováním stavu přijde ve fázi 2.
      if (file.endsWith(".fs")) {
        server.ws.send({ type: "full-reload" })
        return []
      }
    },
  }
}
