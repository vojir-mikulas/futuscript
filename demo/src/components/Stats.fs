(<host>)
  import { query } from "@futuscript/host"

  export const slowStats = query(async (ms: number) => {
    await new Promise((r) => setTimeout(r, ms))
    return { prints: 42, ms }
  })
(</host>)

(<extruderInitialization>)
  M98 ms: number
  M109 stats = await slowStats(ms)
(</extruderInitialization>)

(<extrusion>)
  <p class="stats">Výtisků: {stats?.prints} (za {stats?.ms} ms)</p>
(</extrusion>)
