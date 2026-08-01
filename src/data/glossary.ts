/** Glossar. Siehe scripts/import/glossary.mjs. */

import register from "../../data/glossary.json";
import type { I18nText } from "../engine/types";

export interface Term {
  id: string;
  term: I18nText;
  aliases?: string[];
  category: "mechanik" | "thermik" | "pruefung" | "verarbeitung" | "regulatorik" | "methodik";
  unit?: string;
  /** Ein Satz: was ist das. */
  short: I18nText;
  /** Warum es für die Werkstoffwahl zählt. */
  detail: I18nText;
  /** Der verbreitete Irrtum — der eigentliche Grund, warum dieser Eintrag existiert. */
  pitfall?: I18nText;
  seeAlso?: string[];
}

export const GLOSSARY: Term[] = (register as { terms: Term[] }).terms;

export const GLOSSARY_CATEGORIES = [
  { id: "mechanik", de: "Mechanik", en: "Mechanics" },
  { id: "thermik", de: "Temperatur", en: "Temperature" },
  { id: "pruefung", de: "Prüfung und Vergleichbarkeit", en: "Testing and comparability" },
  { id: "verarbeitung", de: "Verarbeitung", en: "Processing" },
  { id: "regulatorik", de: "Regulatorik", en: "Regulatory" },
  { id: "methodik", de: "Methodik dieses Werkzeugs", en: "Method of this tool" },
] as const;

export const termById = (id: string) => GLOSSARY.find((x) => x.id === id);
