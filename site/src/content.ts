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
    text: "Everything wrapped in ( … ) is an instruction for the compiler and disappears at build time, like comments in real G-code. A bare <div> is material that actually lands on the page.",
  },
  {
    mark: "M104",
    title: "Heat means reactivity",
    text: "On a real printer the M10x family sets and reads temperatures. Here it declares state, derived values and effects. Hot values react, cold values stay static, and the compiler knows which is which.",
  },
  {
    mark: "(<layer>)",
    title: "One boundary for everything async",
    text: "(<layer>) is a Suspense boundary, an error boundary, a streaming chunk and a lazy island at once.",
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
    text: "Packages, crew assignments and a dark matter gauge that update live. State lives in M104, totals in M105, and a keyed (<each>) reorders rows without throwing away their DOM.",
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
    text: "Thousands of exhibit pages that change about once a century. Pages are prerendered at build time, cold components ship zero JavaScript, and only the ticket form wakes up when a visitor scrolls to it.",
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
    text: "The catalogue is the same for every customer and comes straight from the cache. The cart badge and the personalised \"Mom recommends\" shelf are holes that stream in later in the same response.",
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
    text: "Queries and actions live in (<host>), which never reaches the browser. The client gets an RPC stub, the form works before JavaScript loads, and the database password stays in the building, filed in triplicate.",
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
    text: "The episode page renders right away. Reviews come from a slow service, so they sit in a (<layer>) with a fallback while they load, and if the service falls over, only that layer shows an error. The rest of the page keeps working.",
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
    text: "A file with no blocks at all is just a template, so a small component is plain HTML. Scoped CSS comes free, the Vite plugin compiles on save, and the Slicer tells you exactly which line blew up.",
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
    text: "Everything ships in one bundle and runs in the browser. Client-side navigation moves the page around you without a reload.",
  },
  {
    id: "ssr",
    label: "Streaming SSR",
    nick: "Calculon's dramatic pause",
    quote: "",
    who: "",
    pragma: "// nothing to write, it's the default for routes",
    text: "The server sends HTML layer by layer, the way a printer builds a part. The fast parts are on stage at once, the slow (<layer>) blocks make their entrance later in the same response.",
  },
  {
    id: "ssg",
    label: "SSG",
    nick: "Applied Cryogenics",
    quote: "",
    who: "",
    pragma: "(<procedureDone> export </procedureDone>)",
    text: "The page is frozen at build time and served as a static file from any CDN. Like Fry on December 31, 1999, except it thaws on every request instead of a thousand years later.",
  },
  {
    id: "isr",
    label: "ISR",
    nick: "Slurm refill",
    quote: "It's highly addictive!",
    who: "Slurm",
    pragma: "(<procedureDone> export every 60s </procedureDone>)",
    text: "Static, but revalidated in the background. After the interval, the next visitor gets a fresh can.",
  },
  {
    id: "ppr",
    label: "PPR",
    nick: "Printer's spool window",
    quote: "",
    who: "",
    pragma: "(<procedureDone> export shell </procedureDone>)",
    text: "Printer's riveted body is the same for everyone and comes from the cache. What's spinning in the window on his chest is different for every visitor and streams into the same response through (<layer> host ) holes.",
  },
  {
    id: "islands",
    label: "Islands",
    nick: "Nibbler",
    quote: "",
    who: "",
    pragma: "(<layer> heat=\"visible\" )",
    text: "Most of the page is cold HTML with zero JavaScript, like a small pet that sleeps all day. Interactive parts wake up on their own trigger: load, idle, visible, interaction or a media query.",
  },
  {
    id: "resume",
    label: "Resumability",
    nick: "The forward-only time machine",
    quote: "",
    who: "",
    pragma: "(<procedureDone> resume </procedureDone>)",
    text: "No hydration. Like the Professor's time machine, it only goes forward: the browser never replays what the server already did, it picks up where the server stopped.",
  },
]

export const roadmap = [
  { phase: "0", name: "Prototype", text: "Parser with readable errors, client-only Slicer, signals, print(), this site." },
  { phase: "1", name: "Tooling", text: "Editor grammar, type checking through a TS projection, formatter, completion from words to G-codes." },
  { phase: "2", name: "Server", text: "Streaming SSR with (<layer>), hydration, HMR that keeps state, (<host>) queries and actions." },
  { phase: "3", name: "Meta-framework", text: "File router, SSG, ISR, deploy adapters." },
  { phase: "4", name: "Granular hydration", text: "Hot and cold analysis, heat triggers, event replay, server islands, PPR." },
  { phase: "5", name: "Experiments", text: "Resumability, devtools, lint rules." },
]

