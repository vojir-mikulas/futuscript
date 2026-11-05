(<extruderInitialization>)
  import Stats from "../components/Stats.fs"
  import Broken from "../components/Broken.fs"
(</extruderInitialization>)

(<extrusion>)
  <h1>Streaming po vrstvách</h1>
  (<layer>)
    <Stats ms={600} />
  (<pending>)
    <p class="pending">Tisknu statistiky…</p>
  (</layer>)
  (<layer>)
    <Broken />
  (<pending>)
    <p class="pending">Tisknu…</p>
  (<catch> err )
    <p class="err">Spaghetti: {err.message}</p>
  (</layer>)
  <p class="after">Tohle přišlo hned se shellem.</p>
(</extrusion>)
