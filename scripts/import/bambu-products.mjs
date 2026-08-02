/**
 * Spiegelt die Bambu-Lab-Datensaetze zusaetzlich als Herstellerprodukte.
 *
 * WARUM: data/materials/ enthaelt bereits Bambu-Messwerte, aber als WERKSTOFFTYP.
 * Damit der Herstellervergleich funktioniert, muss Bambu dort als Marke neben
 * Prusament, AzureFilm und Extrudr stehen - sonst zeigt die Ansicht fuer ASA nur
 * einen einzigen Anbieter und hat keinen Mehrwert.
 *
 * Die Werte werden NICHT dupliziert erfasst, sondern aus dem Materialdatensatz
 * gelesen. Einzige Quelle der Wahrheit bleibt data/materials/.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = path.join(ROOT, "data/materials");
const OUT = path.join(ROOT, "data/products");

/** Feld im Materialdatensatz -> Feld im Produktdatensatz */
const MAP = {
  density: "density",
  tensileStrengthXy: "tensileStrengthXy",
  tensileStrengthZ: "tensileStrengthZ",
  tensileModulusXy: "tensileModulusXy",
  elongationAtBreakXy: "elongationAtBreakXy",
  flexuralStrengthXy: "flexuralStrengthXy",
  flexuralModulusXy: "flexuralModulusXy",
  charpyUnnotchedXy: "charpyUnnotchedXy",
  charpyNotchedXy: "charpyNotchedXy",
};
const THERMAL = { hdtA: "hdtA", hdtB: "hdtB", glassTransition: "glassTransition" };
const PROC = { nozzleTemperature: "nozzleTemperature", bedTemperature: "bedTemperature" };

const PRODUCT_NAMES = {
  pla: "Bambu PLA Basic", petg: "Bambu PETG Basic", abs: "Bambu ABS", asa: "Bambu ASA",
  "asa-cf": "Bambu ASA-CF", "asa-aero": "Bambu ASA Aero", pc: "Bambu PC",
  "pa6-cf": "Bambu PA6-CF", "pet-cf": "Bambu PET-CF", "tpu-95a": "Bambu TPU 95A",
};

mkdirSync(OUT, { recursive: true });
let n = 0;

for (const file of readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const m = JSON.parse(readFileSync(path.join(SRC, file), "utf8"));
  const tds = m.governance.sources.find((s) => s.id === "src_bambu_tds");
  if (!tds) continue;                       // nur Bambu-basierte Datensaetze spiegeln

  const props = {};
  const take = (obj, map) => {
    for (const [from, to] of Object.entries(map)) {
      const v = obj?.[from];
      if (!v || v.value === null) continue;
      props[to] = { ...v, source: "src_tds" };
      delete props[to].derivedFrom;
    }
  };
  take(m.mechanics, MAP);
  take(m.thermal, THERMAL);
  take(m.processing, PROC);
  if (!Object.keys(props).length) continue;

  const rec = {
    $schema: "../../schema/product.schema.json",
    schemaVersion: "1.0.0",
    id: `bambu-${m.id}`,
    materialId: m.id,
    brand: "Bambu Lab",
    manufacturer: "Bambu Lab",
    productName: PRODUCT_NAMES[m.id] ?? `Bambu ${m.identity.name}`,
    origin: "China",
    specimenType: "printed",
    /* "als einziger Hersteller" stimmte nicht mehr und widersprach ausserdem der eigenen
       Datenbank: Fillamentum weist fuer OBC 905 ebenfalls XY UND Z an gedruckten
       Pruefkoerpern aus. Nachgezaehlt tragen 13 von 38 Werkstofftypen einen Z-Wert,
       davon 12 aus Bambu-Blaettern und einer von Fillamentum. Bambu ist damit die
       wichtigste, nicht die einzige Quelle - und genau diese Sorte Superlativ ist es,
       die dieses Projekt bei Herstellern anmahnt. Also auch bei sich selbst. */
    specimenNote: {
      de: "Bambu Lab prueft GEDRUCKTE Koerper und weist X-Y- UND Z-Werte aus. Dadurch laesst sich die Anisotropie direkt ablesen - bei den meisten Marken fehlt diese Angabe. Von 13 Werkstofftypen mit Z-Wert stuetzen sich 12 auf Bambu-Blaetter; ausserhalb dieser Quelle nennt bislang nur Fillamentum (OBC 905) beide Richtungen.",
      en: "Bambu Lab tests PRINTED specimens and reports X-Y AND Z values. That makes anisotropy directly readable - most brands omit it. Of 13 material types carrying a Z value, 12 rest on Bambu sheets; outside that source only Fillamentum (OBC 905) states both directions so far.",
    },
    datasheet: {
      title: tds.title,
      url: tds.url,
      ...(tds.documentVersion ? { version: tds.documentVersion } : {}),
      retrievedAt: tds.retrievedAt ?? m.governance.lastReviewed,
    },
    properties: props,
    governance: {
      lastReviewed: m.governance.lastReviewed,
      reviewedBy: m.governance.reviewedBy,
      sources: [{ ...tds, id: "src_tds" }],
    },
  };
  writeFileSync(path.join(OUT, `${rec.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  console.log(`wrote data/products/${rec.id}.json`);
  n++;
}
console.log(`\n${n} Bambu-Produkte gespiegelt.`);
