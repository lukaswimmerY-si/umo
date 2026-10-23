# UMO für macOS – Arbeitsanweisung für Claude Code

Du baust **UMO für macOS**: einen Begleiter in der Menüleiste, der Menschen mit ADHS, kognitiven
Einschränkungen und psychischen Erkrankungen hilft, digitale Inhalte zu verstehen. Zuerst PDFs,
dann E-Mails und markierten Text, später Fokus/Calming systemweit und Formulare.

Konzept (für Menschen, nicht für dich verbindlicher als diese Datei):
https://claude.ai/artifact/FJeFpuyEDA4oxqJeyorBiW

Die Chrome-Extension im Ordner `../extension` ist das Vorbild für Ton, Sprachregeln, Design und Abläufe.
Lies dort bei Bedarf `content/umo.js` (Prompts, Modi) und `content/umo.css` (Design).

## Nicht verhandelbar

1. **Verstehen vor Erledigen.** UMO sendet, bezahlt, unterschreibt, sagt zu oder schickt Formulare ab: nie.
   Ausgefüllte PDFs werden als Kopie gespeichert. Mail-Antworten sind Entwürfe.
2. **Nichts ohne Klick.** Kein Inhalt geht an die KI, bevor die Person es ausgelöst hat
   (Tastenkürzel, Pille, Rechtsklick, Knopf). Kein Mitlesen im Hintergrund.
3. **Sensible Inhalte:** Erkennt UMO Gesundheitsdaten, IBAN/Kontoauszüge, Ausweis- oder Steuernummern,
   fragt es vor dem Senden einmal nach („Das sieht nach … aus. Trotzdem erklären lassen?“).
4. **Lokal:** API-Schlüssel, Profil und Bedürfnisse liegen im Schlüsselbund. Keine Telemetrie, kein eigener Server.
5. **Fristen und Beträge** immer wörtlich mit Zitat aus dem Original. Die Oberfläche bietet „Zeig mir die Stelle“
   (PDFKit-Suche nach dem Zitat, Stelle markieren). Nie runden, nie umrechnen.
6. **Ehrlich:** KI-Texte sind gekennzeichnet. Leichte Sprache trägt den Hinweis, dass keine Prüfgruppe geprüft hat.

## Sprache und Ton

Alle Texte für Menschen sind Deutsch, warm, ruhig, du-Form, kurze Sätze, keine Technikwörter.
Fehlermeldungen sagen, was passiert ist und was man tun kann („Claude ist gerade überlastet. Ich versuche es gleich noch einmal.“).

Die Regeln für die KI liegen in `Resources/Prompts/` und werden **wörtlich** aus der Extension übernommen:
`einfache-sprache.txt` (DIN 8581-1), `leichte-sprache.txt` (DIN SPEC 33429), `ton.txt`.
Ändere sie nicht eigenmächtig. Wenn sie sich in der Extension ändern, gleiche sie hier ab.
In Leichter Sprache: jeder Satz eine Zeile, große Schrift (≥ 21 pt), Zeilenabstand 1,7, keine Silbentrennung,
Mediopunkt beim Vorlesen entfernen.

## Design

Wie die Extension (Figma „Digital Inclusion Feature“): Schrift Figtree, Schwarz `#000`, Orange `#FF541B`,
Violett `#C061FF`, Hintergrund `#EAE9DF`, Radien 35/24/20 pt, Pillen-Knöpfe. Das UMO-Fenster ist dunkel
wie das Sheet der Extension. Respektiere „Bewegung reduzieren“ und „Kontrast erhöhen“ von macOS.
Alles per Tastatur bedienbar, VoiceOver-Beschriftungen auf Deutsch.

## Architektur

```
mac/
  project.yml            XcodeGen-Projekt (xcodegen generate → UMO.xcodeproj, nicht einchecken)
  UMO/App/               App-Start, Menüleiste (MenuBarExtra), Pille (NSPanel), Tastenkürzel
  UMO/Core/              ClaudeClient, Keychain, Prompts, Speech, Needs (Immer / Nur jetzt)
  UMO/Context/           Woher der Inhalt kommt: PDF (PDFKit + Vorschau/Acrobat per AppleScript),
                         Mail (AppleScript), Markierung (AXUIElement), Fenster (ScreenCaptureKit)
  UMO/Features/          PDF verstehen, Mail verstehen, Text vereinfachen, Fokus, Calming, Formulare
  UMO/UI/                SwiftUI-Ansichten
  Resources/Prompts/     Sprachregeln (siehe oben) + Aufgaben-Prompts mit JSON-Schema
  Tests/                 XCTest; Tests/Fixtures/ mit Beispiel-PDFs (keine echten personenbezogenen Daten!)
```

- Swift 5.10+/Swift 6, SwiftUI, macOS 14+. **Keine Sandbox** (AppleScript an andere Apps und Bedienungshilfen),
  Hardened Runtime an, Entitlement `com.apple.security.automation.apple-events`.
- Info.plist: `LSUIElement = YES` (kein Dock-Symbol), deutsche Texte für `NSAppleEventsUsageDescription`.
- Pakete (Versionen beim Einrichten prüfen): `sindresorhus/KeyboardShortcuts` (Tastenkürzel ⌥ Leertaste),
  `sparkle-project/Sparkle` (Updates ab Phase 0).
- **Claude-Client** wie `../extension/background.js` → `callClaude`: Systemprompt „antworte nur mit JSON“,
  bis zu 3 Wiederholungen bei 429/5xx/529 mit Wartezeit, JSON tolerant parsen (gerade Anführungszeichen im Text
  reparieren), Fehler in klare Klassen (kein Schlüssel, Schlüssel falsch, Guthaben leer, Modell nicht verfügbar,
  überlastet, offline, Antwort unvollständig). Modell in den Einstellungen wählbar, Standard für PDFs
  `claude-sonnet-5-5`, für kurze Texte `claude-haiku-5-5`. Prüfe Modellnamen und PDF-Support gegen
  https://docs.claude.com bevor du sie fest einbaust.
- **PDFs an die KI:** bevorzugt als `document`-Block (base64, `application/pdf`), dann sieht die KI auch
  Tabellen, Grafiken und gescannte Seiten. Grenzen der API (Seiten, Größe) in der Doku prüfen;
  bei zu großen PDFs: PDFKit-Text seitenweise, in Stücken.
- **Vorlesen:** `AVSpeechSynthesizer`, deutsche Stimme mit der besten Qualität (`.premium` > `.enhanced`),
  in den Einstellungen wählbar, Satz-Hervorhebung über `willSpeakRangeOfSpeechString`.

## Arbeitsweise

- Projekt erzeugen: `brew install xcodegen` (falls nötig), dann `cd mac && xcodegen generate`.
- Bauen: `xcodebuild -project UMO.xcodeproj -scheme UMO -configuration Debug build`
- Tests: `xcodebuild -project UMO.xcodeproj -scheme UMO test`
- Nach jeder Änderung bauen. Rote Builds nie liegen lassen.
- Kleine, klar benannte Commits auf Deutsch („PDF: Fristen mit Zitat anzeigen“).
- Neue Rechte (Bedienungshilfen, Bildschirmaufnahme, Automation) erst anfragen, wenn eine Funktion sie braucht,
  vorher in einfacher Sprache erklären, warum.
- Wenn etwas nur durch Ausprobieren am Mac klärbar ist (Rechte-Dialoge, Pille über Vollbild-Apps),
  sag dem Menschen genau, was er klicken und dir zurückmelden soll.

## Phasen (eine nach der anderen; erst weiter, wenn das Kriterium erfüllt ist)

**Phase 0 – Grundgerüst**
Menüleisten-Symbol, schwebende Pille (zieh- und ausblendbar), UMO-Fenster mit Tabs Fokus/Einfach/Snack/Calming
und Bedürfnisse-Leiste oben (Immer im Schlüsselbund, Nur jetzt im Speicher bis zum Beenden),
Einstellungen (API-Schlüssel, Modell, Stimme, Tempo), Tastenkürzel, ClaudeClient mit „Verbindung testen“.
Release-Ablauf als GitHub Action auf `macos-latest`: bauen, mit Developer ID signieren, mit `notarytool`
notarisieren, stapeln, DMG oder ZIP, Sparkle-`appcast.xml`, GitHub Release mit Tag `mac-vX.Y.Z`
(getrennt von den Extension-Releases `vX.Y.Z`). Secrets dokumentieren, nicht ins Repo.
*Kriterium:* Die App startet signiert auf einem zweiten Mac ohne Warnung und holt sich ein Update.

**Phase 1 – PDF verstehen** (Prompt: `Resources/Prompts/pdf-verstehen.txt`)
PDF per Drag-and-drop auf Pille/Fenster, per Tastenkürzel aus Vorschau oder Acrobat (AppleScript liefert den
Pfad des vorderen Dokuments), oder per Rechtsklick im Finder (Dienst). Anzeige in dieser Reihenfolge:
1. „Was muss ich tun?“ – Aufgaben mit Frist (Datum groß), Beträge, nötige Unterlagen, jeweils „Zeig mir die Stelle“.
2. „Worum geht es?“ – zwei Sätze.
3. Zusammenfassung in Einfacher oder Leichter Sprache (Schalter wie in der Extension).
4. Frage-Karte („Frag mich etwas dazu“), Antworten nur aus dem Dokument.
Vorlesen für alles. Erinnerung an Fristen als Option (Kalender/Erinnerungen nur nach Bestätigung, Phase 2+).
*Kriterium:* Bei 5 echten, anonymisierten Bescheiden/Rechnungen stimmen alle Fristen und Beträge, und jede
„Zeig mir die Stelle“ springt richtig.

**Phase 2 – E-Mail und markierter Text**
Apple Mail: ausgewählte Nachricht per AppleScript (Absender, Betreff, Datum, Inhalt). Anzeige: Was will die
Person von mir, Frist, Worauf achten, Antwortentwurf (in Mail als Entwurf öffnen, nie senden).
Markierter Text in jeder App über AXUIElement (`kAXSelectedTextAttribute`), Fallback: Zwischenablage nur
mit Zustimmung. Dienste-Menü „Mit UMO vereinfachen“. Danach Outlook prüfen.
*Kriterium:* Testpersonen verstehen eine lange, verschachtelte Mail allein.

**Phase 3 – Fokus und Calming systemweit**
Leselineal als durchklickbares Overlay-Fenster über allen Apps, alles außer dem aktiven Fenster abdunkeln,
Kompakt zusammenfassen (Fenster-Bild + KI), Atemübung unter Wasser (Vorbild: `openBreath` in der Extension),
Mitteilungen pausieren (Kurzbefehl „Fokus“ des Systems, nur mit Erklärung).
*Kriterium:* Läuft flüssig über allen Apps und Spaces, ohne Klicks zu blockieren.

**Phase 4 – Formulare**
PDF-Formulare (AcroForm über PDFKit): jedes Feld in einfachen Worten erklären, Vorschläge aus dem Profil
(Schlüsselbund), jedes Feld bestätigen, als Kopie speichern. Danach Formulare in Apps über AXUIElement,
Feld für Feld mit Bestätigung, nie absenden.
*Kriterium:* Ein ausgefülltes Test-Formular stimmt vollständig, nichts wurde abgeschickt.

**Phase 5 – Zusammen mit der Extension**
Bedürfnisse und Einstellungen über Native Messaging mit der Chrome-Extension teilen.

## Tests

- XCTest für: JSON-Reparatur, Fehlerklassen, Prompt-Zusammenbau, Fristen-Parsing (deutsche Datumsformate),
  Sensible-Daten-Erkennung, Mediopunkt-Entfernung beim Vorlesen.
- `Tests/Fixtures/`: selbst erzeugte Beispiel-PDFs (Bescheid mit Frist und Betrag, Rechnung, zweiseitiger Vertrag,
  gescanntes Bild-PDF, Formular). Keine echten Personendaten.
- Ein Mock-Server für die Claude-API (wie im Extension-Test) erlaubt Tests ohne Schlüssel.
