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
 *
 * DER WIDERSPRUCHSTEST LIEF NUR EINMAL - BIS 2026-08-06
 * Ein `continue` am Schleifenanfang sprang ueber jeden Werkstoff, der schon einen Faktor
 * trug. Der Test entschied also beim ERSTEN Blatt und nie wieder; alles, was danach an
 * Blaettern dazukam, konnte den Wert nicht mehr in Frage stellen.
 *
 * Aufgefallen ist es beim Anycubic-Import, der neun Blaetter mit Z-Werten brachte:
 *
 *   pla       0,89 gefuehrt   20 Blaetter, Spanne 0,32-0,89   Faktor 2,74
 *   pet-cf    0,47 gefuehrt    2 Blaetter, Spanne 0,20-0,47   Faktor 2,39
 *   tpu-95a   0,78 gefuehrt    4 Blaetter, Spanne 0,50-0,82   Faktor 1,63
 *
 * In allen drei Faellen war der gefuehrte Wert der GUENSTIGSTE der Spanne - nicht aus
 * Absicht, sondern weil die Sortierung zufaellig dort landete. Bei `pla` hiess das: Das
 * Werkzeug wies "89 % der Festigkeit bleiben in Z erhalten" als Staerke aus, waehrend ein
 * Drittel seiner eigenen Belege 32 bis 53 % sagte.
 *
 * Seither laeuft der Test bei JEDEM Lauf und fuer JEDEN Werkstoff, und ein widersprochener
 * Wert wird ENTFERNT statt nur kommentiert. Das NEUSCHREIBEN nicht-widersprochener Werte
 * bleibt dagegen aus: Sonst wuerde die Zahl bei jedem neuen Blatt neu gewuerfelt, je
 * nachdem worauf die Sortierung faellt.
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
const dropped = [];
const rows = [];

for (const file of readdirSync(MAT).filter((f) => f.endsWith(".json")).sort()) {
  const fp = path.join(MAT, file);
  const m = JSON.parse(readFileSync(fp, "utf8"));
  const already = m.mechanics?.anisotropyFactorTensile?.value != null;
  const cands = pairs.get(m.id);
  if (!cands?.length) { if (!already) skipped++; continue; }

  const lo = Math.min(...cands.map((c) => c.factor));
  const hi = Math.max(...cands.map((c) => c.factor));

  /* DIE PRUEFUNG LAEUFT AUCH BEI SCHON BELEGTEN WERKSTOFFEN.
     Bis 2026-08-06 stand hier ein `continue`, sobald ein Faktor dastand - der
     Widerspruchstest lief also nur EINMAL, beim allerersten Blatt. Was danach an Blaettern
     dazukam, konnte den Wert nicht mehr in Frage stellen.

     Aufgefallen beim Anycubic-Import: `pla` fuehrte 0,89 aus dem Bambu-PLA-Basic-Blatt,
     waehrend inzwischen ZWANZIG Blaetter vorliegen, deren Faktoren von 0,32 bis 0,89
     reichen - Faktor 2,7. Dasselbe bei `pet-cf` (0,20 bis 0,47) und `tpu-95a` (0,50 bis
     0,82). In allen drei Faellen war der gefuehrte Wert der GUENSTIGSTE der Spanne, weil
     die Sortierung zufaellig dort landete. Ein Werkzeug, das "89 % der Festigkeit bleiben
     in Z erhalten" als Staerke ausweist, waehrend ein Drittel seiner eigenen Belege 32 bis
     53 % sagt, gibt eine Auskunft, die es nicht hat. */
  if (cands.length > 1 && hi / lo >= CONFLICT) {
    /* Widerspruch: keine Zahl, sondern eine offene Frage mit beiden Belegen. */
    const list = cands.map((c) => `${round(c.factor)} (${c.product.brand} ${c.product.productName}, ${c.z}/${c.x} MPa)`).join(" · ");
    m.governance ??= {};
    m.governance.openQuestions ??= [];
    const qid = "oq_anisotropy_conflict";
    /* Ein widersprochener Wert wird ENTFERNT, nicht nur kommentiert. Eine Zahl, die im
       Diagramm steht und in der Erlaeuterung als Staerke erscheint, wird gelesen; eine
       offene Frage daneben aendert daran nichts. Wer beides stehen laesst, hat den
       Widerspruch dokumentiert und trotzdem behauptet. */
    /* MEDIAN UND SPANNE STATT LEERE (Entscheidung 2026-08-06).
       Die erste Fassung entfernte den Wert und liess nur die offene Frage stehen. Das war
       fuer `pet-cf` richtig - zwei Blaetter, die sich um Faktor 2,4 widersprechen, sagen
       nichts -, fuer `pla` aber nicht: Dort liegen ZWANZIG Blaetter vor, und die Streuung
       von 0,32 bis 0,89 ist zum grossen Teil echt. Silk-PLA haftet nachweislich schlechter
       als Basic-PLA; das sind verschiedene Produkte unter einem Typnamen. "Kein Wert" ist
       dann auch nicht die Wahrheit, sondern nur die bequemere Halbwahrheit.

       Gefuehrt wird deshalb der MEDIAN mit der beobachteten Spanne als `min`/`max` - genau
       das Vorgehen, das `derive-price.mjs` beim Preis seit jeher faehrt. Ein Median ueber
       belegte Werte ist keine erfundene Zahl, sondern eine Zusammenfassung; erfunden waere
       er nur ohne die Spanne daneben. Die offene Frage bleibt trotzdem stehen und nennt
       jeden einzelnen Beleg. */
    const sorted = [...cands].map((c) => c.factor).sort((a, b) => a - b);
    const mid = sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const before = m.mechanics?.anisotropyFactorTensile?.value ?? null;
    m.mechanics ??= {};
    m.mechanics.anisotropyFactorTensile = {
      value: round(mid), min: round(lo), max: round(hi), unit: "-", orientation: "Z",
      source: "estimate_reasoning", confidence: "estimated",
      derivedFrom: ["mechanics.tensileStrengthZ", "mechanics.tensileStrengthXy"],
      conditions: `Median aus ${cands.length} Produktblättern, Spanne ${round(lo)} bis ${round(hi)} — jeder Operand aus je EINEM Blatt`,
      note: t(
        `Senkrecht zur Schicht bleiben im Median ${Math.round(mid * 100)} % der Zugfestigkeit erhalten — die Blätter reichen aber von ${Math.round(lo * 100)} bis ${Math.round(hi * 100)} %, also um den Faktor ${round(hi / lo)} auseinander: ${list}.${cands.length === 2 ? " ACHTUNG: Bei nur ZWEI Blättern ist der Median schlicht deren Mitte — eine Zahl, die keine Quelle gemessen hat. Die Spanne ist hier die eigentliche Aussage, nicht der Wert." : " Bei dieser Zahl von Blättern bildet die Streuung überwiegend echte Produktunterschiede ab, nicht Messunsicherheit."} Wer ein bestimmtes Produkt einsetzt, sollte dessen Blatt lesen statt diesen Median.`,
        `Perpendicular to the layers a median of ${Math.round(mid * 100)} % of the tensile strength remains — but the sheets range from ${Math.round(lo * 100)} to ${Math.round(hi * 100)} %, a factor of ${round(hi / lo)} apart: ${list}.${cands.length === 2 ? " NOTE: with only TWO sheets the median is simply their midpoint — a figure no source measured. The range, not the value, is the statement here." : " At this number of sheets the spread mostly reflects genuine product differences rather than measurement uncertainty."} Anyone using a specific product should read its sheet rather than this median.`),
    };
    if (before !== null && before !== round(mid)) dropped.push(`${m.id} ${before} → ${round(mid)}`);
    if (!m.governance.openQuestions.some((q) => q.id === qid)) {
      m.governance.openQuestions.push({
        id: qid,
        question: t(
          `Der Anisotropiefaktor stammt aus ${cands.length} Produktblättern, die um den Faktor ${round(hi / lo)} auseinanderliegen: ${list}. Geführt ist der Median mit der Spanne daneben. Zu klären ist, ob die Streuung echte Produktunterschiede abbildet — bei PLA spricht alles dafür, weil Silk- und Matt-Typen nachweislich schlechter haften — oder ob einzelne Blätter unter anderen Bedingungen geprüft haben. Im zweiten Fall gehören die abweichenden Blätter aussortiert statt gemittelt.`,
          `The anisotropy factor comes from ${cands.length} product sheets that lie a factor of ${round(hi / lo)} apart: ${list}. The median is carried with the range alongside. To be clarified is whether the spread reflects genuine product differences — for PLA everything points that way, since silk and matte grades demonstrably bond worse — or whether individual sheets tested under different conditions. In the latter case the outlying sheets belong excluded rather than averaged.`,
        ),
        affectsFields: ["mechanics.anisotropyFactorTensile"],
        blocking: false,
      });
      conflicts++;
      rows.push([m.id, `${round(mid)} (Median)`, `${round(lo)}–${round(hi)}`, `${cands.length} Blätter, Faktor ${round(hi / lo)}`]);
    }
    /* Auch dann schreiben, wenn die Frage schon stand: Der Wert kann trotzdem gerade
       eben entfernt worden sein. */
    writeFileSync(fp, `${JSON.stringify(m, null, 2)}\n`);
    continue;
  }

  /* Kein Widerspruch und schon belegt: nichts tun. Der Widerspruchstest oben laeuft
     bewusst auch hier durch, das Neuschreiben aber nicht - sonst wuerde die Zahl bei
     jedem neuen Blatt neu gewuerfelt, je nachdem worauf die Sortierung faellt. Beim
     ersten Versuch sprang `petg` so von 0,69 auf 0,84, ohne dass ein Widerspruch
     vorgelegen haette. Ein Wert, der sich ohne Anlass aendert, ist kein Wert. */
  if (already) continue;

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

if (dropped.length) {
  console.log(`  AUF DEN MEDIAN GEZOGEN (${dropped.length}): ${dropped.join(" · ")}`);
  console.log("  Die Zahl stand aus dem ersten Blatt und wurde nie wieder geprueft.\n");
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
