use futuscript_slicer::{Options, render, slice};

fn ok(src: &str) -> String {
    match slice(src, &Options { filename: "Test.fs", dev: true }) {
        Ok(js) => js,
        Err(d) => panic!("{}", render(&d, src, "Test.fs")),
    }
}

fn err(src: &str) -> String {
    match slice(src, &Options { filename: "Test.fs", dev: true }) {
        Ok(js) => panic!("čekal jsem chybu, vyšlo:\n{js}"),
        Err(d) => render(&d, src, "Test.fs"),
    }
}

#[test]
fn counter_example() {
    let src = include_str!("../../../examples/Counter.fs");
    let js = slice(src, &Options { filename: "Counter.fs", dev: true }).unwrap();
    insta::assert_snapshot!(js);
}

#[test]
fn template_only_file() {
    insta::assert_snapshot!(ok(include_str!("../../../examples/Beer.fs")));
}

#[test]
fn shadowed_names_are_not_rewritten() {
    let js = ok("(<extruderInitialization>)
  M104 count = 0
  function set(count: number) { return count * 2 }
  const obj = { count }
(</extruderInitialization>)
");
    assert!(js.contains("return count * 2"), "{js}");
    assert!(js.contains("count: count.get()"), "{js}");
}

#[test]
fn compound_assignments_and_types() {
    let js = ok("(<extruderInitialization>)
  M104 filter: \"all\" | \"done\" = \"all\"
  M104 n = 1
  function f(x: typeof filter) { n *= 3; n++; filter = x }
(</extruderInitialization>)
");
    assert!(js.contains("const filter = __f.signal(\"all\")"), "{js}");
    assert!(js.contains("n.set(n.get() * 3)"), "{js}");
    assert!(js.contains("__f.update(n, 1, true)"), "{js}");
    assert!(js.contains("filter.set(x)"), "{js}");
}

#[test]
fn last_setup_line_without_semicolon() {
    // Oxc připojí k poslední deklaraci i `;` za hranicí setupu, úprava se nesmí ztratit.
    let js = ok("(<extruderInitialization>)\n  M98 ontoggle: () => void\n(</extruderInitialization>)\n");
    assert!(js.contains("const ontoggle = __f.computed(() => __props.ontoggle)"), "{js}");
    let js = ok("(<extruderInitialization>)\n  M104 x: number\n(</extruderInitialization>)\n");
    assert!(js.contains("const x = __f.signal(undefined)"), "{js}");
    let src = "(<extruderInitialization>)\n  M104 a = 1\n  M117 a\n(</extruderInitialization>)\n";
    let prod = slice(src, &Options { filename: "T.fs", dev: false }).unwrap();
    assert!(!prod.contains("M117") && !prod.contains("console"), "{prod}");
}

#[test]
fn postfix_update_returns_old_value() {
    let js = ok("(<extruderInitialization>)\n  M104 n = 1\n  const a = n++\n  const b = --n\n(</extruderInitialization>)\n");
    assert!(js.contains("const a = __f.update(n, 1, true)"), "{js}");
    assert!(js.contains("const b = __f.update(n, -1, false)"), "{js}");
}

#[test]
fn todo_example() {
    let src = include_str!("../../../examples/Todo.fs");
    insta::assert_snapshot!(slice(src, &Options { filename: "Todo.fs", dev: true }).unwrap());
}

#[test]
fn todo_item_example() {
    let src = include_str!("../../../examples/TodoItem.fs");
    insta::assert_snapshot!(slice(src, &Options { filename: "TodoItem.fs", dev: true }).unwrap());
}

#[test]
fn error_component_not_imported() {
    insta::assert_snapshot!(err("(<extrusion>)\n  <TodoItem />\n(</extrusion>)\n"));
}

#[test]
fn error_write_to_each_item() {
    let src = "(<extruderInitialization>)\n  M104 xs = [1]\n(</extruderInitialization>)\n(<extrusion>)\n  (<each> x of xs )\n    <button onclick={() => x = 2}>{x}</button>\n  (</each>)\n(</extrusion>)\n";
    insta::assert_snapshot!(err(src));
}

#[test]
fn error_each_destructuring() {
    insta::assert_snapshot!(err("(<extrusion>)\n  (<each> {id} of xs )\n  (</each>)\n(</extrusion>)\n"));
}

#[test]
fn m117_is_stripped_in_prod() {
    let src = "(<extruderInitialization>)\n  M104 a = 1\n  M117 a\n(</extruderInitialization>)\n";
    let prod = slice(src, &Options { filename: "T.fs", dev: false }).unwrap();
    assert!(!prod.contains("console.debug"), "{prod}");
    assert!(ok(src).contains("console.debug(a.get())"));
}

#[test]
fn error_unknown_gcode() {
    let src = "(<extruderInitialization>)\n  M14 count = 0\n(</extruderInitialization>)\n";
    assert_eq!(
        err(src),
        "Spaghetti v Test.fs:2:3\n 2 │   M14 count = 0\n   │   ^^^ neznámý G-kód. Mysleli jste M104 (state)?\n"
    );
}

#[test]
fn error_unknown_instruction() {
    let src = "(<extrusion>)\n  (<if> a )\n  (<esle>)\n  (</if>)\n(</extrusion>)\n";
    insta::assert_snapshot!(err(src));
}

#[test]
fn error_unclosed_if() {
    let src = "(<extrusion>)\n  <div>\n    (<if> a )\n      <p>x</p>\n  </div>\n(</extrusion>)\n";
    insta::assert_snapshot!(err(src));
}

#[test]
fn error_unclosed_block() {
    let src = "(<extruderInitialization>)\n  M104 a = 1\n\n(<extrusion>)\n  <p>{a}</p>\n(</extrusion>)\n";
    insta::assert_snapshot!(err(src));
}

#[test]
fn error_write_to_derived() {
    let src = "(<extruderInitialization>)\n  M104 a = 1\n  M105 b = a * 2\n  function f() { b = 3 }\n(</extruderInitialization>)\n";
    insta::assert_snapshot!(err(src));
}

#[test]
fn error_typescript_syntax_maps_to_source() {
    let src = "(<extruderInitialization>)\n  M104 a = = 1\n(</extruderInitialization>)\n";
    let out = err(src);
    assert!(out.starts_with("Spaghetti v Test.fs:2:"), "{out}");
}
