/**
 * Den Datensatz als CSV veröffentlichen — läuft NACH `vite build` in dist/daten/.
 *
 * WARUM ES DIESE DATEI GIBT
 * `npm run export:csv` stand seit Beginn in der package.json und zeigte auf ein Skript,
 * das es nicht gab. Der Befehl brach also ab. Das hier ist die Umsetzung, nicht bloss
 * eine Ergänzung.
 *
 * WARUM CSV UND NICHT NUR JSON
 * Die Rohdaten liegen längst als JSON offen und sind für Maschinen die bessere Quelle.
 * CSV ist für den anderen Empfänger: den Konstrukteur, der die Tabelle in Excel öffnet,
 * nach HDT sortiert und drei Werkstoffe markiert. Deshalb der Dialekt excel-de —
 * Semikolon, Dezimalkomma, BOM. Ohne BOM zeigt Excel unter Windows aus "Prüfkörper" ein
 * "PrÃ¼fkÃ¶rper", und die Datei ist für genau diesen Empfänger unbrauchbar.
 *
 * WARUM DIESELBEN BAUSTEINE WIE IM BROWSER
 * Die Spaltendefinitionen kommen aus src/lib/exports.ts, dieselbe Datei, die auch der
 * Downloadknopf in der Anwendung benutzt (Node lädt sie per Type Stripping direkt).
 * Zwei Implementierungen wären zwei Wahrheiten — und die veröffentlichte Tabelle wäre
 * irgendwann eine andere als die heruntergeladene.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Node laedt die TypeScript-Dateien hier ohne Buildschritt (Type Stripping, ab 23.6 ohne
 * Flag). Auf aelteren Versionen bricht der Import mit ERR_UNKNOWN_FILE_EXTENSION ab -
 * einer Meldung, aus der niemand die Ursache liest. Deshalb erst pruefen, dann dynamisch
 * importieren: statische Importe werden vor dem Modulrumpf aufgeloest, ein Hinweis
 * danach kaeme zu spaet.
 */
const [MAJOR, MINOR] = process.versions.node.split(".").map(Number);
if (MAJOR < 23 || (MAJOR === 23 && MINOR < 6)) {
  console.error(
    `Node ${process.versions.node} ist zu alt fuer dieses Skript.\n` +
    "Es laedt src/lib/csv.ts und src/lib/exports.ts direkt, damit die veroeffentlichte\n" +
    "und die im Browser heruntergeladene Tabelle aus derselben Quelle stammen. Dafuer\n" +
    "braucht es Node 23.6 oder neuer (empfohlen: 24 LTS).",
  );
  process.exit(1);
}

const { tableToCsv, toCsv } = await import("../src/lib/csv.ts");
const { overviewColumns, valueRows, productRows } = await import("../src/lib/exports.ts");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist", "daten");
const TODAY = new Date().toISOString().slice(0, 10);

const loadDir = (rel) => {
  const dir = path.join(ROOT, rel);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")));
};

const materials = loadDir("data/materials").sort((a, b) => a.id.localeCompare(b.id));
const products = loadDir("data/products").sort(
  (a, b) => a.materialId.localeCompare(b.materialId) || a.brand.localeCompare(b.brand),
);

if (!existsSync(path.join(ROOT, "dist"))) {
  console.error("dist/ fehlt — bitte zuerst `npm run build`.");
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const files = [
  ["materialien-uebersicht.csv", tableToCsv(materials, overviewColumns("de"), "excel-de"),
    "Eine Zeile je Werkstofftyp"],
  ["materialien-kennwerte.csv", toCsv(valueRows(materials, "de"), "excel-de"),
    "Eine Zeile je Einzelkennwert, mit Quelle und Konfidenz"],
  ["hersteller-produkte.csv", toCsv(productRows(products, materials, "de"), "excel-de"),
    "Eine Zeile je Kennwert eines Herstellerprodukts"],
];

for (const [name, content] of files) {
  writeFileSync(path.join(OUT, name), content, "utf8");
}

/**
 * Die Lizenz reist mit. CC BY 4.0 verlangt Namensnennung — wer nur die CSV bekommt,
 * findet sie sonst nirgends, und eine Datei ohne Herkunft ist im Zweifel eine, die
 * niemand nachnutzen darf.
 */
const readme = [
  "FDM-Materialberater — offener Datensatz",
  "=======================================",
  "",
  `Stand: ${TODAY}`,
  `Umfang: ${materials.length} Werkstofftypen, ${products.length} Herstellerprodukte`,
  "",
  "Dateien",
  "-------",
  ...files.map(([name, , purpose]) => `${name}\n    ${purpose}`),
  "",
  "Format",
  "------",
  "UTF-8 mit BOM, Semikolon als Trennzeichen, Dezimalkomma — für Excel in deutscher",
  "Spracheinstellung. Wer die Daten maschinell weiterverarbeitet, nimmt besser das JSON:",
  "https://github.com/Reents3D/fdm-material-advisor/tree/main/data",
  "",
  "Zu den Werten",
  "-------------",
  "Eine leere Zelle bedeutet: keine Angabe. Sie bedeutet nicht null.",
  "Jeder Kennwert in materialien-kennwerte.csv trägt Quelle, Prüfnorm und Konfidenz.",
  "Konfidenz 'geschätzt' heisst: fachlich hergeleitet, ohne Primärquelle.",
  "Vor einem Markenvergleich die Spalte 'Prüfkörper' lesen — Werte an gedruckten",
  "Prüfkörpern und Rohstoffkennwerte aus dem Spritzguss sind nicht vergleichbar.",
  "Die Spalte 'Reents3D-Portfolio' beschreibt unsere Verfügbarkeit und fliesst in keine",
  "Bewertung ein.",
  "",
  "Lizenz",
  "------",
  "Daten: CC BY 4.0. Nachnutzung erwünscht, Namensnennung erforderlich:",
  "",
  "Materialdaten: FDM-Materialberater der Reents Technologies GmbH (https://reents3d.de),",
  "lizenziert unter CC BY 4.0. Quelle: https://github.com/Reents3D/fdm-material-advisor",
  "",
  "Haftung",
  "-------",
  "Richtwerte aus Herstellerangaben und Erfahrung. Sie ersetzen keine",
  "Bauteilqualifizierung. Siehe DISCLAIMER.md im Repository.",
  "",
].join("\n");

writeFileSync(path.join(OUT, "LIESMICH.txt"), readme, "utf8");

const rows = (csv) => csv.split("\r\n").length - 2; // Kopfzeile und Schlusszeilenende abziehen
console.log(`CSV-Export → dist/daten/ (${TODAY})`);
for (const [name, content] of files) {
  console.log(`  ${name.padEnd(32)} ${String(rows(content)).padStart(5)} Datenzeilen`);
}
console.log(`  LIESMICH.txt                     Lizenz und Lesehinweise`);
