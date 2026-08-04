/**
 * Import: SUNLU (SUNLU Group, Shenzhen) — Eigenmarken.
 *
 * Quelle: zehn Herstellerdatenblätter, vom Betreiber bereitgestellt. Der Import liest
 * Textauszüge aus data/_sources/sunlu-tds/ — lokaler Arbeitsplatz, nicht Teil des
 * Repositorys (ADR-034). Zu diesen PDFs gibt es keine öffentliche Adresse; sie werden
 * nicht weitergegeben und sind auf Anfrage einsehbar. Die daraus gewonnenen Kennwerte
 * stehen vollständig und mit Quellenangabe in den Produktdatensätzen.
 *
 * ZWEI BLATTFAMILIEN, ZWEI AUSSAGEKRAFTEN
 *
 * A · Die ASTM-Reihe (PLA+, High Speed PLA, PLA Matte, PETG, ABS, ASA, TPU; Stand
 *     2024-01-26) nennt keine Orientierung und führt eine Zeile "Mold Shrinkage nach
 *     ASTM D955" — das ist ein Spritzgussversuch. Zusammen mit Werten wie 20,3 %
 *     Bruchdehnung bei PLA sind das mit hoher Wahrscheinlichkeit Rohstoffkennwerte.
 *     Das Blatt sagt es aber nicht, also bleibt specimenType "undeclared" und der
 *     Befund steht am Produkt. Behauptet wird nur, was dasteht.
 *
 * B · Die ISO-Reihe (PC-ABS, PA6-CF) ist etwas ganz anderes: Sie beschriftet jede
 *     mechanische Zeile mit (X-Y) beziehungsweise (Z-X), und auf der zweiten Seite
 *     zeigt sie Zeichnungen der Prüfkörper mit eingetragener Z-Achse und sichtbaren
 *     Schichten. Damit ist der Prüfkörper deklariert: gedruckt. SUNLU steht mit diesen
 *     beiden Blättern neben Bambu Lab und Prusa Polymers — und liefert beim PA6-CF
 *     sogar Schlagzähigkeit in beiden Richtungen, woraus sich ein Anisotropiefaktor
 *     ergibt.
 *
 * ZU "EASY PA": Das Blatt sagt nicht, welches Polyamid es ist, und Schmelzpunkt (198 °C)
 * wie Dichte (1,08 g/cm³) passen zu keinem Typ sauber — beides deutet auf ein
 * PA6/66-Copolymer. Das Produkt ist dem 2026-08-02 angelegten Typ PA6 zugeordnet, weil
 * es dort fachlich am nächsten steht; die Abweichung steht als Befund am Produkt, damit
 * niemand die Werte für reines PA6 hält.
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-01";
const SITE = "https://www.3dsunlu.com";

const t = (de, en) => ({ de, en });

const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

/** Spanne ohne Einzelwert. Ein Mittelwert waere erfundene Genauigkeit (ADR-003). */
const range = (min, max, unit, o = {}) => q(null, unit, { ...o, min, max });

/* ------------------------------------------------------- gemeinsame Befunde */

const ASTM_SPECIMEN = t(
  "Dieses Blatt nennt keine Orientierung und führt eine Zeile „Mold Shrinkage“ nach ASTM D955 — einen Spritzgussversuch. Die mechanischen Werte beschreiben deshalb mit hoher Wahrscheinlichkeit den Rohstoff, nicht das gedruckte Bauteil. Da das Blatt es nicht ausspricht, steht der Prüfkörper als „nicht deklariert“; für einen Vergleich mit den gedruckten Werten von Bambu Lab, Prusa Polymers oder den beiden ISO-Blättern von SUNLU selbst sind diese Zahlen nicht geeignet.",
  "This sheet states no orientation and carries a “Mold Shrinkage” row to ASTM D955 — an injection moulding test. The mechanical values therefore most likely describe the raw material, not the printed part. As the sheet does not say so, the specimen stands as “not declared”; these figures are not suitable for comparison with the printed values from Bambu Lab, Prusa Polymers or SUNLU's own two ISO sheets.");

const AMORPHOUS_MELTING = t(
  "Das Blatt nennt einen Schmelzpunkt für einen amorphen Werkstoff. Amorphe Thermoplaste haben keinen Schmelzpunkt, sondern einen Erweichungsbereich oberhalb der Glasübergangstemperatur — die Zeile wurde deshalb nicht übernommen.",
  "The sheet states a melting point for an amorphous material. Amorphous thermoplastics have no melting point but a softening range above the glass transition — the row was therefore not imported.");

const MIXED_UNITS = t(
  "Die ASTM-Reihe misst die Kerbschlagzähigkeit nicht einheitlich: mal nach ISO 180 in kJ/m², mal nach ASTM D256 in J/m. Beide Werte lassen sich nur mit der Prüfkörperdicke ineinander umrechnen. Innerhalb des eigenen Sortiments sind die Blätter damit nicht direkt vergleichbar; umgerechnet wurde hier nichts.",
  "The ASTM series does not measure notched impact consistently: sometimes to ISO 180 in kJ/m², sometimes to ASTM D256 in J/m. The two can only be converted into each other using the specimen thickness. Within its own range the sheets are therefore not directly comparable; nothing was converted here.");

const join = (...parts) => t(
  parts.filter(Boolean).map((x) => x.de).join("\n\n"),
  parts.filter(Boolean).map((x) => x.en).join("\n\n"));

/* ------------------------------------- Chemikalien und Brandschutz aus dem Blatt */

/**
 * SUNLU fuehrt in jedem Blatt eine Bestaendigkeitstabelle und eine UL94-Zeile. Beides
 * wird hier AUS DEM COMMITTETEN TEXTAUSZUG gelesen statt abgetippt: So bleibt der
 * Datenblattauszug die Quelle, und ein Tippfehler kann sich nicht einschleichen.
 *
 * Die Klassen des Blattes sind gröber als unsere Skala. "Excellent" und "Good" landen
 * beide auf "resistant" - das ist ein Informationsverlust, aber ein ehrlicher: unsere
 * Skala kennt nur drei Stufen, und eine vierte zu erfinden hiesse, eine Genauigkeit zu
 * behaupten, die die Bewertung nicht hat.
 */
const CLASS_MAP = {
  excellent: "resistant", good: "resistant",
  fair: "limited", normal: "limited",
  poor: "not-resistant",
};

/** Zeile im Blatt -> Medien-IDs des Registers. */
const CHEM_MAP = [
  [/^Weak\s+Acid/i, ["chem_dilute_acid"]],
  [/^Strong\s+Acid/i, ["chem_strong_acid"]],
  [/^Weak\s+Bases/i, ["chem_dilute_alkali"]],
  [/^Strong\s+Bases/i, ["chem_strong_alkali"]],
  [/^Deionized\s+Water/i, ["chem_water"]],
  // Das Blatt sagt nur "Alcohol" beziehungsweise "Ketone" - die Aussage gilt also fuer
  // die ganze Stoffgruppe und wird auf beide gefuehrten Vertreter uebertragen.
  [/^Alcohol/i, ["chem_ethanol", "chem_ipa"]],
  [/^Ketone/i, ["chem_acetone", "chem_mek"]],
  [/^Petroleum\s+Fuels/i, ["chem_petrol_diesel"]],
  [/^Ester/i, ["chem_ester"]],
];

const GROUP_NOTE = t(
  "Das Datenblatt nennt als Zeile nur die Stoffgruppe („Alcohol“ beziehungsweise „Ketone“), nicht das einzelne Medium. Die Angabe gilt hier deshalb für beide im Register geführten Vertreter der Gruppe.",
  "The datasheet names only the substance group as a row (“Alcohol” or “Ketone”), not the individual medium. The statement therefore applies here to both representatives of the group carried in the register.");

const UNDOCUMENTED_CLASS = t(
  "Das Blatt verwendet hier die Klasse „Normal“, die in seiner eigenen Legende („Excellent, Good, Fair, Poor“) nicht vorkommt. Sie wurde als mittlere Stufe gelesen.",
  "The sheet uses the class “Normal” here, which does not appear in its own legend (“Excellent, Good, Fair, Poor”). It was read as the middle level.");

function readSheet(file) {
  const p = path.join(ROOT, "data/_sources/sunlu-tds", `${file}.txt`);
  try {
    return readFileSync(p, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    console.error(
      `\nQuelldatei fehlt: ${path.relative(ROOT, p)}\n\n` +
      `data/_sources/ ist lokaler Arbeitsplatz und nicht Teil des Repositorys —\n` +
      `Herstellerdatenblaetter werden nicht weiterverbreitet (ADR-034).\n` +
      `Zum Befuellen siehe data/_sources/README.md.\n\n` +
      `Der Build braucht diesen Importer nicht: "npm run ci" laeuft ohne ihn.\n`
    );
    process.exit(1);
  }
}

function chemicalsFrom(file) {
  const text = readSheet(file);
  const out = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim().replace(/\s+/g, " ");
    for (const [pattern, ids] of CHEM_MAP) {
      if (!pattern.test(line)) continue;
      const m = line.match(/(Excellent|Good|Fair|Normal|Poor)\s*$/i);
      if (!m) break;
      const klass = m[1].toLowerCase();
      const rating = CLASS_MAP[klass];
      const notes = [];
      if (ids.length > 1) notes.push(GROUP_NOTE);
      if (klass === "normal") notes.push(UNDOCUMENTED_CLASS);
      for (const id of ids) {
        out.push({
          chemicalId: id, rating,
          conditions: `Herstellerangabe „${m[1]}“, ohne Angabe von Konzentration, Temperatur und Dauer`,
          source: "src_tds", confidence: "low",
          ...(notes.length ? { note: join(...notes) } : {}),
        });
      }
      break;
    }
  }
  return out;
}

function ul94From(file) {
  const line = readSheet(file).split("\n").find((l) => /Flammability/i.test(l));
  if (!line) return undefined;
  const m = line.match(/\b(V-0|V-1|V-2|5VA|5VB|HB)\b\s*$/);
  const thickness = line.match(/([\d.]+)\s*mm/);
  if (!m) return undefined;
  return {
    value: m[1],
    ...(thickness ? { thicknessMm: Number(thickness[1]) } : {}),
    testStandard: "UL 94",
    source: "src_tds", confidence: "low",
    note: t("HB ist die unterste Stufe der UL94-Skala und bedeutet nur, dass das Material langsam brennt — kein Brandschutz im Sinne einer Bahn- oder Luftfahrtanforderung. Das Blatt nennt kein Prüfzeugnis und keine Prüfstelle, deshalb niedrige Konfidenz.",
            "HB is the lowest level of the UL94 scale and only means the material burns slowly — not flame retardancy in the sense of a rail or aerospace requirement. The sheet names no certificate and no test house, hence low confidence."),
  };
}

/* ------------------------------------------------------------- die Produkte */

const P = [
  /* ---- A · ASTM-Reihe, Prüfkörper nicht deklariert ----------------------- */

  { id: "sunlu-pla-plus", material: "pla", name: "SUNLU PLA+", file: "PLA_", family: "astm",
    props: {
      tensileStrengthXy: q(53.4, "MPa", { std: "ASTM D638, 50 mm/min" }),
      tensileModulusXy: q(3170, "MPa", { std: "ASTM D638, 1 mm/min" }),
      elongationAtBreakXy: q(20.3, "%", { std: "ASTM D638, 50 mm/min" }),
      flexuralStrengthXy: q(81.8, "MPa", { std: "ASTM D790, 2 mm/min" }),
      flexuralModulusXy: q(2740, "MPa", { std: "ASTM D790, 2 mm/min" }),
      izodNotchedXy: q(19.8, "kJ/m²", { std: "ISO 180, 4 mm, 23 °C" }),
      hdtB: q(53.8, "°C", { std: "ASTM D648, 0,45 MPa" }),
      glassTransition: q(61, "°C", { std: "ASTM D7426, 10 °C/min" }),
      meltingTemperature: q(164, "°C", { std: "ASTM D7426, 10 °C/min" }),
      vicatB50: q(54, "°C", { std: "ASTM D1525, 5 kg, 50 °C/h" }),
      density: q(1.21, "g/cm³", { std: "ASTM D792, 23 °C" }),
      shrinkage: range(0.1, 0.3, "%", { std: "ASTM D955, 23 °C" }),
      nozzleTemperature: q(210, "°C", { min: 205, max: 215 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
      dryingTemperature: q(50, "°C"),
    },
    anomaly: t("20,3 % Bruchdehnung und 19,8 kJ/m² gekerbte Schlagzähigkeit erreicht kein gedrucktes PLA — gedruckt liegen die Werte bei 3 bis 8 % beziehungsweise 2 bis 5 kJ/m². Zusammen mit der Spritzguss-Schwindungszeile ist das der deutlichste Hinweis darauf, dass hier der Rohstoff beschrieben wird.",
               "20.3 % elongation at break and 19.8 kJ/m² notched impact are not reached by any printed PLA — printed, the figures sit at 3 to 8 % and 2 to 5 kJ/m² respectively. Together with the injection-moulding shrinkage row this is the clearest indication that the raw material is being described.") },

  { id: "sunlu-pla-high-speed", material: "pla", name: "SUNLU High Speed PLA", file: "High_Speed_PLA", family: "astm",
    props: {
      tensileStrengthXy: q(54.1, "MPa", { std: "ASTM D638, 50 mm/min" }),
      tensileModulusXy: q(3282, "MPa", { std: "ASTM D638, 1 mm/min" }),
      elongationAtBreakXy: q(13.9, "%", { std: "ASTM D638, 50 mm/min" }),
      flexuralStrengthXy: q(75.2, "MPa", { std: "ASTM D790, 2 mm/min" }),
      flexuralModulusXy: q(2357, "MPa", { std: "ASTM D790, 2 mm/min" }),
      izodNotchedXy: q(5.9, "kJ/m²", { std: "ISO 180, 4 mm, 23 °C" }),
      hdtB: q(57.3, "°C", { std: "ASTM D648, 0,45 MPa" }),
      glassTransition: q(67.2, "°C", { std: "ASTM D7426, 10 °C/min" }),
      meltingTemperature: q(165.3, "°C", { std: "ASTM D7426, 10 °C/min" }),
      vicatB50: q(54, "°C", { std: "ASTM D1525, 5 kg, 50 °C/h" }),
      density: q(1.26, "g/cm³", { std: "ASTM D792, 23 °C" }),
      shrinkage: range(0.1, 0.3, "%", { std: "ASTM D955, 23 °C" }),
      nozzleTemperature: q(210, "°C", { min: 205, max: 215 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    features: t("Der Schnelldruck-Typ unterscheidet sich messbar vom PLA+ desselben Hauses: höhere Glasübergangstemperatur (67,2 statt 61 °C) und höhere HDT (57,3 statt 53,8 °C), dafür ein Drittel der Kerbschlagzähigkeit (5,9 statt 19,8 kJ/m²). Beides passt zu einer auf schnelle Kristallisation eingestellten Rezeptur.",
                "The high-speed grade differs measurably from this house's PLA+: higher glass transition (67.2 instead of 61 °C) and higher HDT (57.3 instead of 53.8 °C), but a third of the notched impact (5.9 instead of 19.8 kJ/m²). Both fit a formulation tuned for fast crystallisation.") },

  { id: "sunlu-pla-matte", material: "pla", name: "SUNLU PLA Matte", file: "PLA_Matte", family: "astm",
    props: {
      tensileStrengthXy: q(50.5, "MPa", { std: "ASTM D638, 50 mm/min" }),
      tensileModulusXy: q(4780, "MPa", { std: "ASTM D638, 1 mm/min", confidence: "low" }),
      elongationAtBreakXy: q(9.6, "%", { std: "ASTM D638, 50 mm/min" }),
      flexuralStrengthXy: q(61, "MPa", { std: "ASTM D790, 2 mm/min" }),
      flexuralModulusXy: q(2234, "MPa", { std: "ASTM D790, 2 mm/min" }),
      izodNotchedXy: q(40, "J/m", { std: "ASTM D256, 3,2 mm, 23 °C" }),
      hdtB: q(53, "°C", { std: "ASTM D648, 0,45 MPa" }),
      glassTransition: q(58.8, "°C", { std: "ASTM D7426, 10 °C/min" }),
      meltingTemperature: q(162.6, "°C", { std: "ASTM D7426, 10 °C/min" }),
      vicatB50: q(54, "°C", { std: "ASTM D1525, 5 kg, 50 °C/h" }),
      density: q(1.3, "g/cm³", { std: "ASTM D792, 23 °C" }),
      shrinkage: range(0.1, 0.3, "%", { std: "ASTM D955, 23 °C" }),
      nozzleTemperature: q(210, "°C", { min: 205, max: 215 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    anomaly: t("Der Zug-E-Modul von 4780 MPa liegt mehr als doppelt so hoch wie der Biege-E-Modul von 2234 MPa aus demselben Blatt. Bei Thermoplasten liegen beide Werte üblicherweise dicht beieinander, der Biegemodul eher leicht darüber. Zugleich wäre PLA Matte damit deutlich steifer als das PLA+ desselben Hauses (3170 MPa), obwohl es weniger fest ist. Der Wert steht mit niedriger Konfidenz.",
               "The tensile modulus of 4780 MPa is more than twice the flexural modulus of 2234 MPa from the same sheet. For thermoplastics the two normally sit close together, with the flexural figure slightly higher if anything. At the same time PLA Matte would be markedly stiffer than this house's PLA+ (3170 MPa) while being less strong. The value stands at low confidence.") },

  { id: "sunlu-petg", material: "petg", name: "SUNLU PETG", file: "PETG", family: "astm",
    props: {
      tensileStrengthXy: q(61.4, "MPa", { std: "ASTM D638, 50 mm/min" }),
      tensileModulusXy: q(2990, "MPa", { std: "ASTM D638, 1 mm/min" }),
      elongationAtBreakXy: q(5.3, "%", { std: "ASTM D638, 50 mm/min" }),
      flexuralStrengthXy: q(74.8, "MPa", { std: "ASTM D790, 2 mm/min" }),
      flexuralModulusXy: q(1686, "MPa", { std: "ASTM D790, 2 mm/min" }),
      izodNotchedXy: q(35, "J/m", { std: "ASTM D256, 3,2 mm, 23 °C" }),
      hdtB: q(63, "°C", { std: "ASTM D648, 0,45 MPa" }),
      glassTransition: q(65.5, "°C", { std: "ASTM D7426, 10 °C/min" }),
      vicatB50: q(68, "°C", { std: "ASTM D1525, 5 kg, 50 °C/h" }),
      density: q(1.3, "g/cm³", { std: "ASTM D792, 23 °C" }),
      shrinkage: range(0.1, 0.5, "%", { std: "ASTM D955, 23 °C" }),
      nozzleTemperature: q(235, "°C", { min: 230, max: 240 }),
      bedTemperature: q(65, "°C", { min: 60, max: 70 }),
    },
    anomaly: join(AMORPHOUS_MELTING,
      t("Auffällig ist zudem die Kombination aus 61,4 MPa Zugfestigkeit und nur 5,3 % Bruchdehnung. PETG wird gerade wegen seiner Zähigkeit gewählt; andere Hersteller nennen 20 bis 100 %. Ein PETG, das bei 5 % bricht, verhält sich im Bauteil eher wie PLA.",
        "Also striking is the combination of 61.4 MPa tensile strength with only 5.3 % elongation at break. PETG is chosen precisely for its toughness; other manufacturers state 20 to 100 %. A PETG that breaks at 5 % behaves in a part more like PLA.")) },

  { id: "sunlu-abs", material: "abs", name: "SUNLU ABS", file: "ABS", family: "astm",
    props: {
      tensileStrengthXy: q(42, "MPa", { std: "ASTM D638, 50 mm/min" }),
      tensileModulusXy: q(2270, "MPa", { std: "ASTM D638, 1 mm/min" }),
      elongationAtBreakXy: q(7.8, "%", { std: "ASTM D638, 50 mm/min" }),
      flexuralStrengthXy: q(55, "MPa", { std: "ASTM D790, 2 mm/min" }),
      flexuralModulusXy: q(1829, "MPa", { std: "ASTM D790, 2 mm/min" }),
      izodNotchedXy: q(126, "J/m", { std: "ASTM D256, 3,2 mm, 23 °C" }),
      hdtB: q(84, "°C", { std: "ASTM D648, 0,45 MPa" }),
      glassTransition: q(108.9, "°C", { std: "ASTM D7426, 10 °C/min" }),
      vicatB50: q(86, "°C", { std: "ASTM D1525, 5 kg, 50 °C/h" }),
      density: q(1.04, "g/cm³", { std: "ASTM D792, 23 °C" }),
      shrinkage: range(0.4, 0.9, "%", { std: "ASTM D955, 23 °C" }),
      nozzleTemperature: q(255, "°C", { min: 250, max: 260 }),
      bedTemperature: q(90, "°C", { min: 80, max: 100 }),
    },
    anomaly: AMORPHOUS_MELTING },

  { id: "sunlu-asa", material: "asa", name: "SUNLU ASA", file: "ASA", family: "astm",
    props: {
      tensileStrengthXy: q(50, "MPa", { std: "ASTM D638, 50 mm/min" }),
      tensileModulusXy: q(2220, "MPa", { std: "ASTM D638, 1 mm/min" }),
      elongationAtBreakXy: q(15, "%", { std: "ASTM D638, 50 mm/min" }),
      flexuralStrengthXy: q(73, "MPa", { std: "ASTM D790, 2 mm/min" }),
      flexuralModulusXy: q(2114, "MPa", { std: "ASTM D790, 2 mm/min" }),
      izodNotchedXy: q(18, "kJ/m²", { std: "ISO 180, 23 °C" }),
      hdtB: q(96, "°C", { std: "ASTM D648, 0,45 MPa" }),
      glassTransition: q(108, "°C", { std: "ASTM D7426, 10 °C/min" }),
      vicatB50: q(105, "°C", { std: "ASTM D1525, 5 kg, 50 °C/h" }),
      density: q(1.06, "g/cm³", { std: "ASTM D792, 23 °C" }),
      shrinkage: range(0.4, 0.9, "%", { std: "ASTM D955, 23 °C" }),
      nozzleTemperature: q(260, "°C", { min: 255, max: 265 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    anomaly: join(AMORPHOUS_MELTING,
      t("Der genannte Schmelzpunkt von 120 °C läge zudem nur zwölf Kelvin über der eigenen Glasübergangstemperatur von 108 °C — auch als Erweichungsangabe ergibt das keinen Sinn.",
        "The stated melting point of 120 °C would moreover sit only twelve kelvin above the sheet's own glass transition of 108 °C — even read as a softening figure this makes no sense.")),
    features: t("Mit HDT-B 96 °C und Vicat 105 °C das wärmefesteste ASA-Blatt der Datenbank. Der Handelsname lautet „Self-restraint ASA“; das Blatt erklärt nicht, worauf sich das bezieht.",
                "With HDT-B 96 °C and Vicat 105 °C the most heat-resistant ASA sheet in the database. The trade name reads “Self-restraint ASA”; the sheet does not explain what that refers to.") },

  { id: "sunlu-tpu", material: "tpu-95a", name: "SUNLU TPU", file: "TPU", family: "astm",
    props: {
      tensileStrengthXy: q(21.7, "MPa", { std: "ASTM D638, 50 mm/min" }),
      tensileModulusXy: q(50.2, "MPa", { std: "ASTM D638, 1 mm/min" }),
      elongationAtBreakXy: q(536, "%", { std: "ASTM D638, 50 mm/min" }),
      flexuralStrengthXy: q(4.26, "MPa", { std: "ASTM D790, 2 mm/min" }),
      flexuralModulusXy: q(87.6, "MPa", { std: "ASTM D790, 2 mm/min" }),
      hdtB: q(52, "°C", { std: "ASTM D648, 0,45 MPa" }),
      density: q(1.23, "g/cm³", { std: "ASTM D792, 23 °C" }),
      nozzleTemperature: q(200, "°C", { min: 195, max: 205 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    anomaly: t("Das Blatt nennt keine Shore-Härte. Für ein Elastomer ist das die wichtigste Kenngrösse überhaupt — ohne sie lässt sich nicht sagen, ob dieses TPU einer 85A- oder einer 98A-Type entspricht. Es ist hier dem in der Datenbank geführten Typ TPU 95A zugeordnet, weil die übrigen Werte dazu passen; eine Herstellerangabe ist das ausdrücklich nicht. Die Zeile zur Kerbschlagzähigkeit trägt statt einer Zahl den Eintrag „non-destructive“ — bei einem Elastomer eine sinnvolle Angabe, ein Zahlenwert wäre irreführend.",
               "The sheet states no Shore hardness. For an elastomer that is the single most important figure — without it one cannot say whether this TPU corresponds to an 85A or a 98A grade. It is assigned here to the TPU 95A type carried in the database because the remaining values fit; that is expressly not a manufacturer statement. The notched impact row carries the entry “non-destructive” instead of a number — for an elastomer a sensible statement; a numeric value would mislead.") },

  { id: "sunlu-easy-pa", material: "pa6", name: "SUNLU Easy PA", file: "TDS-EASY_PA", family: "astm",
    props: {
      tensileStrengthXy: q(75, "MPa", { std: "ASTM D638, 50 mm/min" }),
      tensileModulusXy: q(1790, "MPa", { std: "ASTM D638, 1 mm/min" }),
      elongationAtBreakXy: q(32, "%", { std: "ASTM D638, 50 mm/min" }),
      flexuralStrengthXy: q(98, "MPa", { std: "ASTM D790, 2 mm/min" }),
      flexuralModulusXy: q(2350, "MPa", { std: "ASTM D790, 2 mm/min" }),
      izodNotchedXy: q(62, "J/m", { std: "ASTM D256, 3,2 mm, 23 °C" }),
      hdtB: q(121, "°C", { std: "ASTM D648, 0,45 MPa" }),
      glassTransition: q(65, "°C", { std: "ASTM D7426, 10 °C/min" }),
      meltingTemperature: q(198, "°C", { std: "ASTM D7426, 10 °C/min" }),
      vicatB50: q(135, "°C", { std: "ASTM D1525, 5 kg, 50 °C/h" }),
      density: q(1.08, "g/cm³", { std: "ASTM D792, 23 °C" }),
      shrinkage: range(1.3, 1.6, "%", { std: "ASTM D955, 23 °C" }),
      nozzleTemperature: q(260, "°C", { min: 255, max: 265 }),
      bedTemperature: q(40, "°C", { min: 30, max: 50 }),
    },
    anomaly: t("Welches Polyamid das ist, sagt das Blatt nicht — und die Zahlen passen zu keinem der geführten Typen sauber. Der Schmelzpunkt von 198 °C liegt zwischen PA12 (178 °C) und PA6 (220 °C), die Dichte von 1,08 g/cm³ unter beiden. Beides deutet auf ein PA6/66-Copolymer hin, wie es unter Namen wie „Easy PA“ üblich ist: leichter zu drucken, weniger verzugsanfällig, dafür weniger wärmeformbeständig als reines PA6. Das Produkt ist dem Typ PA6 zugeordnet, weil es dort fachlich am nächsten steht — die Abweichung im Schmelzpunkt steht hier, damit niemand die Werte für reines PA6 hält.",
               "Which polyamide this is the sheet does not say — and the figures fit none of the carried types cleanly. The melting point of 198 °C sits between PA12 (178 °C) and PA6 (220 °C), the density of 1.08 g/cm³ below both. Both point to a PA6/66 copolymer, as is customary under names like “Easy PA”: easier to print, less prone to warping, but less heat resistant than pure PA6. The product is assigned to the PA6 type because that is technically the closest — the deviation in melting point stands here so that nobody mistakes the values for pure PA6."),
    features: t("Bemerkenswert ist die Betttemperatur von nur 30 bis 50 °C. Polyamide brauchen normalerweise 60 bis 100 °C und eine Kammer; ein PA, das bei 40 °C haftet, ist genau das Verkaufsversprechen des Namens.",
                "Notable is the bed temperature of only 30 to 50 °C. Polyamides normally need 60 to 100 °C and a chamber; a PA that adheres at 40 °C is precisely the promise the name makes.") },

  /* ---- B · ISO-Reihe, gedruckte Prüfkörper mit Orientierung --------------- */

  { id: "sunlu-pc-abs", material: "abs-pc", name: "SUNLU PC-ABS", file: "PC-ABS-TDS", family: "iso",
    props: {
      tensileStrengthXy: q(40, "MPa", { std: "ISO 527-2, 50 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(8, "%", { std: "ISO 527-2, 50 mm/min", orientation: "XY" }),
      flexuralStrengthXy: q(70, "MPa", { std: "ISO 178, 2 mm/min", orientation: "XY" }),
      flexuralModulusXy: q(2300, "MPa", { std: "ISO 178, 2 mm/min", orientation: "XY" }),
      izodNotchedXy: q(70, "kJ/m²", { std: "ISO 180, 23 °C", orientation: "XY", confidence: "low" }),
      hardnessShoreD: q(80, "Shore D", { std: "ISO 868, 23 °C" }),
      hdtB: q(102, "°C", { std: "ISO 75, 0,45 MPa" }),
      glassTransition: q(106, "°C", { std: "ISO 11357-3, 10 °C/min" }),
      density: q(1.081, "g/cm³", { std: "ISO 1183, 23 °C" }),
      nozzleTemperature: q(270, "°C", { min: 260, max: 280 }),
      bedTemperature: q(105, "°C", { min: 100, max: 110 }),
      chamberTemperature: q(95, "°C", { min: 90, max: 100,
        conditions: "im Blatt als „Room Temp.“ geführt; der Hinweistext nennt „90-100 °C Box sealing printing“" }),
      dryingTemperature: q(75, "°C", { min: 70, max: 80 }),
    },
    anomaly: t("70 kJ/m² gekerbte Schlagzähigkeit an einem gedruckten Prüfkörper ist aussergewöhnlich hoch — spritzgegossenes PC-ABS liegt bei 40 bis 55 kJ/m², gedruckt deutlich darunter, weil die Kerbe auf die Schichtgrenzen trifft. Der Wert steht mit niedriger Konfidenz. Die Zeile für den Zug-E-Modul ist im Blatt leer, ebenso die Werte quer zur Schichtebene (Z-X), obwohl die Zeile dafür vorgesehen ist.",
               "70 kJ/m² notched impact on a printed specimen is exceptionally high — injection moulded PC-ABS sits at 40 to 55 kJ/m², printed considerably lower because the notch meets the layer boundaries. The value stands at low confidence. The tensile modulus row is empty in the sheet, as are the values across the layer plane (Z-X), although the row is provided for them."),
    features: t("Eines der wenigen Blätter überhaupt, das eine Bauraumtemperatur nennt: 90 bis 100 °C. Zusammen mit 105 °C Betttemperatur beschreibt das eine Maschine mit beheizter, geschlossener Kammer — ohne die ist dieser Werkstoff nicht sinnvoll zu verarbeiten.",
                "One of very few sheets that states a chamber temperature at all: 90 to 100 °C. Together with a 105 °C bed this describes a machine with a heated, enclosed chamber — without one this material cannot sensibly be processed.") },

  { id: "sunlu-pa6-cf", material: "pa6-cf", name: "SUNLU PA6-CF", file: "PA6-CF-TDS", family: "iso",
    props: {
      tensileStrengthXy: q(170, "MPa", { std: "ISO 527-2, 50 mm/min", orientation: "XY", confidence: "low" }),
      elongationAtBreakXy: q(10, "%", { std: "ISO 527-2, 50 mm/min", orientation: "XY" }),
      flexuralStrengthXy: q(245, "MPa", { std: "ISO 178, 2 mm/min", orientation: "XY", confidence: "low" }),
      flexuralModulusXy: q(11000, "MPa", { std: "ISO 178, 2 mm/min", orientation: "XY", confidence: "low" }),
      izodNotchedXy: q(9.7, "kJ/m²", { std: "ISO 180, 23 °C", orientation: "XY" }),
      izodNotchedZ: q(3.8, "kJ/m²", { std: "ISO 180, 23 °C", orientation: "Z" }),
      hardnessShoreD: q(84, "Shore D", { std: "ISO 868, 23 °C" }),
      hdtB: q(209, "°C", { std: "ISO 75, 0,45 MPa" }),
      glassTransition: q(65, "°C", { std: "ISO 11357-3, 10 °C/min" }),
      meltingTemperature: q(225, "°C", { std: "ISO 11357-3, 10 °C/min" }),
      density: q(1.2, "g/cm³", { std: "ISO 1183, 23 °C" }),
      nozzleTemperature: q(280, "°C", { min: 270, max: 290 }),
      bedTemperature: q(60, "°C", { min: 50, max: 70 }),
      dryingTemperature: q(95, "°C", { min: 80, max: 110 }),
    },
    anomaly: t("Die Festigkeitswerte sind die höchsten der ganzen Datenbank: 170 MPa Zugfestigkeit und 11000 MPa Biege-E-Modul an einem gedruckten Prüfkörper. Zum Vergleich steht das ebenfalls gedruckte PA6-CF von Bambu Lab mit 102 MPa und 4430 MPa im selben Werkstofftyp. Beide Blätter geben rund 20 % Carbonfaser an. Ein Unterschied dieser Grössenordnung zwischen zwei gedruckten Prüfkörpern desselben Werkstofftyps ist erklärungsbedürftig — die Werte stehen deshalb mit niedriger Konfidenz, bis sie sich gegenprüfen lassen.",
               "The strength figures are the highest in the entire database: 170 MPa tensile strength and 11000 MPa flexural modulus on a printed specimen. For comparison, the equally printed PA6-CF from Bambu Lab sits at 102 MPa and 4430 MPa within the same material type. Both sheets state around 20 % carbon fibre. A difference of this magnitude between two printed specimens of the same material type calls for explanation — the values therefore stand at low confidence until they can be cross-checked."),
    features: t("Das aussagekräftigste Blatt des Herstellers: Es beschriftet jede mechanische Zeile mit der Orientierung, zeigt auf Seite zwei Zeichnungen der Prüfkörper mit eingetragener Z-Achse und liefert die Kerbschlagzähigkeit in beiden Richtungen — 9,7 kJ/m² in der Schichtebene gegen 3,8 kJ/m² quer dazu. Daraus ergibt sich ein Anisotropiefaktor von 0,39: Quer zur Schicht bleiben knapp 40 % der Schlagzähigkeit übrig. Genau diese Zahl fehlt in fast allen Datenblättern.",
                "The manufacturer's most informative sheet: it labels every mechanical row with the orientation, shows drawings of the specimens with the Z axis marked on page two, and gives notched impact in both directions — 9.7 kJ/m² in the layer plane against 3.8 kJ/m² across it. That yields an anisotropy factor of 0.39: across the layers barely 40 % of the impact strength remains. Precisely this figure is missing from almost every datasheet.") },
];

/* --------------------------------------------------------------- schreiben */

const SPECIMEN_ISO = t(
  "Dieses Blatt deklariert den Prüfkörper: Jede mechanische Zeile trägt die Orientierung (X-Y beziehungsweise Z-X), und auf Seite zwei sind die Prüfkörper als gedruckte Teile mit eingetragener Z-Achse gezeichnet. Damit sind die Werte mit denen von Bambu Lab und Prusa Polymers vergleichbar — und nicht mit der ASTM-Reihe desselben Herstellers.",
  "This sheet declares the specimen: every mechanical row carries the orientation (X-Y or Z-X), and page two draws the specimens as printed parts with the Z axis marked. The values are therefore comparable with those from Bambu Lab and Prusa Polymers — and not with the same manufacturer's ASTM series.");

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, na = 0, nc = 0, nu = 0;
for (const p of P) {
  const iso = p.family === "iso";
  const base = iso ? SPECIMEN_ISO : join(ASTM_SPECIMEN, MIXED_UNITS);
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "SUNLU", manufacturer: "SUNLU Group", productName: p.name, origin: "China",
    specimenType: iso ? "printed" : "undeclared",
    specimenNote: p.anomaly
      ? join(base, t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`, `Finding on this datasheet: ${p.anomaly.en}`))
      : base,
    ...(p.features ? { features: p.features } : {}),
    datasheet: {
      title: `${p.name} — Technical Data Sheet`,
      url: SITE,
      version: iso ? "ohne Datumsangabe" : "Stand 2024-01-26",
      retrievedAt: RETRIEVED,
    },
    productUrl: SITE,
    properties: p.props,
    chemicalResistance: chemicalsFrom(p.file),
    ...(ul94From(p.file) ? { compliance: { ul94: ul94From(p.file) } } : {}),
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "SUNLU Group",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url: SITE, retrievedAt: RETRIEVED,
        confidenceCeiling: iso ? "medium" : "low",
        note: t(`Herstellerdatenblatt, vom Betreiber als PDF bereitgestellt; eine öffentliche Adresse des Dokuments ist nicht bekannt. Das Dokument wird nicht weiterverbreitet und ist auf Anfrage einsehbar. ${iso ? "Prüfkörper deklariert (gedruckt, mit Orientierung)." : "Prüfkörper nicht deklariert; die Spritzguss-Schwindungszeile deutet auf Rohstoffkennwerte, deshalb Ceiling 'low'."}`,
                `Manufacturer datasheet, supplied as a PDF by the operator; no public address of the document is known. The document is not redistributed and can be inspected on request. ${iso ? "Specimen declared (printed, with orientation)." : "Specimen not declared; the injection-moulding shrinkage row points to raw-material values, hence ceiling 'low'."}`),
      }],
    },
  };
  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  if (p.anomaly) na++;
  nc += rec.chemicalResistance.length;
  if (rec.compliance) nu++;
}

console.log(`${n} SUNLU-Produkte geschrieben (${na} mit dokumentiertem Datenblatt-Befund, ${nc} Bestaendigkeitsangaben, ${nu} mit UL94)`);
