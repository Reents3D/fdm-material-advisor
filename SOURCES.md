# SOURCES.md — Quellenverzeichnis und Zitierregeln

**Stand:** 2026-08-04 · **Ausgewertete Quellen:** 192 Herstellerdatenblätter aus 14 Marken,
dazu eine Marktdatenbank (`src_ofd`). Abschnitt 3 führt die Quellen aus, die für die
Modellbildung ausschlaggebend waren; die vollständige Liste steht datensatzweise in
`governance.sources[]`.

---

## 1. Zitierregeln — verbindlich

### 1.1 Was übernommen wird

✅ **Messwerte** (Zahlen, Einheiten, Prüfnormen, Prüfbedingungen).
Physikalische Messwerte sind nicht schutzfähige Fakten. Sie werden mit präziser
Quellenangabe geführt.

### 1.2 Was nicht übernommen wird

❌ Beschreibungstexte, Marketingtexte, Anwendungsbeispiele der Hersteller
❌ Grafiken, Diagramme, Fotos, Icons
❌ Tabellenlayouts und Gliederungen von Datenblättern
❌ Vollständige Datenblätter als Kopie oder Spiegel im Repository

Alle Beschreibungstexte (`abstract`, `positioning`, `note`, `commonDefects`) werden
**selbst formuliert**. Wo eine Herstelleraussage zitiert werden muss, um einen Konflikt
zu belegen, geschieht das als kurzes Zitat in Anführungszeichen mit Quellenangabe.

**Wie stattdessen nachgeprüft wird.** Der Beleg ist die Fundstelle, nicht die Kopie:
jeder Datensatz führt `datasheet.url` und `datasheet.retrievedAt`, jeder Kennwert seine
`source`. Wer eine Zahl prüfen will, öffnet das Original beim Hersteller. Das ist die
belastbarere Prüfung, weil ein Spiegel im Repository mit der Zeit von dem abweicht, was
der Hersteller heute veröffentlicht — und weil die Datenblätter fremde Werke sind, an
denen uns keine Verbreitungsrechte zustehen.

Für die Datenpflege werden Auszüge lokal gehalten, unter `data/_sources/`. Dieses
Verzeichnis ist bewusst nicht Teil des Repositorys — siehe `data/_sources/README.md`
und ADR-034 in `DECISIONS.md`.

### 1.3 Pflichtangaben je Quelle

| Feld | Pflicht |
|---|---|
| `id`, `type`, `publisher`, `title`, `confidenceCeiling` | ja |
| `url`, `retrievedAt` | ja bei allen Online-Quellen |
| `documentVersion` | ja, sobald das Dokument eine Version führt |
| `productName` | ja bei Herstellerquellen |

**Abrufdatum ist Pflicht.** Datenblätter werden ohne Ankündigung ersetzt; ein Wert ohne
Abrufdatum lässt sich nicht nachprüfen.

### 1.4 Markenrechte

Handels- und Markennamen Dritter (u. a. Bambu Lab, Prusament®, ULTEM™, Ultrafuse®,
Luvocom®, Filaflex®) sind Marken der jeweiligen Inhaber und werden ausschließlich zur
Quellen- und Produktidentifikation genannt. Zentraler Hinweis in `DISCLAIMER.md`,
datensatzbezogen im Feld `identity.trademarkNotice`.

### 1.5 Prüfnormen

Normtexte (ISO, DIN, EN, UL) sind kostenpflichtig und werden **nicht** wiedergegeben.
`data/standards.json` enthält nur Normnummer, Titel und eine selbst formulierte
Kurzerklärung, wofür die Norm steht.

---

## 2. Quellenhierarchie

Bei widersprüchlichen Angaben gilt diese Reihenfolge — **außer** die höherrangige Quelle
ist physikalisch unplausibel oder unvollständig spezifiziert (dann Konflikt dokumentieren,
nicht auflösen):

| Rang | Typ | `confidenceCeiling` | Bemerkung |
|---|---|---|---|
| 1 | `peer-reviewed` | `high` | Unabhängige Prüfung, meist mit Orientierungsangabe |
| 2 | `manufacturer-tds` | `high` | Datenblatt mit Norm und Prüfbedingung |
| 3 | `standard` | `high` | Norm selbst (Grenzwerte, Klassen) |
| 4 | `manufacturer-sds` | `medium` | Sicherheitsdatenblatt — gut für Chemie, schwach für Mechanik |
| 5 | `textbook` | `medium` | Werkstoffkunde für das Grundpolymer |
| 6 | `field-experience` | `medium` | Belegte eigene Fertigungserfahrung |
| 7 | `manufacturer-website` | `medium` | Produktseite ohne Kennwerttabelle |
| 8 | `community` | `low` | Foren, Tests Dritter — nur mit Methodenbeschreibung |
| 9 | `estimate` | `estimated` | Eigene Ableitung |

> **Ein Datenblatt schlägt keine Physik.** Flashforge nennt für PETG-CF eine
> Dauergebrauchstemperatur von 80 °C — oberhalb der eigenen HDT-Angabe (70 °C) und
> oberhalb von Tg (68 °C). Rang 2 macht diese Angabe nicht richtig. Sie wird mit
> `confidence: low` geführt und begründet eingeordnet.

---

## 3. Verzeichnis der ausgewerteten Quellen

### `src_bambu_petgcf_tds_v2`

| | |
|---|---|
| **Typ** | `manufacturer-tds` |
| **Herausgeber** | Bambu Lab |
| **Produkt** | Bambu PETG-CF |
| **Titel** | Bambu Filament Technical Data Sheet — PETG-CF |
| **Version** | V2.0 |
| **URL** | https://www.additive-x.com/shop/media/mageplaza/product_attachments/attachment_file/b/a/bambu_petg-cf-technical_data_sheet.pdf |
| **Abgerufen** | 2026-08-01 |
| **Ceiling** | `high` |
| **Verwendet in** | `petg-cf` |

**Wert für das Projekt:** Die einzige der drei Quellen mit **vollständigen X-Y- und
Z-Kennwerten** (Zug, Biegung, Schlag, E-Modul, Bruchdehnung). Damit überhaupt erst ein
belegbarer Anisotropiefaktor möglich.

**Einschränkungen:**
- Faseranteil wird **nicht** deklariert.
- Prüfkörper wurden 8 h bei 65 °C vorbehandelt („annealed and dried"). Die Werte liegen
  dadurch über dem, was ein normal gedrucktes Bauteil liefert.
- 65 °C liegt **unter** Tg (68 °C) — eine klassische Temperung ist dort bei einem amorphen
  Werkstoff nicht möglich. Siehe `oq_annealing_below_tg`.
- Gibt für den amorphen Werkstoff einen Schmelzpunkt (225 °C) an, die
  Kristallisationstemperatur aber mit „N/A". Siehe `oq_tm_amorphous`.
- Chemische Beständigkeit nur pauschal („not resistant to acid/alkali") ohne Konzentration.
- ⚠️ Abgerufen über einen **Händler-Spiegel**, nicht über die offizielle Bambu-URL.
  Es existiert mindestens eine V3.0. Zu ersetzen — siehe `oq_source_urls`.

---

### `src_flashforge_petgcf10_tds`

| | |
|---|---|
| **Typ** | `manufacturer-tds` |
| **Herausgeber** | Flashforge |
| **Produkt** | PETGCF10 Filament |
| **Titel** | PETGCF10 Filament Technical Data Sheet (EN) |
| **Version** | 2022-01-17 |
| **URL** | https://after-support.flashforge.jp/uploads/datasheet/tds/PETG_CF_TDS_EN.pdf |
| **Abgerufen** | 2026-08-01 |
| **Ceiling** | `high` |
| **Verwendet in** | `petg-cf` |

**Wert für das Projekt:** Die ehrlichste der drei Quellen. Deklariert den Faseranteil
ausdrücklich (10 %) **und** vermerkt, dass die Prüfkörper **nicht** getempert wurden.
Damit wird sie zum notwendigen Gegenpol zu Bambu und macht die Streuung im Markt sichtbar,
statt sie zu verstecken.

**Einschränkungen:**
- Keine Z-Werte.
- Schlagzähigkeit nach ISO 180 (Izod), nicht ISO 179 (Charpy) — nicht direkt mit Bambu
  vergleichbar, und die Differenz ist mit Faktor 5 auffällig groß. Siehe `oq_impact_conflict`.
- Dauergebrauchstemperatur 80 °C ist physikalisch nicht haltbar (s. o.).

---

### `src_prusament_petgcf_product`

| | |
|---|---|
| **Typ** | `manufacturer-website` |
| **Herausgeber** | Prusa Polymers |
| **Produkt** | Prusament PETG Carbon Fiber |
| **URL** | https://prusament.com/materials/prusament-petg-carbon-fiber/ |
| **Abgerufen** | 2026-08-01 |
| **Ceiling** | `medium` |
| **Verwendet in** | `petg-cf` |

**Wert für das Projekt:** Belastbare Aussagen zu Verarbeitung und Verhalten —
Düsentemperatur 265 ± 10 °C, Betttemperatur 90 ± 10 °C, **gehärtete Düse erforderlich**,
geringere Zähigkeit gegenüber unverstärktem PETG, geringeres Stringing, matte Oberfläche.

**Einschränkungen:** Keine vollständige Kennwerttabelle auf der Produktseite; das
verlinkte PDF ist ein Sicherheitsdatenblatt, kein TDS. Deshalb `confidenceCeiling: medium`.

---

### `src_ofd` — Open Filament Database

| | |
|---|---|
| **Typ** | `community` |
| **Herausgeber** | Open Filament Collective |
| **Titel** | Open Filament Database — Marktbestand an Filamenten, Spulengrößen und Druckparametern |
| **Version** | `2026.07.31` (täglicher Neubau, Version am Datensatz geführt) |
| **URL** | https://api.openfilamentdatabase.org/api/v1/ |
| **Repository** | https://github.com/OpenFilamentCollective/open-filament-database |
| **Lizenz** | MIT für Code **und** Daten |
| **Ceiling** | `low` |
| **Verwendet in** | 21 Werkstofftypen (Spulenlogistik), 14 Werkstofftypen (Marktkorridor) |

**Wert für das Projekt:** 155 Marken, 2.020 Filamente, 22.397 Spulengrößen. Damit erstmals
belegbar, was kein Herstellerblatt beantwortet: **welche Spulengrößen es am Markt
überhaupt gibt** — der begrenzende Faktor im Großformat-Dauerlauf. Dazu die Streuung von
Dichte und Verarbeitungstemperaturen über hunderte Produkte, also genau die
`min`/`max`-Spanne, die eine Einzelquelle nie liefern kann.

**Einschränkungen — und sie sind grundlegend:**
- **Keine Kennwerte.** Weder Zugfestigkeit noch Modul, HDT, Glasübergang,
  Schlagzähigkeit, Bruchdehnung, Orientierung oder Prüfnorm. Für die Mechanik- und
  Thermikfelder dieses Projekts ist die Quelle **unbrauchbar** und darf dort nie
  herangezogen werden.
- Gemeinschaftlich gepflegt, ohne Provenienz und ohne Abrufdatum je Eintrag.
- Datenblatt-Links tragen nur 164 von 2.020 Filamenten (8 %).
- Beschreibt das Angebot, nicht die Lieferbarkeit — Lagerbestände kennt sie nicht.
- Die Zuordnung ihrer 38 Werkstoffbezeichnungen auf unsere 41 Typen ist Auslegung; die
  Regeln stehen in `scripts/import/ofd-common.mjs` und sind dort begründet.

Siehe ADR-035 für die vollständige Abwägung.

---

### `estimate_reasoning` (Sammel-ID)

| | |
|---|---|
| **Typ** | `estimate` |
| **Ceiling** | `estimated` |

Sammel-ID für alle Werte, die aus Werkstoffkunde und Verfahrenswissen abgeleitet und
**nicht** belegt sind. Jeder so markierte Wert trägt eine `note` mit der Begründung.
In der UI zwingend als Schätzung zu kennzeichnen.

---

## 4. Geprüft und bewusst *nicht* verwendet

### Polymaker Fiberon PET-CF17

Bei der Recherche nach PETG-CF-Datenblättern taucht diese Quelle prominent auf
(Zugfestigkeit 65,9 ± 1,0 MPa, Modul 5481 ± 224 MPa, HDT 0,45 MPa: 147,5 °C).

**Nicht verwendet.** `PET-CF17` ist **nicht** PETG-CF, sondern teilkristallines PET-CF —
ein anderer Werkstoff mit rund doppelter Steifigkeit und mehr als doppelter HDT. Ein
Buchstabe Unterschied im Namen, Faktor 2 in den Kennwerten.

Die Werte wandern später in einen eigenen Datensatz `pet-cf`. Im Datensatz `petg-cf` ist
die Verwechslungsgefahr über `identity.notToBeConfusedWith` explizit dokumentiert — sie
ist der wahrscheinlichste Weg, wie in dieser Datenbank grob falsche Zahlen entstehen könnten.

---

## 5. Erschließungsplan (Phase 4)

| Priorität | Quelle | Erwarteter Nutzen |
|---|---|---|
| hoch | Offizielle Bambu-Lab-Wiki-TDS (aktuelle Version, alle Materialien) | Z-Werte über viele Materialien — im Markt selten |
| hoch | Prusa Polymers TDS-PDFs (Prusament-Linie) | Vollständige Kennwerttabellen, saubere Normangaben |
| hoch | Polymaker (PolyLite/PolyMax/Fiberon), inkl. „Technical Data at a Glance" | Breite Abdeckung in einem Dokument |
| hoch | BASF Forward AM (Ultrafuse) | Industriequalität, Regulatorik, UL94-Einstufungen |
| ~~mittel~~ ✅ | ~~Lehvoss Luvocom 3F~~ | **erledigt 2026-08-04** — 5 Blätter über den FormFutura-Vertrieb: PAHT 9825/9936, PAHT CF 9742/9891, PAHT KK 50056 FR. Die besten Blätter im Bestand: Norm UND Prüfkörper deklariert, Dauergebrauchstemperatur mit Zeitbasis, UL94 mit Dickenangabe, EN 45545 für den Bahnbereich |
| mittel | Fillamentum, Extrudr, Fiberlogy, ~~FormFutura~~ ✅, ColorFabb | **FormFutura vollständig erledigt 2026-08-05** — 37 Produkte aus 46 Blättern. Die 13 Blätter ohne Textebene wurden mit poppler gerendert und abgelesen; sieben davon tragen eine kopierte Tabelle und zählen als ein Beleg |
| mittel | 3DXTech, Essentium, Kimya, Nanovia | Technische Compounds, ESD-Typen |
| mittel | Recreus, NinjaTek, Taulman | TPU/TPE-Spanne |
| niedrig | Stratasys, Roboze | Hochtemperatur-Referenzwerte (proprietäre Systeme) |

**Rangliste aus dem OFD-Bestand (Stand `2026.07.31`).** Diese Marken sind dort mit
Produkten geführt, ohne dass eine einzige Datenblatt-Fundstelle hinterlegt wäre — die
Blätter existieren, sie sind nur nirgends erfasst. Hier liegt der größere Hebel als bei
den bereits verlinkten Nachzüglern:

| Marke | Produkte im Bestand | bei uns |
|---|---|---|
| Spectrum | 97 | 12 Produkte |
| Polymaker | 71 | — |
| 3DXTech | 61 | — |
| Fiberlogy | 59 | 10 Produkte |
| PrimaCreator | 59 | — |
| ROSA3D | 51 | — |
| eSUN 3D | 43 | — |
| Protopasta | 40 | — |
| FilamentPM | 37 | — |

Gegenrichtung: Von den 148 verlinkten Fundstellen sind **FormFutura (48), Nebula (17) und
Alzament (13) ausgewertet**; offen bleiben Bambu Lab 40, Anycubic 12 und die Einzelfunde.
Die tagesaktuelle Liste erzeugt `npm run import:ofd-datasheets`.

> **Was die Auswertung dieser drei Marken über die Datenlage gezeigt hat:** Von 76
> ausgewerteten Blättern tragen 20 keine eigene Messung, sondern die Tabelle eines
> anderen Produkts — und die generische PLA-Tabelle taucht bei **beiden** erstgenannten
> Herstellern auf, also über Markengrenzen hinweg. Eine Zählung von Datenblättern ist
> deshalb keine Zählung von Belegen. Jeder betroffene Datensatz sagt das und trägt `low`.
>
> Drei weitere der dreizehn Alzament-Fundstellen sind gar keine technischen Blätter,
> sondern **Sicherheitsdatenblätter** (GHS-Einstufung, Löschmittel) ohne einen einzigen
> Kennwert. Die OFD führt sie trotzdem unter `data_sheet_url`. Ein Link in der
> Arbeitsliste ist also nicht einmal ein Hinweis darauf, dass Kennwerte existieren.

### `src_tds` — Alzament (Alza.cz, Prag)

Handelsmarke des tschechischen Händlers Alza.cz; als Hersteller nennen die Blätter
**Landu Innovations Technology Co., Ltd.** in Shenzhen. 13 Fundstellen über die
OFD-Arbeitsliste, davon 10 technische Blätter, alle englisch und mit Textebene.
Abgerufen am 2026-08-05, Obergrenze `medium` — mit einer Ausnahme.

**Die Ausnahme ist der eigentliche Befund.** Die Blätter zu ABS, ASA und PLA Basic sind
zeilenweise die Bambu-Blätter derselben Werkstoffe. Beim ABS stimmen **10 von 14 Zeilen
ziffernidentisch** überein — einschließlich der Toleranzen und einschließlich des
Tippfehlers „MPA" statt „MPa" beim Z-Modul. Die vier abweichenden Zeilen sind die
Festigkeiten, und die entsprechen der Bambu-Fassung V3.0, die dieser Datensatz führt.
Zum Trocknen verweist das ABS-Blatt zusätzlich auf das „X1 Series Printer Heatbed" —
ein Bambu-Lab-Drucker. Diese drei Datensätze tragen Obergrenze `low`, damit sie nicht
als zweite Messung gelesen werden. Wer von wem abgeschrieben hat, sagen die Blätter
nicht; belegt ist die gemeinsame Herkunft, nicht ihr Verlauf.

Die übrigen sieben Blätter tragen eigene Zahlen. Das wertvollste ist **PLA-CF**: 31,2 MPa
in X-Y gegen 15,1 MPa in Z aus demselben Prüfdurchgang — daraus ergibt sich der
Anisotropiefaktor 0,48 für einen Werkstofftyp, der bisher keinen hatte. Das **PETG**-Blatt
ist das einzige der dreizehn, das seine Prüfkörperbedingungen vollständig nennt
(240 °C Düse, 80 °C Bett, 100 % Infill).

Zwei Blätter sind in sich fehlerhaft und tragen durchgängig `low`: **PLA Chameleon**
führt Zugfestigkeit X-Y und Z mit demselben Wert (26,1 MPa) — ein Anisotropiefaktor von
1,00 kommt bei FDM nicht vor, der Z-Wert ist deshalb nicht übernommen. **PLA+** trägt
unter „Composition" den Eintrag „Polyvinyl alcohol" und unter „Solubility" „Soluble in
water", also die Chemietabelle eines wasserlöslichen Stützmaterials.

**FormFutura AthenaX CF10 und Kratos PC CF10 — dasselbe Haus, gegensätzlicher Befund
(2026-08-06).** Beide Blätter lagen seit dem ersten FormFutura-Import ausgewertet, aber
ohne Werkstofftyp im Arbeitsplatz. Beide sind gegen ihr ungefülltes Schwesterblatt
gehalten worden.

| | AthenaX → CF10 | Kratos PC → CF10 |
|---|---|---|
| Dichte | 1,23 → **1,28** | 1,20 → 1,22 |
| Zugfestigkeit | 44 → **70 MPa** | 61,8 → 76 MPa |
| Bruchdehnung | 220 % → **5 %** | > 100 % → **> 100 %** |
| Biege-E-Modul | *fehlt auf dem Blatt* | 24.000 → **24.000 kg/cm²** |
| Biegefestigkeit | *fehlt auf dem Blatt* | 920 → **920 kg/cm²** |
| Schlagzähigkeit | 93 → **4 kJ/m²** | 70 → **70 kgcm/cm** |

AthenaX CF10 ist als `pctg-cf` aufgenommen: Jeder Wert bewegt sich in die von einer
Kohlefaserfüllung erzwungene Richtung, und die Bruchdehnung von 220 auf 5 Prozent ist
nichts, was man abschreiben könnte. Kratos PC CF10 trägt vier von acht Kennwerten
zifferngleich mit dem ungefüllten Blatt — darunter eine Bruchdehnung über 100 %, die bei
10 % Kohlefaser ausgeschlossen ist. **`pc-cf` ist deshalb nicht angelegt.**

Beide AthenaX-Blätter tragen zwei Beschriftungsfehler, die an den betroffenen Werten
dokumentiert sind: Die Schlagzeilen nennen ISO 179-1eU (Charpy **ungekerbt**), obwohl eine
davon als „Izod Notched" beschriftet ist, und die Vicat-Zeile nennt als Methode „DSC" —
keine Vicat-Norm. Beide Werte stehen deshalb ohne Prüfnorm.

**Spectrum, nachgetragen 2026-08-06 — und zwei Marken, die sich eine Messung teilen.**
Sieben weitere Spectrum-Blätter geholt (robots.txt erlaubt es, nur `/wp-admin/` gesperrt,
kein KI-Agent genannt), drei aufgenommen: **PEBA**, **PCTG GF10** und **HIPS-X**.

Der Ertrag liegt weniger in neuen Zahlen als darin, was der Dublettenprüfer daraus machte:

| | | identisch |
|---|---|---|
| Spectrum PCTG GF10 | ↔ FormFutura AthenaX GF10 | **8 von 8** Kennwerten |
| Spectrum HIPS-X | ↔ FormFutura EasyFil HIPS | **7 von 7** Kennwerten |

Das erste Paar war vermutet — beide Blätter tragen sogar dieselbe Auffälligkeit, nämlich
eine Vicat-Temperatur (77 °C) **unter** der HDT-B (78 °C), was normalerweise nicht
vorkommt. Das zweite fand die Maschine; danach war nicht gesucht worden. Beide sind nach
ADR-038 gekennzeichnet und gedeckelt: zwei Marken, eine Messung, **ein** Beleg.

**Vier Blätter bleiben liegen, und zwar begründet.** PA6 Neat, PA12 CF15, LW-ASA
UltraFoam und PLA ESD sind zweispaltig gesetzt; im Textauszug verschieben sich
Beschriftungs-, Wert- und Normspalte gegeneinander. Bei PEBA, PCTG GF10 und HIPS-X richten
sie sich sauber aus, und bei PEBA bestätigt der Fließtext die Zuordnung zweifach („Shore
hardness 92A", „density 1.02 g/cm³"). Bei den vier anderen tut er das nicht — eine Zahl in
der falschen Zeile ist kein Wert. Sie stehen in `RUECKFRAGEN.md`.

**Spectrum PEBA misst an SPRITZGEGOSSENEN Prüfkörpern**, und das steht in jeder einzelnen
mechanischen Zeile. Bei einem Elastomer mit über 500 % Bruchdehnung ist der Unterschied
erheblich, weil die Schichthaftung genau die Eigenschaft ist, die der Spritzguss nicht
misst. Der Datensatz führt entsprechend `specimenType: moulded`.

**Zusätzlich erforderlich, weil Herstellerangaben es nicht hergeben:**

- Preiserhebung über ≥ 5 Händler je Material (`oq_price_survey`) — **das Ziel ist weiter
  verfehlt, aber der Abstand ist kleiner geworden.** Mit der Aufnahme von Material4Print
  am 2026-08-06:

  | Händler je Werkstoff | 0 | 1 | 2 | 3 | 4 | ≥ 5 |
  |---|---|---|---|---|---|---|
  | Stand 2026-08-05 | 9 | 14 | 8 | 10 | 1 | **0** |
  | mit Material4Print | 12 | 5 | 16 | 8 | 1 | **0** |
  | mit Fillamentum | 12 | 5 | 16 | 5 | 3 | **1** |
  | **mit 3DJAKE** | **2** | 12 | **16** | **7** | **4** | **1** |

  Werkstoffe mit mindestens zwei Händlern: 19 → 25 → **28**. Preiskonfidenz `medium`
  11 → 16 → **22**, geschätzt 8 → **2**. **`asa` erreicht als erster Werkstoff die
  geforderten fünf Händler**, und mit `ppa-cf` hat zum ersten Mal **jeder der 42 Typen
  einen Preis**.

  **Fillamentum (aufgenommen 2026-08-06)** stand mit acht dünnen Werkstoffen an zweiter
  Stelle. Verkauft wird nicht auf `fillamentum.com` — die Herstellerseite nennt nur
  Distributoren —, sondern unter `shop.fillamentum.com`: ein eigener Host, dessen
  robots.txt deshalb separat geprüft wurde. Welcher Shop-Titel zu welchem Werkstofftyp
  gehört, ist aus den 21 vorhandenen Fillamentum-Produktdatensätzen abgeschrieben und
  nicht neu entschieden.

  **Was dabei NICHT gelang, und warum es so bleibt:** `hips`, `pp`, `pvc` und `pvdf` sind
  bei Fillamentum im Angebot, bekommen aber trotzdem keinen Preis. Ihre Varianten nennen
  als einzige Option den Durchmesser („1.75 mm"), kein Spulengewicht; das Feld `grams`
  steht bei 1000, und ob das netto oder brutto ist, sagt der Endpunkt nicht — bei
  Material4Print war dieselbe Art Zahl das Bruttogewicht samt Spule. Ein geratenes Gewicht
  ergibt einen falschen Kilopreis, und ein falscher Preis ist schlechter als keiner. Die
  Angebote werden deshalb verworfen. `hips` bleibt damit ohne Preisquelle, seit Fiberlogy
  weggefallen ist.

  **Wie der Shop ausgewählt wurde.** Naheliegend wäre ein großer Filamentshop gewesen;
  geprüft wurde dasfilament.de, und der führt praktisch nur PLA und PETG — also die beiden
  Werkstoffe mit der ohnehin besten Abdeckung. Der Zugewinn wäre null gewesen. Umgekehrt
  gefragt — *welche Marke liefert die dünnen Werkstoffe?* — stand Material4Print mit neun
  an der Spitze: ESD-PLA, ESD-PETG, ESD-ABS, PAHT, PAHT-CF15, PET-CF15, PMMA, ABS-PC und
  Tough PLA. Gelesen wird Shopifys dokumentierter `products.json`-Endpunkt: ein Aufruf
  statt 124, und die Spulengröße steht sauber im Variantentitel.

  **Fiberlogy ist im selben Zug weggefallen.** Am 2026-08-02 lieferte der Shop noch
  Preise; vier Tage später antworten alle 22 Kategorieadressen mit 404, und die
  Nachfolgeseite nennt nur noch „Where to Buy", „Distributor" und „Reseller" — der
  Direktverkauf ist eingestellt. Der Leser wurde deshalb nicht repariert, sondern
  stillgelegt: Ein Preis, dessen Quelladresse mit 404 antwortet, ist von niemandem mehr
  nachprüfbar. Fünf Werkstoffe (`abs-gf`, `hips`, `pctg-gf`, `pla-cf`, `pp`) verlieren
  damit ihre einzige Preisquelle und fallen auf eine Schätzung zurück.

  Fünf Werkstoffe hängen weiterhin an einem einzigen Shop. Die Preiskonfidenz bildet das
  inzwischen ab (11 × `medium`, 22 × `low`, 8 geschätzt, 1 ohne Preis), und seit
  2026-08-05 nennt auch die kurze Bedingungszeile die Händlerzahl statt nur der
  Angebotszahl — bei `pc` stand dort „Median aus 8 Händlerangeboten", und alle acht kamen
  aus derselben Preisliste.

  **Die Open Filament Database hilft hier nicht.** Sie führt 5.918 Kauflinks über 50
  Händler, aber **kein einziger trägt einen Preis** — geprüft am Schnappschuss 2026.07.31,
  0 von 5.918. Auch `sizes` und `variants` haben kein Preisfeld. Was die OFD liefert, ist
  eine Fundstellenliste für eine Erhebung, keine Erhebung. Wer den nächsten Anlauf
  unternimmt, muss weitere Shops einzeln prüfen: robots.txt lesen, JSON-LD suchen,
  `scripts/survey-prices.mjs` erweitern.

  **Wie verlässlich die schwachen Preisangaben sind — gemessen, nicht geschätzt.**
  Die Erhebung hat nebenbei ein Experiment erzeugt: 50 Werkstoffe sind im Lauf der letzten
  Wochen von einer schwächeren auf eine bessere Preisangabe umgestellt worden. Jeder
  Übergang ist ein Paar aus „was wir glaubten" und „was wir dann gemessen haben".
  `npm run measure:price-reliability` liest sie aus der Git-Historie (Stand 2026-08-06):

  | | n | Preisfehler (Median) | Rangfehler (Mittel) | systematischer Versatz |
  |---|---|---|---|---|
  | Schätzung → Erhebung | 35 | 15,4 % | 11,4 % | **−5,7 %** (war zu **teuer**) |
  | ein Händler → mehrere | 15 | 14,4 % | 8,5 % | **+6,6 %** (war zu **günstig**) |

  Die größten Ausreißer nach unten: `pet-cf` 105 → 49,98 €/kg, `pmma` 60 → 32,98,
  `tpu-95a` 40 → 22,99. Nach oben: `pp` 47,50 → 73,32 und `tpu-esd` 90 → 129,98.

  **Der Befund kehrt die Vermutung um.** In `SOURCES.md` und im Testkommentar stand seit
  PR #18, eine Schätzung trete gleichberechtigt neben eine Erhebung und gewinne dadurch.
  Von 35 ersetzten Schätzpreisen waren aber **24 zu hoch** — Schätzungen sind hier eher zu
  vorsichtig. Zu günstig ist systematisch der **Einzelfund**: Die Erhebung sucht Angebote
  und findet zuerst das billige. Das ist die Verzerrung, die eine Empfehlung tatsächlich
  kippen kann, und sie wird seit ADR-040 im Scoring gedämpft.

  Mit jedem neuen Händler wächst die Stichprobe. Die Zahlen bleiben aber eine Aussage über
  *diese* Erhebung, nicht über Preisschätzungen im Allgemeinen — Messgerät und Messobjekt
  sind derselbe Datenbestand.

  **3DJAKE (aufgenommen 2026-08-06) — und warum diesmal kein Herstellershop.**
  Zweimal hatte die Frage *„welche Marke liefert die dünnen Werkstoffe?"* zu einem
  Herstellershop geführt. Beim dritten Mal führt sie ins Leere: Die vier Marken, die die
  verbliebenen Lücken abdecken, sind als Preisquelle alle nicht verfügbar.

  | Kandidat | Lücken | Befund |
  |---|---|---|
  | Bambu Lab | 8 | `eu.store.bambulab.com/robots.txt` antwortet mit einer 302 auf `eu.store.bambulab.combots.txt` — eine Adresse, die es nicht gibt. Auch `/en/`, `/de-de/` und Großschreibung enden in 302 oder 404. Die Schwesterhosts `us.` und `asia.` liefern eine reguläre Shopify-robots.txt, die Anthropics Agenten ausdrücklich **mitzählt** statt sie zu sperren — aber deren Preise sind Dollar- und Asienpreise. |
  | FormFutura | 6 | `User-agent: * / Allow: /`, aber `ClaudeBot: Disallow: /`. Der Betreiber hat sich zu Anthropics Agenten geäußert, und die Äußerung ist ein Nein. |
  | Spectrum | 5 | kein geprüfter Direktverkauf mit maschinenlesbaren Preisen |
  | Fiberlogy | 4 | Direktverkauf eingestellt, siehe oben |

  Zum Bambu-Fall gehört eine Klarstellung: Ein umgerechneter Dollarpreis wäre derselbe
  Fehler wie ein geratenes Spulengewicht — eine Zahl, die aussieht wie eine Erhebung und
  keine ist. Der eine Bambu-Preis im Bestand bleibt deshalb der von Hand im Browser
  abgelesene.

  Bleibt der **Händler**. 3DJAKE (Niceshops GmbH) führt alle vier Marken; seine robots.txt
  sperrt genau `/kunden/*` und `/webshop/*`, für alle gleich, und nennt keinen KI-Agenten
  namentlich — weder erlaubt noch verboten. Produktseiten tragen JSON-LD nach schema.org
  mit Preis, Währung und Verfügbarkeit.

  **Das Spulengewicht steht an zwei Stellen, und keine Seite hat beide.** Der übliche Fall
  trägt es im Produktnamen („Extrudr TPU hard Schwarz, 1,75 mm / 750 g"). Bei Bambu Lab,
  Spectrum und Fiberlogy endet der JSON-LD-Name davor („Bambu Lab ABS-GF Black, Spule") —
  im ersten Lauf fielen dadurch **31 von 72** Seiten durch. Die Zahl fehlt aber nicht, sie
  steht in der längeren Titelfassung der Produktkacheln: „Bambu Lab ABS-GF Black, Spule
  **(1.000 g)**". Mit dem JSON-LD-Namen als Anker sind es 0 von 72. An zehn Seiten
  gegengeprüft: fünf tragen die Zahl im Namen, fünf in der Klammer, keine in beiden.

  **Zwei Händler mit derselben Herstellerliste sind kein Marktvergleich.** Direkt nach der
  Aufnahme erreichten `greentec`, `tpu-58d` und `tpu-85a` die Stufe `medium` — fünf
  Angebote, zwei Händler, aber **alle fünf von Extrudr**, einmal bei Extrudr selbst und
  einmal bei 3DJAKE. Aufgefallen ist es an der Kalibrierung: Alle drei bewegten den Preis
  beim Übergang um **0,0 %**, während Übergänge mit echtem Markenwechsel im Median 15 %
  sprangen. Seit 2026-08-06 verlangt `derive-price.mjs` für `medium` deshalb auch zwei
  Marken; die drei stehen wieder auf `low`. Preiskonfidenz danach: `medium` 22, `low` 18,
  geschätzt 2.

  **Was 3DJAKE nicht ist: ein neuer Anbieter für alles.** Der Shop stand schon mit 87
  handerhobenen Angeboten im Bestand. Neu sind 64 maschinell gelesene, und `derive-price`
  zählt Anbieter, nicht Marken — für Werkstoffe, deren einziger Händler ohnehin 3DJAKE
  war, ändert sich die Konfidenz nicht. Ohne Preisquelle bleiben `obc` und `pvdf`: beide
  gibt es dort nicht als Filament.
- Bewitterungsdaten (QUV/Xenon) — vermutlich nur über Fachliteratur (`oq_uv_data`)
- Lackhaftung, Verklebbarkeit, XXL-Eignung → eigene Fertigungserfahrung Reents3D
- ESD-Messungen zur Absicherung der `insulating`-Einstufung bei CF-Typen (`oq_esd_measurement`)

---

## 6. Pflegeprozess

1. **Änderung nur per PR**, mit Quellenangabe im PR-Text.
2. `retrievedAt` wird bei jeder Prüfung aktualisiert, auch wenn sich nichts geändert hat.
3. `governance.lastReviewed` je Datensatz, Turnus 12 Monate.
4. Ersetzt ein Hersteller ein Datenblatt, bleibt die alte Quelle mit ihrer
   `documentVersion` erhalten und wird um die neue ergänzt — Werte dürfen nachvollziehbar
   bleiben.
5. Widersprüche werden als `openQuestion` erfasst, **nicht** durch Mittelwertbildung
   aufgelöst.
