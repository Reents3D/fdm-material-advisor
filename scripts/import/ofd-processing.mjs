/**
 * Marktkorridor fuer Dichte und Verarbeitungstemperaturen - die Spanne, die einzelne
 * Herstellerblaetter nicht hergeben.
 *
 * DAS PROBLEM, DAS DIESES SKRIPT LOEST
 * DATA_MODEL, Abschnitt 1.1, trennt zwei Dinge sauber: `tolerance` ist die Streuung
 * EINER Quelle, `min`/`max` die realistische Spanne UEBER HERSTELLER HINWEG. Die zweite
 * Zahl konnte dieses Projekt bisher kaum liefern - wer ein Blatt auswertet, kennt einen
 * Hersteller. Bei 40 von 41 Werkstofftypen stand die Dichte deshalb ohne jede Spanne da,
 * bei 31 die Trocknungstemperatur.
 *
 * Genau diese Spanne ist die Staerke einer Marktdatenbank: Sie kennt 2020 Produkte und
 * damit die Streuung, die kein einzelnes Blatt zeigen kann.
 *
 * WARUM DER VORHANDENE WERT NICHT ANGETASTET WIRD
 * Unsere Duesen- und Betttemperaturen sind zu 29 von 41 herstellerbelegt (`medium`) -
 * besser, als eine gemeinschaftlich gepflegte Sammlung je sein kann. Sie zu ueber-
 * schreiben waere eine Verschlechterung. Das Skript ergaenzt deshalb nur die SPANNE und
 * haengt `src_ofd` als zweite Quelle an. Regel R9 nimmt das hoechste Ceiling ueber alle
 * Quellen (validate-data.mjs, Zeile 165) - die Konfidenz des Wertes bleibt also erhalten,
 * und der Beleg fuer die Spanne steht trotzdem dabei.
 *
 * Nur wo gar nichts steht oder nur eine Schaetzung, wird auch der Wert gesetzt - dann
 * mit `src_ofd` und `low`. Das ist ein Fortschritt gegenueber `estimated`: eine
 * Beobachtung ueber hunderte Angebote ist keine Messung, aber sie ist auch keine
 * Vermutung mehr.
 *
 * DER FALL, IN DEM NICHTS GESCHRIEBEN WIRD - UND WARUM ER DER WICHTIGSTE IST
 * Liegt unser Wert AUSSERHALB des Marktkorridors, waere ein Nachziehen der Spanne die
 * bequeme Loesung und die falsche: Sie wuerde eine Abweichung zudecken, die etwas
 * bedeutet. Entweder ist unser Wert falsch, oder die Zuordnung stimmt nicht, oder der
 * Werkstoff wird am Markt anders gefahren als sein Blatt sagt. Solche Faelle werden
 * gemeldet und NICHT geschrieben.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  ROOT, MIN_TEMP_PRODUCTS,
  loadSnapshot, filamentsFor, percentile, t, ofdSource, upsertSource,
} from "./ofd-common.mjs";

const snap = loadSnapshot("ofd-processing");
if (!snap) process.exit(0);
const { data: all, meta } = snap;

const DIR = path.join(ROOT, "data/materials");
const source = ofdSource(meta);

const round = (x, d = 0) => Number(x.toFixed(d));

/**
 * Korridor aus einer Stichprobe. p10/p90 statt Minimum/Maximum, weil ein einzelner
 * Tippfehler im Gemeinschaftsbestand sonst die ganze Spanne aufreisst.
 */
function corridor(values, decimals) {
  const s = [...values].sort((a, b) => a - b);
  if (s.length < MIN_TEMP_PRODUCTS) return null;
  const lo = percentile(s, 0.1), hi = percentile(s, 0.9);
  if (lo == null || hi == null || lo >= hi) return null;
  return { min: round(lo, decimals), max: round(hi, decimals), median: round(percentile(s, 0.5), decimals), n: s.length };
}

/* Was aus welchem OFD-Feld kommt. `pick` liefert die Stichprobe je Filament. */
const TARGETS = [
  {
    path: ["mechanics", "density"], unit: "g/cm³", decimals: 2,
    pick: (f) => (f.density != null ? [f.density] : []),
    label: "Dichte",
  },
  {
    path: ["processing", "nozzleTemperature"], unit: "°C", decimals: 0,
    pick: (f) => [f.min_print_temperature, f.max_print_temperature].filter((x) => x != null),
    label: "Duesentemperatur",
  },
  {
    path: ["processing", "bedTemperature"], unit: "°C", decimals: 0,
    pick: (f) => [f.min_bed_temperature, f.max_bed_temperature].filter((x) => x != null),
    label: "Betttemperatur",
  },
  {
    path: ["processing", "dryingTemperature"], unit: "°C", decimals: 0,
    pick: (f) => (f.max_dry_temperature != null ? [f.max_dry_temperature] : []),
    label: "Trocknungstemperatur",
  },
];

const spans = [], fills = [], conflicts = [], thin = [];
let touched = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const p = path.join(DIR, file);
  const m = JSON.parse(readFileSync(p, "utf8"));
  const fl = filamentsFor(m.id, all);
  if (!fl) continue;

  let dirty = false;

  for (const tgt of TARGETS) {
    const [grp, key] = tgt.path;
    const sample = fl.flatMap(tgt.pick);
    /* Produkte zaehlen, nicht Messpunkte: Ein Filament liefert bei den Temperaturen
       zwei Werte (min und max) und wuerde die Schwelle sonst doppelt zaehlen. */
    const products = fl.filter((f) => tgt.pick(f).length > 0).length;
    if (products < MIN_TEMP_PRODUCTS) { thin.push([m.id, tgt.label, products]); continue; }

    const c = corridor(sample, tgt.decimals);
    if (!c) { thin.push([m.id, tgt.label, products]); continue; }

    /* Knapp halten - der Text steht in 19 Datensaetzen und geht ins Anwendungspaket
       (CI-Budget 400 kB gzip). Begruendung in ADR-035. */
    const basis = t(
      `Marktkorridor über ${products} Produkte (Open Filament Database ${meta.version}), 10.–90. Perzentil. Kein Messwert, sondern die Streuung des Angebots.`,
      `Market corridor across ${products} products (Open Filament Database ${meta.version}), 10th–90th percentile. Not a measurement but the spread of the offering.`,
    );

    const node = m[grp]?.[key];

    if (!node || node.confidence === "estimated") {
      /* Trocknung oberhalb des Glasuebergangs verbackt die Spule - Regel R6. Der
         Marktmedian ist ueber viele Produkte gebildet und kennt unseren Tg nicht. */
      const tg = m.thermal?.glassTransition?.value;
      if (key === "dryingTemperature" && tg != null && c.median >= tg) {
        conflicts.push([m.id, tgt.label, `Marktmedian ${c.median} °C ≥ Tg ${tg} °C — nicht gesetzt (R6)`]);
        continue;
      }
      m[grp] ??= {};
      m[grp][key] = {
        value: c.median, min: c.min, max: c.max, unit: tgt.unit,
        source: "src_ofd", confidence: "low",
        conditions: `${products} Produkte am Markt`,
        note: basis,
      };
      fills.push([m.id, tgt.label, node ? "estimated" : "fehlte", c.median, c.min, c.max, products]);
      dirty = true;
      continue;
    }

    if (node.min != null || node.max != null) continue;      // redaktionelle Spanne bleibt
    if (node.value == null) continue;

    if (node.value < c.min || node.value > c.max) {
      conflicts.push([m.id, tgt.label, `unser Wert ${node.value} ${tgt.unit} außerhalb ${c.min}–${c.max} (n=${products})`]);
      continue;
    }

    node.min = c.min;
    node.max = c.max;
    const cur = Array.isArray(node.source) ? node.source : [node.source];
    if (!cur.includes("src_ofd")) node.source = [...cur, "src_ofd"];
    node.note = node.note
      ? t(`${node.note.de}\n\nSpanne: ${basis.de}`, `${node.note.en}\n\nRange: ${basis.en}`)
      : t(`Spanne: ${basis.de}`, `Range: ${basis.en}`);
    spans.push([m.id, tgt.label, node.value, c.min, c.max, products, node.confidence]);
    dirty = true;
  }

  if (dirty) { upsertSource(m, source); writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`); touched++; }
}

console.log(`Marktkorridor aus ${all.filaments.length} Filamenten (Stand ${meta.version}).`);
console.log(`${touched} Datensätze geändert · ${spans.length} Spannen ergänzt · ${fills.length} Felder erstmals belegt.\n`);

if (fills.length) {
  console.log("  Erstmals belegt (Wert + Spanne, Quelle src_ofd, Konfidenz low):");
  console.log("    Werkstoff     Groesse                vorher      Wert   Korridor        n");
  for (const [id, lab, was, v, lo, hi, n] of fills) {
    console.log(`    ${id.padEnd(13)} ${lab.padEnd(22)} ${was.padEnd(11)}${String(v).padStart(5)}   ${`${lo}–${hi}`.padEnd(13)}${String(n).padStart(4)}`);
  }
  console.log();
}

if (spans.length) {
  console.log("  Spanne ergänzt, Wert und Konfidenz unangetastet:");
  console.log("    Werkstoff     Groesse                Konf.     Wert   Korridor        n");
  for (const [id, lab, v, lo, hi, n, cf] of spans) {
    console.log(`    ${id.padEnd(13)} ${lab.padEnd(22)} ${cf.padEnd(9)}${String(v).padStart(5)}   ${`${lo}–${hi}`.padEnd(13)}${String(n).padStart(4)}`);
  }
  console.log();
}

if (conflicts.length) {
  console.log(`  Abweichungen — bewusst NICHT geschrieben (${conflicts.length}):`);
  for (const [id, lab, why] of conflicts) console.log(`    ${id.padEnd(13)} ${lab.padEnd(22)} ${why}`);
  console.log("    Jede Zeile ist ein Prüfauftrag: falscher Wert, falsche Zuordnung — oder der");
  console.log("    Markt fährt den Werkstoff anders, als sein Datenblatt es vorsieht.");
  console.log();
}

const thinBy = new Map();
for (const [, lab] of thin) thinBy.set(lab, (thinBy.get(lab) ?? 0) + 1);
console.log(`  Stichprobe unter ${MIN_TEMP_PRODUCTS} Produkten, daher übersprungen:`);
for (const [lab, n] of thinBy) console.log(`    ${lab.padEnd(22)} ${n} Werkstofftypen`);
