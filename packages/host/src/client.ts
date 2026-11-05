import { component, heat, renderable, type Model } from "@futuscript/firmware"
import { compose } from "./compose.ts"
import type { PageState } from "./index.ts"

type Modules = Record<string, () => Promise<{ default: Model<any> }>>

declare global {
  interface Window {
    __FUTU__?: PageState
  }
}

export async function start(modules: Modules, plate = document.getElementById("plate")!): Promise<void> {
  const state = window.__FUTU__
  if (!state) return
  const load = async (file: string) => {
    const mod = modules[file]
    if (!mod) throw new Error(`Futuscript: modul ${file} chybí v import.meta.glob`)
    return (await mod()).default
  }
  const [page, ...layouts] = await Promise.all([load(state.page), ...state.layouts.map(load)])
  heat(compose({ component, renderable }, layouts, page!), plate, state.props)
}
