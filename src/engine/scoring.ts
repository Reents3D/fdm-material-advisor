/**
 * Stage 2 — normalisation and weighted scoring.
 *
 * NORMALISATION USES PERCENTILE RANK, NOT MIN/MAX (see DECISIONS.md ADR-005).
 * With min/max scaling a single exotic material distorts every other score: add PEEK
 * with an HDT of 250 °C and PC (117 °C) collapses from "very good" to "mid-field",
 * even though nothing about PC changed. Percentile rank answers the question the user
 * actually has — "how does this compare to what is available?" — and stays stable as
 * the database grows.
 *
 * The ranks are computed over the FULL database, not over the filtered candidate set,
 * so scores do not jump around when the user toggles an unrelated constraint.
 */

import { CRITERIA, type Criterion } from "./criteria";
import type { Confidence, CriterionScore, Material, Recommendation, Requirements } from "./types";

export interface NormalisationTable {
  /** criterionId → ascending list of observed values across the database */
  values: Record<string, number[]>;
}

export function buildNormalisation(materials: Material[]): NormalisationTable {
  const values: Record<string, number[]> = {};
  for (const c of CRITERIA) {
    const vs: number[] = [];
    for (const m of materials) {
      const { value } = c.extract(m);
      if (value !== null && Number.isFinite(value)) vs.push(value);
    }
    values[c.id] = vs.sort((a, b) => a - b);
  }
  return { values };
}

/** Fraction of the database this value beats, 0..1. Ties share the midpoint. */
export function percentileRank(value: number, sorted: number[]): number {
  if (!sorted.length) return 0.5;
  if (sorted.length === 1) return 0.5;
  let below = 0;
  let equal = 0;
  for (const v of sorted) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return (below + equal / 2) / sorted.length;
}

export function scoreCriterion(
  m: Material,
  c: Criterion,
  table: NormalisationTable,
  weight: number,
): CriterionScore {
  const { value, confidence } = c.extract(m);
  if (value === null || !Number.isFinite(value)) {
    return { criterionId: c.id, score: null, raw: null, unit: c.unit, confidence: null, weight, evidence: c.evidence };
  }
  const rank = percentileRank(value, table.values[c.id] ?? []);
  return {
    criterionId: c.id,
    score: c.higherIsBetter ? rank : 1 - rank,
    raw: value,
    unit: c.unit,
    confidence,
    weight,
    evidence: c.evidence,
  };
}

const CONF_RANK: Record<Confidence, number> = { estimated: 0, low: 1, medium: 2, high: 3 };

export function scoreMaterial(
  m: Material,
  req: Requirements,
  table: NormalisationTable,
): Omit<Recommendation, "material" | "explanations" | "unverifiedConstraints"> {
  const weights = req.weights ?? {};
  const criteria: CriterionScore[] = [];

  for (const c of CRITERIA) {
    const w = weights[c.id] ?? 0;
    criteria.push(scoreCriterion(m, c, table, w));
  }

  const contributing = criteria.filter((s) => s.weight > 0 && s.score !== null);
  const totalWeight = contributing.reduce((s, c) => s + c.weight, 0);
  const score = totalWeight > 0
    ? contributing.reduce((s, c) => s + c.weight * (c.score as number), 0) / totalWeight
    : 0;

  // Share of the weighted decision that rests on estimates rather than measurements.
  const estimatedWeight = contributing
    .filter((c) => c.confidence !== null && CONF_RANK[c.confidence] === 0)
    .reduce((s, c) => s + c.weight, 0);

  const dataGaps = criteria.filter((s) => s.weight > 0 && s.score === null).map((s) => s.criterionId);

  return {
    score,
    criteria,
    estimatedShare: totalWeight > 0 ? estimatedWeight / totalWeight : 0,
    dataGaps,
  };
}

/**
 * Sensitivity: would a different material win if the user cared 20 % more about
 * one criterion? Answers "how fragile is this recommendation?" in one line.
 */
export function sensitivity(
  materials: Material[],
  req: Requirements,
  table: NormalisationTable,
  currentWinnerId: string,
): { criterionId: string; wouldWin: string }[] {
  const out: { criterionId: string; wouldWin: string }[] = [];
  const weights = req.weights ?? {};

  for (const c of CRITERIA) {
    const base = weights[c.id] ?? 0;
    if (base <= 0) continue;
    const bumped = { ...req, weights: { ...weights, [c.id]: base * 1.2 + 0.5 } };
    let best: { id: string; score: number } | null = null;
    for (const m of materials) {
      const s = scoreMaterial(m, bumped, table).score;
      if (!best || s > best.score) best = { id: m.id, score: s };
    }
    if (best && best.id !== currentWinnerId && !out.some((o) => o.wouldWin === best!.id)) {
      out.push({ criterionId: c.id, wouldWin: best.id });
    }
  }
  return out.slice(0, 3);
}
