/**
 * Der Feldkatalog: welche Kennwerte es gibt, wie sie heissen und in welcher Einheit.
 *
 * Vorher lag diese Liste in Compare.tsx und damit nur in einer Ansicht. Sobald ein
 * Export dieselben Felder braucht, ist eine zweite Liste die sichere Quelle für
 * Abweichungen — der Vergleich zeigt dann "E-Modul X-Y", die CSV "tensileModulusXy".
 * Deshalb steht der Katalog hier einmal, zweisprachig, mit Einheit.
 *
 * Node lädt diese Datei ohne Buildschritt (Type Stripping). Also keine Datenimporte
 * und nur löschbare Typsyntax.
 */

import type { Material, Quantity, Rating, Flag, Choice } from "../engine/types.ts";

export type FieldGroup =
  | "mechanics" | "thermal" | "processing" | "durability"
  | "finishing" | "sustainability" | "commercial";

export type FieldKind = "quantity" | "rating" | "flag" | "choice";

export interface FieldDef {
  group: FieldGroup;
  field: string;
  de: string;
  en: string;
  /** Physikalische Einheit bei Messwerten. Bewertungen tragen die Skala 1–5. */
  unit?: string;
  kind: FieldKind;
}

export const GROUP_TITLES: Record<FieldGroup, { de: string; en: string }> = {
  mechanics: { de: "Mechanik", en: "Mechanics" },
  thermal: { de: "Thermik", en: "Thermal" },
  processing: { de: "Verarbeitung", en: "Processing" },
  durability: { de: "Beständigkeit", en: "Durability" },
  finishing: { de: "Veredelung", en: "Finishing" },
  sustainability: { de: "Nachhaltigkeit", en: "Sustainability" },
  commercial: { de: "Kommerziell", en: "Commercial" },
};

const q = (group: FieldGroup, field: string, de: string, en: string, unit: string): FieldDef =>
  ({ group, field, de, en, unit, kind: "quantity" });
const r = (group: FieldGroup, field: string, de: string, en: string): FieldDef =>
  ({ group, field, de, en, unit: "1–5", kind: "rating" });
const f = (group: FieldGroup, field: string, de: string, en: string): FieldDef =>
  ({ group, field, de, en, kind: "flag" });
const c = (group: FieldGroup, field: string, de: string, en: string): FieldDef =>
  ({ group, field, de, en, kind: "choice" });

/** In Anzeigereihenfolge. Der Export übernimmt genau diese Reihenfolge. */
export const FIELDS: FieldDef[] = [
  /* --- Mechanik ---------------------------------------------------------- */
  q("mechanics", "density", "Dichte", "Density", "g/cm³"),
  q("mechanics", "tensileStrengthXy", "Zugfestigkeit X-Y", "Tensile strength X-Y", "MPa"),
  q("mechanics", "tensileStrengthZ", "Zugfestigkeit Z", "Tensile strength Z", "MPa"),
  q("mechanics", "anisotropyFactorTensile", "Anisotropiefaktor Zug", "Anisotropy factor tensile", "-"),
  q("mechanics", "tensileModulusXy", "E-Modul X-Y", "Tensile modulus X-Y", "MPa"),
  q("mechanics", "tensileModulusZ", "E-Modul Z", "Tensile modulus Z", "MPa"),
  q("mechanics", "elongationAtBreakXy", "Bruchdehnung X-Y", "Elongation at break X-Y", "%"),
  q("mechanics", "elongationAtBreakZ", "Bruchdehnung Z", "Elongation at break Z", "%"),
  q("mechanics", "flexuralStrengthXy", "Biegefestigkeit X-Y", "Flexural strength X-Y", "MPa"),
  q("mechanics", "flexuralStrengthZ", "Biegefestigkeit Z", "Flexural strength Z", "MPa"),
  q("mechanics", "flexuralModulusXy", "Biege-E-Modul X-Y", "Flexural modulus X-Y", "MPa"),
  q("mechanics", "flexuralModulusZ", "Biege-E-Modul Z", "Flexural modulus Z", "MPa"),
  q("mechanics", "charpyUnnotchedXy", "Charpy ungekerbt X-Y", "Charpy unnotched X-Y", "kJ/m²"),
  q("mechanics", "charpyUnnotchedZ", "Charpy ungekerbt Z", "Charpy unnotched Z", "kJ/m²"),
  q("mechanics", "charpyNotchedXy", "Charpy gekerbt X-Y", "Charpy notched X-Y", "kJ/m²"),
  q("mechanics", "izodNotchedXy", "Izod gekerbt X-Y", "Izod notched X-Y", "kJ/m²"),
  q("mechanics", "izodNotchedZ", "Izod gekerbt Z", "Izod notched Z", "kJ/m²"),
  q("mechanics", "anisotropyFactorImpact", "Anisotropiefaktor Schlag", "Anisotropy factor impact", "-"),
  q("mechanics", "hardnessShoreD", "Härte Shore D", "Hardness Shore D", "Shore D"),
  r("mechanics", "toughness", "Zähigkeit", "Toughness"),
  r("mechanics", "notchSensitivity", "Kerbempfindlichkeit", "Notch sensitivity"),
  r("mechanics", "creepTendency", "Kriechneigung", "Creep tendency"),
  r("mechanics", "wearResistance", "Verschleissfestigkeit", "Wear resistance"),
  r("mechanics", "fatigueResistance", "Dauerfestigkeit", "Fatigue resistance"),

  /* --- Thermik ----------------------------------------------------------- */
  q("thermal", "hdtA", "HDT-A (1,8 MPa)", "HDT-A (1.8 MPa)", "°C"),
  q("thermal", "hdtB", "HDT-B (0,45 MPa)", "HDT-B (0.45 MPa)", "°C"),
  q("thermal", "vicatB50", "Vicat B50", "Vicat B50", "°C"),
  q("thermal", "glassTransition", "Glasübergang Tg", "Glass transition Tg", "°C"),
  q("thermal", "meltingTemperature", "Schmelztemperatur", "Melting temperature", "°C"),
  q("thermal", "recommendedMaxServiceTemperature", "Dauereinsatz (Empfehlung)", "Recommended max service temp.", "°C"),
  q("thermal", "continuousServiceTemperature", "Dauergebrauchstemperatur", "Continuous service temperature", "°C"),
  q("thermal", "minServiceTemperature", "Tiefsttemperatur", "Minimum service temperature", "°C"),

  /* --- Verarbeitung ------------------------------------------------------ */
  q("processing", "nozzleTemperature", "Düsentemperatur", "Nozzle temperature", "°C"),
  q("processing", "bedTemperature", "Betttemperatur", "Bed temperature", "°C"),
  q("processing", "chamberTemperature", "Kammertemperatur", "Chamber temperature", "°C"),
  q("processing", "dryingTemperature", "Trocknungstemperatur", "Drying temperature", "°C"),
  q("processing", "dryingTime", "Trocknungsdauer", "Drying time", "h"),
  q("processing", "maxResidualHumidity", "Max. Restfeuchte", "Max. residual humidity", "%RH"),
  q("processing", "printSpeed", "Druckgeschwindigkeit", "Print speed", "mm/s"),
  q("processing", "maxOverhangAngle", "Max. Überhangwinkel", "Max. overhang angle", "°"),
  q("processing", "shrinkage", "Schwindung", "Shrinkage", "%"),
  q("processing", "coolingFanPct", "Bauteillüfter", "Part cooling fan", "%"),
  q("processing", "minNozzleDiameter", "Min. Düsendurchmesser", "Min. nozzle diameter", "mm"),
  r("processing", "printability", "Druckbarkeit", "Printability"),
  r("processing", "warpingTendency", "Verzugsneigung", "Warping tendency"),
  r("processing", "stringingTendency", "Fadenziehen", "Stringing tendency"),
  r("processing", "hygroscopy", "Hygroskopie", "Hygroscopy"),
  r("processing", "abrasiveness", "Abrasivität", "Abrasiveness"),
  r("processing", "layerAdhesion", "Schichthaftung", "Layer adhesion"),
  f("processing", "hardenedNozzleRequired", "Gehärtete Düse nötig", "Hardened nozzle required"),
  c("processing", "chamberRequirement", "Bauraumkammer", "Chamber requirement"),
  c("processing", "supportStrategy", "Stützstrategie", "Support strategy"),

  /* --- Beständigkeit ----------------------------------------------------- */
  q("durability", "waterAbsorption", "Wasseraufnahme", "Water absorption", "%"),
  q("durability", "outdoorServiceLife", "Standzeit im Freien", "Outdoor service life", "a"),
  r("durability", "uvResistance", "UV-Beständigkeit", "UV resistance"),
  r("durability", "weatherResistance", "Witterungsbeständigkeit", "Weather resistance"),
  r("durability", "hydrolysisResistance", "Hydrolysebeständigkeit", "Hydrolysis resistance"),
  r("durability", "stressCrackingSensitivity", "Spannungsrissempfindlichkeit", "Stress cracking sensitivity"),
  r("durability", "yellowingTendency", "Vergilbungsneigung", "Yellowing tendency"),
  r("durability", "gasBarrier", "Gasbarriere", "Gas barrier"),

  /* --- Veredelung -------------------------------------------------------- */
  r("finishing", "surfaceQuality", "Oberflächengüte", "Surface quality"),
  r("finishing", "layerLineVisibility", "Sichtbarkeit der Schichten", "Layer line visibility"),
  r("finishing", "paintAdhesion", "Lackhaftung", "Paint adhesion"),
  r("finishing", "sandability", "Schleifbarkeit", "Sandability"),
  r("finishing", "fillability", "Spachtelbarkeit", "Fillability"),
  r("finishing", "bondability", "Verklebbarkeit", "Bondability"),
  f("finishing", "heatSetInserts", "Einpressbuchsen (warm)", "Heat-set inserts"),
  c("finishing", "gloss", "Glanzgrad", "Gloss"),
  c("finishing", "colourAvailability", "Farbauswahl", "Colour availability"),

  /* --- Nachhaltigkeit ---------------------------------------------------- */
  q("sustainability", "bioBasedContent", "Biobasierter Anteil", "Bio-based content", "%"),
  f("sustainability", "industriallyCompostable", "Industriell kompostierbar", "Industrially compostable"),
  c("sustainability", "practicalRecyclability", "Praktische Recyclingfähigkeit", "Practical recyclability"),

  /* --- Kommerziell ------------------------------------------------------- */
  /* NUR EINMAL. Beim Einbau des Preisrankings kam eine zweite Zeile fuer dasselbe Feld
     dazu, nur mit anderer Beschriftung. Im Vergleich stand der Preis daraufhin doppelt -
     und weil der React-Schluessel aus Gruppe und Feld gebildet wird, mit demselben
     Schluessel. React darf bei doppelten Schluesseln Zeilen weglassen oder verdoppeln;
     hier tat es beides nicht sichtbar, aber die Warnung stand hundertfach in der Konsole.
     Ein Test haelt die Schluessel jetzt eindeutig. */
  q("commercial", "pricePerKg", "Materialpreis", "Material price", "€/kg"),
  r("commercial", "priceIndex", "Preisniveau (abgeleitet)", "Price level (derived)"),
  r("commercial", "availability", "Verfügbarkeit", "Availability"),
  r("commercial", "smallSeriesSuitability", "Kleinserientauglichkeit", "Small-series suitability"),
];

export const fieldLabel = (d: FieldDef, lang: string): string => (lang === "en" ? d.en : d.de);

/** "Zugfestigkeit X-Y [MPa]" — Einheit gehört in die Kopfzeile, nicht in jede Zelle. */
export const fieldHeader = (d: FieldDef, lang: string): string =>
  d.unit && d.unit !== "-" ? `${fieldLabel(d, lang)} [${d.unit}]` : fieldLabel(d, lang);

/**
 * Die im Vergleich sichtbare Auswahl. Bewusst kürzer als der Katalog: eine Tabelle mit
 * 70 Zeilen vergleicht niemand mehr, sie wird nur gescrollt.
 */
const COMPARE_SET = new Set([
  "mechanics.density", "mechanics.tensileStrengthXy", "mechanics.tensileStrengthZ",
  "mechanics.anisotropyFactorTensile", "mechanics.tensileModulusXy", "mechanics.elongationAtBreakXy",
  "mechanics.flexuralStrengthXy", "mechanics.charpyUnnotchedXy", "mechanics.toughness",
  "thermal.hdtA", "thermal.hdtB", "thermal.glassTransition", "thermal.recommendedMaxServiceTemperature",
  "processing.nozzleTemperature", "processing.bedTemperature", "processing.dryingTemperature",
  "processing.printability", "processing.warpingTendency", "processing.hygroscopy",
  "processing.abrasiveness", "processing.layerAdhesion",
  "durability.uvResistance", "durability.weatherResistance", "durability.waterAbsorption",
  "durability.stressCrackingSensitivity",
  "finishing.surfaceQuality", "finishing.paintAdhesion", "finishing.sandability", "finishing.bondability",
  /* Seit der Preis als €/kg gefuehrt wird, gehoert er in den Vergleich: "was kostet
     welches von diesen vieren" ist genau eine Vergleichsfrage. Als abstrakter Index
     von 1 bis 5 waere er hier nur Rauschen gewesen. */
  "commercial.pricePerKg",
]);

export const fieldKey = (d: FieldDef): string => `${d.group}.${d.field}`;
export const COMPARE_FIELDS: FieldDef[] = FIELDS.filter((d) => COMPARE_SET.has(fieldKey(d)));

/* ------------------------------------------------------------ Feldzugriffe */

type Node = Quantity | Rating | Flag | Choice | undefined;

export const nodeAt = (m: Material, d: FieldDef): Node => {
  const group = m[d.group] as Record<string, unknown> | undefined;
  const node = group?.[d.field];
  return node && typeof node === "object" ? (node as Node) : undefined;
};

/** Zahlenwert für Messwerte und Bewertungen. Alles andere ergibt null. */
export const numberAt = (m: Material, d: FieldDef): number | null => {
  const n = nodeAt(m, d);
  if (!n) return null;
  return typeof n.value === "number" ? n.value : null;
};
