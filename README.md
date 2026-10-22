# UMO – Unified Modes

Chrome-Extension von Studio Y-si. Dieses Repository veröffentlicht neue Versionen automatisch, und alle Test-Rechner holen sie sich von selbst.

## So läuft ein Update ab

```
Version in extension/manifest.json erhöhen und pushen
        ↓  (GitHub Actions, ca. 1 Minute)
GitHub-Release mit umo-extension.zip und version.json
        ↓  (UMO-Updater auf jedem Rechner, alle 15 Minuten)
Neuer Extension-Ordner liegt auf dem Rechner
        ↓  (UMO prüft alle 5 Minuten)
UMO startet sich in Chrome selbst neu und meldet „UMO wurde auf Version … aktualisiert“
```

Spätestens nach etwa 20 Minuten haben alle Rechner die neue Version, ohne dass jemand etwas tun muss. Offene Tabs nutzen die neue Version nach dem Neuladen der Seite.

## Einmalig einrichten (Team)

Repository: https://github.com/lukaswimmerY-si/umo

1. Den Inhalt dieses Ordners ins Repository bringen:

   ```
   git clone https://github.com/lukaswimmerY-si/umo.git
   cd umo
   # Inhalt dieses Ordners (umo-repo) hierher kopieren, inklusive des versteckten Ordners .github
   git add -A
   git commit -m "UMO 0.6.1"
   git push
   ```

2. Unter „Actions“ prüfen, dass der Ablauf „UMO Release“ grün durchläuft. Unter „Releases“ erscheint dann `UMO 0.6.1` mit fünf Dateien.

3. **Wichtig: Das Repository ist im Moment privat.** Private Releases kann der Updater ohne Anmeldung nicht laden. Es gibt zwei Wege:
   - **A (einfach):** Repository öffentlich machen: Settings → General → ganz unten „Change visibility“ → Public. Im Code stehen keine Schlüssel, der API-Schlüssel liegt nur im Browser.
   - **B (Code bleibt privat):** Ein zweites, öffentliches Repository anlegen, zum Beispiel `lukaswimmerY-si/umo-releases`, beim Anlegen „Add a README“ anhaken. Dann einen Fine-grained Token erzeugen (GitHub → Settings → Developer settings → Personal access tokens), nur für `umo-releases`, Berechtigung „Contents: Read and write“. Im privaten Repository unter Settings → Secrets and variables → Actions:
     - Secret `RELEASE_TOKEN` = der Token
     - Variable `RELEASE_REPO` = `lukaswimmerY-si/umo-releases`

     In den Befehlen unten dann `umo` durch `umo-releases` ersetzen.

## Rechner einrichten (jede Testperson, einmalig)

Vorher die alte UMO-Version in `chrome://extensions` entfernen.

**Mac** – im Terminal:

```
curl -fsSL https://github.com/lukaswimmerY-si/umo/releases/latest/download/install-mac.sh | bash
```

**Windows** – in PowerShell:

```
irm https://github.com/lukaswimmerY-si/umo/releases/latest/download/install-windows.ps1 | iex
```

Danach nur noch einmal in Chrome: `chrome://extensions` öffnen, Entwicklermodus einschalten, „Entpackte Erweiterung laden“ und den Ordner wählen, den das Skript anzeigt (Mac: `~/UMO/umo-extension`, Windows: `%LOCALAPPDATA%\UMO\umo-extension`). Ab jetzt kommen alle Updates von selbst.

## Neue Version veröffentlichen

```
./scripts/neue-version.sh "Was ist neu?"
```

Das Skript erhöht die Version (0.5.0 → 0.5.1), committet und pusht. Für größere Schritte: `./scripts/neue-version.sh "Text" minor`.
Ohne Terminal: auf GitHub `extension/manifest.json` öffnen, die Versionsnummer erhöhen und speichern. Das reicht.

Wichtig: Ohne höhere Versionsnummer gibt es kein Release.

## Optional: Chrome Web Store

Dann aktualisiert Chrome selbst, ohne Updater und ohne Entwicklermodus. Jedes Update wird von Google geprüft, das dauert meist Stunden bis wenige Tage.

1. Einmalig ein Konto in der Chrome Web Store Developer Console anlegen und die Extension einmal von Hand hochladen. Sichtbarkeit „Nicht gelistet“ oder nur für Testende.
2. In der Google Cloud Console die Chrome Web Store API aktivieren und OAuth-Zugangsdaten erzeugen (Anleitung: https://developer.chrome.com/docs/webstore/using-api).
3. Im GitHub-Repository unter Settings → Secrets anlegen: `CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`.
4. Optional unter Settings → Variables `CWS_PUBLISH_TARGET` auf `default` setzen, um für alle zu veröffentlichen. Standard ist `trustedTesters`.

Ab dann lädt jedes Release die neue Version automatisch auch in den Store.

## Wenn etwas hakt

- In den UMO-Einstellungen steht unter „Updates“, welche Version läuft und ob eine neue bereitliegt. Dort gibt es auch „UMO jetzt neu starten“.
- Das Protokoll des Updaters liegt unter `~/UMO/update.log` (Mac) oder `%LOCALAPPDATA%\UMO\update.log` (Windows).
- Updater entfernen, Mac: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/studio.ysi.umo-updater.plist` und die Datei löschen. Windows: Aufgabe „UMO Updater“ in der Aufgabenplanung löschen.

## Aufbau

- `extension/` – die Chrome-Extension (Anleitung in `extension/ANLEITUNG.md`)
- `.github/workflows/release.yml` – baut und veröffentlicht Releases
- `installer/` – Installer und Updater für Mac, Linux und Windows
- `scripts/neue-version.sh` – Version erhöhen und veröffentlichen
