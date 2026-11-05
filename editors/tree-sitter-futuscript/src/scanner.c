#include "tree_sitter/parser.h"

#include <stdbool.h>

enum TokenType { INSTRUCTION_ARGS };

void *tree_sitter_futuscript_external_scanner_create(void) { return NULL; }
void tree_sitter_futuscript_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_futuscript_external_scanner_serialize(void *payload, char *buffer) {
  (void)payload;
  (void)buffer;
  return 0;
}
void tree_sitter_futuscript_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  (void)payload;
  (void)buffer;
  (void)length;
}

static bool is_space(int32_t c) { return c == ' ' || c == '\t'; }

// Argumenty končí před POSLEDNÍ `)` na řádku nebo před `</`: konec si značíme mark_end a čteme dál.
bool tree_sitter_futuscript_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  (void)payload;
  if (!valid_symbols[INSTRUCTION_ARGS]) return false;
  while (is_space(lexer->lookahead)) lexer->advance(lexer, true);

  bool content = false;
  bool marked = false;
  bool content_at_mark = false;

  while (lexer->lookahead != '\n' && lexer->lookahead != '\r' && !lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == ')') {
      lexer->mark_end(lexer);
      marked = true;
      content_at_mark = content;
      lexer->advance(lexer, false);
      content = true;
      continue;
    }
    if (c == '<') {
      lexer->mark_end(lexer);
      bool before = content;
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/') {
        lexer->result_symbol = INSTRUCTION_ARGS;
        return before;
      }
      marked = true;
      content_at_mark = before;
      content = true;
      continue;
    }
    if (!is_space(c)) content = true;
    lexer->advance(lexer, false);
  }

  if (!marked || !content_at_mark) return false;
  lexer->result_symbol = INSTRUCTION_ARGS;
  return true;
}
