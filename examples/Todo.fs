(<extruderInitialization>)
  import type { Todo } from "./types.ts"
  import TodoItem from "./TodoItem.fs"
  import Beer from "./Beer.fs"

  M98  title: string = "Úkoly"
  M104 todos: Todo[] = []
  M104 draft = ""
  M104 filter: "all" | "open" | "done" = "all"
  M105 visible = todos.filter(t => filter === "all" || (filter === "done") === t.done)
  M105 left = todos.filter(t => !t.done).length
  let nextId = 1                       // obyčejná proměnná, v šabloně není, nemusí být reaktivní

  function add(e: SubmitEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    todos = [...todos, { id: nextId++, text: draft.trim(), done: false }]
    draft = ""
  }

  function toggle(id: number) {
    todos = todos.map(t => (t.id === id ? { ...t, done: !t.done } : t))
  }
(</extruderInitialization>)

(<extrusion>)
  <h1>{title} ({left})</h1>

  <form onsubmit={add}>
    <input bind:value={draft} placeholder="Co je potřeba vytisknout?" />
    <button>Přidat</button>
  </form>

  <nav>
    (<each> f of ["all", "open", "done"] as const )
      <button class={{ active: filter === f }} onclick={() => (filter = f)}>{f}</button>
    (</each>)
  </nav>

  (<each> todo of visible by todo.id )
    <TodoItem {todo} ontoggle={() => toggle(todo.id)} />
  (<empty>)
    <Beer />
  (</each>)
(</extrusion>)

(<filament>)
  h1 { font-family: "Futura", sans-serif; }
  .active { text-decoration: underline; }
(</filament>)
