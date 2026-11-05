declare module "*.fs" {
  import type { Model } from "@futuscript/firmware"
  const model: Model<any>
  export default model
}
declare module "*.fs?ssr" {
  import type { Model } from "@futuscript/firmware"
  const model: Model<any, string[]>
  export default model
}
