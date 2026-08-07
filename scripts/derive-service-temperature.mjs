/**
 * Die eigene Dauergebrauchsempfehlung mitziehen, wenn ihre Grundlage sich bewegt hat.
 *
 * WORUM ES GEHT
 * `thermal.recommendedMaxServiceTemperature` ist der einzige Temperaturwert im Datensatz,
 * den nicht ein Hersteller nennt, sondern dieses Projekt selbst verantwortet: die Grenze
 * für ein DAUERHAFT BELASTETES Bauteil. Ihre Notiz nennt die Rechnung offen, zum Beispiel
 * „HDT-A 84 °C abzüglich 15 K" oder „Glasübergang 145 °C abzüglich 12 K".
 *
 * WAS AUFGEFALLEN IST
 * Die Rechnung ging nie ganz auf: 84 − 15 = 69, geführt waren 70. 69 − 12 = 57, geführt
 * waren 55. Bei allen sieben Werkstoffen, die diese Notiz tragen, ist der geführte Wert das
 * Ergebnis AUF FÜNF GERUNDET. Das ist sinnvoll — eine Empfehlung auf das Grad genau
 * vorzutäuschen wäre falsche Genauigkeit —, stand aber nirgends. Jetzt steht es hier.
 *
 * WARUM ES DIESES SKRIPT BRAUCHT
 * `derive-mechanics.mjs` ersetzt HDT und Glasübergang durch den Median aller Blätter. Damit
 * wandert die GRUNDLAGE dieser Empfehlung — und eine Notiz, die „HDT-A 164 °C abzüglich
 * 15 K" sagt, während daneben 105 °C steht, ist nicht bloss veraltet, sie widerlegt sich
 * selbst. Der Lauf zieht deshalb Wert, Spanne und die zitierten Zahlen nach.
 *
 * DIE KONSERVATIVE GRENZE STEHT AUF DEM NIEDRIGSTEN BLATT, NICHT AUF DEM MEDIAN
 * Erster Versuch war, einfach den neuen Medianwert einzusetzen. Das ging schief, und ein
 * Test hat es gefangen: PETG rutschte damit von 55 auf 65 °C, weil der Median seiner zehn
 * Glasübergänge bei 75 °C liegt. Diese zehn zerfallen aber in zwei Gruppen — 65,5 bis 70
 * bei Bambu, Sunlu und add:north V0, dann 80 bei Fiberlogy, Nebula und add:north. Die 75
 * ist der Punkt DAZWISCHEN, den kein Blatt misst. Eine Empfehlung, die ausdrücklich
 * „konservativ" heisst, darauf zu stellen, ist ein Widerspruch in sich: Wer PETG kauft,
 * bekommt irgendeine dieser Rezepturen, und die Grenze muss für die schlechteste halten.
 *
 * Gerechnet wird deshalb vom NIEDRIGSTEN Blattwert (`min`), nicht vom Median. Der Median
 * steht daneben und beschreibt den Typ; die Empfehlung schützt das Bauteil.
 *
 * WAS ES NICHT TUT
 * Es erfindet keine Empfehlung. Nur Datensätze, deren Notiz die Rechnung ausdrücklich
 * nennt, werden angefasst; die übrigen 34 bleiben, wie sie sind. Und es ändert weder
 * Abschlag noch Bezugsgrösse — beides ist eine fachliche Festlegung, keine Rechnung.
 *
 *   node scripts/derive-service-temperature.mjs [--dry]
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAT = path.join(ROOT, "data/materials");
const DRY = process.argv.includes("--dry");

/** Auf welches Raster die Empfehlung gerundet wird. Siehe Kopf: gemessen, nicht gesetzt. */
const STEP = 5;

/** Die Bezugsgrösse hinter der Beschriftung in der Notiz. */
const BASIS = {
  "HDT-A": ["thermal", "hdtA"],
  "HDT-B": ["thermal", "hdtB"],
  "Glasübergang": ["thermal", "glassTransition"],
};
/** Wie dieselbe Bezugsgrösse im englischen Satz heisst. */
const EN_LABEL = { "HDT-A": "HDT-A", "HDT-B": "HDT-B", "Glasübergang": "glass transition" };

const round5 = (x) => Math.round(x / STEP) * STEP;
const num = (s) => Number(String(s).replace(",", "."));

/** `HDT-B 87 °C` → `HDT-B 85 °C`, aber nicht mitten in `50-60 °C`. */
function recite(text, label, from, to) {
  const esc = String(from).replace(".", "[.,]");
  return text.replace(
    new RegExp(`(${label}\\s+)(?<![-–])${esc}(?![\\d])`, "g"),
    (_, head) => `${head}${to}`,
  );
}

let changed = 0;
const rows = [];

for (const file of readdirSync(MAT).filter((f) => f.endsWith(".json"))) {
  const p = path.join(MAT, file);
  const m = JSON.parse(readFileSync(p, "utf8"));
  const r = m.thermal?.recommendedMaxServiceTemperature;
  if (!r?.note?.de) continue;

  const rule = /(HDT-A|HDT-B|Glasübergang)\s+([\d.,]+)\s*°C\s+abzüglich\s+(\d+)\s*K/.exec(r.note.de);
  if (!rule) continue;

  const [, label, statedBase, offsetStr] = rule;
  const [group, field] = BASIS[label];
  const node = m[group]?.[field];
  if (node?.value == null) continue;
  /* Der konservative Rand der Beweislage, nicht ihre Mitte — siehe Kopf. */
  const actual = node.min ?? node.value;

  const offset = Number(offsetStr);
  const target = round5(actual - offset);
  const oldValue = r.value;

  /* Alle zitierten Bezugsgrössen nachziehen, nicht nur die der Rechnung: Die Notiz nennt
     auch die Zahl, gegen die sie argumentiert („hier HDT-B 87 °C"). */
  let de = r.note.de, en = r.note.en;
  for (const [lab, [g, f]] of Object.entries(BASIS)) {
    const now = m[g]?.[f]?.value;
    if (now == null) continue;
    const cited = new RegExp(`${lab}\\s+([\\d.,]+)\\s*°C`).exec(de);
    if (cited && num(cited[1]) !== now) {
      /* Deutsches Komma, englischer Punkt — die Notiz steht in zwei Sprachen. */
      de = recite(de, lab, cited[1], String(now).replace(".", ","));
      en = recite(en, EN_LABEL[lab], cited[1], now);
    }
  }

  /* Die Rechenklausel neu setzen statt nur ihre Zahl zu ersetzen: Sie steht jetzt auf dem
     niedrigsten Blatt, und das muss dabeistehen — sonst nennt die Notiz eine Zahl, die
     nebenan im Feld nicht auftaucht, und der Leser hält eines von beiden für falsch. */
  const spanned = node.min != null && node.min !== node.value;
  const clause = {
    de: `${label} ${String(actual).replace(".", ",")} °C`
      + (spanned ? ` (niedrigster Blattwert; geführt ist der Median ${String(node.value).replace(".", ",")} °C)` : "")
      + ` abzüglich ${offset} K`,
    en: `${EN_LABEL[label]} ${actual} °C`
      + (spanned ? ` (lowest datasheet figure; the median ${node.value} °C is what the record carries)` : "")
      + ` less ${offset} K`,
  };
  de = de.replace(/(HDT-A|HDT-B|Glasübergang)[^:]*?abzüglich\s+\d+\s*K/, clause.de);
  en = en.replace(/(HDT-A|HDT-B|glass transition)[^:]*?less\s+\d+\s*K/, clause.en);

  const moved = target !== oldValue;
  const retold = de !== r.note.de;
  if (!moved && !retold) continue;

  if (moved) {
    /* Die Spanne begleitet den Wert; sie wandert mit, statt ihn plötzlich auszuschliessen. */
    const d = target - oldValue;
    if (r.min != null) r.min += d;
    if (r.max != null) r.max += d;
    r.value = target;
  }
  r.note = { de, en };

  changed++;
  rows.push(`${m.id.padEnd(9)} ${label} ${statedBase} → ${actual} °C`
    + `${node.min != null ? ` (niedrigstes von ${node.max != null ? "mehreren" : "?"} Blättern, Median ${node.value})` : ""}`
    + `  ·  Empfehlung `
    + `${oldValue} → ${target} °C${moved ? "" : " (unverändert, nur Notiz)"}`);

  if (!DRY) writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
}

rows.forEach((s) => console.log("  " + s));
console.log(`\n${changed} Dauergebrauchsempfehlungen nachgezogen.${DRY ? "  [--dry]" : ""}`);
