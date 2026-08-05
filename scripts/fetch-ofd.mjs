/**
 * Holt den Datenbestand der Open Filament Database in den lokalen Arbeitsplatz.
 *
 * WARUM EIN EIGENER SCHRITT UND NICHT DIREKT IM IMPORTER
 * Die Importer dieses Projekts sind bewusst offline und deterministisch: Wer
 * `npm run import:all` zweimal laufen laesst, bekommt zweimal dasselbe Ergebnis. Ein
 * Netzabruf mitten im Importer bricht diese Eigenschaft - dieselbe Zeile Code kaeme je
 * nach Tag zu einer anderen Zahl. Der Abruf ist deshalb ein getrennter Schritt, und die
 * Importer lesen ausschliesslich den lokal abgelegten Stand.
 *
 * WARUM DER STAND NICHT INS REPOSITORY GEHT
 * Die OFD-Daten sind MIT-lizenziert, wir DUERFTEN sie also mitliefern. Wir tun es nicht:
 * Der Bestand wird taeglich neu gebaut und waere als Kopie binnen Tagen veraltet - genau
 * die Falle, die ADR-034 fuer Herstellerdatenblaetter beschreibt. Der Beleg ist die
 * Fundstelle plus Version, nicht die Kopie. Ablage daher unter `data/_sources/ofd/`
 * (gitignoriert), Provenienz ueber `documentVersion` und `retrievedAt` am Datensatz.
 *
 * SPARSAMKEIT
 * Zuerst wird nur `index.json` geholt (wenige hundert Byte). Stimmt die Version mit dem
 * lokalen Stand ueberein, endet der Lauf ohne den 14-MB-Download.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data/_sources/ofd");
const SNAPSHOT = path.join(DIR, "all.json");
const META = path.join(DIR, "meta.json");

const API = "https://api.openfilamentdatabase.org";
const INDEX_URL = `${API}/api/v1/index.json`;
const ALL_URL = `${API}/json/all.json`;

const today = () => new Date().toISOString().slice(0, 10);

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} antwortete mit HTTP ${res.status}`);
  const text = await res.text();
  /* Die API liegt auf GitHub Pages: Ein fehlender Pfad liefert HTTP 200 mit einer
     HTML-Fehlerseite. Ohne diese Pruefung landet eine Fehlerseite als "Datenbestand"
     im Arbeitsplatz und der Importer scheitert erst viel spaeter mit einer
     unverstaendlichen Meldung. */
  if (text.trimStart().startsWith("<")) {
    throw new Error(`${url} lieferte HTML statt JSON - Pfad vermutlich nicht vorhanden`);
  }
  return JSON.parse(text);
}

const localVersion = () => {
  if (!existsSync(META) || !existsSync(SNAPSHOT)) return null;
  try {
    return JSON.parse(readFileSync(META, "utf8")).version ?? null;
  } catch {
    return null;
  }
};

const index = await getJson(INDEX_URL);
const have = localVersion();

if (have === index.version) {
  console.log(`Stand ${index.version} liegt bereits vor - kein Download noetig.`);
  console.log(`  ${SNAPSHOT}`);
  process.exit(0);
}

console.log(have ? `Lokal: ${have} · verfuegbar: ${index.version}` : `Erstabruf: ${index.version}`);
console.log("Lade Gesamtbestand ...");

const all = await getJson(ALL_URL);

mkdirSync(DIR, { recursive: true });
writeFileSync(SNAPSHOT, JSON.stringify(all));
writeFileSync(
  META,
  `${JSON.stringify(
    {
      version: index.version,
      generatedAt: index.generated_at,
      commit: index.commit,
      retrievedAt: today(),
      stats: index.stats,
      source: { index: INDEX_URL, bulk: ALL_URL },
    },
    null,
    2,
  )}\n`,
);

const s = index.stats;
console.log(`Stand ${index.version} abgelegt (erzeugt ${index.generated_at}, Commit ${index.commit.slice(0, 8)}).`);
console.log(
  `  ${s.brands} Marken · ${s.filaments} Filamente · ${s.variants} Varianten · ` +
    `${s.sizes} Spulengroessen · ${s.purchase_links} Kauflinks`,
);
