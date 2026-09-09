/**
 * Stage 2b — was eine schwach belegte Angabe im Ranking wert sein darf.
 *
 * DER BEFUND (siehe ADR-040)
 * Bis 2026-08-06 wog ein geschaetzter Preis genau so viel wie ein bei fuenf Haendlern
 * erhobener. Die naheliegende Reparatur - "erhobene Preise schlagen Schaetzungen" -
 * hat die eigene Historie widerlegt: Von 35 Werkstoffen, deren Schaetzpreis spaeter
 * durch eine Erhebung ersetzt wurde, war die Schaetzung 24-mal ZU TEUER. Schaetzungen
 * verschaffen in dieser Datenbank keinen Vorteil, sie sind eher zu vorsichtig.
 *
 * Der unverdiente Vorteil liegt woanders: Bei 15 Werkstoffen, die von einem einzigen
 * Haendler auf mehrere gewachsen sind, stieg der Preis im Mittel um 6,6 Rangpunkte.
 * Der erste gefundene Shop ist systematisch der billige. Ein Einzelfund laesst einen
 * Werkstoff also guenstiger aussehen, als er ist - und das ist ein MESSWERT, keine
 * Vermutung.
 *
 * DIE REGEL
 * Eine schwach belegte Angabe darf keine Staerke behaupten. Liegt ihr Score ueber dem
 * neutralen Mittelfeld, wird der Abstand zum Mittelfeld auf die gemessene
 * Verlaesslichkeit gestaucht. Liegt er darunter, bleibt er unangetastet.
 *
 *   Score 0,93 · Verlaesslichkeit 0,74   ->   0,5 + 0,74 · 0,43 = 0,82
 *   Score 0,30 · Verlaesslichkeit 0,74   ->   0,30 (unveraendert)
 *
 * WARUM EINSEITIG
 * Symmetrisch waere statistisch sauberer - Rauschen zieht in beide Richtungen. Es waere
 * hier aber falsch herum: Eine Stauchung nach oben WUERDE einen Werkstoff belohnen,
 * dessen schlechter Wert schlecht belegt ist. Das ist derselbe Freifahrtschein, den
 * ADR-006 fuer fehlende Daten ausschliesst. Und die Messung stuetzt die Einseitigkeit:
 * Der systematische Versatz beim Einzelhaendler zeigt genau in die guenstige Richtung.
 *
 * WARUM NUR DER PREIS
 * Weil nur dort ein Experiment vorliegt. `scripts/measure-price-reliability.mjs` findet
 * fuer Festigkeit, Steifigkeit, Waermeformbestaendigkeit und Zaehigkeit NULL Uebergaenge
 * von Schaetzung auf Messung - dort ist nie geschaetzt und spaeter gemessen worden. Eine
 * Verlaesslichkeit fuer diese Kriterien waere geraten, und geraten wird hier nicht.
 * Kriterien ohne Eintrag behalten ihren vollen Score.
 *
 * Bei sechs Kriterien - Witterung, Druckbarkeit, XXL-Eignung, Verfuegbarkeit, Verzug,
 * Oberflaeche - ist ohnehin JEDER Wert eine fachliche Einschaetzung. Dort waere ein
 * Abschlag sinnlos: Er traefe alle gleich und loeschte das Kriterium aus der
 * Entscheidung, statt es zu relativieren.
 */

import type { Confidence } from "./types";

/** Das Mittelfeld. Per Konstruktion der Median der Datenbank (Perzentilrang). */
export const NEUTRAL = 0.5;

/**
 * Gemessen mit `npm run measure:price-reliability`. Stand 2026-08-06, nach der Aufnahme
 * von 3DJAKE - die Stichprobe ist von 35 auf 41 und von 15 auf 19 Paare gewachsen:
 *
 *                  vorher                          jetzt
 *   Schaetzung     n = 35  Fehler 11,4 %  -> 0,66  n = 41  Fehler 11,6 %  -> 0,65
 *   ein Haendler   n = 15  Fehler  8,5 %  -> 0,74  n = 19  Fehler  7,5 %  -> 0,77
 *
 * Die Schaetzungen bleiben, wo sie waren; die duennen Erhebungen sind etwas besser als
 * gedacht. Beide Verschiebungen sind klein und aendern keine einzige Rangfolge - sie
 * stehen hier, weil eine Kalibrierung, die man nicht nachzieht, still veraltet.
 *
 * NICHT UEBERNOMMEN: die 0,79, die derselbe Lauf ohne Markenfilter ausgab. Drei
 * Uebergaenge fuehrten auf ein `medium`, das ausschliesslich auf Extrudr-Angeboten stand -
 * einmal bei Extrudr, einmal bei 3DJAKE. Sie bewegten den Preis um 0,0 %, weil es
 * dieselbe Herstellerliste war. Eine Null aus einer Tautologie ist keine Bestaetigung.
 *
 * `high` und `medium` stehen nicht drin und bekommen damit den vollen Score - ein
 * Datenblattwert und eine breite Erhebung sind das, woran hier gemessen wird.
 */
export const RELIABILITY: Readonly<Record<string, Partial<Record<Confidence, number>>>> = {
  price: { estimated: 0.65, low: 0.77 },
};

/** Verlaesslichkeit dieser Kombination, oder `null`, wenn sie nie gemessen wurde. */
export function reliabilityOf(criterionId: string, confidence: Confidence | null): number | null {
  if (confidence === null) return null;
  return RELIABILITY[criterionId]?.[confidence] ?? null;
}

/**
 * Der Score, den diese Angabe belegen kann. Unveraendert, solange sie keinen Vorsprung
 * behauptet; sonst auf die gemessene Verlaesslichkeit gestaucht.
 */
export function creditable(
  criterionId: string,
  confidence: Confidence | null,
  score: number,
): { score: number; discounted: boolean } {
  if (score <= NEUTRAL) return { score, discounted: false };
  const rel = reliabilityOf(criterionId, confidence);
  if (rel === null || rel >= 1) return { score, discounted: false };
  return { score: NEUTRAL + rel * (score - NEUTRAL), discounted: true };
}

/**
 * Derselbe Gedanke, andere Frage — und diesmal ohne Kalibrierung.
 *
 * Seit ADR-042 traegt jeder zusammengefasste Kennwert die Spanne, in der die Blaetter
 * seines Werkstofftyps liegen. Damit steht schwarz auf weiss, dass PLA mit 45,8 MPa und
 * ABS mit 44,0 MPa nicht auseinanderliegen: Ihre Spannen (23-63 und 33-59) ueberdecken
 * einander fast vollstaendig. Der Median allein verschweigt das und laesst die Rangfolge
 * eine Trennschaerfe behaupten, die die Datenlage nicht hergibt.
 *
 * DIE REGEL
 * Ein Wert darf so viel Vorsprung behaupten, wie sein PLAUSIBLER BEREICH ueberhaupt im
 * Vorsprung liegt. Reicht die Spanne zur Haelfte unter das Mittelfeld, zaehlt der
 * Vorsprung zur Haelfte. Liegt sie ganz darueber, bleibt er unangetastet.
 *
 *   Spanne komplett ueber dem Median des Feldes   -> voller Vorsprung
 *   Spanne halb darunter                          -> halber Vorsprung
 *   Spanne ganz darunter (Median knapp darueber)   -> kein Vorsprung
 *
 * WARUM HIER KEINE GEMESSENE KONSTANTE NOETIG IST
 * Anders als bei ADR-040 wird nichts geschaetzt: Die Spanne IST die Messung. Sie kommt
 * aus den Blaettern selbst, und der Anteil oberhalb des Mittelfeldes ist eine Division,
 * keine Kalibrierung.
 *
 * WARUM WIEDER EINSEITIG
 * Aus demselben Grund wie in ADR-040: Eine Anhebung schlechter Werte, die schlecht belegt
 * sind, waere der Freifahrtschein, den ADR-006 fuer fehlende Daten ausschliesst.
 *
 * Werte ohne Spanne — Bewertungsskalen, Einzelblaetter, alles vor ADR-042 — bleiben
 * unberuehrt. Keine Spanne ist keine Aussage ueber Streuung, sondern deren Abwesenheit.
 *
 * NICHT FUER DEN PREIS, UND ZWAR AUS EINEM SACHLICHEN GRUND
 * Eine Messspanne sagt: "Die Blaetter sind sich uneinig, wo der Wert liegt." Eine
 * PREISSPANNE sagt etwas ganz anderes: "So teuer war das billigste und das teuerste
 * Angebot, das wir gefunden haben." Das ist Marktstreuung, keine Unsicherheit ueber den
 * Wert - und sie ist beeinflussbar, indem man woanders kauft.
 *
 * Aufgefallen ist der Unterschied an einem Test: Bei "Funktionsprototyp, schnell und
 * guenstig" schob die Stauchung PLA-Tough vor PLA. PLA kostet im Median 23,93 EUR/kg,
 * PLA-Tough 26,99 - aber PLAs Angebote reichen bis 106,53 EUR/kg (Sonderfarben,
 * Kleinspulen), die von PLA-Tough nur bis 79. Die breitere Angebotspalette liess den
 * guenstigeren Werkstoff schlechter dastehen. Das ist nicht bloss ein schiefes Ergebnis,
 * es ist die falsche Frage: Wer guenstig drucken will, kauft nicht die teuerste Spule.
 *
 * Fuer den Preis bleibt es deshalb bei ADR-040 - dort ist der Abschlag an der eigenen
 * Historie GEMESSEN und beantwortet die Frage, die hier zaehlt: Wie sehr verschiebt sich
 * ein Preis noch, wenn man weiter sucht?
 */
const MARKET_SPREAD = new Set(["price"]);
export function spanCredit(
  criterionId: string,
  score: number,
  spanLow: number | null,
  spanHigh: number | null,
): { score: number; widelySpread: boolean } {
  if (MARKET_SPREAD.has(criterionId)) return { score, widelySpread: false };
  if (score <= NEUTRAL || spanLow === null || spanHigh === null) return { score, widelySpread: false };
  if (spanHigh <= spanLow) return { score, widelySpread: false };
  if (spanLow >= NEUTRAL) return { score, widelySpread: false };
  const share = Math.max(0, (spanHigh - NEUTRAL) / (spanHigh - spanLow));
  return { score: NEUTRAL + share * (score - NEUTRAL), widelySpread: true };
}
