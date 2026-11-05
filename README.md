# Futuscript

Framework, ve kterém se stránky tisknou. Návrh: [`docs/syntax-v0.md`](docs/syntax-v0.md),
[`docs/architecture-v0.md`](docs/architecture-v0.md).

## Spuštění

Potřeba: Node 24+, pnpm, Rust (stable).

```sh
pnpm install
pnpm dev                 # přeloží Slicer a pustí playground na http://localhost:5173
pnpm test                # Rust testy kompilátoru + vitest (runtime + end-to-end)
```

Kompilátor jde pustit i samostatně:

```sh
cargo run -q -- examples/Counter.fs           # vypíše vygenerovaný JS
cargo run -q -- examples/Counter.fs --prod    # bez M117 logů
```

## Zed (zvýrazňování syntaxe)

```sh
editors/zed/sync-grammar.sh   # vygeneruje parser a připraví ho pro Zed
```

Pak v Zedu `cmd-shift-p` → **zed: install dev extension** → vyber složku `editors/zed`.
Po změně `editors/tree-sitter-futuscript/grammar.js` znovu spusť skript a v Zedu dej
**Rebuild** u rozšíření Futuscript (panel Extensions).

## Struktura

| Kde | Co |
|---|---|
| `crates/slicer` | kompilátor `.fs` → JS (Rust, Oxc) |
| `packages/firmware` | klientský runtime: signály, DOM helpery, `print` |
| `packages/vite` | Vite plugin pro `.fs` |
| `playground` | Vite appka, která tiskne `examples/` |
| `examples` | cílové komponenty fáze 0 |
| `editors/tree-sitter-futuscript` | Tree-sitter gramatika (`npm test` = testy gramatiky) |
| `editors/zed` | Zed rozšíření: zvýrazňování, vložený TS/CSS, outline |
