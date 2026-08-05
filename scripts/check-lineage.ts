/**
 * Markenuebergreifende Messungsdubletten finden.
 *
 * WARUM ES DAS BRAUCHT
 * Dreimal ist im Bestand dasselbe passiert, und dreimal ist es erst per Hand aufgefallen:
 *
 *   FormFutura ePLA/Galaxy  = Nebula PLA Premium + 5 Varianten   eine PLA-Rohstofftabelle
 *   Alzament ABS/ASA/PLA    = Bambu ABS/ASA/PLA Basic            zeilenweise dasselbe Blatt
 *   FormFutura STYX PA6-CF  = Spectrum PA6 Low Warp CF15         9 von 9 Werten gleich
 *
 * Das ist kein Zufall und kein Einzelfall, sondern die Normalform des Marktes: Ein
 * Compoundeur beliefert mehrere Marken, und alle geben die Tabelle des Lieferanten
 * weiter. Fuer ein Vergleichswerkzeug ist das die gefaehrlichste Art von Fehler, weil
 * sie sich als STAERKE tarnt - zwei Hersteller, die sich scheinbar bestaetigen, sind
 * ueberzeugender als einer. Tatsaechlich ist es eine Messung unter zwei Logos.
 *
 * WAS DIESES SKRIPT TUT UND WAS NICHT
 * Es findet Produktpaare verschiedener Marken, deren Kennwerte zifferngleich sind. Es
 * entscheidet NICHT, ob das ein Uebernahmefall ist - dafuer muss man die Blaetter lesen.
 * Es erzeugt eine Arbeitsliste, so wie `import:ofd-datasheets` eine erzeugt.
 *
 * DIE SCHWELLE
 * Mindestens 5 zifferngleiche Kennwerte UND mindestens 80 % der gemeinsam belegten
 * Felder. Beides zusammen, weil keines allein traegt: Zwei Datensaetze mit nur drei
 * Feldern sind schnell zu 100 % gleich, und fuenf Treffer unter dreissig Feldern sind
 * Streuung. Prozessparameter (Duesen-, Betttemperatur, Druckgeschwindigkeit) zaehlen
 * nicht mit - das sind Empfehlungen, keine Messungen, und dass zwei PLA-Blaetter
 * 210 °C empfehlen, sagt nichts ueber ihre Herkunft.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROD = path.join(ROOT, "data/products");

/* Empfehlungen, keine Messungen. */
const PROCESS = new Set([
  "nozzleTemperature", "bedTemperature", "chamberTemperature",
  "dryingTemperature", "printSpeed", "coolingFanPct", "minNozzleDiameter",
]);

export const MIN_IDENTICAL = 5;
export const MIN_SHARE = 0.8;

/* Bewusst schmal: Dieses Skript braucht Marke, Name und die Kennwerte - sonst nichts.
   Ein vollstaendiger Produkttyp wuerde es an das Schema binden, ohne etwas zu gewinnen. */
export interface LineageProduct {
  id?: string;
  brand: string;
  productName: string;
  /** Von scripts/derive-lineage.ts gesetzt, sobald der Fall bewertet ist. */
  sharedLineage?: { with: string[] };
  properties?: Record<string, { value?: number | null; confidence?: string }>;
}

export interface LineagePair {
  a: LineageProduct;
  b: LineageProduct;
  identical: number;
  shared: number;
  handled: boolean;
}

function measured(p: LineageProduct): Map<string, number> {
  const m = new Map<string, number>();
  for (const [k, v] of Object.entries(p.properties ?? {})) {
    if (PROCESS.has(k)) continue;
    if (typeof v.value !== "number") continue;
    m.set(k, v.value);
  }
  return m;
}

/**
 * Ist dieses Paar bereits bewertet?
 *
 * Massgeblich ist `sharedLineage` - das Feld, das `derive-lineage.ts` setzt, wenn der
 * Fall geprueft und die Folge gezogen ist. Die erste Fassung las stattdessen "traegt
 * jeder Wert `low`", und das ging aus zwei Gruenden schief: Ein Datensatz mit einem
 * einzigen NICHT geteilten Wert auf `medium` galt als unbehandelt, obwohl er es war -
 * und umgekehrt galt jeder Datensatz aus einer schwachen Quelle als behandelt, ohne dass
 * je jemand hingesehen haette. Eine Kennzeichnung ist eine Aussage, eine Konfidenz nicht.
 */
function isDeclared(a: LineageProduct, b: LineageProduct): boolean {
  const names = (p: LineageProduct) => new Set(p.sharedLineage?.with ?? []);
  if (a.id && names(b).has(a.id)) return true;
  if (b.id && names(a).has(b.id)) return true;
  return false;
}

export function findLineagePairs(products: LineageProduct[]): LineagePair[] {
  const sigs = products.map(measured);
  const out: LineagePair[] = [];
  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      if (products[i].brand === products[j].brand) continue;
      const a = sigs[i]!, b = sigs[j]!;
      let identical = 0, shared = 0;
      for (const [k, v] of a) {
        if (!b.has(k)) continue;
        shared++;
        if (b.get(k) === v) identical++;
      }
      if (shared === 0) continue;
      if (identical < MIN_IDENTICAL || identical / shared < MIN_SHARE) continue;
      out.push({
        a: products[i]!, b: products[j]!, identical, shared,
        handled: isDeclared(products[i]!, products[j]!),
      });
    }
  }
  return out.sort((x, y) => y.identical - x.identical);
}

/* -------------------------------------------------------------------- Lauf */

/* pathToFileURL statt String-Bastelei: Unter Windows liefert `file://` + Pfad einen
   Slash zu wenig, und der Vergleich schlaegt still fehl - das Skript tut dann nichts. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const products: LineageProduct[] = readdirSync(PROD).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(PROD, f), "utf8")));

  const pairs = findLineagePairs(products);
  const open = pairs.filter((p) => !p.handled);

  const label = (p: LineageProduct) => `${p.brand} ${p.productName}`;
  const lines = [
    "# Markenuebergreifende Messungsdubletten",
    "",
    `Erzeugt von \`npm run check:lineage\`. Schwelle: >= ${MIN_IDENTICAL} zifferngleiche`,
    `Kennwerte und >= ${Math.round(MIN_SHARE * 100)} % der gemeinsam belegten Felder.`,
    "",
    `${pairs.length} Paare, davon ${pairs.length - open.length} bereits bewertet`,
    `und ${open.length} offen.`,
    "",
    "| gleich | gemeinsam | Produkt A | Produkt B | Stand |",
    "|---|---|---|---|---|",
    ...pairs.map((p) => `| ${p.identical} | ${p.shared} | ${label(p.a)} | ${label(p.b)} | ${p.handled ? "bewertet" : "**offen**"} |`),
    "",
  ];
  mkdirSync(path.join(ROOT, "data/_sources"), { recursive: true });
  writeFileSync(path.join(ROOT, "data/_sources/lineage-worklist.md"), `${lines.join("\n")}\n`);

  console.log(`${pairs.length} markenuebergreifende Dubletten oberhalb der Schwelle.`);
  console.log(`  ${pairs.length - open.length} bereits bewertet · ${open.length} offen\n`);
  console.log("  gleich/gemeinsam  Produkt A                            Produkt B");
  for (const p of pairs.slice(0, 12)) {
    console.log(`  ${String(p.identical).padStart(5)}/${String(p.shared).padEnd(11)}${label(p.a).padEnd(36)}${label(p.b)}${p.handled ? "" : "   <- offen"}`);
  }
  if (pairs.length > 12) console.log(`  ... ${pairs.length - 12} weitere in data/_sources/lineage-worklist.md`);
  console.log("\n  Das Skript entscheidet NICHT, ob ein Paar eine Uebernahme ist - dafuer muss");
  console.log("  man die Blaetter lesen. Es sagt nur, wo sich das Nachsehen lohnt.");
}
