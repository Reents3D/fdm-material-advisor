/**
 * Import: Herstellerprodukte (Prusament, AzureFilm, Extrudr, …).
 *
 * WARUM EINE EIGENE EBENE NEBEN data/materials/?
 * `data/materials/` beschreibt den WERKSTOFFTYP (PETG, ASA, …) — darauf arbeitet die
 * Empfehlungs-Engine. `data/products/` beschreibt ein konkretes HANDELSPRODUKT einer
 * Marke mit dessen eigenem Datenblatt. Nur so lässt sich beantworten: "Welches PETG
 * von welchem Hersteller?"
 *
 * DER ENTSCHEIDENDE FUND — `specimenType`
 * Die Hersteller veröffentlichen unter derselben Überschrift Unterschiedliches:
 *
 *   printed  Prüfkörper wurden GEDRUCKT (Bambu Lab, Prusa Polymers).
 *            Das ist der Wert, den ein FDM-Bauteil tatsächlich hat.
 *   moulded  Werte stammen aus dem Rohstoffdatenblatt, also spritzgegossen
 *            (AzureFilm: PETG mit 29 % Bruchdehnung — an einem gedruckten Teil
 *            physikalisch unmöglich).
 *   undeclared  Datenblatt sagt es nicht.
 *
 * Ein Vergleich über diese Grenze hinweg ist unzulässig. Deshalb trägt jeder Wert die
 * Angabe mit, und die Oberfläche gruppiert danach statt stumpf zu sortieren.
 *
 * Ausführen: node scripts/import/manufacturer-products.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "data/products");
const RETRIEVED = "2026-08-01";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.tol != null ? { tolerance: o.tol } : {}),
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "high",
  ...(o.note ? { note: o.note } : {}),
});

/* --------------------------------------------------------------- Produkte */

const PRODUCTS = [
  /* ---------------------------------------------------------- Prusament */
  {
    id: "prusament-pla",
    materialId: "pla",
    brand: "Prusament",
    manufacturer: "Prusa Polymers",
    productName: "Prusament PLA",
    origin: "Tschechien",
    specimenType: "printed",
    datasheet: {
      title: "Prusament PLA — Technical Data Sheet",
      url: "https://prusament.com/wp-content/uploads/2022/10/PLA_Prusament_TDS_2021_10_EN.pdf",
      version: "2021/10",
    },
    productUrl: "https://prusament.com/materials/prusament-pla/",
    props: {
      density: q(1.24, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(51, "MPa", { tol: 3, std: "ISO 527-1", orientation: "XY", conditions: "gedruckter Prüfkörper, horizontal" }),
      tensileStrengthXz: q(59, "MPa", { tol: 2, std: "ISO 527-1", orientation: "XZ", conditions: "gedruckter Prüfkörper, vertikal xz" }),
      tensileModulusXy: q(2300, "MPa", { tol: 100, std: "ISO 527-1", orientation: "XY" }),
      elongationAtYieldXy: q(2.9, "%", { tol: 0.3, std: "ISO 527-1", orientation: "XY" }),
      flexuralStrengthXy: q(83, "MPa", { tol: 6, std: "ISO 178", orientation: "XY" }),
      charpyUnnotchedXy: q(13, "kJ/m²", { tol: 1, std: "ISO 179-1", orientation: "XY" }),
      interlayerAdhesion: q(17, "MPa", { tol: 3, std: "Prusa Polymers (herstellereigene Methode)", orientation: "Z" }),
      hdtA: q(55, "°C", { std: "ISO 75, 1.8 MPa" }),
      hdtB: q(55, "°C", { std: "ISO 75, 0.45 MPa" }),
      nozzleTemperature: q(210, "°C", { min: 200, max: 220 }),
      bedTemperature: q(50, "°C", { min: 40, max: 60 }),
    },
  },
  {
    id: "prusament-petg",
    materialId: "petg",
    brand: "Prusament",
    manufacturer: "Prusa Polymers",
    productName: "Prusament PETG",
    origin: "Tschechien",
    specimenType: "printed",
    datasheet: {
      title: "Prusament PETG — Technical Data Sheet",
      url: "https://prusament.com/wp-content/uploads/2022/10/PETG_Prusament_TDS_2021_10_EN.pdf",
      version: "2021/10",
    },
    productUrl: "https://prusament.com/materials/prusament-petg/",
    props: {
      density: q(1.27, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(47, "MPa", { tol: 2, std: "ISO 527-1", orientation: "XY", conditions: "gedruckter Prüfkörper, horizontal" }),
      tensileStrengthXz: q(50, "MPa", { tol: 1, std: "ISO 527-1", orientation: "XZ", conditions: "gedruckter Prüfkörper, vertikal xz" }),
      tensileModulusXy: q(1500, "MPa", { tol: 100, std: "ISO 527-1", orientation: "XY" }),
      elongationAtYieldXy: q(5.1, "%", { tol: 0.1, std: "ISO 527-1", orientation: "XY" }),
      flexuralStrengthXy: q(66, "MPa", { tol: 2, std: "ISO 178", orientation: "XY" }),
      charpyNotchedXy: q(6, "kJ/m²", { tol: 1, std: "ISO 179-1 (gekerbt)", orientation: "XY" }),
      interlayerAdhesion: q(18, "MPa", { tol: 4, std: "Prusa Polymers (herstellereigene Methode)", orientation: "Z" }),
      hdtA: q(68, "°C", { std: "ISO 75, 1.8 MPa" }),
      hdtB: q(68, "°C", { std: "ISO 75, 0.45 MPa" }),
      nozzleTemperature: q(250, "°C", { min: 240, max: 260 }),
      bedTemperature: q(80, "°C", { min: 70, max: 90 }),
    },
  },
  {
    id: "prusament-asa",
    materialId: "asa",
    brand: "Prusament",
    manufacturer: "Prusa Polymers",
    productName: "Prusament ASA",
    origin: "Tschechien",
    specimenType: "printed",
    datasheet: {
      title: "Prusament ASA — Technical Data Sheet",
      url: "https://prusament.com/wp-content/uploads/2022/10/ASA_Prusament_TDS_2022_16_EN.pdf",
      version: "2022/16",
    },
    productUrl: "https://prusament.com/materials/prusament-asa/",
    props: {
      density: q(1.07, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(42, "MPa", { tol: 1, std: "ISO 527-1", orientation: "XY", conditions: "gedruckter Prüfkörper, horizontal" }),
      tensileStrengthXz: q(45, "MPa", { tol: 2, std: "ISO 527-1", orientation: "XZ" }),
      tensileModulusXy: q(1600, "MPa", { tol: 100, std: "ISO 527-1", orientation: "XY" }),
      elongationAtYieldXy: q(3.4, "%", { tol: 0.2, std: "ISO 527-1", orientation: "XY" }),
      flexuralStrengthXy: q(64, "MPa", { tol: 1, std: "ISO 178", orientation: "XY" }),
      charpyUnnotchedXy: q(25, "kJ/m²", { tol: 3, std: "ISO 179-1 (ungekerbt)", orientation: "XY" }),
      charpyNotchedXy: q(12, "kJ/m²", { tol: 1, std: "ISO 179-1 (gekerbt)", orientation: "XY" }),
      interlayerAdhesion: q(11, "MPa", { tol: 1, std: "Prusa Polymers (herstellereigene Methode)", orientation: "Z",
        note: t("Der niedrigste Schichthaftungswert der drei Prusament-Typen — ASA verbindet sich schlechter zwischen den Schichten als PLA und PETG. Deckt sich mit dem Einbruch der Schlagzähigkeit in Z bei anderen ASA-Datensätzen.",
                "The lowest interlayer adhesion of the three Prusament grades — ASA bonds between layers less well than PLA and PETG. Consistent with the collapse of Z impact strength seen in other ASA records.") }),
      hdtA: q(86, "°C", { std: "ISO 75, 1.8 MPa" }),
      hdtB: q(93, "°C", { std: "ISO 75, 0.45 MPa" }),
      nozzleTemperature: q(260, "°C", { min: 250, max: 270 }),
      bedTemperature: q(110, "°C", { min: 105, max: 115 }),
    },
  },

  /* ---------------------------------------------------------- AzureFilm */
  {
    id: "azurefilm-pla",
    materialId: "pla",
    brand: "AzureFilm",
    manufacturer: "AzureFilm d.o.o.",
    productName: "AzureFilm PLA",
    origin: "Slowenien",
    specimenType: "moulded",
    specimenNote: t(
      "Das Datenblatt weist Rohstoffkennwerte aus, keine gedruckten Prüfkörper: 59 MPa Zugfestigkeit bei 4,2 % Bruchdehnung ist typisches Spritzguss-PLA. Ein gedrucktes Bauteil erreicht das nicht. Nicht mit Bambu- oder Prusament-Werten in einer Spalte vergleichen.",
      "The datasheet reports raw-material values, not printed specimens: 59 MPa at 4.2 % elongation is typical injection-moulded PLA. A printed part does not reach this. Do not compare in one column with Bambu or Prusament values."),
    datasheet: {
      title: "AzureFilm PLA — Technical Data Sheet",
      url: "https://3d.nice-cdn.com/upload/file/PLA_TDS.pdf",
    },
    productUrl: "https://azurefilm.com/technical-data-sheets/",
    props: {
      tensileStrengthXy: q(59, "MPa", { std: "ISO 527, 50 mm/min", orientation: "isotropic", conditions: "Rohstoffkennwert (nicht gedruckt)", confidence: "medium" }),
      tensileModulusXy: q(3300, "MPa", { std: "ISO 527, 1 mm/min", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      elongationAtBreakXy: q(4.2, "%", { std: "ISO 527, 50 mm/min", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      flexuralStrengthXy: q(73.6, "MPa", { std: "ISO 178", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      flexuralModulusXy: q(2800, "MPa", { std: "ISO 178", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
  },
  {
    id: "azurefilm-petg",
    materialId: "petg",
    brand: "AzureFilm",
    manufacturer: "AzureFilm d.o.o.",
    productName: "AzureFilm PETG",
    origin: "Slowenien",
    specimenType: "moulded",
    specimenNote: t(
      "Rohstoffkennwerte, keine gedruckten Prüfkörper. Deutlichster Hinweis: 29 % Bruchdehnung — an einem gedruckten PETG-Bauteil physikalisch nicht erreichbar (gedruckt sind es rund 5-10 %). Die Zahlen beschreiben das Granulat, nicht Ihr Bauteil.",
      "Raw-material values, not printed specimens. Clearest indicator: 29 % elongation at break — physically unattainable on a printed PETG part (printed values are around 5-10 %). The figures describe the pellets, not your part."),
    datasheet: {
      title: "AzureFilm PETG — Technical Data Sheet",
      url: "https://www.3d-colour.com/wp-content/uploads/2023/04/AzureFilm_PETG_TDS.pdf",
    },
    productUrl: "https://azurefilm.com/technical-data-sheets/",
    props: {
      density: q(1.29, "g/cm³", { std: "ASTM D-792" }),
      tensileStrengthXy: q(51, "MPa", { std: "ISO 527-2 (Streckspannung)", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      tensileModulusXy: q(2980, "MPa", { std: "ISO 527-2", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      elongationAtBreakXy: q(29, "%", { std: "ISO 527-2", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      flexuralStrengthXy: q(68, "MPa", { std: "ISO 178", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      flexuralModulusXy: q(2040, "MPa", { std: "ISO 178", orientation: "isotropic", conditions: "Rohstoffkennwert", confidence: "medium" }),
      bedTemperature: q(85, "°C", { min: 80, max: 90 }),
    },
  },

  /* ------------------------------------------------------------- Extrudr */
  {
    id: "extrudr-pla-nx2",
    materialId: "pla",
    brand: "Extrudr",
    manufacturer: "FD3D GmbH (Extrudr)",
    productName: "Extrudr PLA NX2 Matt",
    origin: "Österreich",
    specimenType: "undeclared",
    specimenNote: t(
      "Das Datenblatt nennt Prüfnormen und Druckeinstellungen, sagt aber nicht, ob die Kennwerte an gedruckten oder spritzgegossenen Prüfkörpern ermittelt wurden. Die Kombination aus 47 MPa und 19 % nomineller Bruchdehnung deutet auf Rohstoffwerte hin.",
      "The datasheet names test standards and print settings but does not state whether values were measured on printed or injection-moulded specimens. The combination of 47 MPa and 19 % nominal elongation suggests raw-material values."),
    datasheet: {
      title: "Extrudr PLA NX2 Matt — Technisches Datenblatt (DE)",
      url: "https://filamentworld.de/fact-sheets/Extrudr_PLA-NX2_Datenblatt_DE.pdf",
    },
    productUrl: "https://www.extrudr.com/de/shop-eu/page/datasheets/",
    props: {
      tensileStrengthXy: q(47, "MPa", { std: "ISO 527", orientation: "n/a", confidence: "medium" }),
      tensileModulusXy: q(2600, "MPa", { std: "ISO 527", orientation: "n/a", confidence: "medium" }),
      elongationAtBreakXy: q(19, "%", { std: "ISO 527-2 (nominell)", orientation: "n/a", confidence: "medium" }),
      flexuralModulusXy: q(2650, "MPa", { std: "ISO 178", orientation: "n/a", confidence: "medium" }),
      charpyNotchedXy: q(7, "kJ/m²", { std: "ISO 179/1eA (gekerbt)", orientation: "n/a", confidence: "medium" }),
      vicatA: q(60, "°C", { std: "ISO 306 (Methode A)", confidence: "medium" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
      bedTemperature: q(40, "°C", { min: 20, max: 60 }),
    },
    features: t(
      "Matte Oberfläche, CO2-neutral zertifiziert, verbesserte UV-Beständigkeit, entspricht FDA-, RoHS- und Spielzeugsicherheits-Bestimmungen. Kein geschlossener Bauraum und keine gehärtete Düse nötig.",
      "Matte surface, certified CO2-neutral, improved UV resistance, complies with FDA, RoHS and toy safety regulations. No enclosure and no hardened nozzle required."),
  },
];

/* ------------------------------------------------------------- Schreiben */

mkdirSync(OUT, { recursive: true });

for (const p of PRODUCTS) {
  const rec = {
    $schema: "../../schema/product.schema.json",
    schemaVersion: "1.0.0",
    id: p.id,
    materialId: p.materialId,
    brand: p.brand,
    manufacturer: p.manufacturer,
    productName: p.productName,
    ...(p.origin ? { origin: p.origin } : {}),
    specimenType: p.specimenType,
    ...(p.specimenNote ? { specimenNote: p.specimenNote } : {}),
    ...(p.features ? { features: p.features } : {}),
    datasheet: { ...p.datasheet, retrievedAt: RETRIEVED },
    ...(p.productUrl ? { productUrl: p.productUrl } : {}),
    properties: p.props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: p.manufacturer,
        productName: p.productName, title: p.datasheet.title,
        ...(p.datasheet.version ? { documentVersion: p.datasheet.version } : {}),
        url: p.datasheet.url, retrievedAt: RETRIEVED,
        confidenceCeiling: p.specimenType === "printed" ? "high" : "medium",
      }],
    },
  };
  writeFileSync(path.join(OUT, `${p.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  console.log(`wrote data/products/${p.id}.json  [${p.specimenType}]`);
}

const byType = PRODUCTS.reduce((a, p) => ({ ...a, [p.specimenType]: (a[p.specimenType] ?? 0) + 1 }), {});
console.log(`\n${PRODUCTS.length} Produkte:`, byType);
