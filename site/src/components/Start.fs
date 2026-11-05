(<extruderInitialization>)
  import robot from "../assets/robots/start.webp"
  import CodeBlock from "./CodeBlock.fs"
  import { roadmap } from "../content.ts"

  const install = [
    "# needs Node 24+, pnpm and stable Rust",
    "pnpm install",
    "pnpm dev     # builds the Slicer, opens the playground",
    "pnpm test    # compiler tests in Rust + vitest end to end",
    "",
    "# or run the compiler by itself",
    "cargo run -q -- examples/Counter.fs",
  ].join("\n")
(</extruderInitialization>)

(<extrusion>)
  <section class="section" id="start">
    <div class="wrap">
      <p class="eyebrow"><b>07</b> Get started</p>
      <div class="head">
        <h2 class="title">Shut up and take my money! <span>Relax, it's free. Clone it.</span></h2>
        <p class="intro">Futuscript is in phase 0. The compiler, signals and client rendering work, and this site is built with them. Server rendering and the meta-framework come next. Expect sharp edges and the occasional Robot Devil.</p>
        <img class="robot" src={robot} alt="" />
      </div>
      <div class="split">
        <CodeBlock code={install} file="terminal" lang="sh" />
        <ol class="roadmap">
          (<each> r of roadmap by r.phase )
            <li>
              <span class="phase">Phase {r.phase}</span>
              <div><strong>{r.name}</strong><p>{r.text}</p></div>
            </li>
          (</each>)
        </ol>
      </div>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .split {
    display: grid;
    grid-template-columns: 1fr 1.15fr;
    align-items: start;
    gap: 48px;
  }
  .roadmap {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--hairline);
  }
  li {
    display: grid;
    grid-template-columns: 80px 1fr;
    align-items: start;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid var(--hairline);
  }
  .phase {
    padding-top: 2px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--faint);
  }
  strong {
    font-weight: 500;
  }
  li p {
    margin-top: 2px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--muted);
  }
  @media (max-width: 900px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
    }
    li {
      grid-template-columns: minmax(0, 1fr);
      gap: 6px;
    }
  }
(</filament>)
