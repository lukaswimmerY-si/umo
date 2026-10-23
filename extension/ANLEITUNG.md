# UMO – Chrome-Extension (Prototyp 0.8)

UMO legt das Modus-System aus dem Y-si-Prototyp über echte Websites:
Fokus, Einfach, Snack und Calming, dazu „Teile deine Bedürfnisse“.

## Installieren

Empfohlen: mit dem Installer aus dem GitHub-Release, dann kommen Updates automatisch (siehe README im Hauptordner). Von Hand geht es so:

1. Die ZIP-Datei entpacken.
2. In Chrome `chrome://extensions` öffnen.
3. Oben rechts den **Entwicklermodus** einschalten.
4. **Entpackte Erweiterung laden** und den Ordner `umo-extension` wählen.
5. Die Einstellungsseite öffnet sich. Dort den API-Schlüssel eintragen und auf **Verbindung testen** klicken.

Läuft auch in Edge, Brave und Arc, weil diese Browser auf Chromium aufbauen.

## API-Schlüssel

Einen Schlüssel erstellt ihr in der Claude Console (console.anthropic.com). Setzt dort ein Ausgabenlimit.
Standard ist Claude Haiku 5.5, weil die Antworten schnell kommen. Für schwierige Grafiken lohnt sich Sonnet 5.5.
Der Schlüssel bleibt im Speicher der Extension und geht nur an die Claude-API.
Für Tests mit echten Nutzerinnen und Nutzern gehört er auf einen eigenen Server (siehe „Nächste Schritte“).

Ohne Schlüssel funktionieren: Ablenkendes ausblenden, Inhalte strukturieren, Snack mit Originalsätzen, Calming, Produktauswahl nach Stichworten.

## Was wo funktioniert

| Seite | Modus | Was passiert |
|---|---|---|
| Jede Seite | Fokus: Ablenkende Inhalte ausblenden | Werbung, Pop-ups, Countdowns, Autoplay und Animationen verschwinden |
| Artikel | Fokus: Inhalte zusammenfassen | Leseansicht mit „Das Wichtigste in Kürze“ |
| Artikel | Einfach: Vereinfachen, Strukturieren | Leseansicht in einfacher Sprache, Originaltext aufklappbar, Wortliste |
| Artikel | Grafik erklären | UMO nimmt einen Ausschnitt der Grafik auf und erklärt ihn (lang oder kurz) |
| Artikel | Snack | Der Artikel als Player in 4 bis 6 Paketen, wird vorgelesen |
| Shop | Fokus: Auswahl verdichten | Wunsch eingeben oder sagen, zum Beispiel „weißes T-Shirt bis 25 €“. UMO nutzt die Suche der Seite, setzt den Farbfilter der Seite, blendet alles über dem Preis und in anderen Farben aus und stellt die 3 besten Treffer nach vorne |
| Jede Seite | Calming | Seite beruhigen, ruhige Klänge, Atemübung |

Das UMO-Symbol in der Browserleiste blendet den Modus-Knopf ein und aus.

## Neu in 0.8

- **Bedürfnisse für alles.** „Teile deine Bedürfnisse“ steht jetzt als feste Leiste über allen Modi. Was du dort sagst, gilt für alle Modi und alle Websites.
- **Fokus: Kompakt zusammenfassen.** Im Fokus Modus gibt es immer die Kachel „Kompakt zusammenfassen“. Sie öffnet eine eigene Seite im Look der Website: Logo, Schriften, Farben und Titelbild bleiben erhalten. Darauf: „Deine Zusammenfassung“, 2 bis 4 nummerierte Kapitel, wichtige Zahlen groß und fett, und wo es passt ein einfacher Vergleich als Balken. Auf Produkt- und Service-Seiten führt „Nächster Schritt“ direkt zur Hauptaktion der Seite.
- **Atemübung.** Eine fließende Blase, die mit dem Atem wächst und kleiner wird. Dahinter ein ruhiger Abendhimmel mit langsam treibenden Farben und schwebenden Lichtpunkten. Bei „Bewegung reduzieren“ bleibt alles still.

## Neu in 0.7.3: Einfache Sprache und Leichte Sprache nach Norm

Der Einfach Modus bietet jetzt zwei klar getrennte Stufen:

- **Einfache Sprache** nach DIN 8581-1:2024-05. Für alle, die einen Text schnell und sicher verstehen wollen. Fließtext, kurze Sätze, Alltagswörter, Fachwörter erklärt, das Wichtigste zuerst.
- **Leichte Sprache** nach DIN SPEC 33429:2025-03. Für Menschen mit Lernschwierigkeiten. Ein Gedanke pro Satz, jeder Satz in einer eigenen Zeile, keine Nebensätze, kein Genitiv, kein Passiv, lange Wörter mit Mediopunkt gegliedert (Bundes·tag), Zahlen greifbar. Große Schrift und viel Zeilenabstand.

Zusammenfassung, Wort-Erklärungen und Grafik-Erklärungen folgen der gewählten Stufe. Der Mediopunkt wird beim Vorlesen nicht mitgesprochen.

Wichtig: Echte Leichte Sprache wird von Menschen aus der Zielgruppe geprüft. Das kann eine KI nicht ersetzen. UMO kennzeichnet das in der Leseansicht.

## Neu in 0.7.2

- **Kostenlose, natürliche Stimme.** UMO liest mit der besten deutschen Stimme auf dem Rechner vor, satzweise und in ruhigem Tempo. In den Einstellungen unter „Stimme“ kann man jede Stimme probehören und auswählen. Auf dem Mac lassen sich „Anna (Premium)“ oder „Petra (Premium)“ kostenlos nachladen (Anleitung in den Einstellungen). ElevenLabs ist nur noch eine Option.
- **Grafiken einfacher erklärt.** Ein Satz mit dem Wichtigsten, dazu ein paar kurze Sätze in Alltagssprache und ein Beispiel („Stell dir 100 Menschen vor …“). Keine zusätzlichen Diagramme oder Zahlen-Kacheln mehr. Die genauen Zahlen lassen sich bei Bedarf aufklappen.
- **Fragen wie im Gespräch.** Vorschläge wie „Was heißt das für mich?“ statt Fragen zur Darstellung.

## Neu in 0.7.1

- Grafiken von 23degrees (z. B. tagesschau.de) werden erkannt, ihre Zahlen direkt gelesen und erklärt.
- Eingebettete Grafiken unbekannter Dienste werden erkannt, wenn sie im Artikel stehen und kein Video, Social-Media-Beitrag oder Werbung sind.
- Wenn Amy nicht sprechen kann, sagt UMO genau warum (Schlüssel, Stimme nicht im Konto, Tarif, Guthaben). Der Grund steht auch in den Einstellungen unter „Letzte KI-Fehler“.

## Neu in 0.7

- **Weniger, klarere Modi.** Fokus: „Ablenkungen ausblenden“ (im Shop zusätzlich „Auswahl verdichten“). Einfach: „Einfach lesen“ mit Zusammenfassung oben und der Wahl Einfach oder Sehr einfach in der Leseansicht, dazu „Grafiken auf der Seite erklären“. Snack wie bisher. Calming: „Seite beruhigen“ und „Atemübung“.
- **Erklärungen kompakt und visuell.** Kernaussage in einem Satz, die wichtigsten Zahlen als Kacheln, ein kleines Balkendiagramm direkt aus den Daten. Umschalten zwischen „Kurz“ und „Ausführlich“.
- **Frage-Karte.** Farbig abgesetzt, großes Mikrofon, Beispielfragen passend zur Grafik, auch als Platzhalter im Eingabefeld.
- **Nur wo es nötig ist.** Erklärboxen erscheinen bei Diagrammen, Karten, Tabellen und Infografiken, nicht bei Fotos.
- **Box passt sich der Seite an.** Dunkle Karte auf dunklen Seiten, helle Karte auf hellen Seiten.
- **Stimme Amy von ElevenLabs.** In den Einstellungen unter „Stimme“ den ElevenLabs-Schlüssel eintragen. Ohne Schlüssel liest die Browser-Stimme. Im Snack Modus liest Amy jedes Paket am Stück, die Sätze werden im Takt hervorgehoben.
- **Ruhigere Atemübung.** Ein Lichtkreis atmet mit (4 Sekunden ein, 6 Sekunden aus), weiche Farben, keine springenden Zahlen. Klänge lassen sich direkt in der Übung einschalten und schwellen mit dem Atem an und ab.

## Neu in 0.6.1

- Fehlermeldungen nennen den Grund: Guthaben aufgebraucht, Modell nicht verfügbar, Claude überlastet, keine Verbindung. Darunter steht die genaue Meldung, dazu „Nochmal versuchen“.
- Bei Überlastung oder kurzen Störungen versucht UMO es automatisch bis zu dreimal.
- Unsaubere KI-Antworten (zum Beispiel Anführungszeichen mitten im Text) repariert UMO selbst.
- In den Einstellungen gibt es unter „KI-Zugang“ die Liste „Letzte KI-Fehler“.
- Der Snack Modus trennt Sätze nicht mehr bei Daten und Abkürzungen („6. Februar“, „z. B.“, „21. Deutschen Bundestag“).

## Neu in 0.6: Infografiken im Einfach Modus

- **In der Leseansicht:** Die echten Grafiken stehen an ihrer Stelle im vereinfachten Text. Darunter erklärt UMO jede Grafik in einfacher Sprache (lange oder kurze Erklärung), zeigt die Zahlen als Tabelle und nimmt Fragen an, per Mikrofon oder Tastatur. Wer per Sprache fragt, bekommt die Antwort vorgelesen.
- **Auf der Originalseite:** Die neue Kachel „Grafiken auf der Seite erklären“ setzt unter jede Grafik den Knopf „Grafik einfach erklärt“ mit derselben Erklärbox.
- **Datawrapper-Grafiken** (zum Beispiel bpb.de, viele Nachrichtenseiten) liest UMO direkt über ihre Daten statt über ein Bild. Die Zahlen stimmen damit exakt. Leitet eine Grafik auf eine neuere Version weiter, nutzt UMO die neuere.
- Grafiken, die erst beim Scrollen laden, holt UMO vorher selbst.
- Ohne API-Schlüssel zeigt UMO bei Datawrapper-Grafiken die Zahlen als Tabelle mit Beschreibung und Quelle.

## Neu in 0.5: Automatische Updates

UMO prüft alle 5 Minuten, ob eine neue Version bereitliegt, und startet sich dann selbst neu. Zusammen mit dem UMO-Updater und den GitHub-Releases kommen neue Versionen ohne Handarbeit auf alle Rechner. Einrichtung: siehe README im Hauptordner des Repositorys.

## Neu in 0.4: Modi passend zur Seite

UMO erkennt zuerst, was für eine Seite offen ist, und zeigt nur die Modi, die dort helfen. Oben im Sheet steht „Passend für diese Seite: …“.

| Seitentyp | Fokus | Einfach | Snack | Calming |
|---|---|---|---|---|
| Artikel, Behörde, Studie | Ablenkung ausblenden, Zusammenfassen | Vereinfachen, Strukturieren, Grafiken erklären | ja | ja |
| Produktseite | Ablenkung ausblenden | Produkt einfach erklären, Fragen zum Produkt stellen | – | ja |
| Shop-Übersicht | Ablenkung ausblenden, Auswahl verdichten | Seite einfach erklären | – | ja |
| Sonstige Website | Ablenkung ausblenden | Seite einfach erklären | – | ja |

Erkennung: strukturierte Daten der Seite (zum Beispiel NewsArticle, Product, ProductGroup), Kauf-Knöpfe, Anzahl der Produktkacheln und Textmenge. Live geprüft auf zalando.de (Übersicht und Produktseite).

„Produkt einfach erklären“ fasst Material, Passform, Größe und Pflege zusammen und beantwortet Fragen, nur mit dem, was auf der Seite steht. Ohne KI zeigt UMO die wichtigsten Angaben der Seite als Liste.

## Neu in 0.3

- Zalando-Filter live geprüft und eingebaut: Farbe, Größe, Höchstpreis und Bereich (Damen, Herren, Kinder) setzt UMO jetzt direkt als Zalando-Filter.
  Beispiel: „grünes Hemd in Größe XL für 40 Euro“ öffnet `/katalog/_gruen_groesse-XL/?q=hemd&price_to=40`.
- „Rosa“ wird bei Zalando als „Pink“ gefiltert, weil Zalando keinen eigenen Rosa-Filter hat.
- Ist der Farbfilter von Zalando gesetzt, filtert UMO nicht zusätzlich nach Farbwörtern. Sonst würden passende Artikel verschwinden, deren Name die Farbe nicht nennt.
- Den Preis prüft UMO trotzdem noch einmal selbst, weil Zalando vereinzelt teurere Artikel zeigt.
- Ausgeblendete Bereiche wie der Mini-Warenkorb werden nie angefasst.
- Ohne Angabe von Damen, Herren oder Kinder nutzt Zalando die Einstellung aus dem jeweiligen Konto.

## Neu in 0.2

- Zalando: UMO nutzt die echte Suche (`/katalog/?q=…`) und den Farbfilter der Seite.
- Die Produktseite selbst wird verändert: Unpassendes verschwindet, die besten Treffer stehen vorne und sind orange markiert. Oben zeigt eine Leiste „UMO zeigt 5 von 84“ mit „Alle zeigen“.
- Farbe und Höchstpreis versteht UMO auch ohne KI.
- „Was erkennt UMO hier?“ unten im Sheet zeigt, was UMO auf der Seite findet. Bitte bei Fehlern einen Screenshot davon schicken.

## Gute Seiten zum Ausprobieren

Artikel: tagesschau.de, sueddeutsche.de, zeit.de, spiegel.de, nachrichtenleicht.de (zum Vergleich).
Shops: zalando.de (mit eigener Anpassung), aboutyou.de, otto.de (allgemein).
Behörden und Statistik: destatis.de (Pressemitteilungen mit Tabellen), bundeshaushalt.de, umweltbundesamt.de (Daten zu Treibhausgasen), de.statista.com/infografik.
PDFs funktionieren noch nicht, weil Chrome sie in einem eigenen Viewer öffnet.

## Bekannte Grenzen

- UMO erkennt Artikel und Produkte allgemein, nicht pro Website. Auf manchen Seiten trifft die Erkennung nicht.
- Bei Paywalls sieht UMO nur, was auf der Seite sichtbar ist.
- „Auswahl verdichten“ sieht nur die geladenen Produkte. Lädt die Seite beim Scrollen mehr nach, werden diese nicht gefiltert.
- Auf anderen Shops als Zalando setzt UMO Preis und Größe nicht als Filter der Seite, sondern filtert selbst.
- Seiten mit sehr strengen Sicherheitsregeln können einzelne Funktionen blockieren.
- Spracheingabe braucht die Mikrofon-Freigabe der jeweiligen Website.
- Die KI kann sich irren. Darum gibt es überall den Originaltext.

## Nächste Schritte

- Kleiner Server für den API-Schlüssel, damit Testpersonen keinen eigenen brauchen.
- Safari-Version für iPhone und iPad mit `xcrun safari-web-extension-converter`.
- Adapter für die wichtigsten Pilot-Websites, damit Erkennung und Produktsuche dort sicher sitzen.

Enthält Mozilla Readability (Apache 2.0, siehe `content/READABILITY-LICENSE.md`) und die Schrift Figtree (SIL Open Font License).
