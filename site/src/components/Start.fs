(<extruderInitialization>)
  import robot from "../assets/robots/start.webp"
  import CodeBlock from "./CodeBlock.fs"

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
      <p class="eyebrow">Get started</p>
      <div class="head">
        <h2 class="title">Shut up and take my money!</h2>
        <p class="intro">The compiler, signals and client rendering work today, and this site runs on them. Server rendering is next.</p>
      </div>
      <div class="split">
        <CodeBlock code={install} file="terminal" lang="sh" />
        <img class="stand" src={robot} alt="" />
      </div>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 48px;
  }
  .stand {
    height: 230px;
    width: auto;
    margin-bottom: -6px;
    pointer-events: none;
    user-select: none;
    filter: drop-shadow(0 14px 18px rgb(0 0 0 / 0.5));
  }
  @media (max-width: 760px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
      gap: 24px;
    }
    .stand {
      justify-self: end;
      height: 160px;
    }
  }
(</filament>)
