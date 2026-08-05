# DATA_MODEL.md — Feldreferenz des FDM-Materialberaters

> Verbindliche Referenz für `schema/material.schema.json`.
> Wer einen Datensatz anlegt oder korrigiert, liest **zuerst Abschnitt 1–5**.
> Maßgeblich ist immer das Schema; dieses Dokument erklärt das *Warum* und die Einheiten.

**Schema-Version:** 1.0.0 · **Stand:** 2026-08-01

---

## 1. Grundprinzip: kein nackter Skalar

Ein Zahlenwert ohne Kontext ist im FDM wertlos. „PETG-CF hat 59 MPa" ist keine Aussage,
solange nicht dabeisteht: *in welcher Richtung, nach welcher Norm, unter welcher
Vorbehandlung, aus welcher Quelle, und wie sicher*.

Deshalb ist **jede Sachaussage ein Objekt**, nie ein Skalar:

```jsonc
"tensileStrengthZ": {
  "value": 38,                      // typischer Wert
  "tolerance": 3,                   // Streuung EINER Quelle (±)
  "min": 33, "max": 41,             // Spanne ÜBER HERSTELLER hinweg (optional)
  "unit": "MPa",
  "testStandard": "ISO 527 / GB/T 1040",
  "orientation": "Z",               // bei Mechanik PFLICHT
  "conditions": "100 % Infill, 8 h bei 65 °C vorbehandelt",
  "source": "src_bambu_petgcf_tds_v2",
  "confidence": "medium",
  "note": { "de": "…", "en": "…" }
}
```

### 1.1 `min`/`max` vs. `tolerance` — häufigster Anfängerfehler

| Feld | Bedeutung |
|---|---|
| `tolerance` | Streuung **einer** Messreihe/Quelle (das „± 3" aus dem Datenblatt) |
| `min` / `max` | Realistische Spanne **über Hersteller und Varianten hinweg** |

Beides in einem Feld zu mischen erzeugt Scheinpräzision. Wenn nur eine Quelle vorliegt,
setzt man `tolerance` und **lässt `min`/`max` weg** — sonst behauptet der Datensatz eine
Marktbreite, die nie erhoben wurde.

### 1.2 Aggregierte Werte

Wenn `value` aus mehreren Quellen redaktionell zusammengeführt wurde:

- `source` ist ein **Array** aller herangezogenen Quellen,
- `note` erklärt, **wie** aggregiert wurde und wo die Anker liegen,
- `confidence` liegt bei `medium`, solange die Quellen auseinanderliegen.

Beispiel `petg-cf.tensileStrengthXy`: Flashforge meldet 40–43 MPa (10 % CF, ungetempert),
Bambu 59 ± 4 MPa (Faseranteil undeklariert, vorbehandelt). Aggregiert: `value: 48,
min: 40, max: 63` mit Erklärung in der Notiz. Die Alternative — einen der beiden Werte als
„den" Wert auszugeben — wäre eine stille Lüge.

---

## 2. Konfidenz — die wichtigste Spalte im Datenmodell

| Wert | Bedeutung | UI-Darstellung |
|---|---|---|
| `high` | Mehrere unabhängige Primärquellen, gleiche Norm, konsistent | normal |
| `medium` | Eine Primärquelle, oder gut übereinstimmende Sekundärquellen | normal |
| `low` | Quelle vorhanden, aber unspezifisch, widersprüchlich oder physikalisch zweifelhaft | Warnsymbol |
| `estimated` | **Keine Quelle.** Fachliche Ableitung | gestrichelter Rahmen + Symbol, zwingend |

**Regel ohne Ausnahme:** Ein Wert mit `confidence: high` oder `medium` **muss** eine echte
Quelle zitieren. `estimate_reasoning` als einzige Quelle erzwingt `confidence: estimated`.
Das prüft R7 (Abschnitt 8) in der CI.

**Lieber ein fehlendes Feld als ein erfundenes.** Ein weggelassenes Feld senkt nur die
`dataCompleteness`; ein erfundenes Feld zerstört die Glaubwürdigkeit des ganzen Projekts.

---

## 3. Quellen (`governance.sources[]`)

Jede Datei ist **selbsttragend**: sie deklariert alle von ihr referenzierten Quellen
vollständig. `scripts/build-index.ts` führt sie zu einer globalen Registry zusammen und
meldet Inkonsistenzen. So bleibt jede Datei einzeln les- und zitierbar — ein
ausdrückliches Projektziel (die Datenbank soll auch ohne die App nutzbar sein).

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | `src_<hersteller>_<produkt>_<doktyp>` |
| `type` | ja | `manufacturer-tds`, `manufacturer-sds`, `manufacturer-website`, `standard`, `peer-reviewed`, `textbook`, `field-experience`, `community`, `estimate` |
| `publisher` | ja | Herausgeber |
| `title` | ja | Dokumenttitel |
| `confidenceCeiling` | ja | **höchste Konfidenz, die ein Wert aus dieser Quelle tragen darf** |
| `documentVersion`, `url`, `retrievedAt`, `productName`, `note` | nein | |

### 3.1 Reservierte Quellen-IDs

| ID | Verwendung | Ceiling |
|---|---|---|
| `estimate_reasoning` | Fachliche Ableitung ohne Beleg | `estimated` |
| `field_experience_reents` | Belegte eigene Fertigungserfahrung | `medium` |
| `vendor_claim_unverified` | Marketingaussage ohne Prüfbeleg | `low` |
| `src_ofd` | Open Filament Database — **Marktbeobachtung**, keine Messung | `low` |

> `src_ofd` beantwortet ausschließlich die Frage „was wird angeboten", nie „wie verhält es
> sich". Die Sammlung führt keine Prüfnormen und keine Kennwerte. Zulässig sind daraus:
> Spulengrößen, Verfügbarkeitsanteile und Marktspannen (`min`/`max`) von Dichte und
> Verarbeitungstemperaturen. Unzulässig ist jeder mechanische oder thermische Kennwert —
> siehe ADR-035.

> `field_experience_reents` darf **nur** gesetzt werden, wenn die Erfahrung tatsächlich
> existiert und benannt werden kann. Im Referenzdatensatz wurde sie bewusst **nicht**
> verwendet — stattdessen stehen Rückfragen in `openQuestions`.

### 3.2 `confidenceCeiling`

Eine Herstellerwebseite ohne Kennwerttabelle kann keine `high`-Werte tragen, auch wenn die
Aussage plausibel ist. Das Ceiling macht diese Regel maschinenprüfbar (R9).

---

## 4. Einheiten-Katalog

Das Schema erlaubt nur diese Einheiten (Tippfehler brechen die CI):

`MPa` · `%` · `°C` · `kJ/m²` · `g/cm³` · `g/10min` · `€/kg` · `mm` · `mm/s` · `h` ·
`%RH` · `Ω` · `Ω/sq` · `Ω·cm` · `1e-6/K` · `W/(m·K)` · `-` · `°` · `a` · `kg CO2e/kg` ·
`Shore D` · `kg`

Moduli werden **in MPa** geführt (nicht GPa), weil alle ausgewerteten Datenblätter das so
tun — jede Umrechnung beim Erfassen ist eine Fehlerquelle. Die Umschaltung auf
imperiale Einheiten passiert erst in der UI, nie in den Daten.

---

## 5. Bewertungsskalen 1–5 und ihre Polarität

Ratings sind `{ value: 1..5, scale, source, confidence }`. Die **Polarität ist bewusst
nicht im Datensatz gespeichert**, sondern zentral — sonst driftet sie zwischen Dateien
auseinander (siehe ADR-001, Abschnitt „Verworfene Alternative").

| Skala | 5 bedeutet | Polarität |
|---|---|---|
| `printability` | sehr prozesssicher | höher = besser |
| `layerAdhesion` | exzellente Schichthaftung | höher = besser |
| `toughness` | sehr zäh | höher = besser |
| `fatigueResistance` | hohe Dauerschwingfestigkeit | höher = besser |
| `wearResistance` | sehr verschleißfest | höher = besser |
| `uvResistance` | sehr UV-beständig | höher = besser |
| `weatherResistance` | sehr witterungsbeständig | höher = besser |
| `hydrolysisResistance` | sehr hydrolysebeständig | höher = besser |
| `gasBarrier` | hohe Sperrwirkung | höher = besser |
| `surfaceQuality` | sehr gute Rohoberfläche | höher = besser |
| `sandability` | sehr gut schleifbar | höher = besser |
| `fillability` | sehr gut spachtelbar | höher = besser |
| `paintAdhesion` | sehr gute Lackhaftung | höher = besser |
| `wrappingSuitability` | sehr gut folierbar | höher = besser |
| `bondability` | sehr gut verklebbar | höher = besser |
| `availability` | ab Lager | höher = besser |
| `batchConsistency` | sehr geringe Chargenschwankung | höher = besser |
| `dimensionalAccuracy` | sehr maßhaltig | höher = besser |
| `smallSeriesSuitability` | sehr gut für Kleinserie | höher = besser |
| `ralAccuracy` | sehr treffsicher | höher = besser |
| `warpingTendency` | starkes Warping | **niedriger = besser** |
| `hygroscopy` | sehr hygroskopisch | **niedriger = besser** |
| `abrasiveness` | sehr abrasiv | **niedriger = besser** |
| `stringingTendency` | starkes Stringing | **niedriger = besser** |
| `creepTendency` | starkes Kriechen | **niedriger = besser** |
| `notchSensitivity` | sehr kerbempfindlich | **niedriger = besser** |
| `yellowingTendency` | starke Vergilbung | **niedriger = besser** |
| `stressCrackingSensitivity` | sehr anfällig | **niedriger = besser** |
| `layerLineVisibility` | Schichtlinien stark sichtbar | **niedriger = besser** |
| `priceIndex` | sehr teuer | **niedriger = besser** |
| `distortionRisk` | hohes Verzugsrisiko | **niedriger = besser** |

Diese Tabelle ist die Quelle der Wahrheit für `src/engine/scales.ts`. `validate-data.ts`
prüft, dass jede im Schema erlaubte Skala hier eine Polarität hat und umgekehrt.

---

## 6. Feldgruppen A–J

Legende Typ: **Q**=quantity · **R**=rating · **F**=flag (tri-state, `null` = unbekannt) ·
**C**=choice (Enum) · **T**=i18n-Text · **L**=Liste

### A · `identity` — Identität & Taxonomie

| Feld | Typ | Einheit | Hinweis |
|---|---|---|---|
| `name` | String | — | Variantenname, z. B. „PETG-CF" |
| `family` | Enum | — | PLA, PETG, PET, ABS, ASA, PC, PA, PP, PE, TPU, … |
| `polymerClass` | Enum | — | `amorphous` / `semi-crystalline` / `elastomer` — steuert Plausibilitätsregel R3 |
| `variant` | Enum[] | — | `CF`, `GF`, `FR`, `ESD`, `matte`, `recycled`, … |
| `filler.type` | Enum | — | `carbon-fibre-chopped`, `glass-fibre`, … |
| `filler.massFractionPct` | Q | % | Der wichtigste Vergleichbarkeitsfaktor bei gefüllten Typen |
| `aliases` | L | — | Handelsnamen für die Suche |
| `trademarkNotice` | T | — | Markenrechtshinweis Dritter |
| `abstract` | T | — | **Beantwortet in den ersten 40 Wörtern: „Wofür geeignet, wo sind die Grenzen?"** (AEO-relevant) |
| `positioning` | T | — | Ein Satz: „wofür man es nimmt" |
| `notToBeConfusedWith` | L | — | Verwechslungsfallen, z. B. PETG-CF ↔ PET-CF |

> **`notToBeConfusedWith` ist kein Deko-Feld.** PET-CF17 erreicht getempert HDT > 100 °C,
> PETG-CF bleibt bei 70 °C. Ein Buchstabe Unterschied, Faktor 1,5 bei der Temperatur und
> Faktor 2 bei der Steifigkeit. Genau solche Verwechslungen kosten Projekte.

### B · `mechanics` — Mechanik

Alle Festigkeits-/Steifigkeitsfelder sind vom Typ **Q mit Pflichtfeld `orientation`**.

| Feld | Einheit | Norm (typisch) |
|---|---|---|
| `density` | g/cm³ | ISO 1183 |
| `tensileStrengthXy` / `…Z` | MPa | ISO 527 |
| `tensileModulusXy` / `…Z` | MPa | ISO 527 |
| `elongationAtBreakXy` / `…Z` | % | ISO 527 |
| `flexuralStrengthXy` / `…Z` | MPa | ISO 178 |
| `flexuralModulusXy` / `…Z` | MPa | ISO 178 |
| `charpyNotchedXy`, `charpyUnnotchedXy`, `charpyUnnotchedZ` | kJ/m² | ISO 179 |
| `izodNotchedXy` | kJ/m² | ISO 180 |
| `compressiveStrength` | MPa | ISO 604 |
| `hardnessShoreD` | Shore D | ISO 868 |
| `anisotropyFactorTensile` | – | **abgeleitet**, `derivedFrom` Pflicht |
| `anisotropyFactorImpact` | – | **abgeleitet**, `derivedFrom` Pflicht |
| `toughness`, `creepTendency`, `fatigueResistance`, `notchSensitivity`, `wearResistance` | R | — |

#### B.1 Anisotropiefaktor — die Zahl, die sonst niemand sauber ausweist

`anisotropyFactorTensile` = Z-Zugfestigkeit ÷ XY-Zugfestigkeit.

**Beide Operanden müssen aus derselben Quelle und demselben Prüfdurchgang stammen.**
Ein Faktor aus einem aggregierten XY-Wert und einem Einzelquellen-Z-Wert ist eine
Phantasiezahl. Bei `petg-cf` wird der Faktor deshalb aus Bambus 38/59 gebildet (= 0,64)
und **nicht** aus dem aggregierten XY-Wert 48. `derivedFrom` dokumentiert das,
Plausibilitätsregel R10 prüft es.

Erfahrungswerte zur Einordnung: FDM-Werkstoffe liegen typisch zwischen 0,3 und 0,8.
Der **Impact-Anisotropiefaktor liegt fast immer deutlich unter dem Zug-Faktor** — bei
PETG-CF 0,26 gegenüber 0,64. Steifigkeit täuscht dort Robustheit vor. Diese Lücke ist
für die Bauteilauslegung wichtiger als jeder Absolutwert.

### C · `thermal` — Thermik

| Feld | Einheit | Norm |
|---|---|---|
| `hdtA` | °C | ISO 75, **1,8 MPa** |
| `hdtB` | °C | ISO 75, **0,45 MPa** |
| `vicatB50` | °C | ISO 306 — Methode und Last müssen benannt sein, sonst `confidence: low` |
| `glassTransition` | °C | DSC |
| `meltingTemperature` | °C | DSC — bei amorphen Typen physikalisch fragwürdig, siehe unten |
| `continuousServiceTemperature` | °C | IEC 60216 — **Herstellerangabe** |
| `recommendedMaxServiceTemperature` | °C | **eigene konservative Empfehlung**, bewusst getrennt |
| `shortTermTemperature`, `minServiceTemperature` | °C | |
| `clte` | 1e-6/K | ISO 11359 |
| `thermalConductivity` | W/(m·K) | |
| `annealing.*` | F/Q/R/T | Temperpotenzial: Gewinn **und** Verzugsrisiko |

**Warum zwei Einsatztemperatur-Felder?** Weil Herstellerangaben regelmäßig nicht haltbar
sind. Flashforge nennt für PETG-CF 80 °C Dauergebrauchstemperatur — oberhalb von Tg
(68 °C) und oberhalb der HDT-B (70–74 °C). Für belastete Bauteile ist das nicht seriös.
Statt die Angabe stillschweigend zu korrigieren oder ungeprüft zu übernehmen, führt das
Modell **beide**: die Herstellerangabe mit `confidence: low` und begründeter Notiz, und
daneben unsere eigene Empfehlung (Tg minus 10–15 K) mit `confidence: estimated`.

**Amorph vs. teilkristallin:** Bei `polymerClass: amorphous` gibt es keinen echten
Schmelzpunkt. Steht im Datenblatt trotzdem einer, wird er dokumentiert, aber mit
`confidence: low` und einer `openQuestion` versehen — nicht gelöscht und nicht geglaubt.

### D · `processing` — Verarbeitung / Druckbarkeit

| Feld | Typ | Einheit |
|---|---|---|
| `nozzleTemperature`, `bedTemperature`, `chamberTemperature` | Q | °C |
| `chamberRequirement` | C | `not-required` / `recommended` / `mandatory` |
| `dryingTemperature`, `dryingTime`, `maxResidualHumidity` | Q | °C / h / %RH |
| `hygroscopy`, `warpingTendency`, `layerAdhesion`, `abrasiveness`, `stringingTendency`, `printability` | R | — |
| `shrinkage` | Q | % |
| `hardenedNozzleRequired` | F | — |
| `minNozzleDiameter` | Q | mm |
| `printSpeed`, `coolingFanPct`, `maxOverhangAngle` | Q | mm/s / % / ° |
| `supportStrategy` | C | `same-material-breakaway`, `soluble-pva`, … |
| `bedAdhesionAids` | L | — |
| `commonDefects` | L | Symptom → Ursache → Abhilfe, je mit Quelle |

> `chamberRequirement` ist ein **Hard-Constraint-Feld** der Engine: „keine beheizte Kammer
> verfügbar" filtert `mandatory`-Materialien K.-o. aus. Es ist gleichzeitig der wichtigste
> XXL-Faktor, weil Großformatanlagen praktisch nie beheizte Kammern haben.

> `printSpeed` ist **keine Materialeigenschaft**, sondern maschinenabhängig
> (Bambu ≤ 200 mm/s, Flashforge 50 mm/s für dasselbe Material). Immer mit `note` einordnen
> und niemals als Scoring-Kriterium verwenden.

### E · `durability` — Beständigkeit & Umwelt

| Feld | Typ | Einheit |
|---|---|---|
| `uvResistance`, `weatherResistance`, `hydrolysisResistance`, `saltWaterResistance`, `yellowingTendency`, `stressCrackingSensitivity`, `gasBarrier` | R | — |
| `outdoorServiceLife` | Q | a (Jahre) |
| `waterAbsorption` | Q | % |
| `chemicalResistance[]` | L | `resistant` / `limited` / `not-resistant` / `unknown` |

**`chemicalResistance` braucht `conditions`.** „Beständig gegen Säure" ohne Konzentration,
Temperatur und Dauer ist wertlos. Wo die Quelle das nicht hergibt (Bambu stuft pauschal
„not resistant" ein), wird konservativ bewertet, der Konflikt in `note` benannt und die
`confidence` auf `low` gesetzt.

`unknown` ist ein **erwünschter** Wert. Er unterscheidet „geprüft, unklar" von „nie
angeschaut" und ist in der Heatmap eine eigene, neutrale Farbe.

### F · `compliance` — Regulatorik, Sicherheit, Sonderfunktionen

| Feld | Typ | Hinweis |
|---|---|---|
| `foodContact.status` | C | `declared-eu-10-2011`, `declared-fda`, `not-declared`, … |
| `foodContact.partLevelWarning` | T | **Pflichttext**, sobald `status` gesetzt ist |
| `medical.*` | F | USP Class VI, ISO 10993 |
| `flameRetardancy.ul94` | C | `V-0`…`HB`, `not-classified` |
| `flameRetardancy.en45545` / `far25853` / `din4102` / `glowWireTemperature` | C/F/Q | Bahn, Luftfahrt, Bau |
| `esd.classification` | C | `insulating` / `antistatic` / `dissipative` / `conductive` |
| `esd.surfaceResistivity` | Q | Ω/sq |
| `drinkingWater`, `rohs`, `reachSvhc` | F | |
| `sterilisation.*` | F | Autoklav / Gamma / EtO |
| `printEmissions.*` | C/F/T | VOC/UFP, Absaugempfehlung |
| `translucency`, `magnetic` | C/F | |

**Zwei Fallen, die das Modell bewusst adressiert:**

1. **Materialfreigabe ≠ Bauteilfreigabe.** Auch ein nach EU 10/2011 konformes Material
   ergibt kein lebensmittelkonformes FDM-Bauteil — die Schichtstruktur bildet Kapillaren
   und Keimnischen. Deshalb ist `partLevelWarning` Pflicht, sobald `foodContact.status`
   gesetzt wird.
2. **„Selbstverlöschend" ist keine UL94-Einstufung.** Herstellerprosa wie „flammable and
   self-extinguishing in the air" wird als `not-classified` erfasst, mit Zitat in der
   Notiz. Wer Brandschutz braucht, braucht ein Prüfzeugnis.

**Und ein verbreiteter, teurer Irrtum:** *Kohlenstofffaser ≠ leitfähig.* Bei den üblichen
5–20 % Kurzfaseranteil bildet sich kein durchgängiges Perkolationsnetzwerk; das Bauteil
bleibt praktisch isolierend. `esd.classification` steht bei CF-Typen deshalb auf
`insulating`, nicht leer.

### G · `sustainability` — Nachhaltigkeit

| Feld | Typ | Einheit |
|---|---|---|
| `bioBasedContent`, `recycledContent` | Q | % |
| `recyclingCode` | C | |
| `industriallyCompostable` | F | EN 13432 |
| `co2eIndicator` | Q | kg CO2e/kg — **nur mit Quelle**, sonst weglassen |
| `practicalRecyclability` | C | ehrliche Einordnung statt Label |

`co2eIndicator` ohne belastbare Quelle bleibt **leer**. Eine geschätzte CO₂-Zahl ist in
diesem Feld schädlicher als eine fehlende, weil sie zitiert wird.

### H · `finishing` — Optik & Weiterverarbeitung

Für Reents3D die kommerziell relevanteste Gruppe (Veredelung inhouse).

| Feld | Typ |
|---|---|
| `surfaceQuality`, `layerLineVisibility`, `sandability`, `fillability`, `paintAdhesion`, `wrappingSuitability`, `bondability`, `ralAccuracy` | R |
| `primerRecommendation`, `chemicalSmoothing.note` | T |
| `chemicalSmoothing.suitable` + `medium` | F + String |
| `electroplating`, `weldability`, `heatSetInserts` | F |
| `recommendedAdhesives`, `colourAvailability`, `gloss` | L / C |

`paintAdhesion` ist bewusst kritisch zu bewerten. PETG-Familien haben niedrige
Oberflächenenergie; ohne Anschleifen und Haftvermittler platzt der Lack. Für lackierte
Sichtteile ist das ein echtes Ausschlusskriterium — und genau der Punkt, an dem ein
Messebau-Kunde eine ehrliche Antwort braucht.

### I · `commercial` — Kommerzielles & Fertigbarkeit

| Feld | Typ | Einheit |
|---|---|---|
| `pricePerKg` | Q | €/kg |
| `priceIndex`, `availability`, `batchConsistency`, `smallSeriesSuitability` | R | — |
| `typicalLeadTime` | T | |
| `spoolSizes` | L | Großspulen sind für XXL entscheidend |
| `xxl.maxSensibleEdgeMm` | Q | mm |
| `xxl.maxSpoolWeightKg` | Q | kg — größte am Markt beobachtete Spule |
| `xxl.largeSpoolShare` | Q | % — Anteil der Angebote ab 2 kg |
| `xxl.segmentationRecommended` | F | |
| `xxl.joiningRecommendation` | T | |
| `reentsPortfolioStatus` | C | `standard` / `on-request` / `partner-production` / `not-in-portfolio` / `unknown` |

> **`reentsPortfolioStatus` geht NIEMALS in das Scoring ein.** Es ist ein neutrales
> Info-Badge. Siehe ADR-004 — dort steht auch, warum das nicht verhandelbar ist.

`xxl.maxSensibleEdgeMm` ist die „maximale sinnvolle Bauteilkante" — nicht der
Maschinenbauraum. Sie berücksichtigt Warping, Kammerbedarf, Spulengröße im Dauerlauf und
Materialkosten bei großer Masse.

**`maxSpoolWeightKg` und `largeSpoolShare` gehören zusammengelesen.** Die Maximalspule
allein täuscht: Bei `pa12` existiert am Markt keine Spule über 1 kg, bei `pla-cf` gibt es
5 kg — aber nur 5,6 % aller Angebote erreichen überhaupt 2 kg. Wer nach der Maximalzahl
plant, sucht am Ende einen einzelnen Anbieter in einer einzigen Farbe. Für ein Großteil,
das mehrere Kilogramm verbraucht, entscheidet die Kombination beider Zahlen darüber, ob
mitten im Bauteil ein Spulenwechsel fällt — mit Chargenwechsel, sichtbarer Naht und
Abbruchrisiko.

Beide sind **Marktbeobachtungen, keine Messungen und keine Lieferzusagen** (`src_ofd`,
Ceiling `low`, ADR-035).

### J · `governance` — Datenqualität

| Feld | Pflicht | Hinweis |
|---|---|---|
| `lastReviewed` | ja | ISO-Datum |
| `reviewedBy` | ja | Name; Entwürfe kennzeichnen |
| `reviewCycleMonths` | nein | Default 12 |
| `sources[]` | ja | siehe Abschnitt 3 |
| `dataCompleteness` | — | **berechnet**, in Datendateien immer `null` |
| `openQuestions[]` | nein | `blocking: true` verhindert den Status „geprüft" |

`openQuestions` ist kein Notizzettel, sondern Arbeitsvorrat: `affectsFields` verlinkt die
betroffenen Felder, `assignee` benennt den Verantwortlichen, `blocking` steuert das
Qualitätssiegel in der UI.

---

## 7. `dataCompleteness` — Berechnung

Berechnet von `scripts/build-index.ts`, nie von Hand gesetzt.

**Kernfeldsatz (gewichtet):** Die Vollständigkeit misst nicht „wie viele der ~150 Felder
sind gefüllt", sondern „sind die entscheidungsrelevanten Felder gefüllt". Ein Datensatz
mit Zugfestigkeit, HDT und Druckparametern ist brauchbarer als einer mit 40 Exotenfeldern.

| Gewicht | Felder |
|---|---|
| 3 (kritisch) | `tensileStrengthXy`, `tensileModulusXy`, `hdtB`, `nozzleTemperature`, `bedTemperature`, `chamberRequirement`, `printability`, `pricePerKg`, `identity.abstract`, `identity.positioning` |
| 2 (wichtig) | `tensileStrengthZ`, `anisotropyFactorTensile`, `elongationAtBreakXy`, `charpy*`, `glassTransition`, `hdtA`, `density`, `hygroscopy`, `warpingTendency`, `abrasiveness`, `hardenedNozzleRequired`, `uvResistance`, `chemicalResistance` (≥ 8 Einträge), `foodContact.status`, `ul94`, `availability`, `xxl.maxSensibleEdgeMm`, `paintAdhesion`, `surfaceQuality` |
| 1 (ergänzend) | alle übrigen Felder |

```
dataCompleteness = 100 × Σ(Gewicht befüllter Kernfelder) / Σ(Gewicht aller Kernfelder)
```

Zusätzlich wird ein **`confidenceScore`** ausgewiesen (Anteil der Felder mit `high`/`medium`).
Ein Datensatz kann 95 % vollständig und trotzdem überwiegend geschätzt sein — beide Zahlen
gehören nebeneinander in die UI.

Referenz `petg-cf` (Stand 2026-08-01): 100 provenienzbehaftete Felder,
davon **12 `high` · 35 `medium` · 11 `low` · 42 `estimated`**.
Rund 42 % beruhen also auf fachlicher Ableitung — das ist der ehrliche Ist-Zustand nach
Auswertung von drei Herstellerquellen und muss in der UI sichtbar sein.

---

## 8. Plausibilitätsregeln (CI)

Implementiert in `scripts/prototype/validate-plausibility.mjs`, ausgeführt gegen jeden
Datensatz. **Alle 11 Regeln laufen auf `petg-cf` grün** (Stand 2026-08-01).

| ID | Regel | Warum |
|---|---|---|
| R1 | `min ≤ value ≤ max`, `min ≤ max` | Tippfehler |
| R2 | Z-Wert ≤ XY-Wert (Festigkeit, Modul, Bruchdehnung) | FDM ist nie in Z stärker |
| R3 | Bei `amorphous`: `HDT-A ≤ Tg + 15 K` | Physik |
| R4 | `HDT-A ≤ HDT-B` | Höhere Last ⇒ niedrigere Temperatur |
| R5 | `bedTemperature < nozzleTemperature` | Prozesslogik |
| R6 | `dryingTemperature < Tg` | Sonst verbackt die Spule |
| R7 | `confidence ∈ {high, medium}` ⇒ echte Quelle (nicht nur `estimate_reasoning`) | Kernregel des Projekts |
| R8 | Jede `source`-ID ist auflösbar | Keine toten Referenzen |
| R9 | `confidence ≤ confidenceCeiling` der Quelle | Quellenqualität begrenzt Aussagekraft |
| R10 | Anisotropiefaktor nicht naiv aus quellengemischten Operanden | Verhindert Phantomzahlen |
| R11 | Jedes i18n-Objekt hat `de` **und** `en`, nicht leer | Zweisprachigkeit |

Weitere geplante Regeln: eindeutige IDs projektweit, `chemicalId` auflösbar gegen
`data/chemicals.json`, Skalen-Polarität vollständig, Preisspanne plausibel,
`partLevelWarning` vorhanden sobald `foodContact.status` gesetzt.

---

## 9. Checkliste beim Anlegen eines Datensatzes

- [ ] Jeder Zahlenwert hat Einheit, Quelle und Konfidenz
- [ ] Jeder mechanische Wert hat `orientation`
- [ ] `min`/`max` nur für echte Marktspannen, `tolerance` für Einzelquellenstreuung
- [ ] Kein `high`/`medium` ohne echte Quelle
- [ ] Anisotropiefaktor nur aus quellenreinen Operandenpaaren
- [ ] Vorbehandlung der Prüfkörper (getempert? getrocknet?) in `conditions` vermerkt
- [ ] `abstract` beantwortet in 40 Wörtern Eignung **und** Grenzen
- [ ] Widersprüche zwischen Quellen als `openQuestion` erfasst, nicht weggeglättet
- [ ] Alles Unbekannte weggelassen oder `unknown`/`null` — **nichts geraten**
- [ ] `npm run validate` läuft grün
