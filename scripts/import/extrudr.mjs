/**
 * Import: Extrudr (FD3D GmbH, Österreich).
 *
 * Zwei Ausgaben:
 *  1) PRODUKTE unter den generischen Werkstofftypen. "DuraPro ASA" ist Extrudrs eigene
 *     Rezeptur von ASA, nicht ein eigener Werkstoff - also materialId "asa". Genau so
 *     wird sichtbar, wo eine Marke gegenüber dem Feld gewinnt (DuraPro ASA: 62 MPa
 *     gegen 37 MPa bei Bambu ASA).
 *  2) NEUE WERKSTOFFTYPEN dort, wo es bisher gar keinen gab: PC-FR (UL94 V-0),
 *     TPU-ESD (leitfähig), PA12, GreenTEC (Biopolymer). Ohne diese Typen kann die
 *     Engine Brandschutz- und ESD-Anforderungen gar nicht bedienen.
 *
 * PRÜFBEDINGUNG, die Extrudr in einer Fussnote versteckt:
 *   "Temperaturresistenz geprüft bei Wanddicke von mindestens 4 mm."
 * Alle VICAT- und HDT-Werte tragen das deshalb in `conditions`. Bei dünnwandigen
 * Bauteilen sind die Zahlen nicht erreichbar.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-01";
const TDS = "https://s3.extrudr.com/extrudr-media/datasheets/tds/tds-de";
const WALL = "Temperaturbeständigkeit laut Datenblatt-Fussnote nur bei Wanddicke ab 4 mm geprüft";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.tol != null ? { tolerance: o.tol } : {}),
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: o.source ?? "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});
const rating = (value, scale, o = {}) => ({
  value, scale, source: o.source ?? "estimate_reasoning",
  confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}),
});
const flag = (value, o = {}) => ({
  value, source: o.source ?? "estimate_reasoning",
  confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}),
});
const choice = (value, o = {}) => ({
  value, source: o.source ?? "estimate_reasoning",
  confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}),
});

/* ============================================================== PRODUKTE ==== */

const P = [
  { file: "pla-nx2-matt", material: "pla", name: "Extrudr PLA NX2 Matt",
    props: { tensileStrengthXy: q(47, "MPa", { std: "ISO 527" }), tensileModulusXy: q(2600, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(19, "%", { std: "ISO 527-2 (nominell)" }), flexuralModulusXy: q(2650, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: q(7, "kJ/m²", { std: "ISO 179/1eA" }), vicatA: q(60, "°C", { std: "ISO 306", conditions: WALL }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    features: t("Matte Oberfläche, CO2-neutral, verbesserte UV-Beständigkeit. FDA, RoHS und Spielzeugsicherheit. Kein geschlossener Bauraum, keine gehärtete Düse.",
                "Matte surface, CO2-neutral, improved UV resistance. FDA, RoHS and toy safety. No enclosure, no hardened nozzle.") },

  { file: "petg", material: "petg", name: "Extrudr PETG",
    props: { tensileStrengthXy: q(61, "MPa", { std: "ISO 527" }), tensileModulusXy: q(3100, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(28, "%", { std: "ISO 527-2 (nominell)" }), flexuralStrengthXy: q(68, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(2100, "MPa", { std: "ISO 178" }), charpyNotchedXy: q(4.7, "kJ/m²", { std: "ISO 180" }),
      vicatA: q(78, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.29, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }), bedTemperature: q(75, "°C", { min: 60, max: 90 }) },
    ul94: "V-2", ul94Thickness: 3.2,
    features: t("UL94 V-2 bei 3,2 mm — eine der wenigen Brandschutz-Einstufungen unter Standard-Filamenten. Keine gehärtete Düse nötig.",
                "UL94 V-2 at 3.2 mm — one of the few fire classifications among standard filaments. No hardened nozzle required.") },

  { file: "greentec", material: "greentec", name: "Extrudr GreenTEC",
    props: { tensileStrengthXy: q(46, "MPa", { std: "ISO 527" }), tensileModulusXy: q(3200, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(14, "%", { std: "ISO 527-2 (nominell)" }),
      charpyNotchedXy: q(19, "kJ/m²", { std: "ISO 179/1eA" }), charpyUnnotchedXy: q(218, "kJ/m²", { std: "ISO 179/1eU" }),
      vicatA: q(115, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.3, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }), bedTemperature: q(55, "°C", { min: 20, max: 90 }) } },

  { file: "greentec-pro", material: "greentec", name: "Extrudr GreenTEC Pro",
    props: { tensileStrengthXy: q(58, "MPa", { std: "ISO 527" }), tensileModulusXy: q(4300, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(2.8, "%", { std: "ISO 527" }), charpyNotchedXy: q(4, "kJ/m²", { std: "ISO 179/1eA" }),
      charpyUnnotchedXy: q(71, "kJ/m²", { std: "ISO 179/1eU" }), vicatA: q(160, "°C", { std: "ISO 306", conditions: WALL }),
      hdtB: q(115, "°C", { std: "ISO 75", conditions: WALL }), density: q(1.35, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }), bedTemperature: q(55, "°C", { min: 20, max: 90 }) },
    features: t("Bemerkenswert: 115 °C HDT/B ohne geschlossenen Bauraum und ohne gehärtete Düse. Damit erreicht ein Biopolymer eine Temperaturbeständigkeit, für die sonst PC mit beheizter Kammer nötig wäre — allerdings nur ab 4 mm Wanddicke geprüft.",
                "Notable: 115 °C HDT/B without an enclosure and without a hardened nozzle. A biopolymer reaching temperature resistance that otherwise requires PC with a heated chamber — but only verified from 4 mm wall thickness.") },

  { file: "durapro-asa", material: "asa", name: "Extrudr DuraPro ASA",
    props: { tensileStrengthXy: q(62.2, "MPa", { tol: 3, std: "ASTM D638" }), tensileModulusXy: q(2200, "MPa", { std: "ASTM D638" }),
      elongationAtBreakXy: q(20, "%", { std: "ASTM D638 (nominell)" }), flexuralStrengthXy: q(78, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(3500, "MPa", { tol: 200, std: "ASTM D790" }), charpyNotchedXy: q(140, "kJ/m²", { std: "ASTM D256, 23 °C" }),
      hdtB: q(96, "°C", { std: "ASTM D648", conditions: WALL }), vicatA: q(96, "°C", { std: "ASTM D1525", conditions: WALL }),
      density: q(1.05, "g/cm³", { std: "ASTM D792" }), nozzleTemperature: q(245, "°C", { min: 220, max: 270 }),
      bedTemperature: q(105, "°C", { min: 100, max: 110 }) },
    ul94: "HB",
    features: t("Deutlich fester als das ASA im Feld: 62 MPa gegen 37 MPa bei Bambu ASA und 42 MPa bei Prusament ASA. Achtung, andere Prüfnorm (ASTM D638 statt ISO 527) — die Werte sind nicht 1:1 vergleichbar, der Abstand ist aber zu gross, um allein daher zu kommen.",
                "Markedly stronger than the ASA in this field: 62 MPa against 37 MPa for Bambu ASA and 42 MPa for Prusament ASA. Note the different standard (ASTM D638 rather than ISO 527) — values are not directly comparable, but the gap is too large to come from that alone.") },

  { file: "durapro-abs", material: "abs", name: "Extrudr DuraPro ABS",
    props: { tensileStrengthXy: q(49, "MPa", { std: "ASTM D638" }), tensileModulusXy: q(2350, "MPa", { std: "ASTM D638" }),
      elongationAtBreakXy: q(10, "%", { std: "ASTM D638 (nominell)" }), flexuralStrengthXy: q(78, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(2550, "MPa", { std: "ASTM D790" }), charpyNotchedXy: q(220, "kJ/m²", { std: "ASTM D256, 23 °C" }),
      hdtB: q(85, "°C", { std: "ASTM D648", conditions: WALL }), density: q(1.06, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }), bedTemperature: q(105, "°C", { min: 100, max: 110 }) },
    ul94: "HB" },

  { file: "durapro-pa12", material: "pa12", name: "Extrudr DuraPro PA12",
    props: { tensileStrengthXy: q(43, "MPa", { std: "ISO 527-2" }), elongationAtBreakXy: q(50, "%", { std: "ISO 527-2 (nominell, > 50)" }),
      vicatB50: q(142, "°C", { std: "ISO 306/B50", conditions: WALL }), density: q(1.01, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }), bedTemperature: q(110, "°C") },
    ul94: "HB" },

  { file: "durapro-pa6-cf", material: "pa6-cf", name: "Extrudr DuraPro PA6-CF",
    props: { elongationAtBreakXy: q(4, "%", { std: "ISO 527-2 (nominell)" }), density: q(1.15, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(285, "°C", { min: 270, max: 300 }), bedTemperature: q(90, "°C", { min: 80, max: 100 }) } },

  { file: "durapro-pc-fr-v0", material: "pc-fr", name: "Extrudr DuraPro PC-FR V0",
    props: { tensileStrengthXy: q(53, "MPa", { std: "ISO 527-1,-2 (Bruchspannung)" }),
      elongationAtBreakXy: q(50, "%", { std: "ISO 527-1,-2 (nominell, > 50)" }),
      izodNotchedXy: q(40, "kJ/m²", { std: "ISO 180/A, 23 °C" }),
      vicatB50: q(115, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.19, "g/cm³", { std: "ISO 1183-1" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }), bedTemperature: q(110, "°C") },
    ul94: "V-0", ul94Thickness: 1.5,
    features: t("Der einzige Werkstoff in dieser Datenbank mit echtem Brandschutzzeugnis: UL94 V-0 bei 1,5 mm, 5VB bei 2,0 mm, 5VA bei 3,0 mm — zusätzlich bahnzertifiziert nach EN 45545-2 HL3 (R22, R23, R24). Kerbschlagzähigkeit 40 kJ/m² bei 23 °C und noch 10 kJ/m² bei −30 °C. Braucht geschlossenen Bauraum.",
                "The only material in this database with a genuine fire certificate: UL94 V-0 at 1.5 mm, 5VB at 2.0 mm, 5VA at 3.0 mm — plus rail certification to EN 45545-2 HL3 (R22, R23, R24). Notched impact 40 kJ/m² at 23 °C and still 10 kJ/m² at −30 °C. Requires an enclosure.") },

  { file: "flex-medium-esd", material: "tpu-esd", name: "Extrudr Flex Medium ESD",
    props: { tensileStrengthXy: q(40, "MPa", { std: "DIN 53.504" }), elongationAtBreakXy: q(430, "%", { std: "DIN 53.504" }),
      density: q(1.2, "g/cm³", { std: "DIN 53.479" }), hardnessShoreA: q(95, "Shore A", { std: "DIN 53.505" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }), bedTemperature: q(50, "°C") },
    features: t("Echter ESD-Schutz statt Kohlenstofffaser-Mythos: 0,7–0,9 MΩ Oberflächenwiderstand, Einstufung ESD-C leitfähig. Zusätzlich beständig gegen Öle, Benzine, Ester, Ketone und Chlorkohlenwasserstoffe sowie UV-beständig. Druckt langsam (max. 50 mm/s), braucht aber weder Kammer noch gehärtete Düse.",
                "Genuine ESD protection rather than the carbon-fibre myth: 0.7–0.9 MΩ surface resistance, classified ESD-C conductive. Also resistant to oils, petrol, esters, ketones and chlorinated hydrocarbons, and UV stable. Prints slowly (max 50 mm/s) but needs neither enclosure nor hardened nozzle.") },
];

/* =========================================================== NEUE TYPEN ==== */
/* Nur dort, wo es bisher gar keinen generischen Werkstofftyp gab. */

const NEW_MATERIALS = {
  "pc-fr": {
    name: "PC-FR", family: "PC", polymerClass: "amorphous", variant: ["FR"],
    aliases: ["PC flammhemmend", "Flame Retardant Polycarbonate", "PC V-0", "DuraPro PC-FR"],
    abstract: t("PC-FR ist flammgeschütztes Polycarbonat und der einzige Werkstoff dieser Datenbank mit echtem Brandschutzzeugnis: UL94 V-0 bei 1,5 mm und EN 45545-2 HL3 für den Schienenfahrzeugbau. Für Elektronikgehäuse, Bahn- und Schaltschrankanwendungen. Grenzen: teuer, braucht eine beheizte Kammer und muss trocken verarbeitet werden.",
                "PC-FR is flame-retardant polycarbonate and the only material in this database with a genuine fire certificate: UL94 V-0 at 1.5 mm and EN 45545-2 HL3 for rail vehicles. For electronics enclosures, rail and switchgear applications. Limits: expensive, needs a heated chamber and must be processed dry."),
    positioning: t("Wenn ein Prüfzeugnis gefordert ist und nicht nur ein gutes Gefühl.",
                   "When a test certificate is required, not just a good feeling."),
    tensile: 53, modulus: 2300, elong: 50, izod: 40, vicat: 115, hdtA: 108, hdtB: 118, density: 1.19,
    nozzle: [260, 290], bed: [105, 115], chamber: "mandatory", dry: [90, 8],
    ul94: "V-0", ul94Thickness: 1.5, en45545: "HL3",
    ratings: { printability: 2, warpingTendency: 4, hygroscopy: 5, abrasiveness: 1, toughness: 4,
      notchSensitivity: 3, uvResistance: 2, weatherResistance: 2, surfaceQuality: 3, paintAdhesion: 3,
      bondability: 4, priceIndex: 5, availability: 2, smallSeriesSuitability: 3 },
  },
  "tpu-esd": {
    name: "TPU-ESD", family: "TPU", polymerClass: "elastomer", variant: ["flexible", "ESD", "conductive"],
    aliases: ["ESD-TPU", "leitfähiges TPU", "Flex ESD", "TPU antistatisch"],
    abstract: t("TPU-ESD ist gummielastisches TPU mit echtem elektrostatischem Schutz: 0,7–0,9 MΩ Oberflächenwiderstand, Einstufung ESD-C leitfähig. Für Griffe, Auflagen und Handhabungsteile in der Elektronikfertigung und im Automobil-Innenraum. Grenzen: kein Konstruktionswerkstoff, keine sinnvolle Wärmeformbeständigkeit, druckt langsam.",
                "TPU-ESD is rubber-elastic TPU with genuine electrostatic protection: 0.7–0.9 MΩ surface resistance, classified ESD-C conductive. For grips, pads and handling parts in electronics manufacturing and automotive interiors. Limits: not a structural material, no meaningful heat resistance, prints slowly."),
    positioning: t("Der Werkstoff, wenn es nachgeben UND ableiten muss.",
                   "The material when it has to give way AND dissipate."),
    tensile: 40, elong: 430, density: 1.2, shoreA: 95,
    nozzle: [220, 250], bed: [45, 55], chamber: "not-required", dry: [60, 6],
    esd: "conductive", esdOhm: 800000,
    ratings: { printability: 2, warpingTendency: 1, hygroscopy: 4, abrasiveness: 1, stringingTendency: 5,
      toughness: 5, wearResistance: 5, fatigueResistance: 5, uvResistance: 4, weatherResistance: 4,
      hydrolysisResistance: 3, surfaceQuality: 3, paintAdhesion: 1, bondability: 3,
      priceIndex: 5, availability: 2, smallSeriesSuitability: 2 },
  },
  "pa12": {
    name: "PA12", family: "PA", polymerClass: "semi-crystalline", variant: ["basic"],
    aliases: ["Polyamid 12", "Nylon 12", "PA 12"],
    abstract: t("PA12 ist das zähste und feuchteunempfindlichste der gängigen Polyamide: über 50 % Bruchdehnung, Vicat 142 °C und deutlich geringere Wasseraufnahme als PA6. Für Funktionsteile, Schnappverbindungen und Gleitelemente. Grenzen: geringere Festigkeit und Steifigkeit als faserverstärkte Typen, braucht Kammer und Trocknung.",
                "PA12 is the toughest and least moisture-sensitive of the common polyamides: over 50 % elongation at break, Vicat 142 °C and markedly lower water uptake than PA6. For functional parts, snap fits and sliding elements. Limits: lower strength and stiffness than fibre-filled grades, needs a chamber and drying."),
    positioning: t("Zäh statt steif — und deutlich gutmütiger bei Feuchte als PA6.",
                   "Tough rather than stiff — and far more forgiving about moisture than PA6."),
    tensile: 43, elong: 50, vicat: 142, density: 1.01,
    nozzle: [260, 290], bed: [105, 115], chamber: "mandatory", dry: [80, 8],
    ul94: "HB",
    ratings: { printability: 2, warpingTendency: 3, hygroscopy: 4, abrasiveness: 1, toughness: 5,
      creepTendency: 3, notchSensitivity: 1, wearResistance: 5, uvResistance: 2, weatherResistance: 3,
      hydrolysisResistance: 4, surfaceQuality: 3, paintAdhesion: 1, bondability: 2,
      priceIndex: 4, availability: 3, smallSeriesSuitability: 3 },
  },
  "greentec": {
    name: "GreenTEC", family: "PHA", polymerClass: "semi-crystalline", variant: ["bio-blend", "high-temp"],
    aliases: ["GreenTEC Pro", "Biopolymer-Compound", "Hochtemperatur-Biopolymer"],
    abstract: t("GreenTEC ist ein Biopolymer-Compound, das ohne beheizte Kammer und ohne gehärtete Düse bis 115 °C HDT/B kommt — eine Temperaturbeständigkeit, für die sonst PC mit Kammer nötig wäre. Für Gehäuse und Funktionsteile mit moderater Wärmebelastung. Grenzen: spröde (2,8 % Bruchdehnung bei der Pro-Variante), und die Temperaturwerte sind erst ab 4 mm Wanddicke geprüft.",
                "GreenTEC is a biopolymer compound reaching 115 °C HDT/B without a heated chamber and without a hardened nozzle — heat resistance that otherwise requires PC with an enclosure. For housings and functional parts under moderate heat. Limits: brittle (2.8 % elongation in the Pro grade), and the temperature values are only verified from 4 mm wall thickness."),
    positioning: t("Temperaturbeständigkeit ohne Kammer — der bequemste Weg über die 100-°C-Marke.",
                   "Heat resistance without an enclosure — the most convenient way past the 100 °C mark."),
    tensile: 58, modulus: 4300, elong: 2.8, izod: 4, vicat: 160, hdtB: 115, density: 1.35,
    nozzle: [210, 230], bed: [20, 90], chamber: "not-required", dry: [60, 6],
    ratings: { printability: 4, warpingTendency: 2, hygroscopy: 3, abrasiveness: 2, toughness: 2,
      notchSensitivity: 4, uvResistance: 3, weatherResistance: 3, surfaceQuality: 4, paintAdhesion: 3,
      bondability: 3, priceIndex: 4, availability: 3, smallSeriesSuitability: 3 },
    bio: 100,
  },
};

/* ============================================================== schreiben === */

const SRC_ID = "src_extrudr_tds";
const outP = path.join(ROOT, "data/products");
const outM = path.join(ROOT, "data/materials");
mkdirSync(outP, { recursive: true });

const src = (name, file) => ({
  id: SRC_ID, type: "manufacturer-tds", publisher: "FD3D GmbH (Extrudr)",
  productName: name, title: `${name} — Technisches Datenblatt (DE)`,
  url: `${TDS}/${file}-TDS-de.pdf`, retrievedAt: RETRIEVED, confidenceCeiling: "high",
  note: t("Herstellerdatenblatt. Das Ceiling steht auf 'high', weil ZERTIFIZIERUNGEN (UL94, EN 45545) entweder erteilt sind oder nicht - da gibt es keine Prüfkörper-Mehrdeutigkeit. Die MECHANISCHEN Werte tragen dagegen einzeln nur 'medium', weil Extrudr nicht deklariert, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde. Temperaturwerte gelten laut Fussnote erst ab 4 mm Wanddicke.",
          "Manufacturer datasheet. The ceiling is 'high' because CERTIFICATIONS (UL94, EN 45545) are either granted or not - no specimen ambiguity applies. The MECHANICAL values individually carry only 'medium' because Extrudr does not declare whether they were measured on printed or moulded specimens. Temperature values apply only from 4 mm wall thickness per the footnote."),
});

let np = 0;
for (const p of P) {
  const props = Object.fromEntries(Object.entries(p.props).map(([k, v]) => [k, { ...v, source: "src_tds" }]));
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: `extrudr-${p.file}`, materialId: p.material,
    brand: "Extrudr", manufacturer: "FD3D GmbH (Extrudr)", productName: p.name, origin: "Österreich",
    specimenType: "undeclared",
    specimenNote: t("Extrudr deklariert nicht, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde. Nominelle Bruchdehnungen über 10 % deuten auf Rohstoffwerte hin. Temperaturwerte laut Fussnote erst ab 4 mm Wanddicke geprüft.",
                    "Extrudr does not declare whether values were measured on printed or moulded specimens. Nominal elongations above 10 % suggest raw-material values. Temperature values verified only from 4 mm wall thickness per the footnote."),
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technisches Datenblatt (DE)`, url: `${TDS}/${p.file}-TDS-de.pdf`, retrievedAt: RETRIEVED },
    productUrl: "https://www.extrudr.com/de/shop-eu/page/datasheets/",
    properties: props,
    governance: { lastReviewed: RETRIEVED, reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)", sources: [{ ...src(p.name, p.file), id: "src_tds" }] },
  };
  writeFileSync(path.join(outP, `${rec.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  np++;
}
console.log(`${np} Extrudr-Produkte geschrieben`);

let nm = 0;
for (const [id, m] of Object.entries(NEW_MATERIALS)) {
  const mech = {};
  if (m.density) mech.density = q(m.density, "g/cm³", { std: "ISO 1183", source: SRC_ID });
  if (m.tensile) mech.tensileStrengthXy = q(m.tensile, "MPa", { std: "ISO 527 bzw. ASTM D638", orientation: "n/a", source: SRC_ID });
  if (m.modulus) mech.tensileModulusXy = q(m.modulus, "MPa", { std: "ISO 527", orientation: "n/a", source: SRC_ID });
  if (m.elong) mech.elongationAtBreakXy = q(m.elong, "%", { std: "ISO 527 (nominell)", orientation: "n/a", source: SRC_ID });
  if (m.izod) mech.izodNotchedXy = q(m.izod, "kJ/m²", { std: "ISO 180/A", orientation: "n/a", source: SRC_ID });
  if (m.shoreA) mech.hardnessShoreD = q(Math.round(m.shoreA * 0.55), "Shore D", { source: "estimate_reasoning", confidence: "estimated",
    note: t(`Umgerechnet aus Shore A ${m.shoreA} — Shore D ist bei sehr weichen Elastomeren nur eine grobe Näherung.`,
            `Converted from Shore A ${m.shoreA} — Shore D is only a rough approximation for very soft elastomers.`) });
  for (const [s, v] of Object.entries(m.ratings ?? {})) {
    if (["toughness", "creepTendency", "notchSensitivity", "wearResistance", "fatigueResistance"].includes(s)) mech[s] = rating(v, s);
  }

  const thermal = {};
  if (m.hdtA) thermal.hdtA = q(m.hdtA, "°C", { std: "ISO 75, 1.8 MPa", source: "estimate_reasoning", confidence: "estimated",
    note: t("Datenblatt nennt nur Vicat bzw. HDT/B; HDT-A fachlich abgeleitet.", "Datasheet gives only Vicat or HDT/B; HDT-A inferred.") });
  if (m.hdtB) thermal.hdtB = q(m.hdtB, "°C", { std: "ISO 75, 0.45 MPa", conditions: WALL, source: SRC_ID });
  if (m.vicat) thermal.vicatB50 = q(m.vicat, "°C", { std: "ISO 306", conditions: WALL, source: SRC_ID });
  const base = m.hdtB ?? m.vicat;
  if (base) thermal.recommendedMaxServiceTemperature = q(Math.round((base - 25) / 5) * 5, "°C", {
    conditions: "unbelastet, Luft, dauerhaft", source: "estimate_reasoning", confidence: "estimated",
    note: t("Eigene konservative Empfehlung mit Abstand zur Erweichungsgrenze.", "Our own conservative recommendation with margin to the softening limit.") });

  const processing = {
    nozzleTemperature: q(Math.round((m.nozzle[0] + m.nozzle[1]) / 2), "°C", { min: m.nozzle[0], max: m.nozzle[1], source: SRC_ID }),
    bedTemperature: q(Math.round((m.bed[0] + m.bed[1]) / 2), "°C", { min: m.bed[0], max: m.bed[1], source: SRC_ID }),
    chamberRequirement: choice(m.chamber, { source: SRC_ID, confidence: "medium" }),
    dryingTemperature: q(m.dry[0], "°C", { source: "estimate_reasoning", confidence: "estimated" }),
    dryingTime: q(m.dry[1], "h", { source: "estimate_reasoning", confidence: "estimated" }),
  };
  for (const s of ["printability", "warpingTendency", "hygroscopy", "abrasiveness", "stringingTendency"]) {
    if (m.ratings?.[s] != null) processing[s] = rating(m.ratings[s], s);
  }

  const durability = {};
  for (const s of ["uvResistance", "weatherResistance", "hydrolysisResistance"]) {
    if (m.ratings?.[s] != null) durability[s] = rating(m.ratings[s], s);
  }
  durability.chemicalResistance = [
    { chemicalId: "chem_water", rating: "resistant", source: "estimate_reasoning", confidence: "estimated" },
    { chemicalId: "chem_mineral_oil", rating: id === "tpu-esd" ? "resistant" : "limited", source: id === "tpu-esd" ? SRC_ID : "estimate_reasoning", confidence: id === "tpu-esd" ? "medium" : "estimated" },
  ];

  const compliance = {
    foodContact: {
      status: choice("not-declared", { source: SRC_ID, confidence: "medium" }),
      partLevelWarning: t("Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen.",
                          "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches."),
    },
    flameRetardancy: {
      ul94: choice(m.ul94 ?? "not-classified", { source: m.ul94 ? SRC_ID : "estimate_reasoning", confidence: m.ul94 ? "high" : "estimated",
        note: m.ul94 === "V-0" ? t("Geprüft und zertifiziert: V-0 bei 1,5 mm, 5VB bei 2,0 mm, 5VA bei 3,0 mm.",
                                   "Tested and certified: V-0 at 1.5 mm, 5VB at 2.0 mm, 5VA at 3.0 mm.") : undefined }),
      ...(m.ul94Thickness ? { ul94ThicknessMm: q(m.ul94Thickness, "mm", { source: SRC_ID, confidence: "high" }) } : {}),
      ...(m.en45545 ? { en45545: choice(m.en45545, { source: SRC_ID, confidence: "high",
        note: t("Bahnzertifiziert nach EN 45545-2 HL3 für die Anforderungen R22, R23 und R24 bei 1,5 bis 3 mm.",
                "Rail certified to EN 45545-2 HL3 for requirements R22, R23 and R24 at 1.5 to 3 mm.") }) } : {}),
    },
    ...(m.esd ? { esd: {
      classification: choice(m.esd, { source: SRC_ID, confidence: "high",
        note: t("Herstellerangabe 0,7–0,9 MΩ Oberflächenwiderstand, Einstufung ESD-C leitfähig.",
                "Manufacturer states 0.7–0.9 MΩ surface resistance, classified ESD-C conductive.") }),
      surfaceResistivity: q(m.esdOhm, "Ω/sq", { source: SRC_ID, confidence: "medium" }),
    } } : {}),
    printEmissions: {
      concernLevel: choice(m.chamber === "mandatory" ? "moderate" : "low", { confidence: "estimated" }),
      extractionRecommended: flag(m.chamber === "mandatory", { confidence: "estimated" }),
    },
    translucency: choice("opaque", { source: SRC_ID, confidence: "medium" }),
  };

  const finishing = {};
  for (const s of ["surfaceQuality", "paintAdhesion", "bondability"]) {
    if (m.ratings?.[s] != null) finishing[s] = rating(m.ratings[s], s);
  }
  finishing.chemicalSmoothing = { suitable: flag(false, { confidence: "estimated" }) };

  const commercial = {};
  for (const s of ["priceIndex", "availability", "smallSeriesSuitability"]) {
    if (m.ratings?.[s] != null) commercial[s] = rating(m.ratings[s], s);
  }
  commercial.xxl = {
    maxSensibleEdgeMm: q(m.chamber === "mandatory" ? 400 : 900, "mm", {
      min: 200, max: m.chamber === "mandatory" ? 800 : 1800, source: "estimate_reasoning", confidence: "estimated",
      note: t("Geschätzt aus Kammerbedarf und Verzugsneigung, nicht durch eigene Fertigung belegt.",
              "Estimated from chamber requirement and warping tendency, not backed by our own production.") }),
    segmentationRecommended: flag(true, { confidence: "estimated" }),
  };
  commercial.reentsPortfolioStatus = choice("unknown", { confidence: "estimated" });

  const sustainability = {};
  if (m.bio != null) sustainability.bioBasedContent = q(m.bio, "%", { source: SRC_ID, confidence: "medium" });

  const rec = {
    $schema: "../../schema/material.schema.json", schemaVersion: "1.0.0", id,
    identity: {
      name: m.name, family: m.family, polymerClass: m.polymerClass, variant: m.variant,
      aliases: m.aliases,
      trademarkNotice: t("DuraPro, GreenTEC und Flex sind Produktbezeichnungen der FD3D GmbH (Extrudr).",
                         "DuraPro, GreenTEC and Flex are product designations of FD3D GmbH (Extrudr)."),
      abstract: m.abstract, positioning: m.positioning,
    },
    mechanics: mech, thermal, processing, durability, compliance,
    ...(Object.keys(sustainability).length ? { sustainability } : {}),
    finishing, commercial,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt) - fachliche Freigabe ausstehend",
      reviewCycleMonths: 12, dataCompleteness: null,
      sources: [
        src(m.name, Object.values(P).find((p) => p.material === id)?.file ?? id),
        { id: "estimate_reasoning", type: "estimate", publisher: "FDM-Materialberater",
          title: "Fachliche Ableitung ohne Primärquelle", confidenceCeiling: "estimated" },
      ],
      openQuestions: [
        { id: "oq_specimen_type", question: t("Extrudr deklariert den Prüfkörpertyp nicht. Beim Hersteller erfragen, ob gedruckt oder spritzgegossen gemessen wurde.",
            "Extrudr does not declare the specimen type. Ask the manufacturer whether values were measured printed or moulded."),
          blocking: false, affectsFields: ["mechanics"] },
        { id: "oq_second_source", question: t("Zweite unabhängige Herstellerquelle für diesen Werkstofftyp ergänzen.",
            "Add a second independent manufacturer source for this material type."),
          blocking: false, affectsFields: ["mechanics", "thermal"] },
      ],
    },
  };
  writeFileSync(path.join(outM, `${id}.json`), JSON.stringify(rec, null, 2) + "\n");
  console.log(`  Werkstofftyp ${id}`);
  nm++;
}
console.log(`\n${np} Produkte, ${nm} neue Werkstofftypen.`);
