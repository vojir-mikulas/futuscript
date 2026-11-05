(<extruderInitialization>)
  import robot from "../assets/robots/errors.webp"
  const error = [
    "Spaghetti in Counter.fs:2:3",
    "",
    " 2 │   M14 count = 0",
    "   │   ^^^ unknown G-code",
    "",
    "help: did you mean M104 (state)?",
  ].join("\n")

  M104 broken = false
  M105 line = broken ? "M14 count = 0" : "M104 count = 0"

  function toggle() {
    broken = !broken
  }
(</extruderInitialization>)

(<extrusion>)
  <section class="section" id="errors">
    <div class="wrap">
      <p class="eyebrow"><b>06</b> Errors</p>
      <div class="head">
        <h2 class="title">A failed print is spaghetti. <span>Not a stack trace from Robot Hell.</span></h2>
        <p class="intro">A failed 3D print ends up as a tangle of plastic noodles, so that's what errors are called. The joke stops at the title. The rest tells you the file, the line, what went wrong and how to fix it.</p>
        <img class="robot" src={robot} alt="" />
      </div>
      <div class="split">
        <div class={["term", broken && "broken"]}>
          <div class="bar"><span>futu dev</span><span class="state">{broken ? "1 error" : "ok"}</span></div>
          <pre class="code"><span class="ln">2</span>  {line}</pre>
          (<if> broken )
            <pre class="out err">{error}</pre>
          (<else>)
            <pre class="out">✓ printed in 3 ms · 0 errors · Printer says: neat.</pre>
          (</if>)
          <div class="actions">
            <button class="btn" onclick={toggle}>{broken ? "Let Printer fix it" : "Break it"}</button>
          </div>
        </div>
        <aside>
          <p class="mono">At runtime</p>
          <h3>Our crew is replaceable. Your page isn't.</h3>
          <p>The Planet Express motto, applied to components. When a part of the page throws, the nearest <code>{"(<layer>)"}</code> catches it and prints its fallback. Everything around it keeps running.</p>
        </aside>
      </div>
    </div>
  </section>
(</extrusion>)

(<filament>)
  .split {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 24px;
    align-items: stretch;
  }
  .term {
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--surface);
    border: 1px solid var(--hairline);
    transition: border-color 0.2s;
  }
  .broken {
    border-color: var(--pink);
  }
  .bar {
    display: flex;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid var(--hairline);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .state {
    color: var(--green);
  }
  .broken .state {
    color: var(--pink);
  }
  pre {
    margin: 0;
    padding: 16px 20px;
    font-size: 13px;
    line-height: 1.7;
    overflow-x: auto;
  }
  .code {
    color: var(--fg);
    border-bottom: 1px dashed var(--hairline);
  }
  .ln {
    color: var(--faint);
  }
  .out {
    flex: 1;
    color: var(--green);
  }
  .err {
    color: var(--pink);
  }
  .actions {
    padding: 0 20px 20px;
  }
  aside {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
    padding: 32px;
    border: 1px dashed var(--hairline-strong);
  }
  .mono {
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
  aside p:last-child {
    font-size: 15px;
    line-height: 1.75;
    color: var(--muted);
  }
  @media (max-width: 900px) {
    .split {
      grid-template-columns: minmax(0, 1fr);
    }
  }
(</filament>)
