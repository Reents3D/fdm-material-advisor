/**
 * Import: Anycubic — neun Datenblaetter, alle mit Z-Wert und gedrucktem Pruefkoerper.
 *
 * WARUM AUSGERECHNET DIESE MARKE
 * Nicht wegen der Zahl der Blaetter, sondern wegen der Luecke, die sie schliesst. Der
 * Bestand fuehrt fuer 23 von 43 Werkstofftypen KEINEN Anisotropiefaktor - und dieses
 * Werkzeug wirbt auf der Startseite damit, Anisotropie auszuweisen. Die Ursache ist
 * nicht Nachlaessigkeit, sondern Angebot: Ein Faktor braucht Zug in X-Y UND in Z aus
 * demselben Blatt, und das veroeffentlichen fast keine Hersteller. Vor diesem Import
 * trugen 45 Produkte von fuenf Marken einen Z-Wert.
 *
 * Anycubic veroeffentlicht ihn in JEDEM Blatt, und zwar als eigene Tabellenzeile neben
 * dem X-Y-Wert. Dazu:
 *
 *   "*All data are based on printed test samples. '(X-Y)' and '(Z)' indicate different
 *    testing orientations (refer to the direction schematic)."
 *
 * Damit ist der Pruefkoerpertyp DEKLARIERT - `printed`, nicht `undeclared`. Das ist die
 * Ausnahme: Von den bisherigen Marken sagen es nur Bambu Lab und Ultrafuse so deutlich.
 * Die Blaetter nennen ausserdem durchgehend Pruefnormen (ISO 527, 178, 179, 1183, 1133,
 * 75-2, 11357-1) und bei den meisten Werten eine Streuung.
 *
 * WAS DIE NEUN Z-WERTE ERGEBEN - UND WAS NICHT
 * KEINEN einzigen neuen Anisotropiefaktor. Alle neun Blaetter gehoeren zu Typen, die
 * schon einen tragen (`abs`, `asa`, `petg`, `pla`, `tpu-95a`). Die Erwartung, mit neun
 * Z-Paaren neun Luecken zu schliessen, war falsch: Die 23 Typen OHNE Faktor sind genau
 * die, fuer die es kein Blatt mit Z-Werten gibt, und Anycubic fuehrt keinen davon.
 *
 * Stattdessen haben die neun etwas anderes ausgeloest - siehe `derive-anisotropy.mjs`:
 * Sie machten sichtbar, dass `pla` seinen Faktor 0,89 aus dem ersten Blatt trug und
 * seither nie wieder geprueft wurde, obwohl inzwischen zwanzig Blaetter vorliegen, deren
 * Faktoren von 0,32 bis 0,89 reichen. Der Wert ist entfernt und durch eine offene Frage
 * mit allen zwanzig Belegen ersetzt.
 *
 * Die Faktoren der neun Blaetter, der Vollstaendigkeit halber:
 *
 *   PLA Silk    0,32   12,0 / 37   der schlechteste Wert des ganzen Imports
 *   PLA HS      0,49   22,1 / 45
 *   PLA Matte   0,52   12,0 / 23
 *   PLA+        0,53   23,8 / 45
 *   TPU         0,54   18,5 / 34,4
 *   PLA         0,58   28,0 / 48
 *   ASA         0,59   24,0 / 41
 *   PETG        0,60   31,0 / 52
 *   ABS         0,65   22,0 / 34
 *
 * Der PLA-Silk-Wert ist der interessanteste: 0,32 gegen 0,58 beim normalen PLA desselben
 * Hauses, gemessen nach derselben Norm. Silk-PLA traegt Additive fuer den Glanz, und die
 * kosten Schichthaftung - das ist Werkstattwissen, das hier zum ersten Mal eine Zahl aus
 * einem Datenblatt bekommt.
 *
 * WAS NICHT UEBERNOMMEN WIRD, OBWOHL ES AUF DEM BLATT STEHT
 * Die Tabelle "Recommended Printing Parameters" verschachtelt sich beim Textauszug: Bei
 * `petg` steht in der Zeile "Printing Speed" der Wert "55-65 6-8h", also die Trocknung.
 * Duesen- und Betttemperatur sind in allen neun Blaettern sauber getrennt und werden
 * uebernommen; Drucktempo, Trocknung und Luefter NICHT. Eine Zahl, die in der falschen
 * Zeile steht, ist keine Angabe, sondern ein Fehler mit Nachkommastellen.
 *
 * ZWEI DINGE, DIE GEPRUEFT UND FUER SAUBER BEFUNDEN WURDEN
 *   1. Die OFD-Arbeitsliste fuehrt "PLA Basic" und "PLA Special" mit verschiedenen
 *      Adressen. Beide liefern dasselbe Dokument, Pruefsumme ed12b7cc - es ist EIN
 *      Produkt, nicht zwei. Ebenso zeigen "PLA Silk" und "Translucent PETG" in der
 *      Liste auf das PETG-Blatt; die richtige Silk-Adresse steht unter
 *      "PLA Silk Dual-Tricolor".
 *   2. PLA+ und PLA High Speed teilen zwei von dreizehn Werten (Zugfestigkeit 45 ± 5,
 *      Biegefestigkeit 82 ± 8). Alle uebrigen elf unterscheiden sich, darunter Dichte,
 *      Schmelzindex, Bruchdehnung und Schlagzaehigkeit. Zwei Treffer bei gerundeten
 *      Werten mit gleichem Toleranzformat sind Zufall, keine kopierte Tabelle - die
 *      Schwelle in `check-lineage.ts` liegt bei fuenf.
 *
 * ROBOTS.TXT
 * Die Blaetter liegen auf `cdn.shopify.com`, Shopifys Asset-Host. Dessen robots.txt
 * sperrt zwei JS-Muster und sonst nichts; Dateien unter `/s/files/` stehen in keiner
 * Disallow-Zeile. Geprueft 2026-08-06. Derselbe Host liefert auch die Bambu-Blaetter,
 * die `bambu-tds2.mjs` seit dem 2026-08-05 liest.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-06";
const CDN = "https://cdn.shopify.com/s/files/1";

const t = (de, en) => ({ de, en });

/**
 * Datenblattwert. `medium`, weil das Blatt Norm UND Pruefkoerpertyp nennt - das ist die
 * Stufe, die ein vollstaendig deklariertes Herstellerblatt in diesem Projekt bekommt.
 */
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min, max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

const ISO527 = "ISO 527";
const ISO178 = "ISO 178";
const ISO179 = "ISO 179";
const ISO1183 = "ISO 1183";
const ISO75 = "ISO 75-2";
const ISO11357 = "ISO 11357-1";

const SPECIMEN = t(
  "Das Blatt erklärt ausdrücklich: „All data are based on printed test samples. ‚(X-Y)‘ and ‚(Z)‘ indicate different testing orientations.“ Damit sind Prüfkörpertyp und Orientierung deklariert — die Werte sind mit Bambu Lab und Ultrafuse vergleichbar, nicht mit Blättern, die den Prüfkörper offenlassen.",
  "The sheet states explicitly: “All data are based on printed test samples. ‘(X-Y)’ and ‘(Z)’ indicate different testing orientations.” Specimen type and orientation are therefore declared — the values are comparable with Bambu Lab and Ultrafuse, not with sheets that leave the specimen open.");

const NO_PROCESS = t(
  "Drucktempo, Trocknung und Lüfterdrehzahl stehen auf dem Blatt, sind hier aber NICHT übernommen: Die Tabelle „Recommended Printing Parameters“ verschachtelt sich beim Textauszug, sodass Werte in fremden Zeilen landen. Düsen- und Betttemperatur sind davon nicht betroffen und stehen sauber getrennt.",
  "Print speed, drying and fan speed appear on the sheet but are NOT imported here: the “Recommended Printing Parameters” table interleaves during text extraction, so values land in the wrong rows. Nozzle and bed temperature are unaffected and read cleanly.");

/* ---------------------------------------------------------------- Blaetter */

const SHEETS = [
  {
    id: "anycubic-abs", material: "abs", name: "Anycubic ABS",
    file: "0685/7578/9245/files/ANYCUBIC_TDS_ABS_V3.0.pdf?v=1757562279",
    props: {
      density: q(1.05, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(34, "MPa", { std: ISO527, orientation: "XY" }),
      tensileStrengthZ: q(22, "MPa", { std: ISO527, orientation: "Z" }),
      tensileModulusXy: q(2200, "MPa", { std: ISO527, orientation: "XY" }),
      elongationAtBreakXy: q(11, "%", { std: ISO527, orientation: "XY" }),
      flexuralStrengthXy: q(63, "MPa", { std: ISO178, orientation: "XY" }),
      flexuralModulusXy: q(2200, "MPa", { std: ISO178, orientation: "XY" }),
      charpyUnnotchedXy: q(40, "kJ/m²", { std: ISO179, orientation: "XY", conditions: "im Blatt als „Izod“ bezeichnet, Norm ist Charpy", confidence: "low" }),
      glassTransitionTemperature: q(105, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtA: q(85, "°C", { std: `${ISO75}, 1,8 MPa` }),
      nozzleTemperature: q(260, "°C", { min: 240, max: 280 }),
      bedTemperature: q(90, "°C", { min: 80, max: 100 }),
    },
    features: t("Anisotropiefaktor 0,65 — der beste des ganzen Anycubic-Imports und ein deutlicher Vorsprung vor PLA (0,58) und PETG (0,60). Das passt zum Werkstoff: ABS verschweißt Schichten thermisch besser als die schnell erstarrenden Polyester.",
                "Anisotropy factor 0.65 — the best of the entire Anycubic import and a clear lead over PLA (0.58) and PETG (0.60). That fits the material: ABS fuses layers thermally better than the fast-solidifying polyesters."),
  },
  {
    id: "anycubic-asa", material: "asa", name: "Anycubic ASA",
    file: "0245/5519/2380/files/ANYCUBIC_TDS_ASA_V3.0.pdf?v=1758535865",
    props: {
      density: q(1.07, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(41, "MPa", { std: ISO527, orientation: "XY" }),
      tensileStrengthZ: q(24, "MPa", { std: ISO527, orientation: "Z" }),
      tensileModulusXy: q(2220, "MPa", { std: ISO527, orientation: "XY" }),
      elongationAtBreakXy: q(15, "%", { std: ISO527, orientation: "XY" }),
      flexuralStrengthXy: q(62, "MPa", { std: ISO178, orientation: "XY" }),
      flexuralModulusXy: q(1845, "MPa", { std: ISO178, orientation: "XY" }),
      charpyUnnotchedXy: q(36, "kJ/m²", { std: ISO179, orientation: "XY", conditions: "im Blatt als „Izod“ bezeichnet, Norm ist Charpy", confidence: "low" }),
      glassTransitionTemperature: q(103, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtA: q(90, "°C", { std: `${ISO75}, 1,8 MPa` }),
      nozzleTemperature: q(265, "°C", { min: 255, max: 275 }),
      bedTemperature: q(90, "°C", { min: 80, max: 100 }),
    },
    features: t("HDT-A 90 °C bei 41 MPa Zugfestigkeit — beides über dem ABS desselben Hauses (85 °C, 34 MPa). Der Biege-E-Modul liegt dagegen mit 1.845 MPa deutlich darunter (2.200): Dieses ASA ist fester und wärmefester, aber weicher.",
                "HDT-A 90 °C at 41 MPa tensile strength — both above the same house's ABS (85 °C, 34 MPa). The flexural modulus, by contrast, sits clearly below it at 1,845 MPa (2,200): this ASA is stronger and more heat resistant, but softer."),
  },
  {
    id: "anycubic-petg", material: "petg", name: "Anycubic PETG",
    file: "0698/1235/5357/files/ANYCUBIC_TDS_PETG_V3.0.pdf?v=1757584046",
    props: {
      density: q(1.23, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(52, "MPa", { std: ISO527, orientation: "XY", conditions: "± 1" }),
      tensileStrengthZ: q(31, "MPa", { std: ISO527, orientation: "Z", conditions: "± 3" }),
      tensileModulusXy: q(1850, "MPa", { std: ISO527, orientation: "XY", conditions: "± 100" }),
      elongationAtBreakXy: q(13, "%", { std: ISO527, orientation: "XY", conditions: "± 1" }),
      flexuralStrengthXy: q(80, "MPa", { std: ISO178, orientation: "XY", conditions: "± 2" }),
      flexuralModulusXy: q(2000, "MPa", { std: ISO178, orientation: "XY", conditions: "± 50" }),
      charpyUnnotchedXy: q(45, "kJ/m²", { std: ISO179, orientation: "XY", conditions: "± 2; im Blatt als „Izod“ bezeichnet, Norm ist Charpy", confidence: "low" }),
      glassTransitionTemperature: q(74.1, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtA: q(69, "°C", { std: `${ISO75}, 1,8 MPa` }),
      nozzleTemperature: q(240, "°C", { min: 230, max: 250 }),
      bedTemperature: q(65, "°C", { min: 60, max: 70 }),
    },
    features: t("52 MPa in X-Y gegen 31 MPa in Z, beide mit Streuungsangabe — eines der wenigen PETG-Blätter im Bestand, das die Z-Richtung überhaupt beziffert. Der Faktor 0,60 liegt über dem Bestandsmittel für PETG.",
                "52 MPa in X-Y against 31 MPa in Z, both with stated scatter — one of the few PETG sheets in the dataset that quantifies the Z direction at all. The factor of 0.60 sits above the dataset average for PETG."),
  },
  {
    id: "anycubic-pla", material: "pla", name: "Anycubic PLA",
    file: "0698/1235/5357/files/ANYCUBIC_TDS_PLA_V3.0.pdf?v=1757585748",
    props: {
      density: q(1.24, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(48, "MPa", { std: ISO527, orientation: "XY", conditions: "± 5" }),
      tensileStrengthZ: q(28, "MPa", { std: ISO527, orientation: "Z", conditions: "± 2,4" }),
      tensileModulusXy: q(2534, "MPa", { std: ISO527, orientation: "XY", conditions: "± 85" }),
      elongationAtBreakXy: q(8, "%", { std: ISO527, orientation: "XY", conditions: "± 1" }),
      flexuralStrengthXy: q(90, "MPa", { std: ISO178, orientation: "XY", conditions: "± 3" }),
      flexuralModulusXy: q(3360, "MPa", { std: ISO178, orientation: "XY", conditions: "± 100" }),
      charpyUnnotchedXy: q(22, "kJ/m²", { std: ISO179, orientation: "XY", conditions: "± 1; im Blatt als „Izod“ bezeichnet, Norm ist Charpy", confidence: "low" }),
      glassTransitionTemperature: q(61.2, "°C", { std: `${ISO11357}, 10 K/min` }),
      meltingTemperature: q(166, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtB: q(54, "°C", { std: `${ISO75}, 0,45 MPa` }),
      nozzleTemperature: q(210, "°C", { min: 190, max: 230 }),
      bedTemperature: q(60, "°C", { min: 55, max: 65 }),
    },
    features: t("Der Bezugspunkt für die vier PLA-Varianten daneben: 48 MPa, Faktor 0,58. Die OFD-Arbeitsliste führt dieses Blatt doppelt — einmal als „PLA Basic“, einmal als „PLA Special“; beide Adressen liefern dieselbe Datei.",
                "The reference point for the four PLA variants alongside: 48 MPa, factor 0.58. The OFD worklist carries this sheet twice — once as “PLA Basic”, once as “PLA Special”; both addresses return the same file."),
  },
  {
    id: "anycubic-pla-high-speed", material: "pla", name: "Anycubic PLA High Speed",
    file: "0685/7578/9245/files/ANYCUBIC_TDS_PLA_HS_V3.0.pdf?v=1757558773",
    props: {
      density: q(1.19, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(45, "MPa", { std: ISO527, orientation: "XY", conditions: "± 5" }),
      tensileStrengthZ: q(22.1, "MPa", { std: ISO527, orientation: "Z", conditions: "± 0,6" }),
      tensileModulusXy: q(2750, "MPa", { std: ISO527, orientation: "XY", conditions: "± 260" }),
      elongationAtBreakXy: q(9, "%", { std: ISO527, orientation: "XY", conditions: "± 1" }),
      flexuralStrengthXy: q(82, "MPa", { std: ISO178, orientation: "XY", conditions: "± 8" }),
      flexuralModulusXy: q(3905, "MPa", { std: ISO178, orientation: "XY", conditions: "± 300" }),
      charpyUnnotchedXy: q(21, "kJ/m²", { std: ISO179, orientation: "XY", conditions: "± 1; im Blatt als „Izod“ bezeichnet, Norm ist Charpy", confidence: "low" }),
      glassTransitionTemperature: q(55.1, "°C", { std: `${ISO11357}, 10 K/min` }),
      meltingTemperature: q(157, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtB: q(52, "°C", { std: `${ISO75}, 0,45 MPa` }),
      nozzleTemperature: q(225, "°C", { min: 190, max: 260 }),
      bedTemperature: q(60, "°C", { min: 55, max: 65 }),
    },
    features: t("Schnelldruck-PLA mit Faktor 0,49 — sieben Punkte unter dem Standard-PLA desselben Hauses. Die Schichthaftung ist der Preis der Geschwindigkeit, und dieses Blatt beziffert ihn, statt ihn zu verschweigen.",
                "High-speed PLA at factor 0.49 — seven points below the same house's standard PLA. Layer adhesion is the price of speed, and this sheet quantifies it instead of leaving it unsaid."),
  },
  {
    id: "anycubic-pla-plus", material: "pla", name: "Anycubic PLA+",
    file: "0698/1235/5357/files/ANYCUBIC_TDS_PLA__V3.0.pdf?v=1757589534",
    props: {
      density: q(1.21, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(45, "MPa", { std: ISO527, orientation: "XY", conditions: "± 5" }),
      tensileStrengthZ: q(23.8, "MPa", { std: ISO527, orientation: "Z", conditions: "± 0,4" }),
      tensileModulusXy: q(2790, "MPa", { std: ISO527, orientation: "XY", conditions: "± 250" }),
      elongationAtBreakXy: q(12, "%", { std: ISO527, orientation: "XY", conditions: "± 1" }),
      flexuralStrengthXy: q(82, "MPa", { std: ISO178, orientation: "XY", conditions: "± 8" }),
      flexuralModulusXy: q(3980, "MPa", { std: ISO178, orientation: "XY", conditions: "± 360" }),
      charpyUnnotchedXy: q(28, "kJ/m²", { std: ISO179, orientation: "XY", conditions: "± 1; im Blatt als „Izod“ bezeichnet, Norm ist Charpy", confidence: "low" }),
      glassTransitionTemperature: q(54.2, "°C", { std: `${ISO11357}, 10 K/min` }),
      meltingTemperature: q(162, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtB: q(50, "°C", { std: `${ISO75}, 0,45 MPa` }),
      nozzleTemperature: q(210, "°C", { min: 190, max: 230 }),
      bedTemperature: q(60, "°C", { min: 55, max: 65 }),
    },
    features: t("Das „+“ ist hier die Zähigkeit: 28 kJ/m² gegen 22 beim Standard-PLA und 12 % Bruchdehnung gegen 8 %. Bezahlt wird es mit Festigkeit (45 statt 48 MPa) — ein ehrlicher Kompromiss, kein Marketingzusatz.",
                "The “+” here is toughness: 28 kJ/m² against 22 for standard PLA, and 12 % elongation at break against 8 %. It is paid for in strength (45 instead of 48 MPa) — an honest trade-off, not a marketing suffix."),
  },
  {
    id: "anycubic-pla-matte", material: "pla", name: "Anycubic PLA Matte",
    file: "0685/7578/9245/files/ANYCUBIC_TDS_PLA_Matte_V3.0.pdf?v=1757562867",
    props: {
      density: q(1.31, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(23, "MPa", { std: ISO527, orientation: "XY", conditions: "± 2" }),
      tensileStrengthZ: q(12, "MPa", { std: ISO527, orientation: "Z", conditions: "± 1" }),
      tensileModulusXy: q(2000, "MPa", { std: ISO527, orientation: "XY", conditions: "± 64" }),
      elongationAtBreakXy: q(28, "%", { std: ISO527, orientation: "XY", conditions: "± 3" }),
      flexuralStrengthXy: q(40, "MPa", { std: ISO178, orientation: "XY", conditions: "± 1" }),
      flexuralModulusXy: q(2200, "MPa", { std: ISO178, orientation: "XY", conditions: "± 100" }),
      charpyUnnotchedXy: q(24, "kJ/m²", { std: ISO179, orientation: "XY", conditions: "± 0,18; im Blatt als „Izod“ bezeichnet, Norm ist Charpy", confidence: "low" }),
      glassTransitionTemperature: q(64, "°C", { std: `${ISO11357}, 10 K/min` }),
      meltingTemperature: q(162.6, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtB: q(57.4, "°C", { std: `${ISO75}, 0,45 MPa` }),
      nozzleTemperature: q(210, "°C", { min: 190, max: 230 }),
      bedTemperature: q(60, "°C", { min: 55, max: 65 }),
    },
    features: t("Die Mattierung kostet die Hälfte der Festigkeit: 23 MPa gegen 48 beim Standard-PLA desselben Hauses, bei einer Dichte von 1,31 statt 1,24. Beides zeigt denselben Grund — ein hoher mineralischer Füllanteil. Dafür steigt die Bruchdehnung von 8 auf 28 %.",
                "The matting costs half the strength: 23 MPa against 48 for the same house's standard PLA, at a density of 1.31 instead of 1.24. Both point to the same cause — a high mineral filler content. In return, elongation at break rises from 8 to 28 %."),
  },
  {
    id: "anycubic-pla-silk", material: "pla", name: "Anycubic PLA Silk",
    file: "0685/7578/9245/files/ANYCUBIC_TDS_PLA_silk_V3.0.pdf?v=1757561075",
    props: {
      density: q(1.22, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(37, "MPa", { std: ISO527, orientation: "XY", conditions: "± 4" }),
      tensileStrengthZ: q(12, "MPa", { std: ISO527, orientation: "Z", conditions: "± 4" }),
      tensileModulusXy: q(2000, "MPa", { std: ISO527, orientation: "XY", conditions: "± 200" }),
      elongationAtBreakXy: q(28, "%", { std: ISO527, orientation: "XY", conditions: "± 5" }),
      flexuralStrengthXy: q(66, "MPa", { std: ISO178, orientation: "XY", conditions: "± 4" }),
      flexuralModulusXy: q(2400, "MPa", { std: ISO178, orientation: "XY", conditions: "± 160" }),
      charpyUnnotchedXy: q(20, "kJ/m²", { std: ISO179, orientation: "XY", conditions: "± 2; im Blatt als „Izod“ bezeichnet, Norm ist Charpy", confidence: "low" }),
      glassTransitionTemperature: q(55.6, "°C", { std: `${ISO11357}, 10 K/min` }),
      meltingTemperature: q(164, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtB: q(53, "°C", { std: `${ISO75}, 0,45 MPa` }),
      nozzleTemperature: q(225, "°C", { min: 210, max: 240 }),
      bedTemperature: q(60, "°C", { min: 55, max: 65 }),
    },
    features: t("Der schlechteste Anisotropiefaktor des Bestands aus einem gedruckten Prüfkörper: 0,32. In Z bleiben von 37 MPa noch 12 übrig — gemessen nach derselben Norm wie das Standard-PLA desselben Hauses, das auf 0,58 kommt. Die Glanzadditive kosten Schichthaftung, und das ist hier zum ersten Mal eine Datenblattzahl statt Werkstattwissen.",
                "The worst anisotropy factor in the dataset from a printed specimen: 0.32. In Z, 12 MPa remain of 37 — measured to the same standard as the same house's standard PLA, which reaches 0.58. The gloss additives cost layer adhesion, and here that is a datasheet figure for the first time rather than workshop lore."),
  },
  {
    id: "anycubic-tpu", material: "tpu-95a", name: "Anycubic TPU",
    file: "0685/7578/9245/files/ANYCUBIC_TDS_TPU_V3.0.pdf?v=1757560611",
    props: {
      density: q(1.23, "g/cm³", { std: `${ISO1183}, 23 °C` }),
      tensileStrengthXy: q(34.4, "MPa", { std: ISO527, orientation: "XY" }),
      tensileStrengthZ: q(18.5, "MPa", { std: ISO527, orientation: "Z" }),
      tensileModulusXy: q(50.2, "MPa", { std: ISO527, orientation: "XY" }),
      elongationAtBreakXy: q(697, "%", { std: ISO527, orientation: "XY" }),
      flexuralStrengthXy: q(4.26, "MPa", { std: ISO178, orientation: "XY" }),
      flexuralModulusXy: q(87.6, "MPa", { std: ISO178, orientation: "XY" }),
      meltingTemperature: q(145.1, "°C", { std: `${ISO11357}, 10 K/min` }),
      hdtB: q(52, "°C", { std: `${ISO75}, 0,45 MPa` }),
      nozzleTemperature: q(215, "°C", { min: 195, max: 230 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    features: t("Der erste TPU-Z-Wert im Bestand: 18,5 gegen 34,4 MPa, Faktor 0,54. Dass ein Elastomer mit 697 % Bruchdehnung in Z überhaupt auf die Hälfte einbricht, ist die nützlichere Nachricht — Dehnbarkeit und Schichthaftung sind zwei verschiedene Dinge. Die Härte steht nicht in der Tabelle, sondern im Fließtext: „an average hardness of 95A“.",
                "The first TPU Z value in the dataset: 18.5 against 34.4 MPa, factor 0.54. That an elastomer with 697 % elongation at break drops to half in Z is the more useful news — stretchability and layer adhesion are two different things. The hardness is not in the table but in the prose: “an average hardness of 95A”."),
  },
];

/* ------------------------------------------------------------------ Schreiben */

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

for (const s of SHEETS) {
  const rec = {
    $schema: "../../schema/product.schema.json",
    schemaVersion: "1.0.0",
    id: s.id,
    materialId: s.material,
    brand: "Anycubic",
    manufacturer: "Shenzhen Anycubic Technology Co., Ltd.",
    productName: s.name,
    origin: "China",
    specimenType: "printed",
    specimenNote: {
      de: `${SPECIMEN.de}\n\n${NO_PROCESS.de}`,
      en: `${SPECIMEN.en}\n\n${NO_PROCESS.en}`,
    },
    features: s.features,
    properties: s.props,
    datasheet: {
      title: `${s.name} — Technical Data Sheet`,
      url: `${CDN}/${s.file}`,
      version: "3.0",
      retrievedAt: RETRIEVED,
    },
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Datenblattimport)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Shenzhen Anycubic Technology Co., Ltd.",
        title: `${s.name} — Technical Data Sheet`, documentVersion: "3.0",
        url: `${CDN}/${s.file}`, retrievedAt: RETRIEVED, confidenceCeiling: "medium",
      }],
    },
  };
  writeFileSync(path.join(out, `${s.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
}

const f = (s) => Math.round((s.props.tensileStrengthZ.value / s.props.tensileStrengthXy.value) * 100) / 100;
console.log(`${SHEETS.length} Anycubic-Produkte importiert — Anycubic ist die 17. Marke im Bestand.`);
console.log("  ALLE NEUN tragen einen Z-Wert, an gedruckten Pruefkoerpern, mit Pruefnorm.");
console.log("  KEINEN neuen Anisotropiefaktor - alle neun Typen hatten schon einen.");
console.log("  Die Faktoren aus diesen Blaettern:");
for (const s of [...SHEETS].sort((a, b) => f(a) - f(b))) {
  console.log(`    ${String(f(s)).padEnd(5)} ${s.name.padEnd(24)} ${s.props.tensileStrengthZ.value} / ${s.props.tensileStrengthXy.value} MPa`);
}
console.log("\n  Drucktempo, Trocknung und Luefter stehen auf den Blaettern, sind aber NICHT");
console.log("  uebernommen: Die Parametertabelle verschachtelt sich beim Textauszug.");
