# Futuscript — architektura renderingu v0

Status: **draft**. Navazuje na [syntax-v0.md](./syntax-v0.md) a [research](./research/2026-11-js-frameworks.md).

Cíl: podporovat všechny moderní rendering přístupy, ale přes **jeden mechanismus**. Mód nemá
být samostatná feature: všechny módy jsou kombinace tří os:

| Osa | Hodnoty | Kde se volí |
|---|---|---|
| **Kdy se HTML tiskne** | build (SSG) · request (SSR) · klient (CSR) · build + request (PPR) · cache + revalidace (ISR) | `(<procedureDone> … </procedureDone>)` na routě |
| **Jak se HTML doručí** | celé najednou · streamované po vrstvách · dotažené zvlášť (server island) | `(<layer>)` a `(<layer> host )` |
| **Kdy a jestli se nahřeje (JS)** | nikdy (cold) · hned · podle triggeru · resume bez hydratace | automaticky (hot/cold) + `heat="…"` |

---

## 1. Přehled balíčků

```
.fs ──► Slicer (@futuscript/slicer) ──┬──► client modul    → Firmware (prohlížeč)
                                        ├──► server modul    → Host (Node/Bun/Deno/edge)
                                        ├──► host RPC stubs  (náhrada (<host>) v klientu)
                                        └──► virtual TS      → Volar → IDE / futu check
```

| Balíček | Role |
|---|---|
| `@futuscript/slicer` | parser (paren-tags + G-kódy + HTML; TS části přes Oxc), analýza, codegen |
| `@futuscript/firmware` | klientský runtime: signály, DOM helpery, `print`/`heat`, heat-loader, router |
| `futuscript/host` | serverový runtime: streaming renderer, `query`/`action`, cache, RPC endpoint |
| `@futuscript/vite` | Vite 8 plugin (Environment API: `client`, `ssr`, volitelně `edge`) |
| `@futuscript/language-server` | Volar language plugin + VS Code extension + TextMate gramatika + snippety |
| `futu` CLI | `dev` / `slice` / `serve` / `check` / `fmt` |

---

## 2. Reaktivní jádro (Firmware)

- **Push-pull signály** (algoritmus ve stylu alien-signals): `signal`, `computed`, `effect`, `batch`, `untrack`.
- **Async-aware:** `computed`, který vrátí Promise, je „pending". Čtení pending hodnoty
  suspenduje nejbližší `(<layer>)`. Tím vzniká `M109`. Podobně funguje Solid 2.0.
- **Ownership tree:** každá komponenta a vrstva je owner, takže cleanup, kontext (`M141`) a error
  propagace (`(<catch>)`) jdou po stromu ownerů.
- **TC39 tvar API:** `signal(0).get()/.set()`, aby šla výměna za nativní `Signal.State`.

## 3. Slicer: co se z jedné komponenty vygeneruje

```futu
(<extruderInitialization>)
  M104 count = 0
(</extruderInitialization>)
(<extrusion>)
  <button onclick={() => count++}>Klik {count}</button>
(</extrusion>)
```

**Klient** (přímé DOM operace, template cloning, žádný VDOM):
```js
const tpl = template(`<button>Klik <!></button>`)
export default function Counter(props) {
  const count = signal(0)
  const root = tpl(), text = root.lastChild
  delegate(root, "click", () => count.set(count.get() + 1))
  effect(() => setText(text, count.get()))
  return root
}
```

**Server** (async generator, string chunky):
```js
export default async function* Counter(props, ctx) {
  const count = 0                         // signály na serveru = obyčejné hodnoty
  yield `<button data-f="c1">Klik <!--t-->${esc(count)}<!--/t--></button>`
}
```

**Analýza, kterou Slicer dělá:**
1. **Hot/cold klasifikace** (viz syntax §5.1). Cold strom → do klienta nejde nic.
2. **Hranice ostrovů:** každý přechod cold → hot je ostrov. Props přes hranici se serializují
   (seroval) a Slicer hlásí chybu, pokud nejsou serializovatelné.
3. **Async analýza:** komponenty s `M109` se označí jako suspendující a server je obalí do
   streamovací vrstvy.
4. **`(<host>)` extrakce:** exporty dostanou stabilní ID (hash souboru + jméno). V klientském
   buildu se nahradí `rpc("id")`, v serverovém se zaregistrují do RPC routeru.

---

## 4. Rendering módy: jak přesně fungují

### 4.1 CSR / SPA: `print(App, el)` nebo `(<procedureDone> spa </procedureDone>)`
Klientský modul se mountne do prázdného elementu. Host vrátí jen shell `index.html`.

### 4.2 Streaming SSR (default)
1. Host spustí serverový generátor a **hned** flushne `<head>` a vše do první suspendující vrstvy.
2. Na místo suspendující vrstvy vypíše `(<pending>)` fallback obalený `<!--L:3-->…<!--/L:3-->`.
3. Ostatní vrstvy běží **paralelně**. Hotová vrstva se pošle jako
   `<template id="L:3">…</template><script>$fL(3)</script>` (out-of-order swap, ~300 B inline runtime).
4. `(<catch>)` se renderuje stejně, jen místo obsahu jde chyba.
5. Numerická priorita vrstvy (`(<layer> 0.78 )`) určuje pořadí flushe při souběhu.

### 4.3 SSG: `(<procedureDone> export </procedureDone>)`
`futu slice` projde routy s `export`. Dynamické segmenty (`[slug].fs`) dodají parametry přes
`export const entries = query(…)` v `(<host>)`. Výstup jsou statická `.html` + JS jen pro hot části.

### 4.4 ISR: `export every 60s`
Přeloží se na Nitro route rule `{ swr: 60 }`, takže stale-while-revalidate funguje na úrovni
hostu a CDN. Manuální invalidace: `revalidate("/blog/x")` v `action`.

### 4.5 PPR: `export shell`
- Při buildu se vyrenderuje vše **kromě** `(<layer> host )`. Ty se uloží jako díry s fallbackem.
- Při requestu host pošle cachovaný shell okamžitě a ve **stejné response** dostreamuje díry
  (mechanismus 4.2). Bez streamingu (statický hosting) se díry dotáhnou jako server islands (4.7).

### 4.6 Islands a lazy hydratace: hot/cold + `heat="…"`
- Každý ostrov v HTML: `<futu-part data-c="chunk-id" data-p="…serializované props…" data-heat="visible">`.
- **heat-loader** (~1–2 KB, inline) obslouží triggery `load` · `idle` (requestIdleCallback) ·
  `visible` (IntersectionObserver) · `interaction` (pointerdown/focusin/keydown) · `media(...)`.
- **Event replay:** u `interaction` loader zachytí první event, nahřeje ostrov a event přehraje.
- Hydratace = walk existujícího DOM podle `<!--t-->` markerů a napojení efektů. Nic se nerenderuje znovu.

### 4.7 Server islands: `(<layer> host )`
- Ve statickém nebo cachovaném HTML je fallback + `<futu-island data-src="/_futu/i/<id>?p=<šifrované props>">`.
- Po načtení stránky ho loader fetchne a host vrátí HTML fragment (+ případné hot ostrovy uvnitř).
- Odpověď ostrova se dá cachovat zvlášť (`Cache-Control` per ostrov).

### 4.8 „Server components" (cold komponenty)
Na rozdíl od RSC tu není Flight protokol ani `"use client"`. Cold komponenty se renderují jen
na serveru do HTML a v klientském grafu vůbec nejsou. Při **client navigaci** host vrátí
HTML vrstvy cílové routy a Firmware je morphne do DOM (hypermedia styl, inspirace HTMX/Datastar).
Hot ostrovy uvnitř se nahřejí standardně.

### 4.9 Server functions: `(<host>)` + `query` / `action`
- `query`: GET (cachovatelné, dedupe v rámci requestu, při SSR serializované do HTML, aby klient nefetchoval znovu).
- `action`: POST, funguje jako `<form action>` i bez JS (303 redirect + rerender), s JS jako fetch.
  CSRF ochrana přes kontrolu `Origin`.
- Single-flight mutace: odpověď `action` rovnou nese čerstvá data invalidovaných `query`.

### 4.10 SPA navigace + View Transitions
- Router s prefetchem (`hover`/`visible`), nested `_raft.fs` layouty se nerenderují znovu.
- `G0 "/x"` = navigace. Přechody se automaticky obalí `document.startViewTransition`, pokud to
  prohlížeč umí. `M600 { … }` = ruční view transition pro změnu stavu.

### 4.11 Resumability (experimentální): `(<procedureDone> resume </procedureDone>)`
Místo hydratace ostrova se serializuje i stav signálů a handlery se lazy-loadují per event
(Qwik-style). Dává smysl až po stabilizaci 4.6, protože sdílí loader, event delegation i serializaci.

---

## 5. Roadmapa (doporučené pořadí)

| Fáze | Obsah | Proč v tomhle pořadí |
|---|---|---|
| **0: Prototyp** | parser `.fs` s čitelnými chybami (výřez kódu + návrh opravy), Slicer jen pro klienta, signály, `print`, counter + todo | ověřit, že syntaxe jde parsovat a „sedí v ruce" |
| **1: Tooling minimum** | TextMate gramatika, Volar plugin (virtual TS), `futu check`, formatter (`futu fmt` + Prettier plugin), doplňování G-kódů ze slov + inlay nápovědy + hovery, snippety a auto-close (syntax §10) | bez toho se s vlastním formátem nedá pracovat a předloha by v praxi otravovala |
| **2: Server** | SSR + streaming vrstvy, hydratace, Vite 8 plugin s HMR se zachováním stavu, `(<host>)` query/action | jádro, na kterém stojí všechno další |
| **3: Meta-framework** | router (`src/plates`, `_raft`, `_spaghetti`), SSG, Nitro deploy, ISR | použitelné pro reálné weby |
| **4: Granulární hydratace** | hot/cold analýza, `heat` triggery, event replay, server islands, PPR | hlavní diferenciátor |
| **5: Experimenty** | resumability, devtools, ESLint plugin, tree-sitter | nice-to-have |

## 6. Rizika a mitigace

| Riziko | Mitigace |
|---|---|
| Tooling vlastního formátu (TS 7 v Go zatím neumí JS plugin API, na kterém stojí Volar) | držet projekci do TS triviální; sledovat Volar + tsgo; fallback na `svelte2tsx`-style generování `.ts` souborů pro `tsc` |
| Žádný ekosystém komponent | interop: import `.tsx`/JSX komponent přes stejný Firmware; export hot komponent jako Web Components |
| Rozsah („všechny módy") | módy jsou kombinace tří os, takže stačí 3 mechanismy (vrstvy, ostrovy, cache), ne 12 features |
| G-kódy jsou pro nováčky kryptické | „píšeš slova, čteš kódy“: doplňování ze slov, inlay nápovědy, hovery s odkazem na docs (syntax §10); slovní aliasy v syntaxi záměrně ne |
