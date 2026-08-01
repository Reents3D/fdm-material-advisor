/**
 * Import batch: Bambu Lab technical data sheets.
 *
 * WHY A GENERATOR AND NOT HAND-WRITTEN JSON?
 * All records in this batch come from one publisher, one lab, one set of test standards
 * (ISO 527 / 178 / 179 / 75 / 1183) and — decisively — from PRINTED specimens with both
 * X-Y and Z values. That makes them directly comparable, which is rare. Encoding the raw
 * datasheet table once and expanding it mechanically keeps the transcription auditable:
 * the numbers below can be diffed against the PDFs line by line.
 *
 * The generated files under data/materials/ are the source of truth and may be edited by
 * hand afterwards (qualitative ratings, Reents field experience). Re-running this script
 * OVERWRITES them — see README in this folder.
 *
 * Run: node scripts/import/bambu-tds.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "data/materials");
const REVIEWED = "2026-08-01";
const REVIEWER = "Claude Code (Erstimport aus Herstellerdatenblatt) - fachliche Freigabe durch Riko Reents ausstehend";

/* ------------------------------------------------------------------ helpers */

const t = (de, en) => ({ de, en });

/** quantity from a Bambu "value ± tolerance" cell */
const q = (value, unit, opts = {}) => {
  const o = { value, unit, source: opts.source ?? "src_bambu_tds", confidence: opts.confidence ?? "medium" };
  if (opts.tol != null) o.tolerance = opts.tol;
  if (opts.min != null) o.min = opts.min;
  if (opts.max != null) o.max = opts.max;
  if (opts.std) o.testStandard = opts.std;
  if (opts.orientation) o.orientation = opts.orientation;
  if (opts.conditions) o.conditions = opts.conditions;
  if (opts.derivedFrom) o.derivedFrom = opts.derivedFrom;
  if (opts.note) o.note = opts.note;
  return o;
};

const rating = (value, scale, opts = {}) => ({
  value, scale,
  source: opts.source ?? "estimate_reasoning",
  confidence: opts.confidence ?? "estimated",
  ...(opts.note ? { note: opts.note } : {}),
});

const flag = (value, opts = {}) => ({
  value,
  source: opts.source ?? "estimate_reasoning",
  confidence: opts.confidence ?? "estimated",
  ...(opts.note ? { note: opts.note } : {}),
});

const choice = (value, opts = {}) => ({
  value,
  source: opts.source ?? "estimate_reasoning",
  confidence: opts.confidence ?? "estimated",
  ...(opts.note ? { note: opts.note } : {}),
});

const chem = (id, r, opts = {}) => ({
  chemicalId: id, rating: r,
  source: opts.source ?? "estimate_reasoning",
  confidence: opts.confidence ?? "estimated",
  ...(opts.conditions ? { conditions: opts.conditions } : {}),
  ...(opts.note ? { note: opts.note } : {}),
});

const ISO527 = "ISO 527 / GB/T 1040";
const ISO178 = "ISO 178 / GB/T 9341";
const ISO179 = "ISO 179 / GB/T 1043";
const round2 = (n) => Math.round(n * 100) / 100;

/* -------------------------------------------------- raw datasheet transcript */
/* Values transcribed verbatim from the Bambu Lab TDS PDFs (see `src` per entry).
   Format: [value, tolerance] or plain number. `null` = "N/A" in the datasheet.      */

const TDS = {
  "pla": {
    doc: { v: "V3.0", file: "bambu_pla_basic_technical_data_sheet.pdf",
           url: "https://wiki.bambulab.com/filament-acc/abs-asa-pc/bambu_pla_basic_technical_data_sheet.pdf",
           product: "Bambu PLA Basic" },
    density: 1.24, tm: 160, tg: 60, vicat: 57, hdtA: 54, hdtB: 57, wabs: 0.43,
    EXY: [2580, 220], EZ: [2060, 170], tsXY: [35, 4], tsZ: [31, 3],
    elXY: [12.2, 1.8], elZ: [7.5, 1.3], bmXY: [2750, 160], bmZ: [2370, 150],
    bsXY: [76, 5], bsZ: [59, 6], imXY: [7.9, 1.2], imZ: [13.8, 0.9],
    nozzle: [190, 230], bed: [35, 45], chamber: [25, 45], dry: [50, 8], speed: 300, overhang: 55,
    specimen: "Düse 220 °C, Bett 35 °C, 200 mm/s, 100 % Infill; Prüfkörper 8 h bei 55 °C getempert und getrocknet",
    acid: "not-resistant", alkali: "not-resistant", oil: "resistant", flammability: "flammable",
    anneal: { temp: 55, min: 50, max: 60, hours: 8, hMin: 6, hMax: 12 },
  },
  "petg": {
    doc: { v: "V3.0", file: "Bambu_PETG_Basic_Technical_Data_Sheet.pdf",
           url: "https://store.bblcdn.com/s1/default/cb94589bf7994fdcbfa833badefae9cd/Bambu_PETG_Basic_Technical_Data_Sheet.pdf",
           product: "Bambu PETG Basic" },
    density: 1.25, tm: null, tg: 69, vicat: null, hdtA: 68, hdtB: 71, wabs: 0.45,
    EXY: [2780, 65], EZ: [2550, 100], tsXY: [51, 1], tsZ: [35, 6],
    elXY: [9.5, 0.7], elZ: [5.2, 1.4], bmXY: [1950, 50], bmZ: [1740, 40],
    bsXY: [75, 3], bsZ: [56, 4], imXY: [34.2, 4.1], imZ: [10.5, 1.8],
    nozzle: [230, 260], bed: [65, 75], chamber: [35, 50], dry: [65, 8], speed: 200, overhang: 70,
    acid: "not-resistant", alkali: "not-resistant", oil: "resistant", flammability: "flammable",
  },
  "abs": {
    doc: { v: "V3.0", file: "Bambu_ABS_Technical_Data_Sheet_V3.pdf",
           url: "https://store.bblcdn.com/s7/default/23b4cf2b83d5470bb96d19970b5f3ae8/Bambu_ABS_Technical_Data_Sheet_V3.pdf",
           product: "Bambu ABS" },
    density: 1.05, tm: 200, tg: null, vicat: 94, hdtA: 84, hdtB: 87, wabs: 0.65,
    EXY: [2200, 190], EZ: [1960, 110], tsXY: [33, 3], tsZ: [28, 2],
    elXY: [10.5, 1.0], elZ: [4.7, 0.8], bmXY: [1880, 110], bmZ: [1590, 100],
    bsXY: [62, 4], bsZ: [39, 4], imXY: [21.5, 2.2], imZ: [7.4, 1.2],
    nozzle: [240, 270], bed: [80, 100], chamber: [45, 60], dry: [80, 8], speed: 300, overhang: 70,
    acid: "resistant", alkali: "resistant", oil: "limited", flammability: "flammable",
  },
  "asa": {
    doc: { v: "V3.0", file: "6eaf4c432d1d4014a1975e55a55ed00b.pdf",
           url: "https://wiki.bambulab.com/filament-acc/abs-asa-pc/6eaf4c432d1d4014a1975e55a55ed00b.pdf",
           product: "Bambu ASA" },
    density: 1.05, tm: 210, tg: null, vicat: 106, hdtA: 92, hdtB: 100, wabs: 0.45,
    EXY: [2450, 270], EZ: [2120, 260], tsXY: [37, 3], tsZ: [31, 4],
    elXY: [9.2, 1.4], elZ: [4.6, 0.8], bmXY: [1920, 130], bmZ: [1650, 120],
    bsXY: [65, 5], bsZ: [40, 3], imXY: [19.6, 1.8], imZ: [4.9, 0.6],
    nozzle: [240, 270], bed: [80, 100], chamber: [45, 60], dry: [80, 8], speed: 250, overhang: 70,
    acid: "resistant", alkali: "resistant", oil: "limited", flammability: "flammable",
  },
  "asa-cf": {
    doc: { v: "V1.0", file: "bambus_asa-cf_technical_data_sheet.pdf",
           url: "https://wiki.bambulab.com/filament-acc/asacf-pahtcf/bambus_asa-cf_technical_data_sheet.pdf",
           product: "Bambu ASA-CF" },
    density: 1.02, tm: 210, tg: null, vicat: 108, hdtA: 102, hdtB: 110, wabs: 0.33,
    EXY: [4200, 270], EZ: [2290, 260], tsXY: [34, 3], tsZ: [30, 4],
    elXY: [9.6, 1.4], elZ: [4.4, 0.8], bmXY: [3740, 130], bmZ: [1350, 120],
    bsXY: [72, 5], bsZ: [33, 3], imXY: null, imZ: [9.4, 0.6],
    nozzle: [250, 280], bed: [80, 100], chamber: [45, 60], dry: [80, 8], speed: 250, overhang: 70,
    acid: "resistant", alkali: "resistant", oil: "resistant", flammability: "flammable",
    anomaly: t(
      "Das Datenblatt nennt als Prüfkörper-Druckbedingungen 220 °C Düse und 35 °C Bett. Diese Werte stammen erkennbar aus dem PLA-Datenblatt - ASA lässt sich so nicht verarbeiten. Die mechanischen Werte selbst wirken konsistent, die Prüfbedingungen sind aber unbelegt.",
      "The datasheet lists specimen printing conditions of 220 °C nozzle and 35 °C bed. These are evidently copied from the PLA datasheet - ASA cannot be processed that way. The mechanical values themselves look consistent, but the test conditions are unsubstantiated."),
  },
  "asa-aero": {
    doc: { v: "V1.0", file: "bambu_asa_aero_technical_data_sheet.pdf",
           url: "https://wiki.bambulab.com/filament-acc/abs-asa-pc/bambu_asa_aero_technical_data_sheet.pdf",
           product: "Bambu ASA Aero" },
    density: 0.99, tm: 204, tg: null, vicat: 80, hdtA: 78, hdtB: 85, wabs: 0.80,
    EXY: [2010, 260], EZ: [1180, 210], tsXY: [32, 4], tsZ: [21, 4],
    elXY: [5.1, 1.6], elZ: [2.3, 0.9], bmXY: [1510, 120], bmZ: [1220, 110],
    bsXY: [58, 6], bsZ: [24, 3], imXY: null, imZ: [3.4, 0.5],
    nozzle: [240, 280], bed: [80, 90], chamber: [45, 60], dry: [80, 8], speed: 150, overhang: 70,
    acid: "resistant", alkali: "resistant", oil: "resistant", flammability: "flammable",
  },
  "pc": {
    doc: { v: "V2.0", file: "a52afdccddfd448583d119587122c8c5.pdf",
           url: "https://wiki.bambulab.com/filament-acc/abs-asa-pc/a52afdccddfd448583d119587122c8c5.pdf",
           product: "Bambu PC" },
    density: 1.20, tm: 228, tg: 145, vicat: 119, hdtA: 117, hdtB: 112, wabs: 0.25,
    EXY: [2110, 40], EZ: [1450, 60], tsXY: [62, 2], tsZ: [56, 2],
    elXY: [3.8, 0.3], elZ: [2.1, 0.4], bmXY: [2310, 70], bmZ: [1620, 80],
    bsXY: [108, 4], bsZ: [55, 2], imXY: [34.8, 2.1], imXYnotched: [7.5, 1.3], imZ: [9.0, 0.4],
    nozzle: [260, 280], bed: [90, 110], chamber: [45, 60], dry: [80, 8], speed: 300, overhang: 70,
    specimen: "Düse 270 °C, Bett 100 °C, 200 mm/s, 100 % Infill; Prüfkörper 12 h bei 80 °C getempert und getrocknet",
    acid: "not-resistant", alkali: "not-resistant", oil: "resistant",
    flammability: "self-extinguishing",
    anneal: { temp: 80, hours: 12 },
    hdtInverted: true,
  },
  "pa6-cf": {
    doc: { v: "V3.0", file: "c750bddfb8e44af6ae9f7dd9625fa458.pdf",
           url: "https://wiki.bambulab.com/filament-acc/petcf-ppacf/c750bddfb8e44af6ae9f7dd9625fa458.pdf",
           product: "Bambu PA6-CF" },
    density: 1.09, tm: 223, tg: 68, vicat: null, hdtA: 164, hdtB: 186, wabs: 2.35,
    EXY: [4430, 310], EZ: [2170, 230], tsXY: [102, 7], tsZ: [48, 6],
    elXY: [5.8, 1.6], elZ: [3.7, 0.8], bmXY: [5460, 280], bmZ: [2240, 220],
    bsXY: [151, 8], bsZ: [80, 7], imXY: [13.4, 1.7], imZ: [15.5, 1.7],
    nozzle: [260, 290], bed: [80, 100], chamber: [45, 60], dry: [80, 8, 12], speed: 100, overhang: 70,
    minNozzle: 0.4, recNozzle: 0.6,
    acid: "not-resistant", alkali: "not-resistant", oil: "resistant", flammability: "flammable",
  },
  "pet-cf": {
    doc: { v: "V3.0", file: "07689de83afd4cc480f136c7697e6de3.pdf",
           url: "https://wiki.bambulab.com/filament-acc/petcf-ppacf/07689de83afd4cc480f136c7697e6de3.pdf",
           product: "Bambu PET-CF" },
    density: 1.29, tm: 250, tg: 75, vicat: null, hdtA: 182, hdtB: 205, wabs: 0.37,
    EXY: [4730, 260], EZ: [2160, 170], tsXY: [74, 6], tsZ: [35, 5],
    elXY: [4.5, 1.2], elZ: [2.4, 0.8], bmXY: [5320, 270], bmZ: [2210, 180],
    bsXY: [131, 6], bsZ: [49, 5], imXY: [8.6, 0.5], imZ: [4.5, 0.6],
    nozzle: [260, 290], bed: [80, 100], chamber: [45, 60], dry: [80, 8, 12], speed: 100, overhang: 70,
    minNozzle: 0.4, recNozzle: 0.6,
    acid: "not-resistant", alkali: "not-resistant", oil: "resistant", flammability: "flammable",
  },
  "tpu-95a": {
    doc: { v: "V2.0", file: "Bambu_TPU_95A_Technical_Data_Sheet.pdf",
           url: "https://sourcegraphics.com/wp-content/uploads/2023/06/Bambu_TPU_95A_Technical_Data_Sheet.pdf",
           product: "Bambu TPU 95A" },
    density: 1.20, tm: 185, tg: null, vicat: null, hdtA: null, hdtB: null, wabs: null,
    EXY: [9.2, 0.4], EZ: [7.8, 0.5], tsXY: [29.6, 0.6], tsZ: [23.2, 0.5],
    elXY: [700, null], elZ: [500, null], bmXY: null, bmZ: null,
    bsXY: null, bsZ: null, imXY: null, imZ: null,
    nozzle: [220, 240], bed: [30, 35], chamber: [25, 45], dry: [70, 8], speed: 80, overhang: null,
    acid: null, alkali: null, oil: null, flammability: "flammable",
    elongationOpenEnded: true,
  },
};

/* ------------------------------------------------- per-material editorial layer */
/* Everything that is NOT in the datasheet: taxonomy, prose, qualitative ratings.   */

const META = {
  "pla": {
    name: "PLA", family: "PLA", polymerClass: "semi-crystalline", variant: ["basic", "high-speed"],
    aliases: ["PLA Basic", "Polylactid", "Polylactic Acid", "PLA+"],
    abstract: t(
      "PLA ist das einfachste und günstigste FDM-Material und die erste Wahl für große, sichtbare Bauteile ohne thermische Belastung - Messeexponate, Urmodelle, Architektur, Ausstellungsbau. Grenzen: Ab rund 50 °C verliert es Form und Festigkeit, es kriecht unter Dauerlast und ist im Aussenbereich nicht dauerhaft.",
      "PLA is the easiest and cheapest FDM material and the first choice for large visible parts without thermal load - trade fair exhibits, master patterns, architecture, exhibition builds. Limits: above roughly 50 °C it loses shape and strength, it creeps under sustained load and is not durable outdoors."),
    positioning: t(
      "Das XXL-Arbeitspferd: gutmütig, günstig, maßhaltig - solange es nicht warm wird.",
      "The XXL workhorse: forgiving, cheap, dimensionally stable - as long as it does not get warm."),
    ratings: {
      printability: 5, warpingTendency: 1, hygroscopy: 2, abrasiveness: 1, stringingTendency: 2,
      toughness: 2, creepTendency: 5, notchSensitivity: 3, uvResistance: 1, weatherResistance: 1,
      hydrolysisResistance: 2, stressCrackingSensitivity: 2, surfaceQuality: 4, layerLineVisibility: 3,
      sandability: 4, fillability: 5, paintAdhesion: 4, bondability: 4, priceIndex: 1, availability: 5,
      smallSeriesSuitability: 4, yellowingTendency: 3,
    },
    chamber: "not-required", xxl: 2400, xxlConf: "medium",
    finishing: {
      primer: t("Schleifen (P240-P400), entfetten, Kunststoff- oder Füllprimer. PLA nimmt Lack gutmütig an - für lackierte Sichtteile die dankbarste Basis im FDM.",
                "Sand (P240-P400), degrease, plastic or filler primer. PLA accepts paint readily - the most forgiving base in FDM for painted visible parts."),
      adhesives: ["Cyanacrylat", "2K-Epoxid", "Dichlormethan (Lösemittelschweissen)", "PUR"],
      gloss: "semi-gloss", colours: "very-wide",
    },
    sustainability: { bio: 100, compostable: true, recycl: "industrial-only" },
    notes: {
      strength: t("35 MPa wirken niedrig gegenüber den 50-60 MPa aus Rohstoff-Datenblättern. Der Unterschied ist die Prüfmethode: Bambu prüft GEDRUCKTE Körper, Rohstoffhersteller spritzgegossene. Für FDM ist der gedruckte Wert der ehrliche.",
                  "35 MPa looks low against the 50-60 MPa in resin datasheets. The difference is the test method: Bambu tests PRINTED specimens, resin producers injection-moulded ones. For FDM the printed value is the honest one."),
    },
  },
  "petg": {
    name: "PETG", family: "PETG", polymerClass: "amorphous", variant: ["basic"],
    aliases: ["PET-G", "Glykol-modifiziertes PET", "Copolyester"],
    abstract: t(
      "PETG ist der pragmatische Allrounder zwischen PLA und ABS: fester und zäher als PLA, deutlich einfacher zu drucken als ABS und ohne beheizte Kammer verarbeitbar. Grenzen: Die Wärmeformbestandigkeit endet bei rund 70 °C, Laugen greifen es an, und die Lackhaftung ist schwach.",
      "PETG is the pragmatic all-rounder between PLA and ABS: stronger and tougher than PLA, considerably easier to print than ABS and processable without a heated chamber. Limits: heat resistance ends around 70 °C, alkalis attack it, and paint adhesion is weak."),
    positioning: t(
      "Der vernünftige Standard für Funktionsteile, wenn weder Temperatur noch Lackierung im Lastenheft stehen.",
      "The sensible default for functional parts when neither temperature nor painting is in the specification."),
    ratings: {
      printability: 4, warpingTendency: 2, hygroscopy: 4, abrasiveness: 1, stringingTendency: 4,
      toughness: 4, creepTendency: 3, notchSensitivity: 2, uvResistance: 3, weatherResistance: 3,
      hydrolysisResistance: 2, stressCrackingSensitivity: 4, surfaceQuality: 3, layerLineVisibility: 4,
      sandability: 2, fillability: 3, paintAdhesion: 2, bondability: 4, priceIndex: 2, availability: 5,
      smallSeriesSuitability: 4, gasBarrier: 4,
    },
    chamber: "not-required", xxl: 1500, xxlConf: "estimated",
    finishing: {
      primer: t("Mattschleifen (P320-P400), entfetten, dann 2K-Epoxid- oder Kunststoffhaftprimer. Ohne Haftvermittler platzt der Lack.",
                "Matt sand (P320-P400), degrease, then 2K epoxy or plastic adhesion primer. Without an adhesion promoter the paint flakes."),
      adhesives: ["2K-Epoxid", "Cyanacrylat mit Aktivator", "MS-Polymer", "2K-PUR"],
      gloss: "glossy", colours: "very-wide",
    },
    sustainability: { bio: 0, compostable: false, recycl: "possible-in-theory" },
  },
  "abs": {
    name: "ABS", family: "ABS", polymerClass: "amorphous", variant: ["basic"],
    aliases: ["Acrylnitril-Butadien-Styrol"],
    abstract: t(
      "ABS ist das klassische technische Material für warme Umgebungen bis rund 85 °C und lässt sich als einziger gängiger Werkstoff mit Aceton chemisch glätten. Grenzen: Es braucht praktisch eine beheizte Kammer, neigt stark zum Warping und ist im Aussenbereich nicht UV-stabil - dafür gibt es ASA.",
      "ABS is the classic engineering material for warm environments up to around 85 °C and the only common material that can be chemically smoothed with acetone. Limits: it effectively needs a heated chamber, warps strongly and is not UV stable outdoors - that is what ASA is for."),
    positioning: t(
      "Der Temperatur- und Veredelungswerkstoff für Innenanwendungen - wenn die Anlage eine Kammer hat.",
      "The temperature and finishing material for indoor use - if the machine has a chamber."),
    ratings: {
      printability: 2, warpingTendency: 5, hygroscopy: 3, abrasiveness: 1, stringingTendency: 2,
      toughness: 4, creepTendency: 3, notchSensitivity: 3, uvResistance: 1, weatherResistance: 2,
      hydrolysisResistance: 4, stressCrackingSensitivity: 3, surfaceQuality: 3, layerLineVisibility: 3,
      sandability: 5, fillability: 4, paintAdhesion: 5, bondability: 5, priceIndex: 2, availability: 5,
      smallSeriesSuitability: 3,
    },
    chamber: "recommended", xxl: 600, xxlConf: "estimated",
    finishing: {
      smoothing: { suitable: true, medium: "Aceton (Dampfglätten)" },
      primer: t("Anschleifen und entfetten reicht meist; ABS ist der lackfreundlichste gängige FDM-Werkstoff. Alternativ Dampfglätten mit Aceton vor der Lackierung.",
                "Sanding and degreasing is usually enough; ABS is the most paint-friendly common FDM material. Alternatively vapour-smooth with acetone before painting."),
      adhesives: ["Aceton (Lösemittelschweissen)", "2K-Epoxid", "Cyanacrylat", "ABS-Kleber"],
      gloss: "semi-gloss", colours: "wide",
    },
    sustainability: { bio: 0, compostable: false, recycl: "possible-in-theory" },
    emissions: { level: "high", note: t(
      "ABS setzt beim Druck Styrol und ultrafeine Partikel frei. Absaugung oder geschlossene Anlage mit Filter sind bei Dauerbetrieb Pflicht, nicht Empfehlung.",
      "ABS releases styrene and ultrafine particles while printing. Extraction or an enclosed machine with a filter is mandatory in continuous operation, not optional.") },
  },
  "asa": {
    name: "ASA", family: "ASA", polymerClass: "amorphous", variant: ["basic"],
    aliases: ["Acrylnitril-Styrol-Acrylat", "ABS-Ersatz für Aussen"],
    abstract: t(
      "ASA ist der Aussenwerkstoff im FDM: UV- und witterungsbeständig, temperaturfest bis rund 92 °C und beständig gegen verdünnte Säuren und Laugen. Grenzen: Es braucht eine beheizte Kammer, warpt ähnlich wie ABS und ist teurer - für Innenbauteile ohne Sonne gibt es günstigere Optionen.",
      "ASA is the outdoor material in FDM: UV and weather resistant, temperature stable to around 92 °C and resistant to dilute acids and alkalis. Limits: it needs a heated chamber, warps like ABS and costs more - for indoor parts without sun there are cheaper options."),
    positioning: t(
      "Erste Wahl für alles, was dauerhaft draussen steht.",
      "First choice for anything that stays outdoors permanently."),
    ratings: {
      printability: 2, warpingTendency: 4, hygroscopy: 3, abrasiveness: 1, stringingTendency: 2,
      toughness: 4, creepTendency: 3, notchSensitivity: 3, uvResistance: 5, weatherResistance: 5,
      hydrolysisResistance: 4, yellowingTendency: 1, stressCrackingSensitivity: 3, surfaceQuality: 3,
      layerLineVisibility: 3, sandability: 5, fillability: 4, paintAdhesion: 5, bondability: 5,
      priceIndex: 3, availability: 4, smallSeriesSuitability: 3,
    },
    chamber: "recommended", xxl: 600, xxlConf: "estimated",
    outdoorYears: { value: 10, min: 5, max: 15 },
    finishing: {
      smoothing: { suitable: true, medium: "Aceton (eingeschränkt, langsamer als bei ABS)" },
      primer: t("Wie ABS: anschleifen, entfetten, lackieren. Für Aussenbauteile UV-stabilen 2K-Lack verwenden - er schützt zusätzlich die Schichtfugen.",
                "Like ABS: sand, degrease, paint. For outdoor parts use a UV-stable 2K paint - it additionally protects the layer seams."),
      adhesives: ["2K-Epoxid", "Aceton (Lösemittelschweissen)", "Cyanacrylat", "MS-Polymer"],
      gloss: "semi-gloss", colours: "wide",
    },
    sustainability: { bio: 0, compostable: false, recycl: "possible-in-theory" },
    emissions: { level: "high" },
  },
  "asa-cf": {
    name: "ASA-CF", family: "ASA", polymerClass: "amorphous", variant: ["CF"],
    filler: "carbon-fibre-chopped",
    aliases: ["ASA Carbon Fiber", "ASA-CF10"],
    abstract: t(
      "ASA-CF verbindet die Witterungsbeständigkeit von ASA mit knapp der doppelten Steifigkeit und deutlich geringerem Verzug - der interessanteste Kandidat für grosse, formstabile Aussenbauteile. Grenzen: Die Zugfestigkeit steigt nicht, das Material wird spröder, und die Düse muss gehärtet sein.",
      "ASA-CF combines the weather resistance of ASA with almost double the stiffness and markedly less warping - the most interesting candidate for large, dimensionally stable outdoor parts. Limits: tensile strength does not increase, the material becomes more brittle, and a hardened nozzle is mandatory."),
    positioning: t(
      "Formstabiles Aussen-ASA für grosse Bauteile - Steifigkeit statt Festigkeit.",
      "Dimensionally stable outdoor ASA for large parts - stiffness rather than strength."),
    ratings: {
      printability: 3, warpingTendency: 2, hygroscopy: 3, abrasiveness: 5, stringingTendency: 2,
      toughness: 2, creepTendency: 2, notchSensitivity: 4, uvResistance: 5, weatherResistance: 5,
      hydrolysisResistance: 4, yellowingTendency: 1, stressCrackingSensitivity: 3, surfaceQuality: 4,
      layerLineVisibility: 2, sandability: 3, fillability: 4, paintAdhesion: 4, bondability: 4,
      priceIndex: 4, availability: 3, smallSeriesSuitability: 3,
    },
    chamber: "recommended", xxl: 1200, xxlConf: "estimated",
    outdoorYears: { value: 10, min: 5, max: 15 },
    hardenedNozzle: true,
    finishing: { gloss: "matte", colours: "limited-mostly-black",
      adhesives: ["2K-Epoxid", "Cyanacrylat mit Aktivator", "MS-Polymer"] },
    sustainability: { bio: 0, compostable: false, recycl: "not-practical-fibre-filled" },
    emissions: { level: "high" },
  },
  "asa-aero": {
    name: "ASA Aero", family: "ASA", polymerClass: "amorphous", variant: ["foaming", "low-weight"],
    aliases: ["ASA Aero", "Foaming ASA", "LW-ASA"],
    abstract: t(
      "ASA Aero schäumt beim Druck auf und erreicht mit 0,99 g/cm³ die geringste Dichte im Feld - bei voller ASA-Witterungsbeständigkeit. Ideal für sehr grosse, leichte Aussenbauteile, bei denen Gewicht und Transport das Problem sind. Grenzen: deutlich niedrigere Festigkeit, besonders in Z, und HDT nur rund 78 °C.",
      "ASA Aero foams during printing and reaches the lowest density in this field at 0.99 g/cm³ - with full ASA weather resistance. Ideal for very large, light outdoor parts where weight and transport are the problem. Limits: markedly lower strength, especially in Z, and HDT only around 78 °C."),
    positioning: t(
      "Leichtbau für XXL-Aussenteile: maximale Grösse pro Kilo Material.",
      "Lightweight construction for XXL outdoor parts: maximum size per kilo of material."),
    ratings: {
      printability: 3, warpingTendency: 3, hygroscopy: 3, abrasiveness: 1, stringingTendency: 2,
      toughness: 2, creepTendency: 3, notchSensitivity: 4, uvResistance: 5, weatherResistance: 5,
      hydrolysisResistance: 4, yellowingTendency: 1, surfaceQuality: 3, layerLineVisibility: 3,
      sandability: 3, fillability: 4, paintAdhesion: 4, bondability: 3,
      priceIndex: 4, availability: 2, smallSeriesSuitability: 2,
    },
    chamber: "recommended", xxl: 2000, xxlConf: "estimated",
    outdoorYears: { value: 8, min: 4, max: 12 },
    finishing: { gloss: "matte", colours: "limited",
      adhesives: ["2K-Epoxid", "MS-Polymer"] },
    sustainability: { bio: 0, compostable: false, recycl: "not-practical-fibre-filled" },
    emissions: { level: "high" },
    notes: {
      xxl: t("Die geringe Dichte ist bei Grossbauteilen ein doppelter Hebel: weniger Materialkosten und ein Bauteil, das sich noch von Hand bewegen lässt. Die geringe Z-Festigkeit (21 MPa) verlangt aber saubere Orientierung und grosszügige Wandstärken.",
             "Low density is a double lever on large parts: less material cost and a part that can still be moved by hand. The low Z strength (21 MPa) demands careful orientation and generous wall thickness."),
    },
  },
  "pc": {
    name: "PC", family: "PC", polymerClass: "amorphous", variant: ["basic"],
    aliases: ["Polycarbonat", "Polycarbonate", "Makrolon-Typ"],
    abstract: t(
      "PC ist der Temperaturwerkstoff unter den gängigen FDM-Materialien: rund 115 °C formbeständig, hohe Festigkeit und mit 0,90 die beste Schichthaftung im ganzen Feld. Grenzen: Es braucht eine beheizte Kammer, muss zwingend getrocknet werden, ist kerbempfindlich und wird von Laugen und vielen Lösemitteln angegriffen.",
      "PC is the temperature material among common FDM materials: dimensionally stable to around 115 °C, high strength and, at 0.90, the best layer adhesion in the entire field. Limits: it needs a heated chamber, must be dried, is notch sensitive and is attacked by alkalis and many solvents."),
    positioning: t(
      "Wenn es heiss wird und tragen muss - und eine Kammer verfügbar ist.",
      "When it gets hot and has to carry load - and a chamber is available."),
    ratings: {
      printability: 2, warpingTendency: 4, hygroscopy: 5, abrasiveness: 1, stringingTendency: 3,
      toughness: 3, creepTendency: 2, notchSensitivity: 5, uvResistance: 2, weatherResistance: 2,
      hydrolysisResistance: 2, yellowingTendency: 4, stressCrackingSensitivity: 5, surfaceQuality: 3,
      layerLineVisibility: 3, sandability: 3, fillability: 3, paintAdhesion: 3, bondability: 4,
      priceIndex: 4, availability: 4, smallSeriesSuitability: 3,
    },
    chamber: "mandatory", xxl: 400, xxlConf: "estimated",
    finishing: { gloss: "semi-gloss", colours: "limited", translucency: "translucent",
      adhesives: ["2K-Epoxid", "Cyanacrylat", "PUR-Konstruktionsklebstoff"] },
    sustainability: { bio: 0, compostable: false, recycl: "possible-in-theory" },
    notes: {
      elongation: t("Die Bruchdehnung von nur 3,8 % überrascht bei einem Werkstoff, der als zäh gilt. Gedrucktes PC verhält sich deutlich spröder als spritzgegossenes - ein Beispiel dafür, dass Werkstoff-Ruf und FDM-Realität auseinandergehen.",
                    "The elongation at break of only 3.8 % is surprising for a material considered tough. Printed PC behaves markedly more brittle than injection-moulded PC - an example of a material's reputation diverging from FDM reality."),
    },
  },
  "pa6-cf": {
    name: "PA6-CF", family: "PA", polymerClass: "semi-crystalline", variant: ["CF"],
    filler: "carbon-fibre-chopped",
    aliases: ["Nylon 6 Carbon", "PA6 Carbon Fiber", "Polyamid 6 CF"],
    abstract: t(
      "PA6-CF ist der stärkste Werkstoff im Feld: 102 MPa Zugfestigkeit und 164 °C HDT bei nur 1,09 g/cm³ - für hochbelastete Vorrichtungen, Ersatzteile und motornahe Bauteile. Grenzen: Es nimmt 2,35 % Wasser auf und verändert dabei sein Verhalten, die Z-Festigkeit fällt auf 47 %, und ohne Kammer und Trocknung ist es nicht prozesssicher.",
      "PA6-CF is the strongest material in this field: 102 MPa tensile strength and 164 °C HDT at only 1.09 g/cm³ - for highly loaded jigs, spare parts and near-engine components. Limits: it absorbs 2.35 % water and changes behaviour accordingly, Z strength drops to 47 %, and without a chamber and drying it is not process reliable."),
    positioning: t(
      "Der Hochleistungswerkstoff für tragende Technikteile - mit dem höchsten Prozessaufwand.",
      "The high-performance material for load-bearing technical parts - with the highest process effort."),
    ratings: {
      printability: 2, warpingTendency: 3, hygroscopy: 5, abrasiveness: 5, stringingTendency: 3,
      toughness: 3, creepTendency: 2, notchSensitivity: 3, uvResistance: 2, weatherResistance: 2,
      hydrolysisResistance: 2, stressCrackingSensitivity: 2, surfaceQuality: 4, layerLineVisibility: 2,
      sandability: 3, fillability: 3, paintAdhesion: 2, bondability: 2, wearResistance: 5,
      priceIndex: 5, availability: 3, smallSeriesSuitability: 3, fatigueResistance: 4,
    },
    chamber: "mandatory", xxl: 400, xxlConf: "estimated",
    hardenedNozzle: true,
    finishing: { gloss: "matte", colours: "limited-mostly-black",
      adhesives: ["2K-Epoxid (nach Plasma- oder Primer-Vorbehandlung)", "Cyanacrylat mit Aktivator"] },
    sustainability: { bio: 0, compostable: false, recycl: "not-practical-fibre-filled" },
    notes: {
      moisture: t("2,35 % Wassergehalt bei 55 % rF ist der mit Abstand höchste Wert im Feld - fünfmal so viel wie PETG. Feuchtes PA6-CF verliert Festigkeit und Steifigkeit, wird aber zäher. Das Bauteil ändert seine Eigenschaften im Betrieb, nicht nur beim Druck. Für maßhaltige Anwendungen ist das ein hartes Ausschlusskriterium.",
                  "2.35 % water content at 55 % RH is by far the highest in this field - five times PETG. Damp PA6-CF loses strength and stiffness but becomes tougher. The part changes its properties in service, not just during printing. For dimensionally critical applications this is a hard exclusion criterion."),
    },
  },
  "pet-cf": {
    name: "PET-CF", family: "PET", polymerClass: "semi-crystalline", variant: ["CF"],
    filler: "carbon-fibre-chopped",
    aliases: ["PET Carbon Fiber", "PET-CF17", "Fiberon PET-CF"],
    abstract: t(
      "PET-CF ist der Temperaturspezialist: 182 °C HDT bei 1,8 MPa - mehr als das Doppelte von PC - bei hoher Steifigkeit und geringer Feuchteaufnahme. Für heisse, formstabile Technikteile. Grenzen: Mit 4,5 % Bruchdehnung sehr spröde, Z-Festigkeit nur 47 %, Kammer und gehärtete Düse zwingend.",
      "PET-CF is the temperature specialist: 182 °C HDT at 1.8 MPa - more than double PC - with high stiffness and low moisture uptake. For hot, dimensionally stable technical parts. Limits: very brittle at 4.5 % elongation, Z strength only 47 %, chamber and hardened nozzle mandatory."),
    positioning: t(
      "Höchste Wärmeformbeständigkeit im Feld - erkauft mit Sprödigkeit.",
      "Highest heat resistance in this field - paid for with brittleness."),
    ratings: {
      printability: 2, warpingTendency: 2, hygroscopy: 4, abrasiveness: 5, stringingTendency: 2,
      toughness: 1, creepTendency: 1, notchSensitivity: 5, uvResistance: 2, weatherResistance: 2,
      hydrolysisResistance: 2, stressCrackingSensitivity: 3, surfaceQuality: 4, layerLineVisibility: 2,
      sandability: 3, fillability: 4, paintAdhesion: 2, bondability: 4, wearResistance: 4,
      priceIndex: 5, availability: 3, smallSeriesSuitability: 3,
    },
    chamber: "mandatory", xxl: 500, xxlConf: "estimated",
    hardenedNozzle: true,
    finishing: { gloss: "matte", colours: "limited-mostly-black",
      adhesives: ["2K-Epoxid", "Cyanacrylat mit Aktivator"] },
    sustainability: { bio: 0, compostable: false, recycl: "not-practical-fibre-filled" },
    confusion: [{ id: "petg-cf", why: t(
      "PET-CF und PETG-CF unterscheiden sich um einen Buchstaben, aber um Faktor 2,6 bei der Wärmeformbeständigkeit (182 °C gegen 68 °C) und Faktor 2 bei der Steifigkeit. Wer PETG-CF bestellt und PET-CF-Werte erwartet, plant am Bauteil vorbei.",
      "PET-CF and PETG-CF differ by one letter but by a factor of 2.6 in heat resistance (182 °C vs 68 °C) and a factor of 2 in stiffness. Ordering PETG-CF while expecting PET-CF values means designing past the part.") }],
  },
  "tpu-95a": {
    name: "TPU 95A", family: "TPU", polymerClass: "elastomer", variant: ["flexible"],
    aliases: ["TPU", "Thermoplastisches Polyurethan", "Flexfilament", "Shore 95A"],
    abstract: t(
      "TPU 95A ist der gummielastische Werkstoff im FDM: über 700 % Bruchdehnung, abriebfest und dauerhaft flexibel - für Dichtungen, Dämpfer, Faltenbälge, Griffe und Schutzelemente. Grenzen: Es ist kein Konstruktionswerkstoff, hat keine sinnvolle Wärmeformbeständigkeit und druckt nur langsam.",
      "TPU 95A is the rubber-elastic material in FDM: over 700 % elongation at break, abrasion resistant and permanently flexible - for seals, dampers, bellows, grips and protective elements. Limits: it is not a structural material, has no meaningful heat deflection temperature and prints only slowly."),
    positioning: t(
      "Alles, was nachgeben, dämpfen oder dichten soll.",
      "Anything that has to give, damp or seal."),
    ratings: {
      printability: 2, warpingTendency: 1, hygroscopy: 4, abrasiveness: 1, stringingTendency: 5,
      toughness: 5, creepTendency: 4, notchSensitivity: 1, uvResistance: 2, weatherResistance: 3,
      hydrolysisResistance: 2, stressCrackingSensitivity: 1, surfaceQuality: 3, layerLineVisibility: 3,
      sandability: 1, fillability: 1, paintAdhesion: 1, bondability: 3, wearResistance: 5,
      priceIndex: 4, availability: 4, smallSeriesSuitability: 3, fatigueResistance: 5,
    },
    chamber: "not-required", xxl: 300, xxlConf: "estimated",
    hardnessShoreD: 46,
    finishing: { gloss: "matte", colours: "wide",
      adhesives: ["Cyanacrylat (flexibel)", "PUR-Klebstoff", "MS-Polymer"] },
    sustainability: { bio: 0, compostable: false, recycl: "not-practical" },
    notes: {
      structural: t("Der E-Modul von 9,2 MPa liegt drei Größenordnungen unter allen anderen Werkstoffen im Feld. TPU gehört in keinen Steifigkeitsvergleich - es löst eine völlig andere Aufgabe.",
                    "The 9.2 MPa modulus is three orders of magnitude below every other material here. TPU does not belong in a stiffness comparison - it solves an entirely different problem."),
    },
  },
};

/* ------------------------------------------------------------------- builder */

function buildMaterial(id, d, m) {
  const SRC = "src_bambu_tds";
  const mech = {};
  const push = (key, arr, unit, orientation, std) => {
    if (!arr) return;
    const [v, tol] = Array.isArray(arr) ? arr : [arr, null];
    mech[key] = q(v, unit, { tol: tol ?? undefined, std, orientation, source: SRC });
  };

  mech.density = q(d.density, "g/cm³", { std: "ISO 1183", source: SRC });
  push("tensileStrengthXy", d.tsXY, "MPa", "XY", ISO527);
  push("tensileStrengthZ", d.tsZ, "MPa", "Z", ISO527);
  push("tensileModulusXy", d.EXY, "MPa", "XY", ISO527);
  push("tensileModulusZ", d.EZ, "MPa", "Z", ISO527);
  push("elongationAtBreakXy", d.elXY, "%", "XY", ISO527);
  push("elongationAtBreakZ", d.elZ, "%", "Z", ISO527);
  push("flexuralStrengthXy", d.bsXY, "MPa", "XY", ISO178);
  push("flexuralStrengthZ", d.bsZ, "MPa", "Z", ISO178);
  push("flexuralModulusXy", d.bmXY, "MPa", "XY", ISO178);
  push("flexuralModulusZ", d.bmZ, "MPa", "Z", ISO178);
  push("charpyUnnotchedXy", d.imXY, "kJ/m²", "XY", ISO179 + " (ungekerbt)");
  push("charpyNotchedXy", d.imXYnotched, "kJ/m²", "XY", ISO179 + " (gekerbt)");
  push("charpyUnnotchedZ", d.imZ, "kJ/m²", "Z", ISO179);

  if (d.elongationOpenEnded && mech.elongationAtBreakXy) {
    mech.elongationAtBreakXy.conditions = "Datenblattangabe > 700 %; hier als Untergrenze erfasst";
    mech.elongationAtBreakZ.conditions = "Datenblattangabe > 500 %; hier als Untergrenze erfasst";
  }

  // anisotropy — same source, same test run, always
  if (d.tsXY && d.tsZ) {
    const f = round2(d.tsZ[0] / d.tsXY[0]);
    const lo = round2((d.tsZ[0] - (d.tsZ[1] ?? 0)) / (d.tsXY[0] + (d.tsXY[1] ?? 0)));
    const hi = round2((d.tsZ[0] + (d.tsZ[1] ?? 0)) / (d.tsXY[0] - (d.tsXY[1] ?? 0)));
    mech.anisotropyFactorTensile = q(f, "-", {
      min: lo, max: hi, orientation: "Z", source: SRC,
      derivedFrom: ["mechanics.tensileStrengthZ", "mechanics.tensileStrengthXy"],
      conditions: "Beide Operanden aus demselben Datenblatt und Prüfdurchgang",
      note: t(
        `Senkrecht zur Schicht bleiben ${Math.round(f * 100)} % der Zugfestigkeit erhalten (${d.tsZ[0]} von ${d.tsXY[0]} MPa).`,
        `Perpendicular to the layers ${Math.round(f * 100)} % of the tensile strength remains (${d.tsZ[0]} of ${d.tsXY[0]} MPa).`),
    });
  }
  if (d.imXY && d.imZ) {
    const f = round2(d.imZ[0] / d.imXY[0]);
    const inverted = f > 1;
    mech.anisotropyFactorImpact = q(f, "-", {
      orientation: "Z", source: SRC, confidence: inverted ? "low" : "medium",
      derivedFrom: ["mechanics.charpyUnnotchedZ", "mechanics.charpyUnnotchedXy"],
      note: inverted
        ? t("Auffällig: Das Datenblatt weist in Z eine HÖHERE Schlagzähigkeit aus als in X-Y. Das widerspricht dem FDM-Verhalten und deutet auf unterschiedliche Kerbzustände der Prüfkörper hin. Nicht für Auslegung verwenden.",
            "Notable: the datasheet reports HIGHER impact strength in Z than in X-Y. This contradicts FDM behaviour and suggests different notch conditions between specimens. Do not use for design.")
        : t("Die Schlagzähigkeit bricht in Z stärker ein als die Zugfestigkeit - schlagbelastete Bauteile müssen orientiert werden.",
            "Impact strength collapses more in Z than tensile strength - impact-loaded parts must be oriented."),
    });
  }

  for (const [scale, value] of Object.entries(m.ratings ?? {})) {
    const target =
      ["toughness", "creepTendency", "notchSensitivity", "wearResistance", "fatigueResistance"].includes(scale)
        ? mech : null;
    if (target) target[scale] = rating(value, scale);
  }
  if (m.hardnessShoreD) mech.hardnessShoreD = q(m.hardnessShoreD, "Shore D", { source: "estimate_reasoning", confidence: "estimated" });
  if (m.notes?.strength && mech.tensileStrengthXy) mech.tensileStrengthXy.note = m.notes.strength;
  if (m.notes?.elongation && mech.elongationAtBreakXy) mech.elongationAtBreakXy.note = m.notes.elongation;
  if (m.notes?.structural && mech.tensileModulusXy) mech.tensileModulusXy.note = m.notes.structural;

  /* thermal */
  const thermal = {};
  if (d.hdtA != null) thermal.hdtA = q(d.hdtA, "°C", { std: "ISO 75, 1.8 MPa", source: SRC, confidence: d.hdtInverted ? "low" : "medium" });
  if (d.hdtB != null) thermal.hdtB = q(d.hdtB, "°C", { std: "ISO 75, 0.45 MPa", source: SRC, confidence: d.hdtInverted ? "low" : "medium" });
  if (d.hdtInverted) {
    const n = t(
      "Datenblattfehler: Die HDT bei 1,8 MPa (117 °C) liegt ÜBER der HDT bei 0,45 MPa (112 °C). Höhere Last muss zu niedrigerer Temperatur führen - die beiden Werte sind vertauscht oder an unterschiedlichen Chargen gemessen. Beide Werte hier mit niedriger Konfidenz geführt.",
      "Datasheet error: HDT at 1.8 MPa (117 °C) is ABOVE HDT at 0.45 MPa (112 °C). Higher load must give a lower temperature - the values are swapped or measured on different batches. Both are carried here with low confidence.");
    thermal.hdtA.note = n; thermal.hdtB.note = n;
  }
  if (d.vicat != null) thermal.vicatB50 = q(d.vicat, "°C", { std: "ISO 306 (Methode und Last im Datenblatt nicht spezifiziert)", source: SRC, confidence: "low" });
  if (d.tg != null) thermal.glassTransition = q(d.tg, "°C", { std: "DSC, 10 °C/min", source: SRC });
  if (d.tm != null) {
    thermal.meltingTemperature = q(d.tm, "°C", {
      std: "DSC, 10 °C/min", source: SRC,
      confidence: m.polymerClass === "amorphous" ? "low" : "medium",
      note: m.polymerClass === "amorphous"
        ? t("Physikalisch fragwürdig: Der Werkstoff ist amorph und hat keinen echten Schmelzpunkt. Dokumentiert, aber nicht für Bewertungen verwendet.",
            "Physically questionable: the material is amorphous and has no true melting point. Documented but not used for scoring.")
        : undefined,
    });
  }
  // conservative own recommendation
  const base = d.hdtA ?? d.vicat ?? d.tg;
  if (base != null) {
    const rec = Math.round((d.tg != null && m.polymerClass === "amorphous" ? d.tg - 12 : base - 15) / 5) * 5;
    thermal.recommendedMaxServiceTemperature = q(rec, "°C", {
      min: rec - 10, max: rec + 5, source: "estimate_reasoning", confidence: "estimated",
      conditions: "unbelastet, Luft, dauerhaft",
      note: t("Eigene konservative Empfehlung mit Sicherheitsabstand zur Formbeständigkeitsgrenze. Unter mechanischer Last deutlich niedriger ansetzen.",
              "Our own conservative recommendation with margin to the heat deflection limit. Assume markedly lower under mechanical load."),
    });
  }
  if (d.wabs != null) { /* handled in durability */ }
  if (m.notes?.moisture) { /* attached below */ }
  if (d.anneal) {
    thermal.annealing = {
      possible: flag(true, { source: SRC, confidence: "medium" }),
      temperature: q(d.anneal.temp, "°C", { min: d.anneal.min, max: d.anneal.max, source: SRC }),
      duration: q(d.anneal.hours, "h", { min: d.anneal.hMin, max: d.anneal.hMax, source: SRC }),
      note: id === "pla"
        ? t("Bambu empfiehlt 50-60 °C für 6-12 h und warnt ausdrücklich, dass sich Bauteile beim Tempern verziehen können. Bei grossen, dünnwandigen Teilen ist der Verzug meist teurer als der Festigkeitsgewinn.",
            "Bambu recommends 50-60 °C for 6-12 h and explicitly warns that parts may distort during annealing. On large thin-walled parts the distortion usually costs more than the strength gain.")
        : t("Prüfkörper wurden vor der Prüfung getempert und getrocknet; die Datenblattwerte gelten daher für den getemperten Zustand.",
            "Specimens were annealed and dried before testing; the datasheet values therefore apply to the annealed condition."),
    };
    if (id === "pla") thermal.annealing.distortionRisk = rating(4, "distortionRisk", { source: SRC, confidence: "medium" });
  }

  /* processing */
  const processing = {
    nozzleTemperature: q(Math.round((d.nozzle[0] + d.nozzle[1]) / 2), "°C", { min: d.nozzle[0], max: d.nozzle[1], source: SRC }),
    bedTemperature: q(Math.round((d.bed[0] + d.bed[1]) / 2), "°C", { min: d.bed[0], max: d.bed[1], source: SRC }),
    chamberTemperature: q(Math.round((d.chamber[0] + d.chamber[1]) / 2), "°C", { min: d.chamber[0], max: d.chamber[1], source: SRC }),
    chamberRequirement: choice(m.chamber, {
      source: m.chamber === "not-required" ? SRC : "estimate_reasoning",
      confidence: m.chamber === "not-required" ? "medium" : "estimated",
      note: m.chamber === "mandatory"
        ? t("Das Datenblatt nennt 45-60 °C Kammertemperatur. Für kleine Teile geht es notfalls ohne; für grosse Bauteile führt fehlende Kammertemperierung zu Delamination. Für den XXL-Einsatz daher als zwingend eingestuft.",
            "The datasheet states 45-60 °C chamber temperature. Small parts may work without; on large parts a missing heated chamber leads to delamination. Classified as mandatory for XXL use.")
        : m.chamber === "recommended"
        ? t("Ohne temperierte Kammer sind Verzug und Delamination bei grösseren Bauteilen wahrscheinlich.",
            "Without a heated chamber, warping and delamination are likely on larger parts.")
        : t("Keine beheizte Kammer erforderlich - entscheidender Vorteil auf offenen Grossformatanlagen.",
            "No heated chamber required - a decisive advantage on open large-format machines."),
    }),
    dryingTemperature: q(d.dry[0], "°C", { source: SRC }),
    dryingTime: q(d.dry[1], "h", { max: d.dry[2], source: SRC }),
    maxResidualHumidity: q(20, "%RH", { conditions: "Lagerung und Druck, versiegelt mit Trockenmittel", source: SRC }),
    printSpeed: q(d.speed, "mm/s", { max: d.speed, source: SRC,
      note: t("Maschinenabhängige Obergrenze aus dem Datenblatt, keine Materialeigenschaft.",
              "Machine-dependent upper limit from the datasheet, not a material property.") }),
  };
  if (d.overhang != null) processing.maxOverhangAngle = q(d.overhang, "°", { source: SRC });
  if (m.hardenedNozzle) {
    processing.hardenedNozzleRequired = flag(true, { source: SRC, confidence: "high",
      note: t("Kohlenstofffaser weitet Messingdüsen binnen weniger Druckstunden auf. Gehärtete Stahl- oder Rubindüse zwingend.",
              "Carbon fibre widens brass nozzles within a few printing hours. A hardened steel or ruby nozzle is mandatory.") });
    processing.minNozzleDiameter = q(d.minNozzle ?? 0.4, "mm", { min: d.minNozzle ?? 0.4, source: SRC,
      note: d.recNozzle ? t(`Datenblatt empfiehlt ${d.recNozzle} mm.`, `Datasheet recommends ${d.recNozzle} mm.`) : undefined });
  }
  for (const s of ["printability", "warpingTendency", "hygroscopy", "abrasiveness", "stringingTendency"]) {
    if (m.ratings?.[s] != null) processing[s] = rating(m.ratings[s], s);
  }
  processing.layerAdhesion = rating(
    d.tsXY && d.tsZ ? Math.max(1, Math.min(5, Math.round((d.tsZ[0] / d.tsXY[0]) * 5.5))) : 3,
    "layerAdhesion", { source: SRC, confidence: "medium",
      note: t("Bewertung abgeleitet aus dem gemessenen Anisotropiefaktor.", "Rating derived from the measured anisotropy factor.") });

  /* durability */
  const durability = {};
  if (d.wabs != null) durability.waterAbsorption = q(d.wabs, "%", {
    conditions: "Sättigung bei 25 °C und 55 % rF", source: SRC,
    note: m.notes?.moisture,
  });
  for (const s of ["uvResistance", "weatherResistance", "hydrolysisResistance", "yellowingTendency",
                   "stressCrackingSensitivity", "gasBarrier"]) {
    if (m.ratings?.[s] != null) durability[s] = rating(m.ratings[s], s);
  }
  if (m.outdoorYears) durability.outdoorServiceLife = q(m.outdoorYears.value, "a", {
    min: m.outdoorYears.min, max: m.outdoorYears.max, source: "estimate_reasoning", confidence: "estimated",
    conditions: "mitteleuropäische Bewitterung, ungefärbt/unlackiert",
  });
  const cr = [];
  const map = { resistant: "resistant", "not-resistant": "not-resistant", limited: "limited" };
  if (d.acid) cr.push(chem("chem_dilute_acid", map[d.acid], { source: SRC, confidence: "low",
    conditions: "Datenblatt nennt weder Säure noch Konzentration" }));
  if (d.alkali) cr.push(chem("chem_dilute_alkali", map[d.alkali], { source: SRC, confidence: "low",
    conditions: "Datenblatt nennt weder Lauge noch Konzentration" }));
  if (d.oil) {
    cr.push(chem("chem_mineral_oil", map[d.oil], { source: SRC, confidence: "medium" }));
    cr.push(chem("chem_grease", map[d.oil], { source: SRC, confidence: "medium" }));
  }
  cr.push(chem("chem_water", "resistant", { source: SRC, confidence: "medium", conditions: "Raumtemperatur" }));
  cr.push(chem("chem_acetone", m.family === "ABS" || m.family === "ASA" ? "not-resistant" : "limited"));
  cr.push(chem("chem_ipa", "limited"));
  cr.push(chem("chem_coolant_mwf",
    ["PETG", "PET", "PC"].includes(m.family) ? "not-resistant" : "limited",
    ["PETG", "PET", "PC"].includes(m.family)
      ? { note: t("Wassermischbare Kühlschmierstoffe sind alkalisch (pH 9+) und verseifen Polyester und Polycarbonat über die Zeit.",
                  "Water-miscible metalworking fluids are alkaline (pH 9+) and saponify polyesters and polycarbonate over time.") }
      : {}));
  durability.chemicalResistance = cr;

  /* compliance */
  const compliance = {
    foodContact: {
      status: choice("not-declared", { source: SRC, confidence: "medium",
        note: t("Das Datenblatt erklärt keine Lebensmittelkonformität.", "The datasheet declares no food contact compliance.") }),
      partLevelWarning: t(
        "Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen, die sich nicht sicher reinigen lassen.",
        "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches that cannot be reliably cleaned."),
    },
    flameRetardancy: {
      ul94: choice("not-classified", { source: SRC, confidence: "medium",
        note: d.flammability === "self-extinguishing"
          ? t("Das Datenblatt formuliert 'flammable and self-extinguishing in the air'. Das ist KEINE UL94-Einstufung.",
              "The datasheet states 'flammable and self-extinguishing in the air'. That is NOT a UL94 classification.")
          : t("Das Datenblatt nennt den Werkstoff schlicht 'flammable'. Keine Brandschutzeinstufung vorhanden.",
              "The datasheet simply calls the material 'flammable'. No fire classification available.") }),
    },
    printEmissions: {
      concernLevel: choice(m.emissions?.level ?? (m.filler ? "moderate" : "low"), { confidence: "estimated" }),
      extractionRecommended: flag(!!(m.emissions?.level === "high" || m.filler), { confidence: "estimated" }),
      ...(m.emissions?.note ? { note: m.emissions.note }
        : m.filler ? { note: t("Beim Schleifen faserhaltiger Bauteile entsteht kohlenstofffaserhaltiger Feinstaub - Absaugung und FFP2/FFP3 sind Pflicht.",
                               "Sanding fibre-filled parts generates carbon-fibre dust - extraction and FFP2/FFP3 protection are mandatory.") } : {}),
    },
    translucency: choice(m.finishing?.translucency ?? "opaque", { source: SRC, confidence: "medium" }),
  };
  if (m.filler === "carbon-fibre-chopped") {
    compliance.esd = {
      classification: choice("insulating", {
        note: t("Kohlenstofffaser bedeutet NICHT leitfähig: bei üblichen Kurzfaseranteilen bildet sich kein Perkolationsnetzwerk. Wer ESD braucht, braucht ein deklariertes ESD-Compound.",
                "Carbon fibre does NOT mean conductive: at usual chopped-fibre loadings no percolation network forms. Anyone needing ESD needs a declared ESD compound."),
      }),
    };
  }

  /* finishing */
  const finishing = {};
  for (const s of ["surfaceQuality", "layerLineVisibility", "sandability", "fillability",
                   "paintAdhesion", "bondability"]) {
    if (m.ratings?.[s] != null) finishing[s] = rating(m.ratings[s], s);
  }
  if (m.finishing?.primer) finishing.primerRecommendation = m.finishing.primer;
  if (m.finishing?.adhesives) finishing.recommendedAdhesives = m.finishing.adhesives;
  if (m.finishing?.gloss) finishing.gloss = choice(m.finishing.gloss, { confidence: "estimated" });
  if (m.finishing?.colours) finishing.colourAvailability = choice(m.finishing.colours, { confidence: "estimated" });
  finishing.chemicalSmoothing = m.finishing?.smoothing
    ? { suitable: flag(true, { confidence: "estimated" }), medium: m.finishing.smoothing.medium }
    : { suitable: flag(false, { confidence: "estimated" }) };
  finishing.heatSetInserts = flag(m.family !== "TPU", { confidence: "estimated" });

  /* commercial */
  const commercial = {};
  for (const s of ["priceIndex", "availability", "smallSeriesSuitability"]) {
    if (m.ratings?.[s] != null) commercial[s] = rating(m.ratings[s], s);
  }
  commercial.xxl = {
    maxSensibleEdgeMm: q(m.xxl, "mm", {
      min: Math.round(m.xxl * 0.5), max: Math.round(m.xxl * 1.5),
      source: m.xxlConf === "medium" ? "estimate_reasoning" : "estimate_reasoning",
      confidence: "estimated",
      note: m.notes?.xxl ?? t(
        "Geschätzt aus Kammerbedarf, Verzugsneigung und Schichthaftung - nicht durch eigene Fertigung belegt. Muss durch Reents3D-Werkstatterfahrung ersetzt werden.",
        "Estimated from chamber requirement, warping tendency and layer adhesion - not backed by our own production. To be replaced by Reents3D shop-floor experience."),
    }),
    segmentationRecommended: flag(m.xxl < 1500, { confidence: "estimated" }),
  };
  commercial.reentsPortfolioStatus = choice("unknown", {
    note: t("Noch nicht mit dem Reents3D-Materiallager abgeglichen. Geht per ADR-004 NICHT in das Scoring ein.",
            "Not yet reconciled with the Reents3D inventory. Per ADR-004 this does NOT enter scoring."),
  });

  /* sustainability */
  const sustainability = {};
  if (m.sustainability) {
    sustainability.bioBasedContent = q(m.sustainability.bio, "%", { source: "estimate_reasoning", confidence: "estimated" });
    sustainability.industriallyCompostable = flag(m.sustainability.compostable, {
      confidence: "estimated",
      note: m.sustainability.compostable
        ? t("Nur unter industriellen Bedingungen nach EN 13432. Heimkompostierung funktioniert bei PLA praktisch nicht - das Bauteil bleibt jahrelang liegen.",
            "Only under industrial conditions per EN 13432. Home composting practically does not work for PLA - the part stays intact for years.")
        : undefined,
    });
    sustainability.practicalRecyclability = choice(m.sustainability.recycl, { confidence: "estimated" });
  }

  /* open questions */
  const oq = [
    { id: "oq_reents_portfolio", question: t(
        `RÜCKFRAGE AN RIKO: Portfolio-Status von ${m.name} bei Reents3D?`,
        `QUESTION FOR RIKO: portfolio status of ${m.name} at Reents3D?`),
      blocking: true, affectsFields: ["commercial.reentsPortfolioStatus"], assignee: "Riko Reents" },
    { id: "oq_reents_xxl", question: t(
        `RÜCKFRAGE AN RIKO: Bis zu welcher Kantenlänge wurde ${m.name} bei Reents3D prozesssicher gefahren?`,
        `QUESTION FOR RIKO: up to what edge length has ${m.name} been run reliably at Reents3D?`),
      blocking: true, affectsFields: ["commercial.xxl.maxSensibleEdgeMm"], assignee: "Riko Reents" },
    { id: "oq_price_survey", question: t(
        "Preiserhebung über mindestens fünf Anbieter durchführen.",
        "Carry out a price survey across at least five suppliers."),
      blocking: true, affectsFields: ["commercial.priceIndex"] },
    { id: "oq_second_source", question: t(
        "Zweite unabhängige Herstellerquelle ergänzen. Derzeit beruht der gesamte Kennwertsatz auf einem einzigen Datenblatt.",
        "Add a second independent manufacturer source. The entire property set currently rests on a single datasheet."),
      blocking: false, affectsFields: ["mechanics", "thermal"] },
  ];
  if (d.hdtInverted) oq.push({ id: "oq_hdt_inverted", question: t(
      "Bambu meldet HDT bei 1,8 MPa höher als bei 0,45 MPa. Beim Hersteller klären oder durch eine zweite Quelle ersetzen.",
      "Bambu reports HDT at 1.8 MPa higher than at 0.45 MPa. Clarify with the manufacturer or replace with a second source."),
    blocking: false, affectsFields: ["thermal.hdtA", "thermal.hdtB"] });
  if (d.imXY && d.imZ && d.imZ[0] > d.imXY[0]) oq.push({ id: "oq_impact_inverted", question: t(
      "Das Datenblatt weist in Z eine höhere Schlagzähigkeit aus als in X-Y. Kerbzustand der Z-Prüfkörper klären.",
      "The datasheet reports higher impact strength in Z than in X-Y. Clarify the notch condition of the Z specimens."),
    blocking: false, affectsFields: ["mechanics.charpyUnnotchedZ", "mechanics.anisotropyFactorImpact"] });
  if (d.anomaly) oq.push({ id: "oq_specimen_conditions", question: d.anomaly, blocking: false,
    affectsFields: ["mechanics"] });

  const record = {
    $schema: "../../schema/material.schema.json",
    schemaVersion: "1.0.0",
    id,
    identity: {
      name: m.name, family: m.family, polymerClass: m.polymerClass, variant: m.variant,
      ...(m.filler ? { filler: { type: m.filler } } : {}),
      aliases: m.aliases,
      trademarkNotice: t(
        "Genannte Handels- und Markennamen sind Marken der jeweiligen Inhaber und dienen ausschliesslich der Quellenangabe.",
        "Trade and brand names mentioned are trademarks of their respective owners and serve source attribution only."),
      abstract: m.abstract, positioning: m.positioning,
      ...(m.confusion ? { notToBeConfusedWith: m.confusion.map((c) => ({ materialId: c.id, reason: c.why })) } : {}),
    },
    mechanics: mech, thermal, processing, durability, compliance, sustainability, finishing, commercial,
    governance: {
      lastReviewed: REVIEWED, reviewedBy: REVIEWER, reviewCycleMonths: 12, dataCompleteness: null,
      sources: [
        { id: "src_bambu_tds", type: "manufacturer-tds", publisher: "Bambu Lab",
          productName: d.doc.product, title: `Bambu Filament Technical Data Sheet - ${m.name}`,
          documentVersion: d.doc.v, url: d.doc.url, retrievedAt: REVIEWED, confidenceCeiling: "high",
          note: t(
            "Prüfkörper sind GEDRUCKT, nicht spritzgegossen, und mit X-Y- und Z-Werten ausgewiesen. Das macht die Werte für FDM-Auslegung brauchbar und über alle Bambu-Materialien vergleichbar - anders als Rohstoff-Datenblätter.",
            "Specimens are PRINTED, not injection moulded, and reported with both X-Y and Z values. That makes the figures usable for FDM design and comparable across all Bambu materials - unlike resin datasheets."),
        },
        { id: "estimate_reasoning", type: "estimate", publisher: "FDM-Materialberater",
          title: "Fachliche Ableitung ohne Primärquelle", confidenceCeiling: "estimated" },
      ],
      openQuestions: oq,
    },
  };
  return record;
}

/* ------------------------------------------------------------------ generate */

mkdirSync(OUT, { recursive: true });
let n = 0;
for (const [id, d] of Object.entries(TDS)) {
  const m = META[id];
  if (!m) throw new Error(`missing META for ${id}`);
  const rec = buildMaterial(id, d, m);
  writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(rec, null, 2) + "\n");
  console.log(`wrote data/materials/${id}.json`);
  n++;
}
console.log(`\n${n} Datensätze aus Bambu-Lab-Datenblättern erzeugt.`);
