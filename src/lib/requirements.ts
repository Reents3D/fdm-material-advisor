/**
 * Was der Nutzer gefordert hat - als lesbare, einzeln loesbare Liste.
 *
 * WARUM DAS HIER STEHT UND NICHT IM ASSISTENTEN
 * Diese Liste gab es schon, aber nur im Assistenten. Die Ergebnisseite sagte
 * "17 Materialien erfuellen die Anforderungen" und nannte die Anforderungen nicht -
 * weder die harten Filter noch den Schwerpunkt der Gewichtung. Wer den Link geteilt
 * bekam oder eine Stunde spaeter zurueckkam, sah eine Rangliste ohne Frage dazu.
 * Eine Empfehlung, deren Voraussetzungen man nicht mehr sieht, ist nicht nachvollziehbar,
 * und Nachvollziehbarkeit ist der einzige Grund, warum dieses Werkzeug existiert.
 *
 * Zwei Ansichten, eine Quelle: haette die Ergebnisseite ihre eigene Aufstellung bekommen,
 * waere sie beim naechsten neuen Anforderungsfeld stillschweigend unvollstaendig geworden.
 */

import { CRITERIA, DEFAULT_WEIGHTS } from "../engine/criteria";
import { chemicalById } from "../data/chemicals";
import { text } from "../components/ui";
import type { Requirements } from "../engine";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

export interface ActiveReq {
  id: string;
  label: string;
  /** Constraint-Kennung der Engine, damit die Sackgassenauskunft zuordnen kann. */
  constraintId?: string;
  /** Anwenden, um genau diese eine Anforderung zu loesen. */
  patch: (req: Requirements) => { req: Requirements; chemicals?: string[] };
}

/** Alles, was der Nutzer gesetzt hat - als entfernbare Liste. */
export function activeRequirements(
  req: Requirements, chemicals: string[], t: T, lang: Lang,
): ActiveReq[] {
  const out: ActiveReq[] = [];
  const drop = (f: keyof Requirements) => (r: Requirements) => ({ req: { ...r, [f]: undefined } });

  if (req.outdoorYears !== undefined) out.push({
    id: "outdoor", constraintId: "outdoor",
    label: t("wiz.chip.outdoor", { n: req.outdoorYears }), patch: drop("outdoorYears"),
  });
  if (req.serviceTemperatureC !== undefined) out.push({
    id: "temp", constraintId: "temperature",
    label: t("wiz.chip.temp", { n: req.serviceTemperatureC }), patch: drop("serviceTemperatureC"),
  });
  /* Die Lastannahme steht bewusst NEBEN der Temperatur und nicht in ihrem Text: Sie
     aendert, welche Zahl ueber den Werkstoff entscheidet (siehe engine/constraints.ts),
     und muss deshalb genauso sichtbar und genauso loesbar sein wie die Temperatur selbst. */
  if (req.thermalLoad !== undefined) out.push({
    id: "thermalLoad", constraintId: "temperature",
    label: t(`wiz.chip.load.${req.thermalLoad}`), patch: drop("thermalLoad"),
  });
  if (req.minTensileStrengthMPa !== undefined) out.push({
    id: "strength", constraintId: "strength",
    label: t("wiz.chip.strength", { n: req.minTensileStrengthMPa }), patch: drop("minTensileStrengthMPa"),
  });
  if (req.flexible) out.push({
    id: "flexible", constraintId: "flexible",
    label: t("wiz.chip.flexible"), patch: drop("flexible"),
  });
  if (req.maxEdgeMm !== undefined) out.push({
    id: "edge", constraintId: "size",
    label: t("wiz.chip.edge", { n: req.maxEdgeMm }), patch: drop("maxEdgeMm"),
  });
  if (req.quantity !== undefined) out.push({
    id: "qty", label: t("wiz.chip.qty", { n: req.quantity }), patch: drop("quantity"),
  });
  if (req.foodContact) out.push({
    id: "food", constraintId: "foodContact",
    label: t("wiz.6.food"), patch: drop("foodContact"),
  });
  if (req.flameClass) out.push({
    id: "flame", constraintId: "flameClass",
    label: t("wiz.6.flame"), patch: drop("flameClass"),
  });
  if (req.esd) out.push({
    id: "esd", constraintId: "esd", label: t("wiz.6.esd"), patch: drop("esd"),
  });
  for (const [f, key, cid] of [
    ["chamberAvailable", "wiz.chip.noChamber", "chamber"],
    ["hardenedNozzleAvailable", "wiz.chip.noNozzle", "nozzle"],
    ["annealingOvenAvailable", "wiz.chip.noOven", "annealing"],
  ] as const) {
    if (req[f] === false) out.push({ id: f, constraintId: cid, label: t(key), patch: drop(f) });
  }
  if (chemicals.length) out.push({
    id: "chemicals", constraintId: "chemicals",
    label: chemicals.map((c) => text(chemicalById(c)?.name, lang)).filter(Boolean).join(", "),
    patch: (r) => ({ req: { ...r, chemicals: undefined }, chemicals: [] }),
  });
  return out;
}

/* ---------------------------------------------------------------- Schwerpunkt */

/** Benannte Schwerpunkte statt sechzehn nackter Regler. */
export const PRESETS: { id: string; weights: Record<string, number> }[] = [
  { id: "balanced", weights: {} },
  { id: "mechanical", weights: { strength: 5, stiffness: 5, layerAdhesion: 4, toughness: 4, price: 1 } },
  { id: "thermal", weights: { temperature: 5, chemical: 4, strength: 3, price: 1 } },
  { id: "outdoor", weights: { outdoor: 5, temperature: 3, surface: 3, price: 1 } },
  { id: "visual", weights: { surface: 5, paintability: 5, layerAdhesion: 1, strength: 1 } },
  { id: "pragmatic", weights: { price: 5, printability: 5, availability: 4, lowWarping: 4 } },
];

/** Ein Schwerpunkt gilt als gewaehlt, wenn genau seine Abweichungen gesetzt sind. */
export function matchesPreset(
  weights: Record<string, number> | undefined, preset: Record<string, number>,
): boolean {
  const w = weights ?? {};
  return CRITERIA.every((c) => (w[c.id] ?? 0) === (preset[c.id] ?? DEFAULT_WEIGHTS[c.id] ?? 0));
}

/**
 * Wie die Reihenfolge zustande kam - in einem Satz.
 *
 * Entweder der Name des gewaehlten Schwerpunkts, oder, wenn die Regler von Hand stehen,
 * die Kriterien, die ueber dem Standard liegen. Ohne diese Angabe bleibt die Haelfte der
 * Entscheidung unsichtbar: Die harten Anforderungen sagen, WER in der Liste steht, die
 * Gewichtung sagt, in welcher REIHENFOLGE.
 */
export function weightFocus(weights: Record<string, number> | undefined, t: T): string | null {
  const preset = PRESETS.find((p) => matchesPreset(weights, p.weights));
  if (preset) return preset.id === "balanced" ? null : t(`wiz.preset.${preset.id}`);

  const raised = CRITERIA
    .filter((c) => (weights?.[c.id] ?? 0) > (DEFAULT_WEIGHTS[c.id] ?? 0))
    .sort((a, b) => (weights?.[b.id] ?? 0) - (weights?.[a.id] ?? 0))
    .slice(0, 3)
    .map((c) => t(`criterion.${c.id}.label`));
  return raised.length ? raised.join(", ") : null;
}
