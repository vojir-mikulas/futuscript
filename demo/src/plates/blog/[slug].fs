(<extruderInitialization>)
  import { notFound } from "@futuscript/firmware"

  M98 params: { slug: string }
  if (!["kytara", "tryska"].includes(params.slug)) notFound()
  M104 likes = 0

  export const entries = () => [{ slug: "kytara" }, { slug: "tryska" }]
  (<procedureDone> export </procedureDone>)
(</extruderInitialization>)

(<extrusion>)
  (<head>)
    <title>{params.slug} · Blog · Futuscript</title>
    <meta property="og:title" content={params.slug} />
  (</head>)
  <article>
    <h1>Článek: {params.slug}</h1>
    <button class="like" onclick={() => likes++}>♥ {likes}</button>
  </article>
(</extrusion>)
