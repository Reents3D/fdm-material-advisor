/**
 * Die Datengrundlage darf nicht unbemerkt schlechter werden.
 *
 * Dieses Werkzeug waechst durch Importe, und ein Import ist immer eine Versuchung: Ein
 * Blatt ohne Pruefnormen liefert dreissig Zahlen, und dreissig Zahlen sehen nach
 * Fortschritt aus. Sie sind aber nur dann Fortschritt, wenn der Anteil belastbarer
 * Werte dabei nicht faellt.
 *
 * Der Bericht steht bewusst als TEST und nicht als eigenes Skript: So liest er die
 * Einstufung aus `src/lib/evidence.ts` statt sie ein zweites Mal zu formulieren. Eine
 * Regel, die an zwei Stellen steht, driftet - das ist in diesem Projekt schon zweimal
 * passiert (Kappung von Listen aus der URL, Bundle-Budget).
 *
 * DIE SCHWELLEN SIND UNTERGRENZEN, KEINE ZIELE
 * Sie liegen knapp unter dem Stand vom 2026-08-05. Wer sie reisst, hat entweder
 * schlechte Daten importiert oder die Einstufung geaendert - beides gehoert gesehen,
 * bevor es in `main` liegt. Wer sie deutlich uebertrifft, zieht sie nach.
 */

import { describe, expect, it } from "vitest";
import { MATERIALS } from "../../src/data/materials";
import { PRODUCTS } from "../../src/data/products";
import { evidenceGrade, tally, type Graded } from "../../src/lib/evidence";

/** Druckparameter sind Herstellerempfehlungen, keine Messungen - sie tragen nie eine Norm. */
const PROCESS_FIELDS = new Set([
  "nozzleTemperature", "bedTemperature", "chamberTemperature", "dryingTemperature",
  "dryingTime", "printSpeed", "coolingFanPct", "minNozzleDiameter", "maxOverhangAngle",
  "maxResidualHumidity",
]);

const isValue = (v: unknown): v is Graded =>
  !!v && typeof v === "object" && "confidence" in (v as object);

/** Alle Messwerte der Produktebene - ohne die Druckparameter. */
function productMeasurements(): Graded[] {
  const out: Graded[] = [];
  for (const p of PRODUCTS) {
    for (const [k, v] of Object.entries(p.properties ?? {})) {
      if (PROCESS_FIELDS.has(k) || !isValue(v)) continue;
      out.push(v);
    }
  }
  return out;
}

/** Alle provenienzbehafteten Werte eines Werkstoffs, ueber alle Feldgruppen. */
function materialValues(): Graded[] {
  const out: Graded[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (isValue(node)) { out.push(node); return; }
    for (const v of Object.values(node)) walk(v);
  };
  for (const m of MATERIALS) {
    for (const [group, node] of Object.entries(m)) {
      if (group === "governance") continue;      // Quellenangaben sind keine Messwerte
      walk(node);
    }
  }
  return out;
}

describe("Datengrundlage", () => {
  it("haelt den Anteil belastbarer Messwerte auf der Produktebene", () => {
    const t = tally(productMeasurements());
    /* Stand 2026-08-05: 1.387 von 1.775 (78 %). Untergrenze 70 %. */
    expect(t.total).toBeGreaterThan(1500);
    expect(t.robustShare).toBeGreaterThanOrEqual(70);
  });

  it("laesst die Zahl belastbarer Messwerte nicht schrumpfen", () => {
    /* Der Anteil allein genuegt nicht: Wer die schwachen Werte loescht, verbessert ihn,
       ohne dass ein einziger Beleg dazugekommen waere. */
    const t = tally(productMeasurements());
    expect(t.verified).toBeGreaterThanOrEqual(1300);
  });

  it("kennzeichnet jede Schaetzung als solche und nicht als schwache Messung", () => {
    /* Auf der Werkstoffebene sind die Fuenferskalen die Mehrheit. Sie duerfen niemals
       als `weak` durchgehen - `weak` bedeutet "haette eine Norm haben sollen". */
    const estimated = materialValues().filter((v) => v.confidence === "estimated");
    expect(estimated.length).toBeGreaterThan(1000);
    for (const v of estimated) expect(evidenceGrade(v)).toBe("editorial");
  });

  it("nennt fuer jeden belastbaren Wert eine Pruefnorm", () => {
    /* Die Definition selbst, gegen die echten Daten gehalten: Wenn hier je ein Wert
       ohne Norm als belastbar durchkaeme, waere die Einstufung kaputt. */
    const robust = [...productMeasurements(), ...materialValues()]
      .filter((v) => evidenceGrade(v) === "verified");
    expect(robust.length).toBeGreaterThan(0);
    for (const v of robust) expect(v.testStandard, JSON.stringify(v)).toBeTruthy();
  });
});
