# TODO: přepis portfolio-2026 do Futuscriptu 1:1

Cíl: [vojir-mikulas/portfolio-2026](https://github.com/vojir-mikulas/portfolio-2026) (Next.js 16,
React 19, Tailwind v4, ~21,5k řádků TS/TSX, 50× `"use client"`) přepsaný do `.fs` tak, aby
vypadal a choval se stejně. Portfolio je zároveň **akceptační test frameworku**: co potřebuje,
to Futuscript musí umět.

Stav Futuscriptu dnes: jen klientský rendering (CSR), `if`/`each`, komponenty bez obsahu,
`bind:value`/`checked`, scoped CSS. Viz [architecture-v0.md](./architecture-v0.md) §5.

---

## Co portfolio používá (inventura)

| Oblast | V portfoliu | Futuscript dnes | Potřeba |
|---|---|---|---|
| Routy | `[lang]`, `[lang]/projects`, `[lang]/projects/[slug]`, `studio`, `not-found` | ✗ | file routing `src/plates/` |
| Layouty | `layout.tsx`, `[lang]/layout.tsx`, `studio/layout.tsx` | ✗ | `_raft.fs` + children |
| Middleware | `proxy.ts`: detekce jazyka, redirect, cookies (referral, preview skinu) | ✗ | `_preheat.ts` |
| SSG | 4× `generateStaticParams` | ✗ | `export` + `entries` |
| Dynamické | `studio` (`force-dynamic`), API routy | ✗ | SSR + route handlery |
| Metadata | 4× `generateMetadata`, `sitemap.ts`, `robots.ts` | ✗ | `(<head>)` + speciální routy |
| OG obrázky | 6× `ImageResponse` (`next/og`) | ✗ | obrázkové routy (satori + resvg) |
| API | `api/now-playing` (Spotify), `api/studio/{images,projects}` | ✗ | `(<host>)` / route handlery |
| Server data | GitHub GraphQL, Spotify, `cookies()`, `headers()`, `server-only` | ✗ | `(<host>)`, `query`, request kontext |
| Navigace | `next/link` 11×, `usePathname` 6×, `useSearchParams` 4×, `useRouter` 4×, `notFound` 11×, `redirect` 2× | ✗ | router API |
| Obrázky/fonty | `next/image` 11×, `next/font` (Geist) | ✗ | `<Img>` komponenta, `@font-face` |
| Hooky | `useState` 73, `useRef` 56, `useEffect` 56, `useCallback` 32, `useMemo` 11 | M104/M105/M106 ✓, ref ✗ | `bind:this` |
| Kontext | 6× `createContext` | ✗ | `M141` |
| Store | 6× `useSyncExternalStore` | signály v `.ts` ✓ | nic (jen přepsat) |
| Portály | 2× `createPortal` | ✗ | `(<portal>)` |
| Suspense | 9× | ✗ | `(<layer>)` |
| Animace | framer-motion: `motion.*` ~80×, `AnimatePresence` 15, `useReducedMotion` 25, `useScroll`/`useTransform`/`useSpring`, `whileInView`, `whileHover` | ✗ | `@futuscript/motion` + `use:` akce + přechody |
| UI primitiva | Radix Dialog, Dropdown, Popover, Tooltip | ✗ | vlastní na `<dialog>`, Popover API, anchor positioning |
| Ikony | lucide-react 22×, react-icons 3× | ✗ (žádné SVG) | SVG v šabloně + statické ikony |
| Styly | Tailwind v4, CVA, tailwind-merge, `win98.css` | scoped CSS ✓ | Tailwind skenuje `.fs`, `class` merge |
| WebGL | AsciiField (vlastní shader), Decor (three.js, GLB), AsciiObject | ✗ ref | `bind:this` + lifecycle (pak už jen TS) |
| Ostatní | `@vercel/analytics`, zod, negotiator, intl-localematcher | – | knihovny bez Reactu, použít přímo |

---

## A. Kompilátor a runtime (bez nich nejde přepsat ani statická stránka)

- [x] **Infill / children**: `<Section>…</Section>` → `{infill}`, pojmenované `(<infill> header )`.
      Blokuje všechny layout komponenty (`Section`, `Container`, `Flex`, `Win98Window`…).
- [x] **Makra** `(<macro> row(item) )` pro render props.
- [x] **`bind:this`** (ref na element) + ref na komponentu. 56× `useRef`: canvas, WebGL, měření, focus.
- [x] **SVG**: `createElementNS` pro `<svg>` a potomky (ikony, Win98 grafika, DrawRule).
- [x] **Spread a rest props**: `{...rest}` na elementu i komponentě, `M98 ...rest`. Potřebují ho
      všechna primitiva (`Button`, `Input`, `Heading`…).
- [x] **`class` merge**: `class` ze spreadu se slučuje s vlastní třídou elementu (clsx).
      Pro řešení konfliktů Tailwind tříd zůstává `cn()` (tailwind-merge) v uživatelském kódu.
- [x] **`style` jako objekt** a CSS proměnné (`style={{ "--x": v }}`).
- [x] **Kontext**: `context()` v `.ts`, `M141 Ctx = v` poskytne, `Ctx.use()` čte. 6× v portfoliu.
- [x] **`(<window>)` a `(<document>)`** pro eventy (scroll, keydown, resize, visibilitychange).
- [x] **`(<portal> target )`**: tooltip, dialog, DuckHunt overlay.
- [x] **`(<match>)`** (skiny, stavy přehrávače).
- [x] **Destrukturování v `(<each>)`** a index. Lokální `M105` v šabloně taky.
- [x] **`bind:` na výraz** (`bind:value={form.email}`) a `bind:group` pro radio/checkbox.
- [x] **Akce `use:`**: `use:magnetic`, `use:spotlight`, `use:reveal={opts}` = funkce
      `(el, params) => cleanup`. Nahradí většinu framer-motion a hooků jako `useSpotlight`.
      Hotovo jako atribut `use:jméno={params}`, viz syntax-v0.md §4.6.
- [x] **Napi-rs binding** místo spouštění procesu na každý soubor (300+ `.fs` souborů v dev režimu).
- [ ] **Source mapy** (chyby v prohlížeči mají ukazovat do `.fs`).
- [ ] **HMR se zachováním stavu** (při ladění animací se bez něj nedá pracovat).

## B. Server a meta-framework (fáze 2–3)

- [x] **SSR**: serverový codegen ve Sliceru (HTML jako string) + `futuscript/host` renderer.
- [x] **Hydratace**: Firmware se napojí na existující DOM místo vytváření nového.
- [x] **Vite 8 plugin**: dev middleware, `?ssr` kompilace, `futu slice` (client + ssr bundle + předrender) a `futu serve`.
- [x] **File routing** `src/plates/`: `[lang]/index.fs`, `[lang]/projects/index.fs`,
      `[lang]/projects/[slug].fs`, `studio/index.fs`.
- [x] **Layouty** `_raft.fs` (vnořené, nepřekreslují se při navigaci).
- [ ] **404**: `_spaghetti.fs` hotové (status 404). *Zbývá `notFound()` z kódu.*
- [x] **Middleware** `_preheat.ts`: přístup k requestu (headers, cookies, searchParams),
      `redirect()`, nastavení cookie na response. Port `proxy.ts` 1:1.
- [x] **SSG**: `(<procedureDone> export </procedureDone>)` + `entries` pro `[lang]` a `[slug]`.
- [ ] **Dynamické routy**: `studio` bez prerenderu (`(<procedureDone> dynamic </procedureDone>)`? domyslet název).
- [x] **`(<head>)`**: title, meta, OG tagy, canonical, hreflang alternates (náhrada `generateMetadata`).
- [ ] **Speciální routy**: `sitemap.xml`, `robots.txt` (`.ts` soubory vracející Response).
- [ ] **Route handlery** `api/*` (GET/POST v `.ts`, Request → Response).
- [ ] **`(<host>)` + `query`/`action`**: GitHub contributions, Spotify now playing, studio zápis.
- [ ] **Request kontext na serveru**: `cookies()`, `headers()` pro skin a referral.
- [ ] **`M109` + `(<layer>)`**: streaming SSR a Suspense fallbacky (9×).
- [ ] **Router v klientu**: `<a>` s prefetchem, `pathname`/`searchParams` jako signály, `G0` navigace,
      View Transitions mezi stránkami.
- [ ] **Env proměnné**: `NEXT_PUBLIC_*` → `import.meta.env.PUBLIC_*`, tajemství jen v `(<host>)`.
- [ ] **Deploy**: Vercel (Nitro preset nebo vlastní adapter), cache hlavičky pro statické stránky.

## C. Náhrady za React knihovny

- [ ] **`@futuscript/motion`**: `reveal`, `splitText`, `magnetic`, `hoverLift`, `spotlight`
      jako `use:` akce. Přechody `in:`/`out:` pro `(<if>)`/`(<each>)` (náhrada `AnimatePresence`).
      Scroll vazby (`useScroll` + `useTransform` + `useSpring`) jako signály.
      `prefersReducedMotion` jako globální signál (25× `useReducedMotion`).
- [ ] **Primitiva**: Dialog (`<dialog>`), Dropdown, Popover, Tooltip (Popover API + CSS anchor
      positioning, fallback v JS). Klávesnice a fokus jako Radix.
- [ ] **Ikony**: SVG komponenty z `lucide` (vanilla) a `simple-icons` místo react-icons.
- [ ] **Formuláře**: studio používá `@tanstack/react-form`, nahradit `bind:` + zod (`action` s validací).
- [ ] **`<Img>`**: `width`/`height`, `loading="lazy"`, `srcset` generovaný při buildu (sharp).
      Náhrada `next/image`.
- [ ] **Fonty**: Geist / Geist Mono z `assets/fonts` přes `@font-face` + preload v `(<head>)`.
- [ ] **OG obrázky**: satori + resvg (to dělá `next/og` pod kapotou), port `src/lib/og/*`.
- [ ] **Analytics**: `@vercel/analytics` přes `inject()` (vanilla API).
- [ ] **Tailwind v4**: ověřit, že najde třídy v `.fs` souborech (jinak `@source "**/*.fs"`).
      CVA a tailwind-merge fungují bez Reactu, nechat.

## D. Samotný přepis (pořadí)

Každý krok končí tím, že stránka vypadá stejně jako v Next verzi (viz E).

1. [ ] Design systém: `components/typography`, `layout`, `form`, `primitives` (~20 komponent). Potřebuje A.
2. [ ] Statické sekce: Hero (bez ASCII), About, Skills, Timeline, Socials, ZedBanner, Footer.
3. [ ] i18n: `dictionaries/{en,cs}.json`, `lib/i18n.ts`, `[lang]` routy. Potřebuje B.
4. [ ] Projekty: seznam, detail `[slug]`, `projectVisuals`, `projectDate`.
5. [ ] Shell: TopBar (OS-style), ScrollToTop, PreviewBanner, ReferralCard, SeasonalNotification.
6. [ ] Data ze serveru: GitHub graf (+ mimic režim), Spotify now playing (+ ticking pozice).
7. [ ] Animace: Reveal, SplitText, Magnetic, HoverLift, spotlight napříč stránkou.
8. [ ] WebGL: AsciiField (shader), Decor (three.js + GLB, SideRails, capability check), AsciiObject.
       Většinou čistý TS, jen napojit přes `bind:this` a lifecycle.
9. [ ] Win98 skin: `themes/win98/*` (~1,7k řádků), SkinTransition, seasonal views, preview cookie.
10. [ ] Easter eggy: DuckHunt, LuckyButton.
11. [ ] OG obrázky, sitemap, robots, 404.
12. [ ] Studio (jen dev): editor projektů, upload a optimalizace obrázků, zápis do JSON.

## E. Jak poznat, že je to 1:1

- [ ] Obě verze vedle sebe (Next na `:3000`, Futuscript na `:5173`) se stejnými env proměnnými.
- [ ] **Vizuální regrese**: Playwright screenshoty všech rout × `en`/`cs` × mobil/desktop ×
      skiny, porovnání pixelů s tolerancí.
- [ ] **HTML/SEO diff**: `<head>` (meta, OG, hreflang), sitemap, robots, status kódy, redirecty z middleware.
- [ ] **Chování**: e2e scénáře (přepnutí jazyka, navigace mezi projekty, dialogy, klávesnice, reduced motion).
- [ ] **Výkon**: Lighthouse a velikost JS. Cíl je být menší než Next verze, protože studené
      komponenty (cold) neposílají žádný JS.

---

## Otevřené otázky

1. **Syntaxe akcí `use:`** a přechodů (`in:`/`out:`/`animate:`): jak to sedí do předlohy? Kandidát: G-kód.
2. **`class` od rodiče**: automaticky mergovat (Vue), nebo explicitně přes `M98 class`?
3. **Ref na komponentu**: co komponenta vystaví (`M98`-like `expose`)?
4. **Interop s Reactem jako přechodná berlička?** Architektura počítá s importem `.tsx`. Šlo by
   portovat postupně (React ostrovy uvnitř `.fs`), ale je to práce navíc. Doporučuju ne a
   přepsat napřímo.
5. **Studio**: port 1:1, nebo nechat jako samostatný dev nástroj mimo web?
