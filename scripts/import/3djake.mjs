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
