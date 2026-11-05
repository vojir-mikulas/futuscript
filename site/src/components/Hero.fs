(<extruderInitialization>)
  import CodeBlock from "./CodeBlock.fs"
  import robot from "../assets/robots/hero.webp"
  import { heroSample } from "../content.ts"

  const facts = [
    { value: "0", label: "virtual DOM nodes" },
    { value: "Rust", label: "compiler, built on Oxc" },
    { value: "4", label: "optional blocks per file" },
    { value: "1", label: "boundary for all async" },
  ]
(</extruderInitialization>)

(<extrusion>)
  <section class="hero" id="top">
    <div class="inner">
      <div class="copy">
        <p class="eyebrow"><b>v0</b> Ready for the year 3000</p>
        <h1>Good news, everyone! <span>Web pages are printed now.</span></h1>
        <p class="lead">A compiled UI framework with signals, a Rust compiler and no virtual DOM. The syntax comes from Futurama, the API is deliberately boring.</p>
        <div class="actions">
          <a class="btn green" href="#start">Get started <span>→</span></a>
          <a class="link" href="#syntax">Read the syntax <span>↓</span></a>
        </div>
      </div>
      <div class="sample">
        <img class="mascot flip" src={robot} alt="Printer Printer Escuella, the Futuscript robot, holding a freshly printed page" />
        <CodeBlock code={heroSample} file="DeliveryList.fs" />
      </div>
    </div>
    <ul class="facts">
      (<each> f of facts by f.value )
        <li><strong>{f.value}</strong><span>{f.label}</span></li>
      (</each>)
    </ul>
  </section>
(</extrusion>)

(<filament>)
  .hero {
    position: relative;
    border-bottom: 1px solid var(--hairline);
    background-image:
      linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px);
    background-size: 24px 24px;
    background-position: center top;
  }
  .hero::after {
    content: "";
    position: absolute;
    inset: auto 0 -1px;
    height: 6px;
    pointer-events: none;
    background: linear-gradient(
      90deg,
      transparent 0 24px,
      var(--green) 24px 30px,
      transparent 30px calc(100% - 30px),
      var(--green) calc(100% - 30px) calc(100% - 24px),
      transparent calc(100% - 24px)
    );
  }
  .inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 64px;
    max-width: var(--page-max);
    margin-inline: auto;
    padding: 96px var(--gutter) 88px;
    border-inline: 1px dashed var(--hairline);
  }
  .copy {
    min-width: 0;
  }
  h1 {
    font: 550 clamp(2.2rem, 3.7vw, 3.5rem)/1.1 var(--font-display);
    letter-spacing: -0.055em;
    text-wrap: balance;
  }
  h1 span {
    display: block;
    margin-top: 6px;
    color: var(--green);
  }
  .lead {
    max-width: 500px;
    margin: 28px 0 36px;
    font-size: 18px;
    line-height: 1.7;
    color: var(--fg-2);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 28px;
  }
  .sample {
    position: relative;
    min-width: 0;
    box-shadow: 10px 10px 0 rgb(0 0 0 / 0.45);
  }
  .mascot {
    position: absolute;
    right: calc(100% + 20px);
    bottom: -88px;
    height: 230px;
    width: auto;
    pointer-events: none;
    user-select: none;
    filter: drop-shadow(0 12px 16px rgb(0 0 0 / 0.45));
  }
  .facts {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    max-width: var(--page-max);
    margin: 0 auto;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--hairline);
    border-inline: 1px dashed var(--hairline);
  }
  li {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 28px var(--gutter) 32px;
    border-left: 1px dashed var(--hairline);
  }
  li:first-child {
    border-left: 0;
  }
  strong {
    font: 500 28px/1 var(--font-display);
    letter-spacing: -0.04em;
    color: var(--fg);
  }
  li span {
    max-width: 220px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--muted);
  }
  @media (max-width: 1000px) {
    .inner {
      grid-template-columns: minmax(0, 1fr);
      gap: 190px;
      padding-top: 72px;
    }
    .mascot {
      right: 24px;
      bottom: 100%;
      height: 170px;
      margin-bottom: -4px;
    }
    .facts {
      grid-template-columns: repeat(2, 1fr);
    }
    li:nth-child(3) {
      border-left: 0;
    }
    li:nth-child(n + 3) {
      border-top: 1px dashed var(--hairline);
    }
  }
(</filament>)
