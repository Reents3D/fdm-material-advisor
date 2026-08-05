/**
 * Der Bestand darf nicht still schrumpfen.
 *
 * DIE LUECKE, DIE DIESER TEST SCHLIESST
 * Dieses Projekt prueft, ob Daten GUELTIG sind - Schema, Plausibilitaet, Provenienz. Es
 * prueft nirgends, ob sie noch DA sind. Am 2026-08-05 hat ein einzeln gestarteter
 * Importer zwoelf Werkstoffdateien um 250 bis 350 Zeilen gekuerzt: 798 Chemikalien-
 * bewertungen und die Preisdaten waren weg, weil er Werkstoffdateien vollstaendig neu
 * schreibt und die nachgelagerten `derive`-Schritte nicht mitliefen.
 *
 * Keine einzige Pruefung schlug an. Die Dateien blieben schemakonform, plausibel und
 * belegt - nur aermer. Aufgefallen ist der Verlust allein an der Zeilenstatistik des
 * Commits, also durch Zufall und Aufmerksamkeit. Beides ist keine Pruefung.
 *
 * WARUM UNTERGRENZEN UND NICHT GLEICHHEIT
 * Der Bestand soll wachsen. Ein Test auf exakte Zahlen wuerde bei jedem Import rot und
 * damit zur Formalie, die man blind nachzieht. Untergrenzen schlagen nur an, wenn etwas
 * VERSCHWINDET - und genau das ist der Fall, den niemand bemerkt.
 *
 * Die Zahlen liegen auf dem Stand vom 2026-08-05, nicht darunter. Wer eine reisst, hat
 * entweder Daten verloren oder bewusst entfernt. Im zweiten Fall gehoert die Zahl
 * nachgezogen und der Grund in die Commit-Nachricht.
 *
 * WAS HIER BEWUSST NICHT STEHT
 * Qualitaetsmasse. Der Anteil belastbarer Werte steht in `evidence-floor.test.ts`, die
 * Zahl der Dubletten in `lineage.test.ts`, die Warnungen des Pruefers in
 * `validator-warnings.test.ts`. Hier geht es nur um Masse: Ist noch da, was da war?
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const load = (dir: string) =>
  readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(ROOT, dir, f), "utf8")));

const materials = load("data/materials");
const products = load("data/products");

/** Druckparameter sind Empfehlungen, keine Messungen - wie ueberall in diesem Projekt. */
const PROCESS = new Set([
  "nozzleTemperature", "bedTemperature", "chamberTemperature",
  "dryingTemperature", "printSpeed", "coolingFanPct", "minNozzleDiameter",
]);

function countProvenanced(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  if (Array.isArray(node)) return node.reduce((n, v) => n + countProvenanced(v), 0);
  const self = "source" in node && "confidence" in node ? 1 : 0;
  return Object.values(node).reduce((n: number, v) => n + countProvenanced(v), self);
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

/* Stand 2026-08-05. Untergrenzen, keine Ziele.
   `chemicalRatings` und `materialFacts` liegen hoeher als am Tag des Vorfalls: Beim
   Nachstellen zeigte sich, dass `derive:chemicals` fuer abs-gf, pctg-gf und pla-cf
   Bewertungen erzeugt, die im eingecheckten Stand fehlten - 63 Stueck. Der Bestand war
   also nicht nur gefaehrdet, sondern an dieser Stelle schon veraltet. Ein Beleg dafuer,
   dass ein Test ueber die Masse mehr findet als den Fall, fuer den er gebaut wurde. */
const FLOOR = {
  materials: 41,
  products: 239,
  brands: 16,
  datasheets: 217,
  materialFacts: 2894,
  productValues: 1987,
  chemicalRatings: 861,
  materialsWithPrice: 41,
  anisotropyFactors: 18,
  openQuestions: 73,
};

const actual = {
  materials: materials.length,
  products: products.length,
  brands: new Set(products.map((p) => p.brand)).size,
  datasheets: new Set(products.map((p) => p.datasheet?.url).filter(Boolean)).size,
  materialFacts: sum(materials.map(countProvenanced)),
  productValues: sum(products.map((p) =>
    Object.entries(p.properties ?? {}).filter(([k, v]) =>
      !PROCESS.has(k) && typeof (v as { value?: unknown }).value === "number").length)),
  chemicalRatings: sum(materials.map((m) => m.durability?.chemicalResistance?.length ?? 0)),
  materialsWithPrice: materials.filter((m) => m.commercial?.pricePerKg?.value != null).length,
  anisotropyFactors: materials.filter((m) => m.mechanics?.anisotropyFactorTensile?.value != null).length,
  openQuestions: sum(materials.map((m) => m.governance?.openQuestions?.length ?? 0)),
};

describe("Bestandsuntergrenzen", () => {
  for (const [key, floor] of Object.entries(FLOOR)) {
    it(`${key}: mindestens ${floor}`, () => {
      expect(actual[key as keyof typeof FLOOR]).toBeGreaterThanOrEqual(floor);
    });
  }

  it("zaehlt die Chemikalienbewertungen dort, wo sie wirklich stehen", () => {
    /* Gegenprobe zu einem Fehlgriff bei der Kontrolle des Vorfalls: Ich habe
       `chemicalResistance` auf der obersten Ebene gesucht statt unter `durability` und
       daraufhin "0 von 41" gemeldet - die Daten waren die ganze Zeit da. Ein Zaehler,
       der am falschen Pfad sucht, meldet Verlust, wo keiner ist, und faellt beim
       naechsten Mal als Fehlalarm durch. Deshalb steht der Pfad hier fest. */
    expect(materials[0].chemicalResistance).toBeUndefined();
    expect(actual.chemicalRatings).toBeGreaterThan(0);
  });
});
