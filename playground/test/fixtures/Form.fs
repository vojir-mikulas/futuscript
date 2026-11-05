(<extruderInitialization>)
  M104 form = { email: "", plan: "pla", extras: ["fan"] as string[], count: 0 }
  M104 todos = [{ id: 1, due: 5 }, { id: 2, due: 20 }]
  M104 now = 10

  function bump() {
    form.count++
  }
(</extruderInitialization>)

(<extrusion>)
  <input class="email" bind:value={form.email} />
  <input type="radio" name="plan" value="pla" bind:group={form.plan} />
  <input type="radio" name="plan" value="petg" bind:group={form.plan} />
  <input type="checkbox" value="fan" bind:group={form.extras} />
  <input type="checkbox" value="led" bind:group={form.extras} />
  <button onclick={bump}>+</button>
  <p class="out">{form.email}|{form.plan}|{form.extras.join("+")}|{form.count}</p>

  <ul>
    (<each> todo of todos by todo.id )
      M105 overdue = todo.due < now // lokální derived
      <li class={{ late: overdue }}>{todo.id}</li>
    (</each>)
  </ul>
  <button class="later" onclick={() => (now = 30)}>later</button>
(</extrusion>)
