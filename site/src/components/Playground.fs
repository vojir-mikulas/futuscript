(<extruderInitialization>)
  import robot from "../assets/robots/playground.webp"
  import CodeBlock from "./CodeBlock.fs"
  import Nozzle from "./Nozzle.fs"
  import source from "./Nozzle.fs?raw"
(</extruderInitialization>)

(<extrusion>)
  <section class="section" id="playground">
    <div class="wrap">
      <p class="eyebrow"><b>04</b> Playground</p>
      <div class="head">
        <h2 class="title">This is not a screenshot. <span>It's printing right now.</span></h2>
        <p class="intro">On the left is the real Nozzle.fs from this site's source. On the right, the Firmware is rendering it in your browser. Try overheating the nozzle. Printer would.</p>
        <img class="robot" src={robot} alt="" />
      </div>
      <div class="split">
        <div class="source"><CodeBlock code={source.trim()} file="site/src/components/Nozzle.fs" /></div>
        <div class="live">
          <p class="tag"><i></i> Live</p>
          <Nozzle />
        </div>
      </div>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .split {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    align-items: start;
    gap: 24px;
  }
  .source {
    min-width: 0;
    max-height: 560px;
    overflow-y: auto;
    border-bottom: 1px solid var(--hairline);
  }
  .live {
    position: sticky;
    top: calc(var(--header) + 24px);
    padding: 28px;
    background: var(--surface);
    border: 1px solid var(--hairline);
    box-shadow: inset 0 3px 0 var(--orange);
  }
  .tag {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--orange);
  }
  i {
    width: 6px;
    height: 6px;
    background: var(--orange);
  }
  @media (max-width: 900px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
    }
  }
(</filament>)
