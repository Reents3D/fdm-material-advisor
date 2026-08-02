/**
 * Werkstatterfahrung schlaegt Schaetzung.
 *
 * WOZU DIESE DATEI EXISTIERT
 * PLAN.md fuehrt seit Beginn eine Liste von Werten, die sich nicht aus Datenblaettern
 * lesen lassen, weil kein Hersteller sie veroeffentlicht: Lackierhaftung, Klebbarkeit,
 * XXL-Grenzen, Portfoliostatus. Sie standen alle als `estimated` in den Daten und warteten
 * auf jemanden, der sie taeglich fertigt. Hier landet, was von dort zurueckkommt.
 *
 * Das Skript laeuft NACH allen Importen. Sonst wuerde der naechste `import:all` die
 * Erfahrung wieder mit der Schaetzung ueberschreiben.
 *
 * DER BEFUND, DER ES AUSGELOEST HAT
 * PETG stand bei der Lackierhaftung auf 2 von 5 und fiel in der Rangliste fuer
 * "Sichtteil lackiert" auf Platz 14. Aus der Werkstatt kam:
 *
 *   "Wir lackieren regelmaessig PETG mit einem Haftgrund und dann Lackierung. Geht
 *    hervorragend, aus unserer Sicht sogar nahezu perfekt."
 *   "PLA laesst sich auch super lackieren, ASA und ABS auch mit geeignetem Haftvermittler."
 *
 * Die Skala hatte zwei verschiedene Fragen vermischt: "haelt Lack OHNE Vorbehandlung"
 * und "laesst sich lackieren". Nur die zweite ist fuer ein FDM-Bauteil interessant, denn
 * die erste stellt sich nie:
 *
 *   "Direkt auf den Druck zu lackieren ist keine hervorragende Idee, sondern es muss
 *    immer vorbereitet werden."
 *
 * Das gilt fuer JEDEN Werkstoff, nicht fuer einen bestimmten. Die Bewertung beantwortet
 * deshalb ausschliesslich: Wie gut wird das Ergebnis, wenn richtig vorbereitet wurde?
 * Der Vorbereitungshinweis haengt an jedem bewerteten Werkstoff, damit die Zahl nicht
 * als "kann man einfach lackieren" gelesen wird.
 *
 * BEIM KLEBEN STAND ES GENAU ANDERSHERUM
 * ABS und ASA trugen eine 5, weil sich Aceton als Loesemittelschweissung anbietet. Das
 * gilt aber nur ABS auf ABS. Fuer die Fuegung im Alltag sagt die Werkstatt:
 *
 *   "PLA und PETG lassen sich sehr einfach kleben, ASA und ABS benoetigen
 *    Haftvermittler, CF-Materialien brauchen besondere Kleber oder 2K-Epoxide."
 *
 * WAS HIER NICHT PASSIERT
 * Keine Verallgemeinerung ueber das hinaus, was gesagt wurde. Wo die Erfahrung eine
 * Werkstofffamilie betrifft, deren Grundpolymer identisch ist, wird sie uebertragen -
 * aber mit `low` statt `medium` und einem Vermerk, dass nur der Stammtyp bestaetigt ist.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data/materials");
const CONFIRMED = "2026-08-02";
const SRC = "field_experience_reents";

const t = (de, en) => ({ de, en });

const PREP = t(
  "Gilt nur nach Vorbereitung. Direkt auf den Druck zu lackieren führt zu keinem brauchbaren Ergebnis — geschliffen, entfettet und grundiert werden muss immer, unabhängig vom Werkstoff. Die Bewertung sagt, wie gut das Ergebnis DANACH wird.",
  "Applies only after preparation. Painting straight onto the print gives no usable result — sanding, degreasing and priming are always required, whatever the material. The rating states how good the result is AFTER that.");

/* Ausdruecklich bestaetigt. Diese Werkstoffe hat die Werkstatt selbst benannt. */
const DIRECT = {
  petg: {
    paintAdhesion: [5, t(
      "Wird bei Reents3D regelmäßig lackiert: schleifen, entfetten, Haftgrund, dann Decklack. Ergebnis nach eigener Einschätzung nahezu perfekt. Der frühere Wert von 2 beschrieb die Haftung OHNE Vorbehandlung — eine Frage, die sich bei einem FDM-Bauteil nie stellt, weil ohnehin geschliffen und grundiert wird.",
      "Painted regularly at Reents3D: sand, degrease, adhesion primer, then top coat. Result rated as near perfect in-house. The earlier value of 2 described adhesion WITHOUT preparation — a question that never arises on an FDM part, because sanding and priming happen anyway.")],
    bondability: [5, t(
      "Lässt sich nach Werkstatterfahrung sehr einfach kleben — Cyanacrylat oder 2K-Epoxid, ohne Haftvermittler.",
      "Very easy to bond according to shop-floor experience — cyanoacrylate or 2K epoxy, no adhesion promoter needed.")],
  },
  pla: {
    paintAdhesion: [5, t(
      "Lässt sich nach Werkstatterfahrung sehr gut lackieren (schleifen, grundieren, lackieren).",
      "Paints very well according to shop-floor experience (sand, prime, paint).")],
    bondability: [5, t(
      "Lässt sich nach Werkstatterfahrung sehr einfach kleben — Cyanacrylat oder 2K-Epoxid, ohne Haftvermittler.",
      "Very easy to bond according to shop-floor experience — cyanoacrylate or 2K epoxy, no adhesion promoter needed.")],
  },
  abs: {
    paintAdhesion: [4, t(
      "Lackierbar, aber nur mit geeignetem Haftvermittler — nicht mit jedem Grundierungssystem. Werkstatterfahrung Reents3D.",
      "Paintable, but only with a suitable adhesion promoter — not with every primer system. Reents3D shop-floor experience.")],
    bondability: [3, t(
      "Braucht nach Werkstatterfahrung einen Haftvermittler. Die frühere 5 beruhte auf der Lösemittelschweissung mit Aceton — die funktioniert hervorragend, aber nur ABS auf ABS, nicht als allgemeine Fügung.",
      "Needs an adhesion promoter according to shop-floor experience. The earlier 5 rested on acetone solvent welding — excellent, but only ABS to ABS, not as general joining.")],
  },
  asa: {
    paintAdhesion: [4, t(
      "Lackierbar, aber nur mit geeignetem Haftvermittler — nicht mit jedem Grundierungssystem. Werkstatterfahrung Reents3D.",
      "Paintable, but only with a suitable adhesion promoter — not with every primer system. Reents3D shop-floor experience.")],
    bondability: [3, t(
      "Braucht nach Werkstatterfahrung einen Haftvermittler. Die frühere 5 beruhte auf der Lösemittelschweissung mit Aceton — die funktioniert hervorragend, aber nur ASA auf ASA, nicht als allgemeine Fügung.",
      "Needs an adhesion promoter according to shop-floor experience. The earlier 5 rested on acetone solvent welding — excellent, but only ASA to ASA, not as general joining.")],
  },
};

/* Uebertragung auf Typen mit identischem Grundpolymer. Getrennt gefuehrt, weil sie NICHT
   einzeln bestaetigt sind - sie tragen deshalb `low` und einen Vermerk. */
const FAMILY = {
  petg: ["pctg", "esd-petg"],
  pla: ["pla-tough", "esd-pla"],
  abs: ["esd-abs"],
  asa: ["asa-aero"],
};

/* Faserverstaerkte Typen: eigene Aussage, gilt quer ueber die Grundpolymere. */
const FIBRE_BOND = t(
  "Faserverstärkte Werkstoffe brauchen nach Werkstatterfahrung besondere Klebstoffe oder 2K-Epoxide — die Faser an der Bruchfläche verändert das Benetzungsverhalten gegenüber der ungefüllten Type.",
  "Fibre-reinforced materials need special adhesives or 2K epoxies according to shop-floor experience — the fibre at the fracture surface changes wetting behaviour compared with the unfilled grade.");
const FIBRE_IDS = ["petg-cf", "pet-cf", "asa-cf", "pa6-cf", "pa12-cf", "paht-cf", "pa6-gf", "pps-cf"];

const SOURCE = {
  id: SRC, type: "field-experience", publisher: "Reents Technologies GmbH",
  title: "Werkstatterfahrung Reents3D — Lackierung und Fügung",
  retrievedAt: CONFIRMED, confidenceCeiling: "medium",
  note: t("Eigene Fertigungserfahrung aus laufender Produktion, kein genormter Gitterschnitt nach ISO 2409. Eine Quelle, deshalb höchstens `medium`.",
          "Own production experience from ongoing manufacturing, not a standardised cross-cut test to ISO 2409. A single source, therefore `medium` at most."),
};

const DERIVED_HINT = t(
  "Vom Stammtyp derselben Polymerfamilie übernommen — dieser Typ wurde nicht einzeln bestätigt. Das Grundpolymer ist identisch, die Vorbehandlung entsprechend dieselbe.",
  "Carried over from the base type of the same polymer family — this grade was not confirmed individually. The base polymer is identical, so the surface preparation is the same.");

let touched = 0, values = 0;

const apply = (m, field, value, note, confidence) => {
  m.finishing ??= {};
  /* Der Vorbereitungshinweis haengt an JEDER Lackierbewertung. Ohne ihn liest sich
     eine 5 als "kann man einfach lackieren" - und genau das stimmt nie. */
  const full = field === "paintAdhesion"
    ? t(`${note.de}\n\n${PREP.de}`, `${note.en}\n\n${PREP.en}`)
    : note;
  m.finishing[field] = { value, scale: field, source: SRC, confidence, note: full };
  values++;
};

for (const f of readdirSync(DIR).filter((x) => x.endsWith(".json")).sort()) {
  const p = path.join(DIR, f);
  const m = JSON.parse(readFileSync(p, "utf8"));
  let changed = false;

  const direct = DIRECT[m.id];
  if (direct) {
    for (const [field, [value, note]] of Object.entries(direct)) apply(m, field, value, note, "medium");
    changed = true;
  }

  for (const [base, kids] of Object.entries(FAMILY)) {
    if (!kids.includes(m.id)) continue;
    for (const [field, [value, note]] of Object.entries(DIRECT[base])) {
      apply(m, field, value, t(`${note.de}\n\n${DERIVED_HINT.de}`, `${note.en}\n\n${DERIVED_HINT.en}`), "low");
    }
    changed = true;
  }

  if (FIBRE_IDS.includes(m.id)) {
    apply(m, "bondability", 2, FIBRE_BOND, "medium");
    changed = true;
  }

  if (!changed) continue;
  m.governance.sources = (m.governance.sources ?? []).filter((s) => s.id !== SRC);
  m.governance.sources.push(SOURCE);
  writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
  touched++;
}

console.log(`${touched} Werkstoffe mit Werkstatterfahrung versehen, ${values} Werte gesetzt.`);
console.log(`  Ausdrücklich bestätigt: ${Object.keys(DIRECT).join(", ")}`);
console.log(`  Aus der Familie übernommen (Konfidenz low): ${Object.values(FAMILY).flat().join(", ")}`);
console.log(`  Faserverstärkt, Klebbarkeit 2: ${FIBRE_IDS.join(", ")}`);
