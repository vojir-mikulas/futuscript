# Futuscript — návrh syntaxe v0

> „Tiskneme stránky." Komponenta je **model**, kompilátor je **Slicer**, runtime je **Firmware**,
> DOM je **build plate** a výsledné JS je **G-code**.

Status: **draft k diskusi**. Nic z toho zatím není implementované.

---

## 0. Principy

1. **Vtip je ve struktuře, API zůstává nudné.** Bloky, direktivy a konvence jsou „tiskárnové".
   Runtime API pro `.ts` soubory a serverové API používají standardní jména (`signal`, `computed`,
   `query`, `action`…), aby se dala googlit a aby jim rozuměl každý, kdo zná React/Svelte.
2. **Závorky = instrukce pro Slicer.** Všechno, co je obalené `( … )`, zmizí při kompilaci,
   stejně jako komentáře v G-code. Holé `<div>` je materiál, který opravdu skončí na stránce.
3. **Řádkovost jako G-code.** Instrukce `(<…>)` a G-kódy (`M104`, `G0`…) musí stát na začátku
   řádku. Díky tomu je parser triviální, formatter má jasno a nevznikají kolize s textem.
4. **Projekce do TypeScriptu je skoro 1:1.** Každá direktiva se přepíše na validní TS jen výměnou
   prefixu (`M104 x = 0` → `let x = 0`). Source mapy a type-checking přes Volar jsou pak levné.
5. **Jeden koncept hranice.** `(<layer>)` je zároveň Suspense, error boundary, streaming chunk,
   island i server island. React na to potřebuje 4–5 různých mechanismů.
6. **Věrné předloze, ale příjemné na psaní.** Tvary ze scény zůstávají: závorkové tagy včetně
   uzavíracích, G-kódy i celé `extruderInitialization`. Kde se vtip pere s pohodlím, řeší to
   editor (doplňování, nápovědy, snippety, formatter, viz §10), ne změna syntaxe. Zjednodušuje
   se jen tam, kde syntaxe přidává šum bez vtipu (duplicitní typy props, `()` u infillu).

---

## 1. Anatomie souboru `.fs`

```futu
(<host>)
  // serverový modul: data, server functions, tajemství. Do klienta se nikdy nedostane.
(</host>)

(<extruderInitialization>)
  // setup komponenty: TypeScript + G-kódy (stav, derived, efekty, props)
(</extruderInitialization>)

(<extrusion>)
  <!-- šablona: co se vytiskne na build plate -->
(</extrusion>)

(<filament>)
  /* scoped CSS */
(</filament>)
```

Každý top-level blok je volitelný a smí být v souboru nejvýš jednou. Na pořadí nezáleží.
Soubor bez jediného bloku je celý šablona, takže malá komponenta může být jen HTML:

```futu
<!-- Beer.fs -->
<p class="hint">Hotovo. Jdi si pro pivo.</p>
```

| Blok | Obsah | Kde běží | Ekvivalent |
|---|---|---|---|
| `(<host>)` | TS modul | jen server | `+page.server.ts`, `"use server"`, Svelte remote functions |
| `(<extruderInitialization>)` | TS + G-kódy | server i klient, jednou na instanci | `<script setup>`, `<script>` ve Svelte, tělo Solid komponenty |
| `(<extrusion>)` | HTML-like šablona | server (SSR) i klient | `<template>`, JSX |
| `(<filament>)` | CSS (scoped by default) | build time | `<style scoped>` |

---

## 2. Instrukce v závorkách — gramatika

Z obrázku vylezly tři tvary a všechny drží jedno pravidlo: **závorka = jedna instrukce,
jméno je v `< >`, argumenty jdou za `>`**.

| Tvar | Příklad z obrázku | Význam |
|---|---|---|
| `(<name> args )` | `(<layer> 0.78 )`, `(<extrusion>)` | **otevírá** blok |
| `(</name>)` | `(</extruderInitialization>)` | **zavírá** blok |
| `(<name> args </name>)` | `(<procedureDone> export </procedureDone>)` | **samostatná** instrukce bez těla |

```ebnf
Instruction  = "(" "<" Name ">" Args? ( "</" Name ">" )? ")" ;   (* opener nebo samostatná *)
Closer       = "(" "</" Name ">" ")" ;
Args         = Expression | Attributes | Pattern ;               (* záleží na konkrétní instrukci *)
```

**Separátory** (`else`, `elseif`, `empty`, `pending`, `catch`, `case`, `default`) se jen otevírají
a ukončují předchozí segment rodičovského bloku. Přesně jako vrstvy v G-code: vrstva trvá do další vrstvy.

**Mezery jsou volné:** `(<if>user)`, `(<if> user)` i `(<if> user )` znamenají totéž. Formatter je
sjednotí na tvar z obrázku `(<if> user )`, takže se dá psát ledabyle a číst věrně.

**Disambiguace:**
- Instrukce musí být první non-whitespace token na řádku. `<p>(<b>tučně</b>)</p>` je normální text.
- Jméno musí patřit do rezervované množiny (`if`, `each`, `layer`, …). Neznámé jméno = text + chyba lintu.
- Escape: `\(<if>` vypíše doslova.
- V setupu jsou stejně jako v `.tsx` zakázané angle-bracket type assertions (`(<T>x)`), takže
  nemůžou kolidovat s instrukcemi. Použij `x as T`.

---

## 3. G-kódy — reaktivita a direktivy

Řádek začínající `G<číslo>` nebo `M<číslo>` je direktiva. Kódy nejsou náhodné, odpovídají
skutečnému významu v 3D tisku:

> **Teplota = reaktivita.** Horká hodnota je reaktivní, studená je statická.
> `M10x` je v G-code rodina „teplota/extruder". U nás je to rodina „reaktivita".

G-kódový řádek je TypeScript až do konce řádku. Komentář za ním se píše `//`, a to i v šabloně
(`<!--` by kolidovalo s operátorem `<`). Psát kódy zpaměti netřeba: editor je doplní ze slov
(`state` → `M104`) a u každého ukáže, co znamená (viz §10).

### 3.1 Deklarační kódy (jen top-level setupu nebo v bloku šablony)

| Kód | Skutečný G-code | Futuscript | TS projekce |
|---|---|---|---|
| `M98 name: T = v` | volání podprogramu s parametry | **prop** (jedna na řádek) | pole v `Props` + destrukturování z `props()` |
| `M104 x = v` | nastav teplotu trysky | **state** (signál) | `let x = v` |
| `M105 x = expr` | přečti teplotu | **derived** (computed, lazy) | `const x = expr` |
| `M109 x = await expr` | nastav teplotu **a počkej** | **async derived**, komponenta suspenduje | `const x = await expr` |
| `M106 { … }` | zapni větrák | **effect** (smí vrátit cleanup) | `effect(() => { … })` |
| `M107 { … }` | vypni větrák | **on destroy** | `onDestroy(() => { … })` |
| `M141 Ctx = v` | teplota komory (enclosure) | **provide context** pro celý podstrom | `Ctx.provide(v)` |
| `:M104 …` | `:` = číslo programu (Fanuc) | **module-level**: sdílené mezi všemi instancemi | top-level `let` mimo komponentu |

Props se píšou po jedné, typ se neopakuje. Slicer řádky sloučí do jednoho typu `Props`,
takže volající dostane normální type-checking i autocomplete:

```futu
(<extruderInitialization>)
  M98 todo: Todo                  // povinná
  M98 title: string = "Úkoly"     // volitelná s defaultem
  M98 header?: Macro              // volitelná bez defaultu
  M98 ...rest                     // zbytek atributů
(</extruderInitialization>)
```

TS projekce: `const { todo, title = "Úkoly", header, ...rest }: Props = props()`.

### 3.2 Příkazové kódy (kdekoli, kde smí být statement, i v handlerech)

| Kód | Skutečný G-code | Futuscript | TS projekce |
|---|---|---|---|
| `G0 path` | rychlý přejezd bez extruze | **client navigace** | `navigate(path)` |
| `G28 path?` | home všech os | **redirect** (funguje i na serveru) | `redirect(path ?? "/")` |
| `M117 expr` | zpráva na displej tiskárny | **dev-only log**, v produkci se vystřihne | `console.debug(expr)` |
| `M600 { … }` | výměna filamentu | update stavu uvnitř **View Transition** | `document.startViewTransition(() => { … })` |

Čtení a zápis stavu jsou obyčejné proměnné. Slicer je přepíše na signály (jako Svelte 5 runes):

```futu
(<extruderInitialization>)
  M104 count = 0
  M105 double = count * 2
  M106 {
    M117 `count je ${count}`
  }

  function inc() { count += 1 }     // žádné setCount, žádné .value
(</extruderInitialization>)
```

**Mimo `.fs`** (sdílený stav v `.ts`) G-kódy nejsou validní TS, takže tam platí obyčejné API,
kompatibilní s TC39 Signals:

```ts
// cart.ts
import { signal, computed, effect } from "futuscript"

export const items = signal<Item[]>([])
export const total = computed(() => items.get().reduce((s, i) => s + i.price, 0))
```

---

## 4. Šablona `(<extrusion>)`

HTML s `{výraz}` interpolací. Komponenty začínají velkým písmenem (jako v JSX).

```futu
(<extrusion>)
  <h1 class={["title", big && "title--big"]}>Ahoj {user.name}</h1>
  <input bind:value={query} placeholder="Hledej…" />
  <button onclick={inc} disabled={count >= 10}>+1</button>
  <Avatar {user} size="lg" />
(</extrusion>)
```

- Atributy: `name={expr}`, zkratka `{user}` = `user={user}`, spread `{...rest}`
- Eventy: `onclick={fn}` (lowercase, stejně jako DOM a Svelte 5)
- Two-way binding: `bind:value`, `bind:checked`, `bind:this` (případně `ref={el}`)
- `class` bere string, pole i objekt (clsx sémantika)

### 4.1 Podmínky

```futu
(<if> user )
  <p>Vítej, {user.name}</p>
(<elseif> loading )
  <Spinner />
(<else>)
  <LoginButton />
(</if>)
```

### 4.2 Smyčky

```futu
(<each> todo, i of todos by todo.id )
  M105 overdue = todo.due < now          // lokální derived, jako {@const} ve Svelte
  <TodoItem {todo} index={i} {overdue} />
(<empty>)
  <p>Hotovo. Jdi si pro pivo.</p>
(</each>)
```

`by` je klíč pro keyed diffing. Bez `by` se položky párují podle indexu.

### 4.3 Match

```futu
(<match> status )
(<case> "loading" )
  <Spinner />
(<case> "error" )
  <ErrorBox />
(<default>)
  <Content />
(</match>)
```

### 4.4 Makra a infill (snippety a children)

Infill je vnitřek výtisku, tedy **children**. Makro je znovupoužitelný kus šablony
(jako G-code makra v Klipperu, nebo snippety ve Svelte 5).

```futu
<!-- Card.fs -->
(<extruderInitialization>)
  M98 header?: Macro
  M98 infill: Macro
(</extruderInitialization>)

(<extrusion>)
  <article>
    (<if> header )
      <header>{header}</header>
    (</if>)
    {infill}
  </article>
(</extrusion>)
```

Makro bez parametrů se vykreslí prostě jako `{infill}`. Makro s parametry se volá jako funkce
(`{row(t)}`).

```futu
<!-- použití -->
<Card>
  (<infill> header )
    <h2>Nadpis</h2>
  (</infill>)
  Tohle je default infill.
</Card>

<!-- lokální makro s parametry -->
(<macro> row(item: Todo) )
  <li>{item.text}</li>
(</macro>)

<ul>
  (<each> t of todos by t.id )
    {row(t)}
  (</each>)
</ul>
```

### 4.5 Speciální instrukce

```futu
(<head>)
  <title>{post.title} · Futuscript</title>
  <meta name="description" content={post.excerpt} />
(</head>)

(<window> onkeydown={handleKey} onresize={measure} </window>)
(<document> onvisibilitychange={pause} </document>)
```

---

## 5. `(<layer>)` — jedna hranice pro všechno asynchronní a rendering

3D tiskárna tiskne **po vrstvách** a streaming SSR posílá HTML taky po vrstvách. Vrstva je
samostatně tisknutelný kus stránky:

```futu
(<layer>)
  <Comments postId={post.id} />        <!-- uvnitř je M109 → suspenduje -->
(<pending>)
  <p>Tisknu komentáře…</p>             <!-- fallback (Suspense) -->
(<catch> err )
  <p>Spaghetti: {err.message}</p>     <!-- error boundary -->
(</layer>)
```

Atributy vrstvy:

| Atribut | Význam | Odpovídá |
|---|---|---|
| *(nic)* | streaming + suspense boundary | React `<Suspense>`, out-of-order streaming |
| `heat="load"` | hydratuj hned (default pro „horké" části) | běžná hydratace |
| `heat="idle"` / `"visible"` / `"interaction"` / `"media(...)"` | **lazy hydratace** podle triggeru | Astro `client:*`, Angular `@defer` / incremental hydration |
| `heat="never"` | nikdy nehydratuj, nula JS | static island |
| `host` | **server island**: renderuje se jen na serveru, dotahuje/streamuje se zvlášť | Astro server islands, PPR dynamic holes |
| `0.78` (číslo) | **priorita** hydratace a streamingu (výška vrstvy, viz obrázek) | selective hydration priority |

```futu
(<layer> host )
  <CartBadge />                         <!-- personalizované, zbytek stránky je statický a cachovaný -->
(<pending>)
  <CartBadgeSkeleton />
(</layer>)

(<layer> heat="visible" 0.2 )
  <HeavyChart data={stats} />
(</layer>)
```

### 5.1 Horké a studené komponenty (automatické „server components")

Slicer při kompilaci klasifikuje každou komponentu:

- **Studená** = nemá `M104`/`M106`/handlery/`bind:` a všechny její děti jsou studené.
  Renderuje se jen na serveru a **neposílá žádné JS**, jako React Server Component, jenže bez `"use client"`.
- **Horká** = má interaktivitu, takže se pošle do klienta a hydratuje („nahřeje").

Hranice mezi studeným rodičem a horkým dítětem je automaticky island. Props přes ni musí být
serializovatelné; Slicer to hlídá při type-checku. Ruční override: `(<procedureDone> hot </procedureDone>)`
nebo `cold`.

---

## 6. `(<host>)` — server functions a data

```futu
(<host>)
  import { db } from "$lib/db"
  import { query, action } from "futuscript/host"

  export const getPost = query(async (slug: string) => db.post.find({ slug }))

  export const addComment = action(async (form: FormData) => {
    await db.comment.create({ text: String(form.get("text")) })
    getPost.refresh()
  })
(</host>)

(<extruderInitialization>)
  M98  slug: string
  M109 post = await getPost(slug)       // SSR: přímé volání; v klientu: RPC; re-run při změně slug
(</extruderInitialization>)

(<extrusion>)
  <article>{post.title}</article>
  <form action={addComment}>            <!-- funguje i bez JS (progressive enhancement) -->
    <textarea name="text" />
    <button>Odeslat</button>
  </form>
(</extrusion>)
```

- `query` = čtení: dedupe, cache, invalidace přes `.refresh()`
- `action` = mutace: použitelná ve `<form action>` i volaná z kódu, s POST + CSRF ochranou
- Všechno z `(<host>)` je v klientském bundlu nahrazené RPC stubem, takže se tajemství nedostanou ven.

---

## 7. `(<procedureDone>)` — co se stane, když je tisk hotový

Pragmy pro Slicer. Staticky se vytáhnou při kompilaci; v ukázkách stojí na konci setupu,
přesně jako na obrázku. Hlavní použití je **rendering mód stránky**:

| Pragma | Mód |
|---|---|
| *(nic)* | **streaming SSR** (default pro routy) |
| `(<procedureDone> export </procedureDone>)` | **SSG**: prerender při buildu (pocta `next export`) |
| `(<procedureDone> export every 60s </procedureDone>)` | **ISR**: statické + revalidace |
| `(<procedureDone> export shell </procedureDone>)` | **PPR**: statický shell, `(<layer> host )` díry se streamují |
| `(<procedureDone> spa </procedureDone>)` | **CSR only** |
| `(<procedureDone> resume </procedureDone>)` | **resumability** (experimentální, Qwik-style) |
| `(<procedureDone> hot </procedureDone>)` / `cold` | ruční override klasifikace komponenty |
| `(<procedureDone> thankMakerBotForReplicator </procedureDone>)` | easter egg: v dev módu vypíše do konzole ASCII Bendera s kytarou a přidá `<meta name="generator">` |

---

## 8. Kompletní příklad

```futu
(<host>)
  import { db } from "$lib/db"
  import { query, action } from "futuscript/host"

  export const getTodos = query(async () => db.todo.findMany())
  export const addTodo = action(async (form: FormData) => {
    await db.todo.create({ text: String(form.get("text")) })
    getTodos.refresh()
  })
(</host>)

(<extruderInitialization>)
  import TodoItem from "./TodoItem.fs"
  import Stats from "./Stats.fs"

  M98  title: string = "Úkoly"
  M109 todos = await getTodos()
  M104 filter: "all" | "open" | "done" = "all"
  M105 visible = todos.filter(t => filter === "all" || (filter === "done") === t.done)
  M106 { document.title = `${title} (${visible.length})` }

  function pick(f: typeof filter) {
    M600 { filter = f }                // přepnutí filtru animované přes View Transition
  }

  (<procedureDone> export every 60s </procedureDone>)
  (<procedureDone> thankMakerBotForReplicator </procedureDone>)
(</extruderInitialization>)

(<extrusion>)
  (<head>)
    <title>{title}</title>
  (</head>)

  <h1>{title}</h1>

  <form action={addTodo}>
    <input name="text" required />
    <button>Přidat</button>
  </form>

  <nav>
    (<each> f of ["all", "open", "done"] as const )
      <button class={{ active: filter === f }} onclick={() => pick(f)}>{f}</button>
    (</each>)
  </nav>

  (<each> todo of visible by todo.id )
    <TodoItem {todo} />
  (<empty>)
    <p>Hotovo. Jdi si pro pivo.</p>
  (</each>)

  (<layer> heat="visible" )
    <Stats {todos} />
  (<pending>)
    <p>Tisknu statistiky…</p>
  (</layer>)
(</extrusion>)

(<filament>)
  h1 { font-family: "Futura", sans-serif; }
  .active { text-decoration: underline; }
(</filament>)
```

---

## 9. Rosettská deska

| Koncept | React 19 | Svelte 5 | Vue 3 | **Futuscript** |
|---|---|---|---|---|
| state | `useState(0)` | `let x = $state(0)` | `ref(0)` | `M104 x = 0` |
| derived | `useMemo` | `$derived(…)` | `computed` | `M105 x = …` |
| async data | `use(promise)` | `await` (async Svelte) | `await` + `<Suspense>` | `M109 x = await …` |
| effect | `useEffect` | `$effect` | `watchEffect` | `M106 { … }` |
| unmount | cleanup z `useEffect` | `onDestroy` | `onUnmounted` | `M107 { … }` |
| props | `function C(props)` | `$props()` | `defineProps` | `M98 name: T` |
| context | `<Ctx value>` | `setContext` | `provide` | `M141 Ctx = v` |
| children | `children` | `{@render children()}` | `<slot>` | `{infill}` |
| podmínka | `{a ? <X/> : <Y/>}` | `{#if}` | `v-if` | `(<if> a )` |
| smyčka | `.map()` | `{#each}` | `v-for` | `(<each> x of xs by x.id )` |
| Suspense | `<Suspense>` | `<svelte:boundary>` | `<Suspense>` | `(<layer>)…(<pending>)` |
| error boundary | class component | `<svelte:boundary>` | `onErrorCaptured` | `(<catch> e )` |
| server fn | `"use server"` | remote functions | — (Nuxt server routes) | `(<host>)` + `query`/`action` |
| mount | `createRoot(el).render(<App/>)` | `mount(App, {target})` | `createApp(App).mount(el)` | `print(App, el)` |
| hydrate | `hydrateRoot` | `hydrate` | SSR `createSSRApp` | `heat(App, el)` |

---

## 10. Pohodlí při psaní (editor a tooling)

Syntaxe zůstává věrná předloze a příjemné psaní zajišťuje editor. Proto je tohle součást
fáze 1, ne nice-to-have.

**Píšeš slova, čteš kódy.** Autocomplete reaguje na slova a vloží G-kód:

| Napíšeš | Dostaneš | | Napíšeš | Dostaneš |
|---|---|---|---|---|
| `prop` | `M98` | | `context`, `provide` | `M141` |
| `state` | `M104` | | `navigate` | `G0` |
| `derived`, `computed` | `M105` | | `redirect` | `G28` |
| `await`, `async` | `M109` | | `log` | `M117` |
| `effect` | `M106` | | `transition` | `M600` |
| `destroy`, `cleanup` | `M107` | | | |

U každého kódu je šedá inlay nápověda (`M104 ‹state› count = 0`) a hover s vysvětlením,
TS projekcí a odkazem do docs. Slovní aliasy přímo v syntaxi nejsou: jeden zápis = cizí kód
vypadá všude stejně.

**Snippety a auto-close.**
- Napsáním otevíracího tagu `(<if> … )` se hned doplní `(</if>)` a kurzor skočí dovnitř.
- `(<if`, `(<each`, `(<layer`, `(<match` + Tab vloží celý blok včetně separátorů
  (`(<each` rovnou s `by`, `(<layer` s `(<pending>)`).
- Prázdný `.fs` soubor + snippet `model` vloží všechny čtyři bloky se zavíracími tagy,
  takže `extruderInitialization` nikdo nepíše ručně.

**Formatter** (`futu fmt` + Prettier plugin):
- sjednotí mezery na tvar z obrázku `(<if> user )`,
- obsah bloků odsadí o 2 mezery,
- G-kódy pod sebou zarovná do sloupce:

```futu
  M98  title: string = "Úkoly"
  M104 filter = "all"
  M109 todos = await getTodos()
```

**Chybové hlášky** ve stylu Elmu/Rustu: místo, výřez kódu a návrh opravy. Vtip je jen v titulku:

```
Spaghetti v TodoList.fs:3:3
  3 │   M14 count = 0
    │   ^^^ neznámý G-kód. Mysleli jste M104 (state)?
```

Stejně tak: `(<esle>)` → „Mysleli jste `(<else>)`?", chybějící `(</each>)` → ukáže, kde
blok začal, `(<each>)` bez `by` u seznamu komponent → lint warning s návrhem klíče.

**HMR se zachováním stavu:** změna šablony nebo `(<filament>)` nepřenačte stránku a `M104`
hodnoty přežijí (fáze 2, spolu s Vite pluginem).

---

## 11. Slovník a konvence projektu

| Futuscript | Význam |
|---|---|
| **model** (`.fs`) | komponenta |
| **Slicer** (`@futuscript/slicer`) | kompilátor `.fs` → JS pro klienta, server a virtuální TS |
| **Firmware** (`@futuscript/firmware`) | klientský runtime (signály, DOM, hydratace) |
| **Host** (`futuscript/host`) | serverový runtime (streaming, RPC, cache) |
| **build plate** | DOM element, do kterého se tiskne |
| `print` / `heat` | mount / hydrate |
| hot / cold | interaktivní / server-only komponenta |
| `src/plates/` | file-based routy (`index.fs`, `blog/[slug].fs`) |
| `_raft.fs` | layout (raft = podložka pod výtiskem) |
| `_spaghetti.fs` | error / 404 stránka (nepovedený tisk vypadá jako špagety) |
| `_preheat.ts` | middleware (předehřev před tiskem) |
| `futu dev` / `futu slice` / `futu serve` / `futu fmt` | dev server / build / produkční server / formatter |

---

## 12. Rozhodnuté otázky

1. **Kolik G-codu je moc?** G-kódy jsou jediný zápis. Srozumitelnost řeší editor
   (doplňování ze slov, inlay nápovědy, hover, viz §10), ne slovní aliasy v syntaxi.
2. **Řádkovost instrukcí.** Ano: instrukce a G-kódy jen na začátku řádku. Inline podmínka
   uprostřed textu se píše výrazem (`{a ? "x" : ""}`).
3. **`extruderInitialization` je dlouhé.** Zůstává celé i s uzavíracím tagem, protože je ze scény.
   Píše se přes snippet a uzavírací tag doplní editor.
4. **Přípona.** `.fs`. Známá kolize: `.fs` je i F# (VS Code ho má vestavěný, GitHub Linguist
   ho tak počítá) a občas GLSL fragment shader. Mitigace: VS Code extension si příponu přebere
   (případně `files.associations`), v repu `.gitattributes` s `linguist-language`. V markdownu
   zůstává code fence ` ```futu `, protože ` ```fs ` by se zvýraznil jako F#.
5. **`{infill()}` vs `{infill}`.** `{infill}`. Makro bez parametrů se vykreslí bez závorek,
   makro s parametry se volá (`{row(t)}`).
6. **Props.** Jedna na řádek (`M98 title: string = "Úkoly"`), typ se neopakuje.
7. **Uzavírací tagy top-level bloků.** Zůstávají, jsou intuitivnější a věrné předloze.
