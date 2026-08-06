/**
 * Werkstoffdaten in zwei Buendel teilen: Zahlen und Prosa.
 *
 * WARUM
 * Eine Werkstoffdatei besteht zu 48 % aus zweisprachigen Notiztexten. Die Engine liest
 * davon nichts - sie rechnet mit Zahlen, Skalen und Konfidenzen. Gelesen werden die Notizen
 * an genau vier Stellen: Datenblattansicht, Brandschutzansicht, CSV-Export und die
 * Chemikalienmatrix. Alle vier sind Ziele, die der Besucher ansteuert, keine, die er beim
 * ersten Bild sieht.
 *
 * Gemessen am 2026-08-05, indem die Notizen versuchsweise entfernt und neu gebaut wurde:
 *
 *   Erstaufruf mit Notizen     305,5 kB von 320   (95 %)
 *   Erstaufruf ohne Notizen    200,0 kB von 320   (62 %)
 *
 * 105 kB gzip, und damit die Antwort auf die Frage, die sich beim Anlegen von `ppa-cf`
 * gestellt hat: Ein Werkstofftyp kostet rund 10 kB im Erstaufruf, es waren noch anderthalb
 * Typen Luft. Jetzt sind es wieder gut ein Dutzend.
 *
 * WIE
 * Zwei Dateien mit GLEICHER Verschachtelung, damit das Zusammenfuehren ein simples
 * Tiefen-Merge ist und kein Pfad-Geflecht, das bei jeder Schemaaenderung nachgezogen
 * werden muss:
 *
 *   materials.json       alles ausser `note` und `question`
 *   material-notes.json  NUR `note` und `question`, an derselben Stelle im Baum
 *
 * Beide sind erzeugt und stehen nicht im Git - `.gitignore` haelt sie draussen, und die
 * npm-Hooks `pretypecheck`, `pretest` und `prebuild` erzeugen sie vor jedem Lauf, der sie
 * braucht. Kanonisch bleibt `data/materials/*.json`; diese Dateien sind Ableitungen wie
 * das CSV im `dist`.
 *
 * WAS BEWUSST DRIN BLEIBT
 * `chemicalResistance` mit `chemicalId` und `rating`, denn die Engine filtert und bewertet
 * damit (constraints.ts, criteria.ts). Nur die Notiz je Eintrag wandert. Ebenso bleiben
 * `governance.sources` im Kern - die Quellenliste ist kurz, und `evidence.ts` braucht die
 * Obergrenzen.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "data/materials");
const OUT = path.join(ROOT, "src/data/generated");

const IS_NOTE = (k) => k === "note" || k === "question";

/** Alles ausser den Notizen. Leere Objekte entstehen dabei nicht - Notizen stehen nie allein. */
function core(node) {
  if (node === null || typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(core);
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (IS_NOTE(k)) continue;
    out[k] = core(v);
  }
  return out;
}

/**
 * Nur die Notizen, an derselben Stelle im Baum. Zweige ohne Notiz fallen weg, damit die
 * Datei nicht das ganze Geruest ein zweites Mal traegt.
 *
 * Arrays behalten ihre LAENGE und Position - `chemicalResistance[7].note` muss beim
 * Zusammenfuehren wieder auf denselben Eintrag treffen. Positionen ohne Notiz stehen als
 * `null`; ein Loch waere billiger, aber JSON kennt keine duennen Arrays.
 */
function notesOnly(node) {
  if (node === null || typeof node !== "object") return undefined;
  if (Array.isArray(node)) {
    const items = node.map(notesOnly);
    return items.some((x) => x !== undefined) ? items.map((x) => x ?? null) : undefined;
  }
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (IS_NOTE(k)) { out[k] = v; continue; }
    const sub = notesOnly(v);
    if (sub !== undefined) out[k] = sub;
  }
  return Object.keys(out).length ? out : undefined;
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".json")).sort();
const materials = [], notes = {};

for (const f of files) {
  const m = JSON.parse(readFileSync(path.join(SRC, f), "utf8"));
  materials.push(core(m));
  const n = notesOnly(m);
  if (n) notes[m.id] = n;
}

mkdirSync(OUT, { recursive: true });
const coreJson = `${JSON.stringify(materials)}\n`;
const notesJson = `${JSON.stringify(notes)}\n`;
writeFileSync(path.join(OUT, "materials.json"), coreJson);
writeFileSync(path.join(OUT, "material-notes.json"), notesJson);

const kb = (s) => `${Math.round(s.length / 1024)} kB`;
const raw = files.reduce((n, f) => n + readFileSync(path.join(SRC, f), "utf8").length, 0);
console.log(`${files.length} Werkstoffdateien geteilt (${Math.round(raw / 1024)} kB roh):`);
console.log(`  src/data/generated/materials.json        ${kb(coreJson).padStart(7)}   Zahlen, Skalen, Konfidenzen`);
console.log(`  src/data/generated/material-notes.json   ${kb(notesJson).padStart(7)}   nur \`note\` und \`question\``);
console.log("\n  Der Kern liegt im Erstaufruf, die Notizen werden nachgeladen - von der");
console.log("  Datenblattansicht, der Brandschutzansicht und dem CSV-Export.");
console.log("  Kanonisch bleibt data/materials/*.json; diese beiden sind Ableitungen.");
