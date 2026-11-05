import { AsyncLocalStorage } from "node:async_hooks"
import { parseCookies } from "./preheat.ts"

export interface RequestContext {
  request: Request
  locals: Record<string, unknown>
}

const als = new AsyncLocalStorage<RequestContext>()

export const runWithRequest = <T>(ctx: RequestContext, fn: () => T): T => als.run(ctx, fn)

function current(): RequestContext {
  const ctx = als.getStore()
  if (!ctx) throw new Error("Futuscript: request() je dostupný jen při renderu nebo v (<host>) funkcích")
  return ctx
}

export const request = (): Request => current().request
export const locals = (): Record<string, unknown> => current().locals
export const headers = (): Headers => current().request.headers
export const cookies = () => {
  const jar = parseCookies(current().request.headers.get("cookie"))
  return { get: (n: string) => jar.get(n), has: (n: string) => jar.has(n) }
}
