/**
 * Wirtschaftlichkeit auf €/kg stellen - statt auf eine abstrakte Fuenferskala.
 *
 * WAS VORHER FALSCH WAR
 * Der Preis stand als `priceIndex` von 1 bis 5 im Datensatz, war bei allen 38 Werkstoffen
 * geschaetzt - und trug mit Gewicht 3 das hoechste Standardgewicht ueberhaupt, gleichauf
 * mit Festigkeit und Temperatur. In einem WERKSTOFFberater.
 *
 * Dazu war die Verteilung entartet: 29 der 38 Werkstoffe standen auf 4 oder 5, genau
 * einer auf 1. Der Index unterschied damit praktisch nur "PLA" von "alles andere" und
 * schob PLA in fast jeder Standardabfrage nach oben.
 *
 * WAS SICH AENDERT
 * Der Preis wird als **€/kg mit Spanne** gefuehrt. Zwei Gruende:
 *
 *   1. NACHPRUEFBAR. "PA6-CF kostet 70 bis 120 €/kg" kann jeder gegen einen Shop halten.
 *      "PA6-CF hat Preisindex 4" kann niemand pruefen und niemand korrigieren.
 *   2. VERHAELTNISSE BLEIBEN ERHALTEN. Zwischen PLA (22 €/kg) und PPS-CF (260 €/kg)
 *      liegt Faktor 12. Auf einer Skala von 1 bis 5 wird daraus Faktor 5 - die
 *      eigentliche Information geht verloren.
 *
 * Der `priceIndex` bleibt fuer die grobe Anzeige erhalten, wird aber aus den €/kg
 * ABGELEITET (Quintile ueber das Feld). Damit koennen die beiden Angaben nicht mehr
 * auseinanderlaufen, und die Verteilung ist konstruktionsbedingt gleichmaessig.
 *
 * Das Standardgewicht faellt von 3 auf 1. Der Preis entscheidet nicht, welcher Werkstoff
 * technisch passt - er entscheidet, welcher von den passenden man nimmt.
 *
 * DIE GRENZE DIESER ZAHLEN
 * Es sind Marktspannen aus dem europaeischen Fachhandel fuer 1-kg-Spulen, keine
 * Einkaufspreise und kein Angebot. Sie schwanken mit Marke, Farbe, Spulengroesse und
 * Wechselkurs, und sie altern. Sie tragen deshalb `estimated` und ein Erhebungsdatum.
 * Korrekturen sind ausdruecklich willkommen - der Weg dafuer steht auf der Herstellerseite.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data/materials");
const SURVEYED = "2026-08";

/* €/kg im europaeischen Fachhandel, 1-kg-Spule, ueber die gefuehrten Marken hinweg.
   [min, max] - der gefuehrte Wert ist die Mitte. */
const BAND = {
  /* Massenwerkstoffe */
  pla: [18, 30], "pla-tough": [25, 40], hips: [22, 35],
  petg: [20, 32], abs: [20, 32], asa: [25, 40],
  greentec: [35, 55], pctg: [30, 45], pp: [35, 60],

  /* faserverstaerkt */
  "petg-cf": [40, 65], "asa-cf": [45, 70], "asa-aero": [45, 70],
  "pet-cf": [80, 130], "pa6-cf": [70, 120], "pa6-gf": [65, 110],
  "pa12-cf": [90, 150], "paht-cf": [90, 150], "pps-cf": [200, 350],

  /* technische Thermoplaste */
  pa6: [45, 75], pa12: [60, 100], paht: [70, 120],
  pc: [45, 70], "pc-pbt": [60, 95], "pc-fr": [70, 120], "abs-pc": [45, 70],
  pmma: [45, 75], pvc: [45, 80], pvdf: [120, 200], obc: [50, 85],

  /* Elastomere */
  "tpu-95a": [30, 50], "tpu-98a": [30, 50],
  "tpu-85a": [35, 60], "tpu-58d": [35, 60], peba: [90, 150],

  /* ESD-Compounds - der Leitzusatz ist der Preistreiber, nicht das Grundpolymer */
  "esd-pla": [60, 100], "esd-petg": [70, 110], "esd-abs": [70, 110], "tpu-esd": [90, 150],
};

const t = (de, en) => ({ de, en });

const NOTE = t(
  `Marktspanne im europäischen Fachhandel für 1-kg-Spulen, erhoben ${SURVEYED}, über die in dieser Datenbank geführten Marken hinweg. Kein Einkaufspreis und kein Angebot. Die Spanne schwankt mit Marke, Farbe, Spulengröße und Wechselkurs — und sie altert. Korrekturen sind willkommen.`,
  `Market range in European specialist retail for 1 kg spools, surveyed ${SURVEYED}, across the brands carried in this database. Not a purchase price and not an offer. The range varies with brand, colour, spool size and exchange rate — and it ages. Corrections are welcome.`);

const INDEX_NOTE = t(
  "Abgeleitet aus commercial.pricePerKg (Quintile über alle Werkstoffe), damit beide Angaben nicht auseinanderlaufen können. Die belastbare Zahl ist der €/kg-Wert; diese Fünferskala dient nur der schnellen Einordnung.",
  "Derived from commercial.pricePerKg (quintiles across all materials) so the two figures cannot diverge. The meaningful figure is the €/kg value; this five-point scale serves only for quick orientation.");

/* Erst alle Mitten sammeln, dann die Quintilgrenzen bestimmen. */
const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const mids = new Map();
for (const f of files) {
  const m = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  const b = BAND[m.id];
  if (b) mids.set(m.id, (b[0] + b[1]) / 2);
}
const sorted = [...mids.values()].sort((a, b) => a - b);
const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const CUTS = [q(0.2), q(0.4), q(0.6), q(0.8)];
const indexOf = (mid) => CUTS.filter((c) => mid > c).length + 1;

let n = 0, missing = [];
for (const f of files) {
  const p = path.join(DIR, f);
  const m = JSON.parse(readFileSync(p, "utf8"));
  const b = BAND[m.id];
  if (!b) { missing.push(m.id); continue; }

  const mid = Math.round(((b[0] + b[1]) / 2) * 10) / 10;
  m.commercial ??= {};
  m.commercial.pricePerKg = {
    value: mid, min: b[0], max: b[1], unit: "€/kg",
    conditions: `1-kg-Spule, europäischer Fachhandel, Stand ${SURVEYED}`,
    source: "estimate_reasoning", confidence: "estimated", note: NOTE,
  };
  m.commercial.priceIndex = {
    value: indexOf(mid), scale: "priceIndex",
    derivedFrom: ["commercial.pricePerKg"],
    source: "estimate_reasoning", confidence: "estimated", note: INDEX_NOTE,
  };
  writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
  n++;
}

const dist = {};
for (const [id, mid] of mids) { const i = indexOf(mid); dist[i] = (dist[i] ?? 0) + 1; void id; }

console.log(`${n} Werkstoffe mit €/kg-Spanne versehen (Stand ${SURVEYED}).`);
console.log(`  Quintilgrenzen: ${CUTS.map((c) => `${c} €/kg`).join(" · ")}`);
console.log(`  Verteilung des abgeleiteten Index: ${Object.entries(dist).sort().map(([k, v]) => `${k}→${v}`).join("  ")}`);
console.log(`  Spanne im Feld: ${sorted[0]} bis ${sorted[sorted.length - 1]} €/kg (Faktor ${Math.round(sorted[sorted.length - 1] / sorted[0])})`);
if (missing.length) console.log(`  ! ohne Preisangabe: ${missing.join(", ")}`);
