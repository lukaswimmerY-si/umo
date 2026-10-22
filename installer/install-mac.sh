#!/bin/bash
# UMO installieren und automatische Updates einrichten (macOS, Linux).
# Aufruf:  curl -fsSL https://github.com/__REPO__/releases/latest/download/install-mac.sh | bash
set -euo pipefail
REPO="${1:-__REPO__}"
case "$REPO" in __*) echo "Bitte das GitHub-Repository angeben, z. B.: bash install-mac.sh studio-ysi/umo"; exit 1;; esac
BASE="$HOME/UMO"; DIR="$BASE/umo-extension"; mkdir -p "$BASE"
echo "UMO wird geladen …"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://github.com/$REPO/releases/latest/download/umo-extension.zip" -o "$TMP/umo.zip"
unzip -q "$TMP/umo.zip" -d "$TMP/new"
[ -f "$TMP/new/manifest.json" ] || { echo "Das Paket ist ungültig."; exit 1; }
[ -d "$DIR" ] && mv "$DIR" "$TMP/old"
mv "$TMP/new" "$DIR"
curl -fsSL "https://github.com/$REPO/releases/latest/download/update-umo.sh" -o "$BASE/update-umo.sh" 2>/dev/null || true
if [ ! -s "$BASE/update-umo.sh" ]; then echo "Updater konnte nicht geladen werden."; exit 1; fi
chmod +x "$BASE/update-umo.sh"
if [ "$(uname)" = "Darwin" ]; then
  PL="$HOME/Library/LaunchAgents/studio.ysi.umo-updater.plist"; mkdir -p "$(dirname "$PL")"
  cat > "$PL" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>studio.ysi.umo-updater</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$BASE/update-umo.sh</string></array>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$BASE/updater-output.log</string>
  <key>StandardErrorPath</key><string>$BASE/updater-output.log</string>
</dict></plist>
PLIST
  launchctl bootout "gui/$(id -u)" "$PL" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PL"
else
  { crontab -l 2>/dev/null | grep -v "update-umo.sh" || true; echo "*/15 * * * * /bin/bash $BASE/update-umo.sh"; } | crontab -
fi
echo
echo "Fertig. UMO liegt in: $DIR"
echo "Automatische Updates sind eingerichtet (alle 15 Minuten)."
sleep 2; [ -f "$BASE/update.log" ] && tail -1 "$BASE/update.log"
echo "Installierte Version: $(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$DIR/manifest.json" | head -n1)"
echo
echo "Nur beim ersten Mal in Chrome:"
echo "  1. chrome://extensions öffnen"
echo "  2. Oben rechts den Entwicklermodus einschalten"
echo "  3. „Entpackte Erweiterung laden“ und diesen Ordner wählen: $DIR"
[ "$(uname)" = "Darwin" ] && open "$BASE" 2>/dev/null || true
