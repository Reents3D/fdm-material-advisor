/**
 * Datenvollständigkeit. Ausgelagert aus index.ts, damit der CSV-Export sie auch
 * ausserhalb des Browsers berechnen kann: index.ts importiert erweiterungslos und
 * lässt sich deshalb nicht direkt von Node laden, diese Datei mit ihrem reinen
 * Typimport schon. So steht in der heruntergeladenen und der in der CI erzeugten
 * Tabelle garantiert dieselbe Zahl.
 */

import type { Material } from "./types.ts";

/** Prozentsatz des belegten Kernfeldbestands. Spiegelt DATA_MODEL.md §7. */
const CORE_FIELDS: [string, number][] = [
  ["mechanics.tensileStrengthXy", 3], ["mechanics.tensileModulusXy", 3], ["thermal.hdtB", 3],
  ["processing.nozzleTemperature", 3], ["processing.bedTemperature", 3],
  ["processing.chamberRequirement", 3], ["processing.printability", 3],
  ["commercial.pricePerKg", 3], ["identity.abstract", 3], ["identity.positioning", 3],
  ["mechanics.tensileStrengthZ", 2], ["mechanics.anisotropyFactorTensile", 2],
  ["mechanics.elongationAtBreakXy", 2], ["mechanics.density", 2],
  ["thermal.glassTransition", 2], ["thermal.hdtA", 2],
  ["processing.hygroscopy", 2], ["processing.warpingTendency", 2], ["processing.abrasiveness", 2],
  ["durability.uvResistance", 2], ["durability.chemicalResistance", 2],
  ["compliance.foodContact.status", 2], ["compliance.flameRetardancy.ul94", 2],
  ["commercial.availability", 2], ["commercial.xxl.maxSensibleEdgeMm", 2],
  ["finishing.paintAdhesion", 2], ["finishing.surfaceQuality", 2],
];

export const dig = (obj: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);

export function dataCompleteness(m: Material): number {
  let have = 0;
  let total = 0;
  for (const [path, weight] of CORE_FIELDS) {
    total += weight;
    const v = dig(m, path);
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) { if (v.length) have += weight; continue; }
    if (typeof v === "object" && "value" in (v as object)) {
      if ((v as { value: unknown }).value !== null) have += weight;
      continue;
    }
    have += weight;
  }
  return Math.round((have / total) * 100);
}
