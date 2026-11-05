import { hostFn } from "@futuscript/firmware/server"
import { runWithRequest } from "./context.ts"

type Fn<A extends unknown[], R> = (...args: A) => R | Promise<R>

export function query<A extends unknown[], R>(fn: Fn<A, R>): Fn<A, R> & { refresh(): void } {
  return Object.assign(fn, { kind: "query", refresh() {} })
}

export function action<A extends unknown[], R>(fn: Fn<A, R>): Fn<A, R> {
  return Object.assign(fn, { kind: "action" })
}

export const RPC_PATH = "/_futu/rpc"

export async function handleRpc(
  request: Request,
  locals: Record<string, unknown>,
  load?: (file: string) => Promise<unknown>,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (url.pathname !== RPC_PATH) return null
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } })
  const json = request.headers.get("content-type")?.includes("application/json")
  let id = url.searchParams.get("id") ?? ""
  let args: unknown[] = []
  if (json) {
    const body = (await request.json()) as { id?: string; args?: unknown[] }
    id = body.id ?? id
    args = body.args ?? []
  } else {
    args = [await request.formData()]
  }
  let fn = hostFn(id)
  const file = id.split("#")[0]!
  if (!fn && load && file.endsWith(".fs") && !file.includes("..")) {
    try {
      await load(file)
    } catch {}
    fn = hostFn(id)
  }
  if (!fn) return Response.json({ error: `neznámá funkce ${id}` }, { status: 404 })
  try {
    const result = await runWithRequest({ request, locals }, () => fn(...args))
    if (!json && !request.headers.get("x-futu-rpc")) {
      return new Response(null, { status: 303, headers: { Location: request.headers.get("referer") ?? "/" } })
    }
    return Response.json({ result: result ?? null, kind: fn.kind ?? "query" })
  } catch (e) {
    console.error(e)
    return Response.json({ error: (e as Error).message }, { status: 500 })
  }
}
