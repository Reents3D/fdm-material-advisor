/**
 * ADR-040 — was eine schwach belegte Angabe im Ranking wert sein darf.
 *
 * Die Regel ist klein, aber sie greift in jede Rangfolge ein. Geprüft wird deshalb
 * nicht nur, dass sie rechnet, sondern auch, dass sie an den drei Stellen aufhört,
 * an denen sie aufhören muss: bei guten Belegen, unterhalb des Mittelfelds, und bei
 * Kriterien, für die nie eine Verlässlichkeit gemessen wurde.
 */

import { describe, expect, it } from "vitest";
import { MATERIALS } from "../../src/data/materials";
import { select } from "../../src/engine";
import { buildNormalisation, scoreMaterial } from "../../src/engine/scoring";
import { CRITERIA, DEFAULT_WEIGHTS } from "../../src/engine/criteria";
import { NEUTRAL, RELIABILITY, creditable, reliabilityOf } from "../../src/engine/reliability";
import { translate } from "../../src/i18n";
import type { Confidence } from "../../src/engine/types";

describe("Stauchung schwacher Belege", () => {
  it("stutzt nur den Vorsprung, nie den Rückstand", () => {
    /* Geprüft wird die FORMEL, nicht die Konstante: Die Verlässlichkeit wird
       nachgemessen, sobald die Erhebung wächst (ADR-040), und ein Test, der die Zahl
       zweitschreibt, wäre bei jeder Nachkalibrierung rot - ohne dass etwas kaputt ist. */
    const rel = RELIABILITY.price!.low!;
    const good = creditable("price", "low", 0.9);
    expect(good.discounted).toBe(true);
    expect(good.score).toBeCloseTo(NEUTRAL + rel * 0.4, 6);
    expect(rel).toBeGreaterThan(0);
    expect(rel).toBeLessThan(1);

    /* Ein schlecht belegter SCHLECHTER Wert bleibt schlecht. Eine Stauchung nach oben
       wäre der Freifahrtschein, den ADR-006 für fehlende Daten ausschliesst: Wer bei
       einem Kriterium schwach dasteht, dürfte sich sonst mit dünnen Belegen aus der
       Abwertung herausretten. */
    const bad = creditable("price", "low", 0.2);
    expect(bad.score).toBe(0.2);
    expect(bad.discounted).toBe(false);
  });

  it("lässt gut belegte Werte unangetastet", () => {
    for (const c of ["medium", "high"] as Confidence[]) {
      expect(creditable("price", c, 0.95)).toEqual({ score: 0.95, discounted: false });
    }
  });

  it("greift nicht bei Kriterien ohne gemessene Verlässlichkeit", () => {
    /* Für Festigkeit, Steifigkeit, Wärmeformbeständigkeit und Zähigkeit findet
       `measure-price-reliability.mjs` NULL Übergänge von Schätzung auf Messung. Ein
       Abschlag dort wäre geraten. */
    for (const id of ["strength", "stiffness", "temperature", "toughness", "printability"]) {
      expect(reliabilityOf(id, "estimated"), id).toBeNull();
      expect(creditable(id, "estimated", 0.95).score, id).toBe(0.95);
    }
  });

  it("die Zahl am Wert bleibt der Messwert, nur der Score wird gedämpft", () => {
    const table = buildNormalisation(MATERIALS);
    const hit = MATERIALS.map((m) => scoreMaterial(m, { weights: DEFAULT_WEIGHTS }, table))
      .flatMap((s) => s.criteria)
      .find((c) => c.discounted);
    expect(hit, "kein einziger Wert wird gestaucht - die Regel läuft ins Leere").toBeDefined();
    expect(hit!.raw).toBeGreaterThan(0);
    expect(hit!.score).toBeLessThan(1);
  });
});

describe("Die Stauchung ist erklärt, nicht nur gerechnet", () => {
  it("jede gemessene Verlässlichkeit hat einen Satz in beiden Sprachen", () => {
    for (const [criterionId, byConfidence] of Object.entries(RELIABILITY)) {
      for (const confidence of Object.keys(byConfidence)) {
        const key = `risk.thinEvidence.${criterionId}.${confidence}`;
        for (const lang of ["de", "en"] as const) {
          const text = translate(lang, key, { value: 42 });
          expect(text, `${key} fehlt in ${lang}`).not.toContain("⟨");
          expect(text).toContain("42");
        }
      }
    }
  });

  it("ein gestauchter Werkstoff trägt den Hinweis in seinen Erläuterungen", () => {
    const r = select(MATERIALS, { weights: { ...DEFAULT_WEIGHTS, price: 5 } });
    const withHint = r.ranked.filter((rec) =>
      rec.explanations.some((e) => e.key.startsWith("risk.thinEvidence.")));
    expect(withHint.length).toBeGreaterThan(0);

    for (const rec of withHint) {
      const c = rec.criteria.find((x) => x.discounted)!;
      expect(c, rec.material.id).toBeDefined();
      expect(["estimated", "low"]).toContain(c.confidence);
    }
  });
});

describe("Was die Regel bewusst NICHT tut", () => {
  /* Die Regel ist als "erhobene Preise sollen Schätzungen schlagen" begonnen worden.
     Die eigene Historie hat das widerlegt: Von 35 ersetzten Schätzpreisen waren 24 zu
     TEUER, nicht zu billig - Schätzungen verschaffen hier keinen Vorteil. Zu billig war
     systematisch der EINZELFUND beim Händler. Eine Rangregel "Erhebung vor Schätzung"
     hätte also genau die schwächere Zahl bevorzugt.

     Dieser Test hält fest, dass die Regel diese Rangfolge NICHT erzwingt. Er ist da,
     damit niemand sie später "nachbessert", ohne die Messung noch einmal zu machen. */
  it("erzwingt keine Rangfolge erhoben-vor-geschätzt", () => {
    const table = buildNormalisation(MATERIALS);
    const price = CRITERIA.find((c) => c.id === "price")!;

    const scoreOf = (id: string) => {
      const m = MATERIALS.find((x) => x.id === id)!;
      const s = scoreMaterial(m, { weights: { price: 1 } }, table);
      return s.criteria.find((c) => c.criterionId === "price")!;
    };
    const pp = scoreOf("pp");
    const obc = scoreOf("obc");

    expect(price.extract(MATERIALS.find((m) => m.id === "pp")!).confidence).toBe("low");
    expect(price.extract(MATERIALS.find((m) => m.id === "obc")!).confidence).toBe("estimated");

    /* Beide liegen unter dem Mittelfeld - beide sind teuer. Die Stauchung greift bei
       keinem, und OBCs Schätzung darf vor PPs Einzelangebot liegen bleiben: Es gibt
       keinen Messwert, der PPs 0,6-kg-Einzelfund für belastbarer erklärt. */
    expect(pp.score!).toBeLessThan(NEUTRAL);
    expect(obc.score!).toBeLessThan(NEUTRAL);
    expect(pp.discounted).toBeUndefined();
    expect(obc.discounted).toBeUndefined();
  });
});
