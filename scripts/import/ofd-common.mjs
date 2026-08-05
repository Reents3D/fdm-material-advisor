/**
 * Gemeinsame Grundlage der drei OFD-Importer: Bestand laden, Werkstofftypen zuordnen,
 * Stichprobengroessen pruefen.
 *
 * DAS ZUORDNUNGSPROBLEM
 * Die Open Filament Database kennt 38 Werkstoffbezeichnungen - "PLA", "PETG", "PA6".
 * Dieses Projekt fuehrt 41 Typen und trennt dabei, was dort in einem Topf liegt: `pla`,
 * `pla-cf`, `pla-tough` und `esd-pla` sind bei OFD alle "PLA". Wer den Topf ungefiltert
 * uebernimmt, schreibt die Spulengroessen des unverstaerkten PLA an ein
 * kohlenstofffaserverstaerktes - und das ist gerade bei der Spulenlogistik falsch, weil
 * gefuellte Werkstoffe fast nur auf 1-kg-Spulen laufen.
 *
 * Die Zuordnung geschieht deshalb zweistufig: Werkstofftopf plus Namensmuster. Fuer die
 * Basistypen werden die gefuellten Varianten aus dem Topf ENTFERNT, fuer die gefuellten
 * Varianten wird gezielt danach gesucht.
 *
 * WARUM MINDESTSTICHPROBEN UND KEINE VOLLABDECKUNG
 * Ein Namensmuster trifft manchmal drei Produkte. Aus drei Produkten eine Marktaussage
 * abzuleiten ist genau die Scheinpraezision, gegen die ADR-003 steht. Unterhalb der
 * Schwellen wird das Feld deshalb NICHT geschrieben - ein fehlendes Feld senkt nur die
 * `dataCompleteness`, ein erfundenes zerstoert die Glaubwuerdigkeit.
 *
 * Zwei Schwellen, weil zwei Dinge gezaehlt werden: die Zahl der PRODUKTE (verhindert,
 * dass zwei Produkte mit je zwoelf Farbvarianten wie ein Markt aussehen) und die Zahl der
 * SPULEN beziehungsweise der Blaetter mit Temperaturangabe.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIR = path.join(ROOT, "data/_sources/ofd");

export const MIN_PRODUCTS = 5;
export const MIN_SPOOLS = 10;
export const MIN_TEMP_PRODUCTS = 8;

/* Muster fuer gefuellte und sonderausgeruestete Typen. Wird bei den Basistypen als
   Ausschluss verwendet und bei den Varianten als Treffer.
 *
 * DIE ZIFFER HINTER DEM KUERZEL IST PFLICHT
 * Der Markt schreibt den Faseranteil an den Namen: "ASA ApolloX CF10", "PA6-CF20",
 * "PPS-GF20", "PET-CF17". Ein Muster `\bcf\b` findet davon KEINES, weil zwischen "CF"
 * und "10" keine Wortgrenze liegt. Beim ersten Lauf sind so 35 gefuellte Produkte als
 * unverstaerkte Basistypen gezaehlt worden - und damit in genau die Statistik geraten,
 * aus der sie ausgeschlossen gehoerten. `\d*` schliesst die Luecke.
 *
 * Kevlar, Aramid und Basalt stehen mit dabei: Es sind Verstaerkungsfasern wie CF und
 * GF, sie tragen nur kein Kuerzel. */
const FILLED = /\b(cf\d*|gf\d*|esd|fr|v-?0)\b|carbon|glass\s*fib|aramid|kevlar|basalt|antistat|flame|aero|foam|\blw\b/i;
const CF = /\bcf\d*\b|carbon/i;
const GF = /\bgf\d*\b|glass\s*fib/i;

/**
 * Zuordnung unserer Werkstofftypen auf den OFD-Bestand.
 *   bucket  - Werkstoffbezeichnung bei OFD
 *   match   - zusaetzliches Namensmuster; `null` bedeutet "Topf ohne gefuellte Varianten"
 *   all     - true, wenn der ganze Topf gemeint ist (Typen ohne Varianten im Markt)
 *
 * Nicht aufgefuehrte Typen haben bei OFD keine belastbare Entsprechung: `greentec`,
 * `obc`, `paht`, `paht-cf`, `pc-pbt` und `abs-pc` sind Handelsnamen oder Blends, die
 * dort in fremden Toepfen oder gar nicht gefuehrt werden. Lieber nicht zugeordnet als
 * falsch zugeordnet.
 */
export const MAP = {
  pla: { bucket: "PLA" },
  petg: { bucket: "PETG" },
  abs: { bucket: "ABS" },
  asa: { bucket: "ASA" },
  pc: { bucket: "PC" },
  pp: { bucket: "PP" },
  pctg: { bucket: "PCTG" },
  pa6: { bucket: "PA6" },
  pa12: { bucket: "PA12" },
  hips: { bucket: "HIPS", all: true },
  pmma: { bucket: "PMMA", all: true },
  pvc: { bucket: "PVC", all: true },
  pvdf: { bucket: "PVDF", all: true },
  peba: { bucket: "PEBA", all: true },

  "pla-cf": { bucket: "PLA", match: CF },
  "petg-cf": { bucket: "PETG", match: CF },
  "asa-cf": { bucket: "ASA", match: CF },
  "pa6-cf": { bucket: "PA6", match: CF },
  "pa12-cf": { bucket: "PA12", match: CF },
  "pet-cf": { bucket: "PET", match: CF },
  "pps-cf": { bucket: "PPS", match: CF },
  "abs-gf": { bucket: "ABS", match: GF },
  "pa6-gf": { bucket: "PA6", match: GF },
  "pctg-gf": { bucket: "PCTG", match: GF },

  "pla-tough": { bucket: "PLA", match: /tough|pla\s*\+/i },
  "asa-aero": { bucket: "ASA", match: /aero|foam|\blw\b/i },
  "esd-pla": { bucket: "PLA", match: /esd|antistat/i },
  "esd-petg": { bucket: "PETG", match: /esd|antistat/i },
  "esd-abs": { bucket: "ABS", match: /esd|antistat/i },
  "pc-fr": { bucket: "PC", match: /\b(fr|v-?0)\b|flame|retard/i },

  "tpu-95a": { bucket: "TPU", match: /95\s*a/i },
  "tpu-85a": { bucket: "TPU", match: /85\s*a/i },
  "tpu-98a": { bucket: "TPU", match: /98\s*a/i },
  "tpu-58d": { bucket: "TPU", match: /58\s*d/i },
  "tpu-esd": { bucket: "TPU", match: /esd|antistat/i },
};

export function loadSnapshot(scriptName) {
  const snap = path.join(DIR, "all.json");
  const meta = path.join(DIR, "meta.json");
  if (!existsSync(snap) || !existsSync(meta)) {
    console.log(`${scriptName}: uebersprungen - kein OFD-Bestand im Arbeitsplatz.`);
    console.log("  Abrufen mit:  npm run fetch:ofd");
    console.log(`  Erwartet:     ${snap}`);
    return null;
  }
  return {
    data: JSON.parse(readFileSync(snap, "utf8")),
    meta: JSON.parse(readFileSync(meta, "utf8")),
  };
}

/** Filamente eines Werkstofftyps nach der Zuordnungstabelle. */
export function filamentsFor(materialId, all) {
  const m = MAP[materialId];
  if (!m) return null;
  return all.filaments.filter((f) => {
    if (f.material !== m.bucket) return false;
    if (m.match) return m.match.test(f.name);
    if (m.all) return true;
    return !FILLED.test(f.name);
  });
}

/** Spulengewichte (g) je Filament, ueber Farbvarianten aufgeloest. */
export function spoolIndex(all) {
  const variantToFilament = new Map(all.variants.map((v) => [v.id, v.filament_id]));
  const byFilament = new Map();
  for (const s of all.sizes) {
    if (s.filament_weight == null) continue;
    const fid = variantToFilament.get(s.variant_id);
    if (!fid) continue;
    if (!byFilament.has(fid)) byFilament.set(fid, []);
    byFilament.get(fid).push(s.filament_weight);
  }
  return byFilament;
}

export const percentile = (sorted, q) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))] : null;

export const t = (de, en) => ({ de, en });

/** Quellensatz fuer die Datei. Wird bei Wiederholungslaeufen ersetzt, nicht gedoppelt. */
export function ofdSource(meta) {
  return {
    id: "src_ofd",
    type: "community",
    publisher: "Open Filament Collective",
    title: "Open Filament Database — Marktbestand an Filamenten, Spulengrößen und Druckparametern",
    documentVersion: meta.version,
    url: "https://api.openfilamentdatabase.org/api/v1/",
    retrievedAt: meta.retrievedAt,
    confidenceCeiling: "low",
    /* Kurz halten: Dieser Satz steht in jeder angefassten Datei und wird mit ins
       Anwendungspaket gebunden. Die ausfuehrliche Abwaegung gehoert in ADR-035, wo sie
       einmal steht und nichts kostet. */
    note: t(
      `Gemeinschaftlich gepflegte Marktdatenbank (${meta.stats.brands} Marken, ${meta.stats.filaments} Filamente). Sie führt keine Kennwerte und keine Prüfnormen, sondern beschreibt das Angebot. Daher Ceiling \`low\` — siehe ADR-035.`,
      `Community-maintained market database (${meta.stats.brands} brands, ${meta.stats.filaments} filaments). It carries no material values and no test standards, it describes the offering. Hence ceiling \`low\` — see ADR-035.`,
    ),
  };
}

export function upsertSource(material, source) {
  material.governance ??= {};
  material.governance.sources ??= [];
  const i = material.governance.sources.findIndex((s) => s.id === source.id);
  if (i >= 0) material.governance.sources[i] = source;
  else material.governance.sources.push(source);
}
