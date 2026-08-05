/**
 * Datenblatt-Fundstellen aus dem Marktbestand - eine Arbeitsliste, kein Datensatz.
 *
 * WAS DIESES SKRIPT AUSDRUECKLICH NICHT TUT
 * Es schreibt keinen einzigen Kennwert. Die Open Filament Database fuehrt keine
 * Mechanik und keine Thermik - sie fuehrt einen Zeiger auf das Herstellerblatt. Aus
 * einem Zeiger einen Kennwert zu machen ist Handarbeit am Blatt, und genau daran
 * haengt die Qualitaet dieser Datenbank. Was hier entsteht, ist die Suchliste davor.
 *
 * WARUM DAS TROTZDEM DER GROESSTE HEBEL IST
 * Die teuerste Minute bei der Datenpflege war bisher nicht das Auswerten, sondern das
 * FINDEN: Herstellerseite oeffnen, Downloadbereich suchen, pruefen ob ueberhaupt ein
 * Blatt existiert. Fuer 164 Filamente ist diese Suche jetzt erledigt.
 *
 * WARUM DIE LISTE NICHT INS REPOSITORY GEHT
 * Sie ist aus einem taeglich neu gebauten Bestand abgeleitet und waere als Datei im
 * Repository binnen Tagen ein falscher Arbeitsstand. Ablage im Arbeitsplatz unter
 * `data/_sources/ofd/`, jederzeit neu erzeugbar.
 *
 * DIE ZWEITE LISTE, DIE HIER MIT ABFAELLT
 * Marken mit vielen Produkten und KEINEM einzigen Blattlink. Das ist die
 * Recherche-Rangliste: Polymaker und 3DXTech stehen mit dutzenden Produkten im
 * Bestand, ohne dass jemand je ein Blatt hinterlegt haette. Wer dort ansetzt, hebt
 * mehr als bei den bereits verlinkten Nachzueglern.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT, MAP, loadSnapshot, filamentsFor } from "./ofd-common.mjs";

const snap = loadSnapshot("ofd-datasheets");
if (!snap) process.exit(0);
const { data: all, meta } = snap;

const OUT = path.join(ROOT, "data/_sources/ofd");
const PRODUCTS = path.join(ROOT, "data/products");

/* Vergleich auf der rohen URL. Absichtlich streng: Zwei URLs, die sich in einem
   Query-Parameter unterscheiden, koennen auf verschiedene Blattversionen zeigen.
   Ein falscher Treffer hier wuerde ein Blatt als "haben wir schon" ausblenden. */
const known = new Map();
for (const f of readdirSync(PRODUCTS).filter((x) => x.endsWith(".json"))) {
  const p = JSON.parse(readFileSync(path.join(PRODUCTS, f), "utf8"));
  if (p.datasheet?.url) known.set(p.datasheet.url.trim(), p.id);
}

const brands = new Map(all.brands.map((b) => [b.id, b.name]));

/* Welcher unserer Werkstofftypen wuerde dieses Filament einsammeln? Dieselbe
   Zuordnungstabelle wie bei den anderen OFD-Importern, damit die Arbeitsliste
   dieselbe Sprache spricht wie die Datensaetze. */
const byMaterial = new Map();
for (const id of Object.keys(MAP)) {
  for (const f of filamentsFor(id, all) ?? []) {
    if (!byMaterial.has(f.id)) byMaterial.set(f.id, []);
    byMaterial.get(f.id).push(id);
  }
}
const ourType = (f) => (byMaterial.get(f.id) ?? []).join(", ") || `— (${f.material})`;

const withTds = all.filaments.filter((f) => f.data_sheet_url);
const withSds = all.filaments.filter((f) => f.safety_sheet_url);
const fresh = withTds.filter((f) => !known.has(f.data_sheet_url.trim()));
const dup = withTds.length - fresh.length;

const group = (list, key) => {
  const m = new Map();
  for (const x of list) {
    const k = key(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
};

const byBrand = group(fresh, (f) => brands.get(f.brand_id) ?? "?");

/* Marken mit Produktbestand, aber ohne einen einzigen Blattlink. */
const brandTotals = new Map();
for (const f of all.filaments) {
  const b = brands.get(f.brand_id) ?? "?";
  const e = brandTotals.get(b) ?? { total: 0, tds: 0 };
  e.total++;
  if (f.data_sheet_url) e.tds++;
  brandTotals.set(b, e);
}
const blind = [...brandTotals.entries()]
  .filter(([, e]) => e.tds === 0 && e.total >= 10)
  .sort((a, b) => b[1].total - a[1].total);

/* ------------------------------------------------------------------ Ausgabe */

const esc = (s) => String(s).replace(/\|/g, "\\|");
const lines = [];
lines.push("# Datenblatt-Arbeitsliste aus der Open Filament Database");
lines.push("");
lines.push(`**Bestand:** ${meta.version} (erzeugt ${meta.generatedAt}, Commit \`${meta.commit.slice(0, 8)}\`)`);
lines.push(`**Erzeugt von:** \`scripts/import/ofd-datasheets.mjs\` · **Abgerufen:** ${meta.retrievedAt}`);
lines.push("");
lines.push(
  "Diese Datei ist ein Arbeitsstand, kein Datenbestand. Sie wird nicht versioniert " +
    "(siehe `.gitignore`) und ist mit `npm run import:ofd-datasheets` jederzeit neu erzeugbar.",
);
lines.push("");
lines.push("## Lage");
lines.push("");
lines.push("| | |");
lines.push("|---|---|");
lines.push(`| Filamente im Bestand | ${all.filaments.length} |`);
lines.push(`| davon mit Datenblatt-Link | **${withTds.length}** (${Math.round((100 * withTds.length) / all.filaments.length)} %) |`);
lines.push(`| davon mit Sicherheitsdatenblatt | ${withSds.length} |`);
lines.push(`| bereits bei uns ausgewertet | ${dup} |`);
lines.push(`| **offen** | **${fresh.length}** |`);
lines.push("");
lines.push(
  "Der Anteil von unter zehn Prozent ist die eigentliche Nachricht: Eine Marktdatenbank " +
    "dieser Groesse ersetzt die Datenblattrecherche nicht, sie verkuerzt sie.",
);
lines.push("");
lines.push("## Offene Fundstellen nach Marke");
lines.push("");

for (const [brand, list] of byBrand) {
  lines.push(`### ${brand} — ${list.length}`);
  lines.push("");
  lines.push("| Produkt | Typ bei uns | Datenblatt |");
  lines.push("|---|---|---|");
  for (const f of list.sort((a, b) => a.name.localeCompare(b.name))) {
    lines.push(`| ${esc(f.name)} | \`${esc(ourType(f))}\` | [TDS](${f.data_sheet_url}) |`);
  }
  lines.push("");
}

lines.push("## Marken ohne jeden Blattlink");
lines.push("");
lines.push(
  "Diese Marken sind mit Produkten im Bestand, aber ohne eine einzige hinterlegte " +
    "Fundstelle. Hier liegt der groessere Hebel als bei den Nachzueglern oben — " +
    "die Blaetter existieren, sie sind nur nirgends erfasst.",
);
lines.push("");
lines.push("| Marke | Produkte |");
lines.push("|---|---|");
for (const [b, e] of blind.slice(0, 25)) lines.push(`| ${esc(b)} | ${e.total} |`);
lines.push("");

mkdirSync(OUT, { recursive: true });
const file = path.join(OUT, "datasheet-worklist.md");
writeFileSync(file, `${lines.join("\n")}\n`);

console.log(`Datenblatt-Abgleich gegen ${known.size} bereits ausgewertete Fundstellen.\n`);
console.log(`  ${withTds.length} von ${all.filaments.length} Filamenten tragen einen Blattlink (${Math.round((100 * withTds.length) / all.filaments.length)} %).`);
console.log(`  ${dup} davon kennen wir bereits, ${fresh.length} sind offen.\n`);
console.log("  Offene Fundstellen nach Marke:");
for (const [b, l] of byBrand) console.log(`    ${String(l.length).padStart(3)}  ${b}`);
console.log("\n  Marken mit Produkten, aber ohne einen einzigen Blattlink:");
for (const [b, e] of blind.slice(0, 10)) console.log(`    ${String(e.total).padStart(3)}  ${b}`);
console.log(`\n  Arbeitsliste geschrieben: ${path.relative(ROOT, file)}`);
console.log("  Sie ist ein Arbeitsstand und wird nicht versioniert.");
