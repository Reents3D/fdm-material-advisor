/**
 * Wo ist die Rangfolge Rauschen? Deckung und Konfidenz je Bewertungskriterium.
 *
 * Ein fehlender Wert kostet den Werkstoff laut ADR-006 den Platz vor jedem belegten
 * Treffer - er ist damit teurer als ein schwacher Wert. Dieser Bericht sagt, wo das
 * flaechendeckend passiert, und ist die Grundlage dafuer, welche Luecke sich zu
 * schliessen lohnt. Er schreibt nichts, er zaehlt nur.
 *
 *   node scripts/coverage-report.mjs
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "data/materials";
const MATS = readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")));

const node = (m, group, field) => m[group]?.[field];
const val = (n) => (n && typeof n === "object" && ("unit" in n || "scale" in n) ? n : undefined);

/** Dieselben Zugriffe wie src/engine/criteria.ts - bewusst per Hand gespiegelt,
    damit der Bericht ohne Buendel-Bau und ohne TS-Laufzeit funktioniert. */
const CRITERIA = [
  ["strength", (m) => val(node(m, "mechanics", "tensileStrengthXy"))],
  ["stiffness", (m) => val(node(m, "mechanics", "tensileModulusXy"))],
  ["layerAdhesion", (m) => val(node(m, "mechanics", "anisotropyFactorTensile"))],
  ["toughness", (m) => val(node(m, "mechanics", "elongationAtBreakXy"))],
  ["temperature", (m) => val(node(m, "thermal", "hdtB")) ?? val(node(m, "thermal", "hdtA"))],
  ["outdoor", (m) => val(node(m, "durability", "uvResistance")) ?? val(node(m, "durability", "weatherResistance"))],
  ["chemical", (m) => {
    const l = (m.durability?.chemicalResistance ?? []).filter((c) => c.rating !== "unknown");
    return l.length ? { value: l.length, confidence: "low" } : undefined;
  }],
  ["printability", (m) => val(node(m, "processing", "printability"))],
  ["lowWarping", (m) => val(node(m, "processing", "warpingTendency"))],
  ["xxl", (m) => val(m.commercial?.xxl?.maxSensibleEdgeMm)],
  ["surface", (m) => val(node(m, "finishing", "surfaceQuality")) ?? val(node(m, "finishing", "layerLineVisibility"))],
  ["paintability", (m) => val(node(m, "finishing", "paintAdhesion"))],
  ["lightweight", (m) => val(node(m, "mechanics", "density"))],
  ["price", (m) => val(node(m, "commercial", "pricePerKg"))],
  ["availability", (m) => val(node(m, "commercial", "availability"))],
  ["sustainability", (m) => val(m.sustainability?.bioBasedContent)],
];

const ORDER = ["high", "medium", "low", "estimated"];
console.log(`${MATS.length} Werkstoffe\n`);
console.log("Kriterium         belegt  fehlt   high  med   low   est");

const gaps = new Map(MATS.map((m) => [m.id, []]));
for (const [id, get] of CRITERIA) {
  const conf = {};
  let have = 0;
  for (const m of MATS) {
    const n = get(m);
    if (!n || n.value === null || n.value === undefined) {
      if (!n) gaps.get(m.id).push(id);
      if (n && (n.value === null || n.value === undefined)) gaps.get(m.id).push(id);
      continue;
    }
    have++;
    conf[n.confidence ?? "—"] = (conf[n.confidence ?? "—"] ?? 0) + 1;
  }
  const cells = ORDER.map((k) => String(conf[k] ?? 0).padStart(5)).join(" ");
  console.log(
    `${id.padEnd(16)} ${String(have).padStart(4)}   ${String(MATS.length - have).padStart(4)}  ${cells}`,
  );
}

console.log("\nWerkstoffe mit den meisten Luecken:");
[...gaps]
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 14)
  .forEach(([id, list]) => {
    if (list.length) console.log(`  ${id.padEnd(12)} ${String(list.length).padStart(2)}  ${list.join(", ")}`);
  });
