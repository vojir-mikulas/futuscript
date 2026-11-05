/**
 * Firmware: klientský runtime Futuscriptu.
 * Viz docs/architecture-v0.md §2.
 */
export {
  batch,
  computed,
  effect,
  flushMount,
  getOwner,
  onCleanup,
  onDestroy,
  root,
  runWithOwner,
  signal,
  untrack,
  update,
  userEffect,
} from "./reactive.ts"
export type { Computed, Owner, Signal } from "./reactive.ts"
export {
  attr,
  bind,
  branch,
  cls,
  clsx,
  component,
  css,
  each,
  el,
  frag,
  insert,
  on,
  print,
  prop,
  transition,
} from "./dom.ts"
export type { Model } from "./dom.ts"
