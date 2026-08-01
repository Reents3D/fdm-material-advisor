/**
 * Import: 3DJAKE (Niceshops GmbH, Österreich) — Eigenmarken.
 *
 * Quelle: Produktseiten auf 3djake.de, Datenblätter auf dem Niceshops-CDN
 * (3d.nice-cdn.com/upload/file/TDS_*.pdf).
 *
 * Kein Datenblatt deklariert den Prüfkörpertyp -> specimenType "undeclared".
 * Zwei Blätter der PLA-Reihe tragen einen offensichtlichen Zahlenfehler beim E-Modul;
 * der Wert wird nicht übernommen, der Befund steht am Produkt.
 *
 * Warum 3DJAKE interessant ist: ABS CF und ASA CF sind hier erkennbar EIGENSTÄNDIG
 * geprüft — Dichte, Steifigkeit und Bruchdehnung unterscheiden sich vom unverstärkten
 * Werkstoff, und beide Blätter nennen zusätzlich Kennwerte bei −30 °C. Das ist der
 * Gegenentwurf zu Datenblättern, die die CF-Variante einfach vom Grundtyp abschreiben.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-01";
const CDN = "https://3d.nice-cdn.com/upload/file";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

/* Der E-Modul-Fehler der PLA-Sonderfarben. Gilt fuer magicPLA und mysteryPLA. */
const MODULUS_FINDING = t(
  "Das Datenblatt nennt einen Zug-E-Modul von rund 380 bis 390 MPa. Für PLA ist das um den Faktor zehn zu niedrig — PLA liegt bei 3000 bis 3900 MPa, und das Schwesterprodukt ecoPLA desselben Hauses steht mit 3500 MPa im Blatt. Ein Werkstoff mit 390 MPa Steifigkeit und gleichzeitig 45 MPa Streckspannung müsste sich vor dem Fließen um über zehn Prozent elastisch dehnen, was PLA nicht tut. Der Wert wurde deshalb nicht übernommen; naheliegend ist ein verschobenes Komma.",
  "The datasheet states a tensile modulus of roughly 380 to 390 MPa. For PLA that is ten times too low — PLA sits at 3000 to 3900 MPa, and the sister product ecoPLA from the same house is listed at 3500 MPa. A material with 390 MPa stiffness and at the same time 45 MPa yield stress would have to stretch elastically by more than ten percent before yielding, which PLA does not. The value was therefore not imported; a misplaced decimal point is the obvious explanation.");

/**
 * Die vier Blaetter der Fassung 2.0 vom 01.03.2024 (ASA, PCTG, TPU A95, niceBIO) laufen
 * erkennbar aus einer gemeinsamen Vorlage. Drei von ihnen tragen dieselbe
 * Schmelztemperatur "190 °C ± 10 °C" und dieselbe VICAT A von 95 °C - auch dort, wo das
 * fachlich nicht sein kann. Das ist der Grund, warum diese Blaetter mit niedrigerem
 * Konfidenz-Ceiling stehen als die neueren Blaetter der Fassung 1.0 vom 01.10.2024,
 * die saubere ISO-Einheiten und eine Fussnote zur Wandstaerke beim Vicat-Versuch tragen.
 */

const P = [
  { id: "3djake-ecopla", material: "pla", name: "3DJAKE ecoPLA", file: "TDS_ecoPLA_v1.4", version: "1.3",
    props: {
      tensileStrengthXy: q(45, "MPa", { std: "ISO 527-1" }),
      tensileModulusXy: q(3500, "MPa", { std: "ISO 527-1" }),
      elongationAtBreakXy: q(5, "%", { std: "ISO 527-1 (≤ 5)" }),
      density: q(1.24, "g/cm³", { confidence: "low",
        note: t("Das Datenblatt weist diesen Wert ausdrücklich als „Literaturwert“ aus, nicht als eigene Messung — eine Offenheit, die man selten sieht.",
                "The datasheet explicitly marks this value as a “literature value”, not an own measurement — a candour one rarely sees.") }),
      glassTransition: q(60, "°C", { std: "DSC" }),
      nozzleTemperature: q(205, "°C", { min: 195, max: 215 }),
      bedTemperature: q(48, "°C", { min: 35, max: 60 }),
    },
    features: t("Der meistverkaufte Werkstoff des Hauses. Das Datenblatt kennzeichnet die Dichte als Literaturwert statt als Messung und nennt bei der Bruchdehnung nur eine Obergrenze — beides ehrlicher als eine erfundene Nachkommastelle.",
                "The house's best-selling material. The datasheet marks density as a literature value rather than a measurement and gives only an upper bound for elongation — both more honest than an invented decimal place.") },

  { id: "3djake-ecopla-cf", material: "pla", name: "3DJAKE ecoPLA CF", file: "TDS_3DJAKE_ecoPLA-CF", version: "1.0",
    props: {
      tensileStrengthXy: q(55, "MPa", { std: "ISO 527-1" }),
      tensileModulusXy: q(4300, "MPa", { std: "ISO 527-1" }),
      elongationAtBreakXy: q(3.5, "%", { std: "ISO 527-1" }),
      charpyNotchedXy: q(5, "kJ/m²", { std: "ISO 179-1eA" }),
      hdtB: q(65, "°C", { std: "ISO 75-1, 0,45 MPa" }),
      density: q(1.26, "g/cm³", { std: "ISO 1183-1/A" }),
      nozzleTemperature: q(225, "°C", { min: 210, max: 240 }),
      bedTemperature: q(40, "°C", { min: 20, max: 60 }),
    },
    features: t("Eigenständig geprüft, nicht vom Grundtyp abgeschrieben: gegenüber dem ecoPLA steigen Dichte (1,26 statt 1,24), Steifigkeit (4300 statt 3500 MPa) und Festigkeit (55 statt 45 MPa), während die Bruchdehnung fällt. Genau so verhält sich eine Carbonfaser-Füllung.",
                "Independently tested rather than copied from the base grade: against ecoPLA, density (1.26 instead of 1.24), stiffness (4300 instead of 3500 MPa) and strength (55 instead of 45 MPa) all rise while elongation falls. That is exactly how carbon fibre filling behaves.") },

  { id: "3djake-petg", material: "petg", name: "3DJAKE PETG", file: "TDS_PETG", version: "2.0",
    props: {
      tensileStrengthXy: q(50, "MPa", { std: "ISO 527 (Streckspannung)" }),
      tensileModulusXy: q(2020, "MPa", { std: "ISO 527" }),
      elongationAtYieldXy: q(6, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(23, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(69, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(2050, "MPa", { std: "ISO 178" }),
      charpyUnnotchedXy: q(8.1, "kJ/m²", { std: "ISO 179" }),
      hdtB: q(70, "°C", { std: "ASTM D648" }),
      density: q(1.27, "g/cm³", { std: "ISO 1183" }),
      waterAbsorption: q(0.11, "%", { std: "ISO 62 (1104 ppm)" }),
      nozzleTemperature: q(240, "°C", { min: 230, max: 250 }),
    },
    features: t("Eines der wenigen Datenblätter mit Feuchteaufnahme (1104 ppm) und Transparenz (90 % nach ASTM D1003) — beides für Sichtteile und für die Trocknungsplanung relevant.",
                "One of the few datasheets stating moisture uptake (1104 ppm) and transparency (90 % to ASTM D1003) — both relevant for visible parts and for drying planning.") },

  { id: "3djake-niceabs", material: "abs", name: "3DJAKE niceABS", file: "TDS_niceABS", version: "1.0",
    props: {
      tensileStrengthXy: q(43.6, "MPa", { std: "ISO 527 (Streckspannung)" }),
      tensileModulusXy: q(2030, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(34, "%", { std: "ISO 527" }),
      charpyUnnotchedXy: q(58, "kJ/m²", { std: "ISO 179" }),
      vicatA: q(97, "°C", { std: "ISO 306" }),
      density: q(1.1, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(245, "°C", { min: 235, max: 255 }),
    },
    anomaly: t("34 % Bruchdehnung und 58 kJ/m² ungekerbte Schlagzähigkeit erreicht ein gedrucktes ABS-Bauteil nicht — gedruckt liegen die Werte bei rund 5 bis 15 % beziehungsweise deutlich darunter. Die Zahlen beschreiben mit hoher Wahrscheinlichkeit das Granulat. Da das Blatt den Prüfkörper nicht deklariert, bleiben sie als Herstellerangabe stehen, sind aber nicht mit den gedruckten Werten von Bambu Lab oder Prusa vergleichbar.",
               "34 % elongation at break and 58 kJ/m² unnotched impact are not reached by a printed ABS part — printed values are around 5 to 15 % and considerably lower respectively. The figures most likely describe the pellets. As the sheet does not declare the specimen, they remain as a manufacturer statement but are not comparable with the printed values from Bambu Lab or Prusa.") },

  { id: "3djake-abs-cf", material: "abs", name: "3DJAKE ABS CF", file: "TDS_3DJAKE_ABS-CF", version: "1.0",
    props: {
      tensileStrengthXy: q(59, "MPa", { std: "ISO 527" }),
      tensileModulusXy: q(3000, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(7, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(85, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(3080, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: q(14, "kJ/m²", { std: "ISO 179/1eA, 23 °C" }),
      izodNotchedXy: q(14, "kJ/m²", { std: "ISO 180/1A, 23 °C" }),
      hdtA: q(87, "°C", { std: "ISO 75, 1,8 MPa, flachkant" }),
      vicatB50: q(98, "°C", { std: "ISO 306, 50 N, 50 °C/h" }),
      density: q(1.08, "g/cm³", { std: "ISO 1183-1/A" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }),
      bedTemperature: q(105, "°C", { min: 100, max: 110 }),
    },
    features: t("Das Gegenstück zu Datenblättern, die die CF-Variante vom Grundtyp abschreiben: Dichte, Steifigkeit und Bruchdehnung unterscheiden sich sichtbar vom unverstärkten niceABS, und das Blatt nennt zusätzlich Kerbschlagwerte bei −30 °C (7 kJ/m² gegen 14 bei Raumtemperatur).",
                "The counterpart to datasheets that copy the CF grade from the base type: density, stiffness and elongation differ visibly from unfilled niceABS, and the sheet additionally gives notched impact at −30 °C (7 kJ/m² against 14 at room temperature).") },

  { id: "3djake-asa-cf", material: "asa-cf", name: "3DJAKE ASA CF", file: "TDS_3DJAKE_ASA-CF", version: "1.0",
    props: {
      tensileStrengthXy: q(62, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(8, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(93, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(3100, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: q(9, "kJ/m²", { std: "ISO 179/1eA, 23 °C" }),
      izodNotchedXy: q(9.5, "kJ/m²", { std: "ISO 180/1A, 23 °C" }),
      hdtA: q(93, "°C", { std: "ISO 75, 1,8 MPa, flachkant" }),
      vicatB50: q(101, "°C", { std: "ISO 306, 50 N, 50 °C/h" }),
      density: q(1.12, "g/cm³", { std: "ISO 1183-1/A" }),
      nozzleTemperature: q(250, "°C", { min: 240, max: 260 }),
      bedTemperature: q(110, "°C" ),
    },
    features: t("93 MPa Biegefestigkeit und HDT-A 93 °C — der Wert bei 1,8 MPa Last, nicht der geschmeichelte bei 0,45 MPa. Datenblätter, die HDT-A angeben, machen es sich schwerer und sind deshalb aussagekräftiger.",
                "93 MPa flexural strength and HDT-A of 93 °C — the figure at 1.8 MPa load, not the flattering one at 0.45 MPa. Datasheets that state HDT-A make it harder for themselves and are therefore more informative.") },

  { id: "3djake-magicpla", material: "pla", name: "3DJAKE magicPLA", file: "TDS_magicPLA", version: "1.0",
    props: {
      tensileStrengthXy: q(45.8, "MPa", { std: "ISO 527 (Streckspannung)" }),
      elongationAtYieldXy: q(10, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(20.4, "%", { std: "ISO 527" }),
      charpyUnnotchedXy: q(2.9, "kJ/m²", { std: "ISO 179" }),
      density: q(1.243, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }),
    },
    anomaly: MODULUS_FINDING },

  { id: "3djake-mysterypla", material: "pla", name: "3DJAKE mysteryPLA", file: "TDS_mysteryPLA_v1.1", version: "1.1",
    props: {
      tensileStrengthXy: q(44.8, "MPa", { std: "ISO 527 (Streckspannung)" }),
      elongationAtYieldXy: q(10.1, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(20, "%", { std: "ISO 527" }),
      charpyUnnotchedXy: q(2.6, "kJ/m²", { std: "ISO 179" }),
      density: q(1.234, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }),
    },
    anomaly: MODULUS_FINDING },
  /* ---- Nachtrag 2026-08-01: die restlichen Eigenmarken-Datenblaetter ------- */

  { id: "3djake-abs", material: "abs", name: "3DJAKE ABS", file: "3DJake_ABS", version: "1.0",
    props: {
      tensileStrengthXy: q(49, "MPa", { std: "ASTM D638" }),
      tensileModulusXy: q(2350, "MPa", { std: "ASTM D638" }),
      elongationAtYieldXy: q(5, "%", { std: "ASTM D638" }),
      elongationAtBreakXy: q(10, "%", { std: "ASTM D638" }),
      flexuralStrengthXy: q(78, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(2550, "MPa", { std: "ASTM D790" }),
      hdtB: q(85, "°C", { std: "ASTM D648" }),
      vicatA: q(92, "°C", { std: "im Blatt als ASTM D792 angegeben", confidence: "low" }),
      density: q(1.06, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }),
      bedTemperature: q(105, "°C", { min: 100, max: 110 }),
    },
    anomaly: t("Zwei Zeilen des Blattes nennen die falsche Norm beziehungsweise die falsche Einheit: Die VICAT-Temperatur steht unter ASTM D792 — das ist die Dichtebestimmung im Auftriebsverfahren, der Vicat-Versuch ist ASTM D1525. Und der Schmelzindex steht mit „21 g/cm³“ da; ein MFR wird in g/10 min gemessen, g/cm³ ist eine Dichte. Beide Zeilen wurden nicht übernommen beziehungsweise nur mit Vermerk. Die übrigen Werte sind in sich schlüssig.",
               "Two rows of the sheet cite the wrong standard or the wrong unit: the VICAT temperature sits under ASTM D792 — that is density by buoyancy, the Vicat test is ASTM D1525. And the melt flow rate reads “21 g/cm³”; an MFR is measured in g/10 min, g/cm³ is a density. Both rows were left out or carried with a note. The remaining values are internally consistent."),
    features: t("Das jüngere der beiden ABS-Blätter des Hauses (01.10.2024) und das schlüssigere: 49 MPa Zugfestigkeit bei 10 % Bruchdehnung passen zusammen, während das Schwesterprodukt niceABS mit 34 % Bruchdehnung und 58 kJ/m² ungekerbter Schlagzähigkeit eher das Granulat beschreibt.",
                "The younger of the two ABS sheets from this house (01.10.2024) and the more coherent one: 49 MPa tensile at 10 % elongation fit together, whereas the sister product niceABS with 34 % elongation and 58 kJ/m² unnotched impact rather describes the pellets.") },

  { id: "3djake-asa", material: "asa", name: "3DJAKE ASA", file: "Technical_Data_Sheet_ASA_V2", version: "2.0",
    props: {
      density: q(1.1, "g/cm³", { std: "ISO 1183" }),
      vicatA: q(95, "°C", { std: "ISO 306", confidence: "low" }),
      shrinkage: q(0.5, "%", { std: "ISO 294-4" }),
      nozzleTemperature: q(230, "°C", { min: 210, max: 250 }),
      bedTemperature: q(80, "°C", { min: 60, max: 100 }),
    },
    anomaly: t("Die beiden mechanischen Zeilen wurden NICHT übernommen, weil Eigenschaft und Prüfnorm einander widersprechen: „Tensile strength 800 kg/cm²“ und „Tensile modulus 22100 kg/cm²“ stehen beide unter ASTM D790 — das ist die Norm für den BIEGEversuch, für Zug wäre es D638. Umgerechnet ergäben 800 kg/cm² rund 78 MPa Zugfestigkeit; das erreicht kein gedrucktes und kaum ein spritzgegossenes ASA (typisch 40 bis 45 MPa), als Biegefestigkeit wäre der Wert dagegen plausibel. Welche der beiden Angaben stimmt, lässt sich dem Blatt nicht entnehmen — deshalb steht keine von beiden in der Datenbank. Hinzu kommt: Das Blatt nennt für das amorphe ASA eine Schmelztemperatur, und im Fließtext steht „PLA can be used on all common desktop FDM printers“ — ein stehengebliebener Satz aus der PLA-Vorlage.",
               "The two mechanical rows were NOT imported because property and test standard contradict each other: “Tensile strength 800 kg/cm²” and “Tensile modulus 22100 kg/cm²” both sit under ASTM D790 — the standard for the FLEXURAL test; tensile would be D638. Converted, 800 kg/cm² would be about 78 MPa tensile strength; no printed and barely any moulded ASA reaches that (typically 40 to 45 MPa), whereas as a flexural strength the value would be plausible. Which of the two readings holds cannot be taken from the sheet — so neither is in the database. On top of that the sheet states a melting temperature for amorphous ASA, and the body text reads “PLA can be used on all common desktop FDM printers” — a leftover sentence from the PLA template.") },

  { id: "3djake-pctg", material: "pctg", name: "3DJAKE PCTG", file: "Technical_Data_Sheet_PCTG_V2", version: "2.0",
    props: {
      tensileStrengthXy: q(44, "MPa", { std: "ISO 527 (Streckspannung; Bruchspannung 46 MPa)" }),
      elongationAtYieldXy: q(4.4, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(220, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(60, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(1600, "MPa", { std: "ISO 178" }),
      hdtA: q(64, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(76, "°C", { std: "ISO 75, 0,455 MPa" }),
      density: q(1.23, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(260, "°C", { min: 250, max: 270 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    features: t("Das sauberste Blatt der Reihe: beide HDT-Lasten sind angegeben (76 °C bei 0,455 MPa, 64 °C bei 1,8 MPa) statt nur der geschmeichelten, und Streck- und Bruchspannung stehen getrennt. 220 % Bruchdehnung erklären, warum PCTG dort gewählt wird, wo PETG zu spröde bricht.",
                "The cleanest sheet in the series: both HDT loads are given (76 °C at 0.455 MPa, 64 °C at 1.8 MPa) rather than only the flattering one, and yield and break stress are stated separately. 220 % elongation at break explains why PCTG is chosen where PETG breaks too brittle.") },

  { id: "3djake-tpu-a95", material: "tpu-95a", name: "3DJAKE TPU A95", file: "Technical_Data_Sheet_TPU_A95_V2", version: "2.0",
    props: {
      tensileStrengthXy: q(55, "MPa", { std: "ASTM D412" }),
      elongationAtBreakXy: q(400, "%", { std: "ASTM D412" }),
      hardnessShoreA: q(95, "Shore A", { std: "ASTM D2240" }),
      density: q(1.2, "g/cm³", { std: "ISO 1183" }),
      shrinkage: q(0.5, "%", { std: "ISO 294-4" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
      bedTemperature: q(75, "°C", { min: 60, max: 90 }),
    },
    anomaly: t("Der Biege-E-Modul von 23500 kg/cm² wurde nicht übernommen: umgerechnet sind das rund 2300 MPa. Ein Elastomer mit Shore 95A liegt bei 20 bis 80 MPa — der Wert ist um etwa den Faktor dreißig zu hoch und liegt verdächtig nah am Zug-E-Modul im ASA-Blatt desselben Hauses (22100 kg/cm²). Ebenso stehen die VICAT A von 95 °C und die Schmelztemperatur von 190 °C wortgleich im ASA-Blatt.",
               "The flexural modulus of 23500 kg/cm² was not imported: converted, that is about 2300 MPa. An elastomer at Shore 95A sits at 20 to 80 MPa — the value is roughly thirty times too high and lies suspiciously close to the tensile modulus in this house's ASA sheet (22100 kg/cm²). Likewise the VICAT A of 95 °C and the melting temperature of 190 °C appear verbatim in the ASA sheet.") },

  { id: "3djake-mattepla", material: "pla", name: "3DJAKE mattePLA", file: "3DJake_mattePLA", version: "1.0",
    props: {
      tensileStrengthXy: q(47, "MPa", { std: "ISO 527" }),
      tensileModulusXy: q(2600, "MPa", { std: "ISO 527" }),
      elongationAtYieldXy: q(4, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(19, "%", { std: "ISO 527-2" }),
      flexuralModulusXy: q(2650, "MPa", { std: "ISO 178" }),
      vicatA: q(60, "°C", { std: "ISO 306", conditions: "Wandstärke mindestens 4 mm" }),
      density: q(1.3, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
      bedTemperature: q(30, "°C", { min: 0, max: 60 }),
    },
    features: t("Die Dichte von 1,3 g/cm³ gegenüber 1,24 beim ecoPLA zeigt die mineralische Füllung, die den matten Effekt macht — sie kostet Steifigkeit (2600 statt 3500 MPa). Bemerkenswert ist die Fussnote: Die Temperaturbeständigkeit gilt ausdrücklich erst ab 4 mm Wandstärke. Solche Einschränkungen stehen selten im Blatt, obwohl sie für dünnwandige Teile den Unterschied machen.",
                "The density of 1.3 g/cm³ against 1.24 for ecoPLA shows the mineral filling that creates the matte effect — it costs stiffness (2600 instead of 3500 MPa). The footnote is notable: temperature resistance explicitly applies only from 4 mm wall thickness. Such qualifications rarely appear on a datasheet even though they make the difference for thin-walled parts.") },

  { id: "3djake-easypetg", material: "petg", name: "3DJAKE easyPETG", file: "3DJake_easyPETG", version: "1.0",
    props: {
      tensileStrengthXy: q(53, "MPa", { std: "ISO 527-2" }),
      elongationAtYieldXy: q(4, "%", { std: "ISO 527-2" }),
      elongationAtBreakXy: q(31, "%", { std: "ISO 527-2" }),
      flexuralStrengthXy: q(71, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(2190, "MPa", { std: "ISO 178" }),
      vicatA: q(78, "°C", { std: "ISO 306", conditions: "Wandstärke mindestens 4 mm" }),
      density: q(1.29, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(240, "°C", { min: 230, max: 250 }),
      bedTemperature: q(75, "°C", { min: 60, max: 90 }),
    },
    features: t("Der Nachfolger des älteren „3DJAKE PETG“: 53 statt 50 MPa Zugfestigkeit, 31 statt 23 % Bruchdehnung. Beide Blätter stehen nebeneinander in der Datenbank, weil beide Produkte im Handel sind — der Unterschied zeigt, wie stark „PETG“ schon innerhalb einer Marke streut.",
                "The successor to the older “3DJAKE PETG”: 53 instead of 50 MPa tensile strength, 31 instead of 23 % elongation at break. Both sheets sit side by side in the database because both products are on sale — the difference shows how widely “PETG” already scatters within a single brand.") },

  { id: "3djake-nicebio", material: "pla", name: "3DJAKE niceBIO", file: "Technical_Data_Sheet_niceBIO_V2", version: "2.0",
    props: {
      tensileStrengthXy: q(55, "MPa", { std: "ISO 527" }),
      flexuralModulusXy: q(5100, "MPa", { std: "im Blatt als ISO 527 angegeben; für Biegeversuche wäre ISO 178 einschlägig", confidence: "low" }),
      charpyNotchedXy: q(43, "kJ/m²", { std: "ISO 179-1/1eA", confidence: "low" }),
      hdtB: q(54, "°C", { std: "ISO 75" }),
      vicatA: q(146, "°C", { std: "ISO 306", confidence: "low" }),
      density: q(1.33, "g/cm³", { std: "ISO 1183" }),
      shrinkage: q(0.4, "%", { std: "ISO 294-4" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
      bedTemperature: q(30, "°C", { min: 0, max: 60 }),
    },
    anomaly: t("Dieses Blatt widerspricht sich an drei Stellen. Erstens: „Breaking stress 2 %“ — eine Spannung in Prozent gibt es nicht; gemeint ist offenkundig die Bruchdehnung, aber weil das Blatt es nicht sagt, steht der Wert nicht in der Datenbank. Zweitens: VICAT A 146 °C neben HDT-B 54 °C. Zwischen beiden liegen 92 Kelvin; für denselben Werkstoff ist das nicht plausibel, und 146 °C wären für einen PLA-Biokompound aussergewöhnlich. Drittens: 43 kJ/m² gekerbte Schlagzähigkeit passen nicht zu einem Werkstoff, der laut demselben Blatt bei 2 % bricht — gekerbt liegt selbst Polycarbonat bei 10 bis 15 kJ/m². Die Werte stehen als Herstellerangabe mit niedriger Konfidenz, geglättet wird nichts.",
               "This sheet contradicts itself in three places. First: “Breaking stress 2 %” — there is no such thing as a stress in percent; elongation at break is obviously meant, but because the sheet does not say so, the value is not in the database. Second: VICAT A 146 °C next to HDT-B 54 °C. That is 92 kelvin apart; for the same material this is not plausible, and 146 °C would be exceptional for a PLA bio compound. Third: 43 kJ/m² notched impact does not fit a material that breaks at 2 % according to the same sheet — notched, even polycarbonate sits at 10 to 15 kJ/m². The values stand as manufacturer statements at low confidence; nothing is smoothed."),
    features: t("Kein unverstärktes PLA, sondern ein PLA-Biokompound: Dichte 1,33 g/cm³ und ein Biege-E-Modul von 5100 MPa liegen weit über dem ecoPLA desselben Hauses (1,24 g/cm³, 3500 MPa Zug-E-Modul). Der Hersteller gibt an, das Material sei industriell kompostierbar und enthalte neben PLA weitere Bestandteile.",
                "Not an unfilled PLA but a PLA bio compound: density 1.33 g/cm³ and a flexural modulus of 5100 MPa sit far above this house's ecoPLA (1.24 g/cm³, 3500 MPa tensile modulus). The manufacturer states the material is industrially compostable and contains further components besides PLA.") },
];

const SPECIMEN_NOTE = t(
  "3DJAKE deklariert in keinem Datenblatt, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde. Die Werte sind deshalb nicht direkt mit Bambu Lab oder Prusa Polymers vergleichbar, die gedruckte Prüfkörper ausweisen.",
  "3DJAKE does not declare in any datasheet whether values were measured on printed or moulded specimens. The values are therefore not directly comparable with Bambu Lab or Prusa Polymers, which declare printed specimens.");

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, na = 0;
for (const p of P) {
  const url = `${CDN}/${p.file}.pdf`;
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "3DJAKE", manufacturer: "Niceshops GmbH (3DJAKE)", productName: p.name, origin: "Österreich",
    specimenType: "undeclared",
    specimenNote: p.anomaly
      ? t(`${SPECIMEN_NOTE.de}\n\nBefund zu diesem Datenblatt: ${p.anomaly.de}`,
          `${SPECIMEN_NOTE.en}\n\nFinding on this datasheet: ${p.anomaly.en}`)
      : SPECIMEN_NOTE,
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technical Data Sheet`, url, version: p.version, retrievedAt: RETRIEVED },
    productUrl: "https://www.3djake.de/3djake/3djake-filament",
    properties: p.props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Niceshops GmbH (3DJAKE)",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url, retrievedAt: RETRIEVED, confidenceCeiling: p.anomaly ? "low" : "medium",
        note: t("Herstellerdatenblatt ohne Angabe des Prüfkörpertyps. Wo das Blatt einen in sich widersprüchlichen Wert enthält, steht das Ceiling auf 'low'.",
                "Manufacturer datasheet without a declared specimen type. Where the sheet contains an internally inconsistent value the ceiling is set to 'low'."),
      }],
    },
  };
  writeFileSync(path.join(out, `${p.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  n++;
  if (p.anomaly) na++;
}
console.log(`${n} 3DJAKE-Produkte geschrieben (${na} mit dokumentiertem Datenblatt-Befund)`);
