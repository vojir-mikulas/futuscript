# Příklady pro fázi 0

Cíl fáze 0 (viz `docs/architecture-v0.md` §5): tyhle soubory projdou Slicerem a fungují
v prohlížeči jen s klientským runtimem (bez serveru).

| Soubor | Co ověřuje |
|---|---|
| `Counter.fs` | `M98` props s defaultem, `M104`, `M105`, `M106` + `M117`, `onclick`, `(<if>)`/`(<else>)`, `(<filament>)` |
| `Todo.fs` | import `.fs` komponent, typované `M104`, `bind:value`, `onsubmit`, `class` jako objekt, `(<each>)` s `by` i bez, `(<empty>)` |
| `TodoItem.fs` | povinné props, callback prop, `class` jako pole |
| `Beer.fs` | soubor bez bloků = celý šablona |
