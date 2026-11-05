import { defineConfig } from "vite"
import futuscript from "@futuscript/vite"

export default defineConfig({ appType: "custom", plugins: [futuscript()] })
