/**
 * The honesty valve: when FDM is the wrong process, say so.
 *
 * A material advisor that only ever recommends materials will happily send someone
 * down a road that cannot work. These rules fire on requirements that FDM cannot meet
 * regardless of material choice, and name the process that can.
 */

import type { ProcessHint, Requirements } from "./types";

/** Thinnest wall an 0.4 mm nozzle produces reliably, in mm. */
const MIN_WALL_MM = 0.8;
/** Best surface roughness achievable as-printed, in µm Ra. Below this needs post-processing or another process. */
const BEST_RA_UM = 6;
/** Above this quantity, tooling usually beats printing on unit cost. */
const SERIES_THRESHOLD = 1000;

export function processHints(req: Requirements): ProcessHint[] {
  const out: ProcessHint[] = [];

  if (req.minWallThicknessMm != null && req.minWallThicknessMm < MIN_WALL_MM) {
    out.push({
      key: "process.thinWall",
      params: { required: req.minWallThicknessMm, minimum: MIN_WALL_MM },
      suggestedProcesses: ["SLA", "SLS", "MJF"],
    });
  }

  if (req.requiresWatertight) {
    out.push({
      key: "process.watertight",
      params: {},
      suggestedProcesses: ["SLA", "SLS", "Vakuumguss", "CNC"],
    });
  }

  if (req.requiresIsotropic) {
    out.push({
      key: "process.isotropic",
      params: {},
      suggestedProcesses: ["SLS", "MJF", "CNC", "Vakuumguss"],
    });
  }

  if (req.surfaceRaUm != null && req.surfaceRaUm < BEST_RA_UM) {
    out.push({
      key: "process.surface",
      params: { required: req.surfaceRaUm, achievable: BEST_RA_UM },
      suggestedProcesses: ["SLA", "CNC", "FDM + Veredelung"],
    });
  }

  if (req.quantity != null && req.quantity > SERIES_THRESHOLD) {
    out.push({
      key: "process.series",
      params: { quantity: req.quantity, threshold: SERIES_THRESHOLD },
      suggestedProcesses: ["Spritzguss", "Vakuumguss"],
    });
  }

  /* Temperature beyond anything in reach of a shop-floor FDM machine. */
  if (req.serviceTemperatureC != null && req.serviceTemperatureC > 200) {
    out.push({
      key: "process.temperature",
      params: { required: req.serviceTemperatureC },
      suggestedProcesses: ["PEEK/PEI auf Hochtemperaturanlage", "CNC aus Halbzeug", "Metall"],
    });
  }

  /* Food contact plus FDM is a structural problem, not a material problem. */
  if (req.foodContact) {
    out.push({
      key: "process.foodContact",
      params: {},
      suggestedProcesses: ["SLA (dicht)", "CNC", "Beschichtung", "Lebensmittelechter Überzug"],
    });
  }

  return out;
}
