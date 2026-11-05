(<extruderInitialization>)
  import robot from "../assets/robots/rendering.webp"
  import CodeBlock from "./CodeBlock.fs"
  import { modes } from "../content.ts"

  M104 current = "spa"
  M105 mode = modes.find((m) => m.id === current) ?? modes[0]

  function pick(id: string) {
    M600 {
      current = id
    }
  }
(</extruderInitialization>)

(<extrusion>)
  <section class="section" id="rendering">
    <div class="wrap">
      <p class="eyebrow">Rendering</p>
      <div class="head">
        <h2 class="title">One pragma per page. <span>Every rendering mode.</span></h2>
        <p class="intro">The mode is one line in the setup. Every mode mixes three axes: when HTML is printed, how it's delivered, when JavaScript heats up.</p>
        <img class="robot" src={robot} alt="" />
      </div>
      <div class="split">
        <div class="tabs" role="tablist">
          (<each> m of modes by m.id )
            <button role="tab" aria-selected={m.id === current} class={{ active: m.id === current }} onclick={() => pick(m.id)}>
              {m.label}
            </button>
          (</each>)
        </div>
        <div class="panel" role="tabpanel">
          <p class="mono">{mode.label}</p>
          <h3>{mode.nick}</h3>
          (<if> mode.quote )
            <blockquote>“{mode.quote}” <cite>{mode.who}</cite></blockquote>
          (</if>)
          <p class="text">{mode.text}</p>
          <div class="pragma"><CodeBlock code={mode.pragma} /></div>
        </div>
      </div>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .split {
    display: grid;
    grid-template-columns: 280px 1fr;
    border: 1px solid var(--hairline);
  }
  .tabs {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--hairline);
  }
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    font-family: var(--font-mono);
    font-size: 13px;
    text-align: left;
    color: var(--muted);
    background: transparent;
    border: 0;
    border-bottom: 1px solid var(--hairline);
    cursor: pointer;
    transition: color 0.2s, background-color 0.2s;
  }
  button:last-child {
    border-bottom: 0;
  }
  button:hover {
    color: var(--fg);
    background: rgb(255 255 255 / 0.025);
  }
  .active {
    color: var(--fg);
    background: var(--surface);
    box-shadow: inset 3px 0 0 var(--green);
  }
  .panel {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    min-width: 0;
    padding: 36px 40px 40px;
    background: var(--surface);
    view-transition-name: mode-panel;
  }
  .pragma {
    align-self: stretch;
  }
  .mono {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--green);
  }
  h3 {
    font: 500 clamp(1.4rem, 2.4vw, 1.9rem)/1.2 var(--font-display);
    letter-spacing: -0.045em;
  }
  blockquote {
    margin: 0;
    padding-left: 16px;
    border-left: 2px solid var(--green);
    font-size: 17px;
    color: var(--fg);
  }
  cite {
    display: block;
    margin-top: 4px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-style: normal;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .text {
    max-width: 600px;
    font-size: 16px;
    line-height: 1.7;
    color: var(--fg-2);
  }
  @media (max-width: 860px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
    }
    .tabs {
      flex-direction: row;
      flex-wrap: wrap;
      border-right: 0;
      border-bottom: 1px solid var(--hairline);
    }
    button,
    button:last-child {
      border: 0;
      padding: 10px 14px;
    }
    .active {
      box-shadow: inset 0 -2px 0 var(--green);
    }
    .panel {
      padding: 28px 24px;
    }
  }
(</filament>)
