# UMO für macOS

Begleiter in der Menüleiste: PDFs, E-Mails und markierten Text verstehen, in Einfacher oder Leichter Sprache.
Konzept: https://claude.ai/artifact/FJeFpuyEDA4oxqJeyorBiW

## Loslegen (einmalig)

1. Diesen Ordner `mac/` neben `extension/` ins Repository legen und pushen.
2. Repository auf dem Mac klonen, im Terminal in den Ordner `mac/` wechseln und `claude` starten (Claude Code).
3. Claude Code liest `CLAUDE.md`. Ein guter erster Auftrag:
   „Lies CLAUDE.md, richte das Projekt ein (xcodegen), bring es zum Bauen und schließ Phase 0 ab.“
4. In Xcode einmal das Team (Developer ID) wählen. Claude Code sagt Bescheid, wenn es so weit ist.

## Was hier schon liegt

- `CLAUDE.md` – Auftrag, Regeln, Architektur, Phasen mit Abnahmekriterien
- `Resources/Prompts/` – Sprachregeln aus der Extension (Einfache/Leichte Sprache, Ton) und der Prompt „PDF verstehen“
- `project.yml` – Xcode-Projekt (XcodeGen), Pakete KeyboardShortcuts und Sparkle
- `UMO/` – Skelett: Menüleiste, Fenster, Claude-Client mit Wiederholungen und JSON-Reparatur, Schlüsselbund,
  Vorlesen mit den besten deutschen Stimmen, PDF aus Vorschau/Acrobat, PDF verstehen (Fristen zuerst)
- `Tests/` – erste Tests für JSON-Reparatur, Fehlerklassen und Bedürfnisse

Der Code ist ein Startpunkt und wurde noch nicht auf einem Mac gebaut. Claude Code bringt ihn zum Laufen.
