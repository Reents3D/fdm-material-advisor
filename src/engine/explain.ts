/**
 * Stage 3 — explanations.
 *
 * The engine never produces prose. It emits { key, params } pairs that the i18n layer
 * renders into a sentence. Two reasons: the tool stays deterministic and translatable,
 * and no explanation can ever claim something the data does not contain — the params
 * come straight out of the record.
 */

import { constraintReserve, serviceCeiling } from "./constraints";
import { criterionById } from "./criteria";
import type {
  ConstraintVerdict, CriterionScore, Explanation, Flag, Material, Quantity, Rating,
} from "./types";

const STRONG = 0.75;
const WEAK = 0.3;
/** Below this reserve a passed constraint is reported as a risk, not a strength. */
const TIGHT_RESERVE = 0.1;

const numOf = (n: unknown): number | null =>
  n && typeof n === "object" && "value" in n ? ((n as Quantity).value as number | null) : null;
const round = (n: number) => (Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 100) / 100);

/** Factor criteria read as percentages; everything else keeps its native unit. */
function display(c: { criterionId: string; raw: number | null; unit?: string }) {
  const def = criterionById(c.criterionId);
  if (def?.displayAsPercent && c.raw !== null) return { value: Math.round(c.raw * 100), unit: "%" };
  return { value: c.raw !== null ? round(c.raw) : 0, unit: c.unit ?? "" };
}

export function buildExplanations(
  m: Material,
  criteria: CriterionScore[],
  verdicts: ConstraintVerdict[],
  estimatedShare: number,
  dataGaps: string[],
  coverage = 1,
): Explanation[] {
  const out: Explanation[] = [];
  const weighted = criteria.filter((c) => c.weight > 0 && c.score !== null);

  /* strengths and weaknesses, most heavily weighted first */
  const byImportance = [...weighted].sort((a, b) => b.weight - a.weight);

  for (const c of byImportance) {
    const s = c.score as number;
    if (s >= STRONG) {
      out.push({
        type: "strength",
        criterionId: c.criterionId,
        key: `criterion.${c.criterionId}.strength`,
        params: { ...display(c), percentile: Math.round(s * 100) },
        evidence: c.evidence,
      });
    } else if (s <= WEAK) {
      out.push({
        type: "weakness",
        criterionId: c.criterionId,
        key: `criterion.${c.criterionId}.weakness`,
        params: { ...display(c), percentile: Math.round(s * 100) },
        evidence: c.evidence,
      });
    }
  }

  /* Ein gestauchter Score MUSS dastehen. Sonst liest der Nutzer "günstig" und eine
     Platzierung, die zu dem Preis nicht passt, und hält die Zahl für falsch - dabei ist
     nicht die Zahl gedämpft, sondern das Zutrauen in sie (ADR-040). Der Hinweis kommt
     auch dann, wenn das Kriterium daneben als Stärke ausgewiesen ist: Beides stimmt. */
  for (const c of byImportance) {
    if (!c.discounted) continue;
    out.push({
      type: "risk",
      criterionId: c.criterionId,
      key: `risk.thinEvidence.${c.criterionId}.${c.confidence}`,
      params: display(c),
      evidence: c.evidence,
    });
  }

  /* Eine breite Spanne ist keine Schwaeche des Werkstoffs, sondern eine Aussage ueber
     den TYPNAMEN: Unter "PETG" verkaufen 17 Hersteller Rezepturen, deren Bruchdehnung
     zwischen 5 und 150 % liegt. Wer das nicht erfaehrt, liest den Median als Zusage.
     Deshalb steht der Hinweis auch dann, wenn das Kriterium eine Staerke ist (ADR-042). */
  for (const c of byImportance) {
    if (!c.widelySpread || c.spanMin === undefined || c.spanMax === undefined) continue;
    const def = criterionById(c.criterionId);
    const asPct = def?.displayAsPercent ? 100 : 1;
    out.push({
      type: "risk",
      criterionId: c.criterionId,
      key: "risk.wideSpread",
      params: {
        ...display(c),
        min: round(c.spanMin * asPct),
        max: round(c.spanMax * asPct),
      },
      evidence: c.evidence,
    });
  }

  /* constraints that only just hold */
  for (const v of verdicts) {
    if (!v.passed) continue;
    const reserve = constraintReserve(v);
    if (reserve !== null && reserve < TIGHT_RESERVE) {
      out.push({
        type: "risk",
        key: "risk.tightConstraint",
        params: { ...v.params, reserve: Math.round(reserve * 100) },
        evidence: v.evidence,
      });
    }
    if (v.dataMissing) {
      out.push({ type: "risk", key: "risk.constraintUnknown", params: { ...v.params, constraint: v.constraintId }, evidence: v.evidence });
    }
    if (v.key === "constraint.chamber.warn") {
      out.push({ type: "risk", key: "risk.chamberRecommended", params: {}, evidence: v.evidence });
    }
    /* Die beiden Abstufungen, die seit 2026-08-02 einen Ausschluss ERSETZEN, muessen
       sichtbar sein. Sonst verschwindet ein Werkstoff nicht mehr aus der Liste, aber der
       Grund, warum er kritisch ist, verschwindet mit ihm - das waere schlimmer als der
       Ausschluss vorher. `constraintReserve` faengt sie nicht: Bei beiden liegt der
       konservative Wert UNTER der Anforderung, die Reserve ist deshalb null. */
    if (v.key === "constraint.temperature.tight") {
      out.push({ type: "risk", key: "risk.temperatureTight", params: { ...v.params }, evidence: v.evidence });
    }
    /* Wer Dauerlast angegeben hat, bekommt denselben Vorbehalt mit dem konstruktiven
       Ausweg: Kriechen haengt an der Spannung, und die senkt man mit Querschnitt. */
    if (v.key === "constraint.temperature.tightLoaded") {
      out.push({ type: "risk", key: "risk.temperatureLoaded", params: { ...v.params }, evidence: v.evidence });
    }
    /* Wer die Brandschutzklasse nur ueber eine bestimmte Type erfuellt, MUSS das auf der
       Karte lesen. "PETG erfuellt V-0" ohne den Zusatz "aber nur diese eine Type" ist
       die gefaehrlichste Verkuerzung, die dieses Werkzeug produzieren koennte. */
    if (v.key === "constraint.flame.passViaProduct") {
      out.push({ type: "risk", key: "risk.flameViaProduct", params: { ...v.params }, evidence: v.evidence });
    }
    if (v.key === "constraint.chemical.limited") {
      out.push({ type: "risk", key: "risk.chemicalLimited", params: { ...v.params }, evidence: v.evidence });
    }
  }

  /* process hints that cost money or time and are easy to miss */
  const hardened = (m.processing?.hardenedNozzleRequired as Flag | undefined)?.value;
  if (hardened === true) out.push({ type: "hint", key: "hint.hardenedNozzle", params: {}, evidence: "processing.hardenedNozzleRequired" });

  const dryT = numOf(m.processing?.dryingTemperature);
  const dryH = numOf(m.processing?.dryingTime);
  const hygro = (m.processing?.hygroscopy as Rating | undefined)?.value ?? null;
  if (dryT !== null && dryH !== null && hygro !== null && hygro >= 4) {
    out.push({ type: "hint", key: "hint.drying", params: { temp: dryT, hours: dryH }, evidence: "processing.dryingTemperature" });
  }

  const annealing = (m.thermal as { annealing?: { requiredForDatasheetValues?: Flag; temperature?: Quantity; duration?: Quantity } } | undefined)?.annealing;
  if (annealing?.requiredForDatasheetValues?.value === true) {
    out.push({
      type: "risk", key: "hint.annealingRequired",
      params: {
        min: annealing.temperature?.min ?? annealing.temperature?.value ?? 0,
        max: annealing.temperature?.max ?? annealing.temperature?.value ?? 0,
        hours: annealing.duration?.min ?? annealing.duration?.value ?? 0,
      },
      evidence: "thermal.annealing",
    });
  }

  const chamber = (m.processing?.chamberRequirement as { value?: string } | undefined)?.value;
  if (chamber === "mandatory") out.push({ type: "hint", key: "hint.chamberMandatory", params: {}, evidence: "processing.chamberRequirement" });

  /* the anisotropy warning — the single most under-communicated FDM fact */
  const aniso = numOf(m.mechanics?.anisotropyFactorTensile as Quantity | undefined);
  const anisoImpact = numOf(m.mechanics?.anisotropyFactorImpact as Quantity | undefined);
  if (aniso !== null && aniso < 0.6) {
    out.push({
      type: "risk", key: "risk.anisotropy",
      params: { pct: Math.round(aniso * 100), lost: Math.round((1 - aniso) * 100) },
      evidence: "mechanics.anisotropyFactorTensile",
    });
  }
  if (anisoImpact !== null && anisoImpact < 0.5) {
    out.push({
      type: "risk", key: "risk.impactAnisotropy",
      params: { pct: Math.round(anisoImpact * 100) },
      evidence: "mechanics.anisotropyFactorImpact",
    });
  }

  /* food contact always carries the part-level caveat, never just the material one */
  const food = (m.compliance as { foodContact?: { status?: { value?: string } } } | undefined)?.foodContact?.status?.value;
  if (food && food.startsWith("declared")) {
    out.push({ type: "risk", key: "risk.foodPartLevel", params: {}, evidence: "compliance.foodContact.partLevelWarning" });
  }

  /* honest confidence rollup */
  /* Die Abwertung durch Datenluecken muss dastehen, sonst wirkt ein niedriger Score
     wie ein Werkstoffurteil, obwohl er ein Erfassungsurteil ist. */
  if (coverage < 0.999) {
    out.push({ type: "risk", key: "risk.coverage",
      params: { pct: Math.round(coverage * 100), lost: Math.round((1 - coverage) * 100) } });
  }
  if (estimatedShare >= 0.4) {
    out.push({ type: "risk", key: "risk.estimatedShare", params: { pct: Math.round(estimatedShare * 100) } });
  }
  for (const gap of dataGaps) {
    out.push({ type: "gap", criterionId: gap, key: "gap.noData", params: { criterion: gap } });
  }

  /* temperature basis — say which number the gate used.
     Nicht mehr, wenn der Nutzer "unbelastet" gesagt hat: Dann hat die Pruefung gerade
     NICHT mit der konservativen Zahl gerechnet, sondern mit dem Datenblattwert. Der
     Hinweis "wir rechnen mit 55 °C, nicht mit der HDT von 71 °C" waere dort schlicht
     falsch - er beschriebe eine Regel, die in diesem Durchlauf ausgesetzt ist. */
  const unloaded = verdicts.some((v) => v.key === "constraint.temperature.passUnloaded");
  const { basis, value } = serviceCeiling(m);
  if (!unloaded && basis === "recommended" && value !== null) {
    const hdtB = numOf(m.thermal?.hdtB);
    if (hdtB !== null && hdtB > value) {
      out.push({
        type: "hint", key: "hint.temperatureBasis",
        params: { recommended: value, hdtB }, evidence: "thermal.recommendedMaxServiceTemperature",
      });
    }
  }

  return dedupe(out);
}

function dedupe(list: Explanation[]): Explanation[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    const k = `${e.type}|${e.key}|${JSON.stringify(e.params)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
