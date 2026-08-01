/**
 * Polarity of every named 1–5 rating scale.
 *
 * Stored centrally, never per datum (ADR-001, verworfene Alternative C): a duplicated
 * `higherIsBetter` across 60 files invites exactly one wrong entry, which silently
 * inverts a criterion in the scoring with no test to catch it.
 *
 * `scripts/validate-data.mjs` (R13) fails CI if a data file uses a scale that is not
 * listed here.
 */

export type Polarity = 1 | -1;

export const SCALE_POLARITY: Record<string, Polarity> = {
  /* higher is better */
  printability: 1,
  layerAdhesion: 1,
  toughness: 1,
  fatigueResistance: 1,
  wearResistance: 1,
  uvResistance: 1,
  weatherResistance: 1,
  hydrolysisResistance: 1,
  gasBarrier: 1,
  surfaceQuality: 1,
  sandability: 1,
  fillability: 1,
  paintAdhesion: 1,
  wrappingSuitability: 1,
  bondability: 1,
  availability: 1,
  batchConsistency: 1,
  dimensionalAccuracy: 1,
  smallSeriesSuitability: 1,
  ralAccuracy: 1,

  /* lower is better */
  warpingTendency: -1,
  hygroscopy: -1,
  abrasiveness: -1,
  stringingTendency: -1,
  creepTendency: -1,
  notchSensitivity: -1,
  yellowingTendency: -1,
  stressCrackingSensitivity: -1,
  layerLineVisibility: -1,
  priceIndex: -1,
  distortionRisk: -1,
};

/** Normalise a 1–5 rating to 0..1 where 1 is always the favourable end. */
export function ratingToScore(value: number | null, scale: string): number | null {
  if (value === null) return null;
  const p = SCALE_POLARITY[scale];
  if (p === undefined) throw new Error(`Unknown rating scale '${scale}' — add it to scales.ts`);
  const normalised = (value - 1) / 4;
  return p === 1 ? normalised : 1 - normalised;
}
