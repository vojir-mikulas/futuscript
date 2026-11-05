(<host>)
  import { action, cookies, query } from "@futuscript/host"

  const db = [{ id: 1, text: "Koupit filament" }]

  export const getTodos = query(async () => db)
  export const addTodo = action(async (form: FormData) => {
    db.push({ id: db.length + 1, text: String(form.get("text")) })
  })
  export const whoami = query(async () => cookies().get("visits") ?? "?")
(</host>)

(<extruderInitialization>)
  M109 todos = await getTodos()
  M109 visits = await whoami()
(</extruderInitialization>)

(<extrusion>)
  (<head>)
    <title>Úkoly · Futuscript</title>
  (</head>)
  <h1>Úkoly ze serveru</h1>
  <p class="who">cookie visits = {visits}</p>
  <ul>
    (<each> t of todos ?? [] by t.id )
      <li>{t.text}</li>
    (</each>)
  </ul>
  <form action={addTodo}>
    <input name="text" required />
    <button>Přidat</button>
  </form>
(</extrusion>)
