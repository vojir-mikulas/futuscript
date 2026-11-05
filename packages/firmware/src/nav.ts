export interface NavigateOptions {
  replace?: boolean
}

type Navigator = (to: string, opts?: NavigateOptions) => void

let navigator: Navigator | null = null

export function setNavigator(fn: Navigator | null): void {
  navigator = fn
}

export function navigate(to: string, opts?: NavigateOptions): void {
  if (navigator) navigator(to, opts)
  else if (opts?.replace) location.replace(to)
  else location.assign(to)
}

export function redirect(to: string): void {
  navigate(to, { replace: true })
}

export function notFound(): never {
  location.reload()
  throw new Error("Futuscript: notFound()")
}
