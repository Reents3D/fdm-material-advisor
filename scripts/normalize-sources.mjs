/**
 * Quellenlisten in eine stabile, sinnvolle Reihenfolge bringen.
 *
 * DAS PROBLEM: RAUSCHEN, DAS ECHTE AENDERUNGEN VERSTECKT
 * Die Quellenliste eines Datensatzes waechst durch Anhaengen. Wenn ein Importer die
 * Datei neu schreibt und die nachgelagerten Schritte ihre Quellen wieder hinzufuegen,
 * landen sie am ENDE statt an ihrer alten Stelle - der Inhalt ist identisch, die Datei
 * sieht geaendert aus. In dieser Sitzung sind so dreimal 17 bis 19 Dateien im Diff
 * aufgetaucht, ohne dass sich ein Wert geaendert haette.
 *
 * Das ist nicht bloss unschoen. Der Extrudr-Datenverlust am 2026-08-05 wurde nur deshalb
 * bemerkt, weil jemand die Zeilenstatistik des Commits gelesen hat. Rauschen macht genau
 * diese Kontrolle unbrauchbar: Wer bei jedem Lauf zwanzig Dateien ohne Inhalt sieht,
 * schaut irgendwann nicht mehr hin.
 *
 * DIE SORTIERUNG IST NICHT ALPHABETISCH, SONDERN NACH BELEGKRAFT
 * Alphabetisch waere stabil, aber die Liste steht auch in der Oberflaeche - unter jedem
 * Werkstoff und in jedem PDF-Bericht. Dort gehoert die belastbarste Quelle nach oben.
 * Die Reihenfolge folgt deshalb der Quellenhierarchie aus SOURCES.md §2 und faellt erst
 * bei Gleichstand auf die ID zurueck:
 *
 *   1 manufacturer-tds       Herstellerdatenblatt mit Pruefnorm
 *   2 manufacturer-website   Herstellerangabe ohne Blatt
 *   3 field-experience       eigene Fertigungserfahrung
 *   4 retailer-listing       Haendlerpreis, Marktbeobachtung
 *   5 community              gemeinschaftlich gepflegte Datenbank
 *   6 estimate               fachliche Ableitung ohne Primaerquelle
 *
 * KEINE POSITIONSABHAENGIGKEIT IM CODE
 * Geprueft vor der Umstellung: Kein Skript und keine Ansicht greift auf `sources[0]` zu.
 * Alle Zugriffe laufen ueber `find` nach ID oder ueber `map` ueber die ganze Liste. Die
 * Sortierung aendert also nur, was ein Mensch sieht - und das zum Besseren.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Quellenhierarchie nach SOURCES.md §2. Unbekannte Typen landen hinten. */
const RANK = {
  "manufacturer-tds": 1,
  "manufacturer-website": 2,
  "field-experience": 3,
  "retailer-listing": 4,
  community: 5,
  estimate: 6,
};

const rank = (s) => RANK[s?.type] ?? 99;

let files = 0, changed = 0, lists = 0;

for (const dir of ["data/materials", "data/products"]) {
  const abs = path.join(ROOT, dir);
  for (const f of readdirSync(abs).filter((x) => x.endsWith(".json"))) {
    const p = path.join(abs, f);
    const raw = readFileSync(p, "utf8");
    const rec = JSON.parse(raw);
    files++;

    const src = rec.governance?.sources;
    if (!Array.isArray(src) || src.length < 2) continue;
    lists++;

    const before = src.map((s) => s.id).join("|");
    src.sort((a, b) => (rank(a) - rank(b)) || String(a.id).localeCompare(String(b.id)));
    if (src.map((s) => s.id).join("|") === before) continue;

    writeFileSync(p, `${JSON.stringify(rec, null, 2)}\n`);
    changed++;
  }
}

console.log(`${files} Dateien geprueft · ${lists} mit mehr als einer Quelle · ${changed} umsortiert.`);
console.log("  Reihenfolge nach Belegkraft (SOURCES.md §2), bei Gleichstand nach ID.");
console.log("  Zweck ist Determinismus: Ohne stabile Reihenfolge tauchen bei jedem Lauf");
console.log("  zwanzig inhaltsgleiche Dateien im Diff auf und verstecken die echten.");
