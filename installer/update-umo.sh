#!/bin/bash
# UMO Updater für macOS und Linux. Holt neue Versionen nach ~/UMO/umo-extension.
# Wird vom Installer alle 15 Minuten gestartet. Log: ~/UMO/update.log
set -uo pipefail
BASE="$HOME/UMO"; DIR="$BASE/umo-extension"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$BASE/update.log"; }
json_get() { sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$2" | head -n1; }
ver_gt() {
  local IFS=.; local -a a=($1) b=($2); local i
  for i in 0 1 2 3; do
    local x=${a[$i]:-0} y=${b[$i]:-0}
    if (( 10#$x > 10#$y )); then return 0; fi
    if (( 10#$x < 10#$y )); then return 1; fi
  done
  return 1
}
[ -f "$DIR/umo-config.json" ] || { log "Kein UMO-Ordner unter $DIR"; exit 0; }
URL=$(json_get updateManifestUrl "$DIR/umo-config.json")
[ -n "$URL" ] || exit 0
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
curl -fsSL "$URL?t=$(date +%s)" -o "$TMP/version.json" 2>/dev/null || { log "version.json nicht erreichbar"; exit 0; }
NEW=$(json_get version "$TMP/version.json"); ZIP=$(json_get zip "$TMP/version.json"); CUR=$(json_get version "$DIR/manifest.json")
ver_gt "$NEW" "$CUR" || exit 0
curl -fsSL "$ZIP" -o "$TMP/umo.zip" && unzip -q "$TMP/umo.zip" -d "$TMP/new" || { log "Download von $NEW fehlgeschlagen"; exit 0; }
[ "$(json_get version "$TMP/new/manifest.json")" = "$NEW" ] || { log "Paket $NEW ist ungültig"; exit 0; }
if mv "$DIR" "$TMP/old" && mv "$TMP/new" "$DIR"; then
  log "Aktualisiert: $CUR -> $NEW (UMO startet sich in Chrome innerhalb von 5 Minuten selbst neu)"
else
  [ -d "$DIR" ] || mv "$TMP/old" "$DIR"; log "Austausch fehlgeschlagen, alte Version bleibt"; exit 1
fi
