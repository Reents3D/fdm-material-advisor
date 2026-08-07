/**
 * Scoring criteria: the dimensions a user can weight.
 *
 * Each criterion knows how to pull one comparable number out of a material record.
 * Extractors return `null` when the datum is absent — never a substitute value.
 * Guessing here would silently reward sparse records, which is exactly the failure
 * mode this project exists to avoid (ADR-003).
 */

import type { Material, Quantity, Rating, Confidence, ChemicalResistance } from "./types";

export interface Criterion {
  id: string;
  /** Factor-type criteria (0..1) read as percentages in the UI, not as "0.47". */
  displayAsPercent?: boolean;
  group: "mechanics" | "thermal" | "environment" | "process" | "optics" | "commercial";
  /** true when a larger raw value is better. Applied during normalisation. */
  higherIsBetter: boolean;
  unit?: string;
  /** Dotted path for the evidence link in the UI. */
  evidence?: string;
  extract: (m: Material) => { value: number | null; confidence: Confidence | null; min?: number; max?: number };
}

/* `min`/`max` kommen seit ADR-042 mit: Sie sind die beobachtete Spanne ueber die
   Hersteller und sagen, wie weit der Median ueberhaupt traegt. Die Bewertung liest sie
   (siehe `spanCredit` in scoring.ts), deshalb reicht der Wert allein hier nicht mehr. */
const q = (m: Material, group: keyof Material, field: string) => {
  const g = m[group] as Record<string, Quantity | undefined> | undefined;
  const node = g?.[field];
  if (!node || typeof node !== "object" || !("unit" in node)) return { value: null, confidence: null };
  const n = node as Quantity;
  return { value: n.value, confidence: n.confidence, min: n.min, max: n.max };
};

const r = (m: Material, group: keyof Material, field: string) => {
  const g = m[group] as Record<string, Rating | undefined> | undefined;
  const node = g?.[field];
  if (!node || typeof node !== "object" || !("scale" in node)) return { value: null, confidence: null };
  return { value: (node as Rating).value, confidence: (node as Rating).confidence };
};

/** Average of several ratings, ignoring missing ones. Confidence = weakest present. */
const avg = (
  parts: { value: number | null; confidence: Confidence | null }[],
): { value: number | null; confidence: Confidence | null } => {
  const present = parts.filter((p) => p.value !== null);
  if (!present.length) return { value: null, confidence: null };
  const order: Confidence[] = ["estimated", "low", "medium", "high"];
  const weakest = present
    .map((p) => p.confidence)
    .filter((c): c is Confidence => c !== null)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? null;
  return { value: present.reduce((s, p) => s + (p.value as number), 0) / present.length, confidence: weakest };
};

/** Invert a 1–5 rating so that higher always means better. */
const invert = (p: { value: number | null; confidence: Confidence | null }) => ({
  value: p.value === null ? null : 6 - p.value,
  confidence: p.confidence,
});

export const CRITERIA: Criterion[] = [
  {
    id: "strength",
    group: "mechanics",
    higherIsBetter: true,
    unit: "MPa",
    evidence: "mechanics.tensileStrengthXy",
    extract: (m) => q(m, "mechanics", "tensileStrengthXy"),
  },
  {
    id: "stiffness",
    group: "mechanics",
    higherIsBetter: true,
    unit: "MPa",
    evidence: "mechanics.tensileModulusXy",
    extract: (m) => q(m, "mechanics", "tensileModulusXy"),
  },
  {
    id: "layerAdhesion",
    group: "mechanics",
    higherIsBetter: true,
    displayAsPercent: true,
    unit: "-",
    evidence: "mechanics.anisotropyFactorTensile",
    extract: (m) => q(m, "mechanics", "anisotropyFactorTensile"),
  },
  {
    id: "toughness",
    group: "mechanics",
    higherIsBetter: true,
    unit: "%",
    evidence: "mechanics.elongationAtBreakXy",
    extract: (m) => q(m, "mechanics", "elongationAtBreakXy"),
  },
  {
    id: "temperature",
    group: "thermal",
    higherIsBetter: true,
    unit: "°C",
    evidence: "thermal.hdtB",
    extract: (m) => {
      const b = q(m, "thermal", "hdtB");
      return b.value !== null ? b : q(m, "thermal", "hdtA");
    },
  },
  {
    id: "outdoor",
    group: "environment",
    higherIsBetter: true,
    evidence: "durability.uvResistance",
    extract: (m) => avg([r(m, "durability", "uvResistance"), r(m, "durability", "weatherResistance")]),
  },
  {
    id: "chemical",
    group: "environment",
    higherIsBetter: true,
    displayAsPercent: true,
    evidence: "durability.chemicalResistance",
    extract: (m) => {
      const list = (m.durability?.chemicalResistance as ChemicalResistance[] | undefined) ?? [];
      const known = list.filter((c) => c.rating !== "unknown");
      if (!known.length) return { value: null, confidence: null };
      const pts = known.reduce(
        (s, c) => s + (c.rating === "resistant" ? 1 : c.rating === "limited" ? 0.5 : 0),
        0,
      );
      return { value: pts / known.length, confidence: "low" };
    },
  },
  {
    id: "printability",
    group: "process",
    higherIsBetter: true,
    evidence: "processing.printability",
    extract: (m) => r(m, "processing", "printability"),
  },
  {
    id: "lowWarping",
    group: "process",
    higherIsBetter: true,
    evidence: "processing.warpingTendency",
    extract: (m) => invert(r(m, "processing", "warpingTendency")),
  },
  {
    id: "xxl",
    group: "process",
    higherIsBetter: true,
    unit: "mm",
    evidence: "commercial.xxl.maxSensibleEdgeMm",
    extract: (m) => {
      const xxl = (m.commercial as { xxl?: { maxSensibleEdgeMm?: Quantity } } | undefined)?.xxl?.maxSensibleEdgeMm;
      if (!xxl) return { value: null, confidence: null };
      return { value: xxl.value, confidence: xxl.confidence };
    },
  },
  {
    id: "surface",
    group: "optics",
    higherIsBetter: true,
    evidence: "finishing.surfaceQuality",
    extract: (m) =>
      avg([r(m, "finishing", "surfaceQuality"), invert(r(m, "finishing", "layerLineVisibility"))]),
  },
  {
    id: "paintability",
    group: "optics",
    higherIsBetter: true,
    evidence: "finishing.paintAdhesion",
    extract: (m) => r(m, "finishing", "paintAdhesion"),
  },
  {
    id: "lightweight",
    group: "commercial",
    higherIsBetter: false,
    unit: "g/cm³",
    evidence: "mechanics.density",
    extract: (m) => q(m, "mechanics", "density"),
  },
  {
    /* Wirtschaftlichkeit, nicht "Preis": Die Zahl ist ein Materialpreis in €/kg, kein
       Bauteilpreis - Bauzeit, Ausschussrate und Nachbearbeitung stecken nicht darin und
       dominieren in der Praxis regelmaessig ueber das Filament.

       Der Wert stand frueher als abstrakter Index von 1 bis 5 hier und trug mit Gewicht 3
       das hoechste Standardgewicht ueberhaupt - in einem WERKSTOFFberater. Er steht jetzt
       auf 1: Der Preis entscheidet nicht, welcher Werkstoff technisch passt, sondern
       welchen von den passenden man nimmt. */
    id: "price",
    group: "commercial",
    higherIsBetter: false,
    unit: "€/kg",
    evidence: "commercial.pricePerKg",
    extract: (m) => q(m, "commercial", "pricePerKg"),
  },
  {
    id: "availability",
    group: "commercial",
    higherIsBetter: true,
    evidence: "commercial.availability",
    extract: (m) => r(m, "commercial", "availability"),
  },
  {
    id: "sustainability",
    group: "commercial",
    higherIsBetter: true,
    unit: "%",
    evidence: "sustainability.bioBasedContent",
    extract: (m) => {
      const bio = (m.sustainability as { bioBasedContent?: Quantity } | undefined)?.bioBasedContent;
      if (!bio) return { value: null, confidence: null };
      return { value: bio.value, confidence: bio.confidence };
    },
  },
];

export const CRITERION_IDS = CRITERIA.map((c) => c.id);
export const criterionById = (id: string) => CRITERIA.find((c) => c.id === id);

/** Sensible starting weights. The wizard overrides these per use case. */
export const DEFAULT_WEIGHTS: Record<string, number> = {
  strength: 3, stiffness: 2, layerAdhesion: 2, toughness: 2, temperature: 3,
  outdoor: 1, chemical: 1, printability: 3, lowWarping: 2, xxl: 1,
  /* Wirtschaftlichkeit stand hier bis 2026-08-02 auf 3 und damit gleichauf mit
     Festigkeit und Temperatur. In einem Werkstoffberater entscheidet der Materialpreis
     aber nicht, was passt - nur, welches von den passenden man nimmt. */
  surface: 2, paintability: 1, lightweight: 1, price: 1, availability: 2, sustainability: 1,
};
