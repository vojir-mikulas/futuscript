(<extruderInitialization>)
  import robot from "../assets/robots/why.webp"
  import CodeBlock from "./CodeBlock.fs"
  import { principles, reactSample, futuSample } from "../content.ts"
(</extruderInitialization>)

(<extrusion>)
  <section class="section" id="why">
    <div class="wrap">
      <p class="eyebrow"><b>01</b> Why</p>
      <div class="head">
        <h2 class="title">The joke is in the structure. <span>The API stays boring.</span></h2>
        <p class="intro">A .fs file reads like a printer working through its G-code. Underneath it's signals, a compiler and plain TypeScript, so what you know from React, Svelte or Solid carries straight over. Why another framework? Printer Printer Escuella, our resident robot, said it best: we'll build our own, with blackjack and G-codes.</p>
        <img class="robot" src={robot} alt="" />
      </div>

      <ol class="principles">
        (<each> p of principles by p.title )
          <li>
            <code class="mark">{p.mark}</code>
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </li>
        (</each>)
      </ol>

      <div class="compare">
        <div class="side">
          <p class="label">React</p>
          <CodeBlock code={reactSample} file="Beers.tsx" lang="tsx" />
        </div>
        <div class="side">
          <p class="label"><b>Futuscript</b></p>
          <CodeBlock code={futuSample} file="Beers.fs" />
        </div>
      </div>
      <p class="caption">Same component. No setters, no dependency arrays, no rules of hooks. As Morbo would put it: dependency arrays do not work that way. Good night!</p>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .principles {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0 0 88px;
    padding: 0;
    list-style: none;
  }
  li {
    padding: 4px 36px 0;
    border-left: 1px dashed var(--hairline);
  }
  li:first-child {
    padding-left: 0;
    border-left: 0;
  }
  .mark {
    display: inline-block;
    margin-bottom: 22px;
    padding: 6px 10px;
    font-size: 13px;
    color: var(--green);
    background: var(--green-tint);
    border: 1px solid rgb(79 214 138 / 0.3);
  }
  h3 {
    margin-bottom: 10px;
    font: 500 1.1rem/1.3 var(--font-display);
    letter-spacing: -0.035em;
  }
  li p {
    max-width: 340px;
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
  }
  .compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .side {
    min-width: 0;
  }
  .label {
    margin-bottom: 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .label b {
    font-weight: 400;
    color: var(--green);
  }
  .caption {
    margin-top: 20px;
    font-size: 15px;
    color: var(--muted);
  }
  @media (max-width: 900px) {
    .principles {
      grid-template-columns: minmax(0, 1fr);
      margin-bottom: 56px;
    }
    li,
    li:first-child {
      padding: 24px 0;
      border-left: 0;
      border-top: 1px dashed var(--hairline);
    }
    .compare {
      grid-template-columns: minmax(0, 1fr);
    }
  }
(</filament>)
