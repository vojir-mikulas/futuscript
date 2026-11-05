import type { Model, Renderable } from "@futuscript/firmware"

export interface Runtime {
  component: (into: any, model: Model<any>, props: any) => void
  renderable: (build: (into: any) => void) => Renderable
}

export interface PageProps {
  params: Record<string, string>
  url: string
  locals: Record<string, unknown>
}

export function compose(rt: Runtime, layouts: Model<any>[], page: Model<any>): Model<PageProps> {
  return (props, into) => {
    let inner = (o: unknown) => rt.component(o, page, props)
    for (const layout of [...layouts].reverse()) {
      const child = inner
      inner = (o) => rt.component(o, layout, { ...props, infill: rt.renderable(child) })
    }
    inner(into)
  }
}
