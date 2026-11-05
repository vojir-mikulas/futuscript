(<extruderInitialization>)
  M98 load: () => Promise<string>
  M109 v = await load()
(</extruderInitialization>)

(<extrusion>)
  <p class="v">{v}</p>
(</extrusion>)
