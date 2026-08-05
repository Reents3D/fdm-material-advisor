/**
 * Wie belastbar ist ein einzelner Wert?
 *
 * WARUM ES DIESE FUNKTION BRAUCHT, OBWOHL ES `confidence` SCHON GIBT
 * `confidence` beantwortet eine Frage: Wie gut ist die QUELLE? Sie beantwortet nicht,
 * ob überhaupt eine Prüfnorm dabeisteht. Ein Wert mit `medium` und ohne Norm sieht in
 * der Oberfläche aus wie einer mit Norm — obwohl niemand weiß, wonach gemessen wurde.
 * Beide Angaben zusammen ergeben erst ein Urteil, und dieses Urteil ist die Grundlage
 * dafür, mit welchen Zahlen dieses Werkzeug arbeitet.
 *
 * DIE DREI STUFEN
 *
 *   verified    Prüfnorm genannt UND Konfidenz mindestens `medium`.
 *               Das ist die Schwelle, ab der ein Wert in die Empfehlung eingeht.
 *
 *   weak        Konfidenz `low` ODER keine Prüfnorm. Der Wert steht weiter im
 *               Datensatz und wird angezeigt — er trägt aber sichtbar, dass er die
 *               Schwelle nicht erreicht. Typische Fälle aus dem Bestand: umgerechnete
 *               Einheiten (kg/cm², ft·lbf/in²), kopierte Tabellen mehrerer Produkte,
 *               widersprüchliche Normangaben.
 *
 *   editorial   Konfidenz `estimated`. Keine Messung, sondern eine fachliche
 *               Ableitung — und bei den Fünferskalen konstruktionsbedingt: Für
 *               „Druckbarkeit 4 von 5" gibt es keine Norm und kann es keine geben.
 *               Diese Werte werden NICHT aussortiert. Sie sind die Bewertungsdimension
 *               der Engine; ohne sie rankt das Werkzeug nichts mehr. Sie werden
 *               gekennzeichnet, und die Oberfläche sagt, wie groß ihr Anteil ist.
 *
 * WAS HIER BEWUSST NICHT EINGEHT
 * Der Prüfkörper. Bei 69 % aller Messwerte im Bestand sagt das Blatt nicht, ob an
 * gedruckten oder spritzgegossenen Proben gemessen wurde — bei sechs Marken auf keinem
 * einzigen Blatt. Ein undeklarierter Prüfkörper macht den Wert aber nicht falsch,
 * sondern nur nicht quer vergleichbar, und genau diese Trennung leistet die
 * Herstelleransicht bereits über `specimenType`. Ihn hier zusätzlich zur
 * Ausschlussbedingung zu machen, würde zwei Drittel aller Messwerte und sechs von
 * fünfzehn Marken entfernen, ohne dass eine Zahl dadurch richtiger würde.
 */

import type { Confidence } from "../engine/types";

export type EvidenceGrade = "verified" | "weak" | "editorial";

/** Nur das, was diese Funktion braucht — bewusst schmal, damit sie beide Ebenen bedient. */
export interface Graded {
  confidence?: Confidence | null;
  testStandard?: string | null;
}

export function evidenceGrade(v: Graded | null | undefined): EvidenceGrade | null {
  if (!v || !v.confidence) return null;
  if (v.confidence === "estimated") return "editorial";
  if (v.confidence === "low") return "weak";
  return v.testStandard ? "verified" : "weak";
}

/** Geht dieser Wert in die Empfehlung ein? */
export const isRobust = (g: EvidenceGrade | null): boolean => g === "verified";

export interface EvidenceTally {
  verified: number;
  weak: number;
  editorial: number;
  /** Alle eingestuften Werte, Schätzungen eingeschlossen. */
  total: number;
  /**
   * Anteil belastbarer Werte an den MESSWERTEN, also `verified / (verified + weak)`.
   *
   * Die Schätzungen stehen bewusst nicht im Nenner. Sie sind keine misslungenen
   * Messungen, sondern gar keine — eine Fünferskala kann keine Prüfnorm haben. Rechnete
   * man sie mit, käme jeder Werkstoff auf 10 bis 20 %, weil die Skalen auf der
   * Werkstoffebene die Mehrheit stellen. Die Zahl wäre damit für alle gleich schlecht
   * und würde nichts mehr unterscheiden.
   *
   * `null`, wenn es keine Messwerte gibt — 0 von 0 ist nicht 0 %.
   */
  robustShare: number | null;
}

export function tally(values: Iterable<Graded | null | undefined>): EvidenceTally {
  const out: EvidenceTally = { verified: 0, weak: 0, editorial: 0, total: 0, robustShare: null };
  for (const v of values) {
    const g = evidenceGrade(v);
    if (!g) continue;
    out[g]++;
    out.total++;
  }
  const measured = out.verified + out.weak;
  if (measured > 0) out.robustShare = Math.round((100 * out.verified) / measured);
  return out;
}

/**
 * Einordnung der Datengrundlage eines Datensatzes in einem Wort.
 *
 * Die Schwellen sind bewusst streng: Ein Datenblatt, bei dem nur die Hälfte der Werte
 * eine Prüfnorm trägt, ist keine gute Grundlage — auch wenn die andere Hälfte stimmt.
 */
export type EvidenceVerdict = "solid" | "mixed" | "thin";

export function verdict(t: EvidenceTally): EvidenceVerdict | null {
  if (t.total === 0 || t.robustShare === null) return null;
  if (t.robustShare >= 70) return "solid";
  if (t.robustShare >= 30) return "mixed";
  return "thin";
}
