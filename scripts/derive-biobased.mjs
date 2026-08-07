/**
 * Kein Bioanteil ist auch eine Auskunft — 19 Lücken, die keine sind.
 *
 * DER BEFUND
 * `sustainability.bioBasedContent` stand bei 24 von 43 Werkstoffen, davon 20 auf **0 %**.
 * Bei den übrigen 19 stand gar nichts — nicht weil ihr Bioanteil unbekannt wäre, sondern
 * weil ihn nie jemand eingetragen hat. PA6, PC, PMMA, PPS, TPU und ABS/PC-Blends kommen
 * sämtlich aus der Petrochemie; ihr Bioanteil ist 0 %, und das ist keine Schätzung ins
 * Blaue, sondern die Herkunft des Monomers.
 *
 * WARUM DAS MEHR IST ALS KOSMETIK
 * Nach ADR-006 rankt ein Werkstoff ohne Wert hinter jedem mit Wert — die fehlende Zahl
 * kostet ihn den Platz. Wer im Assistenten Nachhaltigkeit gewichtet, sah deshalb PA6 und
 * PMMA nicht deshalb hinten, weil sie fossil sind, sondern weil das Feld leer war. Der
 * Unterschied ist der zwischen „schlecht" und „unbekannt", und genau den soll dieses
 * Werkzeug nicht verwischen.
 *
 * WAS HIER NICHT PASSIERT
 * Geraten wird nichts. Eingetragen wird nur, wo die Polymerfamilie die Antwort schon
 * gibt — und ausdrücklich NICHT bei Familien, die es in beiden Varianten gibt:
 *
 *   · PA11 ist zu 100 % aus Rizinusöl, PA12 dagegen petrochemisch. Deshalb steht hier
 *     `pa12` mit 0 %, aber keine Regel für „PA" als Ganzes.
 *   · PLA ist biobasiert; ESD-PLA ist PLA MIT Leitruss, und wieviel davon drin ist,
 *     sagt kein Blatt. `esd-pla` bleibt deshalb leer und bekommt eine offene Frage —
 *     `pla-cf` steht aus demselben Grund bei 80 % und nicht bei 100.
 *   · Sortenreine Biovarianten einzelner Marken (Bio-PE, Bio-PA) sind nicht der Typ,
 *     sondern ein Produkt. Sie gehören auf die Produktebene, nicht hierher.
 *
 * Konfidenz `estimated` und Quelle `estimate_reasoning` — dieselbe Behandlung wie die
 * 20 bereits geführten Nullen. Eine Herkunftsangabe ohne Zertifikat ist eine fachliche
 * Ableitung, kein Messwert; wer eine ISO-16620-Zahl hat, ersetzt sie hier.
 *
 *   node scripts/derive-biobased.mjs [--dry]
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAT = path.join(ROOT, "data/materials");
const DRY = process.argv.includes("--dry");

const t = (de, en) => ({ de, en });

/**
 * Familien, deren Monomer ausschliesslich aus der Petrochemie kommt. Die Liste ist
 * bewusst als Familie geführt und nicht als Werkstoff-ID: Sie soll auch fuer den
 * naechsten ABS- oder PC-Typ gelten, ohne dass jemand daran denken muss.
 */
const FOSSIL = {
  ABS: "Acrylnitril, Butadien und Styrol stammen sämtlich aus der Erdölfraktionierung.",
  ASA: "Wie ABS, mit Acrylester statt Butadien — alle drei Monomere petrochemisch.",
  PC: "Bisphenol A und Phosgen bzw. Diphenylcarbonat, beide petrochemisch.",
  PMMA: "Methylmethacrylat aus Aceton und Blausäure, petrochemisch.",
  PPS: "p-Dichlorbenzol und Natriumsulfid, petrochemisch.",
  TPU: "Diisocyanat und Polyol; biobasierte Polyole gibt es, sie sind aber weder bei diesen Typen noch marktüblich deklariert.",
  PA: "Caprolactam (PA6) bzw. Laurinlactam (PA12) aus Butadien — petrochemisch. Gilt NICHT für PA11, das aus Rizinusöl stammt und hier nicht geführt wird.",
  PETG: "Terephthalsäure, Ethylenglykol und CHDM — sämtlich petrochemisch. Der geführte PETG-Typ steht seit jeher bei 0 %; die ESD-Variante erbt das, weil Leitruss ebenfalls nicht biobasiert ist.",
  PET: "Terephthalsäure und Ethylenglykol; biobasiertes MEG existiert, ist bei diesen Typen aber nicht deklariert.",
};

/** Was der Werkstoff-ID nach eine gefüllte oder modifizierte Variante ist. */
const FILLED = /-(cf|gf|esd|fr)$/i;

let filled = 0, skipped = 0;
const rows = [], open = [];

for (const file of readdirSync(MAT).filter((f) => f.endsWith(".json"))) {
  const p = path.join(MAT, file);
  const m = JSON.parse(readFileSync(p, "utf8"));
  if (m.sustainability?.bioBasedContent?.value != null) continue;

  const family = m.identity?.family;
  const reason = FOSSIL[family];

  if (!reason) {
    /* Keine Regel fuer diese Familie — das ist der Normalfall fuer alles Biobasierte
       und fuer Mischungen, deren Anteil kein Blatt nennt. */
    skipped++;
    m.governance ??= {};
    m.governance.openQuestions ??= [];
    if (!m.governance.openQuestions.some((q) => q.id === "oq_biobased")) {
      m.governance.openQuestions.push({
        id: "oq_biobased",
        question: t(
          `Bioanteil nach ISO 16620-2 beschaffen. Die Familie ${family ?? "dieses Werkstoffs"} `
          + `erlaubt keine Ableitung aus der Herkunft allein — hier entscheidet die Rezeptur, `
          + `nicht das Grundpolymer.`,
          `Obtain the bio-based content per ISO 16620-2. The family ${family ?? "of this material"} `
          + `does not allow a derivation from origin alone — the formulation decides here, not the `
          + `base polymer.`),
        blocking: false,
        affectsFields: ["sustainability.bioBasedContent"],
      });
      open.push(`${m.id} (${family ?? "—"})`);
      if (!DRY) writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
    }
    continue;
  }

  const isFilled = FILLED.test(m.id);
  m.sustainability ??= {};
  m.sustainability.bioBasedContent = {
    value: 0,
    unit: "%",
    source: "estimate_reasoning",
    confidence: "estimated",
    note: t(
      `Aus der Herkunft des Grundpolymers abgeleitet, nicht nach ISO 16620-2 gemessen: ${reason}`
      + (isFilled ? " Der Füllstoff ändert daran nichts — Kohle- und Glasfaser sind ebenfalls nicht biobasiert." : "")
      + " Null Prozent ist hier eine Auskunft und keine Lücke: Wer Nachhaltigkeit gewichtet,"
      + " soll den Unterschied zwischen `fossil` und `unbekannt` sehen.",
      `Derived from the origin of the base polymer, not measured per ISO 16620-2: ${reason}`
      + (isFilled ? " The filler does not change that — carbon and glass fibre are not bio-based either." : "")
      + " Zero percent is a statement here, not a gap: anyone weighting sustainability should see"
      + " the difference between `fossil` and `unknown`."),
  };
  filled++;
  rows.push(`${m.id.padEnd(11)} ${family}`);
  if (!DRY) writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
}

console.log("Auf 0 % gesetzt:");
rows.forEach((r) => console.log("  " + r));
console.log("\nOffene Frage gesetzt (Familie erlaubt keine Ableitung):");
open.forEach((r) => console.log("  " + r));
console.log(`\n${filled} Werte eingetragen, ${skipped} bewusst offen gelassen.${DRY ? "  [--dry]" : ""}`);
