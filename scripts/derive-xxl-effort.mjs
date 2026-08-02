/**
 * Die Kantenlaenge, ab der ein Werkstoff aufwendig wird - hergeleitet statt geraten.
 *
 * DER BEFUND, DER DAZU GEFUEHRT HAT
 * Der Anwendungsfall "Messebau-Grossteil" empfahl ASA Aero, ein schaeumendes
 * Leichtbaufilament, fuer ein zwei Meter grosses Messemodell. Nicht weil es passte,
 * sondern weil es als EINZIGES uebrig blieb: PETG, ABS, ASA, PETG-CF und GreenTEC waren
 * an einer hinterlegten Kantenlaenge ausgeschlossen worden.
 *
 * Die Nachfrage aus der Werkstatt lautete: "Auf welcher Basis wird entschieden, dass ein
 * Material nicht groesser als x mm gefertigt werden kann?" Die Antwort war unangenehm -
 * auf keiner. Alle 38 Werte trugen `estimate_reasoning` und `estimated`, kein einziger
 * war gemessen. Schlimmer noch, sie widersprachen einander:
 *
 *   Verzug 1, keine Kammer noetig:  PLA 2400 · PLA Tough 900 · TPU 95A 300
 *   Verzug 3, Kammer empfohlen:     ASA Aero 2000 · PMMA 900 · PVC 300
 *
 * ASA Aero stand mit SCHLECHTERER Verzugsneigung hoeher als PETG. Genau diese
 * Unstimmigkeit hat es an die Spitze gespuelt.
 *
 * WAS DIE ZAHL JETZT BEDEUTET
 * Nicht "groesser geht nicht", sondern "ab hier wird es aufwendig": Brim, beheizte
 * Kammer, Segmentierung. Die Groesse eines FDM-Bauteils begrenzt der Bauraum und das
 * Verfahren, nicht das Polymer. Mit Kammer und Segmentierung laeuft praktisch jeder
 * dieser Werkstoffe auf zwei Meter und darueber - das ist Werkstattpraxis.
 *
 * DIE HERLEITUNG
 * Massgeblich ist die Verzugsneigung: Sie entscheidet, ob sich eine lange Kante vom Bett
 * loest. Der Kammerbedarf kommt als Faktor dazu, weil eine SEHR GROSSE beheizte Kammer
 * ungleich aufwendiger ist als eine kleine.
 *
 *   Verzug 1 -> 2400 mm    Kammer nicht noetig  -> x 1,0
 *   Verzug 2 -> 1800 mm    Kammer empfohlen     -> x 0,9
 *   Verzug 3 -> 1200 mm    Kammer zwingend      -> x 0,75
 *   Verzug 4 ->  800 mm
 *   Verzug 5 ->  600 mm
 *
 * WAS DIE HERLEITUNG NICHT ABBILDET
 * Druckzeit, Spulenlogistik und Handhabung. Ein zwei Meter langes TPU-Bauteil scheitert
 * nicht am Verzug, sondern an der Druckgeschwindigkeit - dafuer gibt es Ausnahmen mit
 * Begruendung. Ebenso wenig abgebildet ist der Bauraum einer konkreten Maschine: Dieses
 * Werkzeug ist herstellerneutral (ADR-004), der Maschinenpark seines Herausgebers ist
 * kein Massstab fuer die Werkstoffwahl anderer.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data/materials");

const BY_WARPING = { 1: 2400, 2: 1800, 3: 1200, 4: 800, 5: 600 };
const BY_CHAMBER = { "not-required": 1.0, recommended: 0.9, mandatory: 0.75 };

/* Ausnahmen mit Begruendung - dieselbe Systematik wie bei der Chemikalienmatrix. */
const OVERRIDE = {
  "tpu-95a": [900, "Bei Elastomeren begrenzt nicht der Verzug, sondern die Druckgeschwindigkeit: Weiche Filamente laufen mit einem Bruchteil der Geschwindigkeit starrer Werkstoffe, und die Bauzeit wird bei grossen Teilen zum eigentlichen Hindernis."],
  "tpu-85a": [900, "Bei Elastomeren begrenzt nicht der Verzug, sondern die Druckgeschwindigkeit: Weiche Filamente laufen mit einem Bruchteil der Geschwindigkeit starrer Werkstoffe, und die Bauzeit wird bei grossen Teilen zum eigentlichen Hindernis."],
  "tpu-98a": [900, "Bei Elastomeren begrenzt nicht der Verzug, sondern die Druckgeschwindigkeit: Weiche Filamente laufen mit einem Bruchteil der Geschwindigkeit starrer Werkstoffe, und die Bauzeit wird bei grossen Teilen zum eigentlichen Hindernis."],
  "tpu-58d": [900, "Bei Elastomeren begrenzt nicht der Verzug, sondern die Druckgeschwindigkeit: Weiche Filamente laufen mit einem Bruchteil der Geschwindigkeit starrer Werkstoffe, und die Bauzeit wird bei grossen Teilen zum eigentlichen Hindernis."],
  "tpu-esd": [900, "Bei Elastomeren begrenzt nicht der Verzug, sondern die Druckgeschwindigkeit: Weiche Filamente laufen mit einem Bruchteil der Geschwindigkeit starrer Werkstoffe, und die Bauzeit wird bei grossen Teilen zum eigentlichen Hindernis."],
  peba: [900, "Bei Elastomeren begrenzt nicht der Verzug, sondern die Druckgeschwindigkeit: Weiche Filamente laufen mit einem Bruchteil der Geschwindigkeit starrer Werkstoffe, und die Bauzeit wird bei grossen Teilen zum eigentlichen Hindernis."],
  "asa-aero": [1200, "Schaeumende Filamente werden mit stark reduziertem Materialfluss verarbeitet; die Schaumstruktur macht die Schichthaftung empfindlicher gegen lange Bruecken und grosse Flaechen. Der Werkstoff ist fuer LEICHTE Bauteile gedacht, nicht fuer grosse."],
};

const t = (de, en) => ({ de, en });

const NOTE = t(
  "Keine Fertigungsgrenze, sondern eine Aufwandsschwelle: Ab dieser Kantenlänge braucht es Brim, beheizte Kammer oder Segmentierung. Die Größe eines FDM-Bauteils begrenzt der Bauraum und das Verfahren, nicht das Polymer — mit Kammer und Segmentierung laufen praktisch alle diese Werkstoffe auf zwei Meter und darüber. Hergeleitet aus Verzugsneigung und Kammerbedarf (Formel in scripts/derive-xxl-effort.mjs), nicht gemessen. Druckzeit, Spulenlogistik und Handhabung sind darin NICHT enthalten.",
  "Not a manufacturing limit but an effort threshold: from this edge length a brim, a heated chamber or segmentation becomes necessary. The size of an FDM part is limited by the build volume and the process, not by the polymer — with a chamber and segmentation practically all of these materials run to two metres and beyond. Derived from warping tendency and chamber requirement (formula in scripts/derive-xxl-effort.mjs), not measured. Print time, spool logistics and handling are NOT included.");

const num = (n) => (n && typeof n === "object" && "value" in n ? n.value : null);

let changed = 0, kept = 0, over = 0;
const moves = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const p = path.join(DIR, file);
  const m = JSON.parse(readFileSync(p, "utf8"));
  const warp = num(m.processing?.warpingTendency);
  const chamber = m.processing?.chamberRequirement?.value;
  if (warp == null || !BY_WARPING[warp]) { console.log(`  ! keine Verzugsangabe für ${m.id}`); kept++; continue; }

  const ov = OVERRIDE[m.id];
  const base = Math.round((BY_WARPING[warp] * (BY_CHAMBER[chamber] ?? 0.9)) / 50) * 50;
  const value = ov ? ov[0] : base;

  m.commercial ??= {};
  m.commercial.xxl ??= {};
  const before = m.commercial.xxl.maxSensibleEdgeMm?.value ?? null;

  m.commercial.xxl.maxSensibleEdgeMm = {
    value, unit: "mm",
    source: "estimate_reasoning", confidence: "estimated",
    derivedFrom: ["processing.warpingTendency", "processing.chamberRequirement"],
    note: ov
      ? t(`${NOTE.de}\n\nAusnahme von der Herleitung: ${ov[1]}`,
          `${NOTE.en}\n\nException to the derivation: ${ov[1]}`)
      : NOTE,
  };
  // Segmentierung ist bei Grossteilen die Regel, nicht die Ausnahme - Messemodelle
  // werden ohnehin geteilt, um Nachbearbeitung und Transport zu erleichtern.
  m.commercial.xxl.segmentationRecommended = {
    value: true, source: "estimate_reasoning", confidence: "estimated",
    note: t("Bei Großteilen ist Segmentieren der Normalfall: Es erleichtert Nachbearbeitung, Lackierung und Transport — und hebt die Aufwandsschwelle praktisch auf.",
            "For large parts segmentation is the normal case: it eases finishing, painting and transport — and effectively removes the effort threshold."),
  };

  writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
  if (before !== value) { changed++; moves.push([m.id, before, value, warp, chamber, !!ov]); }
  if (ov) over++;
}

console.log(`${changed} Schwellen neu hergeleitet, ${over} davon mit begruendeter Ausnahme.`);
if (moves.length) {
  console.log("\n  Werkstoff     Verzug  Kammer          vorher -> jetzt");
  for (const [id, b, a, w, c, o] of moves.sort((x, y) => y[2] - x[2])) {
    console.log(`  ${id.padEnd(13)}${String(w).padStart(4)}    ${String(c).padEnd(14)}${String(b).padStart(6)} -> ${String(a).padStart(5)}${o ? "  (Ausnahme)" : ""}`);
  }
}
