(<extruderInitialization>)
  M98  start: number = 0
  M104 count = start
  M105 double = count * 2
  M106 {
    M117 `count je ${count}`
  }

  function inc() { count += 1 }
(</extruderInitialization>)

(<extrusion>)
  <button onclick={inc} disabled={count >= 10}>Klik {count}</button>
  (<if> count >= 10 )
    <p>Dost. Vychladni.</p>
  (<else>)
    <p>Dvojnásobek: {double}</p>
  (</if>)
(</extrusion>)

(<filament>)
  button { font-family: "Futura", sans-serif; }
(</filament>)
