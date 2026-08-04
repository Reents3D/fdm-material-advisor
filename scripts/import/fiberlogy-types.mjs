/**
 * Drei Werkstofftypen aus Fiberlogy-Datenblaettern.
 *
 * WIE SIE GEFUNDEN WURDEN
 * Nicht gesucht, sondern beim Preissammeln aufgelesen: Der Fiberlogy-Katalog fuehrt
 * Kategorien, die diese Datenbank nicht kannte. Ein Werkstofftyp entsteht hier nicht,
 * weil der Name bekannt ist, sondern weil ein Blatt ihn traegt - und weil er in der
 * Praxis vorkommt.
 *
 * PEI 9085 IST BEWUSST NICHT DABEI
 * Es lag fertig ausgewertet vor: HDT-A 152 °C, Vicat 173 °C, Brandpruefung nach
 * FAR 25.853 - der thermisch faehigste Werkstoff, den dieses Blatt hergegeben haette.
 * Aufgenommen wurde er trotzdem nicht. Die Entscheidung kam aus der Werkstatt und lautet:
 * kein gaengiges Material. Sie ist richtig, und der Grund steht im Datenblatt selbst -
 * 350 bis 380 °C Duese und 160 °C Bett kann praktisch keine Maschine, die bei einem
 * Leser dieses Werkzeugs steht. Ein Berater, der Werkstoffe empfiehlt, die niemand
 * verarbeiten kann, hilft nicht, er beeindruckt nur. Die Auswertung bleibt lokal
 * erhalten, falls sich das einmal aendert; das Dokument selbst wird nicht
 * mitgeliefert (ADR-034).
 *
 * WAS DAMIT BEANTWORTBAR WIRD
 *   ABS GF    Glasgefuelltes ABS: 3.500 MPa E-Modul gegen 2.200 beim ungefuellten ABS,
 *             bei nahezu gleicher Verarbeitung.
 *   PLA CF    8.500 MPa E-Modul - der steifste Werkstoff im ganzen Bestand, und zwar
 *             deutlich: PA6-CF liegt bei 4.900.
 *   PCTG+GF10 Glasgefuelltes PCTG, das die Zaehigkeit des Grundpolymers weitgehend
 *             behaelt (Izod ungekerbt 60 kJ/m²).
 *
 * ZWEI DATENBLATTBEFUNDE, DIE NICHT GEGLAETTET WERDEN
 *
 * 1. PLA CF: Charpy ungekerbt 100 kJ/m² gegen gekerbt 3,1 kJ/m² - Faktor 32. Ungefuelltes
 *    PLA liegt ungekerbt bei etwa 15 bis 25. Ein carbongefuelltes PLA ist sproeder, nicht
 *    viermal zaeher. Der gekerbte Wert passt zum erwarteten Verhalten, der ungekerbte
 *    nicht. Beide dokumentiert, der ungekerbte mit ausdruecklichem Zweifel.
 *
 * 2. PLA CF: HDT und Vicat gelten laut Fussnote NUR NACH TEMPERUNG. Das steht als
 *    `annealing.requiredForDatasheetValues: true` im Datensatz - wer keinen Umluftofen
 *    hat, bekommt diese 137 °C nicht, sondern die rund 55 °C des ungetemperten PLA.
 *
 * WAS DIESE DREI NICHT HABEN
 * Keinen Z-Kennwert. Fiberlogy weist wie fast alle Hersteller nur eine Richtung aus, und
 * das Blatt sagt nicht einmal, welche. Die Zugfestigkeit steht deshalb als `undeclared`
 * ohne Orientierung - nicht als X-Y, denn das waere eine Annahme, die niemand belegt hat.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-02";
const U = "https://fiberlogy.com/upload/techfiles";

const t = (de, en) => ({ de, en });

/** Datenblattwert. Konfidenz `low`: eine Quelle zeigt keine Streuung. */
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: o.source ?? "src_tds",
  confidence: o.confidence ?? "low",
  ...(o.note ? { note: o.note } : {}),
});

const s = (value, scale, note) => ({
  value, scale, source: "estimate_reasoning", confidence: "estimated",
  ...(note ? { note } : {}),
});

const service = (value, note) => ({
  value, unit: "°C", conditions: "dauerhaft unter mechanischer Last, Luft",
  source: "estimate_reasoning", confidence: "estimated", note,
});

const flag = (value, note) => ({
  value, source: "src_tds", confidence: "low", ...(note ? { note } : {}),
});

const XXL_NOTE = t(
  "Geschätzt aus Kammerbedarf, Verzugsneigung und Schichthaftung — nicht durch eigene Fertigung belegt. Keine Fertigungsgrenze, sondern die Kantenlänge, ab der es aufwendig wird.",
  "Estimated from chamber requirement, warping tendency and layer adhesion — not backed by our own production. Not a manufacturing limit but the edge length from which it becomes demanding.");

const PORTFOLIO_NOTE = t(
  "Fließt unter keinen Umständen in Filterung oder Bewertung ein (ADR-004).",
  "Never enters filtering or scoring under any circumstances (ADR-004).");

const SINGLE_SOURCE = t(
  "Zweite unabhängige Quelle für diesen Werkstofftyp finden. Alle Kennwerte stammen aus einem einzigen Fiberlogy-Blatt; eine einzelne Quelle zeigt keine Streuung.",
  "Find a second independent source for this material type. All values come from a single Fiberlogy sheet; one source shows no scatter.");

const NO_ORIENTATION = t(
  "Das Blatt nennt keine Bauorientierung. Der Wert steht deshalb ohne Richtungsangabe — als X-Y zu führen wäre eine Annahme, die die Quelle nicht deckt.",
  "The sheet states no build orientation. The value therefore carries no direction — labelling it X-Y would be an assumption the source does not support.");

/* ------------------------------------------------------------------- Typen */

const TYPES = [
  {
    id: "abs-gf", name: "ABS-GF", family: "ABS", polymerClass: "amorphous",
    variant: ["GF"], filler: "glass-fibre",
    aliases: ["Glasfaser-ABS", "ABS GF", "glass filled ABS"],
    file: "FIBERLOGY_ABSGF_TDS.pdf", title: "Fiberlogy ABS GF — Technical Data Sheet",
    abstract: t(
      "Glasgefülltes ABS mit 3.500 MPa E-Modul — gegenüber rund 2.200 MPa beim ungefüllten ABS ein Zugewinn von etwa 60 % Steifigkeit, bei praktisch gleicher Verarbeitung (270 bis 295 °C Düse, 90 °C Bett). Bezahlt wird das mit Dehnung: 3,5 % Bruchdehnung gegen 10,5 % beim Grundpolymer. Glasfaser ist zudem abrasiv — eine gehärtete Düse ist Pflicht, auch wenn das Blatt es nicht erwähnt.",
      "Glass-filled ABS at 3,500 MPa tensile modulus — against roughly 2,200 MPa for unfilled ABS, a gain of about 60 % in stiffness at practically identical processing (270 to 295 °C nozzle, 90 °C bed). It is paid for in ductility: 3.5 % elongation at break against 10.5 % for the base polymer. Glass fibre is abrasive too — a hardened nozzle is mandatory even though the sheet does not mention it."),
    positioning: t(
      "ABS, das sich nicht durchbiegt — zum Preis der Dehnung und einer gehärteten Düse.",
      "ABS that does not flex — at the cost of ductility and a hardened nozzle."),
    mechanics: {
      density: q(1.12, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(50, "MPa", { std: "ISO 527", conditions: "bei Bruch", orientation: "n/a", note: NO_ORIENTATION }),
      tensileModulusXy: q(3500, "MPa", { std: "ISO 527", orientation: "n/a" }),
      elongationAtBreakXy: q(3.5, "%", { std: "ISO 527", orientation: "n/a" }),
      flexuralStrengthXy: q(70, "MPa", { std: "ISO 178", orientation: "n/a" }),
      charpyUnnotchedXy: q(30, "kJ/m²", { std: "ISO 179", conditions: "ungekerbt, 23 °C", orientation: "n/a" }),
      charpyNotchedXy: q(10, "kJ/m²", { std: "ISO 179", conditions: "gekerbt, 23 °C", orientation: "n/a" }),
      toughness: s(2, "toughness"),
      notchSensitivity: s(3, "notchSensitivity"),
    },
    thermal: {
      hdtA: q(80, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(90, "°C", { std: "ISO 75, 0,45 MPa" }),
      vicatB50: q(95, "°C", { std: "ISO 306" }),
      recommendedMaxServiceTemperature: service(65, t(
        "HDT-A 80 °C abzüglich Sicherheitsabstand — praktisch derselbe Bereich wie unverstärktes ABS. Glasfaser erhöht die Steifigkeit, nicht die Formbeständigkeitsgrenze des Grundpolymers.",
        "HDT-A 80 °C less a safety margin — practically the same range as unreinforced ABS. Glass fibre raises stiffness, not the softening limit of the base polymer.")),
    },
    processing: {
      nozzleTemperature: q(282, "°C", { min: 270, max: 295 }),
      bedTemperature: q(90, "°C"),
      chamberRequirement: { value: "recommended", source: "estimate_reasoning", confidence: "estimated" },
      hardenedNozzleRequired: { value: true, source: "estimate_reasoning", confidence: "estimated", note: t(
        "Das Datenblatt erwähnt es nicht. Glasfaser trägt Messing trotzdem in wenigen Stunden auf — die Anforderung folgt aus dem Füllstoff, nicht aus dem Blatt.",
        "The datasheet does not mention it. Glass fibre still widens a brass nozzle within hours — the requirement follows from the filler, not from the sheet.") },
      printability: s(2, "printability"),
      warpingTendency: s(4, "warpingTendency"),
      hygroscopy: s(3, "hygroscopy"),
      abrasiveness: s(4, "abrasiveness"),
    },
    durability: { uvResistance: s(2, "uvResistance"), weatherResistance: s(2, "weatherResistance") },
    emissions: "moderate",
    finishing: {
      surfaceQuality: s(2, "surfaceQuality"), layerLineVisibility: s(3, "layerLineVisibility"),
      sandability: s(3, "sandability"), fillability: s(3, "fillability"),
      paintAdhesion: s(4, "paintAdhesion"), bondability: s(2, "bondability"),
      gloss: { value: "matte", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 3, availability: 2, smallSeries: 3, xxl: 900, xxlMin: 600, xxlMax: 1400 },
  },

  {
    id: "pla-cf", name: "PLA-CF", family: "PLA", polymerClass: "semi-crystalline",
    variant: ["CF", "matte"], filler: "carbon-fibre-chopped",
    aliases: ["Carbon-PLA", "PLA CF", "carbon filled PLA"],
    file: "FIBERLOGY_PLACF_TDS.pdf", title: "Fiberlogy PLA CF — Technical Data Sheet",
    abstract: t(
      "Mit 8.500 MPa E-Modul der mit Abstand steifste Werkstoff im ganzen Bestand — PA6-CF liegt bei 4.900, ungefülltes PLA bei 3.100. Dafür ist es spröde: 2,4 % Bruchdehnung und 3,1 kJ/m² gekerbte Schlagzähigkeit. Der große Vorbehalt steht in der Fußnote des Blatts: Die genannten 137 °C Formbeständigkeit gelten NUR NACH TEMPERUNG im Umluftofen. Ohne Ofen bleibt es beim thermischen Verhalten von normalem PLA.",
      "At 8,500 MPa tensile modulus by far the stiffest material in the entire dataset — PA6-CF sits at 4,900, unfilled PLA at 3,100. The price is brittleness: 2.4 % elongation at break and 3.1 kJ/m² notched impact strength. The major caveat is in the sheet's own footnote: the stated 137 °C heat deflection applies ONLY AFTER ANNEALING in a convection oven. Without one, the thermal behaviour stays that of ordinary PLA."),
    positioning: t(
      "Der steifste Werkstoff im Bestand — spröde, und die Wärmewerte gelten nur getempert.",
      "The stiffest material in the dataset — brittle, and its heat figures only apply annealed."),
    mechanics: {
      density: q(1.26, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(55, "MPa", { std: "ISO 527", conditions: "bei Streckgrenze", orientation: "n/a", note: NO_ORIENTATION }),
      tensileModulusXy: q(8500, "MPa", { std: "ISO 527", orientation: "n/a", note: t(
        "Höchster E-Modul im gesamten Bestand. Zum Vergleich: PA6-CF 4.900 MPa, ungefülltes PLA 3.100 MPa.",
        "Highest tensile modulus in the entire dataset. For comparison: PA6-CF 4,900 MPa, unfilled PLA 3,100 MPa.") }),
      elongationAtBreakXy: q(2.4, "%", { std: "ISO 527", orientation: "n/a" }),
      charpyUnnotchedXy: q(100, "kJ/m²", {
        std: "ISO 179", conditions: "ungekerbt, 23 °C", orientation: "n/a",
        note: t("BEFUND, nicht geglättet: 100 kJ/m² ungekerbt gegen 3,1 kJ/m² gekerbt ist Faktor 32. Ungefülltes PLA liegt ungekerbt bei etwa 15 bis 25 — ein carbongefülltes PLA ist spröder, nicht viermal zäher. Der gekerbte Wert passt zum erwarteten Verhalten, dieser nicht. Er ist dokumentiert und geht nicht in die Zähigkeitsbewertung ein.",
                "FINDING, not smoothed over: 100 kJ/m² unnotched against 3.1 kJ/m² notched is a factor of 32. Unfilled PLA sits at roughly 15 to 25 unnotched — a carbon-filled PLA is more brittle, not four times tougher. The notched value matches expected behaviour, this one does not. It is documented and does not feed the toughness rating."),
      }),
      charpyNotchedXy: q(3.1, "kJ/m²", { std: "ISO 179", conditions: "gekerbt, 23 °C", orientation: "n/a" }),
      toughness: s(1, "toughness", t(
        "Aus Bruchdehnung (2,4 %) und gekerbter Schlagzähigkeit (3,1 kJ/m²) abgeleitet. Der ungekerbte Datenblattwert bleibt bewusst außen vor — siehe Befund dort.",
        "Derived from elongation at break (2.4 %) and notched impact strength (3.1 kJ/m²). The unnotched datasheet value is deliberately left out — see the finding there.")),
      notchSensitivity: s(5, "notchSensitivity"),
    },
    thermal: {
      hdtB: q(137, "°C", { std: "ISO 75, 0,45 MPa", conditions: "NUR nach Temperung" }),
      vicatB50: q(89, "°C", { std: "ISO 306", conditions: "NUR nach Temperung" }),
      recommendedMaxServiceTemperature: service(55, t(
        "Bewusst am UNGETEMPERTEN Zustand ausgerichtet. Die 137 °C aus dem Blatt setzen einen Umluftofen voraus; wer den nicht hat, bekommt das thermische Verhalten von normalem PLA.",
        "Deliberately based on the UN-ANNEALED state. The 137 °C in the sheet presuppose a convection oven; without one you get the thermal behaviour of ordinary PLA.")),
      annealing: {
        possible: flag(true),
        requiredForDatasheetValues: flag(true, t(
          "Das Blatt markiert HDT und Vicat ausdrücklich mit „* – annealing“. Ohne Temperung sind diese beiden Werte nicht erreichbar.",
          "The sheet explicitly marks HDT and Vicat with “* – annealing”. Without annealing these two values are not attainable.")),
      },
    },
    processing: {
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }),
      bedTemperature: q(60, "°C"),
      chamberRequirement: { value: "not-required", source: "estimate_reasoning", confidence: "estimated" },
      hardenedNozzleRequired: { value: true, source: "estimate_reasoning", confidence: "estimated", note: t(
        "Carbonfaser trägt Messing binnen weniger Stunden auf. Folgt aus dem Füllstoff, nicht aus dem Blatt.",
        "Carbon fibre widens a brass nozzle within hours. Follows from the filler, not from the sheet.") },
      printability: s(3, "printability"),
      warpingTendency: s(2, "warpingTendency"),
      hygroscopy: s(2, "hygroscopy"),
      abrasiveness: s(5, "abrasiveness"),
    },
    durability: { uvResistance: s(2, "uvResistance"), weatherResistance: s(1, "weatherResistance") },
    emissions: "low",
    finishing: {
      surfaceQuality: s(4, "surfaceQuality"), layerLineVisibility: s(2, "layerLineVisibility"),
      sandability: s(2, "sandability"), fillability: s(3, "fillability"),
      paintAdhesion: s(4, "paintAdhesion"), bondability: s(2, "bondability"),
      gloss: { value: "matte", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 2, availability: 4, smallSeries: 4, xxl: 700, xxlMin: 500, xxlMax: 1100 },
  },

  {
    id: "pctg-gf", name: "PCTG-GF", family: "PET", polymerClass: "amorphous",
    variant: ["GF"], filler: "glass-fibre",
    aliases: ["PCTG+GF10", "Glasfaser-PCTG", "glass filled PCTG"],
    file: "FIBERLOGY_PCTGGF_TDS.pdf", title: "Fiberlogy PCTG+GF10 — Technical Data Sheet",
    abstract: t(
      "Glasgefülltes PCTG mit 10 % Faseranteil: 3.400 MPa E-Modul und trotzdem 8 % Bruchdehnung und 60 kJ/m² ungekerbte Schlagzähigkeit — es behält also viel von der Zähigkeit des Grundpolymers, was für einen gefüllten Werkstoff ungewöhnlich ist. Thermisch bleibt es mit HDT-A 64 °C und HDT-B 76 °C im Bereich von PETG; der Füllstoff bringt Steifigkeit, keine Wärmefestigkeit.",
      "Glass-filled PCTG at 10 % fibre content: 3,400 MPa tensile modulus and still 8 % elongation at break with 60 kJ/m² unnotched impact strength — it keeps much of the base polymer's toughness, which is unusual for a filled material. Thermally it stays in PETG territory at HDT-A 64 °C and HDT-B 76 °C; the filler brings stiffness, not heat resistance."),
    positioning: t(
      "Steifer als PETG, ohne dessen Zähigkeit ganz zu verlieren — thermisch aber im selben Fenster.",
      "Stiffer than PETG without losing all of its toughness — but thermally in the same window."),
    mechanics: {
      density: q(1.31, "g/cm³", { std: "ASTM D792", note: t(
        "Die Dichte ist als einziger Wert des Blatts nach ASTM geprüft, alles andere nach ISO. Kein Fehler, aber ein Bruch in der Prüfsystematik.",
        "Density is the only value on the sheet tested to ASTM, everything else to ISO. Not an error, but a break in the test regime.") }),
      tensileStrengthXy: q(55, "MPa", { std: "ISO 527", conditions: "bei Streckgrenze", orientation: "n/a", note: NO_ORIENTATION }),
      tensileModulusXy: q(3400, "MPa", { std: "ISO 527", orientation: "n/a" }),
      elongationAtBreakXy: q(8, "%", { std: "ISO 527", orientation: "n/a" }),
      charpyUnnotchedXy: q(60, "kJ/m²", { std: "ISO 180", conditions: "Izod ungekerbt, 23 °C", orientation: "n/a", note: t(
        "Izod nach ISO 180, nicht Charpy nach ISO 179 wie bei den übrigen Werkstoffen — die Zahlen sind untereinander nur eingeschränkt vergleichbar.",
        "Izod to ISO 180, not Charpy to ISO 179 as for the other materials — the numbers are only comparable to a limited extent.") }),
      toughness: s(3, "toughness"),
      notchSensitivity: s(3, "notchSensitivity"),
    },
    thermal: {
      hdtA: q(64, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(76, "°C", { std: "ISO 75, 0,45 MPa" }),
      recommendedMaxServiceTemperature: service(55, t(
        "HDT-A 64 °C abzüglich Sicherheitsabstand — dasselbe thermische Fenster wie PETG und PCTG.",
        "HDT-A 64 °C less a safety margin — the same thermal window as PETG and PCTG.")),
    },
    processing: {
      nozzleTemperature: q(260, "°C", { min: 250, max: 270 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
      chamberRequirement: { value: "not-required", source: "estimate_reasoning", confidence: "estimated" },
      hardenedNozzleRequired: { value: true, source: "estimate_reasoning", confidence: "estimated", note: t(
        "Glasfaser ist abrasiv, auch bei nur 10 % Anteil. Folgt aus dem Füllstoff, nicht aus dem Blatt.",
        "Glass fibre is abrasive even at only 10 % content. Follows from the filler, not from the sheet.") },
      printability: s(3, "printability"),
      warpingTendency: s(2, "warpingTendency"),
      hygroscopy: s(3, "hygroscopy"),
      abrasiveness: s(4, "abrasiveness"),
    },
    durability: { uvResistance: s(3, "uvResistance"), weatherResistance: s(3, "weatherResistance") },
    emissions: "low",
    finishing: {
      surfaceQuality: s(3, "surfaceQuality"), layerLineVisibility: s(3, "layerLineVisibility"),
      sandability: s(2, "sandability"), fillability: s(3, "fillability"),
      paintAdhesion: s(4, "paintAdhesion"), bondability: s(3, "bondability"),
      gloss: { value: "matte", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 3, availability: 2, smallSeries: 3, xxl: 900, xxlMin: 600, xxlMax: 1400 },
  },
];

/* ------------------------------------------------------------------ Schreiben */

const out = path.join(ROOT, "data/materials");
mkdirSync(out, { recursive: true });

let n = 0;
for (const T of TYPES) {
  const url = `${U}/${T.file}`;
  const rec = {
    $schema: "../../schema/material.schema.json",
    schemaVersion: "1.0.0",
    id: T.id,
    identity: {
      name: T.name, family: T.family, polymerClass: T.polymerClass,
      variant: T.variant,
      ...(T.filler ? { filler: { type: T.filler } } : {}),
      aliases: T.aliases,
      abstract: T.abstract, positioning: T.positioning,
    },
    mechanics: T.mechanics,
    thermal: T.thermal,
    processing: T.processing,
    durability: T.durability,
    compliance: {
      foodContact: {
        status: { value: "not-declared", source: "estimate_reasoning", confidence: "estimated" },
        partLevelWarning: t(
          "Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen.",
          "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches."),
      },
      flameRetardancy: {
        ul94: {
          value: "not-classified", source: "estimate_reasoning", confidence: "estimated",
          ...(T.ul94Note ? { note: T.ul94Note } : {}),
        },
      },
      printEmissions: {
        concernLevel: { value: T.emissions, source: "estimate_reasoning", confidence: "estimated" },
      },
    },
    sustainability: {
      bioBasedContent: { value: T.id === "pla-cf" ? 80 : 0, unit: "%", source: "estimate_reasoning", confidence: "estimated" },
      industriallyCompostable: { value: false, source: "estimate_reasoning", confidence: "estimated" },
      practicalRecyclability: { value: "possible-in-theory", source: "estimate_reasoning", confidence: "estimated" },
    },
    finishing: T.finishing,
    commercial: {
      priceIndex: s(T.commercial.price, "priceIndex"),
      availability: s(T.commercial.availability, "availability"),
      smallSeriesSuitability: s(T.commercial.smallSeries, "smallSeriesSuitability"),
      xxl: {
        maxSensibleEdgeMm: {
          value: T.commercial.xxl, unit: "mm", min: T.commercial.xxlMin, max: T.commercial.xxlMax,
          source: "estimate_reasoning", confidence: "estimated", note: XXL_NOTE,
        },
        segmentationRecommended: { value: true, source: "estimate_reasoning", confidence: "estimated" },
      },
      reentsPortfolioStatus: {
        value: "unknown", source: "estimate_reasoning", confidence: "estimated", note: PORTFOLIO_NOTE,
      },
    },
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstanlage aus Herstellerdatenblatt)",
      openQuestions: [{
        id: `oq_${T.id.replace(/-/g, "_")}_single_source`,
        question: SINGLE_SOURCE,
        blocking: false,
        affectsFields: ["mechanics", "thermal", "processing"],
      }],
      sources: [
        {
          id: "src_tds", type: "manufacturer-tds", publisher: "Fiberlab S.A. (Fiberlogy)",
          title: T.title, url, retrievedAt: RETRIEVED, confidenceCeiling: "low",
          note: t("Einziges Datenblatt für diesen Werkstofftyp. Keine Bauorientierung angegeben.",
                  "Only datasheet for this material type. No build orientation stated."),
        },
        {
          id: "estimate_reasoning", type: "estimate", publisher: "Reents Technologies GmbH",
          title: "Eigene Einschätzung aus Polymerklasse und Werkstattpraxis",
          retrievedAt: RETRIEVED, confidenceCeiling: "estimated",
          note: t("Skalenwerte und konservative Dauergebrauchstemperaturen. Ausdrücklich als Schätzung gekennzeichnet.",
                  "Scale values and conservative continuous service temperatures. Explicitly flagged as estimates."),
        },
      ],
    },
  };
  writeFileSync(path.join(out, `${T.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
}

console.log(`${n} neue Werkstofftypen aus Fiberlogy-Blättern: ${TYPES.map((x) => x.id).join(", ")}`);
console.log("  PEI 9085 lag ausgewertet vor und ist bewusst NICHT dabei — kein gängiges Material.");
console.log("  Alle aus je EINEM Blatt — Datenblattwerte daher 'low', nicht 'medium'.");
console.log("  Kein Blatt nennt eine Bauorientierung: Zugwerte stehen ohne Richtung, nicht als X-Y.");
console.log("  Zwei Datenblattbefunde dokumentiert statt geglättet:");
console.log("    PLA CF    Charpy ungekerbt 100 gegen gekerbt 3,1 kJ/m² — Faktor 32");
console.log("    PLA CF    HDT und Vicat gelten NUR nach Temperung (Fußnote des Blatts)");
