(<extruderInitialization>)
  import type { Todo } from "./types.ts"

  M98 todo: Todo
  M98 ontoggle: () => void
(</extruderInitialization>)

(<extrusion>)
  <label class={["todo", todo.done && "todo--done"]}>
    <input type="checkbox" checked={todo.done} onchange={ontoggle} />
    {todo.text}
  </label>
(</extrusion>)

(<filament>)
  .todo--done { text-decoration: line-through; opacity: 0.6; }
(</filament>)
