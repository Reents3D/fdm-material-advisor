/**
 * Data loading. Kept out of src/engine on purpose: the engine takes materials as an
 * argument so it can also run against an Odoo dataset or a filtered subset.
 *
 * ZWEI BUENDEL STATT EINEM
 * Geladen wird nicht mehr `data/materials/*.json` direkt, sondern der von
 * `scripts/build-data-chunks.mjs` erzeugte KERN — dieselben Daten ohne die zweisprachigen
 * Notiztexte. Die machen 48 % der Rohdaten aus, und die Engine liest keine einzige davon:
 * Sie rechnet mit Zahlen, Skalen und Konfidenzen. Notizen werden an vier Stellen gelesen
 * (Datenblatt, Brandschutzansicht, Chemikalienmatrix, CSV-Export), und alle vier sind
 * Ziele, die der Besucher ansteuert — keine, die er beim ersten Bild sieht.
 *
 * Gemessen: Erstaufruf 305,5 -> 200,0 kB gzip. Nachgeladen wird über `material-notes.ts`.
 *
 * Kanonisch bleibt `data/materials/*.json`. Die erzeugten Dateien stehen nicht im Git;
 * die npm-Hooks `pretypecheck`, `pretest` und `prebuild` legen sie an.
 */

import type { Material } from "../engine/types";
import { expand, type I18nBlock } from "./intern";
import core from "./generated/materials.json";

export const MATERIALS: Material[] = expand<Material[]>(core as unknown as { t: I18nBlock[]; d: unknown })
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id));

export const byId = (id: string): Material | undefined => MATERIALS.find((m) => m.id === id);

export const FAMILIES = [...new Set(MATERIALS.map((m) => m.identity.family))].sort();
