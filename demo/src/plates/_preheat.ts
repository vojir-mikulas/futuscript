import type { Preheat } from "@futuscript/host"

const preheat: Preheat = (ctx) => {
  if (ctx.url.pathname === "/stare-blog") return ctx.redirect("/blog/kytara", 308)
  const visits = Number(ctx.cookies.get("visits") ?? 0) + 1
  ctx.cookies.set("visits", String(visits), { maxAge: 60 * 60 * 24 })
  ctx.locals.visits = visits
}

export default preheat
