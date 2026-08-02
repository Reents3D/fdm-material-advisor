/**
 * FDM Material Advisor — recommendation engine.
 *
 * Deterministic, explainable, framework-free. Same input always gives the same output,
 * and every output carries the field path it came from.
 *
 *   const result = select(materials, { serviceTemperatureC: 80, chamberAvailable: false })
 *
 * Deliberately NOT part of this engine: the Reents3D portfolio status. It is carried in
 * the data as a neutral badge and never reaches the scoring (ADR-004). The test
 * `portfolio-neutrality.test.ts` enforces that.
 */

import { evaluateConstraints } from "./constraints";
import { buildExplanations } from "./explain";
import { buildNormalisation, scoreMaterial, sensitivity } from "./scoring";
import { processHints } from "./processSwitch";
import { findTradeOffs } from "./tradeoffs";
import type {
  ConstraintVerdict, Material, Recommendation, Rejection, Requirements, SelectionResult,
} from "./types";

export * from "./types";
export { CRITERIA, CRITERION_IDS, DEFAULT_WEIGHTS, criterionById } from "./criteria";
export { buildNormalisation, percentileRank, scoreMaterial } from "./scoring";
export { evaluateConstraints, serviceCeiling, constraintReserve } from "./constraints";
export { findTradeOffs, compare, dominated, applicableDowngrades } from "./tradeoffs";
export { processHints } from "./processSwitch";
export { SCALE_POLARITY } from "./scales";
export { dataCompleteness } from "./completeness";

export function select(materials: Material[], req: Requirements): SelectionResult {
  const table = buildNormalisation(materials);

  const verdicts: Record<string, ConstraintVerdict[]> = {};
  const ranked: Recommendation[] = [];
  const rejected: Rejection[] = [];

  for (const m of materials) {
    const v = evaluateConstraints(m, req);
    verdicts[m.id] = v;

    const failed = v.filter((x) => !x.passed);
    if (failed.length) {
      rejected.push({ material: m, verdicts: v, failed });
      continue;
    }

    const scored = scoreMaterial(m, req, table);
    ranked.push({
      material: m,
      ...scored,
      unverifiedConstraints: v.filter((x) => x.dataMissing).map((x) => x.constraintId),
      explanations: buildExplanations(m, scored.criteria, v, scored.estimatedShare, scored.dataGaps, scored.coverage),
    });
  }

  // A material that only survived because we lack the data must never outrank one that
  // demonstrably meets the requirement. Passing a 90 °C gate by having no temperature
  // data at all is not a recommendation — it is an open question.
  ranked.sort(
    (a, b) =>
      a.unverifiedConstraints.length - b.unverifiedConstraints.length ||
      b.score - a.score ||
      a.material.id.localeCompare(b.material.id),
  );
  rejected.sort((a, b) => a.failed.length - b.failed.length || a.material.id.localeCompare(b.material.id));

  return {
    ranked,
    rejected,
    tradeOffs: findTradeOffs(ranked, verdicts),
    processHints: processHints(req),
    sensitivity: ranked.length ? sensitivity(materials.filter((m) => !verdicts[m.id].some((v) => !v.passed)), req, table, ranked[0].material.id) : [],
    verdicts,
  };
}

/**
 * "Warum nicht X?" — the full constraint story for one material, whether or not it
 * survived. Deliberately recomputed rather than cached so it can be called for any
 * material at any time from the UI.
 */
export function whyNot(material: Material, req: Requirements): ConstraintVerdict[] {
  return evaluateConstraints(material, req);
}

/** Share of provenanced facts that are measured rather than inferred. */
export function confidenceProfile(m: Material): Record<string, number> {
  const counts: Record<string, number> = { high: 0, medium: 0, low: 0, estimated: 0 };
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const n = node as Record<string, unknown>;
    if ("confidence" in n && "source" in n && typeof n.confidence === "string") {
      counts[n.confidence] = (counts[n.confidence] ?? 0) + 1;
    }
    Object.entries(n).forEach(([k, v]) => { if (k !== "governance") walk(v); });
  };
  const { governance, ...rest } = m;
  void governance;
  walk(rest);
  return counts;
}
