/**
 * Wie verlaesslich ist ein schwach belegter Preis? - gemessen an der eigenen Geschichte.
 *
 * WARUM DIESES SKRIPT EXISTIERT
 * Die Engine wertet einen geschaetzten und einen erhobenen Preis bis 2026-08-06 exakt
 * gleich. Die naheliegende Korrektur waere ein Abschlag auf Schaetzungen - mit einer
 * Zahl, die man sich ausdenkt. Genau das ist in diesem Projekt verboten.
 *
 * Es gibt aber ein echtes Experiment, und es liegt im Repository: 35 Werkstoffe sind
 * im Lauf der Preiserhebung von einer Schaetzung auf einen erhobenen Preis umgestellt
 * worden, 15 weitere von einem einzigen Haendler auf mehrere. Jeder dieser Uebergaenge
 * ist ein Paar aus "was wir glaubten" und "was wir dann gemessen haben". Dieses Skript
 * liest sie aus der Git-Historie und rechnet daraus die Konstanten in
 * `src/engine/reliability.ts` aus.
 *
 * WAS GEMESSEN WIRD
 * Nicht der Preisfehler in Euro - der interessiert die Engine nicht. Gemessen wird der
 * RANGFEHLER: um wie viele Perzentile verschiebt sich der Werkstoff im Preisfeld, wenn
 * die bessere Zahl kommt? Das ist genau die Groesse, mit der das Scoring rechnet.
 *
 *   Verlaesslichkeit = 1 - Rangfehler / (1/3)
 *
 * Der Nenner ist der Erwartungswert des Abstands zweier voneinander unabhaengiger
 * Raenge. Eine Angabe, die so weit danebenliegt, traegt keine Information mehr und
 * bekommt 0; eine, die den Rang exakt trifft, bekommt 1.
 *
 * ZUSAETZLICH: DIE RICHTUNG
 * Der vorzeichenbehaftete Versatz sagt, ob eine schwache Angabe systematisch zu guenstig
 * oder zu teuer ausfaellt. Das entscheidet, ob eine einseitige Deckelung sachlich
 * begruendet ist oder nur bequem - siehe ADR-040.
 *
 * LAUFZEIT
 * Das Skript liest jede Fassung jeder Werkstoffdatei aus der Historie und braucht dafuer
 * gut eine Minute. Es gehoert deshalb NICHT in `npm run ci`, sondern wird von Hand
 * aufgerufen, wenn die Preiserhebung gewachsen ist:
 *
 *   npm run measure:price-reliability
 */

import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const sh = (cmd) => execSync(cmd, { encoding: "utf8", maxBuffer: 1 << 28 });

/** Erwarteter Abstand zweier unabhaengiger Raenge auf [0,1]. */
const RANDOM_DISTANCE = 1 / 3;

/**
 * Wie viele MARKEN tragen diesen Preis? Die Zahl steht nur in der ausfuehrlichen Notiz
 * ("... N Listenpreise von M Marken (...) ueber K Haendler"), nicht als eigenes Feld -
 * die Datensaetze aelterer Commits haetten es sowieso nicht. Ein einzelnes Angebot
 * bekommt keine solche Notiz und zaehlt als eine Marke.
 */
function brandCount(price) {
  const m = /von (\d+) Marken/.exec(price?.note?.de ?? "");
  return m ? Number(m[1]) : 1;
}

/* ---------- Uebergaenge aus der Historie sammeln ---------- */

const files = sh("git ls-files data/materials").trim().split("\n").filter(Boolean);
/** @type {{estimated: [number, number][], low: [number, number][]}} */
const transitions = { estimated: [], low: [] };

for (const file of files) {
  const commits = sh(`git log --format=%H -- "${file}"`).trim().split("\n").filter(Boolean).reverse();
  let prev = null;
  for (const commit of commits) {
    let record;
    try {
      record = JSON.parse(sh(`git show ${commit}:"${file}"`));
    } catch {
      continue; // Datei existierte in diesem Commit noch nicht oder war ungueltig
    }
    const price = record.commercial?.pricePerKg;
    if (!price || typeof price.value !== "number") continue;
    const now = { value: price.value, confidence: price.confidence };

    /* Schaetzung -> irgendeine Erhebung */
    if (prev?.confidence === "estimated" && now.confidence !== "estimated") {
      transitions.estimated.push([prev.value, now.value]);
    }
    /* duenn -> breit. `derive-price.mjs` vergibt `medium` erst, wenn die Erhebung breit
       ist; `low` heisst dort "erhoben, aber duenn".

       NUR MIT ECHTEM MARKENWECHSEL. Zwei Uebergaenge in der Historie - `tpu-58d` und
       `tpu-85a` - fuehrten auf ein `medium`, das ausschliesslich auf Extrudr-Angeboten
       stand: einmal bei Extrudr selbst, einmal bei 3DJAKE. Beide bewegten den Preis um
       0,0 %, und das ist keine Bestaetigung, sondern eine Tautologie - dieselbe
       Herstellerliste, zweimal gelesen. Solche Paare haben die gemessene
       Verlaesslichkeit schwach belegter Preise von 0,74 auf 0,79 gehoben, ohne dass ein
       einziger unabhaengiger Preis dazugekommen waere.

       Seit 2026-08-06 verlangt `derive-price.mjs` fuer `medium` ohnehin zwei Marken.
       Der Filter hier bleibt trotzdem noetig: Die Historie behaelt die alten Uebergaenge,
       und eine Kalibrierung, die sich aus ihren eigenen Fehlklassifikationen speist,
       waere im Kreis gerechnet. Die Markenzahl steht in der ausfuehrlichen Notiz. */
    if (prev?.confidence === "low" && now.confidence === "medium" && brandCount(price) >= 2) {
      transitions.low.push([prev.value, now.value]);
    }
    prev = now;
  }
}

/* ---------- Rangmassstab: das heutige Preisfeld ---------- */

const materials = readdirSync("data/materials")
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join("data/materials", f), "utf8")));

const field = materials
  .map((m) => m.commercial?.pricePerKg?.value)
  .filter((v) => typeof v === "number")
  .sort((a, b) => a - b);

/** Perzentilrang im Preisfeld. Hoeherer Rang = teurer. */
function rank(value) {
  if (field.length < 2) return 0.5;
  let below = 0;
  let equal = 0;
  for (const v of field) {
    if (v < value) below++;
    else if (v === value) equal++;
  }
  return (below + equal / 2) / field.length;
}

/* ---------- auswerten ---------- */

const LABEL = { estimated: "Schaetzung", low: "ein Haendler" };
const out = {};

console.log(`Preisfeld: ${field.length} Werkstoffe mit Preis, ${field[0]} bis ${field[field.length - 1]} €/kg\n`);

for (const kind of ["estimated", "low"]) {
  const pairs = transitions[kind];
  if (!pairs.length) {
    console.log(`${LABEL[kind]}: kein Uebergang in der Historie - keine Kalibrierung moeglich.`);
    continue;
  }
  const errors = pairs.map(([before, after]) => Math.abs(rank(before) - rank(after)));
  const offsets = pairs.map(([before, after]) => rank(after) - rank(before));
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
  const offset = offsets.reduce((a, b) => a + b, 0) / offsets.length;
  const reliability = Math.max(0, Math.min(1, 1 - mean / RANDOM_DISTANCE));

  const priceErrors = pairs.map(([before, after]) => Math.abs(after - before) / after).sort((a, b) => a - b);
  const medianPrice = priceErrors[Math.floor(priceErrors.length / 2)];

  out[kind] = Math.round(reliability * 100) / 100;

  console.log(`${LABEL[kind]}  (n = ${pairs.length})`);
  console.log(`  Preisfehler, Median          ${(medianPrice * 100).toFixed(1)} %`);
  console.log(`  Rangfehler, Mittel           ${(mean * 100).toFixed(1)} %`);
  console.log(`  systematischer Rangversatz   ${offset >= 0 ? "+" : ""}${(offset * 100).toFixed(1)} %  ` +
    `(${offset >= 0 ? "die schwache Angabe war zu GUENSTIG" : "die schwache Angabe war zu TEUER"})`);
  console.log(`  -> Verlaesslichkeit          ${(reliability * 100).toFixed(0)} %\n`);
}

console.log("Fuer src/engine/reliability.ts:");
console.log(`  price: { estimated: ${out.estimated ?? "?"}, low: ${out.low ?? "?"} }`);
console.log("\nDie Zahlen wandern NICHT automatisch dorthin. Wer sie aendert, aendert Rangfolgen -");
console.log("das gehoert in einen Commit mit dieser Ausgabe daneben, nicht in einen Generatorlauf.");
