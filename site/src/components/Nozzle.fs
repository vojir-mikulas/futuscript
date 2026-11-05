(<extruderInitialization>)
  M104 temp = 190
  M105 state = temp < 200 ? "cold" : temp <= 240 ? "ok" : "spaghetti"
(</extruderInitialization>)

(<extrusion>)
  <label>Nozzle <strong>{temp} °C</strong></label>
  <input type="range" min="150" max="280" bind:value={temp} />
  <div class={["thermo", state]} style={`--t: ${(temp - 150) / 1.3}%`}></div>

  (<if> state === "cold" )
    <p>Too cold. The filament won't budge.</p>
  (<elseif> state === "ok" )
    <p class="ok">Just right. We're printing!</p>
  (<else>)
    <p class="hot">Way too hot. Spaghetti is pouring out of the nozzle.</p>
  (</if>)
(</extrusion>)

(<filament>)
  label {
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
    accent-color: var(--orange);
  }
  .thermo {
    height: 6px;
    margin: 16px 0 20px;
    background: linear-gradient(90deg, var(--cyan), var(--green) 40%, var(--orange) 70%, var(--pink));
    clip-path: inset(0 calc(100% - var(--t)) 0 0);
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
