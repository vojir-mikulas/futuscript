export interface CookieOptions {
  path?: string
  maxAge?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: "lax" | "strict" | "none"
}

export interface PreheatContext {
  request: Request
  url: URL
  locals: Record<string, unknown>
  cookies: {
    get(name: string): string | undefined
    has(name: string): boolean
    set(name: string, value: string, options?: CookieOptions): void
    delete(name: string, options?: CookieOptions): void
  }
  redirect(to: string, status?: number): Response
}

export type Preheat = (ctx: PreheatContext) => Response | void | Promise<Response | void>

export interface PreheatResult {
  response: Response | null
  locals: Record<string, unknown>
  setCookies: string[]
}

export function parseCookies(header: string | null): Map<string, string> {
  const out = new Map<string, string>()
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=")
    if (i < 0) continue
    out.set(part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim()))
  }
  return out
}

function serialize(name: string, value: string, o: CookieOptions = {}): string {
  let s = `${name}=${encodeURIComponent(value)}; Path=${o.path ?? "/"}`
  if (o.maxAge != null) s += `; Max-Age=${o.maxAge}`
  if (o.httpOnly) s += "; HttpOnly"
  if (o.secure) s += "; Secure"
  s += `; SameSite=${o.sameSite ?? "lax"}`
  return s
}

export async function runPreheat(fn: Preheat | undefined, request: Request): Promise<PreheatResult> {
  const jar = parseCookies(request.headers.get("cookie"))
  const setCookies: string[] = []
  const locals: Record<string, unknown> = {}
  const ctx: PreheatContext = {
    request,
    url: new URL(request.url),
    locals,
    cookies: {
      get: (n) => jar.get(n),
      has: (n) => jar.has(n),
      set: (n, v, o) => {
        jar.set(n, v)
        setCookies.push(serialize(n, v, o))
      },
      delete: (n, o) => {
        jar.delete(n)
        setCookies.push(serialize(n, "", { ...o, maxAge: 0 }))
      },
    },
    redirect: (to, status = 307) => new Response(null, { status, headers: { Location: to } }),
  }
  const response = (await fn?.(ctx)) ?? null
  if (response) for (const c of setCookies) response.headers.append("Set-Cookie", c)
  return { response, locals, setCookies }
}
