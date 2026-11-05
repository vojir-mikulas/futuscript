export const heroSample = `(<extruderInitialization>)
  import Package from "./Package.fs"

  M98  crew: string = "Planet Express"
  M104 packages: Delivery[] = []
  M105 late = packages.filter((p) => p.late)
  M106 { M117 "Good news, everyone!" }
(</extruderInitialization>)

(<extrusion>)
  <h1>{crew} · {late.length} late</h1>

  (<each> p of packages by p.id )
    <Package {p} />
  (<empty>)
    <p>Nothing to deliver. Printer went for a beer.</p>
  (</each>)
(</extrusion>)

(<filament>)
  h1 { font-family: "Futura", sans-serif; }
(</filament>)`

export const reactSample = `import { useState, useMemo, useEffect } from "react"

export function Beers() {
  const [beers, setBeers] = useState(0)
  const happy = useMemo(() => beers > 3, [beers])
  useEffect(() => console.debug(beers), [beers])

  return (
    <button onClick={() => setBeers(beers + 1)}>
      {happy ? "Printer is great!" : "Need more beer"}
    </button>
  )
}`

export const futuSample = `(<extruderInitialization>)
  M104 beers = 0
  M105 happy = beers > 3
  M106 { M117 beers }
(</extruderInitialization>)

(<extrusion>)
  <button onclick={() => beers++}>
    (<if> happy )
      Printer is great!
    (<else>)
      Need more beer
    (</if>)
  </button>
(</extrusion>)`

export const principles = [
  {
    mark: "( )",
    title: "Parens are for the Slicer",
    text: "Anything in ( … ) is a compiler instruction and vanishes at build time. A bare <div> lands on the page.",
  },
  {
    mark: "M104",
    title: "Heat means reactivity",
    text: "M10x sets temperatures on a printer. Here it declares state, derived values and effects. Hot reacts, cold stays static.",
  },
  {
    mark: "(<layer>)",
    title: "One boundary for everything async",
    text: "Suspense, error boundary, streaming chunk and lazy island in one block.",
  },
]

export const blocks = [
  { name: "(<host>)", what: "Server module", runs: "on the server only" },
  { name: "(<extruderInitialization>)", what: "Setup: TypeScript plus G-codes", runs: "once per instance" },
  { name: "(<extrusion>)", what: "Template", runs: "on the server and the client" },
  { name: "(<filament>)", what: "Scoped CSS", runs: "at build time" },
]

export const codes = [
  { code: "M98", printer: "Call a subprogram with parameters", futu: "Prop, one per line" },
  { code: "M104", printer: "Set hotend temperature", futu: "State (a signal)" },
  { code: "M105", printer: "Report temperature", futu: "Derived value, lazy and cached" },
  { code: "M106", printer: "Fan on", futu: "Effect, may return a cleanup" },
  { code: "M107", printer: "Fan off", futu: "On destroy" },
  { code: "M141", printer: "Set chamber temperature", futu: "Provide context to the subtree" },
  { code: "M117", printer: "Show a message on the display", futu: "Dev-only log, stripped in production" },
  { code: "M600", printer: "Filament change", futu: "State update inside a View Transition" },
  { code: "M109", printer: "Set temperature and wait", futu: "Async derived, the component suspends" },
  { code: "G0", printer: "Rapid move, no extrusion", futu: "Client-side navigation" },
  { code: "G28", printer: "Home all axes", futu: "Redirect, works on the server too" },
]

export const useCases = [
  {
    id: "dashboard",
    client: "Planet Express",
    title: "A delivery dashboard",
    text: "Live packages, crew and a dark matter gauge. Keyed rows reorder without losing their DOM.",
    tags: ["signals", "keyed lists", "SPA"],
    code: `M104 packages: Delivery[] = []
M105 fuel = ship.darkMatter / ship.capacity

(<each> p of packages by p.id )
  <PackageRow {p} />
(</each>)`,
  },
  {
    id: "content",
    client: "Head Museum",
    title: "A docs or content site",
    text: "Thousands of pages that change once a century. Prerendered, zero JS, only the ticket form wakes up.",
    tags: ["SSG", "islands", "zero JS"],
    code: `(<procedureDone> export </procedureDone>)

(<layer> heat="visible" )
  <TicketForm />
(</layer>)`,
  },
  {
    id: "store",
    client: "MomCorp",
    title: "An online store",
    text: "The catalogue comes from the cache. The cart and \"Mom recommends\" stream in after.",
    tags: ["PPR", "server islands", "streaming"],
    code: `(<procedureDone> export shell </procedureDone>)

(<layer> host )
  <CartBadge />
(<pending>)
  <CartSkeleton />
(</layer>)`,
  },
  {
    id: "forms",
    client: "Central Bureaucracy",
    title: "Forms and back office",
    text: "(<host>) never reaches the browser. Forms work before JS loads, secrets stay in the building, filed in triplicate.",
    tags: ["server functions", "progressive forms"],
    code: `(<host>)
  export const file = action(async (form: FormData) => {
    await db.forms.create({ grade: 36, stamp: "approved" })
  })
(</host>)

<form action={file}> … </form>`,
  },
  {
    id: "media",
    client: "Everybody Loves Hypnotoad",
    title: "Pages with slow, flaky data",
    text: "Slow reviews sit in a (<layer>) with a fallback. If the service dies, only that layer shows it.",
    tags: ["suspense", "error boundary"],
    code: `(<layer>)
  <Reviews episode={id} />
(<pending>)
  <p>All glory to the loading spinner…</p>
(<catch> err )
  <p>Spaghetti: {err.message}</p>
(</layer>)`,
  },
  {
    id: "lab",
    client: "The Professor's lab",
    title: "Tiny components and prototypes",
    text: "A file with no blocks is just HTML. Scoped CSS and Vite included.",
    tags: ["template-only files", "scoped CSS", "Vite"],
    code: `<!-- Beer.fs -->
<p class="hint">Done. Go grab a beer.</p>`,
  },
]

export const modes = [
  {
    id: "spa",
    label: "SPA",
    nick: "The Planet Express Ship",
    quote: "The ship stays where it is, and the engines move the universe around it.",
    who: "Professor Farnsworth",
    pragma: "(<procedureDone> spa </procedureDone>)",
    text: "One bundle, runs in the browser, navigates without reloads.",
  },
  {
    id: "ssr",
    label: "Streaming SSR",
    nick: "Calculon's dramatic pause",
    quote: "",
    who: "",
    pragma: "// nothing to write, it's the default for routes",
    text: "HTML streams layer by layer. Fast parts first, slow (<layer>) blocks make their entrance… later.",
  },
  {
    id: "ssg",
    label: "SSG",
    nick: "Applied Cryogenics",
    quote: "",
    who: "",
    pragma: "(<procedureDone> export </procedureDone>)",
    text: "Frozen at build time, like Fry on December 31, 1999. Thaws per request, not per millennium.",
  },
  {
    id: "isr",
    label: "ISR",
    nick: "Slurm refill",
    quote: "It's highly addictive!",
    who: "Slurm",
    pragma: "(<procedureDone> export every 60s </procedureDone>)",
    text: "Static, refreshed in the background. A fresh can every 60 seconds.",
  },
  {
    id: "ppr",
    label: "PPR",
    nick: "Printer's spool window",
    quote: "",
    who: "",
    pragma: "(<procedureDone> export shell </procedureDone>)",
    text: "The body comes from the cache. What spins in the chest window is personal and streams in.",
  },
  {
    id: "islands",
    label: "Islands",
    nick: "Nibbler",
    quote: "",
    who: "",
    pragma: "(<layer> heat=\"visible\" )",
    text: "Mostly cold HTML that sleeps all day. Interactive parts wake on load, idle, visible or interaction.",
  },
  {
    id: "resume",
    label: "Resumability",
    nick: "The forward-only time machine",
    quote: "",
    who: "",
    pragma: "(<procedureDone> resume </procedureDone>)",
    text: "No hydration. Like the Professor's time machine, it only goes forward.",
  },
]


