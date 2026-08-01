/**
 * Stage 4 — trade-offs. The part no comparable tool does properly.
 *
 * The question a buyer actually asks is never "what is best?" but "what do I give up
 * if I take the cheaper / easier / bigger one?". This module answers that with numbers
 * from the record, not adjectives.
 */

import { constraintReserve } from "./constraints";
import type { ConstraintVerdict, CriterionScore, Recommendation, TradeOff } from "./types";

/** A candidate has to be at least this good overall to count as a compromise. */
const MIN_RELATIVE = 0.8;
/** Below this relative delta a difference is noise, not a trade-off. */
const MIN_DELTA = 0.08;

export interface TradeOffOptions {
  minRelative?: number;
  /** Only criteria the user weighted at or above this count as a "gain". */
  minWeight?: number;
  limit?: number;
}

function deltas(leader: CriterionScore[], cand: CriterionScore[], minWeight: number) {
  const gains: TradeOff["gains"] = [];
  const losses: TradeOff["losses"] = [];

  for (const l of leader) {
    if (l.weight < minWeight) continue;
    const c = cand.find((x) => x.criterionId === l.criterionId);
    if (!c || c.score === null || l.score === null) continue;
    const delta = c.score - l.score;
    if (Math.abs(delta) < MIN_DELTA) continue;
    const entry = {
      criterionId: l.criterionId,
      deltaPct: Math.round(delta * 100),
      rawFrom: l.raw,
      rawTo: c.raw,
      unit: l.unit,
    };
    if (delta > 0) gains.push(entry);
    else losses.push(entry);
  }
  gains.sort((a, b) => b.deltaPct - a.deltaPct);
  losses.sort((a, b) => a.deltaPct - b.deltaPct);
  return { gains, losses };
}

export function findTradeOffs(
  ranked: Recommendation[],
  verdicts: Record<string, ConstraintVerdict[]>,
  opts: TradeOffOptions = {},
): TradeOff[] {
  const minRelative = opts.minRelative ?? MIN_RELATIVE;
  const minWeight = opts.minWeight ?? 1;
  const limit = opts.limit ?? 4;

  const leader = ranked[0];
  if (!leader || leader.score <= 0) return [];

  const out: TradeOff[] = [];

  for (const cand of ranked.slice(1)) {
    const relative = cand.score / leader.score;
    if (relative < minRelative) break; // ranked list is descending — nothing better follows

    const { gains, losses } = deltas(leader.criteria, cand.criteria, minWeight);
    if (!gains.length) continue; // no reason to prefer it — not a trade-off, just worse

    const tight = (verdicts[cand.material.id] ?? [])
      .filter((v) => {
        const r = constraintReserve(v);
        return v.passed && r !== null && r < 0.1;
      })
      .map((v) => v.constraintId);

    out.push({ material: cand.material, relativeScore: relative, gains, losses, tightConstraints: tight });
    if (out.length >= limit) break;
  }

  return out;
}

/**
 * Named downgrade paths from data/tradeoffs.json, e.g. "PC → PETG-CF when no chamber".
 * These encode knowledge that does not fall out of the numbers: a rule of thumb an
 * experienced shop would give you over the phone.
 */
export interface DowngradeRule {
  from: string;
  to: string;
  when: string;
  reason: { de: string; en: string };
}

export function applicableDowngrades(
  rules: DowngradeRule[],
  leaderId: string,
  availableIds: Set<string>,
  conditions: Set<string>,
): DowngradeRule[] {
  return rules.filter(
    (r) => r.from === leaderId && availableIds.has(r.to) && conditions.has(r.when),
  );
}

/** Materials that are simply worse on every weighted criterion — never worth showing. */
export function dominated(ranked: Recommendation[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < ranked.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = ranked[j].criteria;
      const b = ranked[i].criteria;
      const weighted = a.filter((c) => c.weight > 0 && c.score !== null);
      if (!weighted.length) continue;
      const worseEverywhere = weighted.every((c) => {
        const o = b.find((x) => x.criterionId === c.criterionId);
        return o?.score !== null && o !== undefined && (o.score as number) <= (c.score as number);
      });
      if (worseEverywhere) { out.add(ranked[i].material.id); break; }
    }
  }
  return out;
}

/** Material A vs B, criterion by criterion. Powers the comparison view. */
export function compare(a: Recommendation, b: Recommendation) {
  return a.criteria
    .map((ca) => {
      const cb = b.criteria.find((x) => x.criterionId === ca.criterionId);
      return {
        criterionId: ca.criterionId,
        unit: ca.unit,
        a: { raw: ca.raw, score: ca.score, confidence: ca.confidence },
        b: { raw: cb?.raw ?? null, score: cb?.score ?? null, confidence: cb?.confidence ?? null },
        deltaPct:
          ca.score !== null && cb?.score != null ? Math.round((cb.score - ca.score) * 100) : null,
      };
    })
    .filter((row) => row.a.raw !== null || row.b.raw !== null);
}
