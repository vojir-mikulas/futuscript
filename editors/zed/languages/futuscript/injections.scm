; Setup a (<host>): všechny řádky kódu jako jeden TypeScript dokument.
; G-kódy (M104 …) do něj nepatří, takže TS vidí `count = 0`, což je platný výraz.
((code) @injection.content
  (#set! injection.language "ts")
  (#set! injection.combined))

; (<filament>) jako jeden CSS dokument.
((css_line) @injection.content
  (#set! injection.language "css")
  (#set! injection.combined))

; {výraz} v šabloně a argumenty instrukcí: každý zvlášť.
((expression_content) @injection.content
  (#set! injection.language "ts"))

((instruction_args) @injection.content
  (#set! injection.language "ts"))
