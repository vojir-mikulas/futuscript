(<host>)
  import { query } from "@futuscript/host"

  export const clogged = query(async () => {
    await new Promise((r) => setTimeout(r, 200))
    throw new Error("tryska se ucpala")
  })
(</host>)

(<extruderInitialization>)
  M109 x = await clogged()
(</extruderInitialization>)

(<extrusion>)
  <p>{x}</p>
(</extrusion>)
