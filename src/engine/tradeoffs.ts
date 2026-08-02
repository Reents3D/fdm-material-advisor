/**
 * Stage 4 — trade-offs. The part no comparable tool does properly.
 *
 * The question a buyer actually asks is never "what is best?" but "what do I give up
 * if I take the cheaper / easier / bigger one?". This module answers that with numbers
 * from the record, not adjectives.
 */

import { constraintReserve } from "./constraints";
import type { ConstraintVerdict, CriterionScore, PragmaticAlternative, Recommendation, TradeOff } from "./types";

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

/* ------------------------------------------------------------ „reicht auch" */

/** Was einen Werkstoff im Alltag pragmatisch macht - unabhaengig von der Gewichtung. */
const PRAGMATIC = ["price", "printability", "availability", "lowWarping"];
/** So viel besser muss der Kandidat auf dieser Achse sein, damit es der Rede wert ist. */
const MIN_PRAGMATIC_GAIN = 0.15;
/**
 * Und so gut muss er insgesamt bleiben. Ohne diese Schwelle schlug die Funktion fuer die
 * Hochtemperaturvorrichtung TPU 95A vor - ein weiches Elastomer bei 14 % des Siegerscores,
 * nur weil es billig und leicht zu drucken ist. "Reicht auch" heisst nicht "ist viel
 * schlechter, aber guenstig".
 */
const MIN_PRAGMATIC_RELATIVE = 0.5;

const pragmatism = (r: Recommendation): number | null => {
  const parts = r.criteria.filter((c) => PRAGMATIC.includes(c.criterionId) && c.score !== null);
  if (!parts.length) return null;
  return parts.reduce((s, c) => s + (c.score as number), 0) / parts.length;
};

/**
 * Der guenstigste und einfachste Werkstoff, der die Anforderungen trotzdem erfuellt.
 *
 * WARUM DAS NICHT DIE KOMPROMISSANSICHT ERLEDIGT
 * `findTradeOffs` zeigt nur Kandidaten ab 80 % des Siegerscores - "fast so gut wie der
 * Beste". Aus der Werkstatt kam aber eine andere Frage:
 *
 *   "PETG ist ein Allrounder, der kann fast ueberall eingesetzt werden, und ich finde es
 *    nahezu nirgendwo in den Top-Auswahlen. Fuer die meisten Projekte reicht ein PETG
 *    jedoch komplett aus."
 *
 * Genau das kann die Kompromissansicht nicht sagen. Ein Allrounder liegt bei der
 * Perzentilbewertung ueberall im Mittelfeld und damit strukturell unter 80 % - er faellt
 * durch das Raster, obwohl er JEDE harte Anforderung erfuellt.
 *
 * Diese Funktion sucht deshalb nach einem anderen Kriterium: nicht "fast so gut", sondern
 * "erfuellt alles UND ist deutlich guenstiger oder einfacher". Der Preis dafuer wird
 * genannt, nicht verschwiegen.
 */
export function pragmaticAlternative(ranked: Recommendation[]): PragmaticAlternative | null {
  const leader = ranked[0];
  if (!leader || ranked.length < 2 || leader.score <= 0) return null;

  const leaderPrag = pragmatism(leader);
  if (leaderPrag === null) return null;

  const priceOf = (r: Recommendation) =>
    r.criteria.find((c) => c.criterionId === "price")?.raw ?? null;
  const leaderPrice = priceOf(leader);

  let best: PragmaticAlternative | null = null;
  for (const cand of ranked.slice(1)) {
    if (cand.score / leader.score < MIN_PRAGMATIC_RELATIVE) continue;
    /* Wer eine Anforderung nur passiert hat, weil der Wert fehlt, ist kein sicherer
       Ausweg - er ist ein ungeprueftes Risiko (ADR-006). Als "reicht auch" empfohlen
       waere das die falsche Richtung von Vorsicht. */
    if (cand.unverifiedConstraints.length) continue;

    const p = pragmatism(cand);
    if (p === null || p - leaderPrag < MIN_PRAGMATIC_GAIN) continue;

    // Teurer als der Sieger disqualifiziert - dann ist es kein pragmatischer Ausweg.
    const candPrice = priceOf(cand);
    const ratio = leaderPrice && candPrice ? candPrice / leaderPrice : null;
    if (ratio !== null && ratio > 1) continue;

    /* Alle gewichteten Kriterien vergleichen, damit der Preis vollstaendig dasteht.
       `deltas` liefert Gewinne und Verluste; hier zaehlen nur die Verluste - der Gewinn
       ist per Konstruktion "guenstiger und einfacher". */
    const { losses } = deltas(leader.criteria, cand.criteria, 1);
    const entry: PragmaticAlternative = {
      material: cand.material,
      relativeScore: cand.score / leader.score,
      pragmaticGainPct: Math.round((p - leaderPrag) * 100),
      priceRatio: ratio,
      losses,
    };
    if (!best || entry.pragmaticGainPct > best.pragmaticGainPct) best = entry;
  }
  return best;
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
