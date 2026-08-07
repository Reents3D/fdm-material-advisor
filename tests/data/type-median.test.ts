/**
 * Der Werkstoffwert muss der Median seiner Blätter BLEIBEN (ADR-042).
 *
 * WORUM ES GEHT
 * Bis 2026-08-07 war der Kennwert eines Werkstofftyps das, was zufällig zuerst importiert
 * wurde — 199 von 288 trugen `src_bambu_tds`, während für PETG siebzehn Blätter im
 * Repository lagen. `scripts/derive-mechanics.mjs` fasst sie jetzt zusammen.
 *
 * WAS DIESER TEST HÄLT
 * Eine Ableitung, die nur beim Ausführen stimmt, ist keine. Sobald jemand einen Wert von
 * Hand ändert, ein Blatt nachträgt oder ein Importskript einen Werkstoff neu schreibt,
 * driftet die Werkstoffebene wieder von der Produktebene weg — und zwar lautlos, weil das
 * Ergebnis schemakonform und plausibel bleibt. Genau die Sorte Verlust, gegen die schon
 * `inventory-floor.test.ts` angetreten ist.
 *
 * Der Test rechnet die Ableitung deshalb NACH, mit derselben Funktion, die sie schreibt.
 * Er prüft nicht Zahlen, die jemand hier abgeschrieben hat, sondern die Übereinstimmung
 * zweier Ebenen, die auseinanderlaufen können.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
// @ts-expect-error - Ableitungsskript ohne Typdeklaration, bewusst als einzige Quelle der Regel
import { pool, FIELDS, SRC_ID, MIN_AGGREGATE, MIN_FOR_QUARTILES, CORE_REFUSE, SPREAD_REMARK } from "../../scripts/derive-mechanics.mjs";

const ROOT = path.resolve(__dirname, "../..");
const load = (dir: string) =>
  readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(ROOT, dir, f), "utf8")));

const materials = load("data/materials");
const products = load("data/products");
const byMaterial = new Map<string, unknown[]>();
for (const p of products) {
  if (!byMaterial.has(p.materialId)) byMaterial.set(p.materialId, []);
  byMaterial.get(p.materialId)!.push(p);
}

const round = (x: number) => (Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 100) / 100);

/** Jeder Knoten, der aus dem Blätterabgleich stammt, mit seinem Pfad. */
const derived: { id: string; group: string; field: string; node: Record<string, number | string> }[] = [];
for (const m of materials) {
  for (const [group, field] of FIELDS as [string, string][]) {
    const node = m[group]?.[field];
    if (node?.source === SRC_ID) derived.push({ id: m.id, group, field, node });
  }
}

describe("Werkstoffwert gegen Produktblätter", () => {
  it("es gibt überhaupt zusammengefasste Werte", () => {
    // Sonst prüfte alles Folgende eine leere Menge und wäre grün ohne Aussage.
    expect(derived.length).toBeGreaterThanOrEqual(200);
  });

  it("jeder zusammengefasste Wert ist der Median seiner vergleichbaren Blätter", () => {
    const drift: string[] = [];
    for (const d of derived) {
      const pl = pool(byMaterial.get(d.id) ?? [], d.field);
      if (!pl) { drift.push(`${d.id} ${d.field}: kein Blatt mehr, Wert steht aber noch`); continue; }
      if (round(pl.med) !== d.node.value) {
        drift.push(`${d.id} ${d.field}: geführt ${d.node.value}, Median der ${pl.n} Blätter ${round(pl.med)}`);
      }
    }
    expect(drift).toEqual([]);
  });

  it("die Spanne sind die beobachteten Extreme und enthält den Wert", () => {
    const bad: string[] = [];
    for (const d of derived) {
      const pl = pool(byMaterial.get(d.id) ?? [], d.field);
      if (!pl || pl.n < 2) continue;
      const { min, max, value } = d.node as { min?: number; max?: number; value: number };
      if (min === undefined || max === undefined) { bad.push(`${d.id} ${d.field}: Spanne fehlt`); continue; }
      if (min > value || max < value) bad.push(`${d.id} ${d.field}: ${value} liegt ausserhalb ${min}–${max}`);
      if (round(pl.min) < min || round(pl.max) > max) {
        bad.push(`${d.id} ${d.field}: Spanne ${min}–${max} schneidet Blätter ab (${round(pl.min)}–${round(pl.max)})`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("ein Median über Marken behauptet nie `high`", () => {
    /* Er ist eine Aussage über den TYP; keine einzelne Messung deckt ihn. Das Ceiling der
       Quelle steht auf `medium`, dieser Test hält es unabhängig davon fest. */
    expect(derived.filter((d) => d.node.confidence === "high").map((d) => `${d.id} ${d.field}`)).toEqual([]);
  });

  it("wer die Quelle benutzt, deklariert sie auch — mit Ceiling `medium`", () => {
    const bad: string[] = [];
    for (const m of materials) {
      const uses = (FIELDS as [string, string][]).some(([g, f]) => m[g]?.[f]?.source === SRC_ID);
      const decl = (m.governance?.sources ?? []).find((s: { id: string }) => s.id === SRC_ID);
      if (uses && !decl) bad.push(`${m.id}: benutzt ${SRC_ID}, deklariert sie nicht`);
      if (!uses && decl) bad.push(`${m.id}: deklariert ${SRC_ID} ohne sie zu benutzen`);
      if (decl && decl.confidenceCeiling !== "medium") bad.push(`${m.id}: Ceiling ${decl.confidenceCeiling}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("Was nicht zusammen gemittelt wird", () => {
  it("Spritzguss kommt nie in einen Pool, der gedruckte Prüfkörper hat", () => {
    const bad: string[] = [];
    for (const [id, prods] of byMaterial) {
      for (const [, field] of FIELDS as [string, string][]) {
        const pl = pool(prods, field);
        if (!pl) continue;
        const moulded = pl.cand.filter((c: { p: { specimenType: string } }) => c.p.specimenType === "moulded");
        if (moulded.length && moulded.length < pl.n) bad.push(`${id} ${field}: ${moulded.length} Spritzguss im Pool`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("ISO 37 kommt nie in einen Zugpool, der eine andere Norm hat", () => {
    const bad: string[] = [];
    for (const [id, prods] of byMaterial) {
      for (const field of ["tensileStrengthXy", "tensileModulusXy", "elongationAtBreakXy"]) {
        const pl = pool(prods, field);
        if (!pl) continue;
        const iso37 = pl.cand.filter((c: { n: { testStandard?: string } }) => /ISO\s*37\b/i.test(c.n.testStandard ?? ""));
        if (iso37.length && iso37.length < pl.n) bad.push(`${id} ${field}: ISO 37 gemischt`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("eine bestrittene Zahl zieht keinen Median zu sich", () => {
    /* `disputed` heisst: Die Zahl widerspricht ihrem eigenen Umfeld so deutlich, dass sie
       nicht mitgerechnet werden darf — Extrudrs 220 kJ/m² gekerbte Izod-Schlagzähigkeit
       für ABS ist zehnmal der ungekerbte Wert desselben Polymers. Sie BLEIBT im Datensatz
       und in der Oberfläche; sie darf nur in keinem Pool auftauchen. */
    const bad: string[] = [];
    let seen = 0;
    for (const [id, prods] of byMaterial) {
      for (const [, field] of FIELDS as [string, string][]) {
        const pl = pool(prods, field);
        if (!pl) continue;
        for (const c of pl.cand as { p: { id: string }; n: { disputed?: boolean } }[]) {
          if (c.n.disputed) bad.push(`${id} ${field}: ${c.p.id}`);
        }
      }
      for (const p of prods as { properties?: Record<string, { disputed?: boolean }> }[]) {
        seen += Object.values(p.properties ?? {}).filter((v) => v?.disputed).length;
      }
    }
    expect(seen, "keine bestrittene Zahl im Bestand - der Test prüfte eine leere Menge")
      .toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });

  it("wo die Mitte auseinanderläuft, steht keine zusammengefasste Zahl", () => {
    /* Die Umkehrung der Regel: Ein Pool, dessen mittleres Viertel um mehr als Faktor 4
       streut (bzw. der unter sechs Blättern eine ganze Grössenordnung), beschreibt zwei
       Rezepturen. Dort darf kein `src_type_datasheets` stehen. */
    const bad: string[] = [];
    for (const d of derived) {
      const pl = pool(byMaterial.get(d.id) ?? [], d.field);
      if (!pl || pl.n < MIN_AGGREGATE) continue;
      const incoherent = pl.n >= MIN_FOR_QUARTILES ? pl.core > CORE_REFUSE : pl.spread > SPREAD_REMARK;
      if (incoherent) bad.push(`${d.id} ${d.field}: Mitte Faktor ${pl.core.toFixed(1)}`);
    }
    expect(bad).toEqual([]);
  });

  it("eine weite Spanne trägt immer ihre offene Frage", () => {
    const missing: string[] = [];
    for (const m of materials) {
      const ids = new Set((m.governance?.openQuestions ?? []).map((q: { id: string }) => q.id));
      for (const [, field] of FIELDS as [string, string][]) {
        const pl = pool(byMaterial.get(m.id) ?? [], field);
        if (!pl || pl.n < MIN_AGGREGATE || pl.spread <= SPREAD_REMARK) continue;
        const qid = `oq_spread_${field.toLowerCase()}`;
        if (!ids.has(qid)) missing.push(`${m.id} ${field}: Faktor ${pl.spread.toFixed(1)} ohne ${qid}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
