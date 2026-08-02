/**
 * Import: Bambu Lab — vollständiger Filamentkatalog.
 *
 * WARUM DIESE QUELLE DIE WERTVOLLSTE DER DATENBANK IST
 * Bambu Lab veröffentlicht als einziger Hersteller für JEDEN Kennwert beide
 * Orientierungen: X-Y (in der Schichtebene) und Z (quer dazu), gemessen an GEDRUCKTEN
 * Prüfkörpern, in einem Labor, nach einer Methode. Nur daraus lässt sich der
 * Anisotropiefaktor bilden — die Zahl, die kaum ein Vergleichsportal nennt und die
 * darüber entscheidet, ob ein Bauteil richtig orientiert gedruckt wurde.
 * Zusätzlich stehen Streuungen (± MPa) an den Werten, nicht nur Punktschätzungen.
 *
 * QUELLE UND REPRODUZIERBARKEIT
 * Die Datenblätter liegen unter einem festen Shopify-Pfad ohne Hash:
 *   https://cdn.shopify.com/s/files/1/0584/7236/6216/files/Bambu_<Name>_Technical_Data_Sheet.pdf
 * Die Textauszüge (pdftotext -layout) liegen in data/_sources/bambu-tds/ im Repository.
 * Damit ist jeder importierte Wert ohne erneuten Download gegen das Original prüfbar —
 * und der Import läuft deterministisch aus dem Repository statt aus dem Netz.
 *
 * NICHT ÜBERNOMMEN: PVA und die beiden Support-Werkstoffe. Sie sind Hilfsmaterial und
 * keine Kandidaten für die Frage "welcher Werkstoff für mein Bauteil".
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "data/_sources/bambu-tds");
const OUT = path.join(ROOT, "data/products");
const RETRIEVED = "2026-08-01";
const CDN = "https://cdn.shopify.com/s/files/1/0584/7236/6216/files";

const t = (de, en) => ({ de, en });

/* Dateiname -> Werkstofftyp. Alles, was hier fehlt, wird uebersprungen. */
const MAP = {
  ABS: "abs", "ABS-GF": "abs", ASA: "asa", ASA_Aero: "asa-aero",
  "PA6-CF": "pa6-cf", "PAHT-CF": "paht-cf", PC: "pc", PC_FR: "pc-fr",
  "PETG-CF": "petg-cf", PETG_Basic: "petg", PETG_HF: "petg",
  "PLA-CF": "pla", PLA_Aero: "pla", PLA_Basic: "pla", PLA_Basic_Gradient: "pla",
  PLA_Galaxy: "pla", PLA_Marble: "pla", PLA_Matte: "pla", PLA_Metal: "pla",
  PLA_Silk_: "pla", PLA_Sparkle: "pla", PLA_Tough: "pla-tough",
  "PPS-CF": "pps-cf", TPU_95A: "tpu-95a", TPU_95A_HF: "tpu-95a", TPU_for_AMS: "tpu-95a",
};

/* Produkte, die bereits aus scripts/import/bambu-tds.mjs stammen (Volltranskript,
   inklusive Werten, die dieser Parser nicht liest). Nicht ueberschreiben. */
const KEEP_EXISTING = new Set(["ABS", "ASA", "ASA_Aero", "PA6-CF", "PC", "PETG_Basic", "PLA_Basic", "TPU_95A"]);

const NAMES = {
  "ABS-GF": "Bambu ABS-GF", "PAHT-CF": "Bambu PAHT-CF", PC_FR: "Bambu PC FR",
  "PETG-CF": "Bambu PETG-CF", PETG_HF: "Bambu PETG HF", "PLA-CF": "Bambu PLA-CF",
  PLA_Aero: "Bambu PLA Aero", PLA_Basic_Gradient: "Bambu PLA Basic Gradient",
  PLA_Galaxy: "Bambu PLA Galaxy", PLA_Marble: "Bambu PLA Marble", PLA_Matte: "Bambu PLA Matte",
  PLA_Metal: "Bambu PLA Metal", PLA_Silk_: "Bambu PLA Silk", PLA_Sparkle: "Bambu PLA Sparkle",
  PLA_Tough: "Bambu PLA Tough", "PPS-CF": "Bambu PPS-CF",
  TPU_95A_HF: "Bambu TPU 95A HF", TPU_for_AMS: "Bambu TPU for AMS",
};

/* ------------------------------------------------------------------ parsen */

const norm = (s) => s.replace(/ /g, " ").replace(/[ \t]{2,}/g, "|");

/** "3160 ± 170 MPa" -> {v:3160, tol:170};  "240 - 280 °C" -> {v:260, min:240, max:280} */
function num(cell) {
  if (!cell) return null;
  const c = cell.replace(/,/g, "").trim();
  if (/^n\/?a$/i.test(c)) return null;
  const range = c.match(/^(-?[\d.]+)\s*[-–]\s*(-?[\d.]+)/);
  if (range) {
    const min = parseFloat(range[1]), max = parseFloat(range[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) return { v: (min + max) / 2, min, max };
  }
  const tol = c.match(/^(-?[\d.]+)\s*±\s*([\d.]+)/);
  if (tol) return { v: parseFloat(tol[1]), tol: parseFloat(tol[2]) };
  const one = c.match(/^(-?[\d.]+)/);
  return one && Number.isFinite(parseFloat(one[1])) ? { v: parseFloat(one[1]) } : null;
}

/** Findet eine Zeile und liefert die letzte Zelle als Zahl. */
function row(lines, re) {
  for (const l of lines) {
    if (!re.test(l)) continue;
    const cells = l.split("|").map((s) => s.trim()).filter(Boolean);
    const n = num(cells[cells.length - 1]);
    if (n) return { ...n, std: cells.length >= 3 ? cells[1] : undefined };
  }
  return null;
}

const q = (n, unit, o = {}) => n && ({
  value: Math.round(n.v * 1000) / 1000, unit,
  ...(n.tol != null ? { tolerance: n.tol } : {}),
  ...(n.min != null ? { min: n.min } : {}),
  ...(n.max != null ? { max: n.max } : {}),
  ...(o.std ?? n.std ? { testStandard: o.std ?? n.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  source: "src_tds", confidence: "high",
});

function parse(txt) {
  const lines = norm(txt).split("\n");
  const p = {};
  const put = (k, v) => { if (v) p[k] = v; };

  put("density", q(row(lines, /^\|?Density\|/i), "g/cm³"));
  put("tensileStrengthXy", q(row(lines, /Tensile Strength \(X-?Y\)/i), "MPa", { orientation: "XY" }));
  put("tensileStrengthZ", q(row(lines, /Tensile Strength \(Z\)/i), "MPa", { orientation: "Z" }));
  put("tensileModulusXy", q(row(lines, /Young'?s Modulus \(X-?Y\)/i), "MPa", { orientation: "XY" }));
  put("flexuralModulusXy", q(row(lines, /Bending Modulus \(X-?Y\)/i), "MPa", { orientation: "XY" }));
  put("flexuralStrengthXy", q(row(lines, /Bending Strength \(X-?Y\)/i), "MPa", { orientation: "XY" }));
  put("charpyUnnotchedXy", q(row(lines, /Impact Strength \(X-?Y\)/i), "kJ/m²", { orientation: "XY" }));
  put("elongationAtBreakXy", q(row(lines, /Elongation at Break \(X-?Y\)/i), "%", { orientation: "XY" }));
  put("hdtA", q(row(lines, /Heat Deflection Temperature\|.*1\.8 ?MPa/i), "°C", { std: "ISO 75, 1.8 MPa" }));
  put("hdtB", q(row(lines, /Heat Deflection Temperature\|.*0\.45 ?MPa/i), "°C", { std: "ISO 75, 0.45 MPa" }));
  put("vicatA", q(row(lines, /Vicat Softening Temperature/i), "°C", { std: "ISO 306" }));
  put("glassTransition", q(row(lines, /Glass Transition Temperature/i), "°C", { std: "DSC, 10 °C/min" }));
  put("nozzleTemperature", q(row(lines, /^\|?Nozzle Temperature\|/i), "°C", { std: "" }));
  put("bedTemperature", q(row(lines, /^\|?Bed Temperature\|/i), "°C", { std: "" }));
  put("chamberTemperature", q(row(lines, /^\|?Chamber Temperature\|/i), "°C", { std: "" }));
  return p;
}

/* --------------------------------------------------------------- schreiben */

mkdirSync(OUT, { recursive: true });
const SPECIMEN_NOTE = t(
  "Bambu Lab misst an GEDRUCKTEN Prüfkörpern und veröffentlicht als einziger Hersteller dieser Datenbank für jeden Kennwert beide Orientierungen — X-Y in der Schichtebene und Z quer dazu — samt Streuung. Nur daraus lässt sich ablesen, wie viel Festigkeit eine falsche Bauteilorientierung kostet.",
  "Bambu Lab measures on PRINTED specimens and is the only manufacturer in this database to publish both orientations for every value — X-Y in the layer plane and Z across it — including scatter. Only from that can one read how much strength a wrong part orientation costs.");

let n = 0, skipped = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".txt")).sort()) {
  const key = file.replace(/^Bambu_/, "").replace(/_Technical_Data_Sheet\.txt$/, "");
  const material = MAP[key];
  if (!material) { skipped.push(key); continue; }
  if (KEEP_EXISTING.has(key)) { skipped.push(`${key} (bereits erfasst)`); continue; }

  const props = parse(readFileSync(path.join(SRC, file), "utf8"));
  if (!Object.keys(props).length) { skipped.push(`${key} (nichts gelesen)`); continue; }

  const url = `${CDN}/Bambu_${key}_Technical_Data_Sheet.pdf`;
  const name = NAMES[key] ?? `Bambu ${key.replace(/_/g, " ").trim()}`;
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: `bambu-${key.toLowerCase().replace(/_+$/, "").replace(/_/g, "-")}`,
    materialId: material,
    brand: "Bambu Lab", manufacturer: "Bambu Lab", productName: name, origin: "China",
    specimenType: "printed",
    specimenNote: SPECIMEN_NOTE,
    datasheet: { title: `${name} — Technical Data Sheet`, url, retrievedAt: RETRIEVED },
    productUrl: "https://eu.store.bambulab.com/collections/all",
    properties: props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (maschineller Import aus dem Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Bambu Lab",
        productName: name, title: `${name} — Technical Data Sheet`,
        url, retrievedAt: RETRIEVED, confidenceCeiling: "high",
        note: t("Herstellerdatenblatt mit gedruckten Prüfkörpern, beiden Orientierungen und Streuungsangaben. Der Textauszug liegt zur Nachprüfung in data/_sources/bambu-tds/ im Repository.",
                "Manufacturer datasheet with printed specimens, both orientations and scatter figures. The text extract is kept in data/_sources/bambu-tds/ in the repository for verification."),
      }],
    },
  };
  writeFileSync(path.join(OUT, `${rec.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  n++;
}
console.log(`${n} Bambu-Produkte geschrieben`);
if (skipped.length) console.log(`übersprungen: ${skipped.join(", ")}`);

/* ======================================================= neuer Werkstofftyp ==
   PPS-CF gab es hier noch nicht — und es ist mit HDT-A 235 °C und Vicat 268 °C der mit
   Abstand waermefesteste Werkstoff der Datenbank. Gleichzeitig der anisotropste:
   87 MPa in X-Y gegen 24 MPa in Z. Wer falsch orientiert, verliert drei Viertel. */

const rt = (value, scale) => ({ value, scale, source: "estimate_reasoning", confidence: "estimated" });
const fl = (value) => ({ value, source: "estimate_reasoning", confidence: "estimated" });
const ch = (value, o = {}) => ({ value, source: o.source ?? "estimate_reasoning", confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}) });
const mq = (value, unit, o = {}) => ({
  value, unit, ...(o.tol != null ? { tolerance: o.tol } : {}), ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}), ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}), ...(o.conditions ? { conditions: o.conditions } : {}),
  ...(o.derivedFrom ? { derivedFrom: o.derivedFrom } : {}),
  source: o.source ?? "src_bambu_tds", confidence: o.confidence ?? "high", ...(o.note ? { note: o.note } : {}),
});
const SPEC = "gedruckter Prüfkörper, X1E, 100 % Infill, Kammer 60 °C, Düse 320 °C, 60 mm/s";
const PART = t("Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen.",
               "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches.");

writeFileSync(path.join(ROOT, "data/materials/pps-cf.json"), JSON.stringify({
  $schema: "../../schema/material.schema.json", schemaVersion: "1.0.0", id: "pps-cf",
  identity: {
    name: "PPS-CF", family: "PPS", polymerClass: "semi-crystalline", variant: ["high-temp", "CF"],
    aliases: ["Polyphenylensulfid carbonfaserverstärkt", "PPS Carbon", "Polyphenylene Sulfide CF"],
    abstract: t("PPS-CF ist der wärmefesteste Werkstoff dieser Datenbank: 235 °C Formbeständigkeit unter 1,8 MPa Last, Vicat 268 °C, dazu 8230 MPa Steifigkeit. Für Bauteile in Motornähe, Sterilisation und Chemieanlagen. Grenzen: extrem anisotrop — quer zur Schicht bleiben 28 % der Festigkeit —, braucht 310–340 °C Düse und eine auf 60–90 °C beheizte Kammer, was nur wenige Anlagen können.",
                "PPS-CF is the most heat-resistant material in this database: 235 °C deflection under 1.8 MPa load, Vicat 268 °C, plus 8230 MPa stiffness. For parts near engines, in sterilisation and chemical plant. Limits: extremely anisotropic — 28 % of strength remains across the layers — and it needs a 310–340 °C nozzle and a chamber at 60–90 °C, which few machines can do."),
    positioning: t("Wenn 200 °C nicht reichen — und die Anlage mitspielt.", "When 200 °C is not enough — and the machine can keep up."),
  },
  mechanics: {
    density: mq(1.26, "g/cm³", { std: "ISO 1183" }),
    tensileStrengthXy: mq(87, "MPa", { tol: 5, std: "ISO 527", orientation: "XY", conditions: SPEC }),
    tensileStrengthZ: mq(24, "MPa", { tol: 3, std: "ISO 527", orientation: "Z", conditions: SPEC }),
    tensileModulusXy: mq(8230, "MPa", { tol: 270, std: "ISO 527", orientation: "XY", conditions: SPEC }),
    flexuralStrengthXy: mq(142, "MPa", { tol: 5, std: "ISO 178", orientation: "XY", conditions: SPEC }),
    flexuralModulusXy: mq(7160, "MPa", { tol: 280, std: "ISO 178", orientation: "XY", conditions: SPEC }),
    charpyUnnotchedXy: mq(6.2, "kJ/m²", { tol: 1.6, std: "ISO 179", orientation: "XY", conditions: SPEC }),
    charpyUnnotchedZ: mq(2.8, "kJ/m²", { tol: 0.4, std: "ISO 179", orientation: "Z", conditions: SPEC }),
    anisotropyFactorTensile: mq(0.28, "-", { derivedFrom: ["mechanics.tensileStrengthZ", "mechanics.tensileStrengthXy"],
      note: t("24 MPa in Z geteilt durch 87 MPa in X-Y desselben Datenblatts — der schlechteste Wert der Datenbank.",
              "24 MPa in Z divided by 87 MPa in X-Y of the same datasheet — the worst value in the database.") }),
    toughness: rt(2, "toughness"), notchSensitivity: rt(4, "notchSensitivity"),
    creepTendency: rt(1, "creepTendency"), wearResistance: rt(5, "wearResistance"),
  },
  thermal: {
    hdtA: mq(235, "°C", { std: "ISO 75, 1.8 MPa" }), hdtB: mq(264, "°C", { std: "ISO 75, 0.45 MPa" }),
    vicatB50: mq(268, "°C", { std: "ISO 306" }), glassTransition: mq(100, "°C", { std: "DSC, 10 °C/min" }),
    recommendedMaxServiceTemperature: mq(200, "°C", { conditions: "dauerhaft unter mechanischer Last, Luft",
      source: "estimate_reasoning", confidence: "estimated",
      note: t("Eigene konservative Empfehlung mit Abstand zu HDT-A.", "Our own conservative recommendation with margin to HDT-A.") }),
  },
  processing: {
    nozzleTemperature: mq(325, "°C", { min: 310, max: 340 }), bedTemperature: mq(110, "°C", { min: 100, max: 120 }),
    chamberRequirement: ch("mandatory", { source: "src_bambu_tds", confidence: "high",
      note: t("Kammer 60–90 °C laut Datenblatt.", "Chamber 60–90 °C per the datasheet.") }),
    dryingTemperature: mq(120, "°C", { source: "estimate_reasoning", confidence: "estimated" }),
    dryingTime: mq(12, "h", { source: "estimate_reasoning", confidence: "estimated" }),
    printability: rt(1, "printability"), warpingTendency: rt(5, "warpingTendency"),
    hygroscopy: rt(4, "hygroscopy"), abrasiveness: rt(5, "abrasiveness"),
  },
  durability: {
    uvResistance: rt(3, "uvResistance"), weatherResistance: rt(3, "weatherResistance"),
    hydrolysisResistance: rt(5, "hydrolysisResistance"),
    chemicalResistance: [
      { chemicalId: "chem_water", rating: "resistant", source: "estimate_reasoning", confidence: "estimated" },
      { chemicalId: "chem_mineral_oil", rating: "resistant", source: "estimate_reasoning", confidence: "estimated" },
    ],
  },
  compliance: {
    foodContact: { status: ch("not-declared"), partLevelWarning: PART },
    flameRetardancy: { ul94: ch("not-classified") },
    printEmissions: { concernLevel: ch("moderate"), extractionRecommended: fl(true) },
    translucency: ch("opaque", { source: "src_bambu_tds", confidence: "high" }),
  },
  finishing: {
    surfaceQuality: rt(2, "surfaceQuality"), paintAdhesion: rt(1, "paintAdhesion"),
    bondability: rt(1, "bondability"), chemicalSmoothing: { suitable: fl(false) },
  },
  commercial: {
    priceIndex: rt(5, "priceIndex"), availability: rt(1, "availability"), smallSeriesSuitability: rt(1, "smallSeriesSuitability"),
    xxl: { maxSensibleEdgeMm: mq(250, "mm", { min: 100, max: 400, source: "estimate_reasoning", confidence: "estimated",
        note: t("Kammerbedarf und extreme Verzugsneigung begrenzen die Bauteilgrösse stark.",
                "Chamber requirement and extreme warping tendency limit part size severely.") }),
      segmentationRecommended: fl(true) },
    reentsPortfolioStatus: ch("unknown"),
  },
  governance: {
    lastReviewed: RETRIEVED, reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt) - fachliche Freigabe ausstehend",
    reviewCycleMonths: 12, dataCompleteness: null,
    sources: [
      { id: "src_bambu_tds", type: "manufacturer-tds", publisher: "Bambu Lab", productName: "Bambu PPS-CF",
        title: "Bambu PPS-CF — Technical Data Sheet", url: `${CDN}/Bambu_PPS-CF_Technical_Data_Sheet.pdf`,
        retrievedAt: RETRIEVED, confidenceCeiling: "high",
        note: t("Datenblatt mit gedruckten Prüfkörpern, beiden Orientierungen, Streuungen UND vollständig offengelegten Druckparametern der Prüfkörper.",
                "Datasheet with printed specimens, both orientations, scatter figures AND fully disclosed specimen print parameters.") },
      { id: "estimate_reasoning", type: "estimate", publisher: "FDM-Materialberater",
        title: "Fachliche Ableitung ohne Primärquelle", confidenceCeiling: "estimated" },
    ],
    openQuestions: [{ id: "oq_second_source",
      question: t("Zweite unabhängige Herstellerquelle für PPS-CF ergänzen.", "Add a second independent manufacturer source for PPS-CF."),
      blocking: false, affectsFields: ["mechanics", "thermal"] }],
  },
}, null, 2) + "\n");
console.log("  Werkstofftyp pps-cf");
