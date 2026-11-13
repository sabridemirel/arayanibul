#!/usr/bin/env bash
# PreToolUse (Write|Edit): EF Core migration dosyalarının ve lock dosyalarının elle düzenlenmesini engeller.
f=$(jq -r '.tool_input.file_path // empty')
reason=""
case "$f" in
  */src/backend/API/Migrations/*) reason="EF Core migration dosyaları elle düzenlenmez; 'migrate' skill'i / 'dotnet ef migrations add' kullan." ;;
  */package-lock.json) reason="package-lock.json elle düzenlenmez; 'npm install' ile güncelle." ;;
esac
[[ -z "$reason" ]] && exit 0
jq -n --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
