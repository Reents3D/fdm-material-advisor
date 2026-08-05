/**
 * Spulenlogistik aus dem Marktbestand - die offene XXL-Frage, endlich mit Zahlen.
 *
 * DIE FRAGE, DIE DAHINTERSTEHT
 * PLAN.md, Abschnitt 5, Rueckfrage 3: "Wie loest ihr im Dauerlauf die Spulenlogistik
 * (PETG-CF gibt es fast nur auf 1-kg-Spulen)?" Diese Frage stand seit dem Projektstart
 * unbeantwortet da, weil kein Hersteller sie beantwortet - sie ist keine Materialeigen-
 * schaft, sondern eine Marktbeobachtung. Genau dafuer ist eine Marktdatenbank die
 * richtige Quelle, und der Satz in der Rueckfrage laesst sich damit erstmals pruefen.
 *
 * WARUM DAS FUER GROSSFORMAT ENTSCHEIDEND IST
 * Ein Bauteil von zwei Metern Kantenlaenge verbraucht mehrere Kilogramm. Gibt es den
 * Werkstoff nur auf 1-kg-Spulen, faellt mitten im Bauteil ein Spulenwechsel an - mit
 * Farb- und Chargenwechsel, einer Schwachstelle in der Schichthaftung und dem Risiko
 * eines Abbruchs. Die groesste am Markt gefuehrte Spule ist damit ein harter
 * Planungsfaktor, der neben der Verzugsneigung steht.
 *
 * ZWEI ZAHLEN STATT EINER, UND WARUM
 * `maxSpoolWeightKg` allein taeuscht: Bei PA12 existiert eine 5-kg-Spule, aber nur 7 %
 * aller angebotenen Spulen erreichen ueberhaupt 2 kg. Wer nach der Maximalzahl plant,
 * sucht am Ende einen einzelnen Anbieter in einer einzigen Farbe. `largeSpoolShare`
 * sagt, ob Grossspulen die Regel oder die Ausnahme sind - und erst beide zusammen
 * ergeben eine brauchbare Auskunft.
 *
 * WAS DIESE ZAHLEN NICHT SIND
 * Keine Messung und keine Verfuegbarkeitszusage. Der Bestand ist gemeinschaftlich
 * gepflegt, unvollstaendig und kennt keine Lagerbestaende. Er sagt: "so sieht das
 * Angebot aus", nicht "das ist lieferbar". Deshalb `low` und nicht hoeher.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  ROOT, MAP, MIN_PRODUCTS, MIN_SPOOLS,
  loadSnapshot, filamentsFor, spoolIndex, t, ofdSource, upsertSource,
} from "./ofd-common.mjs";

const snap = loadSnapshot("ofd-spools");
if (!snap) process.exit(0);
const { data: all, meta } = snap;

const DIR = path.join(ROOT, "data/materials");
const LARGE_G = 2000;

/** 750 -> "0.75 kg", 1000 -> "1 kg" - sprachneutral, weil spoolSizes ein Stringfeld ist. */
const kg = (g) => `${Number((g / 1000).toFixed(2))} kg`;

const spools = spoolIndex(all);
const source = ofdSource(meta);

const rows = [];
const skipped = [];
let written = 0;

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const p = path.join(DIR, file);
  const m = JSON.parse(readFileSync(p, "utf8"));

  const fl = filamentsFor(m.id, all);
  if (!fl) { skipped.push([m.id, "keine Entsprechung im OFD-Bestand"]); continue; }

  const weights = fl.flatMap((f) => spools.get(f.id) ?? []);
  if (fl.length < MIN_PRODUCTS || weights.length < MIN_SPOOLS) {
    skipped.push([m.id, `Stichprobe zu klein (${fl.length} Produkte, ${weights.length} Spulen)`]);
    continue;
  }

  const max = Math.max(...weights);
  const large = weights.filter((w) => w >= LARGE_G).length;
  const sharePct = Math.round((1000 * large) / weights.length) / 10;

  /* Nur Groessen aufnehmen, die mehrfach vorkommen. Einzelne Ausreisser sind im
     Gemeinschaftsbestand haeufig Tippfehler oder Sonderposten - sie als Marktangebot
     auszuweisen waere irrefuehrend. Die groesste Spule bleibt immer drin, weil genau
     sie die Aussage traegt. */
  const tally = new Map();
  for (const w of weights) tally.set(w, (tally.get(w) ?? 0) + 1);
  const sizes = [...tally.entries()]
    .filter(([w, n]) => n >= 3 || w === max)
    .map(([w]) => w)
    .sort((a, b) => a - b)
    .map(kg);

  /* Notiztexte bleiben knapp: Sie stehen in 21 Dateien und werden mit ins
     Anwendungspaket gebunden - das Bundle-Budget der CI liegt bei 400 kB gzip. Die
     Herleitung steht in ADR-035 und in DATA_MODEL, Gruppe I. */
  const basis = t(
    `Marktbeobachtung über ${fl.length} Produkte und ${weights.length} Spulenangebote (Open Filament Database ${meta.version}).`,
    `Market observation across ${fl.length} products and ${weights.length} spool offers (Open Filament Database ${meta.version}).`,
  );

  m.commercial ??= {};
  m.commercial.spoolSizes = sizes;
  m.commercial.xxl ??= {};

  m.commercial.xxl.maxSpoolWeightKg = {
    value: max / 1000, unit: "kg",
    source: "src_ofd", confidence: "low",
    conditions: `${fl.length} Produkte, ${weights.length} Spulen`,
    note: t(
      `${basis.de} Größte am Markt geführte Spule. Reicht sie für das Bauteil nicht, fällt mitten im Druck ein Spulenwechsel an. Keine Lieferzusage — zusammen mit largeSpoolShare lesen.`,
      `${basis.en} Largest spool offered on the market. If it does not cover the part, a spool change falls in mid-print. Not a supply commitment — read together with largeSpoolShare.`,
    ),
  };

  m.commercial.xxl.largeSpoolShare = {
    value: sharePct, unit: "%",
    source: "src_ofd", confidence: "low",
    conditions: `Anteil der Spulen ab ${LARGE_G / 1000} kg; ${weights.length} Spulen betrachtet`,
    note: t(
      `${basis.de} Anteil der Angebote ab ${LARGE_G / 1000} kg. Niedriger Anteil bei hohem Maximum heißt: Die Großspule existiert, hängt aber an wenigen Anbietern und meist einer Farbe.`,
      `${basis.en} Share of offers at ${LARGE_G / 1000} kg or above. A low share alongside a high maximum means the large spool exists but hangs on few suppliers and usually one colour.`,
    ),
  };

  upsertSource(m, source);
  writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
  written++;
  rows.push([m.id, fl.length, weights.length, max / 1000, sharePct, sizes.length]);
}

console.log(`${written} Werkstofftypen mit Spulenlogistik aus dem Marktbestand belegt (Stand ${meta.version}).\n`);
console.log("  Werkstoff     Produkte  Spulen   max kg   ab 2 kg   Groessen");
for (const [id, nf, nw, max, share, ns] of rows.sort((a, b) => b[3] - a[3] || b[4] - a[4])) {
  console.log(
    `  ${id.padEnd(13)}${String(nf).padStart(7)}${String(nw).padStart(9)}${String(max).padStart(9)}` +
      `${String(`${share} %`).padStart(10)}${String(ns).padStart(11)}`,
  );
}

if (skipped.length) {
  console.log(`\n  Nicht belegt (${skipped.length}) - Feld bleibt leer statt geraten:`);
  for (const [id, why] of skipped) console.log(`    ${id.padEnd(13)} ${why}`);
}
console.log(
  `\n  Schwellen: mindestens ${MIN_PRODUCTS} Produkte UND ${MIN_SPOOLS} Spulen.` +
    "\n  Zwei Zaehlungen, weil zwei Produkte mit je zwoelf Farben sonst wie ein Markt aussehen.",
);
