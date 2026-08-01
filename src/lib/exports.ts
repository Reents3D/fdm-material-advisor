/**
 * Was in die CSV-Dateien kommt.
 *
 * Vier Tabellen, weil vier verschiedene Fragen dahinterstehen:
 *
 *   overview   Eine Zeile je Werkstoff — die Tabelle, die man ausdruckt und überfliegt.
 *   values     Eine Zeile je EINZELNEM Kennwert, mit Quelle, Prüfnorm, Konfidenz.
 *              Das ist die eigentliche Datenbank: Herkunft gehört zum Wert, nicht in
 *              eine Fussnote (ADR-001). Nur in dieser Form ist sie nachnutzbar.
 *   products   Dasselbe für die Herstellerprodukte, inklusive Prüfkörperart — ohne die
 *              ist ein Zahlenvergleich zwischen zwei Marken wertlos.
 *   result     Das Ergebnis einer konkreten Beratung, mit Begründung im Klartext.
 *
 * Diese Datei wird auch von scripts/export-csv.mjs geladen, damit die heruntergeladene
 * und die in der CI veröffentlichte Tabelle Spalte für Spalte identisch sind. Deshalb
 * keine Datenimporte (data/ kommt über import.meta.glob und existiert in Node nicht)
 * und nur löschbare Typsyntax.
 */

import type {
  Choice, Confidence, Flag, Material, Quantity, Rating, Recommendation, SourceRef,
} from "../engine/types.ts";
import { dataCompleteness } from "../engine/completeness.ts";
import type { Column, CsvCell, CsvRow } from "./csv.ts";
import {
  COMPARE_FIELDS, FIELDS, GROUP_TITLES, fieldHeader, fieldLabel, nodeAt, numberAt,
  type FieldDef,
} from "./fields.ts";

export type Translate = (key: string, params?: Record<string, string | number>) => string;

const de = (lang: string) => lang !== "en";
const pick = (lang: string, d: string, e: string) => (de(lang) ? d : e);

const CONFIDENCE: Record<Confidence, { de: string; en: string }> = {
  high: { de: "hoch", en: "high" },
  medium: { de: "mittel", en: "medium" },
  low: { de: "niedrig", en: "low" },
  estimated: { de: "geschätzt", en: "estimated" },
};

const SPECIMEN: Record<string, { de: string; en: string }> = {
  printed: { de: "gedruckter Prüfkörper", en: "printed specimen" },
  moulded: { de: "Spritzguss-/Rohstoffprüfkörper", en: "moulded/raw-material specimen" },
  undeclared: { de: "nicht angegeben", en: "undeclared" },
};

const RESISTANCE: Record<string, { de: string; en: string }> = {
  resistant: { de: "beständig", en: "resistant" },
  limited: { de: "bedingt beständig", en: "limited" },
  "not-resistant": { de: "nicht beständig", en: "not resistant" },
  unknown: { de: "keine Angabe", en: "unknown" },
};

const conf = (c: Confidence | undefined, lang: string): string =>
  c ? pick(lang, CONFIDENCE[c].de, CONFIDENCE[c].en) : "";

const sourceIds = (s: SourceRef | undefined): string =>
  s === undefined ? "" : Array.isArray(s) ? s.join(" | ") : s;

const yesNo = (v: boolean | null | undefined, lang: string): string =>
  v === null || v === undefined ? "" : v ? pick(lang, "ja", "yes") : pick(lang, "nein", "no");

const i18n = (t: { de: string; en: string } | undefined, lang: string): string =>
  t ? pick(lang, t.de, t.en) : "";

/** Der anzeigbare Wert eines Feldes: Zahl bleibt Zahl, damit Excel damit rechnen kann. */
function cellValue(m: Material, d: FieldDef, lang: string): CsvCell {
  const n = nodeAt(m, d);
  if (!n) return null;
  if (d.kind === "flag") return yesNo((n as Flag).value, lang);
  if (d.kind === "choice") return (n as Choice).value ?? null;
  return typeof n.value === "number" ? n.value : null;
}

/* --------------------------------------------------- 1 · Übersicht (breit) */

/** Kennwerte, die in die Übersichtszeile gehören — in dieser Reihenfolge. */
const OVERVIEW_KEYS = [
  "mechanics.density", "mechanics.tensileStrengthXy", "mechanics.tensileStrengthZ",
  "mechanics.anisotropyFactorTensile", "mechanics.tensileModulusXy", "mechanics.elongationAtBreakXy",
  "mechanics.charpyUnnotchedXy", "thermal.hdtA", "thermal.hdtB", "thermal.glassTransition",
  "thermal.recommendedMaxServiceTemperature", "processing.nozzleTemperature", "processing.bedTemperature",
  "processing.chamberRequirement", "processing.hardenedNozzleRequired", "processing.printability",
  "processing.warpingTendency", "processing.hygroscopy", "processing.abrasiveness",
  "durability.uvResistance", "durability.weatherResistance", "durability.waterAbsorption",
  "finishing.surfaceQuality", "finishing.paintAdhesion",
  "commercial.priceIndex", "commercial.availability",
];

export function overviewColumns(lang: string): Column<Material>[] {
  const byKey = new Map(FIELDS.map((d) => [`${d.group}.${d.field}`, d]));
  const fields = OVERVIEW_KEYS.map((k) => byKey.get(k)).filter((d): d is FieldDef => !!d);

  return [
    { header: "ID", cell: (m) => m.id },
    { header: pick(lang, "Material", "Material"), cell: (m) => m.identity.name },
    { header: pick(lang, "Familie", "Family"), cell: (m) => m.identity.family },
    { header: pick(lang, "Polymerklasse", "Polymer class"), cell: (m) => m.identity.polymerClass },
    { header: pick(lang, "Variante", "Variant"), cell: (m) => m.identity.variant.join(" | ") },
    ...fields.map((d) => ({ header: fieldHeader(d, lang), cell: (m: Material) => cellValue(m, d, lang) })),
    {
      header: pick(lang, "Datenvollständigkeit [%]", "Data completeness [%]"),
      cell: (m) => dataCompleteness(m),
    },
    { header: pick(lang, "Quellen", "Sources"), cell: (m) => m.governance.sources.length },
    { header: pick(lang, "Zuletzt geprüft", "Last reviewed"), cell: (m) => m.governance.lastReviewed },
    {
      // ADR-004: der Portfolio-Status fliesst nirgends in die Bewertung ein. Er steht
      // hier als letzte Spalte und trägt den Hinweis im Kopf, damit auch beim Sortieren
      // in Excel klar bleibt, dass er keine Eigenschaft des Werkstoffs ist.
      header: pick(lang, "Reents3D-Portfolio (nicht bewertungsrelevant)",
        "Reents3D portfolio (not part of scoring)"),
      cell: (m) => ((m.commercial as Record<string, Choice | undefined> | undefined)
        ?.reentsPortfolioStatus?.value ?? null),
    },
  ];
}

/* ------------------------------------------------------- 2 · Kennwerte (lang) */

export function valueRows(materials: readonly Material[], lang: string): CsvRow[] {
  const head = [
    "ID", pick(lang, "Material", "Material"), pick(lang, "Familie", "Family"),
    pick(lang, "Gruppe", "Group"), pick(lang, "Kennwert", "Property"), pick(lang, "Feld", "Field"),
    pick(lang, "Wert", "Value"), pick(lang, "Einheit", "Unit"),
    pick(lang, "Min", "Min"), pick(lang, "Max", "Max"),
    pick(lang, "Prüfnorm", "Test standard"), pick(lang, "Orientierung", "Orientation"),
    pick(lang, "Prüfbedingungen", "Conditions"), pick(lang, "Konfidenz", "Confidence"),
    pick(lang, "Quelle", "Source"), pick(lang, "Anmerkung", "Note"),
  ];

  const rows: CsvRow[] = [head];
  for (const m of materials) {
    for (const d of FIELDS) {
      const n = nodeAt(m, d);
      if (!n) continue;
      const isQuantity = d.kind === "quantity";
      const quantity = isQuantity ? (n as Quantity) : undefined;
      rows.push([
        m.id, m.identity.name, m.identity.family,
        pick(lang, GROUP_TITLES[d.group].de, GROUP_TITLES[d.group].en),
        fieldLabel(d, lang), `${d.group}.${d.field}`,
        cellValue(m, d, lang),
        d.kind === "rating" ? "1–5" : (quantity?.unit ?? ""),
        quantity?.min ?? null, quantity?.max ?? null,
        quantity?.testStandard ?? "", quantity?.orientation ?? "", quantity?.conditions ?? "",
        conf((n as Quantity | Rating | Flag | Choice).confidence, lang),
        sourceIds((n as Quantity | Rating | Flag | Choice).source),
        i18n((n as Quantity | Rating | Flag | Choice).note, lang),
      ]);
    }
  }
  return rows;
}

/* ------------------------------------------------- 3 · Herstellerprodukte */

/** Nur die Felder, die der Export tatsächlich liest — bewusst nicht der volle Typ. */
export interface ExportableProduct {
  id: string;
  materialId: string;
  brand: string;
  manufacturer: string;
  productName: string;
  specimenType: string;
  specimenNote?: { de: string; en: string };
  datasheet: { title: string; url: string; version?: string; retrievedAt: string };
  properties: Record<string, Quantity | undefined>;
  /** Bestaendigkeitsangaben AUS DEM PRODUKTDATENBLATT, nicht die abgeleitete Familienmatrix. */
  chemicalResistance?: {
    chemicalId: string; rating: string; conditions?: string;
    source: string; confidence: Confidence; note?: { de: string; en: string };
  }[];
  compliance?: {
    ul94?: {
      value: string | null; thicknessMm?: number; testStandard?: string;
      source: string; confidence: Confidence; note?: { de: string; en: string };
    };
  };
}

export function productRows(
  products: readonly ExportableProduct[], materials: readonly Material[], lang: string,
): CsvRow[] {
  const name = new Map(materials.map((m) => [m.id, m.identity.name]));
  const label = new Map(FIELDS.map((d) => [d.field, fieldLabel(d, lang)]));

  const head = [
    "ID", pick(lang, "Marke", "Brand"), pick(lang, "Hersteller", "Manufacturer"),
    pick(lang, "Produkt", "Product"), pick(lang, "Werkstofftyp-ID", "Material type id"),
    pick(lang, "Werkstofftyp", "Material type"), pick(lang, "Prüfkörper", "Specimen"),
    pick(lang, "Kennwert", "Property"), pick(lang, "Feld", "Field"),
    pick(lang, "Wert", "Value"), pick(lang, "Einheit", "Unit"),
    pick(lang, "Min", "Min"), pick(lang, "Max", "Max"),
    pick(lang, "Prüfnorm", "Test standard"), pick(lang, "Prüfbedingungen", "Conditions"),
    pick(lang, "Konfidenz", "Confidence"),
    pick(lang, "Datenblatt", "Datasheet"), pick(lang, "Abgerufen am", "Retrieved"),
  ];

  const rows: CsvRow[] = [head];
  for (const p of products) {
    const specimen = SPECIMEN[p.specimenType];
    const specimenLabel = specimen ? pick(lang, specimen.de, specimen.en) : p.specimenType;
    const lead = [p.id, p.brand, p.manufacturer, p.productName, p.materialId,
      name.get(p.materialId) ?? "", specimenLabel];

    for (const [field, v] of Object.entries(p.properties)) {
      if (!v) continue;
      rows.push([
        ...lead, label.get(field) ?? field, field,
        v.value, v.unit, v.min ?? null, v.max ?? null,
        v.testStandard ?? "", v.conditions ?? "", conf(v.confidence, lang),
        p.datasheet.url, p.datasheet.retrievedAt,
      ]);
    }

    // Bestaendigkeit und Brandschutz stehen in derselben Tabelle statt in einer eigenen
    // Datei: Wer nach einem Produkt filtert, will alles dazu sehen, nicht zwei Dateien
    // zusammenfuehren muessen. Die Spalte "Feld" trennt die Arten sauber.
    for (const cr of p.chemicalResistance ?? []) {
      const label = RESISTANCE[cr.rating] ?? { de: cr.rating, en: cr.rating };
      rows.push([
        ...lead, pick(lang, "Chemikalienbeständigkeit", "Chemical resistance"),
        `chemicalResistance.${cr.chemicalId}`,
        pick(lang, label.de, label.en), "", null, null,
        "", cr.conditions ?? "", conf(cr.confidence, lang),
        p.datasheet.url, p.datasheet.retrievedAt,
      ]);
    }

    const ul94 = p.compliance?.ul94;
    if (ul94?.value) {
      rows.push([
        ...lead, pick(lang, "Brandverhalten UL94", "Flammability UL94"), "compliance.ul94",
        ul94.value, "", null, null,
        ul94.testStandard ?? "",
        ul94.thicknessMm ? `${ul94.thicknessMm} mm` : "", conf(ul94.confidence, lang),
        p.datasheet.url, p.datasheet.retrievedAt,
      ]);
    }
  }
  return rows;
}

/* ----------------------------------------------------------- 4 · Vergleich */

export function compareRows(materials: readonly Material[], lang: string): CsvRow[] {
  const head: CsvCell[] = [
    pick(lang, "Gruppe", "Group"), pick(lang, "Kennwert", "Property"),
    pick(lang, "Einheit", "Unit"), ...materials.map((m) => m.identity.name),
  ];
  const rows: CsvRow[] = [head];

  for (const d of COMPARE_FIELDS) {
    // Zeilen, für die kein einziger der gewählten Werkstoffe einen Wert hat, wären im
    // Vergleich nur Striche. Sie fliegen raus — wie in der Ansicht.
    if (materials.every((m) => nodeAt(m, d) === undefined)) continue;
    rows.push([
      pick(lang, GROUP_TITLES[d.group].de, GROUP_TITLES[d.group].en),
      fieldLabel(d, lang),
      d.kind === "rating" ? "1–5" : (d.unit ?? ""),
      ...materials.map((m) => cellValue(m, d, lang)),
    ]);
  }

  rows.push([
    pick(lang, "Datenlage", "Data"), pick(lang, "Datenvollständigkeit", "Data completeness"), "%",
    ...materials.map((m) => dataCompleteness(m)),
  ]);
  return rows;
}

/* ------------------------------------------------------- 5 · Beratungsergebnis */

export interface RankedRow {
  rank: number;
  rec: Recommendation;
}

export const toRankedRows = (ranked: readonly Recommendation[]): RankedRow[] =>
  ranked.map((rec, i) => ({ rank: i + 1, rec }));

const reasons = (row: RankedRow, kind: string, t: Translate): string =>
  row.rec.explanations.filter((e) => e.type === kind).map((e) => t(e.key, e.params)).join(" · ");

export function resultColumns(lang: string, t: Translate): Column<RankedRow>[] {
  const byKey = new Map(FIELDS.map((d) => [`${d.group}.${d.field}`, d]));
  const keyFields = ["mechanics.tensileStrengthXy", "mechanics.anisotropyFactorTensile",
    "thermal.hdtB", "mechanics.density"]
    .map((k) => byKey.get(k)).filter((d): d is FieldDef => !!d);

  return [
    { header: pick(lang, "Rang", "Rank"), cell: (r) => r.rank },
    { header: pick(lang, "Material", "Material"), cell: (r) => r.rec.material.identity.name },
    { header: pick(lang, "Familie", "Family"), cell: (r) => r.rec.material.identity.family },
    { header: pick(lang, "Eignung [%]", "Fit [%]"), cell: (r) => Math.round(r.rec.score * 100) },
    ...keyFields.map((d) => ({
      header: fieldHeader(d, lang),
      cell: (r: RankedRow) => numberAt(r.rec.material, d),
    })),
    {
      header: pick(lang, "Datenvollständigkeit [%]", "Data completeness [%]"),
      cell: (r) => dataCompleteness(r.rec.material),
    },
    {
      header: pick(lang, "Anteil geschätzter Werte [%]", "Share of estimated values [%]"),
      cell: (r) => Math.round(r.rec.estimatedShare * 100),
    },
    { header: pick(lang, "Spricht dafür", "In favour"), cell: (r) => reasons(r, "strength", t) },
    { header: pick(lang, "Spricht dagegen", "Against"), cell: (r) => reasons(r, "weakness", t) },
    { header: pick(lang, "Risiken", "Risks"), cell: (r) => reasons(r, "risk", t) },
    {
      header: pick(lang, "Keine Daten für", "No data for"),
      cell: (r) => r.rec.dataGaps.map((g) => t(`criterion.${g}.label`)).join(" · "),
    },
    {
      // Ein Werkstoff, der eine Anforderung nur überlebt, weil die Angabe fehlt, ist
      // etwas anderes als einer, der sie belegt erfüllt. Das muss im Export stehen.
      header: pick(lang, "Nur mangels Daten nicht ausgeschlossen", "Passed only for lack of data"),
      cell: (r) => r.rec.unverifiedConstraints.join(" · "),
    },
    { header: pick(lang, "Einordnung", "Positioning"), cell: (r) => i18n(r.rec.material.identity.positioning, lang) },
  ];
}
