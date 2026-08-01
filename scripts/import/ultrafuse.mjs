/**
 * Import: Ultrafuse (Forward AM / BASF 3D Printing Solutions BV, Niederlande).
 *
 * WARUM DIESE BLAETTER BESONDERS SIND
 * Sie geben die Mechanik in DREI Bauorientierungen an — XY liegend, XZ hochkant, ZX
 * stehend — und nennen zusaetzlich die Druckparameter, mit denen die Pruefkoerper
 * hergestellt wurden. Damit beantworten sie die Frage, um die dieses Werkzeug gebaut
 * ist, direkt aus der Quelle statt aus einer Ableitung:
 *
 *   PET CF15   63,2 MPa liegend  ->  12,5 MPa stehend   (Faktor 0,20)
 *   PAHT CF15 103,2 MPa liegend  ->  18,2 MPa stehend   (Faktor 0,18)
 *
 * Beim PET CF15 faellt die ungekerbte Schlagzaehigkeit von 27,8 auf 1,3 kJ/m² — auf
 * knapp fuenf Prozent. Kein anderes Datenblatt im Bestand macht diesen Einbruch so
 * unmissverstaendlich sichtbar.
 *
 * ZUGANG
 * Die Datenblaetter liegen hinter einem Dokumentenportal, das eine Anmeldung verlangt.
 * Diese beiden waren als direkte PDF-Adresse erreichbar; die uebrigen Ultrafuse-Typen
 * (ABS, ASA, PET, PP, TPU, PC/ABS FR) sind es nicht. Die Textauszuege liegen unter
 * data/_sources/ultrafuse-tds/.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-02";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "high",
  ...(o.note ? { note: o.note } : {}),
});

/* Orientierungen wie im Blatt: XY liegend, XZ hochkant, ZX stehend.
   Unser Schema kennt XY, XZ und Z — "stehend" ist unser Z. */
const XY = (v, u, o = {}) => q(v, u, { ...o, orientation: "XY" });
const XZ = (v, u, o = {}) => q(v, u, { ...o, orientation: "XZ" });
const ZX = (v, u, o = {}) => q(v, u, { ...o, orientation: "Z" });

const SPECIMEN_NOTE = t(
  "Gedruckte Prüfkörper in drei Bauorientierungen: XY liegend, XZ hochkant, ZX stehend. Das Blatt nennt zusätzlich die Druckparameter, mit denen die Prüfkörper hergestellt wurden — Düsentemperatur, Betttemperatur, Düsendurchmesser und Druckgeschwindigkeit. Das ist der höchste Belegstandard im gesamten Bestand: Die Werte lassen sich nicht nur einordnen, sie lassen sich nachdrucken.",
  "Printed specimens in three build orientations: XY flat, XZ on edge, ZX upright. The sheet additionally states the print parameters used to make the specimens — nozzle temperature, bed temperature, nozzle diameter and print speed. That is the highest evidentiary standard in the entire dataset: the values can not only be placed in context, they can be reprinted.");

const P = [
  {
    id: "ultrafuse-pet-cf15", material: "pet-cf", name: "Ultrafuse PET CF15",
    file: "Ultrafuse_PET_CF15_TDS_EN_v3.3", version: "3.3 (14.11.2019)",
    url: "https://forward-am.com/wp-content/uploads/2021/07/Ultrafuse_PET_CF15_TDS_EN_v3.3.pdf",
    props: {
      /* liegend */
      tensileStrengthXy: XY(63.2, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: XY(3.7, "%", { std: "ISO 527" }),
      tensileModulusXy: XY(6178, "MPa", { std: "ISO 527" }),
      flexuralStrengthXy: XY(108, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: XY(5452, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: XY(5.4, "kJ/m²", { std: "ISO 179-2" }),
      charpyUnnotchedXy: XY(27.8, "kJ/m²", { std: "ISO 179-2" }),
      izodNotchedXy: XY(5.7, "kJ/m²", { std: "ISO 180" }),
      izodUnnotchedXy: XY(25.1, "kJ/m²", { std: "ISO 180" }),
      /* hochkant */
      flexuralStrengthXz: XZ(145, "MPa", { std: "ISO 178" }),
      flexuralModulusXz: XZ(6293, "MPa", { std: "ISO 178" }),
      charpyUnnotchedXz: XZ(32, "kJ/m²", { std: "ISO 179-2" }),
      /* stehend — die Zahlen, auf die es ankommt */
      tensileStrengthZ: ZX(12.5, "MPa", { std: "ISO 527" }),
      elongationAtBreakZ: ZX(0.5, "%", { std: "ISO 527" }),
      tensileModulusZ: ZX(2822, "MPa", { std: "ISO 527" }),
      flexuralStrengthZ: ZX(19.7, "MPa", { std: "ISO 178" }),
      flexuralModulusZ: ZX(2253, "MPa", { std: "ISO 178" }),
      charpyNotchedZ: ZX(0.5, "kJ/m²", { std: "ISO 179-2" }),
      charpyUnnotchedZ: ZX(1.3, "kJ/m²", { std: "ISO 179-2" }),
      izodNotchedZ: ZX(2, "kJ/m²", { std: "ISO 180" }),
      /* thermisch und physikalisch */
      hdtA: q(80, "°C", { std: "ISO 75-2, 1,8 MPa" }),
      hdtB: q(108, "°C", { std: "ISO 75-2, 0,45 MPa" }),
      glassTransition: q(79, "°C", { std: "ISO 11357-2" }),
      meltingTemperature: q(245, "°C", { std: "ISO 11357-3" }),
      density: q(1.366, "g/cm³", { std: "ISO 1183-1",
        conditions: "am GEDRUCKTEN Bauteil gemessen, nicht am Filament" }),
      nozzleTemperature: q(260, "°C", { min: 250, max: 270 }),
      bedTemperature: q(75, "°C", { min: 65, max: 85 }),
      printSpeed: q(55, "mm/s", { min: 30, max: 80 }),
      minNozzleDiameter: q(0.6, "mm", { conditions: "Rubin oder gehärtet" }),
      dryingTemperature: q(65, "°C", { conditions: "4 bis 16 h im Umluft- oder Vakuumtrockner" }),
    },
    features: t("Der Anisotropiefaktor steht hier nicht als Ableitung, sondern schwarz auf weiss im Blatt: 12,5 von 63,2 MPa bleiben stehend erhalten — 20 %. Bei der ungekerbten Schlagzähigkeit sind es 1,3 von 27,8 kJ/m², also knapp 5 %. Wer ein Bauteil aus PET CF15 stehend druckt und liegend rechnet, verrechnet sich um den Faktor fünf bis zwanzig. Bemerkenswert ist auch die Dichte: Sie wurde am gedruckten Teil bestimmt (1,366 g/cm³) und nicht am Filament — das schliesst die Porosität mit ein.",
                "The anisotropy factor is not a derivation here but stated in black and white: 12.5 of 63.2 MPa remain when printed upright — 20 %. For unnotched impact it is 1.3 of 27.8 kJ/m², barely 5 %. Anyone printing a PET CF15 part upright while calculating with flat values is out by a factor of five to twenty. The density is notable too: it was determined on the printed part (1.366 g/cm³) rather than on the filament — which includes the porosity."),
  },

  {
    id: "ultrafuse-paht-cf15", material: "paht-cf", name: "Ultrafuse PAHT CF15",
    file: "Ultrafuse_PAHT_CF15_TDS_EN_v4.0", version: "4.0",
    url: "https://forward-am.com/wp-content/uploads/2024/10/Ultrafuse_PAHT_CF15_TDS_EN_v3.5-1.pdf",
    props: {
      tensileStrengthXy: XY(103.2, "MPa", { std: "ISO 527, 5 mm/min", conditions: "trocken" }),
      elongationAtBreakXy: XY(1.8, "%", { std: "ISO 527, 5 mm/min", conditions: "trocken" }),
      tensileModulusXy: XY(8386, "MPa", { std: "ISO 527, 1 mm/min", conditions: "trocken" }),
      flexuralStrengthXy: XY(160.7, "MPa", { std: "ISO 178, 2 mm/min", conditions: "trocken" }),
      flexuralModulusXy: XY(8258, "MPa", { std: "ISO 178, 2 mm/min", conditions: "trocken" }),
      charpyNotchedXy: XY(4.8, "kJ/m²", { std: "ISO 179-2", conditions: "trocken" }),
      charpyUnnotchedXy: XY(20.6, "kJ/m²", { std: "ISO 179-2", conditions: "trocken" }),
      izodNotchedXy: XY(4.9, "kJ/m²", { std: "ISO 180", conditions: "trocken" }),
      izodUnnotchedXy: XY(16.4, "kJ/m²", { std: "ISO 180", conditions: "trocken" }),

      flexuralStrengthXz: XZ(171.8, "MPa", { std: "ISO 178, 2 mm/min", conditions: "trocken" }),
      flexuralModulusXz: XZ(7669, "MPa", { std: "ISO 178, 2 mm/min", conditions: "trocken" }),
      charpyUnnotchedXz: XZ(19.3, "kJ/m²", { std: "ISO 179-2", conditions: "trocken" }),

      tensileStrengthZ: ZX(18.2, "MPa", { std: "ISO 527, 5 mm/min", conditions: "trocken" }),
      elongationAtBreakZ: ZX(0.5, "%", { std: "ISO 527, 5 mm/min", conditions: "trocken" }),
      tensileModulusZ: ZX(3532, "MPa", { std: "ISO 527, 1 mm/min", conditions: "trocken" }),
      flexuralStrengthZ: ZX(50.8, "MPa", { std: "ISO 178, 2 mm/min", conditions: "trocken" }),
      flexuralModulusZ: ZX(2715, "MPa", { std: "ISO 178, 2 mm/min", conditions: "trocken" }),
      charpyNotchedZ: ZX(1.3, "kJ/m²", { std: "ISO 179-2", conditions: "trocken" }),
      charpyUnnotchedZ: ZX(2.9, "kJ/m²", { std: "ISO 179-2", conditions: "trocken" }),

      hdtA: q(92, "°C", { std: "ISO 75-2, 1,8 MPa", conditions: "trocken; konditioniert 91 °C" }),
      hdtB: q(145, "°C", { std: "ISO 75-2, 0,45 MPa",
        conditions: "trocken; KONDITIONIERT nur 128 °C (23 °C, 50 % rF, 72 h)" }),
      vicatB50: q(205, "°C", { std: "ISO 306, 50 N", conditions: "trocken; konditioniert 192 °C" }),
      vicatA: q(221, "°C", { std: "ISO 306, 10 N", conditions: "trocken; konditioniert 217 °C" }),
      glassTransition: q(70, "°C", { std: "ISO 11357-2" }),
      meltingTemperature: q(234, "°C", { std: "ISO 11357-3" }),
      hardnessShoreD: q(72, "Shore D", { std: "ISO 7619-1" }),
      density: q(1.203, "g/cm³", { std: "ISO 1183-1",
        conditions: "am FILAMENT gemessen, konditioniert" }),
      nozzleTemperature: q(270, "°C", { min: 260, max: 280,
        conditions: "für die Prüfkörper wurden 285 °C verwendet" }),
      bedTemperature: q(110, "°C", { min: 100, max: 120,
        conditions: "für die Prüfkörper wurden 110 °C verwendet" }),
      printSpeed: q(55, "mm/s", { min: 30, max: 80, conditions: "für die Prüfkörper 45 mm/s" }),
      minNozzleDiameter: q(0.6, "mm", { conditions: "Rubin oder gehärtet" }),
      dryingTemperature: q(80, "°C", { conditions: "mindestens 4 bis 16 h im Umluft- oder Vakuumtrockner" }),
    },
    features: t("Das einzige Blatt im Bestand, das dieselben Kennwerte TROCKEN und KONDITIONIERT nebeneinanderstellt (23 °C, 50 % rF, 72 h). Der Unterschied ist kein Detail: Die HDT bei 0,45 MPa fällt von 145 auf 128 °C, die Poisson-Zahl steigt von 0,44 auf 0,51. Ein Polyamid nimmt Wasser auf, und das Datenblatt sagt hier ausnahmsweise, was das kostet. Stehend gedruckt bleiben von 103,2 MPa noch 18,2 übrig — 18 %.",
                "The only sheet in the dataset that places the same values DRY and CONDITIONED side by side (23 °C, 50 % RH, 72 h). The difference is no detail: HDT at 0.45 MPa falls from 145 to 128 °C, Poisson's ratio rises from 0.44 to 0.51. A polyamide takes up water, and for once the datasheet says what that costs. Printed upright, 18.2 MPa remain of 103.2 — 18 %."),
  },
];

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

for (const p of P) {
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "Ultrafuse", manufacturer: "Forward AM / BASF 3D Printing Solutions BV",
    productName: p.name, origin: "Niederlande",
    specimenType: "printed",
    specimenNote: SPECIMEN_NOTE,
    features: p.features,
    datasheet: {
      title: `${p.name} — Technical Data Sheet`,
      url: p.url, version: p.version, retrievedAt: RETRIEVED,
    },
    productUrl: "https://forward-am.com/material-portfolio/ultrafuse-filaments-for-fused-filaments-fabrication-fff/",
    properties: p.props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds",
        publisher: "Forward AM / BASF 3D Printing Solutions BV",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url: p.url, retrievedAt: RETRIEVED, confidenceCeiling: "high",
        note: t(`Herstellerdatenblatt mit deklarierten gedruckten Prüfkörpern in drei Bauorientierungen und mit den Druckparametern der Prüfkörper. Textauszug unter data/_sources/ultrafuse-tds/${p.file}.txt.`,
                `Manufacturer datasheet with declared printed specimens in three build orientations and with the print parameters of the specimens. Text extract at data/_sources/ultrafuse-tds/${p.file}.txt.`),
      }],
    },
  };
  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
}

const factor = (a, b) => `${Math.round((b / a) * 100)} %`;
console.log(`${P.length} Ultrafuse-Produkte geschrieben`);
console.log(`  PET CF15   Zug stehend/liegend ${factor(63.2, 12.5)} · Schlag ungekerbt ${factor(27.8, 1.3)}`);
console.log(`  PAHT CF15  Zug stehend/liegend ${factor(103.2, 18.2)} · Schlag ungekerbt ${factor(20.6, 2.9)}`);
