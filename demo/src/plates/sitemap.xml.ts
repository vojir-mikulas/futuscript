export const prerender = true

export const GET = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${["/", "/counter", "/blog/kytara", "/blog/tryska"].map((p) => `<url><loc>https://futuscript.dev${p}</loc></url>`).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  )
