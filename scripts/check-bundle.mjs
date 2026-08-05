/**
 * Bundle-Budget - zwei Zahlen statt einer.
 *
 * WARUM DIESE PRUEFUNG UMGEZOGEN IST
 * Sie stand bisher nur in der GitHub-Action und nicht in `npm run ci`. Wer lokal alles
 * gruen sah, konnte trotzdem ueber Budget sein - beim OFD-Import und beim
 * FormFutura-Import ist genau das zweimal hintereinander passiert. Eine Grenze, die man
 * erst nach dem Push sieht, kommt zu spaet. Sie laeuft jetzt am Ende von `npm run ci`.
 *
 * WARUM ZWEI BUDGETS
 * Bis zum 2026-08-04 hing alles in einem einzigen Brocken, und die Summe ALLER Dateien
 * war deshalb dasselbe wie der Erstaufruf. Seit Herstelleransicht und Matrix nachgeladen
 * werden, sind es zwei verschiedene Dinge:
 *
 *   ERSTAUFRUF  - was ein Besucher laden muss, bevor er irgendetwas sieht. Das ist die
 *                 Zahl, die ueber Ladezeit und Lighthouse entscheidet. Sie wird aus
 *                 dist/index.html gelesen, nicht geraten: genau die Dateien, die dort
 *                 als <script> und <stylesheet> stehen.
 *   GESAMT      - alles zusammen. Begrenzt, damit nachgeladene Brocken nicht zur
 *                 Abstellkammer werden. Wachstum soll sichtbar bleiben, nicht nur
 *                 verschoben.
 *
 * WAS DIE ZAHLEN BEDEUTEN
 * Rund 250 kB des Bestands sind DATEN, nicht Code - die Datenbank IST das Produkt, und
 * sie waechst absichtlich. Reisst der Erstaufruf erneut, ist der naechste Schritt nicht
 * eine hoehere Grenze, sondern die naechste Aufteilung: Glossar und Anwendungsfaelle
 * haengen ebenfalls im Erstaufruf, obwohl der Weg durch das Werkzeug ohne sie auskommt.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const ASSETS = path.join(DIST, "assets");

const ENTRY_BUDGET = 320 * 1024;
const TOTAL_BUDGET = 500 * 1024;

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
const gz = (file) => gzipSync(readFileSync(file)).length;

let html;
try {
  html = readFileSync(path.join(DIST, "index.html"), "utf8");
} catch {
  console.error("dist/index.html fehlt - erst `npm run build` laufen lassen.");
  process.exit(1);
}

/* Der Erstaufruf ist das, was im HTML verlinkt ist - nicht das, was wir dafuer halten.
   Wird eine Ansicht wieder statisch importiert, waechst diese Zahl automatisch mit. */
const entryNames = [...html.matchAll(/(?:src|href)="[^"]*\/assets\/([^"]+\.(?:js|css))"/g)].map((m) => m[1]);
if (!entryNames.length) {
  console.error("In dist/index.html ist kein Asset verlinkt - der Build ist kaputt.");
  process.exit(1);
}

const all = readdirSync(ASSETS).filter((f) => f.endsWith(".js") || f.endsWith(".css"));
const rows = all
  .map((f) => ({ name: f, raw: statSync(path.join(ASSETS, f)).size, gzip: gz(path.join(ASSETS, f)), entry: entryNames.includes(f) }))
  .sort((a, b) => b.gzip - a.gzip);

const entry = rows.filter((r) => r.entry).reduce((s, r) => s + r.gzip, 0);
const total = rows.reduce((s, r) => s + r.gzip, 0);

console.log("  gzip     roh      Datei");
for (const r of rows) {
  console.log(`  ${kb(r.gzip).padStart(8)} ${kb(r.raw).padStart(9)}  ${r.name}${r.entry ? "   <- Erstaufruf" : ""}`);
}
console.log();
console.log(`  Erstaufruf: ${kb(entry).padStart(9)}  von ${kb(ENTRY_BUDGET)}  (${((100 * entry) / ENTRY_BUDGET).toFixed(0)} %)`);
console.log(`  Gesamt:     ${kb(total).padStart(9)}  von ${kb(TOTAL_BUDGET)}  (${((100 * total) / TOTAL_BUDGET).toFixed(0)} %)`);

let failed = false;
if (entry > ENTRY_BUDGET) {
  console.error(`\n::error::Erstaufruf über Budget: ${kb(entry)} > ${kb(ENTRY_BUDGET)}`);
  failed = true;
}
if (total > TOTAL_BUDGET) {
  console.error(`\n::error::Gesamtbundle über Budget: ${kb(total)} > ${kb(TOTAL_BUDGET)}`);
  failed = true;
}
if (failed) {
  console.error("Nicht die Grenze anheben. Die naechste Ansicht aufteilen - siehe Kopf dieser Datei.");
  process.exit(1);
}
