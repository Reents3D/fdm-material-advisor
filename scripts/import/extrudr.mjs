/**
 * Import: Extrudr (FD3D GmbH, Österreich) — vollständiger Datenblattbestand.
 *
 * Quelle: https://extrudr.com/de/de/page/downloads-for-resellers/
 * 37 deutschsprachige TDS auf s3.extrudr.com, Namensschema {slug}-TDS-de.pdf.
 *
 * ACHTUNG: NACH EINEM EINZELLAUF IMMER `npm run derive:all` HINTERHER.
 * Dieses Skript schreibt nicht nur Produkte, sondern auch WERKSTOFFDATEIEN - und
 * schreibt sie vollstaendig neu. Alles, was die nachgelagerten Schritte dort ergaenzt
 * haben, ist danach weg: 798 Chemikalienbewertungen, Preise, XXL-Aufwand, Brandschutz,
 * Anisotropiefaktoren, Feldwissen. Am 2026-08-05 hat ein einzelner Lauf dieses Skripts
 * zwoelf Werkstoffdateien um 250 bis 350 Zeilen gekuerzt.
 *
 * Weder Schema noch Plausibilitaetspruefung schlagen dabei an - die Dateien bleiben ohne
 * diese Felder gueltig, nur aermer. Aufgefallen ist es damals nur an der Zeilenstatistik
 * des Commits. Seitdem haelt `tests/data/inventory-floor.test.ts` die Bestandszahlen als
 * Untergrenze fest und macht den Verlust rot.
 *
 * Elf Importer schreiben Werkstoffdateien; das hier ist keine Eigenheit dieses einen.
 * `npm run import:all` enthaelt die derive-Kette bereits.
 *
 * Zwei Ausgaben:
 *  1) PRODUKTE unter den generischen Werkstofftypen. "DuraPro ASA" ist Extrudrs eigene
 *     Rezeptur von ASA, nicht ein eigener Werkstoff - also materialId "asa". Genau so
 *     wird sichtbar, wo eine Marke gegenüber dem Feld gewinnt (DuraPro ASA: 62 MPa
 *     gegen 37 MPa bei Bambu ASA).
 *  2) NEUE WERKSTOFFTYPEN dort, wo es bisher gar keinen gab.
 *
 * PRÜFBEDINGUNG, die Extrudr in einer Fussnote versteckt:
 *   "Temperaturresistenz geprüft bei Wanddicke von mindestens 4 mm."
 * Alle VICAT- und HDT-Werte tragen das deshalb in `conditions`. Bei dünnwandigen
 * Bauteilen sind die Zahlen nicht erreichbar.
 *
 * DATENBLATT-WIDERSPRÜCHE werden dokumentiert, nicht repariert. Wir wissen nicht, welche
 * von zwei widersprüchlichen Angaben die richtige ist - also behaupten wir es auch nicht.
 * Betroffene Werte werden gar nicht erst übernommen; der Befund steht im specimenNote.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-01";
const TDS = "https://s3.extrudr.com/extrudr-media/datasheets/tds/tds-de";
const WALL = "Temperaturbeständigkeit laut Datenblatt-Fussnote nur bei Wanddicke ab 4 mm geprüft";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.tol != null ? { tolerance: o.tol } : {}),
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: o.source ?? "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});
const rating = (value, scale, o = {}) => ({
  value, scale, source: o.source ?? "estimate_reasoning",
  confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}),
});
const flag = (value, o = {}) => ({
  value, source: o.source ?? "estimate_reasoning",
  confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}),
});
const choice = (value, o = {}) => ({
  value, source: o.source ?? "estimate_reasoning",
  confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}),
});

/* Werte, die das Datenblatt nur als Spanne nennt: Mitte als Wert, Grenzen mitführen. */
const span = (lo, hi, unit, o = {}) =>
  q(Math.round(((lo + hi) / 2) * 100) / 100, unit, { min: lo, max: hi, ...o });

/* ============================================================== PRODUKTE ==== */

const P = [
  /* ---------- PLA-Familie ---------- */
  { file: "pla-basic", material: "pla", name: "Extrudr PLA Basic",
    props: { tensileStrengthXy: q(53, "MPa", { std: "ASTM D882", confidence: "low",
        note: t("ASTM D882 ist eine Prüfnorm für dünne Folien, nicht für Zugstäbe. Der Wert ist deshalb nur eingeschränkt mit ISO-527-Werten anderer Hersteller vergleichbar.",
                "ASTM D882 is a test standard for thin films, not tensile bars. The value is therefore only of limited comparability with the ISO 527 values of other manufacturers.") }),
      elongationAtBreakXy: q(6, "%", { std: "ASTM D882 (nominell)" }),
      izodNotchedXy: q(0.3, "kJ/m²", { std: "ASTM D256" }),
      hdtB: q(55, "°C", { std: "ASTM E2092", conditions: WALL }),
      density: q(1.24, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    anomaly: t("Das Datenblatt nennt als Zug-E-Modul „500 (3,5)“ MPa. 500 MPa sind für PLA um den Faktor sechs zu niedrig — PLA liegt bei 3000 bis 3500 MPa. Der Wert wurde deshalb nicht übernommen. Zusätzlich sind PLA Basic, PLA Basic CF und PLA Basic CMYK bei Extrudr zeilengleich dokumentiert, obwohl eine Carbonfaser-Füllung Steifigkeit und Dichte zwangsläufig verändert.",
               "The datasheet gives a tensile modulus of “500 (3.5)” MPa. 500 MPa is six times too low for PLA, which sits at 3000 to 3500 MPa. The value was therefore not imported. In addition, PLA Basic, PLA Basic CF and PLA Basic CMYK are documented with identical rows at Extrudr, although carbon fibre filling necessarily changes stiffness and density.") },

  { file: "pla-basic-cf", material: "pla", name: "Extrudr PLA Basic CF",
    props: { tensileStrengthXy: q(53, "MPa", { std: "ASTM D882", confidence: "low" }),
      elongationAtBreakXy: q(6, "%", { std: "ASTM D882 (nominell)" }),
      izodNotchedXy: q(0.3, "kJ/m²", { std: "ASTM D256" }),
      hdtB: q(55, "°C", { std: "ASTM E2092", conditions: WALL }),
      density: q(1.24, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    anomaly: t("Sämtliche Kennwerte sind mit dem unverstärkten PLA Basic identisch — einschließlich der Dichte von 1,24 g/cm³. Eine Carbonfaser-Füllung verändert die Dichte immer. Der einzige Unterschied im Datenblatt ist die Empfehlung einer gehärteten Düse. Wir gehen davon aus, dass die CF-Variante nicht eigenständig geprüft wurde, und übernehmen die Werte nur zur Dokumentation dieses Befunds.",
               "All values are identical to unfilled PLA Basic — including the density of 1.24 g/cm³. Carbon fibre filling always changes density. The only difference in the datasheet is the recommendation of a hardened nozzle. We assume the CF grade was not separately tested and import the values only to document this finding.") },

  { file: "pla-hs", material: "pla", name: "Extrudr PLA High Speed",
    props: { tensileStrengthXy: q(50, "MPa", { std: "ISO 527-1" }), tensileModulusXy: q(3500, "MPa", { std: "ISO 527-1" }),
      elongationAtBreakXy: q(5, "%", { std: "ISO 527-1 (≤ 5)" }), charpyNotchedXy: q(5, "kJ/m²", { std: "ISO 179-1eA, 23 °C (≤ 5)" }),
      hdtB: q(60, "°C", { std: "ISO 75-1, amorph", conditions: WALL,
        note: t("Nach Kristallisation (Tempern) nennt das Datenblatt 105 °C statt 60 °C — bei PLA ist das der größte Temperatursprung, den Tempern in dieser Datenbank bewirkt.",
                "After crystallisation (annealing) the datasheet states 105 °C instead of 60 °C — for PLA this is the largest temperature gain from annealing in this database.") }),
      density: q(1.24, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(225, "°C", { min: 210, max: 240 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    features: t("Freigegeben bis 1000 mm/s Druckgeschwindigkeit — der schnellste Werkstoff dieser Datenbank. Getempert steigt die Wärmeformbeständigkeit von 60 auf 105 °C.",
                "Released for up to 1000 mm/s print speed — the fastest material in this database. Annealed, heat resistance rises from 60 to 105 °C.") },

  { file: "pla-tough", material: "pla-tough", name: "Extrudr PLA Tough",
    props: { tensileStrengthXy: q(56.9, "MPa", { std: "ISO 527-2 (Streckspannung)" }), tensileModulusXy: q(3200, "MPa", { std: "ISO 527-2" }),
      elongationAtBreakXy: q(14, "%", { std: "ISO 527-2" }), flexuralStrengthXy: q(89.8, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(3340, "MPa", { std: "ISO 178" }),
      vicatA: q(65, "°C", { std: "ISO 306 A50", conditions: WALL,
        note: t("Getempert nennt das Datenblatt über 150 °C statt 65 °C. Ohne Temperofen ist der hohe Wert nicht erreichbar.",
                "Annealed, the datasheet states over 150 °C instead of 65 °C. Without an annealing oven the high value is not achievable.") }),
      density: q(1.2, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    features: t("Das Datenblatt gibt die Bruchspannung als „unzerbrechlich“ an — im Zugversuch tritt kein Sprödbruch auf. Bemerkenswert ist der Temper-Effekt: Vicat springt von 65 °C auf über 150 °C, das ist PC-Niveau aus einem PLA-Werkstoff. Voraussetzung ist ein Temperofen.",
                "The datasheet reports elongation at break as “unbreakable” — no brittle fracture occurs in the tensile test. The annealing effect is notable: Vicat jumps from 65 °C to over 150 °C, PC territory from a PLA material. An annealing oven is required.") },

  { file: "pla-nx2-matt", material: "pla", name: "Extrudr PLA NX2 Matt",
    props: { tensileStrengthXy: q(47, "MPa", { std: "ISO 527" }), tensileModulusXy: q(2600, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(19, "%", { std: "ISO 527-2 (nominell)" }), flexuralModulusXy: q(2650, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: q(7, "kJ/m²", { std: "ISO 179/1eA" }), vicatA: q(60, "°C", { std: "ISO 306", conditions: WALL }),
      density: q(1.3, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    ul94: "HB",
    features: t("Matte Oberfläche, CO2-neutral, verbesserte UV-Beständigkeit. FDA, RoHS und Spielzeugsicherheit. Kein geschlossener Bauraum, keine gehärtete Düse.",
                "Matte surface, CO2-neutral, improved UV resistance. FDA, RoHS and toy safety. No enclosure, no hardened nozzle.") },

  { file: "biofusion", material: "pla", name: "Extrudr BioFusion",
    props: { tensileStrengthXy: q(55, "MPa", { std: "ASTM D882" }), tensileModulusXy: q(3200, "MPa", { std: "ASTM D882" }),
      flexuralModulusXy: q(2200, "MPa", { std: "ISO 178" }), vicatA: q(75, "°C", { std: "ASTM D1525", conditions: WALL }),
      density: q(1.25, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    anomaly: t("Bruchspannung und Bruchdehnung tragen im Datenblatt vertauschte Einheiten: „Bruchspannung 5 %“ und „Bruchdehnung 41 MPa“. Eine Spannung wird nicht in Prozent gemessen und eine Dehnung nicht in MPa. Welche der beiden Zahlen zu welcher Größe gehört, geht aus dem Blatt nicht hervor — beide Werte wurden deshalb nicht übernommen.",
               "Stress and strain at break carry swapped units in the datasheet: “stress at break 5 %” and “elongation at break 41 MPa”. A stress is not measured in percent and a strain not in MPa. Which figure belongs to which quantity is not derivable from the sheet — both values were therefore not imported.") },

  { file: "pearl", material: "pla", name: "Extrudr Pearl",
    props: { tensileStrengthXy: q(34, "MPa", { std: "ISO 527" }), tensileModulusXy: q(2500, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(6.9, "%", { std: "ISO 527" }), flexuralStrengthXy: q(30.1, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(1800, "MPa", { std: "ISO 178" }), vicatA: q(58, "°C", { std: "ISO 306", conditions: WALL }),
      hdtB: q(51, "°C", { std: "ISO 75", conditions: WALL }), density: q(1.25, "g/cm³", { std: "ISO 2781" }),
      nozzleTemperature: q(175, "°C", { min: 140, max: 210 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    features: t("Dekorwerkstoff mit Perlmutteffekt. Druckt bereits ab 140 °C Düsentemperatur — der niedrigste Wert dieser Datenbank. Mechanisch schwächer als Standard-PLA.",
                "Decorative material with a mother-of-pearl effect. Prints from a nozzle temperature of 140 °C — the lowest value in this database. Mechanically weaker than standard PLA.") },

  { file: "wood", material: "pla", name: "Extrudr Wood",
    props: { tensileStrengthXy: q(40, "MPa", { std: "ISO 527" }), tensileModulusXy: q(3200, "MPa", { std: "ISO 527" }),
      vicatA: q(48, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.23, "g/cm³", { std: "ISO 2781" }),
      nozzleTemperature: q(180, "°C", { min: 170, max: 190 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    features: t("Holzgefüllter Dekorwerkstoff, ISO-14885-abbaubar. Enges Temperaturfenster von nur 170 bis 190 °C — darüber verbrennt der Holzanteil.",
                "Wood-filled decorative material, degradable to ISO 14885. Narrow temperature window of just 170 to 190 °C — above that the wood content scorches.") },

  { file: "flax", material: "pla", name: "Extrudr Flax",
    props: { tensileStrengthXy: q(43, "MPa", { std: "ISO 527" }), tensileModulusXy: q(3400, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(22.3, "%", { std: "ISO 527" }), vicatA: q(48, "°C", { std: "ISO 306", conditions: WALL }),
      density: q(1.45, "g/cm³", { std: "ISO 2781" }),
      nozzleTemperature: q(210, "°C", { min: 180, max: 240 }), bedTemperature: q(40, "°C", { min: 20, max: 60 }) },
    features: t("Flachsfaserverstärkt und ISO-14885-abbaubar — Naturfaser statt Carbon. 22 % Bruchdehnung bei 3400 MPa Steifigkeit ist für einen faserverstärkten Werkstoff ungewöhnlich zäh.",
                "Flax-fibre reinforced and degradable to ISO 14885 — natural fibre instead of carbon. 22 % elongation at break with 3400 MPa stiffness is unusually tough for a fibre-reinforced material.") },

  /* ---------- PETG-Familie ---------- */
  { file: "petg", material: "petg", name: "Extrudr PETG",
    props: { tensileStrengthXy: q(61, "MPa", { std: "ISO 527" }), tensileModulusXy: q(3100, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(28, "%", { std: "ISO 527-2 (nominell)" }), flexuralStrengthXy: q(68, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(2100, "MPa", { std: "ISO 178" }), izodNotchedXy: q(4.7, "kJ/m²", { std: "ISO 180" }),
      vicatA: q(78, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.29, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }), bedTemperature: q(75, "°C", { min: 60, max: 90 }) },
    ul94: "V-2", ul94Thickness: 3.2,
    features: t("UL94 V-2 bei 3,2 mm — eine der wenigen Brandschutz-Einstufungen unter Standard-Filamenten. Keine gehärtete Düse nötig.",
                "UL94 V-2 at 3.2 mm — one of the few fire classifications among standard filaments. No hardened nozzle required.") },

  { file: "xpetg-matt", material: "petg", name: "Extrudr XPETG Matt",
    props: { tensileStrengthXy: q(53, "MPa", { tol: 0.2, std: "ISO 527 (Streckspannung)" }),
      tensileModulusXy: q(3100, "MPa", { tol: 46, std: "ISO 527" }),
      elongationAtBreakXy: q(7.6, "%", { tol: 1.1, std: "ISO 527-2" }),
      izodNotchedXy: q(1.7, "kJ/m²", { tol: 0.4, std: "ISO 180" }), izodUnnotchedXy: q(78, "kJ/m²", { tol: 6, std: "ISO 180" }),
      hdtB: q(67, "°C", { std: "ISO 75", conditions: WALL }), vicatA: q(85, "°C", { std: "ISO 306", conditions: WALL }),
      density: q(1.41, "g/cm³", { std: "ISO 1183-1/A" }), hardnessShoreD: q(76, "Shore D", { std: "ISO 868/D" }),
      nozzleTemperature: q(225, "°C", { min: 210, max: 240 }), bedTemperature: q(75, "°C", { min: 60, max: 90 }) },
    ul94: "V-2", ul94Thickness: 3.2,
    features: t("Eines der wenigen Datenblätter mit Streuungsangaben statt nackter Zahlen — ±46 MPa auf den E-Modul, ±1,1 % auf die Bruchdehnung. Das sagt mehr über die Belastbarkeit der Werte aus als jede Nachkommastelle.",
                "One of the few datasheets with scatter figures instead of bare numbers — ±46 MPa on the modulus, ±1.1 % on elongation. That says more about how much the values can bear than any decimal place.") },

  { file: "xpetg-cf", material: "petg-cf", name: "Extrudr XPETG CF",
    props: { tensileStrengthXy: q(59, "MPa", { tol: 0.4, std: "ISO 527 (Streckspannung)" }),
      tensileModulusXy: q(3350, "MPa", { tol: 50, std: "ISO 527" }),
      elongationAtBreakXy: q(9.4, "%", { tol: 1.5, std: "ISO 527-2" }),
      izodNotchedXy: q(1.7, "kJ/m²", { tol: 0.4, std: "ISO 180" }), izodUnnotchedXy: q(67, "kJ/m²", { tol: 7, std: "ISO 180" }),
      hdtB: q(69, "°C", { std: "ISO 75", conditions: WALL }), vicatA: q(85, "°C", { std: "ISO 306", conditions: WALL }),
      density: q(1.29, "g/cm³", { std: "ISO 1183-1XA" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }), bedTemperature: q(75, "°C", { min: 60, max: 90 }) },
    ul94: "V-2", ul94Thickness: 3.2 },

  { file: "pctg", material: "pctg", name: "Extrudr PCTG",
    props: { tensileStrengthXy: q(43, "MPa", { std: "ISO 527 (Streckspannung)" }),
      elongationAtBreakXy: q(215, "%", { std: "ISO 527" }), flexuralStrengthXy: q(62, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(1650, "MPa", { std: "ISO 178" }), izodNotchedXy: q(94, "kJ/m²", { std: "ISO 180, 23 °C" }),
      hdtB: q(76, "°C", { std: "ISO 75", conditions: WALL }), vicatA: q(88, "°C", { std: "ASTM D1525", conditions: WALL }),
      density: q(1.23, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(250, "°C", { min: 230, max: 270 }), bedTemperature: q(100, "°C", { min: 90, max: 110 }) },
    ul94: "V-2", ul94Thickness: 3.2,
    features: t("215 % Bruchdehnung und 94 kJ/m² Kerbschlagzähigkeit — PCTG ist deutlich zäher als PETG und trotzdem UL94 V-2 eingestuft. Der Preis dafür ist ein weicherer Werkstoff: 1650 MPa Biegemodul gegen 2100 MPa bei PETG.",
                "215 % elongation at break and 94 kJ/m² notched impact — PCTG is markedly tougher than PETG and still classified UL94 V-2. The price is a softer material: 1650 MPa flexural modulus against 2100 MPa for PETG.") },

  /* ---------- ABS / ASA ---------- */
  { file: "durapro-abs", material: "abs", name: "Extrudr DuraPro ABS",
    props: { tensileStrengthXy: q(49, "MPa", { std: "ASTM D638" }), tensileModulusXy: q(2350, "MPa", { std: "ASTM D638" }),
      elongationAtBreakXy: q(10, "%", { std: "ASTM D638 (nominell)" }), flexuralStrengthXy: q(78, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(2550, "MPa", { std: "ASTM D790" }), izodNotchedXy: q(220, "kJ/m²", { std: "ASTM D256, 23 °C" }),
      hdtB: q(85, "°C", { std: "ASTM D648", conditions: WALL }), vicatA: q(92, "°C", { std: "ASTM D1525", conditions: WALL }),
      density: q(1.06, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }), bedTemperature: q(105, "°C", { min: 100, max: 110 }) },
    ul94: "HB" },

  { file: "durapro-abs-cf", material: "abs", name: "Extrudr DuraPro ABS CF",
    props: { tensileStrengthXy: q(49, "MPa", { std: "ASTM D638" }), tensileModulusXy: q(2350, "MPa", { std: "ASTM D638" }),
      elongationAtBreakXy: q(10, "%", { std: "ASTM D638 (nominell)" }), flexuralStrengthXy: q(78, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(2550, "MPa", { std: "ASTM D790" }), izodNotchedXy: q(220, "kJ/m²", { std: "ASTM D256, 23 °C" }),
      hdtB: q(85, "°C", { std: "ASTM D648", conditions: WALL }), density: q(1.06, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }), bedTemperature: q(105, "°C", { min: 100, max: 110 }) },
    ul94: "HB",
    anomaly: t("Alle Kennwerte stimmen Zeile für Zeile mit dem unverstärkten DuraPro ABS überein — auch die Dichte von 1,06 g/cm³ und die Kerbschlagzähigkeit. Carbonfaser erhöht die Steifigkeit, senkt die Bruchdehnung und verändert die Dichte; dass sich keine dieser Größen unterscheidet, spricht dafür, dass die CF-Variante nicht eigenständig geprüft wurde. Einziger Unterschied im Datenblatt: die Empfehlung einer gehärteten Düse.",
               "Every value matches unfilled DuraPro ABS row for row — including the density of 1.06 g/cm³ and the notched impact strength. Carbon fibre raises stiffness, lowers elongation and changes density; that none of these differs suggests the CF grade was not separately tested. The only difference in the datasheet: the recommendation of a hardened nozzle.") },

  { file: "durapro-asa", material: "asa", name: "Extrudr DuraPro ASA",
    props: { tensileStrengthXy: q(62.2, "MPa", { tol: 3, std: "ASTM D638" }), tensileModulusXy: q(2200, "MPa", { std: "ASTM D638" }),
      elongationAtBreakXy: q(20, "%", { std: "ASTM D638 (nominell)" }), flexuralStrengthXy: q(78, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(3500, "MPa", { tol: 200, std: "ASTM D790" }), izodNotchedXy: q(140, "kJ/m²", { std: "ASTM D256, 23 °C" }),
      hdtB: q(96, "°C", { std: "ASTM D648", conditions: WALL }), vicatA: q(96, "°C", { std: "ASTM D1525", conditions: WALL }),
      density: q(1.05, "g/cm³", { std: "ASTM D792" }), nozzleTemperature: q(245, "°C", { min: 220, max: 270 }),
      bedTemperature: q(105, "°C", { min: 100, max: 110 }) },
    ul94: "HB",
    features: t("Deutlich fester als das ASA im Feld: 62 MPa gegen 37 MPa bei Bambu ASA und 42 MPa bei Prusament ASA. Achtung, andere Prüfnorm (ASTM D638 statt ISO 527) — die Werte sind nicht 1:1 vergleichbar, der Abstand ist aber zu gross, um allein daher zu kommen. Das Datenblatt enthält zudem einen Bewitterungstest über 2000 Stunden.",
                "Markedly stronger than the ASA in this field: 62 MPa against 37 MPa for Bambu ASA and 42 MPa for Prusament ASA. Note the different standard (ASTM D638 rather than ISO 527) — values are not directly comparable, but the gap is too large to come from that alone. The datasheet also contains a 2000-hour weathering test.") },

  { file: "durapro-asa-gf", material: "asa", name: "Extrudr DuraPro ASA GF",
    props: { tensileStrengthXy: span(60, 66, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: span(5, 8, "%", { std: "ISO 527" }),
      flexuralStrengthXy: span(95, 105, "MPa", { std: "ISO 178" }), flexuralModulusXy: span(2900, 3300, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: span(8, 10, "kJ/m²", { std: "ISO 179/1eA, 23 °C" }), izodNotchedXy: span(9, 11, "kJ/m²", { std: "ISO 180/1A, 23 °C" }),
      hdtB: span(92, 100, "°C", { std: "ISO 75, 4 mm, ungetempert", confidence: "low", conditions: WALL,
        note: t("Das Datenblatt nennt die Laststufe nicht. HDT nach ISO 75 wird bei 1,8 MPa (A) oder 0,45 MPa (B) geprüft; ohne diese Angabe ist der Wert nicht eindeutig einzuordnen. Hier als HDT/B geführt, weil der Zahlenwert dazu passt.",
                "The datasheet does not state the load level. HDT to ISO 75 is tested at 1.8 MPa (A) or 0.45 MPa (B); without that information the value cannot be placed unambiguously. Recorded as HDT/B here because the magnitude fits.") }),
      vicatB50: span(100, 104, "°C", { std: "ISO 306, 50 N", conditions: WALL }),
      density: q(1.18, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(250, "°C", { min: 230, max: 270 }), bedTemperature: q(110, "°C") },
    ul94: "HB",
    features: t("Glasfaser statt Carbon: 95–105 MPa Biegefestigkeit sind der höchste Wert der ASA-Familie in dieser Datenbank. Extrudr gibt hier durchgehend Spannen statt Einzelwerten an, was der Sache angemessener ist.",
                "Glass fibre instead of carbon: 95–105 MPa flexural strength is the highest value in the ASA family in this database. Extrudr states ranges rather than single values throughout, which is more appropriate to the matter.") },

  { file: "durapro-asa-cf", material: "asa-cf", name: "Extrudr DuraPro ASA CF",
    props: { tensileStrengthXy: q(49, "MPa", { std: "ASTM D638" }), tensileModulusXy: q(2500, "MPa", { std: "ASTM D638" }),
      flexuralStrengthXy: q(78, "MPa", { std: "ASTM D790" }), flexuralModulusXy: q(4500, "MPa", { std: "ASTM D790" }),
      izodNotchedXy: q(100, "kJ/m²", { std: "ASTM D256, 23 °C" }),
      hdtB: q(96, "°C", { std: "ASTM D648", conditions: WALL }), vicatA: q(101, "°C", { std: "ASTM D1525", conditions: WALL }),
      density: q(1.14, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(250, "°C", { min: 240, max: 260 }), bedTemperature: q(110, "°C") },
    ul94: "HB",
    features: t("12 Vol.-% Carbonanteil, ausgewiesen im Datenblatt — eine Angabe, die die meisten Hersteller schuldig bleiben. Biegemodul 4500 MPa gegen 3500 MPa beim ungefüllten DuraPro ASA.",
                "12 vol.-% carbon content, declared in the datasheet — a figure most manufacturers omit. Flexural modulus 4500 MPa against 3500 MPa for unfilled DuraPro ASA.") },

  /* ---------- Polyamide ---------- */
  { file: "durapro-pa12", material: "pa12", name: "Extrudr DuraPro PA12",
    props: { tensileStrengthXy: q(43, "MPa", { std: "ISO 527-2" }), tensileModulusXy: q(1440, "MPa", { std: "ISO 527-1" }),
      elongationAtBreakXy: q(50, "%", { std: "ISO 527-2 (nominell, > 50)" }),
      charpyNotchedXy: q(11, "kJ/m²", { std: "ISO 179/1eA, 23 °C" }),
      hdtA: q(55, "°C", { std: "ISO 75-2/A, ungeglüht", conditions: WALL }),
      hdtB: q(135, "°C", { std: "ISO 75-2/B, ungeglüht", conditions: WALL }),
      vicatB50: q(142, "°C", { std: "ISO 306/B50", conditions: WALL }), density: q(1.01, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }), bedTemperature: q(110, "°C") },
    ul94: "HB" },

  { file: "durapro-pa12-cf", material: "pa12-cf", name: "Extrudr DuraPro PA12 CF",
    props: { tensileStrengthXy: q(60.4, "MPa", { std: "ISO 527-2" }), tensileModulusXy: q(2820, "MPa", { std: "ISO 527-1" }),
      elongationAtBreakXy: q(35, "%", { std: "ISO 527-2 (nominell, > 35)" }),
      charpyNotchedXy: q(9, "kJ/m²", { std: "ISO 179/1eA, 23 °C" }),
      hdtA: q(58, "°C", { std: "ISO 75-2/A, ungeglüht", conditions: WALL }),
      hdtB: q(139, "°C", { std: "ISO 75-2/B, ungeglüht", conditions: WALL }),
      vicatB50: q(145, "°C", { std: "ISO 306/B50", conditions: WALL }), density: q(1.03, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }), bedTemperature: q(110, "°C") },
    ul94: "HB",
    features: t("Ungewöhnlich für ein carbonverstärktes Polyamid: über 35 % Bruchdehnung bei 2820 MPa Steifigkeit, im ungekerbten Charpy-Versuch kein Bruch bei −30 °C. PA12-CF verliert die Zähigkeit nicht, die faserverstärkte Werkstoffe sonst kostet.",
                "Unusual for a carbon-reinforced polyamide: over 35 % elongation at break at 2820 MPa stiffness, and no break in the unnotched Charpy test at −30 °C. PA12-CF does not lose the toughness that fibre reinforcement normally costs.") },

  { file: "durapro-pa6-cf", material: "pa6-cf", name: "Extrudr DuraPro PA6 CF",
    props: { tensileStrengthXy: q(60, "MPa", { std: "ISO 527 (Streckspannung)" }),
      elongationAtBreakXy: q(4, "%", { std: "ISO 527-2 (nominell)" }),
      charpyNotchedXy: q(16, "kJ/m²", { std: "ISO 179/1eA, 23 °C" }), izodNotchedXy: q(5, "kJ/m²", { std: "ISO 180, 23 °C" }),
      hdtA: q(105, "°C", { std: "ISO 75-2/A, ungeglüht", conditions: WALL }),
      hdtB: q(170, "°C", { std: "ISO 75-2/B, ungeglüht", conditions: WALL }),
      density: q(1.15, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(285, "°C", { min: 270, max: 300 }), bedTemperature: q(90, "°C", { min: 80, max: 100 }) },
    anomaly: t("Das Datenblatt nennt einen Zug-E-Modul von 1100 MPa. Das liegt unter dem unverstärkten DuraPro PA12 (1440 MPa) und unter der GF-Variante desselben Werkstoffs (2400 MPa) — bei einem carbonfaserverstärkten PA6 wäre der drei- bis fünffache Wert zu erwarten. Zusammen mit der angegebenen Wassersättigung von 9 %, die für unverstärktes PA6 typisch ist, deutet das auf Kennwerte des ungefüllten und konditionierten Grundpolymers hin. Der E-Modul wurde deshalb nicht übernommen.",
               "The datasheet states a tensile modulus of 1100 MPa. That is below unfilled DuraPro PA12 (1440 MPa) and below the GF grade of the same material (2400 MPa) — for a carbon-fibre reinforced PA6 three to five times the value would be expected. Together with the stated 9 % water saturation, typical of unfilled PA6, this points to values for the unfilled and conditioned base polymer. The modulus was therefore not imported.") },

  { file: "durapro-pa6-gf", material: "pa6-gf", name: "Extrudr DuraPro PA6 GF",
    props: { tensileStrengthXy: q(55, "MPa", { std: "ISO 527 (Streckspannung)" }), tensileModulusXy: q(2400, "MPa", { std: "ISO 527-1" }),
      elongationAtBreakXy: q(3.8, "%", { std: "ISO 527-2 (nominell)" }),
      charpyNotchedXy: q(18, "kJ/m²", { std: "ISO 179/1eA, 23 °C" }), izodNotchedXy: q(5.2, "kJ/m²", { std: "ISO 180, 23 °C" }),
      hdtA: q(95, "°C", { std: "ISO 75-2/A, ungeglüht", conditions: WALL }),
      hdtB: q(210, "°C", { std: "ISO 75-2/B, ungeglüht", conditions: WALL }),
      density: q(1.21, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(285, "°C", { min: 270, max: 300 }), bedTemperature: q(90, "°C", { min: 80, max: 100 }) },
    features: t("210 °C HDT/B ist der höchste Temperaturwert dieser Datenbank. Zu beachten: bei 1,8 MPa Last bleiben davon 95 °C — die Spreizung zwischen den beiden Laststufen ist bei teilkristallinen Polyamiden systembedingt gross und darf nicht als Dauergebrauchstemperatur gelesen werden.",
                "210 °C HDT/B is the highest temperature figure in this database. Note: at 1.8 MPa load only 95 °C remains — the spread between the two load levels is inherently large for semi-crystalline polyamides and must not be read as a continuous service temperature.") },

  /* ---------- PC-Familie ---------- */
  { file: "durapro-pc-fr-v0", material: "pc-fr", name: "Extrudr DuraPro PC-FR V0",
    props: { tensileStrengthXy: q(53, "MPa", { std: "ISO 527-1,-2 (Bruchspannung)" }), tensileModulusXy: q(2650, "MPa", { std: "ISO 527-1,-2" }),
      elongationAtBreakXy: q(50, "%", { std: "ISO 527-1,-2 (nominell, > 50)" }),
      izodNotchedXy: q(40, "kJ/m²", { std: "ISO 180/A, 23 °C" }),
      hdtA: q(98, "°C", { std: "ISO 75-1,-2, 1.8 MPa", conditions: WALL }),
      hdtB: q(106, "°C", { std: "ISO 75-1,-2, 0.45 MPa", conditions: WALL }),
      vicatB50: q(115, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.19, "g/cm³", { std: "ISO 1183-1" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }), bedTemperature: q(110, "°C") },
    ul94: "V-0", ul94Thickness: 1.5,
    features: t("Der einzige Werkstoff in dieser Datenbank mit echtem Brandschutzzeugnis: UL94 V-0 bei 1,5 mm, 5VB bei 2,0 mm, 5VA bei 3,0 mm — zusätzlich bahnzertifiziert nach EN 45545-2 HL3 (R22, R23, R24). Kerbschlagzähigkeit 40 kJ/m² bei 23 °C und noch 10 kJ/m² bei −30 °C. Braucht geschlossenen Bauraum.",
                "The only material in this database with a genuine fire certificate: UL94 V-0 at 1.5 mm, 5VB at 2.0 mm, 5VA at 3.0 mm — plus rail certification to EN 45545-2 HL3 (R22, R23, R24). Notched impact 40 kJ/m² at 23 °C and still 10 kJ/m² at −30 °C. Requires an enclosure.") },

  { file: "durapro-pc-pbt", material: "pc-pbt", name: "Extrudr DuraPro PC-PBT",
    props: { tensileStrengthXy: q(60, "MPa", { std: "ISO 527-1,-2 (Streckspannung)" }), tensileModulusXy: q(2200, "MPa", { std: "ISO 527-1,-2" }),
      elongationAtBreakXy: q(50, "%", { std: "ISO 527-1,-2 (nominell, > 50)" }),
      flexuralStrengthXy: q(80, "MPa", { std: "ISO 178" }), flexuralModulusXy: q(2150, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: q(60, "kJ/m²", { std: "ISO 179/1eA" }), izodNotchedXy: q(50, "kJ/m²", { std: "ISO 180/A" }),
      hdtA: q(85, "°C", { std: "ISO 75-1,-2, 1.8 MPa", conditions: WALL }),
      hdtB: q(110, "°C", { std: "ISO 75-1,-2, 0.45 MPa", conditions: WALL }),
      vicatB50: q(126, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.2, "g/cm³", { std: "ISO 1183-1" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }), bedTemperature: q(110, "°C") },
    ul94: "HB",
    features: t("PC/PBT-Blend: die Zähigkeit von Polycarbonat mit der Chemikalien- und Kraftstoffbeständigkeit von PBT. 60 kJ/m² Kerbschlagzähigkeit bei über 50 % Bruchdehnung, CTI 600 V für elektrische Anwendungen.",
                "PC/PBT blend: the toughness of polycarbonate with the chemical and fuel resistance of PBT. 60 kJ/m² notched impact at over 50 % elongation, CTI 600 V for electrical applications.") },

  { file: "durapro-pc-pbt-cf", material: "pc-pbt", name: "Extrudr DuraPro PC-PBT CF",
    props: { tensileStrengthXy: q(70.2, "MPa", { std: "ISO 527-1,-2 (Streckspannung)" }), tensileModulusXy: q(4520, "MPa", { std: "ISO 527-1,-2" }),
      elongationAtBreakXy: q(35, "%", { std: "ISO 527-1,-2 (nominell, > 35)" }),
      flexuralStrengthXy: q(85, "MPa", { std: "ISO 178" }), flexuralModulusXy: q(3350, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: q(65, "kJ/m²", { std: "ISO 179/1eA" }), izodNotchedXy: q(55, "kJ/m²", { std: "ISO 180/A" }),
      hdtA: q(89, "°C", { std: "ISO 75-1,-2, 1.8 MPa", conditions: WALL }),
      hdtB: q(115, "°C", { std: "ISO 75-1,-2, 0.45 MPa", conditions: WALL }),
      vicatB50: q(130, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.2, "g/cm³", { std: "ISO 1183-1" }),
      nozzleTemperature: q(280, "°C", { min: 265, max: 295 }), bedTemperature: q(110, "°C") },
    ul94: "HB",
    features: t("Die seltene Kombination aus hoher Steifigkeit und hoher Zähigkeit: 4520 MPa E-Modul bei 65 kJ/m² Kerbschlagzähigkeit und über 35 % Bruchdehnung. Faserverstärkte Werkstoffe erkaufen Steifigkeit sonst fast immer mit Sprödigkeit.",
                "The rare combination of high stiffness and high toughness: 4520 MPa modulus at 65 kJ/m² notched impact and over 35 % elongation. Fibre-reinforced materials almost always pay for stiffness with brittleness.") },

  /* ---------- Biopolymere ---------- */
  { file: "greentec", material: "greentec", name: "Extrudr GreenTEC",
    props: { tensileStrengthXy: q(46, "MPa", { std: "ISO 527" }), tensileModulusXy: q(3200, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(14, "%", { std: "ISO 527-2 (nominell)" }),
      charpyNotchedXy: q(19, "kJ/m²", { std: "ISO 179/1eA" }), charpyUnnotchedXy: q(218, "kJ/m²", { std: "ISO 179/1eU" }),
      vicatA: q(115, "°C", { conditions: WALL, confidence: "low" }), density: q(1.3, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }), bedTemperature: q(55, "°C", { min: 20, max: 90 }) },
    anomaly: t("Die Methodenspalte dieses Datenblatts ist um eine Zeile verschoben: Vicat steht auf ISO 3146-C (der Norm für die Schmelztemperatur), die Schmelztemperatur auf ISO 1133 (der Norm für den MFR) und der MFR auf ISO 75 (der Norm für HDT). Die Zahlenwerte selbst sind plausibel, die zugeordneten Prüfnormen sind es nicht — sie wurden deshalb für die betroffenen Zeilen nicht übernommen. Das Schwesterblatt GreenTEC Pro ordnet dieselben Größen korrekt zu.",
               "The method column of this datasheet is shifted by one row: Vicat is listed against ISO 3146-C (the melt temperature standard), melt temperature against ISO 1133 (the MFR standard) and MFR against ISO 75 (the HDT standard). The values themselves are plausible, the assigned test standards are not — they were therefore not imported for the affected rows. The sister sheet GreenTEC Pro assigns the same quantities correctly.") },

  { file: "greentec-pro", material: "greentec", name: "Extrudr GreenTEC Pro",
    props: { tensileStrengthXy: q(58, "MPa", { std: "ISO 527" }), tensileModulusXy: q(4300, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(2.8, "%", { std: "ISO 527" }), charpyNotchedXy: q(4, "kJ/m²", { std: "ISO 179/1eA" }),
      charpyUnnotchedXy: q(71, "kJ/m²", { std: "ISO 179/1eU" }), vicatA: q(160, "°C", { std: "ISO 306", conditions: WALL }),
      hdtB: q(115, "°C", { std: "ISO 75", conditions: WALL }), density: q(1.35, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }), bedTemperature: q(55, "°C", { min: 20, max: 90 }) },
    features: t("Bemerkenswert: 115 °C HDT/B ohne geschlossenen Bauraum und ohne gehärtete Düse. Damit erreicht ein Biopolymer eine Temperaturbeständigkeit, für die sonst PC mit beheizter Kammer nötig wäre — allerdings nur ab 4 mm Wanddicke geprüft.",
                "Notable: 115 °C HDT/B without an enclosure and without a hardened nozzle. A biopolymer reaching temperature resistance that otherwise requires PC with a heated chamber — but only verified from 4 mm wall thickness.") },

  { file: "greentec-pro-cf", material: "greentec", name: "Extrudr GreenTEC Pro CF",
    props: { tensileStrengthXy: q(65, "MPa", { std: "ISO 527" }), tensileModulusXy: q(7120, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(2.5, "%", { std: "ISO 527-2 (nominell)" }), charpyNotchedXy: q(4.6, "kJ/m²", { std: "ISO 179/1eA" }),
      charpyUnnotchedXy: q(82, "kJ/m²", { std: "ISO 179/1eU" }), vicatA: q(165, "°C", { std: "ISO 306", conditions: WALL }),
      hdtB: q(115, "°C", { std: "ISO 75", conditions: WALL }), density: q(1.2, "g/cm³", { std: "ISO 1183" }),
      nozzleTemperature: q(240, "°C", { min: 225, max: 250 }), bedTemperature: q(55, "°C", { min: 20, max: 90 }) },
    features: t("7120 MPa Zug-E-Modul ist der höchste Steifigkeitswert dieser Datenbank — aus einem Biopolymer, ohne beheizte Kammer. Der Preis ist Sprödigkeit: 2,5 % Bruchdehnung und 4,6 kJ/m² gekerbt.",
                "7120 MPa tensile modulus is the highest stiffness value in this database — from a biopolymer, without a heated chamber. The price is brittleness: 2.5 % elongation and 4.6 kJ/m² notched.") },

  /* ---------- Elastomere ---------- */
  { file: "flex-semisoft", material: "tpu-85a", name: "Extrudr Flex SemiSoft",
    props: { tensileModulusXy: q(42, "MPa", { std: "ISO 527-2/5A/500" }),
      elongationAtBreakXy: q(550, "%", { std: "ISO 527-2/5A/500 (max. Dehnung)" }),
      vicatA: q(98, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.18, "g/cm³", { std: "ISO 2781" }),
      hardnessShoreA: q(85, "Shore A", { std: "ISO 868" }), tearStrength: q(135, "kN/m", { std: "ISO 34-1B" }),
      abrasionLoss: q(25, "mm³", { std: "ISO 4649-A" }), glassTransition: q(-34, "°C"),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }), bedTemperature: q(70, "°C", { min: 50, max: 90 }) },
    features: t("Das weichste Elastomer dieser Datenbank: Shore A 85 bei 550 % Bruchdehnung. Glasübergang bei −34 °C, damit auch im Kalten noch elastisch. FDA-konform und permeabilitätsgeprüft.",
                "The softest elastomer in this database: Shore A 85 at 550 % elongation. Glass transition at −34 °C, so still elastic in the cold. FDA compliant and permeability tested.") },

  { file: "flex-medium", material: "tpu-98a", name: "Extrudr Flex Medium",
    props: { tensileModulusXy: q(40, "MPa", { std: "ISO 527-2/5A/500" }),
      elongationAtBreakXy: q(475, "%", { std: "ISO 527-2/5A/500 (max. Dehnung)" }),
      vicatA: q(110, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.19, "g/cm³", { std: "ISO 2781" }),
      hardnessShoreA: q(98, "Shore A", { std: "ISO 868" }), tearStrength: q(170, "kN/m", { std: "ISO 34-1B" }),
      abrasionLoss: q(25, "mm³", { std: "ISO 4649-A" }), glassTransition: q(-30, "°C"),
      nozzleTemperature: q(240, "°C", { min: 230, max: 250 }), bedTemperature: q(70, "°C", { min: 50, max: 90 }) },
    features: t("Das Datenblatt führt Gaspermeabilität für Luft, N2, O2, CO2 und N2O bei 25 und 60 °C auf — Angaben, die für Dichtungen und Bälge entscheidend sind und die sonst kein Hersteller dieser Datenbank veröffentlicht.",
                "The datasheet lists gas permeability for air, N2, O2, CO2 and N2O at 25 and 60 °C — figures that are decisive for seals and bellows and that no other manufacturer in this database publishes.") },

  { file: "flex-medium-matt", material: "tpu-98a", name: "Extrudr Flex Medium Matt",
    props: { density: q(1.19, "g/cm³", { std: "ISO 1183-1" }), hardnessShoreD: q(50, "Shore D", { std: "DIN ISO 7619-1" }),
      tearStrength: q(110, "kN/m", { std: "ISO 34-1" }), abrasionLoss: q(30, "mm³", { std: "ISO 4649, A" }),
      reboundResilience: q(33, "%", { std: "ISO 4662" }),
      compressionSet: q(24, "%", { std: "DIN ISO 815-1, 72 h bei 23 °C" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }), bedTemperature: q(50, "°C") },
    anomaly: t("Das Datenblatt nennt 6,9 % Bruchdehnung und gleichzeitig eine Spannung bei 300 % Dehnung. Beides kann nicht zutreffen — ein Werkstoff, der bei 6,9 % bricht, erreicht keine 300 %. Zusätzlich steht die Zugfestigkeit mit 470 N/mm², was für ein Elastomer um eine Größenordnung zu hoch ist. Beide Werte wurden nicht übernommen; die übrigen Kennwerte des Blattes sind in sich stimmig.",
               "The datasheet states 6.9 % elongation at break and at the same time a stress at 300 % strain. Both cannot hold — a material that breaks at 6.9 % never reaches 300 %. In addition tensile strength is given as 470 N/mm², an order of magnitude too high for an elastomer. Neither value was imported; the remaining values on the sheet are internally consistent.") },

  { file: "flex-medium-esd", material: "tpu-esd", name: "Extrudr Flex Medium ESD",
    props: { tensileStrengthXy: q(40, "MPa", { std: "DIN 53.504" }), elongationAtBreakXy: q(430, "%", { std: "DIN 53.504" }),
      density: q(1.2, "g/cm³", { std: "DIN 53.479" }), hardnessShoreA: q(95, "Shore A", { std: "DIN 53.505" }),
      tearStrength: q(110, "kN/m", { std: "DIN 53.515" }), abrasionLoss: q(28, "mm³", { std: "DIN 53.516" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }), bedTemperature: q(50, "°C") },
    features: t("Echter ESD-Schutz statt Kohlenstofffaser-Mythos: 0,7–0,9 MΩ Oberflächenwiderstand, Einstufung ESD-C leitfähig. Zusätzlich beständig gegen Öle, Benzine, Ester, Ketone und Chlorkohlenwasserstoffe sowie UV-beständig. Druckt langsam (max. 50 mm/s), braucht aber weder Kammer noch gehärtete Düse.",
                "Genuine ESD protection rather than the carbon-fibre myth: 0.7–0.9 MΩ surface resistance, classified ESD-C conductive. Also resistant to oils, petrol, esters, ketones and chlorinated hydrocarbons, and UV stable. Prints slowly (max 50 mm/s) but needs neither enclosure nor hardened nozzle.") },

  { file: "flex-hard", material: "tpu-58d", name: "Extrudr Flex Hard",
    props: { tensileModulusXy: q(40, "MPa", { std: "ISO 527-2/5A/500" }),
      elongationAtBreakXy: q(490, "%", { std: "ISO 527-2/5A/500 (max. Dehnung)" }),
      vicatA: q(140, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.2, "g/cm³", { std: "ISO 2781" }),
      hardnessShoreD: q(58, "Shore D", { std: "ISO 868" }), tearStrength: q(175, "kN/m", { std: "ISO 34-1B" }),
      abrasionLoss: q(26, "mm³", { std: "ISO 4649-A" }), glassTransition: q(-24, "°C"),
      nozzleTemperature: q(245, "°C", { min: 230, max: 260 }), bedTemperature: q(70, "°C", { min: 50, max: 90 }) },
    features: t("Vicat 140 °C bei einem Elastomer — das ist der höchste Wert der Flex-Familie und liegt über dem, was PLA, PETG oder ABS erreichen. Shore D 58 macht daraus einen halbharten Konstruktionswerkstoff statt eines Gummis.",
                "Vicat 140 °C for an elastomer — the highest value in the Flex family and above what PLA, PETG or ABS reach. Shore D 58 makes it a semi-rigid structural material rather than a rubber.") },

  { file: "flex-hard-cf", material: "tpu-58d", name: "Extrudr Flex Hard CF",
    props: { tensileModulusXy: q(35, "MPa", { std: "ISO 527-2/5A/500" }),
      elongationAtBreakXy: q(380, "%", { std: "ISO 527-2/5A/500 (max. Dehnung)" }),
      vicatA: q(140, "°C", { std: "ISO 306", conditions: WALL }), density: q(1.22, "g/cm³", { std: "ISO 2781" }),
      hardnessShoreD: q(70, "Shore D", { std: "ISO 868" }), tearStrength: q(165, "kN/m", { std: "ISO 34-1B" }),
      abrasionLoss: q(26, "mm³", { std: "ISO 4649-A" }), glassTransition: q(-24, "°C"),
      nozzleTemperature: q(245, "°C", { min: 230, max: 260 }), bedTemperature: q(70, "°C", { min: 50, max: 90 }) },
    features: t("Shore D 70 ist das härteste Elastomer dieser Datenbank. Anders als bei den meisten CF-Varianten sind die Werte hier eigenständig geprüft — und zwar erkennbar an der Richtung, in die sie gehen: Gegenüber dem ungefüllten Flex Hard steigen Härte (58 → 70 Shore D), Dichte (1,20 → 1,22 g/cm³) und Druckfestigkeit (40 → 50 MPa), während ALLE Zuggrößen fallen — E-Modul 40 → 35 MPa, Spannung bei 50, 100 und 300 % Dehnung ebenso, Bruchdehnung 490 → 380 %, Reißfestigkeit 175 → 165 kN/m. Das ist kein übernommenes Blatt, sondern das erwartbare Verhalten kurzer Fasern in einer weichen Matrix: Unter Druck versteifen sie, unter Zug wirken sie als Kerbstellen. Wer ein Bauteil auf Zug auslegt, gewinnt mit dieser CF-Variante nichts.",
                "Shore D 70 is the hardest elastomer in this database. Unlike most CF grades these values were separately tested — recognisably so from the direction they take: against the unfilled Flex Hard, hardness (58 → 70 Shore D), density (1.20 → 1.22 g/cm³) and compressive strength (40 → 50 MPa) rise, while EVERY tensile quantity falls — modulus 40 → 35 MPa, stress at 50, 100 and 300 % elongation likewise, elongation at break 490 → 380 %, tear strength 175 → 165 kN/m. That is not a borrowed table but the expected behaviour of short fibres in a soft matrix: under compression they stiffen, under tension they act as notches. Anyone designing a part for tensile load gains nothing from this CF grade.") },
];

/* =========================================================== NEUE TYPEN ==== */
/* Nur dort, wo es bisher gar keinen generischen Werkstofftyp gab. */

const NEW_MATERIALS = {
  "pc-fr": {
    name: "PC-FR", family: "PC", polymerClass: "amorphous", variant: ["FR"],
    aliases: ["PC flammhemmend", "Flame Retardant Polycarbonate", "PC V-0", "DuraPro PC-FR"],
    abstract: t("PC-FR ist flammgeschütztes Polycarbonat und der einzige Werkstoff dieser Datenbank mit echtem Brandschutzzeugnis: UL94 V-0 bei 1,5 mm und EN 45545-2 HL3 für den Schienenfahrzeugbau. Für Elektronikgehäuse, Bahn- und Schaltschrankanwendungen. Grenzen: teuer, braucht eine beheizte Kammer und muss trocken verarbeitet werden.",
                "PC-FR is flame-retardant polycarbonate and the only material in this database with a genuine fire certificate: UL94 V-0 at 1.5 mm and EN 45545-2 HL3 for rail vehicles. For electronics enclosures, rail and switchgear applications. Limits: expensive, needs a heated chamber and must be processed dry."),
    positioning: t("Wenn ein Prüfzeugnis gefordert ist und nicht nur ein gutes Gefühl.",
                   "When a test certificate is required, not just a good feeling."),
    tensile: 53, modulus: 2650, elong: 50, izod: 40, vicat: 115, hdtA: 98, hdtB: 106, density: 1.19,
    nozzle: [260, 290], bed: [105, 115], chamber: "mandatory", dry: [90, 8],
    ul94: "V-0", ul94Thickness: 1.5, en45545: "HL3",
    ratings: { printability: 2, warpingTendency: 4, hygroscopy: 5, abrasiveness: 1, toughness: 4,
      notchSensitivity: 3, uvResistance: 2, weatherResistance: 2, surfaceQuality: 3, paintAdhesion: 3,
      bondability: 4, priceIndex: 5, availability: 2, smallSeriesSuitability: 3 },
  },
  "pc-pbt": {
    name: "PC-PBT", family: "PC", polymerClass: "amorphous", variant: ["blend"],
    aliases: ["PC/PBT", "Polycarbonat-Polybutylenterephthalat-Blend", "DuraPro PC-PBT", "Xenoy"],
    abstract: t("PC-PBT ist ein Blend aus Polycarbonat und PBT: die Zähigkeit des PC mit der Chemikalien- und Kraftstoffbeständigkeit des Polyesters. 60 kJ/m² Kerbschlagzähigkeit bei über 50 % Bruchdehnung und CTI 600 V. Für Gehäuse im Maschinen- und Fahrzeugumfeld, wo Öle und Kraftstoffe im Spiel sind. Grenzen: braucht Kammer und Trocknung, kein Brandschutzzeugnis über UL94 HB hinaus.",
                "PC-PBT is a blend of polycarbonate and PBT: the toughness of PC with the chemical and fuel resistance of the polyester. 60 kJ/m² notched impact at over 50 % elongation and CTI 600 V. For housings in machinery and vehicle environments where oils and fuels are involved. Limits: needs a chamber and drying, no fire certification beyond UL94 HB."),
    positioning: t("Polycarbonat für die Fälle, in denen reines PC an Öl und Kraftstoff scheitert.",
                   "Polycarbonate for the cases where pure PC fails against oil and fuel."),
    tensile: 60, modulus: 2200, elong: 50, izod: 50, vicat: 126, hdtA: 85, hdtB: 110, density: 1.2,
    nozzle: [260, 290], bed: [105, 115], chamber: "mandatory", dry: [90, 8],
    ul94: "HB",
    ratings: { printability: 2, warpingTendency: 4, hygroscopy: 5, abrasiveness: 1, toughness: 5,
      notchSensitivity: 2, uvResistance: 2, weatherResistance: 3, surfaceQuality: 3, paintAdhesion: 3,
      bondability: 4, priceIndex: 5, availability: 2, smallSeriesSuitability: 2 },
  },
  "pctg": {
    name: "PCTG", family: "PET", polymerClass: "amorphous", variant: ["basic"],
    aliases: ["Polycyclohexylendimethylenterephthalat-Glykol", "PCT-G", "Tritan-ähnlich"],
    abstract: t("PCTG ist der zähe Bruder des PETG: 215 % Bruchdehnung und 94 kJ/m² Kerbschlagzähigkeit gegen 4,7 kJ/m² bei PETG, bei ähnlicher Verarbeitbarkeit und UL94 V-2. Für Schutzabdeckungen, Sichtteile und alles, was einen Sturz überstehen soll. Grenzen: weicher als PETG (1650 statt 2100 MPa Biegemodul) und nicht temperaturbeständiger.",
                "PCTG is the tough sibling of PETG: 215 % elongation and 94 kJ/m² notched impact against 4.7 kJ/m² for PETG, at similar processability and UL94 V-2. For protective covers, visible parts and anything that has to survive a drop. Limits: softer than PETG (1650 instead of 2100 MPa flexural modulus) and no more heat resistant."),
    positioning: t("PETG, wenn es nicht splittern darf.", "PETG for when it must not shatter."),
    tensile: 43, modulus: 1650, elong: 215, izod: 94, vicat: 88, hdtB: 76, density: 1.23,
    nozzle: [230, 270], bed: [90, 110], chamber: "not-required", dry: [65, 6],
    ul94: "V-2", ul94Thickness: 3.2,
    ratings: { printability: 4, warpingTendency: 2, hygroscopy: 3, abrasiveness: 1, stringingTendency: 4,
      toughness: 5, notchSensitivity: 1, uvResistance: 3, weatherResistance: 3, surfaceQuality: 4,
      paintAdhesion: 2, bondability: 3, priceIndex: 3, availability: 3, smallSeriesSuitability: 4 },
  },
  "pa12": {
    name: "PA12", family: "PA", polymerClass: "semi-crystalline", variant: ["basic"],
    aliases: ["Polyamid 12", "Nylon 12", "PA 12"],
    abstract: t("PA12 ist das zähste und feuchteunempfindlichste der gängigen Polyamide: über 50 % Bruchdehnung, Vicat 142 °C und deutlich geringere Wasseraufnahme als PA6. Für Funktionsteile, Schnappverbindungen und Gleitelemente. Grenzen: geringere Festigkeit und Steifigkeit als faserverstärkte Typen, braucht Kammer und Trocknung.",
                "PA12 is the toughest and least moisture-sensitive of the common polyamides: over 50 % elongation at break, Vicat 142 °C and markedly lower water uptake than PA6. For functional parts, snap fits and sliding elements. Limits: lower strength and stiffness than fibre-filled grades, needs a chamber and drying."),
    positioning: t("Zäh statt steif — und deutlich gutmütiger bei Feuchte als PA6.",
                   "Tough rather than stiff — and far more forgiving about moisture than PA6."),
    tensile: 43, modulus: 1440, elong: 50, vicat: 142, hdtA: 55, hdtB: 135, density: 1.01,
    nozzle: [260, 290], bed: [105, 115], chamber: "mandatory", dry: [80, 8],
    ul94: "HB",
    ratings: { printability: 2, warpingTendency: 3, hygroscopy: 4, abrasiveness: 1, toughness: 5,
      creepTendency: 3, notchSensitivity: 1, wearResistance: 5, uvResistance: 2, weatherResistance: 3,
      hydrolysisResistance: 4, surfaceQuality: 3, paintAdhesion: 1, bondability: 2,
      priceIndex: 4, availability: 3, smallSeriesSuitability: 3 },
  },
  "pa12-cf": {
    name: "PA12-CF", family: "PA", polymerClass: "semi-crystalline", variant: ["CF"],
    aliases: ["Polyamid 12 carbonfaserverstärkt", "Nylon 12 CF", "PA12 CF"],
    abstract: t("PA12-CF verbindet, was sich sonst ausschließt: 2820 MPa Steifigkeit und trotzdem über 35 % Bruchdehnung, im ungekerbten Schlagversuch kein Bruch bis −30 °C. Für dauerbelastete Funktionsteile, die auch im Kalten nicht spröde werden dürfen. Grenzen: abrasiv (gehärtete Düse ab 0,6 mm), Kammer und Trocknung nötig.",
                "PA12-CF combines what is normally mutually exclusive: 2820 MPa stiffness and still over 35 % elongation, with no break in the unnotched impact test down to −30 °C. For continuously loaded functional parts that must not turn brittle in the cold. Limits: abrasive (hardened nozzle from 0.6 mm), chamber and drying required."),
    positioning: t("Faserverstärkt, ohne die Zähigkeit zu verlieren.", "Fibre reinforced without losing toughness."),
    tensile: 60.4, modulus: 2820, elong: 35, vicat: 145, hdtA: 58, hdtB: 139, density: 1.03,
    nozzle: [260, 290], bed: [105, 115], chamber: "mandatory", dry: [80, 8], abrasive: true,
    ul94: "HB",
    ratings: { printability: 2, warpingTendency: 3, hygroscopy: 4, abrasiveness: 4, toughness: 5,
      creepTendency: 2, notchSensitivity: 2, wearResistance: 5, uvResistance: 2, weatherResistance: 3,
      hydrolysisResistance: 4, surfaceQuality: 3, paintAdhesion: 1, bondability: 2,
      priceIndex: 5, availability: 2, smallSeriesSuitability: 2 },
  },
  "pa6-gf": {
    name: "PA6-GF", family: "PA", polymerClass: "semi-crystalline", variant: ["GF"],
    aliases: ["Polyamid 6 glasfaserverstärkt", "Nylon 6 GF", "PA6 GF"],
    abstract: t("PA6-GF ist der Temperaturspitzenreiter dieser Datenbank: 210 °C HDT/B bei 0,45 MPa Last. Bei 1,8 MPa bleiben davon 95 °C — die Spreizung ist bei teilkristallinen Polyamiden systembedingt gross. Für heisse, steife Funktionsteile. Grenzen: stark hygroskopisch, abrasiv, spröde (3,8 % Bruchdehnung), Kammer zwingend.",
                "PA6-GF is the temperature leader of this database: 210 °C HDT/B at 0.45 MPa load. At 1.8 MPa only 95 °C remains — the spread is inherently large for semi-crystalline polyamides. For hot, stiff functional parts. Limits: strongly hygroscopic, abrasive, brittle (3.8 % elongation), chamber mandatory."),
    positioning: t("Die höchste Wärmeformbeständigkeit im Feld — mit allen Polyamid-Nachteilen.",
                   "The highest heat deflection temperature in the field — with all the polyamide drawbacks."),
    tensile: 55, modulus: 2400, elong: 3.8, izod: 5.2, hdtA: 95, hdtB: 210, density: 1.21,
    nozzle: [270, 300], bed: [80, 100], chamber: "mandatory", dry: [80, 12], abrasive: true,
    ratings: { printability: 1, warpingTendency: 5, hygroscopy: 5, abrasiveness: 4, toughness: 2,
      creepTendency: 2, notchSensitivity: 4, wearResistance: 4, uvResistance: 2, weatherResistance: 2,
      hydrolysisResistance: 2, surfaceQuality: 2, paintAdhesion: 1, bondability: 2,
      priceIndex: 4, availability: 2, smallSeriesSuitability: 2 },
  },
  "pla-tough": {
    name: "PLA-Tough", family: "PLA", polymerClass: "semi-crystalline", variant: ["tough"],
    aliases: ["Zäh-PLA", "PLA Tough", "schlagzähmodifiziertes PLA", "Tough PLA"],
    abstract: t("PLA-Tough ist schlagzähmodifiziertes PLA, das im Zugversuch nicht spröde bricht, und der Werkstoff mit dem grössten Temper-Gewinn dieser Datenbank: Vicat springt von 65 °C auf über 150 °C. Für Funktionsteile, die die Einfachheit von PLA behalten sollen, aber nicht splittern dürfen. Grenzen: der hohe Temperaturwert setzt einen Temperofen voraus, ungetempert bleibt es ein 65-°C-Werkstoff.",
                "PLA-Tough is impact-modified PLA that does not fracture brittly in the tensile test, and the material with the largest annealing gain in this database: Vicat jumps from 65 °C to over 150 °C. For functional parts that should keep the simplicity of PLA but must not shatter. Limits: the high temperature figure requires an annealing oven; unannealed it remains a 65 °C material."),
    positioning: t("PLA ohne den Sprödbruch — und mit PC-Temperaturen, wenn ein Temperofen da ist.",
                   "PLA without the brittle fracture — and with PC temperatures if an annealing oven is available."),
    tensile: 56.9, modulus: 3200, elong: 14, vicat: 65, density: 1.2,
    nozzle: [200, 230], bed: [20, 60], chamber: "not-required", dry: [55, 4],
    anneal: { temp: 100, hours: 4, requiredForValues: false, gain: 85,
      note: t("Das Datenblatt nennt die Vicat-Erweichungstemperatur zweimal: 65 °C im Auslieferungszustand und über 150 °C getempert. Das ist der grösste Temper-Gewinn dieser Datenbank. Die Kennwerte gelten auch ungetempert — ein Temperofen ist also nicht Pflicht, verschiebt den Werkstoff aber in eine andere Temperaturklasse. Temperatur und Dauer sind hier fachlich abgeleitet; das Datenblatt nennt sie nicht.",
              "The datasheet states the Vicat softening temperature twice: 65 °C as supplied and over 150 °C annealed. That is the largest annealing gain in this database. The values also apply unannealed — an annealing oven is therefore not mandatory, but it moves the material into a different temperature class. Temperature and duration are inferred here; the datasheet does not state them.") },
    ratings: { printability: 5, warpingTendency: 1, hygroscopy: 2, abrasiveness: 1, stringingTendency: 2,
      toughness: 4, notchSensitivity: 2, creepTendency: 4, uvResistance: 2, weatherResistance: 2,
      surfaceQuality: 5, paintAdhesion: 4, bondability: 4, priceIndex: 3, availability: 3,
      smallSeriesSuitability: 5 },
    bio: 100,
  },
  "tpu-esd": {
    name: "TPU-ESD", family: "TPU", polymerClass: "elastomer", variant: ["flexible", "ESD", "conductive"],
    aliases: ["ESD-TPU", "leitfähiges TPU", "Flex ESD", "TPU antistatisch"],
    abstract: t("TPU-ESD ist gummielastisches TPU mit echtem elektrostatischem Schutz: 0,7–0,9 MΩ Oberflächenwiderstand, Einstufung ESD-C leitfähig. Für Griffe, Auflagen und Handhabungsteile in der Elektronikfertigung und im Automobil-Innenraum. Grenzen: kein Konstruktionswerkstoff, keine sinnvolle Wärmeformbeständigkeit, druckt langsam.",
                "TPU-ESD is rubber-elastic TPU with genuine electrostatic protection: 0.7–0.9 MΩ surface resistance, classified ESD-C conductive. For grips, pads and handling parts in electronics manufacturing and automotive interiors. Limits: not a structural material, no meaningful heat resistance, prints slowly."),
    positioning: t("Der Werkstoff, wenn es nachgeben UND ableiten muss.",
                   "The material when it has to give way AND dissipate."),
    tensile: 40, elong: 430, density: 1.2, shoreA: 95,
    nozzle: [220, 250], bed: [45, 55], chamber: "not-required", dry: [60, 6],
    esd: "conductive", esdOhm: 800000,
    ratings: { printability: 2, warpingTendency: 1, hygroscopy: 4, abrasiveness: 1, stringingTendency: 5,
      toughness: 5, wearResistance: 5, fatigueResistance: 5, uvResistance: 4, weatherResistance: 4,
      hydrolysisResistance: 3, surfaceQuality: 3, paintAdhesion: 1, bondability: 3,
      priceIndex: 5, availability: 2, smallSeriesSuitability: 2 },
  },
  "tpu-85a": {
    name: "TPU 85A", family: "TPU", polymerClass: "elastomer", variant: ["flexible"],
    aliases: ["weiches TPU", "Flex SemiSoft", "TPU Shore A 85", "TPE 85A"],
    abstract: t("TPU 85A ist das weichste Elastomer dieser Datenbank: 550 % Bruchdehnung, Glasübergang bei −34 °C und damit auch im Kalten noch nachgiebig. Für Dichtungen, Dämpfer und Greifer. Grenzen: sehr langsam zu drucken, Direktextruder praktisch zwingend, kein Konstruktionswerkstoff.",
                "TPU 85A is the softest elastomer in this database: 550 % elongation, glass transition at −34 °C and therefore still compliant in the cold. For seals, dampers and grippers. Limits: very slow to print, a direct extruder is practically mandatory, not a structural material."),
    positioning: t("Wenn es weich sein muss und auch bei Kälte weich bleiben soll.",
                   "When it has to be soft and stay soft in the cold."),
    tensile: 22, elong: 550, vicat: 98, density: 1.18, shoreA: 85,
    nozzle: [220, 250], bed: [50, 90], chamber: "not-required", dry: [60, 6],
    ratings: { printability: 1, warpingTendency: 1, hygroscopy: 4, abrasiveness: 1, stringingTendency: 5,
      toughness: 5, wearResistance: 4, fatigueResistance: 5, uvResistance: 3, weatherResistance: 3,
      hydrolysisResistance: 3, surfaceQuality: 3, paintAdhesion: 1, bondability: 3,
      priceIndex: 4, availability: 3, smallSeriesSuitability: 2 },
  },
  "tpu-98a": {
    name: "TPU 98A", family: "TPU", polymerClass: "elastomer", variant: ["flexible"],
    aliases: ["Flex Medium", "TPU Shore A 98", "hartes TPU"],
    abstract: t("TPU 98A ist der Kompromisspunkt der Elastomere: noch elastisch mit 475 % Bruchdehnung, aber hart genug, um auf Bowden-Systemen verarbeitbar zu bleiben. Vicat 110 °C. Für Rollen, Puffer, Schutzhüllen und Dichtungen mit Formstabilität. Das Datenblatt führt zudem Gaspermeabilität auf, was für Bälge und Dichtungen entscheidend ist.",
                "TPU 98A is the compromise point among elastomers: still elastic at 475 % elongation, but hard enough to remain processable on Bowden systems. Vicat 110 °C. For rollers, buffers, protective sleeves and dimensionally stable seals. The datasheet also lists gas permeability, decisive for bellows and seals."),
    positioning: t("Das Elastomer, das man auch ohne Direktextruder noch verarbeitet bekommt.",
                   "The elastomer you can still process without a direct drive extruder."),
    tensile: 30, elong: 475, vicat: 110, density: 1.19, shoreA: 98,
    nozzle: [230, 250], bed: [50, 90], chamber: "not-required", dry: [60, 6],
    ratings: { printability: 2, warpingTendency: 1, hygroscopy: 4, abrasiveness: 1, stringingTendency: 5,
      toughness: 5, wearResistance: 5, fatigueResistance: 5, uvResistance: 3, weatherResistance: 3,
      hydrolysisResistance: 3, surfaceQuality: 3, paintAdhesion: 1, bondability: 3,
      priceIndex: 4, availability: 4, smallSeriesSuitability: 3 },
  },
  "tpu-58d": {
    name: "TPU 58D", family: "TPU", polymerClass: "elastomer", variant: ["semi-rigid"],
    aliases: ["Flex Hard", "TPU Shore D 58", "halbhartes TPU", "TPE-U hart"],
    abstract: t("TPU 58D ist kein Gummi mehr, sondern ein halbharter Konstruktionswerkstoff: Shore D 58 bei 490 % Bruchdehnung und Vicat 140 °C — der höchste Vicat-Wert unter den Elastomeren und höher als bei PLA, PETG oder ABS. Für Zahnräder, Rollen, Stossfänger und alles, was nachgeben soll, ohne die Form zu verlieren. Grenzen: langsam zu drucken, hygroskopisch.",
                "TPU 58D is no longer a rubber but a semi-rigid structural material: Shore D 58 at 490 % elongation and Vicat 140 °C — the highest Vicat among the elastomers and above PLA, PETG or ABS. For gears, rollers, bumpers and anything that should give without losing its shape. Limits: slow to print, hygroscopic."),
    positioning: t("Zäh wie Gummi, formstabil wie ein Konstruktionskunststoff.",
                   "Tough as rubber, dimensionally stable as an engineering plastic."),
    tensile: 40, elong: 490, vicat: 140, density: 1.2, shoreD: 58,
    nozzle: [230, 260], bed: [50, 90], chamber: "not-required", dry: [65, 6],
    ratings: { printability: 2, warpingTendency: 1, hygroscopy: 4, abrasiveness: 1, stringingTendency: 4,
      toughness: 5, wearResistance: 5, fatigueResistance: 5, uvResistance: 3, weatherResistance: 3,
      hydrolysisResistance: 3, surfaceQuality: 3, paintAdhesion: 2, bondability: 3,
      priceIndex: 4, availability: 3, smallSeriesSuitability: 3 },
  },
  "greentec": {
    name: "GreenTEC", family: "PHA", polymerClass: "semi-crystalline", variant: ["bio-blend", "high-temp"],
    aliases: ["GreenTEC Pro", "Biopolymer-Compound", "Hochtemperatur-Biopolymer"],
    abstract: t("GreenTEC ist ein Biopolymer-Compound, das ohne beheizte Kammer und ohne gehärtete Düse bis 115 °C HDT/B kommt — eine Temperaturbeständigkeit, für die sonst PC mit Kammer nötig wäre. Für Gehäuse und Funktionsteile mit moderater Wärmebelastung. Grenzen: spröde (2,8 % Bruchdehnung bei der Pro-Variante), und die Temperaturwerte sind erst ab 4 mm Wanddicke geprüft.",
                "GreenTEC is a biopolymer compound reaching 115 °C HDT/B without a heated chamber and without a hardened nozzle — heat resistance that otherwise requires PC with an enclosure. For housings and functional parts under moderate heat. Limits: brittle (2.8 % elongation in the Pro grade), and the temperature values are only verified from 4 mm wall thickness."),
    positioning: t("Temperaturbeständigkeit ohne Kammer — der bequemste Weg über die 100-°C-Marke.",
                   "Heat resistance without an enclosure — the most convenient way past the 100 °C mark."),
    tensile: 58, modulus: 4300, elong: 2.8, izod: 4, vicat: 160, hdtB: 115, density: 1.35,
    nozzle: [210, 230], bed: [20, 90], chamber: "not-required", dry: [60, 6],
    ratings: { printability: 4, warpingTendency: 2, hygroscopy: 3, abrasiveness: 2, toughness: 2,
      notchSensitivity: 4, uvResistance: 3, weatherResistance: 3, surfaceQuality: 4, paintAdhesion: 3,
      bondability: 3, priceIndex: 4, availability: 3, smallSeriesSuitability: 3 },
    bio: 100,
  },
};

/* ============================================================== schreiben === */

const SRC_ID = "src_extrudr_tds";
const outP = path.join(ROOT, "data/products");
const outM = path.join(ROOT, "data/materials");
mkdirSync(outP, { recursive: true });

const src = (name, file) => ({
  id: SRC_ID, type: "manufacturer-tds", publisher: "FD3D GmbH (Extrudr)",
  productName: name, title: `${name} — Technisches Datenblatt (DE)`,
  url: `${TDS}/${file}-TDS-de.pdf`, retrievedAt: RETRIEVED, confidenceCeiling: "high",
  note: t("Herstellerdatenblatt. Das Ceiling steht auf 'high', weil ZERTIFIZIERUNGEN (UL94, EN 45545) entweder erteilt sind oder nicht - da gibt es keine Prüfkörper-Mehrdeutigkeit. Die MECHANISCHEN Werte tragen dagegen einzeln nur 'medium', weil Extrudr nicht deklariert, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde. Temperaturwerte gelten laut Fussnote erst ab 4 mm Wanddicke.",
          "Manufacturer datasheet. The ceiling is 'high' because CERTIFICATIONS (UL94, EN 45545) are either granted or not - no specimen ambiguity applies. The MECHANICAL values individually carry only 'medium' because Extrudr does not declare whether they were measured on printed or moulded specimens. Temperature values apply only from 4 mm wall thickness per the footnote."),
});

const SPECIMEN_NOTE = t(
  "Extrudr deklariert nicht, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde. Nominelle Bruchdehnungen über 10 % deuten auf Rohstoffwerte hin. Temperaturwerte laut Fussnote erst ab 4 mm Wanddicke geprüft.",
  "Extrudr does not declare whether values were measured on printed or moulded specimens. Nominal elongations above 10 % suggest raw-material values. Temperature values verified only from 4 mm wall thickness per the footnote.");

const withAnomaly = (a) => a
  ? t(`${SPECIMEN_NOTE.de}\n\nBefund zu diesem Datenblatt: ${a.de}`,
      `${SPECIMEN_NOTE.en}\n\nFinding on this datasheet: ${a.en}`)
  : SPECIMEN_NOTE;

let np = 0, na = 0;
for (const p of P) {
  const props = Object.fromEntries(Object.entries(p.props).map(([k, v]) => [k, { ...v, source: "src_tds" }]));
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: `extrudr-${p.file}`, materialId: p.material,
    brand: "Extrudr", manufacturer: "FD3D GmbH (Extrudr)", productName: p.name, origin: "Österreich",
    specimenType: "undeclared",
    specimenNote: withAnomaly(p.anomaly),
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technisches Datenblatt (DE)`, url: `${TDS}/${p.file}-TDS-de.pdf`, retrievedAt: RETRIEVED },
    productUrl: "https://extrudr.com/de/de/page/downloads-for-resellers/",
    properties: props,
    governance: { lastReviewed: RETRIEVED, reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)", sources: [{ ...src(p.name, p.file), id: "src_tds" }] },
  };
  writeFileSync(path.join(outP, `${rec.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  np++;
  if (p.anomaly) na++;
}
console.log(`${np} Extrudr-Produkte geschrieben (${na} mit dokumentiertem Datenblatt-Befund)`);

let nm = 0;
for (const [id, m] of Object.entries(NEW_MATERIALS)) {
  const mech = {};
  if (m.density) mech.density = q(m.density, "g/cm³", { std: "ISO 1183", source: SRC_ID });
  if (m.tensile) mech.tensileStrengthXy = q(m.tensile, "MPa", { std: "ISO 527 bzw. ASTM D638", orientation: "n/a", source: SRC_ID });
  if (m.modulus) mech.tensileModulusXy = q(m.modulus, "MPa", { std: "ISO 527", orientation: "n/a", source: SRC_ID });
  if (m.elong) mech.elongationAtBreakXy = q(m.elong, "%", { std: "ISO 527 (nominell)", orientation: "n/a", source: SRC_ID });
  if (m.izod) mech.izodNotchedXy = q(m.izod, "kJ/m²", { std: "ISO 180/A", orientation: "n/a", source: SRC_ID });
  if (m.shoreD) mech.hardnessShoreD = q(m.shoreD, "Shore D", { std: "ISO 868", source: SRC_ID });
  if (m.shoreA) mech.hardnessShoreD = q(Math.round(m.shoreA * 0.55), "Shore D", { source: "estimate_reasoning", confidence: "estimated",
    note: t(`Umgerechnet aus Shore A ${m.shoreA} — Shore D ist bei sehr weichen Elastomeren nur eine grobe Näherung.`,
            `Converted from Shore A ${m.shoreA} — Shore D is only a rough approximation for very soft elastomers.`) });
  for (const [s, v] of Object.entries(m.ratings ?? {})) {
    if (["toughness", "creepTendency", "notchSensitivity", "wearResistance", "fatigueResistance"].includes(s)) mech[s] = rating(v, s);
  }

  const thermal = {};
  if (m.hdtA) thermal.hdtA = q(m.hdtA, "°C", { std: "ISO 75, 1.8 MPa", conditions: WALL, source: SRC_ID });
  if (m.hdtB) thermal.hdtB = q(m.hdtB, "°C", { std: "ISO 75, 0.45 MPa", conditions: WALL, source: SRC_ID });
  if (m.vicat) thermal.vicatB50 = q(m.vicat, "°C", { std: "ISO 306", conditions: WALL, source: SRC_ID });
  if (m.anneal) thermal.annealing = {
    possible: flag(true, { source: SRC_ID, confidence: "high" }),
    /* false = die Kennwerte gelten auch ungetempert. Beim PET-CF von Bambu steht hier true. */
    requiredForDatasheetValues: flag(m.anneal.requiredForValues, { source: SRC_ID, confidence: "high" }),
    temperature: q(m.anneal.temp, "°C", { source: "estimate_reasoning", confidence: "estimated" }),
    duration: q(m.anneal.hours, "h", { source: "estimate_reasoning", confidence: "estimated" }),
    hdtGain: q(m.anneal.gain, "°C", { source: SRC_ID, confidence: "medium" }),
    note: m.anneal.note,
  };
  const base = m.hdtA ?? m.hdtB ?? m.vicat;
  if (base) thermal.recommendedMaxServiceTemperature = q(Math.round((base - 25) / 5) * 5, "°C", {
    conditions: "dauerhaft unter mechanischer Last, Luft", source: "estimate_reasoning", confidence: "estimated",
    note: t("Eigene konservative Empfehlung mit Abstand zur Erweichungsgrenze. Bei teilkristallinen Polyamiden bewusst an HDT-A (1,8 MPa) orientiert, nicht am deutlich höheren HDT-B.",
            "Our own conservative recommendation with margin to the softening limit. For semi-crystalline polyamides deliberately based on HDT-A (1.8 MPa) rather than the much higher HDT-B.") });

  const processing = {
    nozzleTemperature: q(Math.round((m.nozzle[0] + m.nozzle[1]) / 2), "°C", { min: m.nozzle[0], max: m.nozzle[1], source: SRC_ID }),
    bedTemperature: q(Math.round((m.bed[0] + m.bed[1]) / 2), "°C", { min: m.bed[0], max: m.bed[1], source: SRC_ID }),
    chamberRequirement: choice(m.chamber, { source: SRC_ID, confidence: "medium" }),
    dryingTemperature: q(m.dry[0], "°C", { source: "estimate_reasoning", confidence: "estimated" }),
    dryingTime: q(m.dry[1], "h", { source: "estimate_reasoning", confidence: "estimated" }),
  };
  for (const s of ["printability", "warpingTendency", "hygroscopy", "abrasiveness", "stringingTendency"]) {
    if (m.ratings?.[s] != null) processing[s] = rating(m.ratings[s], s);
  }

  const durability = {};
  for (const s of ["uvResistance", "weatherResistance", "hydrolysisResistance"]) {
    if (m.ratings?.[s] != null) durability[s] = rating(m.ratings[s], s);
  }
  durability.chemicalResistance = [
    { chemicalId: "chem_water", rating: "resistant", source: "estimate_reasoning", confidence: "estimated" },
    { chemicalId: "chem_mineral_oil",
      rating: id === "tpu-esd" || id === "pc-pbt" ? "resistant" : "limited",
      source: id === "tpu-esd" || id === "pc-pbt" ? SRC_ID : "estimate_reasoning",
      confidence: id === "tpu-esd" || id === "pc-pbt" ? "medium" : "estimated" },
  ];

  const compliance = {
    foodContact: {
      status: choice("not-declared", { source: SRC_ID, confidence: "medium" }),
      partLevelWarning: t("Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen.",
                          "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches."),
    },
    flameRetardancy: {
      ul94: choice(m.ul94 ?? "not-classified", { source: m.ul94 ? SRC_ID : "estimate_reasoning", confidence: m.ul94 ? "high" : "estimated",
        note: m.ul94 === "V-0" ? t("Geprüft und zertifiziert: V-0 bei 1,5 mm, 5VB bei 2,0 mm, 5VA bei 3,0 mm.",
                                   "Tested and certified: V-0 at 1.5 mm, 5VB at 2.0 mm, 5VA at 3.0 mm.") : undefined }),
      ...(m.ul94Thickness ? { ul94ThicknessMm: q(m.ul94Thickness, "mm", { source: SRC_ID, confidence: "high" }) } : {}),
      ...(m.en45545 ? { en45545: choice(m.en45545, { source: SRC_ID, confidence: "high",
        note: t("Bahnzertifiziert nach EN 45545-2 HL3 für die Anforderungen R22, R23 und R24 bei 1,5 bis 3 mm.",
                "Rail certified to EN 45545-2 HL3 for requirements R22, R23 and R24 at 1.5 to 3 mm.") }) } : {}),
    },
    ...(m.esd ? { esd: {
      classification: choice(m.esd, { source: SRC_ID, confidence: "high",
        note: t("Herstellerangabe 0,7–0,9 MΩ Oberflächenwiderstand, Einstufung ESD-C leitfähig.",
                "Manufacturer states 0.7–0.9 MΩ surface resistance, classified ESD-C conductive.") }),
      surfaceResistivity: q(m.esdOhm, "Ω/sq", { source: SRC_ID, confidence: "medium" }),
    } } : {}),
    printEmissions: {
      concernLevel: choice(m.chamber === "mandatory" ? "moderate" : "low", { confidence: "estimated" }),
      extractionRecommended: flag(m.chamber === "mandatory", { confidence: "estimated" }),
    },
    translucency: choice("opaque", { source: SRC_ID, confidence: "medium" }),
  };

  const finishing = {};
  for (const s of ["surfaceQuality", "paintAdhesion", "bondability"]) {
    if (m.ratings?.[s] != null) finishing[s] = rating(m.ratings[s], s);
  }
  finishing.chemicalSmoothing = { suitable: flag(false, { confidence: "estimated" }) };

  const commercial = {};
  for (const s of ["priceIndex", "availability", "smallSeriesSuitability"]) {
    if (m.ratings?.[s] != null) commercial[s] = rating(m.ratings[s], s);
  }
  commercial.xxl = {
    maxSensibleEdgeMm: q(m.chamber === "mandatory" ? 400 : 900, "mm", {
      min: 200, max: m.chamber === "mandatory" ? 800 : 1800, source: "estimate_reasoning", confidence: "estimated",
      note: t("Geschätzt aus Kammerbedarf und Verzugsneigung, nicht durch eigene Fertigung belegt.",
              "Estimated from chamber requirement and warping tendency, not backed by our own production.") }),
    segmentationRecommended: flag(true, { confidence: "estimated" }),
  };
  commercial.reentsPortfolioStatus = choice("unknown", { confidence: "estimated" });

  const sustainability = {};
  if (m.bio != null) sustainability.bioBasedContent = q(m.bio, "%", { source: SRC_ID, confidence: "medium" });

  const rec = {
    $schema: "../../schema/material.schema.json", schemaVersion: "1.0.0", id,
    identity: {
      name: m.name, family: m.family, polymerClass: m.polymerClass, variant: m.variant,
      aliases: m.aliases,
      trademarkNotice: t("DuraPro, GreenTEC, XPETG und Flex sind Produktbezeichnungen der FD3D GmbH (Extrudr).",
                         "DuraPro, GreenTEC, XPETG and Flex are product designations of FD3D GmbH (Extrudr)."),
      abstract: m.abstract, positioning: m.positioning,
    },
    mechanics: mech, thermal, processing, durability, compliance,
    ...(Object.keys(sustainability).length ? { sustainability } : {}),
    finishing, commercial,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt) - fachliche Freigabe ausstehend",
      reviewCycleMonths: 12, dataCompleteness: null,
      sources: [
        src(m.name, P.find((p) => p.material === id)?.file ?? id),
        { id: "estimate_reasoning", type: "estimate", publisher: "FDM-Materialberater",
          title: "Fachliche Ableitung ohne Primärquelle", confidenceCeiling: "estimated" },
      ],
      openQuestions: [
        { id: "oq_specimen_type", question: t("Extrudr deklariert den Prüfkörpertyp nicht. Beim Hersteller erfragen, ob gedruckt oder spritzgegossen gemessen wurde.",
            "Extrudr does not declare the specimen type. Ask the manufacturer whether values were measured printed or moulded."),
          blocking: false, affectsFields: ["mechanics"] },
        { id: "oq_second_source", question: t("Zweite unabhängige Herstellerquelle für diesen Werkstofftyp ergänzen.",
            "Add a second independent manufacturer source for this material type."),
          blocking: false, affectsFields: ["mechanics", "thermal"] },
      ],
    },
  };
  writeFileSync(path.join(outM, `${id}.json`), JSON.stringify(rec, null, 2) + "\n");
  console.log(`  Werkstofftyp ${id}`);
  nm++;
}
console.log(`\n${np} Produkte, ${nm} Werkstofftypen, ${na} dokumentierte Datenblatt-Befunde.`);
