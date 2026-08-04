# FDM-Materialberater

**[→ Werkzeug öffnen](https://reents3d.github.io/fdm-material-advisor/)** · kostenlos, ohne Anmeldung

Welches FDM-Material passt zum Anwendungsfall — und **warum**. Ein quelloffener
Materialberater mit einer offenen Datenbank, in der jeder Kennwert seine Quelle, seine
Prüfnorm und seine Konfidenz mitführt.

**41 Werkstofftypen · 168 Produkte von 12 Marken · 2.820 belegte Einzelaussagen ·
20 Anwendungsfälle · 21 Medien · 29 Glossareinträge**

[![CI](https://github.com/Reents3D/fdm-material-advisor/actions/workflows/ci.yml/badge.svg)](https://github.com/Reents3D/fdm-material-advisor/actions/workflows/ci.yml)
[![Deploy](https://github.com/Reents3D/fdm-material-advisor/actions/workflows/deploy.yml/badge.svg)](https://github.com/Reents3D/fdm-material-advisor/actions/workflows/deploy.yml)
[![Code: MIT](https://img.shields.io/badge/Code-MIT-blue.svg)](LICENSE)
[![Daten: CC BY 4.0](https://img.shields.io/badge/Daten-CC%20BY%204.0-green.svg)](LICENSE-DATA)
[![KI-Einsatz: offengelegt](https://img.shields.io/badge/KI--Einsatz-offengelegt-0C4251.svg)](AI_USAGE.md)

*[English summary below](#english)*

---

## Warum noch ein Materialvergleich

Die meisten Vergleichstabellen für 3D-Druck-Material haben dieselben drei Probleme.
Dieses Werkzeug ist um genau diese drei Probleme herum gebaut.

### 1. Sie zeigen Rohstoffwerte, nicht Bauteilwerte

In den meisten Tabellen steht PLA mit 60 MPa. Hier steht es mit **35 MPa** — weil die
zugrunde liegende Quelle **gedruckte** Prüfkörper misst, nicht spritzgegossene. Für ein
FDM-Bauteil ist der gedruckte Wert der ehrliche.

### 2. Sie verschweigen die Anisotropie

Ein FDM-Bauteil ist senkrecht zur Schicht schwächer als in der Ebene. Wie viel schwächer,
steht praktisch nirgends. Hier steht es überall dort, wo ein Hersteller den Z-Wert
überhaupt angibt — bei 13 von 41 Werkstofftypen:

| Material | Zug X-Y | Zug Z | **bleibt in Z** |
|---|---:|---:|---:|
| PC | 62 MPa | 56 MPa | **90 %** |
| PLA | 35 MPa | 31 MPa | **89 %** |
| ABS | 33 MPa | 28 MPa | **85 %** |
| PETG-CF | 48 MPa | 38 MPa | **79 %** |
| PETG | 51 MPa | 35 MPa | **69 %** |
| PA6-CF | 102 MPa | 48 MPa | **47 %** |
| PET-CF | 74 MPa | 35 MPa | **47 %** |
| PPS-CF | 87 MPa | 24 MPa | **28 %** |

Die faserverstärkten Hochleistungswerkstoffe verlieren senkrecht zur Schicht **die Hälfte
bis fast drei Viertel** ihrer Festigkeit. Bei der Schlagzähigkeit ist der Einbruch noch
drastischer. Wer PPS-CF wegen der 87 MPa wählt und das Bauteil falsch orientiert, bekommt
24 — weniger als ein ABS.

Dass nur 13 von 41 Typen hier stehen, ist selbst ein Befund: **28 Hersteller nennen den
Z-Wert nicht.** Genau daran hängt die Aussage, um die es beim FDM geht.

### 3. Sie füllen jede Zelle, auch ohne Quelle

Eine vollständig gefüllte Tabelle sieht professionell aus. Sie ist meist geraten.

Hier trägt jeder Wert eine Konfidenzstufe, und geschätzte Werte sind in der Oberfläche
sichtbar markiert. Über die gesamte Datenbank, 2.820 Einzelaussagen:

| Konfidenz | Anteil | bedeutet |
|---|---:|---|
| `high` | 2 % | Prüfbericht oder Normkonformitätserklärung |
| `medium` | 23 % | Herstellerdatenblatt mit Prüfnorm |
| `low` | 7 % | Datenblatt ohne Norm, oder eine einzige Quelle |
| `estimated` | 69 % | begründete Ableitung, kein Messwert |

**Zwei Drittel sind Schätzungen.** Diese Zahl steht im Werkzeug auf jeder Ergebniskarte,
nicht im Kleingedruckten. Und sie kostet: Der Eignungswert wird mit der Datenabdeckung
multipliziert — was nicht belegt ist, wird nicht gutgeschrieben.

### 4. Sie geben Grenzen aus, die vom Bauteil abhängen, nicht vom Werkstoff

„PETG bis 55 °C" liest sich wie eine Werkstoffeigenschaft. Es ist keine. Was einen
Thermoplast in der Wärme begrenzt, ist **Kriechen unter dauernder Spannung** — und die
Spannung senkt man mit Wandstärke und Füllgrad. Dieselbe Type trägt unbelastet bis an
ihre gemessene Formbeständigkeit heran und unter Dauerlast deutlich weniger.

Deshalb fragt der Assistent nach der Last, und die Antwort entscheidet, welche Zahl das
Urteil trägt. PETG bei 60 °C: unbelastet ohne Vorbehalt, unter Dauerlast mit Warnung und
dem konstruktiven Ausweg dazu.

Dieselbe Verwechslung gab es bei der **Bauteilgröße**. Die Kantenlänge, ab der ein
Werkstoff aufwendig wird, ist keine Werkstoffeigenschaft — begrenzt wird die Größe vom
Bauraum und vom Verfahren, nicht vom Polymer. Mit beheizter Kammer und Segmentierung
läuft praktisch jeder dieser Werkstoffe auf zwei Meter und darüber. Das Feld sagt jetzt
„ab hier wird es aufwendig" und stuft ab, statt zu streichen. Ausdrücklich **nicht**
hinterlegt ist der Bauraum irgendeiner konkreten Maschine — auch nicht der des
Herausgebers.

---

## Was es kann

- **Geführte Beratung** — sechs überspringbare Schritte zu einer begründeten Empfehlung,
  mit benannten Schwerpunkten statt sechzehn nackter Regler. Wer sich auf null Treffer
  filtert, erfährt an Ort und Stelle, **welche** Anforderung alles ausgeschlossen hat
- **20 fertige Anwendungsfälle** — vom Messebau-Großteil bis zur Chemiewanne, jeder mit
  vollständigem Anforderungsprofil; ein Klick statt sechs Schritte
- **„Warum nicht X?"** — für jedes Material die vollständige Constraint-Auswertung, auch
  für ausgeschlossene. Drei Zustände: durchgefallen, knapp bestanden, glatt bestanden
- **„Reicht auch etwas Einfacheres?"** — der günstigste Werkstoff, der die Anforderungen
  trotzdem erfüllt, samt Preis des Verzichts. Beantwortet die Frage, die die
  Kompromissansicht strukturell nicht beantworten kann: Ein Allrounder wie PETG liegt bei
  Perzentilbewertung überall im Mittelfeld und fällt sonst durch das Raster
- **Kompromissanalyse** — „PC statt PA6-CF: +86 % Schichthaftung, −64 % Steifigkeit",
  mit absoluten Werten statt Adjektiven
- **Verfahrensweiche** — wenn FDM prinzipbedingt nicht kann, was gefordert ist, sagt es
  das und nennt SLA, SLS, CNC oder Guss
- **Sensitivität** — „Gewichten Sie den Preis höher, führt PETG"
- **Kennwerte-Diagramm** — zwei beliebige Eigenschaften gegeneinander (Ashby-Stil)
- **Festigkeit gegen Preis** — €/kg und MPa je €/kg als sortierbare Spalten
- **Brandschutzansicht** — welche Type welche UL94-Klasse trägt. Eine Klasse am Produkt
  gibt die Familie ausdrücklich **nicht** frei: PETG ist nicht V-0, nur die
  flammgeschützte Type ist es, und die Begründung nennt Marke und Produktnamen
- **Vergleich** von bis zu fünf Materialien, druckbar als PDF für die Projektakte
- **PDF-Bericht** im Reents-Briefkopf: Anforderungsprofil, Empfehlung, Begründung,
  Ausschlussgründe, Datenlage und Quellenverzeichnis in einem Dokument
- **CSV-Export** für Excel — Ergebnis, Vergleich und der gesamte Datenbestand,
  Einzelkennwerte samt Quelle, Prüfnorm und Konfidenz
- **Läuft ohne Netz.** Einmal geladen, arbeitet das Werkzeug offline weiter —
  Messehalle, Werkstatt, Zug. Installierbar als App auf dem Startbildschirm
- **Teilbare Links** — der komplette Zustand steckt in der URL

Kein Backend, keine Cookies, kein Tracking, keine externen Ressourcen. Läuft offline.

---

## Wie das Scoring funktioniert

1. **Hard Constraints.** Temperatur, Kammerverfügbarkeit, gehärtete Düse, Witterung,
   Medien, Regulatorik filtern hart. Jede Ausfilterung wird protokolliert und ist
   abrufbar.
2. **Perzentil-Normalisierung.** Jedes Kriterium wird auf seinen Rang in der Datenbank
   normiert, nicht auf Min/Max. Sonst würde ein einzelner Exot wie PPS-CF alle anderen
   Werte zusammenstauchen.
3. **Gewichtete Summe** über die vom Nutzer priorisierten der 16 Kriterien. Fehlende
   Daten zählen **nicht als Null**, sondern fallen aus der Gewichtung heraus und werden
   als Datenlücke ausgewiesen.
4. **Abdeckung als Faktor.** Der Wert wird mit dem Anteil der Gewichtung multipliziert,
   zu dem überhaupt Daten vorliegen. Ein Werkstoff ohne Kennwert zu einem hoch
   gewichteten Kriterium schlägt damit keinen mit einem schlechten Kennwert — vorher tat
   er das, weil er sich aus dem Mittelwert einfach heraushielt.
5. **Erklärung.** Die Engine erzeugt keine Freitexte, sondern typisierte
   `{key, params}`-Objekte, die die i18n-Schicht rendert. Nichts kann behauptet werden,
   was nicht im Datensatz steht.
6. **Kompromisse.** Kandidaten mit ≥ 80 % des Bestwerts, die in mindestens einer
   gewichteten Dimension besser sind, mit Delta in Rohwerten. Daneben der pragmatische
   Ausweg nach anderem Kriterium: erfüllt alles und ist deutlich günstiger.

Zwei Regeln, die das Ranking gegen sich selbst absichern:

- Ein Material, das eine Anforderung **nur mangels Daten** passiert, wird nie über eines
  gerankt, das sie belegt erfüllt. Es erscheint als „nicht belegt" ganz unten.
- **Eine Schätzung darf abstufen, nie ausschließen.** Ein Constraint prüft zuerst den
  belegten Wert; reißt nur die konservative Schätzung, bleibt der Werkstoff drin und
  trägt eine Warnung. Anlass war ein Fehler aus der Werkstatt: Der Anwendungsfall
  „Messebau-Großteil" empfahl ein schäumendes Leichtbaufilament für ein Zwei-Meter-Modell
  — nicht weil es passte, sondern weil fünf geschätzte Grenzwerte alles andere
  aussortiert hatten. Keiner davon war durch eine Messung gedeckt.

---

## Herstellerunabhängig

Betrieben wird das Werkzeug von der **Reents Technologies GmbH** — einem
3D-Druck-**Dienstleister**, keinem Materialhersteller. Es gibt kein eigenes Filament zu
bewerben: Alle gängigen Werkstoffe werden eingekauft und auf demselben Maschinenpark
verarbeitet.

Konkret heißt das:

- **Kein Hersteller zahlt für Platzierung**, es gibt keine Affiliate-Links.
- Die Reihenfolge folgt allein aus den eingegebenen Anforderungen und den
  Datenblattwerten.
- Ob ein Material gerade im Haus vorrätig ist, geht **unter keinen Umständen** in
  Filterung oder Scoring ein. Festgehalten als [ADR-004](DECISIONS.md#adr-004) und
  erzwungen durch [`portfolio-neutrality.test.ts`](tests/engine/portfolio-neutrality.test.ts):
  identische Rankings bei „alles vorrätig", „nichts vorrätig" und gemischt.

Beschaffung ist ein Bestell-, kein Auswahlproblem — deshalb kostet Neutralität hier
nichts und ist einfach die richtige Voreinstellung.

---

## Die Datenbank ohne die App nutzen

`data/materials/*.json` ist bewusst so gebaut, dass es eigenständig lesbar ist. Jede
Datei trägt ihre Quellen selbst.

```jsonc
"tensileStrengthZ": {
  "value": 38, "tolerance": 3, "unit": "MPa",
  "testStandard": "ISO 527 / GB/T 1040",
  "orientation": "Z",                       // Pflicht bei Mechanik
  "conditions": "100 % Infill, 8 h bei 65 °C vorbehandelt",
  "source": "src_bambu_tds",
  "confidence": "medium",
  "note": { "de": "…", "en": "…" }
}
```

Die Engine ist framework-frei und ohne React nutzbar — auch in Odoo oder n8n:

```ts
import { select } from "fdm-material-advisor/engine";
const result = select(materials, { serviceTemperatureC: 80, chamberAvailable: false });
```

Feldreferenz: **[DATA_MODEL.md](DATA_MODEL.md)** · Quellenpolitik: **[SOURCES.md](SOURCES.md)**

---

## Mitmachen

Korrekturen sind ausdrücklich willkommen — besonders von Leuten, die die Werkstoffe
täglich fahren.

### Sie sind Materialhersteller und fehlen hier?

Schicken Sie Ihre gesammelten Datenblätter an **[info@reents3d.de](mailto:info@reents3d.de)**
— wir pflegen sie ein. Kostenlos und ohne Gegenleistung: Es gibt keine bezahlte
Platzierung und keine Affiliate-Links, die Reihenfolge entsteht allein aus den
Anforderungen des Nutzers und den Werten auf Ihren Blättern (siehe
[Herstellerunabhängig](#herstellerunabhängig)).

Am meisten hilft, was die wenigsten veröffentlichen:

- **Kennwerte an gedruckten Prüfkörpern** statt Rohstoffdaten aus dem Spritzguss
- **Bauorientierung, Infill und Druckparameter** zu jedem Wert
- **Z-Werte** — nur eine Handvoll Hersteller im Bestand gibt sie überhaupt an, und
  genau daran hängt die Aussage, um die es in diesem Werkzeug geht
- **Prüfnorm und Prüfbedingung** an jeder Zeile

Widersprüche und Auffälligkeiten in einem Blatt werden dokumentiert, nicht geglättet —
das gilt für alle Marken gleichermaßen. Wer das nicht möchte, schickt besser nichts.

Node 24 (oder mindestens 23.6) — der CSV-Export lädt die TypeScript-Bausteine
ohne Buildschritt, damit veröffentlichte und heruntergeladene Tabelle aus
derselben Quelle stammen.

```bash
git clone https://github.com/Reents3D/fdm-material-advisor.git
cd fdm-material-advisor && npm install
npm run dev        # Entwicklungsserver
npm run validate   # Schema + Plausibilität + Provenienz
npm run ci         # alles, wie in der Pipeline
```

**Die CI blockt einen Wert mit `confidence: high` oder `medium` ohne echte Quelle.**
Das ist Absicht. 16 Plausibilitätsregeln (R0–R15) prüfen außerdem, dass Z nie über X-Y
liegt, die HDT unterhalb Tg plus Toleranz bleibt, das Bett unter der Düse, jede
Quellenkennung auflösbar ist, jede Bewertungsskala registriert und jeder i18n-Text in
beiden Sprachen vorliegt. Dazu 122 Tests, darunter fachliche Szenarien: Wenn die Engine
einem Anwendungsfall die falsche Antwort gibt, geht der Lauf rot — auch dann, wenn die
Arithmetik stimmt.

Wenn eine Regel einen **richtigen** Wert bemängelt, wird die Regel verengt, nie der Wert
geglättet. Das ist die Hausordnung, nicht nur eine Redensart.

Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Grenzen — ehrlich

- **41 Werkstofftypen**, nicht 60. Der Ausbau läuft; siehe [PLAN.md](PLAN.md).
- **Zwei Drittel der Aussagen sind Schätzungen** (69 %). Belegt sind 31 %, davon nur 2 %
  aus Prüfberichten. Das ist keine Panne, sondern der Zustand der Branche: Was Hersteller
  nicht veröffentlichen, kann hier nur abgeleitet werden — sichtbar gekennzeichnet.
- **Nur 13 von 41 Typen haben einen Z-Kennwert.** Die Anisotropie ist der Kern dieses
  Werkzeugs, und bei zwei Dritteln des Bestands fehlt die Zahl dazu schlicht.
- **Die Preise sind erhoben — für 33 von 41 Typen.** 154 Händlerangebote aus dem
  europäischen Fachhandel, jedes mit Marke, Produkt, Spulengewicht, Preis, Fundstelle und
  Abrufdatum in [`data/prices.json`](data/prices.json). `npm run survey:prices` holt sie
  neu: Das Skript liest die JSON-LD-Daten, die die Shops für Maschinen veröffentlichen,
  bei einem Aufruf pro Sekunde und mit einem User-Agent, der sagt, wer da liest. Nur
  Shops, deren robots.txt es erlaubt; wer hinter Bot-Schutz liegt, wird übersprungen und
  protokolliert, nicht umgangen. Nur elf Typen tragen `medium` — dafür braucht es fünf
  Angebote von **mindestens zwei** Anbietern, denn fünf Preise aus demselben Shop sind
  eine Preisliste, kein Markt. Geführt ist der Median, die Spanne
  ist das günstigste bis teuerste gefundene Angebot. Acht Typen haben noch gar kein
  Angebot und tragen weiter eine Schätzung — sichtbar als solche markiert.
  **Die Erhebung hat die vorherigen Schätzungen widerlegt, und zwar einseitig:** 14 von 16
  prüfbaren Werten lagen zu hoch, mehrere drastisch (TPU 95A +74 %, PC-FR +67 %,
  ASA-CF +44 %, PC +39 %). Geschätzt wurde nach Werkstoffklasse statt nach dem, was
  Filament dieser Klasse im Handel wirklich kostet — derselbe Fehler wie zuvor bei
  PPS-CF (275 statt 179 €/kg), nur flächendeckend.
- **Werkstatterfahrung deckt 18 von 41 Typen** und nur zwei Felder: Lackhaftung und
  Klebbarkeit. Sie steht ausdrücklich als eigene Quelle (`field_experience_reents`) und
  wird von keinem Importlauf überschrieben. XXL-Grenzen bleiben abgeleitet.
- **Datenblattfehler werden dokumentiert, nicht korrigiert.** Drei stehen aktuell so im
  Bestand: Bambu gibt für PC die HDT bei 1,8 MPa höher an als bei 0,45 MPa, was
  physikalisch nicht geht; PLA und PA6-CF tragen in Z eine höhere Schlagzähigkeit als in
  X-Y. Alle drei mit niedriger Konfidenz und offener Frage — geglättet wird nichts.
- **Die Anwendungsfälle sind fachlich noch nicht freigegeben.** 18 der 20 tragen
  `reviewedBy: "Claude Code — fachliche Freigabe ausstehend"`. Zwei sind nach einem
  Werkstattbefund korrigiert und gegengezeichnet.
- **Drei Typen sind erst seit dem 2026-08-02 dabei** und stehen auf je EINEM Blatt:
  ABS-GF, PLA-CF und PCTG-GF. Eine einzelne Quelle zeigt keine Streuung — ihre
  Datenblattwerte tragen deshalb `low`, nicht `medium`. PLA-CF bringt einen Befund mit:
  ungekerbt 100 kJ/m² gegen gekerbt 3,1 — Faktor 32. Dokumentiert, und er geht nicht in
  die Zähigkeitsbewertung ein.

- **Kältezähigkeit fehlt als eigenes Kriterium.** Das Kriterium `toughness` liest die
  Bruchdehnung — im Anwendungsfall „Kälte" gewinnt TPU deshalb, weil es sich dehnt, nicht
  weil es Kälte aushält. Maßgeblich wäre die Kerbschlagzähigkeit bei −30 °C. Vorgemerkt
  als ADR-023.

---

## Wie diese Daten entstehen — Einsatz von KI

Dieses Projekt wird mit Unterstützung von KI erstellt und gepflegt. Sie erschließt
Herstellerdatenblätter, überführt sie ins Schema und liest über tausend Einzelwerte
systematisch gegen — Widersprüche zwischen Datenblättern findet ein Mensch bei dieser Menge
kaum noch. Auch der Code stammt daher.

**Die veröffentlichte Anwendung enthält keine KI.** Kein Modell, kein API-Aufruf, keine
Generierung zur Laufzeit. Dieselbe Eingabe ergibt immer dieselbe Empfehlung, nachvollziehbar
aus den Daten in diesem Repository. Auch die Begründungen sind strukturierte Objekte, keine
generierten Sätze.

Die Zahlen stammen aus den Datenblättern, nicht aus dem Modell. Jeder Wert führt seine
Quelle mit, jedes Produkt verlinkt sein PDF mit Abrufdatum — jede Zahl ist am Original
nachprüfbar. Wo kein Datenblatt existiert, steht sichtbar `estimated`. Widersprüchliche
Herstellerangaben werden als Befund dokumentiert und nicht stillschweigend geglättet.

Ausführlich, mit den Schutzmechanismen gegen erfundene Werte: **[AI_USAGE.md](AI_USAGE.md)**

## Haftungsausschluss

Alle Werte sind Richtwerte. Sie ersetzen **keine Bauteilqualifizierung**. FDM-Bauteile
sind anisotrop; die Eigenschaften hängen stark von Orientierung, Parametern, Anlage und
Charge ab. Für sicherheitsrelevante, medizinische, lebensmittelnahe oder tragende
Anwendungen ist eine eigene Prüfung zwingend. **Materialfreigabe ist keine
Bauteilfreigabe.**

Vollständig: **[DISCLAIMER.md](DISCLAIMER.md)**

## Lizenz und Nachnutzung

- **Code:** [MIT](LICENSE)
- **Daten und Schema:** [CC BY 4.0](LICENSE-DATA) — Begründung: [ADR-002](DECISIONS.md#adr-002)
- **Schriften:** Montserrat und Sora, [SIL Open Font License 1.1](src/styles/fonts/OFL.txt)

Die Datenlizenz deckt die **kuratierte Zusammenstellung**, gestützt auf das
Datenbankherstellerrecht (§ 87a UrhG). Die Messwerte selbst sind gemeinfreie Fakten und
tragen ihre Quelle. Herstellerdatenblätter sind fremde Werke; sie werden ausgewertet,
verlinkt und datiert, aber **nicht mitgeliefert** — siehe
[ADR-034](DECISIONS.md#adr-034--die-fundstelle-ist-der-beleg-nicht-die-kopie).

**Nachnutzung ist ausdrücklich erwünscht.** CC BY 4.0 verlangt dafür verbindlich
Namensnennung, Lizenzhinweis und einen Link auf die Quelle — das ist keine Bitte, sondern
Lizenzbedingung. Bitte verwenden Sie diese Angabe:

> Materialdaten: **FDM-Materialberater** der [Reents Technologies GmbH](https://reents3d.de),
> lizenziert unter [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de).
> Quelle: https://github.com/Reents3D/fdm-material-advisor

Als HTML:

```html
Materialdaten: <a href="https://reents3d.de">FDM-Materialberater, Reents Technologies GmbH</a>,
<a href="https://creativecommons.org/licenses/by/4.0/deed.de">CC BY 4.0</a>
```

Marken Dritter gehören ihren Inhabern und werden nur zur Quellenangabe genannt.

---

## Betreiber

**Reents Technologies GmbH** — Marke **Reents3D**
Lehmweg 95-97, 25488 Holm bei Hamburg · [reents3d.de](https://reents3d.de)

Über 50 Maschinen & Anlagen · Bauteile bis 2,4 m am Stück · FDM, SLA, SLS · Veredelung inhouse ·
NDA-fähig, Daten auf lokalem Server

[Impressum](https://reents3d.de/impressum/) · [Datenschutz](https://reents3d.de/datenschutz/)

---

<a id="english"></a>

## English

**[→ Open the tool](https://reents3d.github.io/fdm-material-advisor/)** — free, no sign-up.
The interface switches to English in the header.

An open-source FDM material advisor with an open database in which every property value
carries its source, its test standard and a confidence rating.

**41 material types · 168 products from 12 brands · 2,820 sourced statements ·
20 use cases · 21 media · 29 glossary entries**

**What makes it different:**

- **Printed specimens, not resin data.** PLA is listed at 35 MPa, not the 60 MPa found in
  resin datasheets — because the underlying source tests printed specimens.
- **Anisotropy is reported.** How much strength remains perpendicular to the layers:
  between 28 % (PPS-CF) and 90 % (PC). Almost no comparable tool states this — and that
  only 13 of 41 types carry a Z value at all is itself the finding.
- **Estimated values are marked.** 69 % of statements in the database are flagged
  estimates rather than measurements; 2 % come from test reports. That number is
  displayed, not hidden — and it costs: the suitability score is multiplied by data
  coverage, so what is not documented is not credited.
- **Limits that depend on the part, not the polymer.** A continuous service temperature
  is a statement about creep under sustained stress — and stress is what wall thickness
  and infill reduce. The tool therefore asks whether the part is loaded, and the answer
  decides which figure rules. Part size works the same way: it downgrades with an
  effort note instead of excluding, because size is limited by the build volume and the
  process, not by the material.
- **An estimate may downgrade, never exclude.** A constraint checks the documented value
  first. Only when that fails too is a material ruled out.
- **Independent of manufacturers.** The operator is a 3D printing service provider, not a
  material producer, and can buy and process any material. Whether a material is in stock
  never enters the ranking — enforced by a test, documented as ADR-004.

**Use of AI:** this project is built and maintained with AI assistance — extracting
manufacturer datasheets into the schema, cross-reading over a thousand sourced values for
contradictions, and writing the code. **The published application contains no AI:** no
model, no API call, nothing generated at runtime. The numbers come from the datasheets,
not from the model; every product links its source PDF with a retrieval date, and values
without a datasheet are visibly marked `estimated`. Details: [AI_USAGE.md](AI_USAGE.md).

**Engine:** hard constraints → percentile normalisation → weighted scoring → coverage
multiplier → typed explanations → trade-off analysis with absolute deltas. Missing data
never counts as zero, and a material that passes a requirement only for lack of data is
never ranked above one that demonstrably meets it.

**Are you a material manufacturer and missing here?** Send your collected datasheets to
[info@reents3d.de](mailto:info@reents3d.de) and we will add them. Free and with nothing
expected in return: there is no paid placement and there are no affiliate links. Most
useful is what fewest publish — values from **printed** specimens, build orientation and
print parameters, **Z values**, and the test standard on every line. Contradictions
within a datasheet are documented rather than smoothed over, for every brand alike.

Code MIT, data CC BY 4.0. Contributions welcome — CI rejects any value marked `high` or
`medium` confidence without a real source, and 16 plausibility rules plus 122 tests run
on every push.
