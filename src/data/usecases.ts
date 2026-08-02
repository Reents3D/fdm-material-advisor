/** Anwendungsfälle mit vorbefülltem Anforderungsprofil. Siehe scripts/import/usecases.mjs. */

import type { I18nText, Requirements } from "../engine/types";

export interface UseCase {
  schemaVersion: string;
  id: string;
  group: "mechanik" | "thermik" | "umgebung" | "regulatorik" | "fertigung" | "optik";
  title: I18nText;
  context: I18nText;
  requirements: Requirements;
  /** Je gesetztem Anforderungsfeld eine Begründung. Ohne sie wäre das Profil eine Blackbox. */
  rationale: Record<string, I18nText>;
  caveat?: I18nText;
  governance: { lastReviewed: string; reviewedBy: string };
}

const modules = import.meta.glob("../../data/usecases/*.json", { eager: true, import: "default" });

export const USECASES: UseCase[] = (Object.values(modules) as UseCase[]).sort((a, b) =>
  a.group.localeCompare(b.group) || a.id.localeCompare(b.id));

export const USECASE_GROUPS = [
  { id: "mechanik", de: "Mechanik", en: "Mechanics" },
  { id: "thermik", de: "Temperatur", en: "Temperature" },
  { id: "umgebung", de: "Umgebung", en: "Environment" },
  { id: "regulatorik", de: "Regulatorik", en: "Regulatory" },
  { id: "fertigung", de: "Fertigung", en: "Manufacturing" },
  { id: "optik", de: "Optik", en: "Appearance" },
] as const;

/**
 * Anforderungsprofil in Hash-Parameter übersetzen.
 * Muss zu `paramsFromState` in src/App.tsx passen — deshalb liegt die Abbildung hier
 * an einer Stelle und nicht verstreut in der Ansicht.
 */
export function useCaseParams(u: UseCase, lang: string): string {
  const p = new URLSearchParams();
  const r = u.requirements;
  const set = (k: string, v: unknown) => { if (v != null) p.set(k, String(v)); };

  set("temp", r.serviceTemperatureC);
  set("years", r.outdoorYears);
  set("edge", r.maxEdgeMm);
  set("minStrength", r.minTensileStrengthMPa);
  set("flame", r.flameClass);
  for (const [key, val] of [["chamber", r.chamberAvailable], ["nozzle", r.hardenedNozzleAvailable],
    ["oven", r.annealingOvenAvailable], ["food", r.foodContact], ["esd", r.esd]] as const) {
    if (val !== undefined) p.set(key, val ? "1" : "0");
  }
  if (r.flexible === true) p.set("flex", "1");
  if (r.flexible === false) p.set("rigid", "1");
  if (r.chemicals?.length) p.set("chem", r.chemicals.join(","));
  /* Die Gewichte eines Anwendungsfalls sind ein VOLLSTAENDIGES Profil, keine Abweichung
     vom Standard. "Lehre und Messmittel" schreibt Steifigkeit 5, Chemie 4, Preis 1 - und
     sagt im Kontext ausdruecklich, dass die Festigkeit hier gerade NICHT entscheidet.
     Wuerde die App DEFAULT_WEIGHTS darunterlegen, bekaeme die Festigkeit eine 3 und der
     Fall saegte das Gegenteil seiner eigenen Begruendung.
     Gemessen: 16 der 20 Faelle bekommen je nach Lesart einen anderen Sieger. */
  for (const [k, v] of Object.entries(r.weights ?? {})) p.set(`w.${k}`, String(v));
  if (r.weights) p.set("wexact", "1");
  if (lang !== "de") p.set("lang", lang);
  p.set("uc", u.id);
  return p.toString();
}
