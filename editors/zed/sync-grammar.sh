#!/usr/bin/env bash
# Zed načítá Tree-sitter gramatiky jen z git repozitáře (repository + rev).
# Skript vygeneruje parser, zkopíruje gramatiku do pomocného repa v cache, commitne ji tam
# (ne do repa projektu) a zapíše rev do extension.toml. Pouštěj po každé změně grammar.js.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
grammar="$here/../tree-sitter-futuscript"
cache="${XDG_CACHE_HOME:-$HOME/.cache}/futuscript/tree-sitter-futuscript"

(cd "$grammar" && npx --yes tree-sitter-cli@0.27.1 generate)

mkdir -p "$cache"
[ -d "$cache/.git" ] || git -C "$cache" init -q -b main
rsync -a --delete --exclude .git --exclude node_modules --exclude test "$grammar/" "$cache/"
git -C "$cache" add -A
if ! git -C "$cache" diff --cached --quiet; then
  git -C "$cache" -c user.name="futuscript-sync" -c user.email="futuscript-sync@localhost" \
    commit -q -m "sync z editors/tree-sitter-futuscript"
fi
rev="$(git -C "$cache" rev-parse HEAD)"

python3 - "$here/extension.toml" "file://$cache" "$rev" <<'PY'
import re, sys
path, repo, rev = sys.argv[1:]
s = open(path).read()
s = re.sub(r'(\[grammars\.futuscript\]\s*\nrepository = )"[^"]*"', rf'\1"{repo}"', s)
s = re.sub(r'(\nrev = )"[^"]*"', rf'\1"{rev}"', s)
open(path, "w").write(s)
PY

echo "gramatika: $cache @ $rev"
echo "v Zedu: cmd-shift-p → \"zed: install dev extension\" → vyber $here"
echo "(po další změně gramatiky: \"zed: rebuild dev extension\" nebo v Extensions panelu Rebuild)"
