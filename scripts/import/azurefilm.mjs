/**
 * Import: AzureFilm d.o.o. (Slowenien).
 *
 * KORREKTUR EINER FRÜHEREN EINORDNUNG: AzureFilm wurde in dieser Datenbank zunächst als
 * Anbieter von Rohstoffkennwerten geführt (specimenType "moulded"). Das war falsch. Alle
 * Datenblätter überschreiben ihre Tabelle mit "Property of 3D printed specimens" und
 * nennen darunter die vollständigen Druckparameter der Prüfkörper — Drucker, Slicer,
 * Düse, Schichthöhe, Infill und Geschwindigkeit. Das ist mehr Offenlegung als jeder
 * andere Hersteller in dieser Datenbank leistet.
 *
 * Damit rückt aber ein anderes Problem in den Vordergrund: die Prüfkörper sind
 * unterschiedlich gefüllt. PLA, PLA Silk und ASA wurden mit 20 % Infill gedruckt, PETG
 * mit 100 %. Kennwerte aus einem 20-%-Infill-Prüfkörper sind keine Werkstoffkennwerte,
 * sondern Bauteilkennwerte einer bestimmten Geometrie — und die angegebenen Zahlen sind
 * bei 20 % Infill rechnerisch nicht erreichbar. Der Befund steht bei den betroffenen
 * Produkten; der Infill steht zusätzlich als `conditions` an jedem einzelnen Wert, damit
 * er in der Vergleichstabelle mitläuft und nicht übersehen werden kann.
 *
 * Quellen: azurefilm.com/de/technische-daten/ verweist auf PDFs, die auf offenen CDNs
 * liegen. Die Übersichtsseite selbst ist durch eine Bot-Prüfung geschützt; erfasst sind
 * daher die Datenblätter, die sich direkt abrufen liessen.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-01";

const t = (de, en) => ({ de, en });

/* kgf/cm² -> MPa. Das ASA-Datenblatt rechnet in einer Einheit, die sonst niemand nutzt. */
const KGFCM2 = 0.0980665;
const fromKgfcm2 = (v) => Math.round(v * KGFCM2 * 10) / 10;

const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.tol != null ? { tolerance: o.tol } : {}),
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

/* Prüfkörper-Bedingungen. Reiten an jedem mechanischen Wert mit. */
const C20 = "gedruckter Prüfkörper, 20 % Infill, 2 Perimeter, 0,4 mm Düse";
const C100 = "gedruckter Prüfkörper, 100 % Infill, 0,4 mm Düse";

/* Der Befund zum 20-%-Infill. Gilt für PLA, PLA Silk und ASA. */
const INFILL_FINDING = t(
  "Die Prüfkörper wurden laut Datenblatt mit 20 % Infill und 2 Perimetern gedruckt. Bei dieser Füllung trägt nur etwa die Hälfte des Querschnitts, die angegebenen Kennwerte sind damit rechnerisch nicht erreichbar: 59 MPa Zugfestigkeit aus einem halb gefüllten Prüfkörper würden über 110 MPa im Vollmaterial voraussetzen, was PLA nicht erreicht. Entweder wurde die Spannung auf die tatsächlich tragende Fläche statt auf den Nennquerschnitt bezogen, oder der Parameterblock beschreibt nicht den Prüfkörper. Die Werte sind deshalb nicht mit Werkstoffkennwerten anderer Hersteller vergleichbar.",
  "The specimens were printed at 20 % infill with 2 perimeters per the datasheet. At that fill only about half the cross-section carries load, which makes the stated values arithmetically unreachable: 59 MPa tensile strength from a half-filled specimen would require over 110 MPa in solid material, which PLA does not reach. Either the stress was referred to the actually load-bearing area rather than the nominal cross-section, or the parameter block does not describe the specimen. The values are therefore not comparable with material data from other manufacturers.");

const CDN = "https://3d.nice-cdn.com/upload/file";

const P = [
  { id: "azurefilm-pla", material: "pla", name: "AzureFilm PLA",
    url: `${CDN}/PLA_TDS.pdf`, specimen: "printed",
    props: {
      tensileStrengthXy: q(59, "MPa", { conditions: C20, confidence: "low" }),
      tensileModulusXy: q(3300, "MPa", { conditions: C20, confidence: "low" }),
      elongationAtBreakXy: q(4.2, "%", { conditions: C20 }),
      flexuralStrengthXy: q(73.6, "MPa", { conditions: C20, confidence: "low" }),
      flexuralModulusXy: q(2800, "MPa", { conditions: C20, confidence: "low" }),
      charpyUnnotchedXy: q(10.4, "kJ/m²", { conditions: `${C20}, 23 °C` }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    anomaly: INFILL_FINDING,
    features: t("AzureFilm legt die vollständigen Druckparameter der Prüfkörper offen — Drucker, Slicer, Düse, Schichthöhe, Infill und Geschwindigkeit. Das tun ausser AzureFilm nur wenige, Fillamentum etwa. Genau diese Offenlegung macht hier überhaupt sichtbar, dass die Werte nicht als Werkstoffkennwerte gelesen werden dürfen.",
                "AzureFilm discloses the full print parameters of its specimens — printer, slicer, nozzle, layer height, infill and speed. Few others do, Fillamentum among them. It is precisely that disclosure which makes it visible here that the values must not be read as material data.") },

  { id: "azurefilm-pla-silk", material: "pla", name: "AzureFilm PLA Silk",
    url: `${CDN}/SILK_TDS%5B0%5D.pdf`, specimen: "printed",
    props: {
      tensileStrengthXy: q(59, "MPa", { conditions: C20, confidence: "low" }),
      elongationAtBreakXy: q(4.2, "%", { conditions: C20 }),
      flexuralStrengthXy: q(73.6, "MPa", { conditions: C20, confidence: "low" }),
      flexuralModulusXy: q(2800, "MPa", { conditions: C20, confidence: "low" }),
      charpyUnnotchedXy: q(10.4, "kJ/m²", { conditions: `${C20}, 23 °C` }),
      nozzleTemperature: q(230, "°C"),
      bedTemperature: q(55, "°C"),
    },
    anomaly: t(`Dieses Datenblatt ist bis auf die Düsentemperatur eine Kopie des PLA-Blatts: alle neun Kennwerte stimmen zeilengleich überein. Dabei ist ein Einheitenfehler entstanden — der Zug-E-Modul steht als „3,3 MPa“ statt wie im PLA-Blatt als 3,3 GPa. 3,3 MPa wären weicher als ein Radiergummi. Der E-Modul wurde deshalb nicht übernommen.\n\n${INFILL_FINDING.de}`,
                `Apart from the nozzle temperature this datasheet is a copy of the PLA sheet: all nine values match row for row. In the process a unit error crept in — the tensile modulus is stated as “3.3 MPa” instead of 3.3 GPa as on the PLA sheet. 3.3 MPa would be softer than an eraser. The modulus was therefore not imported.\n\n${INFILL_FINDING.en}`) },

  { id: "azurefilm-petg", material: "petg", name: "AzureFilm PETG",
    url: "https://www.3d-colour.com/wp-content/uploads/2023/04/AzureFilm_PETG_TDS.pdf",
    specimen: "printed",
    props: {
      tensileStrengthXy: q(51, "MPa", { std: "ISO 527-2 (Streckspannung)", conditions: C100 }),
      tensileModulusXy: q(2980, "MPa", { std: "ISO 527-2", conditions: C100 }),
      elongationAtYieldXy: q(4, "%", { std: "ISO 527-2", conditions: C100 }),
      elongationAtBreakXy: q(29, "%", { std: "ISO 527-2", conditions: C100 }),
      flexuralStrengthXy: q(68, "MPa", { std: "ISO 178", conditions: C100 }),
      flexuralModulusXy: q(2040, "MPa", { std: "ISO 178", conditions: C100 }),
      density: q(1.29, "g/cm³", { std: "ASTM D-792" }),
      nozzleTemperature: q(230, "°C", { min: 220, max: 240 }),
      bedTemperature: q(85, "°C", { min: 80, max: 90 }),
    },
    features: t("Das einzige AzureFilm-Datenblatt mit 100 % Infill im Prüfkörper — und damit das einzige, dessen Werte sich sinnvoll mit anderen Herstellern vergleichen lassen. 29 % Bruchdehnung bei 51 MPa Streckspannung ist für gedrucktes PETG ein plausibler, guter Wert.",
                "The only AzureFilm datasheet with 100 % infill in the specimen — and therefore the only one whose values compare meaningfully with other manufacturers. 29 % elongation at break at 51 MPa yield stress is a plausible, good result for printed PETG.") },

  { id: "azurefilm-asa", material: "asa", name: "AzureFilm ASA",
    url: `${CDN}/ASA_TDS.pdf`, specimen: "printed",
    props: {
      tensileStrengthXy: q(fromKgfcm2(480), "MPa", { std: "ASTM D638, 50 mm/min, 3,2 mm", conditions: C20, confidence: "low",
        note: t("Das Datenblatt rechnet in kg/cm². Umgerechnet mit 1 kgf/cm² = 0,0980665 MPa.",
                "The datasheet uses kg/cm². Converted with 1 kgf/cm² = 0.0980665 MPa.") }),
      tensileModulusXy: q(fromKgfcm2(21200), "MPa", { std: "ASTM D638, 1 mm/min, 3,2 mm", conditions: C20, confidence: "low" }),
      elongationAtYieldXy: q(6, "%", { std: "ASTM D638, 50 mm/min (> 6)", conditions: C20 }),
      elongationAtBreakXy: q(25, "%", { std: "ASTM D638, 50 mm/min", conditions: C20 }),
      flexuralStrengthXy: q(fromKgfcm2(770), "MPa", { std: "ASTM D790, 15 mm/min, 3,2 mm", conditions: C20, confidence: "low" }),
      flexuralModulusXy: q(fromKgfcm2(22500), "MPa", { std: "ASTM D790, 15 mm/min, 3,2 mm", conditions: C20, confidence: "low" }),
      density: q(1.07, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(250, "°C", { min: 240, max: 260 }),
      bedTemperature: q(105, "°C", { min: 90, max: 120 }),
    },
    anomaly: INFILL_FINDING },

  { id: "azurefilm-paht-cf", material: "pa6-cf", name: "AzureFilm PAHT Carbon Fiber",
    url: `${CDN}/PAHT_Carbon_Fiber_TDS.pdf`, specimen: "undeclared",
    props: {
      tensileStrengthXy: q(130, "MPa", { std: "ISO 527, 23 °C / 50 % rF", confidence: "low" }),
      tensileModulusXy: q(11500, "MPa", { std: "ISO 527, 23 °C / 50 % rF", confidence: "low" }),
      elongationAtBreakXy: q(2, "%", { std: "ISO 527 (bei Höchstkraft)" }),
      charpyUnnotchedXy: q(35, "kJ/m²", { std: "ISO 179" }),
      hdtB: q(90, "°C", { std: "ISO 75" }),
      density: q(1.24, "g/cm³", { std: "ISO 1183-3" }),
      waterAbsorption: q(0.3, "%", { std: "ISO 62, 23 °C / 24 h (< 0,3)" }),
      nozzleTemperature: q(280, "°C", { min: 270, max: 290 }),
      bedTemperature: q(105, "°C", { min: 90, max: 120 }),
    },
    anomaly: t("Anders als die übrigen AzureFilm-Blätter enthält dieses keinen Prüfkörper-Parameterblock und keine Kennzeichnung als gedruckter Prüfkörper. Die Werte — 130 MPa Zugfestigkeit bei 11,5 GPa E-Modul — liegen deutlich über dem, was carbonfaserverstärktes Polyamid im FDM-Druck erreicht (typisch 70 bis 100 MPa und 5 bis 7 GPa) und sprechen für spritzgegossene oder Compound-Kennwerte. Zusätzlich ist die Elektrik widersprüchlich beschriftet: derselbe Größenbereich erscheint einmal als „Isolationswiderstand ≤ 10² Ω“ und einmal als „Oberflächenwiderstand < 10² Ω“. Ein Isolationswiderstand von unter 100 Ω wäre kein Isolationswiderstand. Die elektrischen Angaben wurden deshalb nicht übernommen.",
               "Unlike the other AzureFilm sheets this one contains no specimen parameter block and no declaration of printed specimens. The values — 130 MPa tensile strength at 11.5 GPa modulus — are well above what carbon-reinforced polyamide achieves in FDM printing (typically 70 to 100 MPa and 5 to 7 GPa) and point to moulded or compound data. The electrical section is also contradictorily labelled: the same magnitude appears once as “insulation resistance ≤ 10² Ω” and once as “surface resistance < 10² Ω”. An insulation resistance below 100 Ω would not be an insulation resistance. The electrical figures were therefore not imported."),
    features: t("Dauergebrauchstemperatur 120 °C über 20.000 h nach IEC 60216 und kurzzeitig bis 160 °C — eine Lebensdauerangabe, die sonst kein Datenblatt dieser Datenbank macht.",
                "Continuous service temperature of 120 °C over 20,000 h to IEC 60216 and up to 160 °C short-term — a service-life figure no other datasheet in this database provides.") },
];

const SPECIMEN_NOTE = t(
  "AzureFilm weist die Kennwerte ausdrücklich als „Property of 3D printed specimens“ aus und nennt die Druckparameter der Prüfkörper vollständig. Entscheidend ist dabei der Infill: PLA, PLA Silk und ASA wurden mit 20 % gedruckt, PETG mit 100 %. Nur die 100-%-Werte sind mit anderen Herstellern vergleichbar.",
  "AzureFilm explicitly declares its values as “property of 3D printed specimens” and states the specimen print parameters in full. The decisive detail is the infill: PLA, PLA Silk and ASA were printed at 20 %, PETG at 100 %. Only the 100 % values are comparable with other manufacturers.");

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, na = 0;
for (const p of P) {
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "AzureFilm", manufacturer: "AzureFilm d.o.o.", productName: p.name, origin: "Slowenien",
    specimenType: p.specimen,
    specimenNote: p.anomaly
      ? t(`${SPECIMEN_NOTE.de}\n\nBefund zu diesem Datenblatt: ${p.anomaly.de}`,
          `${SPECIMEN_NOTE.en}\n\nFinding on this datasheet: ${p.anomaly.en}`)
      : SPECIMEN_NOTE,
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technical Data Sheet`, url: p.url, retrievedAt: RETRIEVED },
    productUrl: "https://azurefilm.com/de/technische-daten/",
    properties: p.props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "AzureFilm d.o.o.",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url: p.url, retrievedAt: RETRIEVED,
        confidenceCeiling: p.anomaly ? "low" : "medium",
        note: t("Herstellerdatenblatt mit deklarierten Prüfkörper-Druckparametern. Wo der Prüfkörper mit 20 % Infill gedruckt wurde, sind die Kennwerte keine Werkstoffkennwerte — das Ceiling steht dort auf 'low'.",
                "Manufacturer datasheet with declared specimen print parameters. Where the specimen was printed at 20 % infill the values are not material data — the ceiling is set to 'low' in those cases."),
      }],
    },
  };
  writeFileSync(path.join(out, `${p.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  n++;
  if (p.anomaly) na++;
}
console.log(`${n} AzureFilm-Produkte geschrieben (${na} mit dokumentiertem Datenblatt-Befund)`);
