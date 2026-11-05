(<extruderInitialization>)
  import Slow from "./Slow.fs"

  M98 ok: () => Promise<string>
  M98 bad: () => Promise<string>
(</extruderInitialization>)

(<extrusion>)
  (<layer>)
    <Slow load={ok} />
  (<pending>)
    <p class="pending">čekám</p>
  (</layer>)
  (<layer>)
    <Slow load={bad} />
  (<pending>)
    <p class="pending">čekám</p>
  (<catch> err )
    <p class="err">{err.message}</p>
  (</layer>)
(</extrusion>)
