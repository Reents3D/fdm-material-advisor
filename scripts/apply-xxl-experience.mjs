/**
 * XXL-Grenzen aus der eigenen Fertigung — die einzige Stelle, an der Reents3D
 * mehr weiss als jedes Datenblatt.
 *
 * DIE LAGE VORHER
 * Alle 43 Werte in `commercial.xxl.maxSensibleEdgeMm` waren `estimated`, abgeleitet aus
 * Verzugsneigung und Kammerbedarf. Kein einziger war durch ein tatsaechlich gefertigtes
 * Teil belegt. RUECKFRAGEN.md fuehrte das als offene Entscheidung Nummer eins.
 *
 * WAS AUS DER WERKSTATT KAM (2026-08-07)
 *
 *   "Bei ueber einen Meter nutzen wir PLA, PETG, ABS und ASA zuverlaessig. PLA ist am
 *    stabilsten, was die Masshaltigkeit angeht, da ABS und ASA sowie PETG mehr schrumpfen
 *    je nach Geometrie."
 *   "CF Materialien haben wir bisher bis maximal 800 x 800 gefertigt, ohne Probleme."
 *   "PA, PC, PPS bisher nur auf den Engineering Druckern."
 *   "100 % gefuellte Bauteile sind problematisch im XXL Segment aus PETG, ASA, ABS, da die
 *    Spannungen extrem hoch werden und das Bauteil sich verziehen kann sowie staerker
 *    schrumpft."
 *
 * DIE GROESSTE KORREKTUR BETRIFFT ABS UND ASA
 * Sie standen bei 550 und 700 mm — abgeleitet aus ihrer Verzugsneigung von 4 bzw. 5 von 5,
 * also aus reiner Theorie. Tatsaechlich laufen beide zuverlaessig ueber einen Meter. Die
 * Ableitung war nicht ein bisschen daneben, sie war um Faktor zwei daneben, und zwar
 * systematisch: Verzugsneigung beschreibt, was ein Bauteil OHNE Gegenmassnahmen tut. In
 * einer Fertigung mit Kammer, Brim und Erfahrung ist sie die falsche Bezugsgroesse.
 *
 * WAS HIER BEWUSST NICHT PASSIERT
 *
 * KEINE OBERGRENZE AUS DEN 800 mm DER CF-TYPEN. "Bisher bis maximal 800 gefertigt, ohne
 * Probleme" ist ein BELEGTER UNTERER RAND, keine gefundene Grenze — dort war schlicht das
 * groesste Teil. Die 800 als `maxSensibleEdgeMm` einzutragen hiesse, eine nicht gemachte
 * Erfahrung als Grenze auszugeben; die Schaetzwerte bleiben deshalb stehen und bekommen
 * nur den Vermerk, bis wohin sie belegt sind.
 *
 * KEINE ZAHL FUER PA, PC UND PPS. "Nur auf den Engineering Druckern" heisst: keine
 * XXL-Erfahrung. Ihre Schaetzungen bleiben Schaetzungen und sagen das jetzt auch.
 *
 * KEIN SEGMENTIERUNGSFELD MEHR. Dazu Riko woertlich: "Wir segmentieren, wenn es sinnvoll
 * ist fuer die Auf- und Nachbereitung. Hat im Materialberater eigentlich nichts zu suchen,
 * da ein Materialberater kein Fertigungsberater ist." Das Feld stand ohnehin bei allen 43
 * auf `true` und wurde von keiner Zeile Anwendungscode gelesen. Es wird entfernt, nicht
 * nur ausgeblendet — siehe unten.
 *
 *   node scripts/apply-xxl-experience.mjs [--dry]
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data/materials");
const DRY = process.argv.includes("--dry");
const CONFIRMED = "2026-08-07";
const SRC = "field_experience_reents";

const t = (de, en) => ({ de, en });

const SOURCE = {
  id: SRC, type: "field-experience", publisher: "Reents Technologies GmbH",
  title: "Werkstatterfahrung Reents3D — XXL-Fertigung",
  retrievedAt: CONFIRMED, confidenceCeiling: "medium",
  note: t(
    "Eigene Fertigungserfahrung aus laufender XXL-Produktion (Bauraum bis 1.800 × 2.400 × 1.800 mm), "
    + "keine Versuchsreihe. Eine Quelle, deshalb höchstens `medium`. Sie beantwortet, was in DIESER "
    + "Fertigung zuverlässig läuft — mit Kammer, Brim und geübtem Personal. Eine andere Werkstatt "
    + "kann andere Grenzen haben.",
    "Own production experience from ongoing XXL manufacturing (build volume up to 1,800 × 2,400 × "
    + "1,800 mm), not a test series. A single source, therefore `medium` at most. It answers what runs "
    + "reliably in THIS shop — with chamber, brim and practised staff. Another workshop may find "
    + "different limits."),
};

/* Ueber einen Meter zuverlaessig gefertigt. Die Reihenfolge stammt aus derselben Auskunft:
   PLA ist masshaltiger, die drei anderen schrumpfen geometrieabhaengig mehr. */
const PROVEN_OVER_METER = {
  pla: 2400, "pla-tough": 2400,
  petg: 1800, abs: 1800, asa: 1800,
};

/* Belegt bis 800 × 800 ohne Befund — ein unterer Rand, keine Grenze. */
const PROVEN_TO_800 = ["pla-cf", "petg-cf", "asa-cf", "pet-cf", "pa6-cf", "pa12-cf", "paht-cf",
  "ppa-cf", "pps-cf", "abs-gf", "pa6-gf", "pctg-cf", "pctg-gf"];

/* Nie im XXL-Format gefahren — nur auf den Engineering-Druckern. */
const NO_XXL = ["pa6", "pa12", "paht", "pc", "pc-fr", "pc-pbt", "pps-cf", "ppa-cf", "pa6-gf"];

/* Wo 100 % Fuellung im Grossformat zum Problem wird. */
const INFILL_RISK = ["petg", "asa", "abs", "esd-petg", "esd-abs", "pctg", "greentec"];

const INFILL_NOTE = t(
  "Aus der eigenen Fertigung: 100 % gefüllte Bauteile sind im XXL-Format problematisch. Die inneren "
  + "Spannungen werden extrem hoch, das Bauteil kann sich verziehen und schrumpft stärker. Das ist die "
  + "Umkehrung der sonst richtigen Faustregel „mehr Füllung, mehr Sicherheit“: Für die Temperaturgrenze "
  + "unter Dauerlast senkt mehr Füllung die Spannung im Querschnitt, für die Maßhaltigkeit eines "
  + "Großteils erhöht sie den Verzug. Beides gilt gleichzeitig und zieht in verschiedene Richtungen.",
  "From own production: 100 % infill is problematic at XXL scale. Internal stresses become extreme, the "
  + "part can warp and shrinks more. This inverts the otherwise sound rule of thumb \"more infill, more "
  + "safety\": for the service temperature under sustained load more infill lowers the stress in the "
  + "section, for the dimensional accuracy of a large part it raises distortion. Both hold at once and "
  + "pull in opposite directions.");

let edges = 0, marks = 0, infill = 0, dropped = 0;
const log = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const p = path.join(DIR, file);
  const m = JSON.parse(readFileSync(p, "utf8"));
  const xxl = m.commercial?.xxl;
  if (!xxl) continue;
  let touched = false;

  /* 1. Das Segmentierungsfeld faellt weg — Fertigungsfrage, nicht Werkstofffrage. */
  if (xxl.segmentationRecommended !== undefined) {
    delete xxl.segmentationRecommended;
    dropped++;
    touched = true;
  }

  const node = xxl.maxSensibleEdgeMm;
  if (node) {
    const before = node.value;
    const proven = PROVEN_OVER_METER[m.id];

    if (proven !== undefined) {
      node.value = proven;
      node.min = 1000;                      // belegt: darüber läuft es zuverlässig
      node.source = SRC;
      node.confidence = "medium";
      node.note = t(
        `Belegt: Über einen Meter Kantenlänge wird dieser Werkstoff in der eigenen Fertigung `
        + `zuverlässig gefahren. ${m.id === "pla" || m.id === "pla-tough"
          ? "PLA ist dabei der maßhaltigste der vier — es schrumpft am wenigsten."
          : "Er schrumpft dabei geometrieabhängig stärker als PLA; die Maßhaltigkeit ist der "
            + "begrenzende Faktor, nicht die Fertigbarkeit."} `
        + `Die ${before} mm, die hier vorher standen, waren aus der Verzugsneigung abgeleitet — `
        + `also aus dem, was ein Bauteil OHNE Gegenmaßnahmen tut. Mit Kammer, Brim und Erfahrung `
        + `ist das die falsche Bezugsgröße. Die Zahl ist weiterhin eine Aufwandsschwelle und keine `
        + `Maschinen­grenze; belegt ist der Bereich ab 1.000 mm, ein oberes Ende wurde nicht gefunden.`,
        `Established: above one metre edge length this material runs reliably in our own production. `
        + `${m.id === "pla" || m.id === "pla-tough"
          ? "PLA is the most dimensionally stable of the four — it shrinks least."
          : "It shrinks more than PLA depending on geometry; dimensional accuracy is the limiting "
            + "factor, not manufacturability."} `
        + `The ${before} mm previously recorded here were derived from warping tendency — that is, from `
        + `what a part does WITHOUT countermeasures. With chamber, brim and experience that is the wrong `
        + `reference. The figure remains an effort threshold, not a machine limit; what is established is `
        + `the range above 1,000 mm, no upper end was found.`);
      if (before !== proven) log.push(`${m.id.padEnd(11)} ${before} → ${proven} mm  (belegt > 1.000)`);
      edges++;
      touched = true;
    } else if (PROVEN_TO_800.includes(m.id)) {
      /* Wert NICHT anfassen: 800 ist der grösste gefertigte Fall, keine gefundene Grenze. */
      node.note = t(
        `Geschätzt, nicht belegt — die Zahl bleibt eine Ableitung aus Verzugsneigung und Kammerbedarf. `
        + `Aus der eigenen Fertigung belegt ist bisher nur: bis 800 × 800 mm ohne Befund. Das ist ein `
        + `unterer Rand und keine Grenze; dort war schlicht das größte Teil.`
        + (NO_XXL.includes(m.id)
          ? " Im echten Großformat wurde dieser Werkstoff noch nicht gefahren — bisher nur auf den"
            + " Engineering-Druckern."
          : ""),
        `Estimated, not established — the figure remains a derivation from warping tendency and chamber `
        + `requirement. What own production has established so far is only: up to 800 × 800 mm without `
        + `incident. That is a lower bound, not a limit; it was simply the largest part.`
        + (NO_XXL.includes(m.id)
          ? " This material has not yet been run at true large format — so far only on the engineering"
            + " printers."
          : ""));
      marks++;
      touched = true;
    } else if (NO_XXL.includes(m.id)) {
      node.note = t(
        "Geschätzt, nicht belegt. Dieser Werkstoff wird bisher nur auf den Engineering-Druckern "
        + "gefahren, nicht im Großformat — es gibt also keine eigene Erfahrung, gegen die sich die "
        + "Schätzung prüfen ließe.",
        "Estimated, not established. This material is so far run only on the engineering printers, not "
        + "at large format — so there is no own experience against which the estimate could be checked.");
      marks++;
      touched = true;
    }
  }

  /* 2. Der Füllgrad-Befund. Er gehört an die XXL-Angabe, weil er nur dort gilt. */
  if (INFILL_RISK.includes(m.id) && xxl) {
    xxl.infillWarningXxl = {
      value: true, source: SRC, confidence: "medium", note: INFILL_NOTE,
    };
    infill++;
    touched = true;
  }

  if (!touched) continue;
  m.governance ??= {};
  m.governance.sources = (m.governance.sources ?? []).filter((s) => s.id !== SRC);
  if (JSON.stringify(m).includes(`"${SRC}"`)) m.governance.sources.push(SOURCE);
  if (!DRY) writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
}

log.forEach((l) => console.log("  " + l));
console.log(
  `\n${edges} Kantenlängen belegt, ${marks} als unbelegt gekennzeichnet, ${infill} Füllgrad-Warnungen, `
  + `${dropped}× segmentationRecommended entfernt.${DRY ? "  [--dry]" : ""}`);
