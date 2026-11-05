(<extruderInitialization>)
  const links = [
    { href: "#why", label: "Why" },
    { href: "#syntax", label: "Syntax" },
    { href: "#use-cases", label: "Use cases" },
    { href: "#playground", label: "Playground" },
    { href: "#rendering", label: "Rendering" },
  ]
(</extruderInitialization>)

(<extrusion>)
  <header>
    <div class="inner">
      <a class="brand" href="#top"><img class="mark" src="/rocket.svg" alt="" /><span>Futu<b>script</b></span></a>
      <nav aria-label="Sections">
        (<each> l of links by l.href )
          <a href={l.href}>{l.label}</a>
        (</each>)
      </nav>
      <a class="cta" href="#start">Get started</a>
    </div>
  </header>
(</extrusion>)

(<filament>)
  header {
    position: sticky;
    top: 0;
    z-index: 20;
    background: color-mix(in srgb, var(--canvas) 82%, transparent);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--hairline);
  }
  .inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    max-width: var(--page-max);
    height: var(--header);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 2px;
    font: 500 18px/1 var(--font-display);
    letter-spacing: -0.04em;
  }
  .brand b {
    font-weight: 500;
    color: var(--red);
  }
  .mark {
    width: 26px;
    height: 26px;
  }
  nav {
    display: flex;
    gap: 28px;
  }
  nav a,
  .cta {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  nav a {
    color: var(--muted);
    transition: color 0.2s;
  }
  nav a:hover {
    color: var(--fg);
  }
  .cta {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 14px;
    color: var(--canvas);
    background: var(--green);
  }
  @media (max-width: 860px) {
    nav {
      display: none;
    }
  }
(</filament>)
