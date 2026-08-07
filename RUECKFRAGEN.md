# Rückfragen — gesammelt, nicht blockierend

Diese Datei sammelt Entscheidungen, die **Riko** treffen muss, weil sie von Fertigungs-,
Portfolio- oder Marktwissen abhängen, das nicht in den Daten steht. Alles andere ist
selbst entschieden und dokumentiert (siehe `DECISIONS.md`).

Die Reihenfolge ist nach **Wirkung** sortiert, nicht nach Aufwand: oben steht, was am
meisten am Ergebnis ändert.

---

## 1. XXL-Grenzen aus eigener Fertigung — betrifft 43 Werte

**Stand:** Jeder Werkstoff trägt `commercial.xxl.maxSensibleEdgeMm` — die Kantenlänge, ab
der ein Bauteil aufwendig wird. Alle 43 Werte sind **geschätzt** aus Kammerbedarf,
Verzugsneigung und Schichthaftung. Keiner ist durch eine tatsächlich gefertigte Kante
belegt.

**Warum das zählt:** Es ist das einzige Kriterium, bei dem Reents3D einen Wissensvorsprung
hat, den kein Datenblatt liefert. Die Schätzungen sind plausibel, aber sie sind der Grund,
warum `xxl` bei 42 von 43 Werkstoffen auf `estimated` steht.

**Gebraucht wird:** Für die Werkstoffe, die tatsächlich in XXL gefahren wurden, die real
erreichte Kantenlänge und woran es dann scheiterte (Verzug, Kammer, Zeit, Nachbearbeitung).
Fünf belegte Werte würden mehr ändern als fünfzig geschätzte.

---

## 2. Portfolio-Status — betrifft die Glaubwürdigkeit, nicht die Rechnung

**Stand:** `commercial.reentsPortfolioStatus` steht bei allen 43 Werkstoffen auf
`unknown`. Das Feld fließt per ADR-004 **unter keinen Umständen** in Filterung oder
Bewertung ein, und ein Test (`portfolio-neutrality.test.ts`) erzwingt das.

**Gebraucht wird:** Welche Werkstoffe fertigt Reents3D selbst, welche über Partner, welche
gar nicht? Das Feld ist als neutrales Abzeichen gedacht — „das drucken wir" —, nicht als
Empfehlung.

**Rückfrage dahinter:** Soll es überhaupt angezeigt werden? Ein Materialberater, der bei
manchen Werkstoffen „aus unserem Programm" schreibt, wird als Werbung gelesen, auch wenn
die Rechnung sauber ist.

---

## 3. Anisotropie: Ein Wert je Werkstoff oder eine Spanne?

**Stand (seit 2026-08-06):** Drei Werkstoffe haben ihren Anisotropiefaktor **verloren**,
weil ihre Belege sich widersprechen — `pla` (20 Blätter, 0,32 bis 0,89), `pet-cf` (0,20 bis
0,47), `tpu-95a` (0,50 bis 0,82). Die Regel dahinter: keine Zahl statt einer falschen.

**Das Problem an der Regel:** Bei `pla` ist die Streuung wahrscheinlich **echt** — Silk-PLA
haftet nachweislich schlechter als Basic-PLA, das sind verschiedene Produkte unter einem
Typnamen. „Kein Wert" ist dann auch nicht die Wahrheit.

**Drei Möglichkeiten, alle vertretbar:**

| | was der Nutzer sieht | Preis |
|---|---|---|
| **a) so lassen** | keine Anisotropieangabe für PLA | das meistgenutzte Material verliert seine wichtigste Warnung |
| **b) Median plus Spanne** | „0,58, Spanne 0,32–0,89 über 20 Blätter" | ein Median ist eine erfundene Zahl — oder eine Zusammenfassung, wie beim Preis auch |
| **c) je Produkt statt je Werkstoff** | die Zahl steht am Produkt, nicht am Typ | ehrlichster Weg, aber die Engine rechnet auf Werkstoffebene |

**Meine Einschätzung:** (b), weil es genau das Vorgehen ist, das `derive-price.mjs` beim
Preis schon fährt — Median als Wert, beobachtete Spanne als `min`/`max`. Ich habe es nicht
gebaut, weil es ändert, was das Werkzeug über sein meistgenutztes Material sagt.

---

## 4. PCL — aufnehmen oder streichen?

**Stand:** Steht seit dem FormFutura-Import als Kandidat. Ein Blatt (BioFil PCL), neun
Kennwerte, Prüfkörper nicht deklariert. Die Zahlen passen nicht zusammen: 45 MPa
Zugfestigkeit bei 350 MPa Modul und Shore D 46 — Literaturwerte liegen bei rund 16 MPa.

**Gebraucht wird:** Eine Entscheidung, ob PCL für die Zielgruppe überhaupt vorkommt.
Es ist ein Niedrigtemperatur-Werkstoff für Modellbau und Medizintechnik, kein
Konstruktionsmaterial. Wenn nein, streiche ich den Kandidaten; wenn ja, brauche ich eine
zweite Quelle, bevor ich ihn anlege.

---

## 5. Werkstoffe ohne Preisquelle: aufgeben oder von Hand erheben?

**Stand:** `obc`, `pvdf` und `pctg-cf` haben keinen erhobenen Preis. Bei allen dreien ist
der Grund strukturell und nicht durch mehr Arbeit lösbar:

- `obc` und `pvdf` führt nur Fillamentum, und deren Angebote nennen kein Spulengewicht
- `pctg-cf` führt nur FormFutura, und deren robots.txt sperrt Anthropics Agenten

**Möglichkeit:** Von Hand im Browser ablesen, so wie der eine Bambu-Preis im Bestand.
Das ist zulässig — es steht als Verfahren in `SOURCES.md` — aber es altert, ohne dass ein
Skript es nachzieht.

**Rückfrage:** Drei handerhobene Preise mit Ablaufdatum, oder drei ehrliche Lücken?

---

## 6. Was ich selbst entschieden habe (zur Kontrolle)

Damit nachvollziehbar bleibt, was **ohne** Rückfrage entschieden wurde:

| Entscheidung | wo dokumentiert |
|---|---|
| Schwach belegte Preise dämpfen statt Schätzungen abzuwerten | ADR-040 |
| `medium` verlangt zwei Marken, nicht nur zwei Händler | ADR-040, Nachtrag |
| `pctg-cf` anlegen, `pc-cf` ablehnen | PLAN.md §5a |
| Anycubic als 17. Marke aufnehmen | `scripts/import/anycubic.mjs` |
| Widersprochene Anisotropiefaktoren entfernen statt kommentieren | `scripts/derive-anisotropy.mjs` |
| Angebotslisten aus den Quellennotizen | ADR-041 |
| Textabelle für zweisprachige Texte | ADR-041 |
| FormFutura nicht abrufen (robots.txt sperrt ClaudeBot) | `SOURCES.md` |
| Bambu-EU-Preise nicht erheben (keine lesbare robots.txt) | `SOURCES.md` |

Jede dieser Entscheidungen ist umkehrbar und trägt ihre Begründung am Ort der Wirkung.
