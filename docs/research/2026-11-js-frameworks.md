# Research: bleeding-edge JS frameworky (stav 11/2026) jako inspirace pro Futuscript

> **Metodika a důvěryhodnost.** Zrychlená verze: většina obsahu vychází z mé znalosti
> (cutoff 06/2026) a jedním kolem webového hledání (5. 11. 2026) jsem ověřil jen fakta, která
> se mezitím nejspíš změnila. Ověřená tvrzení mají odkaz na zdroj. Tvrzení označená
> `(neověřeno)` je potřeba před rozhodnutím ještě zkontrolovat v primárním zdroji.

## TL;DR

- **Konsenzus 2025–26: signály + kompilátor, žádný VDOM.** Svelte 5, Vue Vapor, Solid, Marko 6
  i Ripple kompilují šablonu do přímých DOM operací řízených fine-grained signály. Výjimkou je
  React, který místo toho přidal React Compiler (auto-memoizace).
- **Async-first reaktivita je nový standard.** Solid 2.0 umí async v computations nativně
  ([InfoQ](https://www.infoq.com/news/2026/05/solidjs-2-async/)), Svelte má `await` přímo
  v komponentách a React má `use()`. To odpovídá našemu `M109`.
- **Server functions vytlačují API routes.** Patří sem React Server Actions, SvelteKit remote
  functions (`query`/`command`/`form`), TanStack Start `createServerFn` a Solid `"use server"`.
- **Rendering se řeší per-route i per-boundary.** Next.js má Cache Components/PPR, Astro
  server islands a Angular incremental hydration (`@defer (hydrate on …)`). Už to není volba
  na úrovni celé aplikace.
- **Vite 8 + Rolldown je de facto platforma.** Vite 8 vyšel stabilní 12. 3. 2026 s Rolldown jako
  jediným bundlerem; Environment API je v RC ([vite.dev](https://vite.dev/blog/announcing-vite8)).
  Skoro všechny frameworky kromě Next stavějí na Vite.
- **TC39 Signals jsou pořád ve Stage 1** ([tc39/proposal-signals](https://www.github.com/tc39/proposal-signals)).
  Je to dobrý cíl pro interop API, ale ne pro závislost.
- **Odklon od Reactu je reálný.** Remix 3 opouští React a přechází na vlastní komponentový model
  postavený na forku Preactu ([InfoQ](https://www.infoq.com/news/2025/08/remix-run-v3-drops-react)).
- **Vlastní formát souboru = hlavní náklad.** Bez Volar/LSP, TextMate gramatiky a Prettier pluginu
  je nový formát v praxi nepoužitelný. Ripple podle všeho přešel z `.ripple` na `.tsrx`
  ([Ripple-TS/ripple](https://github.com/Ripple-TS/ripple)), tedy blíž k TS.

---

## A. Frameworky

| Framework | Stav (11/2026) | Reaktivita | Compile vs runtime | Šablona / formát | Hydratace | Server/client hranice | Co si vzít |
|---|---|---|---|---|---|---|---|
| **React 19.x + Compiler** | 19.2 (10/2025); Compiler 1.0 stable (10/2025) (neověřeno: novější minor) | re-render + auto-memo kompilátorem | runtime VDOM + compiler optimalizace | JSX v `.tsx` | full / selective hydration, `<Activity>` | `"use client"` / `"use server"` direktivy, RSC Flight protokol | **RSC model** (server-only komponenty = 0 KB JS), server actions ve `<form action>`, `prerender`/`resume` API pro PPR |
| **Next.js 16** | 16.x (neověřeno: minor) | React | React + Turbopack | file routing `app/` | React | RSC, `"use cache"`, Cache Components = PPR | **PPR**: statický shell + dynamické díry v jedné odpovědi; cache jako direktiva |
| **Solid 2.0** | beta 05/2026 → RC série, stable nepotvrzen ([InfoQ](https://www.infoq.com/news/2026/05/solidjs-2-async/), [npm rc](https://socket.dev/npm/package/solid-js/overview/2.0.0-rc.19)) | signály, **async v computations**, deterministický batching, effect rozdělen na compute/apply fázi | kompilátor JSX → DOM, malý runtime | JSX v `.tsx` | hydrace, SolidStart streaming | `"use server"` funkce (SolidStart) | async-aware reaktivní graf; JSX bez VDOM; seroval pro serializaci |
| **Svelte 5 + SvelteKit** | Svelte 5 (10/2024); async Svelte a remote functions jako experimental (neověřeno: zda už stable) | runes `$state/$derived/$effect` | silný kompilátor | `.svelte` SFC, `{#if}` bloky, snippety | full hydrace | `+page.server.ts`, **remote functions** `query/command/form/prerender` | **runes jako vzor pro naše G-kódy** (proměnné, ne `.value`); remote functions API; `<svelte:boundary>` |
| **Vue 3.6 / Nuxt** | 3.6 v RC (rc.12–13 v 10/2026), Vapor „feature-complete", stable 3.6 nepotvrzen ([vuejs/core](https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1)) | refs/reactive, nové jádro na **alien-signals** | **Vapor mode**: kompilace bez VDOM, opt-in per komponenta | `.vue` SFC | Nuxt: full, lazy hydration strategies | Nuxt server routes, `useFetch` | Vapor dokazuje, že jde přechod VDOM → direct DOM; **alien-signals** jako nejrychlejší push-pull algoritmus |
| **Qwik 2** | v2 (`@qwik.dev/*`) (neověřeno: stable) | signály + store | **optimizer** rozřeže kód na lazy chunky (`$`) | JSX | **resumability**: žádná hydrace, stav serializovaný v HTML | `server$` | serializace stavu a listenerů do HTML; ~1 KB qwikloader s event delegation |
| **Angular 20/21** | v21 (11/2025): zoneless default, Signal Forms experimental (neověřeno: v22) | signals, `linkedSignal`, `resource` | AOT kompilátor | `.html` šablony, `@if/@for/@defer` | **incremental hydration** `@defer (hydrate on viewport)` + event replay | — | **`@defer` triggery** (`on idle/viewport/interaction/hover/timer`), event replay |
| **Astro 5/6** | 5.x; 6 (neověřeno); Astro se v 01/2026 připojil ke Cloudflare (neověřeno) | žádná vlastní, islands v libovolném frameworku | kompilátor `.astro` | `.astro`: frontmatter `---` + JSX-like šablona | **islands** `client:load/idle/visible/media/only` | **server islands** `server:defer` | islands + server islands, content collections; frontmatter pattern podobný našemu `(<host>)` |
| **Marko 6** | Tags API (neověřeno: stable verze) | fine-grained, kompilátor | **automatická partial hydration**: kompilátor sám pozná, co je interaktivní | `.marko` template-first jazyk: `<let/count=0>`, `<const/>`, `<if>` | jen JS pro interaktivní části | — | **nejbližší vzor pro naše hot/cold**; jazyk, kde je všechno v šabloně; streaming od začátku |
| **Ripple** | early dev, SPA only, „not for production" ([ripplejs.com](https://www.ripplejs.com/docs)) | `track()`, lazy destructuring | kompilátor | TS superset JSX; `.ripple` → nově `.tsrx` ([GitHub](https://github.com/Ripple-TS/ripple)) | zatím žádná (SSR plánované) | — | statementy přímo v šabloně (`if`/`for` jako TS); ukázka nákladů vlastního formátu |
| **TanStack Start** | v1 (neověřeno: přesný stav) | React/Solid | Vite + Nitro-like server | TSX + type-safe router | SSR, streaming, SPA mode, **selective SSR** per route | `createServerFn` | typově bezpečný router; per-route volba `ssr: true/false/'data-only'` |
| **Remix 3** | RC 31. 8. 2026, stable plánovaný na 2. 10. 2026 (nepotvrzeno) ([Weaverse](https://weaverse.io/blogs/remix-3-beta-hydrogen-react-router-7-2026)) | vlastní model na forku Preactu | runtime | — | — | čisté Fetch API `Request/Response`, bez adaptérů | **web-standards first**: server je `fetch` handler, žádné adaptéry |
| **Preact Signals** | stable | signály s auto-bindingem do JSX | runtime | JSX | — | — | signál přímo v JSX textu = update bez re-renderu |
| **Lit** | 3.x | reactive properties | runtime, `lit-html` tagged templates | Web Components | SSR přes `@lit-labs/ssr` + Declarative Shadow DOM | — | výstup jako custom elements = interop s čímkoli |
| **HTMX / Datastar** | htmx 2/4 (neověřeno), Datastar 1.0 (neověřeno) | Datastar: signály v `data-*` atributech | žádný build | HTML atributy | není, server posílá HTML/SSE | server je zdroj pravdy | hypermedia: server streamuje fragmenty HTML; inspirace pro `(<layer> host )` |

---

## B. Průřezová témata

### B1. TC39 Signals

- Stage 1, championi Daniel Ehrenberg, Yehuda Katz, Rob Eisenberg
  ([repo](https://www.github.com/tc39/proposal-signals)). Na webu existuje tvrzení o Stage 4, je ale nedůvěryhodné.
- API: `Signal.State`, `Signal.Computed`, `Signal.subtle.Watcher` (effect si dělá framework sám).
- **Dopad pro Futuscript:** náš veřejný `signal()/computed()` by měl tvarem odpovídat
  `Signal.State/Computed` (`.get()/.set()`), aby šla budoucí výměna za nativní implementaci.
  Interně ale použít vlastní, rychlejší algoritmus (alien-signals styl).

### B2. Matice rendering módů

| Mód | Definice | Mechanismus | React/Next | Svelte(Kit) | Vue/Nuxt | Solid(Start) | Qwik | Angular | Astro | Marko |
|---|---|---|---|---|---|---|---|---|---|---|
| CSR / SPA | render jen v prohlížeči | `mount()` do prázdného elementu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ (islands) | ✅ |
| SSR | HTML na serveru per request | render do stringu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Streaming SSR (out-of-order) | shell hned, pomalé části dotečou | placeholder `<template id>` + později `<div hidden>` + inline `<script>` swap | ✅ | ✅ (async) | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ (in-order) | ✅ (pionýr) |
| SSG | HTML při buildu | crawl rout + prerender | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ISR / revalidace | statické + periodická regenerace | cache + stale-while-revalidate | ✅ | ⚠️ (adaptér) | ✅ (route rules) | ⚠️ (Nitro) | ⚠️ | ❌ | ⚠️ | ❌ |
| PPR | statický shell + dynamické díry v **jedné** odpovědi | prerender shell při buildu, `resume` při requestu | ✅ (Cache Components) | ❌ | ❌ | ❌ | ❌ | ❌ | ≈ server islands | ❌ |
| Islands | statická stránka, JS jen v ostrovech | custom element s props + lazy import | ❌ | ❌ | ⚠️ (`<NuxtIsland>`) | ⚠️ | n/a | ❌ | ✅ | ✅ (auto) |
| Server islands | dynamická část se dotáhne zvlášť, shell je cachovaný | placeholder + fetch na interní endpoint | ≈ PPR | ❌ | ⚠️ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Lazy / incremental hydration | hydratace až při triggeru | IntersectionObserver / idle / event + **event replay** | ⚠️ (selective) | ❌ | ✅ (3.5 strategies) | ❌ | n/a | ✅ | ✅ | ✅ |
| Resumability | žádná hydrace, pokračuje se tam, kde server skončil | serializace stavu + listenerů do HTML, globální event delegation, lazy chunky | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ⚠️ (podobné) |
| RSC | komponenty, které běží jen na serveru, 0 KB JS | serializovaný strom (Flight) + reference na klientské moduly | ✅ | ❌ | ❌ | ⚠️ (exp.) | ❌ | ❌ | ≈ `.astro` | ≈ auto |
| Server functions/actions | RPC volání serveru z komponenty, formuláře bez JS | build transform: export → stub s ID + endpoint | ✅ | ✅ (remote fn) | ⚠️ | ✅ | ✅ (`server$`) | ❌ | ✅ (Actions) | ⚠️ |
| SPA navigace + View Transitions | client router, animace přechodu | `document.startViewTransition`, cross-doc `@view-transition` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |

✅ nativně · ⚠️ částečně / přes rozšíření · ❌ ne · ≈ podobný koncept. Matice je z mé znalosti (neověřeno per buňka).

**Klíčové mechanismy podrobněji:**
- **Out-of-order streaming:** server flushne shell, kde je místo pomalé části fallback
  s ID. Až se data vyřeší, pošle do stejné response `<div hidden id="S:1">obsah</div>` a malý
  inline `<script>`, který obsah přesune na místo fallbacku. Nepotřebuje to framework runtime.
- **Qwik resumability:** stav komponent a reference na handlery (`on:click="chunk.js#s_abc"`)
  se zapíšou do HTML. Globální qwikloader poslouchá všechny eventy na `document` a lazy-loadne
  jen konkrétní handler.
- **Event replay (Angular, React):** eventy zachycené před hydratací se uloží a po hydrataci
  ostrova se přehrají. To je nutné pro `heat="interaction"`.
- **Server islands (Astro):** v HTML je placeholder a skript po načtení zavolá interní endpoint
  se zašifrovanými props. Shell je díky tomu plně cachovatelný na CDN.

### B3. Tooling pro vlastní formát souboru (kritické)

Minimální sada, aby byl nový SFC formát použitelný:

| Vrstva | Jak to dělají ostatní | Pro Futuscript |
|---|---|---|
| **Type-checking + IDE** | **Volar.js**: formát se přeloží na „virtual code" (TS) se source mapami a TS language service běží nad ním. Používá ho Vue (`vue-tsc`), Astro i MDX. Svelte má vlastní `svelte2tsx` + `svelte-check`. | Volar „language plugin": `.fs` → virtual TS. Náš návrh je k tomu stavěný (G-kód → `let/const`) |
| **CLI type-check** | `vue-tsc`, `svelte-check`, `astro check` | `futu check` nad Volarem |
| **Zvýraznění syntaxe** | TextMate gramatika (VS Code, GitHub, Shiki); tree-sitter pro Neovim/Zed/Helix | TextMate gramatika v první fázi, tree-sitter později |
| **Formatter** | `prettier-plugin-svelte`, `prettier-plugin-astro` | Prettier plugin. Řádková gramatika ho výrazně zjednodušuje |
| **Linter** | `eslint-plugin-svelte`, `eslint-plugin-vue`; Oxlint zatím custom formáty omezeně (neověřeno) | ESLint processor pro bloky (`host`, `extruderInitialization`) |
| **Bundler** | Vite plugin (`@sveltejs/vite-plugin-svelte`, `@vitejs/plugin-vue`) | `@futuscript/vite` |
| **Source mapy** | magic-string při transformaci | magic-string od začátku |

**Riziko:** TypeScript 7 (nativní port v Go, „tsgo") zatím nepodporuje JS plugin API TS language
service, na kterém Volar stojí (neověřeno: aktuální stav). Volar komunita na tom pracuje.
Pro nový formát je to hlavní tooling risk příštích let.

### B4. Build tooling

- **Vite 8** (stable 12. 3. 2026), Rolldown jako jediný bundler, většina pluginů funguje beze změn
  ([vite.dev](https://vite.dev/blog/announcing-vite8)).
- **Environment API**: RC. Umožňuje mít v jednom dev serveru prostředí `client`, `ssr` a `edge`
  (workerd) s vlastním module graphem. Na tom by měl stát náš SSR i `(<host>)`.
- **Oxc** (parser, transformer, minifier, oxlint): rychlý Rust toolchain pod Rolldownem. Jeho parser
  se dá použít pro TS části `.fs`.
- **Nitro** (v3 s Vite pluginem (neověřeno: stav)): serverový runtime + deploy presety
  (Node, Bun, Deno, Cloudflare, Vercel, Netlify, static), route rules pro ISR/cache.
  Používá ho Nuxt, SolidStart a TanStack Start (neověřeno pro Start).
- **Alternativa à la Remix 3:** server = čistý `fetch(Request) → Response` handler, takže
  adaptéry skoro nejsou potřeba. Dobře se kombinuje s Nitro.

### B5. Trendy a konsenzus

1. Signály + kompilátor + přímé DOM operace (bez VDOM).
2. Async je součástí reaktivního grafu, ne bokem (Suspense jako vlastnost grafu).
3. Server functions místo ručních API rout; formuláře s progressive enhancement.
4. Hydratace je granulární a řízená triggery, nebo úplně odstraněná (islands, resumability).
5. Cache a rendering mód se deklarují u kódu (direktivy, route config), ne globálně.
6. Meta-frameworky se oddělují od UI knihoven (TanStack Start, Nitro, Vite Environment API).
7. Web standards first (Fetch API, View Transitions, Declarative Shadow DOM).

---

## C. Doporučení pro Futuscript (syntéza, ne zdrojované fakty)

1. **Reaktivita:** vlastní push-pull signály (alien-signals algoritmus), **async-aware** jako
   v Solid 2.0. Veřejné API tvarově kompatibilní s TC39 (`.get()/.set()`).
2. **Kompilace:** Svelte/Vapor/Marko styl. `.fs` → (a) klientský modul s přímými DOM
   operacemi a template cloningem, (b) serverový streaming emitter, (c) virtuální TS pro Volar.
3. **Jádro rendering módů (MVP):** CSR, streaming SSR, SSG, server functions, automatické hot/cold
   (Marko-style partial hydration). **Rozšíření:** lazy hydration triggery, server islands,
   ISR, PPR. **Experimentální:** resumability.
4. **Postavit na:** Vite 8 + Environment API, Nitro pro deploy, Oxc parser pro TS, seroval
   pro serializaci, Volar pro IDE.
5. **Největší rizika:** (a) tooling vlastního formátu, zvlášť přechod TS na Go;
   (b) ekosystém komponent: řešit interopem (import `.tsx`/JSX komponent, výstup jako
   Web Components); (c) rozsah: „všechny rendering módy" je práce na roky, takže prioritizovat.

## Zdroje

- InfoQ: SolidJS 2.0 async: https://www.infoq.com/news/2026/05/solidjs-2-async/
- solid-js 2.0.0-rc.19 (npm/socket): https://socket.dev/npm/package/solid-js/overview/2.0.0-rc.19
- Vue core v3.6.0-rc.1: https://github.com/vuejs/core/releases/tag/v3.6.0-rc.1
- Vite 8 announcement: https://vite.dev/blog/announcing-vite8
- Vite 8 beta: https://vite.dev/blog/announcing-vite8-beta
- TC39 proposal-signals: https://www.github.com/tc39/proposal-signals
- InfoQ: Remix v3 drops React: https://www.infoq.com/news/2025/08/remix-run-v3-drops-react
- Weaverse: Remix 3 beta / RC: https://weaverse.io/blogs/remix-3-beta-hydrogen-react-router-7-2026
- Ripple docs: https://www.ripplejs.com/docs
- Ripple repo: https://github.com/Ripple-TS/ripple
