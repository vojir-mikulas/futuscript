use futuscript_slicer::{Options, render, slice};

fn ok(src: &str) -> String {
    match slice(src, &Options { filename: "Test.fs", dev: true, server: false }) {
        Ok(js) => js,
        Err(d) => panic!("{}", render(&d, src, "Test.fs")),
    }
}

fn err(src: &str) -> String {
    match slice(src, &Options { filename: "Test.fs", dev: true, server: false }) {
        Ok(js) => panic!("čekal jsem chybu, vyšlo:\n{js}"),
        Err(d) => render(&d, src, "Test.fs"),
    }
}

#[test]
fn counter_example() {
    let src = include_str!("../../../examples/Counter.fs");
    let js = slice(src, &Options { filename: "Counter.fs", dev: true, server: false }).unwrap();
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
    let js = ok("(<extruderInitialization>)\n  M98 ontoggle: () => void\n(</extruderInitialization>)\n");
    assert!(js.contains("const ontoggle = __f.computed(() => __props.ontoggle)"), "{js}");
    let js = ok("(<extruderInitialization>)\n  M104 x: number\n(</extruderInitialization>)\n");
    assert!(js.contains("const x = __f.signal(undefined)"), "{js}");
    let src = "(<extruderInitialization>)\n  M104 a = 1\n  M117 a\n(</extruderInitialization>)\n";
    let prod = slice(src, &Options { filename: "T.fs", dev: false, server: false }).unwrap();
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
    insta::assert_snapshot!(slice(src, &Options { filename: "Todo.fs", dev: true, server: false }).unwrap());
}

#[test]
fn todo_item_example() {
    let src = include_str!("../../../examples/TodoItem.fs");
    insta::assert_snapshot!(slice(src, &Options { filename: "TodoItem.fs", dev: true, server: false }).unwrap());
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
fn each_destructuring() {
    let js = ok("(<extrusion>)\n  (<each> { id, text: label }, i of xs by id )\n    <p>{id} {label} {i}</p>\n  (</each>)\n(</extrusion>)\n");
    assert!(js.contains("const id = __f.computed(() => {"), "{js}");
    assert!(js.contains("const label = __f.computed(() => {"), "{js}");
    assert!(js.contains("label.get()"), "{js}");
    assert!(js.contains("({ id, text: label }, i) => id"), "{js}");
}

#[test]
fn effect_can_return_cleanup_and_last_import() {
    let js = ok("(<extruderInitialization>)\n  M104 a = 1\n  M106 {\n    const id = setInterval(() => a++, 10)\n    return () => clearInterval(id)\n  }\n  import X from \"./X.fs\"\n(</extruderInitialization>)\n(<extrusion>)\n  <X />\n(</extrusion>)\n");
    assert!(js.contains("__f.userEffect(() => {"), "{js}");
    assert!(js.contains("return () => clearInterval(id)"), "{js}");
    assert!(js.contains("import X from \"./X.fs\""), "{js}");
}

#[test]
fn m117_is_stripped_in_prod() {
    let src = "(<extruderInitialization>)\n  M104 a = 1\n  M117 a\n(</extruderInitialization>)\n";
    let prod = slice(src, &Options { filename: "T.fs", dev: false, server: false }).unwrap();
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

#[test]
fn error_infill_outside_component() {
    insta::assert_snapshot!(err("(<extrusion>)\n  <div>\n    (<infill> header )\n    (</infill>)\n  </div>\n(</extrusion>)\n"));
}

#[test]
fn error_context_without_value() {
    insta::assert_snapshot!(err("(<extruderInitialization>)\n  M141 Theme\n(</extruderInitialization>)\n"));
}

#[test]
fn svg_children_use_namespace() {
    let js = ok("(<extrusion>)\n  <svg viewBox=\"0 0 1 1\"><path d=\"M0 0\" /><foreignObject><div>x</div></foreignObject></svg>\n(</extrusion>)\n");
    assert!(js.contains(", \"path\")") && js.contains("__f.svg(__n1, \"path\")"), "{js}");
    assert!(js.contains("__f.svg(__n1, \"foreignObject\")"), "{js}");
    assert!(js.contains("__f.el(__n3, \"div\")"), "{js}");
}

#[test]
fn member_mutation_notifies() {
    let js = ok("(<extruderInitialization>)\n  M104 form = { a: 1, list: [] as number[] }\n  function f() { form.a = 2; form.list[0] += 1 }\n(</extruderInitialization>)\n");
    assert!(js.contains("__f.mutate(form, () => form.get().a = 2)"), "{js}");
    assert!(js.contains("__f.mutate(form, () => form.get().list[0] += 1)"), "{js}");
}

#[test]
fn error_mutate_prop() {
    insta::assert_snapshot!(err("(<extruderInitialization>)\n  M98 user: { name: string }\n  function f() { user.name = \"x\" }\n(</extruderInitialization>)\n"));
}

#[test]
fn error_write_local_derived() {
    insta::assert_snapshot!(err("(<extrusion>)\n  (<each> t of [1, 2] )\n    M105 big = t > 1\n    <button onclick={() => (big = false)}>{big}</button>\n  (</each>)\n(</extrusion>)\n"));
}

#[test]
fn server_output() {
    let src = include_str!("../../../examples/Todo.fs");
    insta::assert_snapshot!(slice(src, &Options { filename: "Todo.fs", dev: true, server: true }).unwrap());
}

#[test]
fn navigation_gcodes() {
    let js = ok("(<extruderInitialization>)\n  M104 id = 1\n  function go() {\n    G0 `/p/${id}`\n  }\n  G28 \"/login\"\n(</extruderInitialization>)\n");
    assert!(js.contains("__f.navigate(`/p/${id.get()}`)"), "{js}");
    assert!(js.contains("__f.redirect(\"/login\")"), "{js}");
}

#[test]
fn server_rewrites_firmware_import() {
    let src = "(<extruderInitialization>)\n  import { notFound } from \"@futuscript/firmware\"\n  notFound()\n(</extruderInitialization>)\n";
    let js = slice(src, &Options { filename: "T.fs", dev: true, server: true }).unwrap();
    assert!(js.contains("from \"@futuscript/firmware/server\""), "{js}");
}

#[test]
fn host_block_and_async() {
    let src = "(<host>)\n  import { query } from \"@futuscript/host\"\n  const secret = \"tajne\"\n  export const getPost = query(async (s: string) => ({ s, secret }))\n(</host>)\n(<extruderInitialization>)\n  M98 slug: string\n  M109 post = await getPost(slug)\n(</extruderInitialization>)\n(<extrusion>)\n  <h1>{post?.s}</h1>\n(</extrusion>)\n";
    let client = slice(src, &Options { filename: "P.fs", dev: true, server: false }).unwrap();
    assert!(!client.contains("tajne") && !client.contains("@futuscript/host"), "{client}");
    assert!(client.contains("const getPost = __f.rpc(\"P.fs#getPost\")"), "{client}");
    assert!(client.contains("const post = __f.resource(() => getPost(slug.get()))"), "{client}");
    let server = slice(src, &Options { filename: "P.fs", dev: true, server: true }).unwrap();
    assert!(server.contains("const secret = \"tajne\""), "{server}");
    assert!(server.contains("__f.host(\"P.fs\""), "{server}");
    assert!(server.contains("export default async function P"), "{server}");
    assert!(server.contains("const post = __f.data(__owner, await getPost(slug.get()))"), "{server}");
}

#[test]
fn error_m109_without_await() {
    insta::assert_snapshot!(err("(<extruderInitialization>)\n  M109 x = 1\n(</extruderInitialization>)\n"));
}
