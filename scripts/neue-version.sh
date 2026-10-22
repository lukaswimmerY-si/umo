#!/bin/bash
# Neue UMO-Version veröffentlichen: erhöht die Version, committet und pusht.
# GitHub baut danach das Release, alle Rechner mit Updater holen es sich innerhalb von 15 Minuten.
# Aufruf: ./scripts/neue-version.sh "Was ist neu?"   (optional: patch | minor | major als zweites Argument)
set -euo pipefail
cd "$(dirname "$0")/.."
MSG="${1:-UMO Update}"; PART="${2:-patch}"
F=extension/manifest.json
CUR=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$F" | head -n1)
IFS=. read -r MA MI PA <<< "$CUR"
case "$PART" in major) MA=$((MA+1)); MI=0; PA=0;; minor) MI=$((MI+1)); PA=0;; *) PA=$((PA+1));; esac
NEW="$MA.$MI.$PA"
sed -i.bak "s/\"version\"[[:space:]]*:[[:space:]]*\"$CUR\"/\"version\": \"$NEW\"/" "$F" && rm -f "$F.bak"
git add -A && git commit -m "$MSG" && git push
echo "Version $NEW ist unterwegs. Das Release erscheint in wenigen Minuten auf GitHub."
