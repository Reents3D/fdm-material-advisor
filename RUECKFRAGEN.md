# Rückfragen — gesammelt, nicht blockierend

Diese Datei sammelt Entscheidungen, die **Riko** treffen muss, weil sie von Fertigungs-,
Portfolio- oder Marktwissen abhängen, das nicht in den Daten steht. Alles andere ist
selbst entschieden und dokumentiert (siehe `DECISIONS.md`).

---

## OFFEN — 1. XXL-Grenzen aus eigener Fertigung

**Was das Feld ist.** Jeder Werkstoff trägt `commercial.xxl.maxSensibleEdgeMm` — laut
seiner eigenen Notiz *„keine Fertigungsgrenze, sondern eine Aufwandsschwelle: Ab dieser
Kantenlänge braucht es Brim, beheizte Kammer oder Segmentierung."* Alle 43 Werte sind
**geschätzt**, abgeleitet aus Verzugsneigung und Kammerbedarf. Keiner ist durch ein
tatsächlich gefertigtes Teil belegt.

Aktueller Stand, damit die Fragen konkret werden:

| Kante | Werkstoffe |
|---|---|
| 2.400 mm | `pla`, `pla-tough`, `esd-pla` (Verzug 1, keine Kammer) |
| 1.800 mm | die PETG- und PCTG-Familie, `pla-cf`, `greentec` (Verzug 2) |
| 1.100–1.600 mm | `asa-cf`, `pet-cf`, `asa-aero`, `obc`, `hips`, `pmma`, `pvc` (Verzug 3) |
| ≤ 900 mm | die PA-, PC- und PPS-Familie (Kammer erforderlich) |

**Die fünf Fragen — jede in einem Satz beantwortbar:**

1. **Welche Werkstoffe habt ihr tatsächlich über einen Meter Kantenlänge gefahren?**
   Nur die Namen; die Zahlen kommen aus Frage 2.

2. **Bei welcher Kantenlänge kippte es jeweils — und woran?** Verzug, Kammertemperatur,
   Bauzeit, Nachbearbeitung oder Handling. Der Grund ist wichtiger als die Zahl, weil er
   sagt, ob die Schwelle mit besserer Ausrüstung wandert.

3. **Stimmt die Reihenfolge oben überhaupt?** Sie sagt: PLA doppelt so weit wie ASA-CF,
   viermal so weit wie PA6-CF. Falls das aus der Werkstatt anders aussieht, ist nicht die
   einzelne Zahl falsch, sondern die Ableitung aus Verzug und Kammer.

4. **Ab wann segmentiert ihr grundsätzlich, unabhängig vom Werkstoff?** Das Feld
   `segmentationRecommended` steht bei allen 43 auf `true`, was es wertlos macht. Eine
   Kantenlänge, ab der ihr in der Praxis immer teilt, wäre die brauchbarere Angabe.

5. **Gibt es Werkstoffe, die ihr für XXL grundsätzlich ablehnt** — nicht weil sie nicht
   gingen, sondern weil sich der Aufwand nie lohnt?

Fünf belegte Werte würden hier mehr ändern als fünfzig geschätzte: Es ist das einzige
Kriterium, bei dem Reents3D einen Wissensvorsprung hat, den kein Datenblatt liefert.

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
