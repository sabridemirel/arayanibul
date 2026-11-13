#!/usr/bin/env bash
# PostToolUse (Write|Edit): src/web veya src/mobile altındaki TS/TSX dosyasında eslint --fix çalıştırır.
# Kalan hataları Claude'a geri bildirir (exit 2). ESLint kurulu değilse sessizce atlar.
f=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
[[ "$f" =~ \.(ts|tsx)$ ]] || exit 0
root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
case "$f" in
  "$root"/src/web/*)    pkg="$root/src/web" ;;
  "$root"/src/mobile/*) pkg="$root/src/mobile" ;;
  *) exit 0 ;;
esac
[[ "$f" == */node_modules/* ]] && exit 0
eslint="$pkg/node_modules/.bin/eslint"
[[ -x "$eslint" ]] || exit 0
out=$(cd "$pkg" && "$eslint" --fix "$f" 2>&1)
if [[ $? -ne 0 ]]; then
  echo "ESLint hataları ($f):" >&2
  echo "$out" | tail -40 >&2
  exit 2
fi
exit 0
