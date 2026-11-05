(<extruderInitialization>)
  import CodeBlock from "./CodeBlock.fs"
  import Printer from "./Printer.fs"
  import source from "./Printer.fs?raw"
(</extruderInitialization>)

(<extrusion>)
  <section class="section" id="playground">
    <div class="wrap">
      <p class="eyebrow">Playground</p>
      <div class="head">
        <h2 class="title">This is not a screenshot. <span>It's printing right now.</span></h2>
        <p class="intro">On the left, all of Printer.fs. On the right, that same file running: it's copying a guitar from one photo, a layer at a time. Try overheating it. Printer would.</p>
      </div>
      <div class="split">
        <div class="source"><CodeBlock code={source.trim()} file="site/src/components/Printer.fs" /></div>
        <div class="live">
          <p class="tag"><i></i> Live · guitar.gcode</p>
          <Printer />
        </div>
      </div>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .split {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 24px;
  }
  .source {
    min-width: 0;
    contain: size;
    overflow-y: auto;
    border-bottom: 1px solid var(--hairline);
  }
  .live {
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
    .source {
      contain: none;
      max-height: 560px;
    }
  }
(</filament>)
