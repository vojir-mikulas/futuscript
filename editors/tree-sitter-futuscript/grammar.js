/**
 * Tree-sitter gramatika pro Futuscript (`.fs`).
 *
 * Slouží pro zvýrazňování v editorech (Zed, Neovim, Helix). Párování tagů neověřuje,
 * to dělá Slicer. Kód v setupu a výrazy v šabloně se do TypeScriptu vkládají přes
 * injections, tady se jen vymezí jejich rozsah.
 */

/// <reference types="tree-sitter-cli/dsl" />

// Řádek, který nezačíná `(<` (to je instrukce nebo zavírací tag bloku).
const LINE = /([^(\s]|\([^<\n])[^\n]*\n?/

const BLOCKS = {
  host: 'host',
  setup: 'extruderInitialization',
  template: 'extrusion',
  style: 'filament',
}

// `(<extrusion>)` a `(</extrusion>)` jako jeden uzel block_start / block_end.
const blockRules = Object.fromEntries(
  Object.entries(BLOCKS).flatMap(([key, name]) => [
    [`_${key}_start`, ($) => seq('(<', alias(name, $.block_name), '>', ')')],
    [`_${key}_end`, ($) => seq('(</', alias(name, $.block_name), '>', ')')],
  ]),
)
const blockStart = ($, key) => alias($[`_${key}_start`], $.block_start)
const blockEnd = ($, key) => alias($[`_${key}_end`], $.block_end)

module.exports = grammar({
  name: 'futuscript',

  extras: ($) => [/\s/],

  externals: ($) => [$.instruction_args],

  rules: {
    source_file: ($) =>
      repeat(choice($.host_block, $.setup_block, $.template_block, $.style_block, $._template_node)),

    host_block: ($) => seq(blockStart($, 'host'), repeat($._code_line), blockEnd($, 'host')),
    setup_block: ($) => seq(blockStart($, 'setup'), repeat($._code_line), blockEnd($, 'setup')),
    template_block: ($) => seq(blockStart($, 'template'), repeat($._template_node), blockEnd($, 'template')),
    style_block: ($) => seq(blockStart($, 'style'), repeat($.css_line), blockEnd($, 'style')),
    ...blockRules,

    // --- setup: TypeScript po řádcích, G-kódy na začátku řádku ---
    _code_line: ($) => choice($.gcode_line, $.code, $.instruction),
    gcode_line: ($) => prec.right(seq($.gcode, optional($.code))),
    gcode: ($) => token(prec(2, /:?[GM]\d+/)),
    code: ($) => token(LINE),
    css_line: ($) => token(LINE),

    // --- instrukce: (<if> user ), (</if>), (<procedureDone> export </procedureDone>) ---
    instruction: ($) =>
      choice(
        seq(
          '(<',
          $.instruction_name,
          '>',
          optional($.instruction_args),
          choice(')', seq('</', $.instruction_name, '>', ')')),
        ),
        seq('(</', $.instruction_name, '>', ')'),
      ),
    instruction_name: ($) => /[a-zA-Z][a-zA-Z0-9]*/,

    // --- šablona ---
    _template_node: ($) =>
      choice($.start_tag, $.end_tag, $.comment, $.expression, $.instruction, $.gcode_line, $.text),

    start_tag: ($) => seq('<', $.tag_name, repeat(choice($.attribute, $.expression)), choice('>', '/>')),
    end_tag: ($) => seq('</', $.tag_name, '>'),
    tag_name: ($) => /[a-zA-Z][a-zA-Z0-9\-:.]*/,

    attribute: ($) =>
      seq(
        $.attribute_name,
        optional(seq('=', choice($.quoted_attribute_value, $.expression, $.attribute_value))),
      ),
    attribute_name: ($) => /[^\s=>\/{}"'<]+/,
    attribute_value: ($) => /[^\s"'=<>`{}]+/,
    quoted_attribute_value: ($) =>
      choice(
        seq('"', optional(alias(token.immediate(/[^"]+/), $.attribute_value)), '"'),
        seq("'", optional(alias(token.immediate(/[^']+/), $.attribute_value)), "'"),
      ),

    // `{výraz}`, vnořené závorky se párují (objektové literály, šablonové řetězce s ${}).
    expression: ($) => seq('{', optional(alias($._balanced, $.expression_content)), '}'),
    _balanced: ($) => repeat1(choice(/[^{}]+/, seq('{', optional($._balanced), '}'))),

    comment: ($) => token(seq('<!--', repeat(choice(/[^-]/, /-[^-]/)), '-->')),

    text: ($) => token(prec(-1, /(\([^<]|[^\s<{(])[^<{\n]*|\(/)),
  },
})
