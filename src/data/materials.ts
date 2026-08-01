/**
 * Data loading. Kept out of src/engine on purpose: the engine takes materials as an
 * argument so it can also run against an Odoo dataset or a filtered subset.
 */

import type { Material } from "../engine/types";

const modules = import.meta.glob("../../data/materials/*.json", { eager: true, import: "default" });

export const MATERIALS: Material[] = (Object.values(modules) as Material[]).sort((a, b) =>
  a.id.localeCompare(b.id),
);

export const byId = (id: string): Material | undefined => MATERIALS.find((m) => m.id === id);

export const FAMILIES = [...new Set(MATERIALS.map((m) => m.identity.family))].sort();
