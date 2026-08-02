/**
 * Engine types. Framework-free on purpose: this module must run in the browser,
 * in Node, in tests and later inside Odoo or n8n without a React import anywhere.
 */

export type Confidence = "high" | "medium" | "low" | "estimated";

export interface I18nText {
  de: string;
  en: string;
  [lang: string]: string;
}

export type SourceRef = string | string[];

export interface Quantity {
  value: number | null;
  min?: number;
  max?: number;
  tolerance?: number;
  unit: string;
  testStandard?: string;
  orientation?: "XY" | "XZ" | "Z" | "isotropic" | "n/a";
  conditions?: string;
  source: SourceRef;
  confidence: Confidence;
  derivedFrom?: string[];
  note?: I18nText;
}

export interface Rating {
  value: number | null;
  scale: string;
  source: SourceRef;
  confidence: Confidence;
  note?: I18nText;
}

export interface Flag {
  value: boolean | null;
  source: SourceRef;
  confidence: Confidence;
  note?: I18nText;
}

export interface Choice {
  value: string | null;
  source: SourceRef;
  confidence: Confidence;
  note?: I18nText;
}

export interface ChemicalResistance {
  chemicalId: string;
  rating: "resistant" | "limited" | "not-resistant" | "unknown";
  conditions?: string;
  source: SourceRef;
  confidence: Confidence;
  note?: I18nText;
}

export interface MaterialSource {
  id: string;
  type: string;
  publisher: string;
  title: string;
  documentVersion?: string;
  url?: string;
  retrievedAt?: string;
  productName?: string;
  confidenceCeiling: Confidence;
  note?: I18nText;
}

export interface OpenQuestion {
  id: string;
  question: I18nText;
  blocking: boolean;
  affectsFields?: string[];
  assignee?: string;
}

export interface Material {
  schemaVersion: string;
  id: string;
  identity: {
    name: string;
    family: string;
    polymerClass: string;
    variant: string[];
    filler?: { type: string; massFractionPct?: Quantity };
    aliases?: string[];
    trademarkNotice?: I18nText;
    abstract: I18nText;
    positioning: I18nText;
    notToBeConfusedWith?: { materialId: string; reason: I18nText }[];
  };
  mechanics?: Record<string, Quantity | Rating | undefined>;
  thermal?: Record<string, Quantity | undefined> & {
    annealing?: Record<string, unknown>;
  };
  processing?: Record<string, Quantity | Rating | Flag | Choice | unknown>;
  durability?: Record<string, Quantity | Rating | ChemicalResistance[] | undefined>;
  compliance?: Record<string, unknown>;
  sustainability?: Record<string, unknown>;
  finishing?: Record<string, unknown>;
  commercial?: Record<string, unknown>;
  governance: {
    lastReviewed: string;
    reviewedBy: string;
    reviewCycleMonths?: number;
    dataCompleteness: number | null;
    sources: MaterialSource[];
    openQuestions?: OpenQuestion[];
  };
}

/* ------------------------------------------------------------- requirements */

/** What the user asked for. Every field is optional — an empty profile is valid. */
export interface Requirements {
  /** Continuous service temperature the part must survive, in °C. */
  serviceTemperatureC?: number;
  /** Does the shop have a heated chamber? false excludes chamber-mandatory materials. */
  chamberAvailable?: boolean;
  /** Hardened nozzle available? false excludes abrasive filled materials. */
  hardenedNozzleAvailable?: boolean;
  /**
   * Convection oven for post-print annealing? false excludes materials whose datasheet
   * values only hold after annealing (PET-CF, PA6-CF). Without the oven those numbers
   * are simply not achievable, so offering them would be misleading.
   */
  annealingOvenAvailable?: boolean;
  /** Required outdoor service life in years. */
  outdoorYears?: number;
  /** Part must be food-contact declared. */
  foodContact?: boolean;
  /** Minimum UL94 class. */
  flameClass?: "V-0" | "V-1" | "V-2" | "HB";
  /** Part must be ESD-safe (dissipative or conductive). */
  esd?: boolean;
  /** Largest part edge in mm. */
  maxEdgeMm?: number;
  /** Part must be flexible (elastomer). */
  flexible?: boolean;
  /** Minimum tensile strength in the XY plane, MPa. */
  minTensileStrengthMPa?: number;
  /** Chemicals the part will be exposed to (chemical ids). */
  chemicals?: string[];
  /** Weight per criterion id, 0–5. 0 or missing = ignore. */
  weights?: Record<string, number>;
  /** Geometry / process signals used by the process switch. */
  minWallThicknessMm?: number;
  requiresWatertight?: boolean;
  requiresIsotropic?: boolean;
  surfaceRaUm?: number;
  quantity?: number;
}

/* ------------------------------------------------------------------ results */

export interface ConstraintVerdict {
  constraintId: string;
  passed: boolean;
  /** Message key resolved by the i18n layer — no runtime free text. */
  key: string;
  params: Record<string, string | number>;
  /** Dotted field path backing this verdict, for "show me the evidence". */
  evidence?: string;
  /** true when the constraint could not be evaluated because data is missing. */
  dataMissing?: boolean;
}

export interface CriterionScore {
  criterionId: string;
  /** Normalised 0..1, higher is always better after polarity is applied. */
  score: number | null;
  /** Raw extracted value before normalisation. */
  raw: number | null;
  unit?: string;
  confidence: Confidence | null;
  weight: number;
  evidence?: string;
}

export type ExplanationType = "strength" | "weakness" | "risk" | "hint" | "gap";

export interface Explanation {
  type: ExplanationType;
  criterionId?: string;
  key: string;
  params: Record<string, string | number>;
  evidence?: string;
}

export interface Recommendation {
  material: Material;
  /** Weighted total, 0..1. */
  score: number;
  criteria: CriterionScore[];
  explanations: Explanation[];
  /** Share of contributing facts that rest on estimates, 0..1. */
  estimatedShare: number;
  /** Criteria the user weighted but this material has no data for. */
  dataGaps: string[];
  /**
   * Share of the user's weighted decision that is backed by data at all, 0..1.
   * The score is multiplied by this: what we cannot show, we do not credit.
   * A gap therefore costs rank in proportion to how much the user cared about it.
   */
  coverage: number;
  /**
   * Hard constraints this material passed ONLY because the datum is missing.
   * A material that survives on ignorance is never ranked above one that survives
   * on evidence — see the sort in select().
   */
  unverifiedConstraints: string[];
}

export interface Rejection {
  material: Material;
  verdicts: ConstraintVerdict[];
  failed: ConstraintVerdict[];
}

export interface TradeOff {
  material: Material;
  /** Total score relative to the leader, 0..1+. */
  relativeScore: number;
  gains: { criterionId: string; deltaPct: number; rawFrom: number | null; rawTo: number | null; unit?: string }[];
  losses: { criterionId: string; deltaPct: number; rawFrom: number | null; rawTo: number | null; unit?: string }[];
  /** Constraints this candidate only just satisfies (< 10 % reserve). */
  tightConstraints: string[];
}

export interface ProcessHint {
  key: string;
  params: Record<string, string | number>;
  suggestedProcesses: string[];
}

export interface SelectionResult {
  ranked: Recommendation[];
  rejected: Rejection[];
  tradeOffs: TradeOff[];
  processHints: ProcessHint[];
  /** "If you weighted X 20 % higher, the winner would change to Y." */
  sensitivity: { criterionId: string; wouldWin: string }[];
  /** Every material's full constraint evaluation — powers "Warum nicht X?". */
  verdicts: Record<string, ConstraintVerdict[]>;
}
