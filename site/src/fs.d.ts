declare module "*.fs" {
  import type { Model } from "@futuscript/firmware"
  const model: Model<any>
  export default model
}
declare module "*.fs?raw" {
  const source: string
  export default source
}
declare module "*.css"
declare module "*.webp" {
  const src: string
  export default src
}
