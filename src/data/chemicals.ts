/**
 * Medienregister. Einzige Quelle für Bezeichnung, Beispiele und Wirkung — vorher standen
 * die Namen doppelt im Assistenten und in der Detailansicht.
 *
 * DIE ABDECKUNG IST TEIL DER INFORMATION
 * Für acht der achtzehn Medien liegt genau ein belegter Werkstoffwert vor. Wer so ein
 * Medium auswählt, filtert faktisch nach Datenlage und nicht nach Beständigkeit. Die
 * Oberfläche muss das zeigen, sonst erzeugt der Filter Vertrauen, das er nicht verdient.
 */

import register from "../../data/chemicals.json";
import { MATERIALS } from "./materials";
import type { I18nText } from "../engine/types";

export interface Chemical {
  id: string;
  name: I18nText;
  category: "wasser" | "oel" | "loesemittel" | "kraftstoff" | "reiniger" | "saeure-lauge";
  examples: I18nText;
  effect: I18nText;
  /** 1 = schliesst kaum etwas aus, 5 = schliesst fast alles aus. Nur Erwartungsmanagement. */
  aggressiveness: number;
  concentration?: I18nText;
  note?: I18nText;
}

export const CHEMICALS: Chemical[] = (register as { chemicals: Chemical[] }).chemicals;

export const CHEMICAL_CATEGORIES = [
  { id: "wasser", de: "Wasser und Dampf", en: "Water and steam" },
  { id: "oel", de: "Öle und Schmierstoffe", en: "Oils and lubricants" },
  { id: "kraftstoff", de: "Kraftstoffe", en: "Fuels" },
  { id: "loesemittel", de: "Lösemittel", en: "Solvents" },
  { id: "reiniger", de: "Reiniger und Desinfektion", en: "Cleaners and disinfectants" },
  { id: "saeure-lauge", de: "Säuren und Laugen", en: "Acids and alkalis" },
] as const;

export const chemicalById = (id: string) => CHEMICALS.find((c) => c.id === id);

/** Wie viele Werkstoffe tragen zu diesem Medium überhaupt einen belegten Wert. */
const COVERAGE: Record<string, number> = (() => {
  const c: Record<string, number> = {};
  for (const m of MATERIALS) {
    const list = (m.durability as { chemicalResistance?: { chemicalId: string }[] } | undefined)?.chemicalResistance;
    for (const e of list ?? []) c[e.chemicalId] = (c[e.chemicalId] ?? 0) + 1;
  }
  return c;
})();

export const chemicalCoverage = (id: string) => COVERAGE[id] ?? 0;
export const MATERIAL_COUNT = MATERIALS.length;

/**
 * Unter diesem Anteil ist die Datenlage zu dünn, um aus dem Filter eine belastbare
 * Aussage zu machen. Der Wert ist bewusst als Konstante benannt und nicht im JSX
 * versteckt, damit die Schwelle diskutierbar bleibt.
 */
export const THIN_DATA_RATIO = 0.5;
export const isThinData = (id: string) => chemicalCoverage(id) < MATERIAL_COUNT * THIN_DATA_RATIO;
