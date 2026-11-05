import "./global.css"
import { print } from "@futuscript/firmware"
import App from "./App.fs"

print(App, document.getElementById("plate")!)
