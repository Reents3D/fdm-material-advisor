/**
 * Belegte Brandschutzklassen von der Produkt- auf die Werkstoffebene sichtbar machen.
 *
 * DAS PROBLEM
 * Der Anwendungsfall "Bahn-Schaltschrank" fordert UL94 V-0 und lieferte genau EINEN
 * Treffer: PC-FR, mit einem Score von 48 von 100. Wieder ein Sieg durch Uebrigbleiben.
 *
 * Dabei liegen im Bestand mehrere belegte V-0-PRODUKTE:
 *   - add:north PETG Flame Retardant V0 (halogenfrei, ohne roten Phosphor)
 *   - Spectrum PC/ABS FR V0 (V-0 bei 1,5 UND 3,0 mm, Gluehdrahtindex 960 °C)
 * Nur trugen ihre Werkstofftypen - petg und abs-pc - keine Klasse, und der Filter
 * arbeitet auf der Typebene. Zwei belegte Optionen waren damit unauffindbar.
 *
 * WARUM NICHT EINFACH V-0 AN DEN TYP SCHREIBEN
 * Weil es falsch waere, und zwar gefaehrlich falsch. PETG ist NICHT V-0. Nur die
 * flammgeschuetzte Type ist es, und die ist ein anderer Werkstoff als das PETG von der
 * Rolle nebenan - im add:north-Blatt kostet der Flammschutz vier Fuenftel der Zaehigkeit
 * (Bruchdehnung 5 % statt 24 %). Wer "PETG ist V-0" liest und irgendein PETG bestellt,
 * baut ein Bauteil, das die Anforderung nicht erfuellt.
 *
 * DIE LOESUNG
 * Ein eigenes Feld `ul94ViaProduct`, das sagt: "In dieser Familie gibt es eine Type mit
 * dieser Klasse - und zwar diese hier." Der Constraint laesst den Werkstoff damit durch,
 * die Begruendung nennt aber Produkt und Marke, statt die Familie freizugeben.
 *
 * WAS NICHT UEBERNOMMEN WIRD
 *   - HB. Das ist die unterste UL94-Stufe und bedeutet nur "brennt langsam". Als
 *     Brandschutz im Sinne einer Bahn- oder Innenraumanforderung zaehlt es nicht.
 *   - Klassen mit `confidence: estimated`. Siehe ADR-016: Eine Brandschutzklasse ist
 *     eine Aussage ueber ein geprueftes Bauteil, keine Ableitung aus der Polymerklasse.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAT = path.join(ROOT, "data/materials");
const PROD = path.join(ROOT, "data/products");

/* Rangfolge wie im Constraint - hoehere Klasse gewinnt. HB ist bewusst nicht dabei. */
const ORDER = ["V-2", "V-1", "V-0", "5VB", "5VA"];

const t = (de, en) => ({ de, en });

/* Produkte einsammeln, die eine belegte V-Klasse tragen. */
const byMaterial = new Map();
for (const f of readdirSync(PROD).filter((x) => x.endsWith(".json"))) {
  const p = JSON.parse(readFileSync(path.join(PROD, f), "utf8"));
  const ul = p.compliance?.ul94;
  if (!ul?.value || !ORDER.includes(ul.value)) continue;
  if (ul.confidence === "estimated") continue;
  const list = byMaterial.get(p.materialId) ?? [];
  list.push({
    id: p.id, name: p.productName, brand: p.brand,
    ...(ul.thicknessMm != null ? { thicknessMm: ul.thicknessMm } : {}),
    _rank: ORDER.indexOf(ul.value), _class: ul.value, _conf: ul.confidence,
    _sheet: p.datasheet, _publisher: p.manufacturer ?? p.brand,
  });
  byMaterial.set(p.materialId, list);
}

const CONF_RANK = { estimated: 0, low: 1, medium: 2, high: 3 };

let written = 0, skipped = 0;
for (const f of readdirSync(MAT).filter((x) => x.endsWith(".json")).sort()) {
  const p = path.join(MAT, f);
  const m = JSON.parse(readFileSync(p, "utf8"));
  const hits = byMaterial.get(m.id);

  m.compliance ??= {};
  m.compliance.flameRetardancy ??= {};
  const fr = m.compliance.flameRetardancy;

  if (!hits?.length) { delete fr.ul94ViaProduct; continue; }

  /* Beste belegte Klasse in dieser Familie. */
  const best = hits.reduce((a, b) => (b._rank > a._rank ? b : a));
  const sameClass = hits.filter((h) => h._class === best._class);

  /* Traegt der Typ SELBST schon mindestens diese Klasse, ist der Verweis ueberfluessig. */
  const own = fr.ul94?.value;
  if (own && ORDER.indexOf(own) >= best._rank && fr.ul94?.confidence !== "estimated") {
    delete fr.ul94ViaProduct;
    skipped++;
    continue;
  }

  const names = sameClass.map((h) => `${h.brand} ${h.name.replace(new RegExp(`^${h.brand}\\s*`), "")}`.trim());
  const weakest = sameClass.map((h) => h._conf).sort((a, b) => CONF_RANK[a] - CONF_RANK[b])[0];

  /* Die Quelle ist das PRODUKTDATENBLATT. Sie wird in die Quellenliste des
     Werkstoffs aufgenommen, damit der Verweis nachvollziehbar ist und nicht als
     unbelegte Behauptung dasteht (Regel R8). */
  const srcId = `src_flame_${best.id.replace(/-/g, "_")}`;
  m.governance.sources = (m.governance.sources ?? []).filter((x) => !x.id.startsWith("src_flame_"));
  m.governance.sources.push({
    id: srcId, type: "manufacturer-tds", publisher: best._publisher,
    productName: best.name,
    title: best._sheet?.title ?? `${best.name} — Technical Data Sheet`,
    ...(best._sheet?.url ? { url: best._sheet.url } : {}),
    retrievedAt: best._sheet?.retrievedAt ?? "2026-08-02",
    confidenceCeiling: weakest,
    note: t("Datenblatt der flammgeschützten Type dieser Familie. Belegt die UL94-Klasse für DIESES Produkt, nicht für den Werkstofftyp.",
            "Datasheet of the flame-retardant grade in this family. Documents the UL94 class for THIS product, not for the material type."),
  });

  fr.ul94ViaProduct = {
    value: best._class,
    products: sameClass.map(({ id, name, brand, thicknessMm }) => ({
      id, name, brand, ...(thicknessMm != null ? { thicknessMm } : {}),
    })),
    source: srcId,
    confidence: weakest,
    note: t(
      `${m.identity.name} als Werkstofftyp ist NICHT ${best._class} — nur eine ausdrücklich flammgeschützte Type dieser Familie ist es: ${names.join(", ")}. Das ist ein anderer Werkstoff als die Standardtype, und der Flammschutz kostet regelmäßig Zähigkeit. Wer diese Anforderung hat, muss genau diese Type bestellen und sich das Prüfzeugnis geben lassen — eine Datenblattzeile ist kein Zeugnis.`,
      `${m.identity.name} as a material type is NOT ${best._class} — only an explicitly flame-retardant grade in this family is: ${names.join(", ")}. That is a different material from the standard grade, and flame retardancy regularly costs toughness. Anyone with this requirement must order precisely that grade and obtain the test certificate — a datasheet line is not a certificate.`),
  };
  writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
  written++;
  console.log(`  ${m.id.padEnd(10)} ${best._class} über ${names.join(", ")}`);
}

console.log(`\n${written} Werkstofftypen mit Produktverweis versehen, ${skipped} übersprungen (Typ trägt die Klasse selbst).`);
console.log(`Der Verweis gibt die Familie NICHT frei - er nennt die Type, die es kann.`);
