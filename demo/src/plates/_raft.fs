(<extruderInitialization>)
  import type { Macro } from "@futuscript/firmware"

  M98 infill: Macro
  M98 url: string
  M98 locals: { visits?: number }
(</extruderInitialization>)

(<extrusion>)
  (<head>)
    <title>Futuscript demo</title>
    <meta name="description" content="Stránky, které se tisknou." />
  (</head>)
  <nav>
    <a href="/" class={{ on: url === "/" }}>Domů</a>
    <a href="/counter" class={{ on: url === "/counter" }}>Counter</a>
    <a href="/blog/kytara" class={{ on: url.startsWith("/blog") }}>Blog</a>
    <a href="/nic-tu-neni">404</a>
  </nav>
  <main>{infill}</main>
  <footer>Vytištěno na serveru, nahřáto v prohlížeči. Návštěva č. {locals.visits ?? 0}.</footer>
(</extrusion>)

(<filament>)
  nav { display: flex; gap: 12px; font-family: monospace; }
  .on { font-weight: bold; text-decoration: underline; }
  main { padding: 24px 0; }
(</filament>)
