/**
 * Enforcement test for ADR-004.
 *
 * The Reents3D portfolio status must never influence the ranking. This is the one
 * property of the tool that is worth more than any feature: an advisor that quietly
 * steers toward its operator's stock is worthless, and the engineers this tool is
 * built for are exactly the people who check for it.
 *
 * If someone later adds a "availability bonus for stocked materials", this test goes red.
 */

import { describe, expect, it } from "vitest";
import { MATERIALS } from "../../src/data/materials";
import { select } from "../../src/engine";
import { DEFAULT_WEIGHTS } from "../../src/engine/criteria";
import type { Material } from "../../src/engine/types";

const STATUSES = ["standard", "on-request", "partner-production", "not-in-portfolio", "unknown"];

/** Deep clone with every material's portfolio status rewritten. */
function withStatus(materials: Material[], pick: (i: number) => string): Material[] {
  return materials.map((m, i) => {
    const clone = structuredClone(m) as Material;
    const commercial = clone.commercial as { reentsPortfolioStatus?: { value: string } } | undefined;
    if (commercial?.reentsPortfolioStatus) commercial.reentsPortfolioStatus.value = pick(i);
    return clone;
  });
}

const REQS = [
  { weights: DEFAULT_WEIGHTS },
  { serviceTemperatureC: 70, weights: DEFAULT_WEIGHTS },
  { chamberAvailable: false, outdoorYears: 3, weights: DEFAULT_WEIGHTS },
  { maxEdgeMm: 1200, weights: { ...DEFAULT_WEIGHTS, xxl: 5, price: 5 } },
];

describe("ADR-004: Portfolio-Status beeinflusst das Ranking nicht", () => {
  for (const [i, req] of REQS.entries()) {
    it(`Anforderungsprofil ${i + 1}: Ranking bleibt identisch`, () => {
      const allStocked = select(withStatus(MATERIALS, () => "standard"), req);
      const noneStocked = select(withStatus(MATERIALS, () => "not-in-portfolio"), req);
      const mixed = select(withStatus(MATERIALS, (n) => STATUSES[n % STATUSES.length]), req);

      const order = (r: ReturnType<typeof select>) => r.ranked.map((x) => x.material.id);
      const scores = (r: ReturnType<typeof select>) => r.ranked.map((x) => x.score.toFixed(10));

      expect(order(noneStocked)).toEqual(order(allStocked));
      expect(order(mixed)).toEqual(order(allStocked));
      expect(scores(noneStocked)).toEqual(scores(allStocked));
      expect(scores(mixed)).toEqual(scores(allStocked));
    });
  }

  it("Portfolio-Status taucht in keiner Erklärung auf", () => {
    const r = select(MATERIALS, { weights: DEFAULT_WEIGHTS });
    const keys = r.ranked.flatMap((x) => x.explanations.map((e) => e.key));
    expect(keys.some((k) => /portfolio|reents|lager|stock/i.test(k))).toBe(false);
  });

  it("Portfolio-Status ist auch kein Hard Constraint", () => {
    const r = select(withStatus(MATERIALS, () => "not-in-portfolio"), { weights: DEFAULT_WEIGHTS });
    expect(r.ranked.length).toBe(MATERIALS.length);
    expect(r.rejected).toHaveLength(0);
  });

  it("kein Scoring-Kriterium liest das Feld", async () => {
    const { CRITERIA } = await import("../../src/engine/criteria");
    for (const c of CRITERIA) {
      expect(c.evidence ?? "", c.id).not.toMatch(/reentsPortfolioStatus/);
    }
  });
});
