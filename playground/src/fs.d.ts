declare module "*.fs" {
  import type { Model } from "@futuscript/firmware"
  const model: Model<any>
  export default model
}
