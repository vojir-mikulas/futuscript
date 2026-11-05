import { print } from "@futuscript/firmware"
import Counter from "../../examples/Counter.fs"
import Todo from "../../examples/Todo.fs"

print(Counter, document.getElementById("counter")!, { start: 3 })
print(Todo, document.getElementById("todo")!)
