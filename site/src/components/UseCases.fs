(<extruderInitialization>)
  import robot from "../assets/robots/usecases.webp"
  import CodeBlock from "./CodeBlock.fs"
  import { useCases } from "../content.ts"
(</extruderInitialization>)

(<extrusion>)
  <section class="section" id="use-cases">
    <div class="wrap">
      <p class="eyebrow"><b>03</b> Use cases</p>
      <div class="head">
        <h2 class="title">Real jobs. <span>Fictional clients.</span></h2>
        <p class="intro">Six typical projects from the Planet Express logbook, and how each one maps onto Futuscript: which blocks, which codes, which rendering mode.</p>
        <img class="robot" src={robot} alt="" />
      </div>

      <div class="grid">
        (<each> u of useCases by u.id )
          <article>
            <p class="client">{u.client}</p>
            <h3>{u.title}</h3>
            <p class="text">{u.text}</p>
            <CodeBlock code={u.code} />
            <div class="meta">
              (<each> t of u.tags by t )
                <span class="chip">{t}</span>
              (</each>)
            </div>
          </article>
        (</each>)
      </div>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--hairline);
  }
  article {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 40px 40px 44px 0;
    border-bottom: 1px solid var(--hairline);
  }
  article:nth-child(even) {
    padding: 40px 0 44px 40px;
    border-left: 1px dashed var(--hairline);
  }
  .client {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--green);
  }
  h3 {
    font: 500 1.3rem/1.3 var(--font-display);
    letter-spacing: -0.04em;
  }
  .text {
    max-width: 520px;
    margin-bottom: 6px;
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: auto;
    padding-top: 6px;
  }
  @media (max-width: 900px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
    article,
    article:nth-child(even) {
      padding: 32px 0;
      border-left: 0;
    }
  }
(</filament>)
