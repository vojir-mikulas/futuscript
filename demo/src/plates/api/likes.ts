import type { Handler } from "@futuscript/host"

const likes = new Map<string, number>()

export const GET: Handler = ({ url }) => {
  const slug = url.searchParams.get("slug") ?? ""
  return Response.json({ slug, likes: likes.get(slug) ?? 0 })
}

export const POST: Handler = async ({ request }) => {
  const { slug } = (await request.json()) as { slug: string }
  likes.set(slug, (likes.get(slug) ?? 0) + 1)
  return Response.json({ slug, likes: likes.get(slug) })
}
