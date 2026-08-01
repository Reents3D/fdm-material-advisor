# FDM-Materialberater

**[→ Werkzeug öffnen](https://reents3d.github.io/fdm-material-advisor/)** · kostenlos, ohne Anmeldung

Welches FDM-Material passt zum Anwendungsfall — und **warum**. Ein quelloffener
Materialberater mit einer offenen Datenbank, in der jeder Kennwert seine Quelle, seine
Prüfnorm und seine Konfidenz mitführt.

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
steht praktisch nirgends. Hier steht es für jeden Werkstoff:

| Material | Zug X-Y | Zug Z | **bleibt in Z** |
|---|---:|---:|---:|
| PC | 62 MPa | 56 MPa | **90 %** |
| PLA | 35 MPa | 31 MPa | **89 %** |
| ABS | 33 MPa | 28 MPa | **85 %** |
| PETG | 51 MPa | 35 MPa | **69 %** |
| PETG-CF | 59 MPa | 38 MPa | **64 %** |
| PET-CF | 74 MPa | 35 MPa | **47 %** |
| PA6-CF | 102 MPa | 48 MPa | **47 %** |

Die faserverstärkten Hochleistungswerkstoffe verlieren senkrecht zur Schicht **mehr als
die Hälfte** ihrer Festigkeit. Bei der Schlagzähigkeit ist der Einbruch noch drastischer.
Wer PA6-CF wegen der 102 MPa wählt und das Bauteil falsch orientiert, bekommt 48.

### 3. Sie füllen jede Zelle, auch ohne Quelle

Eine vollständig gefüllte Tabelle sieht professionell aus. Sie ist meist geraten.

Hier trägt jeder Wert eine Konfidenzstufe, und geschätzte Werte sind in der Oberfläche
sichtbar markiert. Über die gesamte Datenbank: **43 % der Aussagen sind belegt, 51 %
sind gekennzeichnete Schätzungen.** Diese Zahl wird angezeigt, nicht versteckt.

---

## Was es kann

- **Geführte Beratung** — sieben überspringbare Schritte zu einer begründeten Empfehlung
- **„Warum nicht X?"** — für jedes Material die vollständige Constraint-Auswertung, auch
  für ausgeschlossene
- **Kompromissanalyse** — „PC statt PA6-CF: +86 % Schichthaftung, −64 % Steifigkeit",
  mit absoluten Werten statt Adjektiven
- **Verfahrensweiche** — wenn FDM prinzipbedingt nicht kann, was gefordert ist, sagt es
  das und nennt SLA, SLS, CNC oder Guss
- **Sensitivität** — „Gewichten Sie den Preis höher, führt PETG"
- **Kennwerte-Diagramm** — zwei beliebige Eigenschaften gegeneinander (Ashby-Stil)
- **Vergleich** von bis zu fünf Materialien, druckbar als PDF für die Projektakte
- **Teilbare Links** — der komplette Zustand steckt in der URL

Kein Backend, keine Cookies, kein Tracking, keine externen Ressourcen. Läuft offline.

---

## Wie das Scoring funktioniert

1. **Hard Constraints.** Temperatur, Kammerverfügbarkeit, gehärtete Düse, Bauteilgröße,
   Witterung, Medien, Regulatorik filtern hart. Jede Ausfilterung wird protokolliert und
   ist abrufbar.
2. **Perzentil-Normalisierung.** Jedes Kriterium wird auf seinen Rang in der Datenbank
   normiert, nicht auf Min/Max. Sonst würde ein einzelner Exot wie PEEK alle anderen
   Werte zusammenstauchen.
3. **Gewichtete Summe** über die vom Nutzer priorisierten Kriterien. Fehlende Daten
   zählen **nicht als Null**, sondern fallen aus der Gewichtung heraus und werden als
   Datenlücke ausgewiesen.
4. **Erklärung.** Die Engine erzeugt keine Freitexte, sondern typisierte
   `{key, params}`-Objekte, die die i18n-Schicht rendert. Nichts kann behauptet werden,
   was nicht im Datensatz steht.
5. **Kompromisse.** Kandidaten mit ≥ 80 % des Bestwerts, die in mindestens einer
   gewichteten Dimension besser sind, mit Delta in Rohwerten.

Ein Material, das eine Anforderung **nur mangels Daten** passiert, wird nie über eines
gerankt, das sie belegt erfüllt. Es erscheint als „nicht belegt" ganz unten.

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

```bash
git clone https://github.com/Reents3D/fdm-material-advisor.git
cd fdm-material-advisor && npm install
npm run dev        # Entwicklungsserver
npm run validate   # Schema + Plausibilität + Provenienz
npm run ci         # alles, wie in der Pipeline
```

**Die CI blockt einen Wert mit `confidence: high` oder `medium` ohne echte Quelle.**
Das ist Absicht. 15 Plausibilitätsregeln prüfen außerdem, dass Z nie über X-Y liegt, die
HDT unterhalb Tg plus Toleranz bleibt, das Bett unter der Düse und jeder i18n-Text in
beiden Sprachen vorliegt.

Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Grenzen — ehrlich

- **11 Materialien**, nicht 60. Der Ausbau läuft; siehe [PLAN.md](PLAN.md).
- **Eine Herstellerquelle dominiert.** Die Kennwerte stammen überwiegend von Bambu Lab.
  Das ist methodisch ein Vorteil (ein Labor, eine Methode, X-Y **und** Z, gedruckte
  Prüfkörper — dadurch untereinander vergleichbar) und zugleich eine Schwäche: eine
  zweite unabhängige Quelle je Material fehlt noch.
- **Preise sind geschätzt.** Eine echte Markterhebung steht aus.
- **Kein Feld hat Reents3D-Werkstatterfahrung.** XXL-Grenzen, Lackhaftung und
  Verklebbarkeit sind abgeleitet, nicht gemessen.
- **Ein Datenblattfehler ist dokumentiert, nicht korrigiert:** Bambu gibt für PC die HDT
  bei 1,8 MPa höher an als bei 0,45 MPa, was physikalisch nicht geht. Der Wert steht mit
  niedriger Konfidenz und offener Frage im Datensatz — geglättet wird nichts.

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

**What makes it different:**

- **Printed specimens, not resin data.** PLA is listed at 35 MPa, not the 60 MPa found in
  resin datasheets — because the underlying source tests printed specimens.
- **Anisotropy is reported.** For every material: how much strength remains perpendicular
  to the layers. Between 47 % (PA6-CF, PET-CF) and 90 % (PC). Almost no comparable tool
  states this.
- **Estimated values are marked.** 51 % of statements in the database are flagged
  estimates rather than measurements. That number is displayed, not hidden.
- **Independent of manufacturers.** The operator is a 3D printing service provider, not a
  material producer, and can buy and process any material. Whether a material is in stock
  never enters the ranking — enforced by a test, documented as ADR-004.

**Use of AI:** this project is built and maintained with AI assistance — extracting
manufacturer datasheets into the schema, cross-reading over a thousand sourced values for
contradictions, and writing the code. **The published application contains no AI:** no
model, no API call, nothing generated at runtime. The numbers come from the datasheets,
not from the model; every product links its source PDF with a retrieval date, and values
without a datasheet are visibly marked `estimated`. Details: [AI_USAGE.md](AI_USAGE.md).

**Engine:** hard constraints → percentile normalisation → weighted scoring → typed
explanations → trade-off analysis with absolute deltas. Missing data never counts as
zero, and a material that passes a requirement only for lack of data is never ranked
above one that demonstrably meets it.

Code MIT, data CC BY 4.0. Contributions welcome — CI rejects any value marked `high` or
`medium` confidence without a real source.
