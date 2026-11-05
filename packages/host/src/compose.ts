import type { Model, Renderable } from "@futuscript/firmware"

export interface Runtime {
  component: (into: any, model: Model<any>, props: any) => void
  renderable: (build: (into: any) => void) => Renderable
  page: (into: any, build: (into: any) => void) => void
}

export interface PageProps {
  params: Record<string, string>
  url: string
  locals: Record<string, unknown>
}

export function compose(rt: Runtime, layouts: Model<any>[], page: Model<any>): Model<PageProps> {
  return (props, into) => {
    let inner = (o: unknown): unknown => rt.page(o, (i) => rt.component(i, page, props))
    for (const layout of [...layouts].reverse()) {
      const child = inner
      inner = (o) => rt.component(o, layout, { ...props, infill: rt.renderable(child) })
    }
    return inner(into) as void
  }
}
