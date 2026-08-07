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
   dass ein Test ueber die Masse mehr findet als den Fall, fuer den er gebaut wurde.

   `materialsWithPrice` stand bis 2026-08-06 bei 41 statt 42, weil `ppa-cf` als einziger
   Typ ohne Preis dastand - die Ableitung fand im OFD-Marktbestand keine Entsprechung,
   PPA wird dort als Werkstoffklasse nicht gefuehrt. Mit der Aufnahme von 3DJAKE steht
   ein Angebot da (207,99 €/kg aus einer 750-g-Spule), und die Untergrenze zieht auf 42
   nach. Sie bleibt einen Tag spaeter bei 42, obwohl es inzwischen 43 Werkstoffe gibt:
   `pctg-cf` hat keinen Preis, weil ihn nur FormFutura fuehrt - und FormFutura sperrt
   Anthropics Agenten in seiner robots.txt, kann also nicht erhoben werden. Der Fall
   steht seit demselben Tag als BLOCKIERENDE offene Frage am Datensatz; die Untergrenze
   ist deshalb bewusst eine unter der Zahl der Werkstoffe.

   `openQuestions` ist am 2026-08-06 von 74 auf 88 GESTIEGEN, und das ist kein Zuwachs an
   Problemen, sondern an Buchfuehrung: `derive-price.mjs` legt den Vorbehalt
   `oq_price_survey` seither selbst an, statt nur eine von Hand geschriebene Frage zu
   pflegen. Vorher trugen 16 von 17 Werkstoffen mit duenner Preislage GAR KEINEN
   Vorbehalt - +16. Weggefallen sind zwei: `petg-cf` hat mit 3DJAKE seinen dritten
   Haendler bekommen und ist damit beantwortet, und `ppa-cf:oq_ppa_cf_price` war
   schlicht falsch geworden ("er ist der einzige der 42 Typen ohne Preis" - ist er nicht
   mehr). 74 + 16 - 2 = 88. Einen Tag spaeter sind es 91: `greentec`, `tpu-58d` und
   `tpu-85a` sind von `medium` auf `low` zurueckgefallen, weil ihre fuenf Angebote alle
   von EINER Marke stammen (Extrudr, gefuehrt von Extrudr und von 3DJAKE) - und tragen
   damit ihren Vorbehalt wieder.

   Dieselbe Zahl war am 2026-08-06 vorher schon einmal von 75 auf 74 gesunken, damals
   durch eine Aufloesung bei `pet-cf`. Genau dafuer sieht der Kopf dieses Tests vor, dass
   eine gerissene Untergrenze mit Begruendung nachgezogen wird - in beide Richtungen. Eine
   Zahl, die nur steigen darf, waere ein Test gegen das Aufraeumen.

   `anisotropyFactors` FAELLT am 2026-08-06 von 19 auf 16, und das ist der wichtigste
   Rueckgang, den diese Liste je verzeichnet hat. Der Anycubic-Import brachte neun neue
   Blaetter mit Z-Werten und machte damit sichtbar, dass `derive-anisotropy.mjs` seinen
   Widerspruchstest nur EINMAL laufen liess - beim ersten Blatt. Drei Werkstoffe trugen
   deshalb eine Zahl, der ihre eigenen Belege widersprechen:

     pla       0,89 gefuehrt   20 Blaetter, Spanne 0,32-0,89
     pet-cf    0,47 gefuehrt    2 Blaetter, Spanne 0,20-0,47
     tpu-95a   0,78 gefuehrt    4 Blaetter, Spanne 0,50-0,82

   In allen drei Faellen war der gefuehrte Wert der guenstigste der Spanne.

   Zunaechst wurden die Zahlen ENTFERNT. Auf Rikos Entscheidung vom selben Tag steht dort
   jetzt der MEDIAN mit der beobachteten Spanne als min/max - dasselbe Vorgehen wie beim
   Preis. Damit steigt die Zahl auf 20: `paht-cf` bekommt zum ersten Mal einen Wert, weil
   auch sein Widerspruch jetzt zusammengefasst statt verschwiegen wird.

     pla 0,72 (0,32-0,89) · tpu-95a 0,66 (0,50-0,82) · paht-cf 0,45 (0,18-0,73)
     pet-cf 0,34 (0,20-0,47)

   Bei den beiden Paaren mit nur ZWEI Blaettern sagt die Notiz ausdruecklich, dass der
   Median dort schlicht deren Mitte ist - eine Zahl, die keine Quelle gemessen hat. */
const FLOOR = {
  materials: 43,
  products: 254,
  brands: 17,
  datasheets: 232,
  materialFacts: 3051,
  productValues: 2147,
  chemicalRatings: 903,
  materialsWithPrice: 42,
  anisotropyFactors: 21,
  openQuestions: 97,
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

  /* Eine Untergrenze faengt nur die Menge. Dass der Vorbehalt am RICHTIGEN Werkstoff
     steht, faengt sie nicht - und genau das war das Loch: `derive-price.mjs` pflegte die
     Frage `oq_price_survey` nur dort, wo jemand sie von Hand angelegt hatte. 16 von 17
     Werkstoffen mit duenner Preislage trugen deshalb keinen Vorbehalt, darunter `ppa-cf`
     mit einem einzigen Angebot. Seit ADR-040 wiegt das schwerer: Das Scoring daempft
     duenne Preisbelege, und wo gedaempft wird, muss der Grund am Datensatz stehen. */
  it("jede dünne Preislage trägt ihren Vorbehalt — und keine breite trägt einen alten", () => {
    const thin: string[] = [];
    const stale: string[] = [];
    for (const m of materials) {
      const conf = m.commercial?.pricePerKg?.confidence;
      if (conf == null) continue;
      const questions = (m.governance?.openQuestions ?? []) as { id?: string }[];
      const has = questions.some((q) => q.id === "oq_price_survey");
      if ((conf === "low" || conf === "estimated") && !has) thin.push(m.id);
      if ((conf === "medium" || conf === "high") && has) stale.push(m.id);
    }
    expect(thin, "dünne Preislage ohne offene Frage").toEqual([]);
    expect(stale, "breite Erhebung mit übrig gebliebener Frage").toEqual([]);
  });

  /* `tpu-58d` und `tpu-85a` standen am 2026-08-06 auf `medium` mit fünf Angeboten aus
     zwei Shops - und alle fünf waren Extrudr, einmal bei Extrudr selbst, einmal bei
     3DJAKE. Zwei Händler, die dieselbe Herstellerliste führen, vergleichen keine Preise.
     Sichtbar wurde es an der Kalibrierung aus ADR-040: Beide bewegten sich beim Übergang
     um 0,0 %, während echte Markenwechsel im Median 15 % sprangen. */
  it("kein `medium` steht auf einer einzigen Marke", () => {
    const survey = JSON.parse(readFileSync(path.join(ROOT, "data/prices.json"), "utf8"));
    const single: string[] = [];
    for (const m of materials) {
      if (m.commercial?.pricePerKg?.confidence !== "medium") continue;
      const offers = (survey.offers[m.id] ?? []) as { brand: string }[];
      if (new Set(offers.map((o) => o.brand)).size < 2) single.push(m.id);
    }
    expect(single, "medium, obwohl alle Angebote von einer Marke stammen").toEqual([]);
  });
});
