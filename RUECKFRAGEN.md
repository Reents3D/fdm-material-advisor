# Rückfragen — gesammelt, nicht blockierend

Diese Datei sammelt Entscheidungen, die **Riko** treffen muss, weil sie von Fertigungs-,
Portfolio- oder Marktwissen abhängen, das nicht in den Daten steht. Alles andere ist
selbst entschieden und dokumentiert (siehe `DECISIONS.md`).

**Stand 2026-08-07: nichts offen.** Die XXL-Grenzen sind beantwortet und eingearbeitet.

---

## ENTSCHIEDEN am 2026-08-07 — 1. XXL-Grenzen aus eigener Fertigung ✔ umgesetzt

Die Antwort aus der Werkstatt hat die grösste Einzelkorrektur der Datenbank ausgelöst:

> „Bei über einen Meter nutzen wir PLA, PETG, ABS und ASA zuverlässig. PLA ist am
> stabilsten, was die Masshaltigkeit angeht, da ABS und ASA sowie PETG mehr schrumpfen je
> nach Geometrie. CF Materialien haben wir bisher bis maximal 800 × 800 gefertigt, ohne
> Probleme. PA, PC, PPS bisher nur auf den Engineering Druckern. 100 % gefüllte Bauteile
> sind problematisch im XXL Segment aus PETG, ASA, ABS, da die Spannungen extrem hoch
> werden und das Bauteil sich verziehen kann sowie stärker schrumpft."

| | vorher | jetzt |
|---|---:|---:|
| `abs` | 550 mm | **1.800 mm**, belegt ab 1.000 |
| `asa` | 700 mm | **1.800 mm**, belegt ab 1.000 |
| `petg`, `pla`, `pla-tough` | 1.800 / 2.400 | unverändert, jetzt belegt statt geschätzt |

**Warum die Schätzung um Faktor zwei danebenlag.** Sie war aus der Verzugsneigung
abgeleitet — also aus dem, was ein Bauteil OHNE Gegenmassnahmen tut. In einer Fertigung mit
Kammer, Brim und geübtem Personal ist das die falsche Bezugsgrösse. ABS stand mit
Verzugsneigung 5 von 5 ganz unten und läuft tatsächlich über einen Meter.

**Was ausdrücklich NICHT eingetragen wurde.** „Bis 800 × 800 ohne Probleme" ist ein
belegter unterer Rand, keine gefundene Grenze — dort war schlicht das grösste Teil. Die
800 als Obergrenze einzutragen hiesse, eine nicht gemachte Erfahrung als Grenze auszugeben.
Die 13 CF- und GF-Typen behalten deshalb ihre Schätzung und tragen nur den Vermerk, bis
wohin sie belegt ist. Dasselbe gilt für PA, PC und PPS: „nur auf den Engineering Druckern"
heisst keine XXL-Erfahrung, nicht „geht nicht".

**Ein Befund, den keine Frage erwartet hatte:** 100 % Füllung ist im Grossformat bei PETG,
ASA und ABS problematisch. Das ist die Umkehrung der sonst richtigen Faustregel — für die
Temperaturgrenze unter Dauerlast senkt mehr Füllung die Spannung im Querschnitt, für die
Masshaltigkeit eines Grossteils erhöht sie den Verzug. Beides gilt gleichzeitig und zieht in
verschiedene Richtungen. Steht jetzt als `commercial.xxl.infillWarningXxl` an sieben
Werkstoffen und wird auf dem Datenblatt angezeigt.

### Segmentierung ist raus ✔ umgesetzt

> „Wir segmentieren, wenn es sinnvoll ist für die Auf- und Nachbereitung. Hat im
> Materialberater eigentlich nichts zu suchen, da ein Materialberater kein Fertigungsberater
> ist."

`segmentationRecommended` stand bei allen 43 Werkstoffen auf `true`, wurde von keiner Zeile
Anwendungscode gelesen und ist ersatzlos entfernt — aus dem Schema, aus sieben
Importskripten und aus den Daten. Eine Angabe, die bei allen gleich ist, unterscheidet
nichts.

### Was dabei offen geblieben ist

| Frage | Stand |
|---|---|
| Obergrenze für PLA/PETG/ABS/ASA | nicht gefunden — belegt ist „über einen Meter", das obere Ende wurde nie erreicht |
| Obergrenze für CF/GF-Typen | offen; belegt nur bis 800 × 800, dort war das grösste Teil |
| Werkstoffe, die für XXL grundsätzlich abgelehnt werden | keine genannt — PA, PC und PPS sind eine Maschinen-, keine Werkstofffrage |

Keine davon blockiert etwas. Sie werden beantwortet, wenn ein grösseres Teil durch die
Fertigung geht.

---

## ENTSCHIEDEN am 2026-08-06

### 2. Portfolio-Status wird nicht angezeigt ✔ umgesetzt

Die einzige Anzeigestelle war eine CSV-Spalte; sie ist entfernt. Das **Feld** bleibt im
Datenmodell, damit `portfolio-neutrality.test.ts` seine Garantie weiter prüfen kann und
die Entscheidung umkehrbar bleibt — angezeigt wird es nirgends mehr.

### 3. Anisotropie: Median plus Spanne ✔ umgesetzt

Widersprechen sich die Blätter um mehr als Faktor 1,5, steht jetzt der **Median** mit der
beobachteten Spanne als `min`/`max` — dasselbe Vorgehen wie beim Preis. Die offene Frage
bleibt daneben stehen und nennt jeden Beleg.

| | Median | Spanne | Blätter |
|---|---|---|---|
| `pla` | 0,72 | 0,32–0,89 | 20 |
| `tpu-95a` | 0,66 | 0,50–0,82 | 4 |
| `paht-cf` | 0,45 | 0,18–0,73 | 2 |
| `pet-cf` | 0,34 | 0,20–0,47 | 2 |

**Ein Vorbehalt, der in der Notiz steht:** Bei nur **zwei** Blättern ist der Median schlicht
deren Mitte — eine Zahl, die keine Quelle gemessen hat. Bei `paht-cf` und `pet-cf` ist die
Spanne deshalb die eigentliche Aussage, nicht der Wert. Die Notiz sagt das jetzt
ausdrücklich.

### 4. PCL bleibt draußen ✔ umgesetzt

Aus der Kandidatenliste gestrichen. Damit ist sie leer.

### 5. Preisquellen: ehrliche Lücken ✔ geprüft und umgesetzt

Preissuchmaschinen sind geprüft und helfen nicht:

| | Befund |
|---|---|
| **idealo**, **guenstiger.de** | liefern für `/robots.txt` eine HTML-Fehlerseite — keine lesbare Erlaubnis, also derselbe Fall wie der Bambu-EU-Store |
| **Geizhals**, **billiger.de** | robots.txt lesbar und ohne genannte KI-Agenten, aber die Suche liefert für `Fillamentum Fluorodur`, `Fillamentum OBC` und `AthenaX CF10` nichts Auswertbares |

Dazu das strukturelle Problem: Eine Preissuchmaschine listet **Preise**, keine
**Spulengewichte**. Genau daran sind `obc` und `pvdf` schon bei Fillamentum gescheitert —
ein Preis ohne Bezugsgröße ist keine Information, sondern eine Falle.

`obc`, `pvdf` und `pctg-cf` bleiben deshalb als ehrliche Lücken stehen, jede mit einer
blockierenden offenen Frage am Datensatz.

---

## Was ich selbst entschieden habe (zur Kontrolle)

| Entscheidung | wo dokumentiert |
|---|---|
| Werkstoffwert = Median aller Blätter statt des zuerst importierten | ADR-042 |
| Vorsprung nur so weit, wie die Spanne ihn deckt | ADR-043 |
| Die konservative Temperaturgrenze steht auf dem NIEDRIGSTEN Blatt | `derive-service-temperature.mjs` |
| Sieben Zahlen als `disputed` gekennzeichnet statt gelöscht oder korrigiert | ADR-042, Nachtrag · R19 |
| Izod-Werte aus dem Charpy-Feld geholt (8 Blätter) | R18 |
| Startseitenzahlen rechnen statt schreiben | `src/views/Home.tsx` |
| Schwach belegte Preise dämpfen statt Schätzungen abzuwerten | ADR-040 |
| `medium` verlangt zwei Marken, nicht nur zwei Händler | ADR-040, Nachtrag |
| `pctg-cf` anlegen, `pc-cf` ablehnen | PLAN.md §5a |
| Anycubic als 17. Marke, Spectrum um drei Blätter ergänzt | `scripts/import/*.mjs` |
| Widersprochene Anisotropiefaktoren neu bewerten statt stehen lassen | `scripts/derive-anisotropy.mjs` |
| Angebotslisten aus den Quellennotizen · Textabelle | ADR-041 |
| FormFutura nicht abrufen (robots.txt sperrt ClaudeBot) | `SOURCES.md` |
| Bambu-EU-Preise nicht erheben (keine lesbare robots.txt) | `SOURCES.md` |
| Vier Spectrum-Blätter liegen lassen (Textauszug verrutscht) | `scripts/import/spectrum.mjs` |

Jede dieser Entscheidungen ist umkehrbar und trägt ihre Begründung am Ort der Wirkung.
