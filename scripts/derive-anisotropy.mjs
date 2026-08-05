/**
 * Anisotropiefaktor aus Produktdatenblättern ableiten - für Werkstofftypen, die selbst
 * keine Z-Werte tragen.
 *
 * WORUM ES GEHT
 * Der Anisotropiefaktor ist Z-Zugfestigkeit geteilt durch XY-Zugfestigkeit und laut
 * DATA_MODEL B.1 "die Zahl, die sonst niemand sauber ausweist". Das Kriterium
 * `layerAdhesion` der Engine liest ihn. Er steht bei 13 von 41 Werkstofftypen - bei den
 * uebrigen 28 nicht, weil kaum ein Hersteller Z-Werte veroeffentlicht.
 *
 * 31 PRODUKTE HABEN BEIDES, UND SIE DECKEN DREI LUECKEN
 * Auf der Produktebene liegen 31 Datenblaetter mit Z UND XY aus demselben Pruefdurchgang.
 * Sie gehoeren zu 16 Werkstofftypen, von denen 13 den Faktor bereits tragen. Uebrig
 * bleiben drei: `paht-cf`, `pc-fr` und `pla-tough`.
 *
 * DIE OPERANDEN KOMMEN AUS EINEM BLATT, NICHT AUS DEM DATENSATZ
 * Das ist der Kern von Regel R10: Ein Faktor aus dem XY-Wert des einen und dem Z-Wert
 * eines anderen Herstellers ist eine Phantasiezahl. Bei diesen drei Typen stammt die
 * Werkstoff-XY-Festigkeit von einem anderen Hersteller als das Blatt mit den Z-Werten -
 * gerechnet wird deshalb AUSSCHLIESSLICH innerhalb eines Produktblattes, und die Notiz
 * nennt das Produkt. Dasselbe Vorgehen wie bei `derive-flame-from-products.mjs`: Der
 * Werkstofftyp erbt keine Eigenschaft, er bekommt einen benannten Beleg.
 *
 * WO DIE QUELLEN SICH WIDERSPRECHEN, WIRD NICHT GEMITTELT
 * Bei `paht-cf` stehen 0,73 (Bambu Lab) und 0,18 (Ultrafuse) nebeneinander - Faktor vier
 * auf derselben Werkstoffbezeichnung. Ein Mittelwert daraus waere die stille Luege, gegen
 * die das ganze Datenmodell gebaut ist. Solche Faelle bekommen eine `openQuestion` statt
 * einer Zahl.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAT = path.join(ROOT, "data/materials");
const PROD = path.join(ROOT, "data/products");

/* Ab welchem Verhaeltnis gelten zwei Quellen als widerspruechlich? Faktor 1,5 - darunter
   ist es Streuung zwischen Chargen und Maschinen, darueber eine andere Aussage. */
const CONFLICT = 1.5;

const t = (de, en) => ({ de, en });
const round = (x) => Math.round(x * 100) / 100;

const products = readdirSync(PROD).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(PROD, f), "utf8")));

/* Quellenreine Paare: Z und XY aus DEMSELBEN Blatt. */
const pairs = new Map();
for (const p of products) {
  const z = p.properties?.tensileStrengthZ, x = p.properties?.tensileStrengthXy;
  if (z?.value == null || x?.value == null || x.value === 0) continue;
  if (!pairs.has(p.materialId)) pairs.set(p.materialId, []);
  pairs.get(p.materialId).push({
    product: p, factor: z.value / x.value, z: z.value, x: x.value,
    printed: p.specimenType === "printed",
  });
}

let written = 0, conflicts = 0, skipped = 0;
const rows = [];

for (const file of readdirSync(MAT).filter((f) => f.endsWith(".json")).sort()) {
  const fp = path.join(MAT, file);
  const m = JSON.parse(readFileSync(fp, "utf8"));
  if (m.mechanics?.anisotropyFactorTensile?.value != null) continue;   // schon belegt
  const cands = pairs.get(m.id);
  if (!cands?.length) { skipped++; continue; }

  const lo = Math.min(...cands.map((c) => c.factor));
  const hi = Math.max(...cands.map((c) => c.factor));

  if (cands.length > 1 && hi / lo >= CONFLICT) {
    /* Widerspruch: keine Zahl, sondern eine offene Frage mit beiden Belegen. */
    const list = cands.map((c) => `${round(c.factor)} (${c.product.brand} ${c.product.productName}, ${c.z}/${c.x} MPa)`).join(" · ");
    m.governance ??= {};
    m.governance.openQuestions ??= [];
    const qid = "oq_anisotropy_conflict";
    if (!m.governance.openQuestions.some((q) => q.id === qid)) {
      m.governance.openQuestions.push({
        id: qid,
        question: t(
          `Der Anisotropiefaktor lässt sich aus ${cands.length} Produktblättern ableiten, und sie widersprechen sich um den Faktor ${round(hi / lo)}: ${list}. Beide Blätter rechnen quellenrein, der Unterschied liegt also am Werkstoff oder an der Prüfung — nicht an der Rechnung. Solange nicht geklärt ist, welches Blatt den hier geführten Typ beschreibt, bleibt der Faktor leer; ein Mittelwert wäre eine erfundene Zahl.`,
          `The anisotropy factor can be derived from ${cands.length} product sheets, and they contradict each other by a factor of ${round(hi / lo)}: ${list}. Both sheets calculate source-pure, so the difference lies in the material or the testing — not in the arithmetic. Until it is clear which sheet describes the type held here, the factor stays empty; an average would be an invented figure.`,
        ),
        affectsFields: ["mechanics.anisotropyFactorTensile"],
        blocking: false,
      });
      writeFileSync(fp, `${JSON.stringify(m, null, 2)}\n`);
      conflicts++;
      rows.push([m.id, "KONFLIKT", `${round(lo)}–${round(hi)}`, `${cands.length} Blätter, Faktor ${round(hi / lo)}`]);
    }
    continue;
  }

  /* Einig oder einzeln: gedruckte Prüfkörper haben Vorrang, sie sind für FDM aussagekräftig. */
  const best = [...cands].sort((a, b) => Number(b.printed) - Number(a.printed))[0];
  const p = best.product;
  const srcId = p.governance?.sources?.[0]?.id;
  const factor = round(best.factor);

  m.mechanics ??= {};
  m.mechanics.anisotropyFactorTensile = {
    value: factor, unit: "-", orientation: "Z",
    source: "estimate_reasoning",
    confidence: "estimated",
    derivedFrom: ["mechanics.tensileStrengthZ", "mechanics.tensileStrengthXy"],
    conditions: `Beide Operanden aus dem Blatt von ${p.brand} ${p.productName}${srcId ? "" : ""} — nicht aus diesem Datensatz`,
    note: t(
      `Senkrecht zur Schicht bleiben ${Math.round(factor * 100)} % der Zugfestigkeit erhalten (${best.z} von ${best.x} MPa). Beide Operanden stammen aus EINEM Datenblatt, dem von ${p.brand} ${p.productName} — dieser Werkstofftyp führt selbst keine Z-Festigkeit. Der Faktor beschreibt damit dieses Produkt, nicht den Typ als Ganzes; ein anderer Hersteller kann deutlich abweichen. Deshalb `+ "`estimated`" + ` und nicht die Konfidenz des Blattes.`,
      `Perpendicular to the layers ${Math.round(factor * 100)} % of the tensile strength remains (${best.z} of ${best.x} MPa). Both operands come from ONE datasheet, that of ${p.brand} ${p.productName} — this material type carries no Z strength of its own. The factor therefore describes this product, not the type as a whole; another manufacturer may differ markedly. Hence ` + "`estimated`" + ` rather than the sheet's confidence.`,
    ),
  };
  writeFileSync(fp, `${JSON.stringify(m, null, 2)}\n`);
  written++;
  rows.push([m.id, String(factor), `${best.z}/${best.x} MPa`, `${p.brand} ${p.productName}${best.printed ? " (gedruckt)" : ""}`]);
}

console.log(`${written} Anisotropiefaktoren aus Produktblaettern abgeleitet, ${conflicts} Widerspruch als offene Frage erfasst.\n`);
if (rows.length) {
  console.log("  Werkstoff     Faktor      Operanden        Beleg");
  for (const [id, f, ops, src] of rows) {
    console.log(`  ${id.padEnd(13)}${f.padEnd(12)}${ops.padEnd(17)}${src}`);
  }
}
console.log(`\n  ${skipped} Werkstofftypen ohne Faktor bleiben ohne - kein Produktblatt mit Z-Werten.`);
console.log("  Die Operanden stammen IMMER aus einem einzigen Blatt (Regel R10). Wo zwei");
console.log("  Blaetter sich um mehr als Faktor 1,5 unterscheiden, wird nicht gemittelt.");
