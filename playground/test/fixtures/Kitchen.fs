(<extruderInitialization>)
  import Card from "./Card.fs"
  import { Theme } from "./theme.ts"

  M104 theme = "dark"
  M141 Theme = theme

  M104 status: "idle" | "busy" | "done" = "idle"
  M104 items = [{ id: 1, text: "Filament" }, { id: 2, text: "Tryska" }]
  M104 color = "red"
  M104 open = false
  M104 keys: string[] = []
  M104 actionLog: string[] = []

  let canvas: HTMLCanvasElement | null = null
  M104 hasCanvas = false

  function tilt(node: Element, deg: number) {
    actionLog = [...actionLog, `tilt ${deg} ${node.tagName}`]
    return () => {
      actionLog = [...actionLog, "untilt"]
    }
  }

  function grab(el: HTMLCanvasElement | null) {
    canvas = el
    hasCanvas = !!canvas
  }

  M106 {
    hasCanvas = canvas !== null
  }
(</extruderInitialization>)

(<extrusion>)
  (<macro> row(item: { id: number; text: string }) )
    <li class="row">#{item.id} {item.text}</li>
  (</macro>)

  <Card title="Základ" class="extra" id="first" onclick={() => (open = !open)}>
    <p class="body">obsah karty</p>
  </Card>

  <Card title="nepoužito">
    (<infill> header )
      <strong class="custom">vlastní hlavička</strong>
    (</infill>)
    <p>druhá</p>
  </Card>

  <ul>
    (<each> { id, text }, i of items by id )
      <li class="item" data-i={i}>{id}: {text}</li>
    (</each>)
  </ul>

  <ol>
    (<each> it of items by it.id )
      {row(it)}
    (</each>)
  </ol>

  (<match> status )
  (<case> "idle" )
    <p class="status">čeká</p>
  (<case> "busy" )
    <p class="status">tiskne</p>
  (<default>)
    <p class="status">hotovo</p>
  (</match>)

  <div class="styled" style={{ color, "--size": "2px", fontSize: "12px" }}></div>
  <canvas bind:this={canvas} use:tilt={45}></canvas>

  <svg class="icon" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill={color} /></svg>

  (<if> open )
    (<portal>)
      <div class="modal">modál</div>
    (</portal>)
  (</if>)

  (<window> onkeydown={(e: KeyboardEvent) => (keys = [...keys, e.key])} </window>)

  <p class="log">{actionLog.join(",")}</p>
  <p class="canvas">{String(hasCanvas)}</p>
  <p class="keys">{keys.join("")}</p>
  <button class="busy" onclick={() => (status = "busy")}>busy</button>
  <button class="theme" onclick={() => (theme = theme === "dark" ? "light" : "dark")}>theme</button>
  <button class="rename" onclick={() => (items = items.map((i) => (i.id === 1 ? { ...i, text: "PLA" } : i)))}>rename</button>
(</extrusion>)
