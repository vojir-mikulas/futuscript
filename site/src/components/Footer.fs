(<extruderInitialization>)
  import robot from "../assets/robots/footer.webp"
(</extruderInitialization>)

(<extrusion>)
  <footer>
    <div class="inner">
      <div class="brand">
        <p class="word"><img src="/rocket.svg" alt="" />Futu<b>script</b></p>
        <p>Every section of this page is a .fs file. Printer slept through the build.</p>
      </div>
      <div class="links">
        <a href="#why">Why</a>
        <a href="#syntax">Syntax</a>
        <a href="#use-cases">Use cases</a>
        <a href="#playground">Playground</a>
        <a href="#rendering">Rendering</a>
        <a href="#start">Get started</a>
      </div>
      <img class="sleeper" src={robot} alt="" />
    </div>
    <div class="base">
      <span>Printed in New New York, year 3000</span>
      <span>A fan-made joke framework. Futurama belongs to its creators, we just borrowed the printer.</span>
    </div>
  </footer>
(</extrusion>)

(<filament>)
  footer {
    max-width: var(--page-max);
    margin: 0 auto;
    border-inline: 1px dashed var(--hairline);
  }
  .inner {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 48px 72px;
    padding: 72px var(--gutter) 56px;
  }
  .sleeper {
    align-self: end;
    height: 130px;
    width: auto;
    margin-bottom: -57px;
    pointer-events: none;
    user-select: none;
  }
  .word {
    display: flex;
    align-items: center;
    margin-bottom: 14px;
    font: 500 22px/1 var(--font-display);
    letter-spacing: -0.04em;
  }
  .word b {
    font-weight: 500;
    color: var(--red);
  }
  .word img {
    width: 30px;
    height: 30px;
    margin-right: 2px;
  }
  .brand p:last-child {
    max-width: 420px;
    font-size: 15px;
    color: var(--muted);
  }
  .links {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 10px 48px;
    align-content: start;
  }
  a {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    transition: color 0.2s;
  }
  a:hover {
    color: var(--fg);
  }
  .base {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px 32px;
    padding: 20px var(--gutter) 28px;
    border-top: 1px solid var(--hairline);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    color: var(--faint);
  }
  @media (max-width: 760px) {
    .inner {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .brand {
      grid-column: 1 / -1;
    }
    .sleeper {
      height: 96px;
    }
  }
(</filament>)
