/**
 * Markenuebergreifende Messungsdubletten kennzeichnen und entwerten.
 *
 * `check-lineage.ts` FINDET sie, dieses Skript SETZT die Folge: Jedes betroffene Produkt
 * bekommt `sharedLineage` mit den Partnern, und jeder zifferngleiche Wert wird auf `low`
 * gesetzt. Danach kann keine der beteiligten Marken die andere mehr bestaetigen - genau
 * das ist der Zweck (ADR-038).
 *
 * IM REGELFALL WERDEN BEIDE SEITEN ABGEWERTET
 * Naheliegend waere, die "abgeschriebene" Seite zu entwerten und die "originale" stehen
 * zu lassen. Das setzt aber voraus, dass man die Richtung kennt, und in der Mehrzahl der
 * Faelle kennt man sie nicht: FormFutura gegen Spectrum sind zwei Abfueller, und die
 * Tabelle stammt vermutlich von einem Dritten, den kein Blatt nennt. Dann gibt es keine
 * Vorlage und keine Kopie, sondern zwei Weitergaben derselben fremden Messung. Eine Seite
 * willkuerlich als Original zu fuehren waere eine erfundene Behauptung.
 *
 * Beide abzuwerten ist dagegen genau richtig: Die Konfidenz beschreibt, wie gut fuer einen
 * Wert geradegestanden werden kann - und wenn niemand sagt, wer gemessen hat, kann es
 * keiner der beiden. Das deckt sich mit der bestehenden Definition von `low` in
 * `src/lib/evidence.ts`, wo "kopierte Tabellen" bereits ausdruecklich als Fall stehen.
 *
 * DIE AUSNAHME BRAUCHT EINEN BELEG, KEINE VERMUTUNG
 * Wo die Richtung aus den DATEN hervorgeht, bleibt der Ursprung stehen - sonst wuerde die
 * Regel die beste Quelle des Bestands beschaedigen, weil jemand von ihr abgeschrieben hat.
 * Genau das passierte im ersten Lauf: Bambu ABS und ASA wurden auf `low` gesetzt, weil
 * Alzament sie kopiert hatte. Jede Ausnahme steht unten einzeln, mit ihrem Beleg.
 *
 * WAS NICHT ABGEWERTET WIRD
 * Werte, die nur EIN Produkt der Gruppe fuehrt. Sie sind seine eigene Angabe, auch wenn
 * die uebrigen Zeilen geteilt sind. Und Prozessparameter - dass zwei PLA-Blaetter 210 °C
 * empfehlen, sagt nichts ueber ihre Herkunft.
 *
 * NUR ABWERTEN, NIE AUFWERTEN
 * Wer schon `low` oder `estimated` traegt, bleibt dort. Das Skript ist idempotent: Ein
 * zweiter Lauf aendert nichts.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findLineagePairs, type LineageProduct } from "./check-lineage.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROD = path.join(ROOT, "data/products");

interface ProductRecord extends LineageProduct {
  id: string;
  sharedLineage?: { with: string[]; sharedFields?: string[]; note: { de: string; en: string } };
  properties: Record<string, { value?: number | null; confidence?: string; [k: string]: unknown }>;
}

/**
 * Produkte, deren Vorrang in der Gruppe aus den Daten belegt ist. Sie behalten ihre
 * Konfidenz; die uebrigen Mitglieder der Gruppe werden abgewertet.
 *
 * Die Huerde ist bewusst hoch. "Ist bestimmt der Hersteller" reicht nicht - es muss im
 * Datensatz oder im Blatt stehen. Wer hier einen Eintrag ergaenzt, schreibt den Beleg
 * daneben, sonst ist es eine Behauptung ueber ein Unternehmen.
 */
const ORIGINS = new Map<string, string>([
  ["bambu-abs", "Das Alzament-Blatt desselben Werkstoffs verweist zum Trocknen auf das „X1 Series Printer Heatbed“ — ein Bambu-Gerät — und übernimmt die Zahlen der Bambu-Fassung V3.0 samt deren Tippfehler „MPA“. Der Verweis läuft in eine Richtung."],
  ["bambu-asa", "Wie bei ABS: Das Alzament-Blatt trägt die Bambu-Werte, nicht umgekehrt."],
  ["formfutura-luvocom-paht-cf-9891", "Das Blatt wird von der Lehvoss Group herausgegeben, also vom Compoundeur selbst; M4P führt eine Händler-Materialdatenblattseite. Ein Compoundeur steht stromaufwärts vom Wiederverkäufer."],
  ["extrudr-durapro-abs", "Extrudr (FD3D GmbH) ist Filamenthersteller, 3DJAKE die Eigenmarke des Shopbetreibers Niceshops GmbH. Ein Shop betreibt kein Polymerlabor."],
  ["extrudr-durapro-abs-cf", "Wie DuraPro ABS."],
  ["extrudr-pla-nx2-matt", "Wie DuraPro ABS: Hersteller gegen Shop-Eigenmarke."],
]);

const files = readdirSync(PROD).filter((f) => f.endsWith(".json"));
const records: ProductRecord[] = files.map((f) => JSON.parse(readFileSync(path.join(PROD, f), "utf8")));
const byId = new Map(records.map((r) => [r.id, r]));

/* Transitive Gruppen: Wenn A=B und B=C, gehoeren alle drei zusammen, auch wenn A und C
   einzeln unter der Schwelle blieben. Der PCTG-Fall ist genau so gebaut. */
const parent = new Map<string, string>();
const find = (x: string): string => {
  let r = x;
  while (parent.get(r) !== r) r = parent.get(r)!;
  return r;
};
for (const r of records) parent.set(r.id, r.id);

const pairs = findLineagePairs(records);
const sharedByPair = new Map<string, string[]>();

for (const p of pairs) {
  const a = p.a as ProductRecord, b = p.b as ProductRecord;
  parent.set(find(a.id), find(b.id));
  /* Welche Felder sind zifferngleich? Wird gleich fuer die Abwertung gebraucht. */
  const same: string[] = [];
  for (const [k, v] of Object.entries(a.properties)) {
    if (typeof v.value !== "number") continue;
    if (b.properties[k]?.value === v.value) same.push(k);
  }
  sharedByPair.set(`${a.id}|${b.id}`, same);
}

const groups = new Map<string, ProductRecord[]>();
for (const r of records) {
  if (!pairs.some((p) => (p.a as ProductRecord).id === r.id || (p.b as ProductRecord).id === r.id)) continue;
  const root = find(r.id);
  if (!groups.has(root)) groups.set(root, []);
  groups.get(root)!.push(r);
}

const t = (de: string, en: string) => ({ de, en });

let stamped = 0, downgraded = 0, untouched = 0;
const report: string[][] = [];

let originsKept = 0;

for (const members of groups.values()) {
  const brands = [...new Set(members.map((m) => m.brand))].sort();
  /* Hoechstens EINE Ursprungsmarke je Gruppe. Mehrere Produkte derselben Marke sind kein
     Widerspruch - die transitive Gruppe um 3DJAKE ABS enthaelt zwei Extrudr-Blaetter,
     weil beide dieselben Zahlen tragen. Zwei verschiedene Ursprungsmarken waeren dagegen
     ein Widerspruch: dann stimmt die Ausnahmeliste nicht, und lieber wertet das Skript
     alle ab, als sich zwischen zwei belegten Ursprüngen zu entscheiden. */
  const originsHere = members.filter((m) => ORIGINS.has(m.id));
  const originBrands = new Set(originsHere.map((m) => m.brand));
  const originIds = originBrands.size === 1 ? new Set(originsHere.map((m) => m.id)) : new Set<string>();
  const origin = originIds.size ? originsHere[0]! : null;
  if (originBrands.size > 1) {
    console.warn(`  WARNUNG: Ursprünge aus ${originBrands.size} Marken in einer Gruppe (${[...originBrands].join(", ")}) — alle werden abgewertet.`);
  }

  for (const r of members) {
    const others = members.filter((m) => m.id !== r.id);

    /* Felder, die dieses Produkt mit MINDESTENS EINEM anderen der Gruppe teilt. */
    const shared = new Set<string>();
    for (const o of others) {
      for (const [k, v] of Object.entries(r.properties)) {
        if (typeof v.value !== "number") continue;
        if (o.properties[k]?.value === v.value) shared.add(k);
      }
    }
    if (!shared.size) continue;

    const partnerLabels = others.map((o) => `${o.brand} ${o.productName}`).sort();
    const isOrigin = originIds.has(r.id);

    const tail = isOrigin
      ? t(
          `Für diesen Datensatz ist belegt, dass er nicht die Übernahme ist: ${ORIGINS.get(r.id)} Seine Werte behalten deshalb ihre Konfidenz — die der übrigen Beteiligten nicht.`,
          `For this record it is established that it is not the copy: ${ORIGINS.get(r.id)} Its values therefore keep their confidence — those of the other parties do not.`,
        )
      : origin
        ? t(
            `Als Ursprung dieser Zahlen ist ${origin.brand} ${origin.productName} belegt; dieser Datensatz gibt sie weiter. Die geteilten Werte tragen deshalb ` + "`low`" + `.`,
            `${origin.brand} ${origin.productName} is established as the origin of these figures; this record passes them on. The shared values therefore carry ` + "`low`" + `.`,
          )
        : t(
            `Welche Marke gemessen hat, ist nicht feststellbar — vermutlich keine von ihnen, sondern ein gemeinsamer Compoundeur, den kein Blatt nennt. Es wird deshalb keine Seite als Original geführt; die geteilten Werte tragen bei allen Beteiligten ` + "`low`" + `.`,
            `Which brand did the measuring cannot be established — presumably none of them, but a shared compounder that no sheet names. Neither side is therefore treated as the original; the shared values carry ` + "`low`" + ` for every party involved.`,
          );

    r.sharedLineage = {
      with: others.map((o) => o.id).sort(),
      sharedFields: [...shared].sort(),
      note: t(
        `${shared.size} Kennwerte dieses Datensatzes stehen zifferngleich auch bei: ${partnerLabels.join(" · ")}. Damit sind es nicht ${members.length} Belege, sondern einer. ${tail.de}`,
        `${shared.size} values in this record appear identically at: ${partnerLabels.join(" · ")}. That makes them not ${members.length} pieces of evidence but one. ${tail.en}`,
      ),
    };
    stamped++;

    let n = 0;
    if (isOrigin) {
      originsKept++;
    } else {
      for (const k of shared) {
        const v = r.properties[k]!;
        if (v.confidence === "low" || v.confidence === "estimated") { untouched++; continue; }
        v.confidence = "low";
        n++;
      }
    }
    downgraded += n;
    report.push([`${r.brand} ${r.productName}`, String(shared.size), isOrigin ? "Ursprung" : String(n), brands.join(" + ")]);

    writeFileSync(path.join(PROD, `${r.id}.json`), `${JSON.stringify(r, null, 2)}\n`);
  }
}

console.log(`${groups.size} Dublettengruppen · ${stamped} Datensaetze gekennzeichnet · ${downgraded} Werte auf \`low\` gesetzt.`);
console.log(`  ${untouched} geteilte Werte trugen bereits \`low\` oder \`estimated\` · ${originsKept} Datensaetze als belegter Ursprung verschont.\n`);
console.log("  Datensatz                              geteilt  abgewertet  Gruppe");
for (const [name, sh, dn, brands] of report.sort((a, b) => Number(b[1]) - Number(a[1]))) {
  console.log(`  ${name!.padEnd(38)}${sh!.padStart(5)}${dn!.padStart(11)}   ${brands}`);
}
console.log("\n  Im Regelfall werden ALLE Beteiligten abgewertet: Meist gibt es keine Vorlage und");
console.log("  keine Kopie, sondern zwei Weitergaben derselben fremden Messung. Eine Seite als");
console.log("  Original zu fuehren waere eine erfundene Behauptung.");
console.log("  Verschont wird nur, wessen Vorrang aus den DATEN hervorgeht - die Liste steht");
console.log("  als ORIGINS im Skript, jeder Eintrag mit seinem Beleg.");
console.log("  Werte, die nur EIN Produkt der Gruppe fuehrt, bleiben immer unangetastet.");

if (byId.size !== records.length) console.warn("WARNUNG: doppelte Produkt-IDs im Bestand");
