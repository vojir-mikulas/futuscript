(<extruderInitialization>)
  import type { Macro } from "@futuscript/firmware"
  import { Theme } from "./theme.ts"

  M98 title: string
  M98 header?: Macro
  M98 infill: Macro
  M98 ...rest

  M105 theme = Theme.use()
(</extruderInitialization>)

(<extrusion>)
  <article class="card" data-theme={theme} {...rest}>
    (<if> header )
      <header>{header}</header>
    (<else>)
      <h2>{title}</h2>
    (</if>)
    {infill}
  </article>
(</extrusion>)
