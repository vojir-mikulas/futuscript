(<extruderInitialization>)
  import { guitar } from "./guitar.ts"

  const LAYERS = 140

  M104 temp = 210
  M104 layer = 0
  M105 state = temp < 190 ? "cold" : temp <= 240 ? "ok" : "spaghetti"
  M105 done = layer >= LAYERS
  M105 z = 332 - layer * 2
  M105 reach = z < 99 ? 18 : z < 196 ? 6 : 48

  M106 {
    let rest = 0
    const stepper = setInterval(() => {
      if (state === "cold") return
      if (layer < LAYERS) layer++
      else if (++rest > 40) {
        rest = 0
        layer = 0
      }
    }, 80)
    return () => clearInterval(stepper)
  }
(</extruderInitialization>)

(<extrusion>)
  <svg class={["printer", state, done && "done"]} viewBox="0 0 320 360" role="img" aria-label={`3D printer, layer ${layer} of ${LAYERS}`}>
    <defs>
      <pattern id="layer-lines" width="8" height="2" patternUnits="userSpaceOnUse">
        <rect class="pla" width="8" height="2" />
        <rect class="seam" width="8" height="0.5" />
      </pattern>
      <filter id="melt">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" />
        <feDisplacementMap in="SourceGraphic" scale="18" />
      </filter>
      <clipPath id="printed">
        <rect x="0" y={z} width="320" height={332 - z} />
      </clipPath>
      <path id="guitar" d={guitar} />
    </defs>

    <rect class="frame" x="6" y="6" width="308" height="348" rx="6" />
    <line class="rod" x1="22" y1="14" x2="22" y2="346" />
    <line class="rod" x1="298" y1="14" x2="298" y2="346" />
    <use class="wire" href="#guitar" />
    <use class="part" href="#guitar" clip-path="url(#printed)" />
    <rect class="bed" x="60" y="332" width="200" height="7" rx="2" />

    <g transform={`translate(0 ${z})`}>
      <rect class="gantry" x="22" y="-28" width="276" height="5" />
      <g class="head" style={`--reach: ${reach}px`}>
        <rect class="carriage" x="-13" y="-34" width="26" height="20" rx="3" />
        <path class="nozzle" d="M-5 -14 H5 L0 -1 Z" />
        (<if> state === "spaghetti" )
          <path class="ooze" d="M0 -1 c-8 6 8 10 0 16 s-8 10 0 16 s6 8 -2 12" />
        (</if>)
      </g>
    </g>
  </svg>

  <div class="readout">
    <span>Layer <strong>{layer}</strong> / {LAYERS}</span>
    <span>Nozzle <strong>{temp} °C</strong></span>
  </div>
  <input type="range" min="150" max="280" bind:value={temp} aria-label="Nozzle temperature" />

  (<if> state === "cold" )
    <p>Too cold. The filament won't budge.</p>
  (<elseif> state === "spaghetti" )
    <p class="hot">Way too hot. That's no longer a guitar, that's spaghetti.</p>
  (<elseif> done )
    <p class="ok">Done. Its owner doesn't know yet.</p>
  (<else>)
    <p class="ok">Just right. Copying a guitar from one photo.</p>
  (</if>)
(</extrusion>)

(<filament>)
  svg {
    display: block;
    width: 100%;
    height: auto;
    margin-bottom: 18px;
  }
  .frame {
    fill: var(--canvas);
    stroke: var(--hairline-strong);
  }
  .rod {
    stroke: var(--hairline-strong);
    stroke-width: 2;
  }
  .bed {
    fill: var(--surface-2);
    stroke: var(--hairline-strong);
  }
  .wire {
    fill: none;
    stroke: var(--cyan);
    stroke-opacity: 0.45;
    stroke-dasharray: 3 3;
  }
  .part {
    fill: url(#layer-lines);
  }
  .pla {
    fill: var(--orange);
  }
  .seam {
    fill: rgb(0 0 0 / 0.28);
  }
  .spaghetti .part {
    filter: url(#melt);
  }
  .gantry {
    fill: var(--surface-2);
    stroke: var(--hairline-strong);
  }
  .carriage {
    fill: var(--fg-2);
  }
  .nozzle {
    fill: var(--yellow);
  }
  .ooze {
    fill: none;
    stroke: var(--orange);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .head {
    animation: printer-sweep 0.45s ease-in-out infinite alternate;
  }
  .cold .head {
    animation-play-state: paused;
  }
  .done .head {
    animation: none;
    transform: translateX(262px);
  }
  @keyframes printer-sweep {
    from { transform: translateX(calc(160px - var(--reach))); }
    to { transform: translateX(calc(160px + var(--reach))); }
  }
  .readout {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--muted);
  }
  strong {
    font-weight: 400;
    color: var(--fg);
  }
  input {
    width: 100%;
    margin: 0 0 18px;
    accent-color: var(--orange);
  }
  p {
    font-size: 17px;
    color: var(--cyan);
  }
  .ok {
    color: var(--green);
  }
  .hot {
    color: var(--pink);
  }
(</filament>)
