/**
 * Import: Fillamentum Manufacturing Czech s.r.o. (Hulin, Tschechien).
 *
 * WARUM DIESER HERSTELLER DIE DATENBANK VERAENDERT
 * Fillamentum veroeffentlicht als einziger im Bestand ein vollstaendiges Blatt fuer
 * Werkstoffe, die sonst niemand dokumentiert: HIPS, PP, PVDF, PVC, PEBA und ein
 * Olefin-Blockcopolymer. Sechs Werkstofftypen dieser Datenbank existieren nur deshalb,
 * weil es diese Blaetter gibt (siehe scripts/import/types-commodity.mjs).
 *
 * DAS BLATT, DAS ALLE ANDEREN BESCHAEMT
 * OBC 905 ueberschreibt seine Tabelle mit "Mechanical properties on 3D printed samples",
 * nennt XY UND Z, dazu Duesentemperatur, Betttemperatur, Druckgeschwindigkeit, Perimeter
 * und Infill. Genau diese fuenf Angaben fehlen bei 130 der 133 uebrigen Produkte. Es ist
 * damit das einzige Blatt im Bestand, dessen Werte ein Konstrukteur direkt verwenden kann.
 *
 * DER BEFUND, DER SICH ZUM MUSTER VERDICHTET HAT
 * PLA Extrafill fuehrt seine Zugwerte unter ASTM D882 - der Norm fuer duenne FOLIEN.
 * Damit ist Fillamentum die FUENFTE Marke im Bestand mit genau diesem Fehler, nach
 * Material4Print, Fiberlogy und Spectrum. Dasselbe Blatt nennt fuer die
 * Waermeformbestaendigkeit ASTM E2092 statt D648 - dritte Marke mit diesem Fehler.
 * Fuenf unabhaengige Hersteller machen denselben Fehler nicht zufaellig: Er wandert mit
 * dem Rohstoffdatenblatt des Granulatlieferanten durch die Branche.
 *
 * DIE BEIDEN FASERTYPEN SIND UNGLAUBWUERDIG
 * Nylon CF15 (Carbon) und Nylon AF80 (Aramid) weisen beide einen Zug-E-Modul um 500 MPa
 * aus - waehrend das UNGEFUELLTE Nylon FX256 desselben Herstellers bei 1400 MPa liegt.
 * Eine Faserfuellung, die die Steifigkeit auf ein Drittel senkt, gibt es nicht. Beide
 * Werte sind uebernommen und als Befund markiert, nicht stillschweigend korrigiert.
 *
 * WAS AUSGELASSEN WURDE UND WARUM
 *   - ABS Extrafill transparent: PDF ohne Textebene, nicht maschinell auslesbar.
 *   - Flexfill TPE 90A und 96A: polyolefinbasiertes TPE hat keinen passenden
 *     Werkstofftyp, und jeder mechanische Wert steht dort unter "laboratory method" -
 *     einer nicht offengelegten Hausmethode. Beides zusammen ist zu wenig.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-02";
const U = "https://fillamentum.com/wp-content/uploads";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

const UNDECLARED = t(
  "Dieses Blatt sagt nicht, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde. Bemerkenswert ist, dass ein anderes Blatt desselben Herstellers (OBC 905) es ausdrücklich tut und dort sogar Düsentemperatur, Betttemperatur, Druckgeschwindigkeit und Infill nennt — der Hersteller kann es also, tut es hier aber nicht.",
  "This sheet does not say whether values were measured on printed or moulded specimens. Notable is that another sheet from the same manufacturer (OBC 905) does so explicitly, even naming nozzle temperature, bed temperature, print speed and infill — the manufacturer is able to, but does not here.");

const PRINTED = t(
  "Dieses Blatt deklariert den Prüfkörper vollständig: „Mechanical properties on 3D printed samples“, mit Werten für XY UND Z und mit Angabe von Düsentemperatur (200 °C), Betttemperatur (65 °C), Druckgeschwindigkeit (20 mm/s), zwei Perimetern und 100 % Infill. Das ist die vollständigste Prüfkörperdeklaration im gesamten Bestand.",
  "This sheet declares the specimen in full: “Mechanical properties on 3D printed samples”, with values for XY AND Z and stating nozzle temperature (200 °C), bed temperature (65 °C), print speed (20 mm/s), two perimeters and 100 % infill. It is the most complete specimen declaration in the entire dataset.");

/* Der Folienbefund taucht bei fuenf Marken auf und wird deshalb einmal formuliert. */
const D882 = t(
  "Die Zugwerte stehen unter ASTM D882, der Norm für dünne FOLIEN — für Formteile wäre ASTM D638 einschlägig. Fillamentum ist damit die fünfte Marke im Bestand mit genau diesem Fehler, nach Material4Print, Fiberlogy und Spectrum. Bei fünf unabhängigen Herstellern ist das kein Zufall, sondern ein Fehler, der mit dem Rohstoffdatenblatt des Granulatlieferanten durch die Branche wandert. Zusätzlich steht die Wärmeformbeständigkeit unter ASTM E2092, einer thermomechanischen Analyse, statt unter der HDT-Norm ASTM D648.",
  "The tensile values sit under ASTM D882, the standard for thin FILMS — for mouldings ASTM D638 would apply. Fillamentum is thus the fifth brand in the dataset with exactly this error, after Material4Print, Fiberlogy and Spectrum. Across five independent manufacturers that is no coincidence but an error travelling through the industry with the granulate supplier's raw-material datasheet. The heat deflection figure moreover sits under ASTM E2092, a thermomechanical analysis, instead of the HDT standard ASTM D648.");

const FIBRE_MODULUS = t(
  "Der Zug-E-Modul ist unglaubwürdig niedrig. Fillamentums UNGEFÜLLTES Nylon FX256 liegt bei 1400 MPa; dieses fasergefüllte Nylon soll bei rund 500 MPa liegen — ein Drittel davon. Eine Faserfüllung erhöht die Steifigkeit, sie senkt sie nicht. Denkbar ist eine Verwechslung mit einem anderen Prüfzustand (das CPE-CF112-Blatt desselben Herstellers nennt für den Modul die sehr langsame Prüfgeschwindigkeit 0,15 mm/min) oder eine Zahlendreherei. Der Wert ist unverändert übernommen und hier markiert — nicht stillschweigend korrigiert.",
  "The tensile modulus is implausibly low. Fillamentum's UNFILLED Nylon FX256 sits at 1400 MPa; this fibre-filled nylon is stated at roughly 500 MPa — a third of that. A fibre filler raises stiffness, it does not lower it. A mix-up with a different test condition is conceivable (the same manufacturer's CPE CF112 sheet gives the very slow test speed of 0.15 mm/min for its modulus) or a transposed figure. The value is imported unchanged and flagged here — not silently corrected.");

const P = [
  /* ------------------------------------------------- Werkstoffe mit neuem Typ */
  { id: "fillamentum-hips-extrafill", material: "hips", name: "Fillamentum HIPS Extrafill",
    file: "2020/10/Technical-Data-Sheet_HIPS-Extrafill_03012019.pdf",
    props: {
      density: q(1.05, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(26, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(40, "%", { std: "ISO 527" }),
      tensileModulusXy: q(2000, "MPa", { std: "ISO 527" }),
      flexuralStrengthXy: q(40, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(2100, "MPa", { std: "ISO 178" }),
      izodNotchedXy: q(180, "J/m", { std: "ASTM D256-A", conditions: "23 °C, gekerbt" }),
      charpyNotchedXy: q(17, "kJ/m²", { std: "ISO 179-1eA", conditions: "23 °C, gekerbt" }),
      hdtA: q(85, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(89, "°C", { std: "ISO 75, 0,45 MPa" }),
      waterAbsorption: q(0.1, "%", { std: "ISO 62 Methode A", conditions: "Blattangabe „< 0,1 %“" }),
      nozzleTemperature: q(240, "°C", { min: 230, max: 250 }),
      bedTemperature: q(97, "°C", { min: 90, max: 105 }),
    },
    features: t("Das Blatt macht die Kerbempfindlichkeit sichtbar wie kein zweites: ungekerbt bei 23 °C „kein Bruch“, bei −30 °C noch 130 kJ/m² — gekerbt dagegen nur 17 kJ/m². Es nennt zudem ausdrücklich, dass beim Drucken kleine Mengen Styrol frei werden.",
                "The sheet makes notch sensitivity visible like no other: unnotched at 23 °C “no break”, at −30 °C still 130 kJ/m² — notched, by contrast, only 17 kJ/m². It also states explicitly that small quantities of styrene are released during printing.") },

  { id: "fillamentum-pp-2320", material: "pp", name: "Fillamentum PP 2320",
    file: "2020/10/Technical-Data-Sheet_PP-2320.pdf",
    props: {
      density: q(0.96, "g/cm³", { std: "ISO 1183 A", conditions: "(23 ± 2) °C" }),
      meltFlowRate: q(7.4, "g/10min", { std: "ISO 1133", conditions: "230 °C, 5 kg" }),
      tensileStrengthXy: q(23, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(20, "%", { std: "ISO 527" }),
      tensileModulusXy: q(1400, "MPa", { std: "ISO 527" }),
      charpyUnnotchedXy: q(184, "kJ/m²", { std: "ISO 179-1/1eU", conditions: "25 °C, ungekerbt" }),
      nozzleTemperature: q(235, "°C", { min: 225, max: 245 }),
      bedTemperature: q(97, "°C", { min: 90, max: 105 }),
      printSpeed: q(30, "mm/s", { min: 20, max: 40 }),
    },
    features: t("184 kJ/m² ungekerbt ist der höchste Schlagzähigkeitswert der ganzen Datenbank. Das Blatt nennt ausserdem Medienbeständigkeiten mit Temperaturangabe und weist ausdrücklich darauf hin, dass PP ohne Haftvermittler und Brim nicht auf dem Bett hält.",
                "184 kJ/m² unnotched is the highest impact figure in the whole database. The sheet also states media resistances with temperature and points out explicitly that PP will not stay on the bed without an adhesion promoter and a brim.") },

  { id: "fillamentum-fluorodur", material: "pvdf", name: "Fillamentum Fluorodur (PVDF)",
    file: "2021/01/Technical-Data-Sheet_Fluorodur_EN_09122020_FI.pdf",
    props: {
      density: q(1.79, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(34, "MPa", { std: "ASTM D638", conditions: "Streckspannung" }),
      elongationAtBreakXy: q(8, "%", { std: "ASTM D638" }),
      tensileModulusXy: q(2000, "MPa", { std: "ASTM D638" }),
      flexuralStrengthXy: q(50, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(1700, "MPa", { std: "ASTM D790", conditions: "1,27 mm/min" }),
      charpyNotchedXy: q(5, "kJ/m²", { std: "ASTM D256", conditions: "23 °C, gekerbt" }),
      nozzleTemperature: q(260, "°C", { min: 250, max: 270 }),
      bedTemperature: q(105, "°C", { min: 100, max: 120 }),
      coolingFanPct: q(7, "%", { min: 0, max: 15 }),
    },
    anomaly: t("Das Blatt beschreibt Fluorodur im Fließtext als „high impact strength“, weist im Tabellenteil aber 5 kJ/m² gekerbt aus — einen niedrigen Wert. Beides ist vereinbar, wenn der Fließtext den ungekerbten Fall meint; das Blatt sagt es nicht. Zur Einsatztemperatur nennt es „100 bis 140 °C, abhängig von Substanz, Temperatur und Zeit“ statt eines Kennwerts nach Norm.",
               "The sheet describes Fluorodur in prose as “high impact strength” but gives 5 kJ/m² notched in the table — a low figure. Both are reconcilable if the prose means the unnotched case; the sheet does not say so. For service temperature it names “100 to 140 °C, depending on substance, temperature and time” instead of a value to a standard.") },

  { id: "fillamentum-vinyl-303", material: "pvc", name: "Fillamentum Vinyl 303 (PVC)",
    file: "2020/10/TDS_Vinyl-303_FI.pdf",
    props: {
      density: q(1.35, "g/cm³"),
      meltFlowRate: q(10, "g/10min", { conditions: "190 °C, 10 kg; Blattangabe „≥ 10“" }),
      tensileStrengthXy: q(46.1, "MPa", { std: "werkseigene Methode 10-LA 049", conditions: "bei Bruch", confidence: "low" }),
      elongationAtBreakXy: q(13.1, "%", { std: "werkseigene Methode 10-LA 049", conditions: "bei Bruch", confidence: "low" }),
      hardnessShoreD: q(78, "Shore D", { std: "werkseigene Methode 10-LA 031", confidence: "low" }),
      vicatB50: q(71, "°C", { std: "ISO 306", conditions: "50 °C/h, 5 kg" }),
      nozzleTemperature: q(222, "°C", { min: 215, max: 230 }),
      bedTemperature: q(80, "°C"),
    },
    anomaly: t("Zugfestigkeit, Bruchdehnung und Härte stehen unter „10-LA 049“ und „10-LA 031“ — werkseigenen Prüfvorschriften, die nicht veröffentlicht sind. Diese drei Werte sind mit keinem anderen Produkt im Bestand vergleichbar und tragen deshalb `low` statt `medium`. Nur die Vicat-Erweichung steht unter einer öffentlichen Norm. Zudem erwähnt das Blatt die Chlorwasserstoffabspaltung bei Überhitzung nicht, obwohl sie das eigentliche Verarbeitungsrisiko von PVC ist.",
               "Tensile strength, elongation at break and hardness sit under “10-LA 049” and “10-LA 031” — in-house test procedures that are not published. These three values are comparable with no other product in the dataset and therefore carry `low` instead of `medium`. Only the Vicat softening point sits under a public standard. The sheet moreover does not mention hydrogen chloride release on overheating, although that is PVC's actual processing risk.") },

  { id: "fillamentum-flexfill-peba-90a", material: "peba", name: "Fillamentum Flexfill PEBA 90A",
    file: "2020/11/TDS_Flexfill-PEBA-90A_EN.pdf",
    props: {
      density: q(1.0, "g/cm³"),
      tensileStrengthXy: q(9, "MPa", { std: "ASTM D638", conditions: "Spannung bei 50 % Dehnung, keine Bruchspannung" }),
      elongationAtBreakXy: q(1000, "%", { std: "ASTM D638", conditions: "Blattangabe „> 1000 %“" }),
      flexuralModulusXy: q(65, "MPa", { std: "ASTM D790", conditions: "1,27 mm/min" }),
      hardnessShoreD: q(42, "Shore D", { std: "ASTM D2240" }),
      abrasionLoss: q(48, "mm³", { std: "ISO 4649", conditions: "10 N, 40 m; Blattangabe „< 48 mm³“" }),
      nozzleTemperature: q(235, "°C", { min: 225, max: 245 }),
      bedTemperature: q(80, "°C", { min: 70, max: 90 }),
    },
    features: t("Mit 1,0 g/cm³ das leichteste Elastomer im Bestand. Das Blatt nennt Abriebverlust nach ISO 4649 und hebt die Beständigkeit gegen ASTM-Öle und -Kraftstoffe hervor — genau der Punkt, an dem polyesterbasiertes TPU versagt.",
                "At 1.0 g/cm³ the lightest elastomer in the dataset. The sheet gives abrasion loss to ISO 4649 and stresses resistance to ASTM oils and fuels — precisely where polyester-based TPU fails.") },

  { id: "fillamentum-obc-905", material: "obc", name: "Fillamentum OBC 905", printed: true,
    file: "2022/11/TDS_OBC-905_EN_07102022_FI.pdf",
    props: {
      density: q(0.905, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(14, "MPa", { std: "ASTM D1708", orientation: "XY", conditions: "gedruckt, 100 % Infill, 2 Perimeter, 200 °C Düse, 65 °C Bett, 20 mm/s" }),
      tensileStrengthZ: q(11, "MPa", { std: "ASTM D1708", orientation: "Z", conditions: "gedruckt, 100 % Infill, Streckspannung" }),
      elongationAtBreakXy: q(700, "%", { std: "ASTM D1708", orientation: "XY", conditions: "gedruckt, 100 % Infill" }),
      elongationAtBreakZ: q(480, "%", { std: "ASTM D1708", orientation: "Z", conditions: "gedruckt, 100 % Infill" }),
      flexuralStrengthXy: q(7.8, "MPa", { std: "ASTM D790", orientation: "XY", conditions: "5 % Dehnung" }),
      flexuralStrengthZ: q(6.8, "MPa", { std: "ASTM D790", orientation: "Z", conditions: "5 % Dehnung" }),
      flexuralModulusXy: q(244, "MPa", { std: "ASTM D790", orientation: "XY", conditions: "1 % Dehnung" }),
      flexuralModulusZ: q(217, "MPa", { std: "ASTM D790", orientation: "Z", conditions: "1 % Dehnung" }),
      izodNotchedXy: q(34.3, "kJ/m²", { std: "ASTM D256", orientation: "XY", conditions: "gekerbt, gedruckt" }),
      izodNotchedZ: q(43.1, "kJ/m²", { std: "ASTM D256", orientation: "Z", conditions: "gekerbt, gedruckt" }),
      hardnessShoreD: q(53, "Shore D", { std: "ISO 7619" }),
      meltingTemperature: q(130, "°C", { std: "ISO 11357" }),
      glassTransition: q(-13, "°C", { std: "ISO 11357" }),
      volumeResistivity: q(1e16, "Ω·cm"),
      nozzleTemperature: q(200, "°C", { conditions: "Prüfkörperbedingung" }),
      bedTemperature: q(65, "°C", { conditions: "Prüfkörperbedingung" }),
      printSpeed: q(20, "mm/s", { conditions: "Prüfkörperbedingung" }),
    },
    features: t("Das aussagekräftigste Blatt im gesamten Bestand. Es weist alle mechanischen Werte getrennt für XY und Z aus, an ausdrücklich GEDRUCKTEN Prüfkörpern, und nennt dazu Düsentemperatur, Betttemperatur, Druckgeschwindigkeit, Perimeterzahl und Infill. Es beantwortet zudem vier Ja-Nein-Fragen, um die sich fast alle Blätter drücken: UV-Stabilität nein, Lebensmittelkontakt nein, biologisch abbaubar nein, transparent nein.",
                "The most informative sheet in the entire dataset. It gives every mechanical value separately for XY and Z, on explicitly PRINTED specimens, and states nozzle temperature, bed temperature, print speed, perimeter count and infill. It moreover answers four yes-no questions almost every sheet dodges: UV stability no, food contact no, biodegradable no, transparent no."),
    anomaly: t("Ein innerer Widerspruch: Die Schlagzähigkeit steht zweimal da, einmal in J/m und einmal in kJ/m². In XY passen die beiden Angaben zusammen (347 J/m ÷ 10,16 mm Restligament = 34,2 ≈ 34,3 kJ/m²). In Z passen sie nicht: 352 J/m ergäben 34,6 kJ/m², das Blatt nennt aber 43,1. Je nachdem, welche Einheit man liest, ist der Werkstoff stehend gedruckt gleich schlagzäh (Faktor 1,01) oder ein Viertel zäher (Faktor 1,26). Übernommen sind beide kJ/m²-Angaben, der abgeleitete Faktor im Werkstofftyp nutzt die konservativere Rechnung.",
               "An internal contradiction: impact strength appears twice, once in J/m and once in kJ/m². In XY the two agree (347 J/m ÷ 10.16 mm remaining ligament = 34.2 ≈ 34.3 kJ/m²). In Z they do not: 352 J/m would give 34.6 kJ/m², yet the sheet states 43.1. Depending on which unit one reads, the material printed upright is either equally tough (factor 1.01) or a quarter tougher (factor 1.26). Both kJ/m² figures are imported; the derived factor in the material type uses the more conservative calculation.") },

  /* ------------------------------------------------------ Etablierte Typen */
  { id: "fillamentum-petg", material: "petg", name: "Fillamentum PETG",
    file: "2023/02/TDS_PETG_EN_30012023.pdf",
    props: {
      density: q(1.27, "g/cm³"),
      tensileStrengthXy: q(50, "MPa", { std: "ISO 527", conditions: "Streckspannung, 50 mm/min; Bruchspannung 26 MPa" }),
      elongationAtBreakXy: q(120, "%", { std: "ISO 527", conditions: "50 mm/min" }),
      tensileModulusXy: q(1900, "MPa", { std: "ISO 527", conditions: "50 mm/min" }),
      flexuralStrengthXy: q(71, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(2150, "MPa", { std: "ISO 178" }),
      hardnessShoreD: q(75, "Shore D", { std: "ISO 7619" }),
      vicatB50: q(75, "°C", { std: "ISO 306" }),
    },
    features: t("Das jüngste Fillamentum-Blatt (2023) und das einzige mit einer Zeile „Flame classification UL 94“ — sie ist allerdings leer. Eine leere Zeile ist ehrlicher als eine erfundene Klasse, aber sie beantwortet die Frage nicht.",
                "The most recent Fillamentum sheet (2023) and the only one with a line “Flame classification UL 94” — which is, however, empty. An empty line is more honest than an invented class, but it does not answer the question.") },

  { id: "fillamentum-pla-extrafill", material: "pla", name: "Fillamentum PLA Extrafill",
    file: "2020/10/Technical-Data-Sheet_PLA-Extrafill_03012019.pdf",
    props: {
      density: q(1.24, "g/cm³"),
      meltFlowRate: q(6, "g/10min", { std: "ASTM D1238", conditions: "210 °C, 2,16 kg" }),
      tensileStrengthXy: q(60, "MPa", { std: "ASTM D882 (siehe Befund)", conditions: "Streckspannung; Bruchspannung 53 MPa", confidence: "low" }),
      elongationAtBreakXy: q(6, "%", { std: "ASTM D882 (siehe Befund)", confidence: "low" }),
      tensileModulusXy: q(3600, "MPa", { std: "ASTM D882 (siehe Befund)", confidence: "low" }),
      flexuralStrengthXy: q(83, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(3800, "MPa", { std: "ASTM D790" }),
      izodNotchedXy: q(16, "J/m", { std: "ASTM D256", conditions: "23 °C, gekerbt" }),
      hdtB: q(55, "°C", { std: "im Blatt als ASTM E2092 angegeben (siehe Befund)", conditions: "0,45 MPa", confidence: "low" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "ASTM D3418" }),
      nozzleTemperature: q(200, "°C", { min: 190, max: 210 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    anomaly: D882 },

  { id: "fillamentum-pla-crystal-clear", material: "pla", name: "Fillamentum PLA Crystal Clear",
    file: "2020/10/Technical-Data-Sheet_PLA-Crystal-Clear_03012019.pdf",
    props: {
      density: q(1.24, "g/cm³"),
      tensileStrengthXy: q(50, "MPa", { std: "ISO 527-1" }),
      elongationAtBreakXy: q(5, "%", { std: "ISO 527-1", conditions: "Blattangabe „≤ 5 %“" }),
      tensileModulusXy: q(3500, "MPa", { std: "ISO 527-1" }),
      charpyUnnotchedXy: q(5, "kJ/m²", { conditions: "Blattangabe „≤ 5 kJ/m²“" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "DSC" }),
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    features: t("Bemerkenswert im Vergleich zum PLA Extrafill desselben Herstellers: Dieses Blatt nutzt ISO 527-1, die richtige Norm für Formteile — während das Extrafill-Blatt ASTM D882 für Folien nennt. Derselbe Hersteller, derselbe Werkstoff, zwei Normen.",
                "Notable against the same manufacturer's PLA Extrafill: this sheet uses ISO 527-1, the correct standard for mouldings — whereas the Extrafill sheet names ASTM D882 for films. Same manufacturer, same material, two standards.") },

  { id: "fillamentum-abs-extrafill", material: "abs", name: "Fillamentum ABS Extrafill",
    file: "2020/10/Technical-Data-Sheet_ABS-Extrafill_03012019-1.pdf",
    props: {
      density: q(1.04, "g/cm³", { std: "ISO 1183", conditions: "23 °C" }),
      tensileStrengthXy: q(39, "MPa", { std: "ISO 527", conditions: "Streckspannung, 50 mm/min; Bruchspannung 32 MPa" }),
      elongationAtBreakXy: q(20, "%", { std: "ISO 527", conditions: "50 mm/min" }),
      flexuralStrengthXy: q(60, "MPa", { std: "ISO 178", conditions: "2 mm/min" }),
      flexuralModulusXy: q(1900, "MPa", { std: "ISO 178", conditions: "2 mm/min" }),
      izodNotchedXy: q(24, "kJ/m²", { std: "ISO 180-1A", conditions: "23 °C, gekerbt; bei −30 °C 10 kJ/m²" }),
      charpyNotchedXy: q(25, "kJ/m²", { std: "ISO 179", conditions: "23 °C, gekerbt; bei −30 °C 11 kJ/m²" }),
      hdtA: q(81, "°C", { std: "ISO 75-A", conditions: "1,8 MPa" }),
      vicatB50: q(96, "°C", { std: "ISO 306", conditions: "50 °C/h, 5 kg; bei 1 kg 103 °C" }),
      nozzleTemperature: q(230, "°C", { min: 220, max: 240 }),
      bedTemperature: q(92, "°C", { min: 80, max: 105 }),
    },
    features: t("Eines der wenigen Blätter, das die Kälteschlagzähigkeit ausweist: 24 kJ/m² bei 23 °C fallen auf 10 kJ/m² bei −30 °C. Wer ein ABS-Gehäuse für den Aussenbereich auslegt, findet genau hier die Zahl, die er braucht.",
                "One of the few sheets giving low-temperature impact: 24 kJ/m² at 23 °C fall to 10 kJ/m² at −30 °C. Anyone designing an ABS housing for outdoor use finds exactly the figure they need here.") },

  { id: "fillamentum-asa-extrafill", material: "asa", name: "Fillamentum ASA Extrafill",
    file: "2020/10/Technical-Data-Sheet_ASA-Extrafill_03012019.pdf",
    props: {
      density: q(1.07, "g/cm³"),
      meltFlowRate: q(5, "g/10min", { conditions: "220 °C, 10 kg" }),
      tensileStrengthXy: q(40, "MPa", { std: "ASTM D638", conditions: "50 mm/min" }),
      elongationAtBreakXy: q(35, "%", { std: "ASTM D638", conditions: "50 mm/min" }),
      tensileModulusXy: q(1726, "MPa", { std: "ASTM D638", conditions: "1 mm/min" }),
      flexuralStrengthXy: q(62, "MPa", { std: "ASTM D790", conditions: "Streckspannung, 15 mm/min" }),
      flexuralModulusXy: q(1814, "MPa", { std: "ASTM D790", conditions: "15 mm/min" }),
      izodNotchedXy: q(441, "J/m", { std: "ASTM D256", conditions: "23 °C, 1/8 Zoll" }),
      vicatB50: q(94, "°C", { std: "ASTM D1525", conditions: "50 °C/h, 5 kg" }),
      nozzleTemperature: q(248, "°C", { min: 240, max: 255 }),
      bedTemperature: q(97, "°C", { min: 90, max: 105 }),
    } },

  { id: "fillamentum-cpe-hg100", material: "petg", name: "Fillamentum CPE HG100",
    file: "2020/10/Technical-Data-Sheet_CPE-HG100_03012019.pdf",
    props: {
      density: q(1.25, "g/cm³"),
      tensileStrengthXy: q(47, "MPa", { std: "ASTM D638", conditions: "Streckspannung, 50 mm/min; Bruchspannung 48 MPa (siehe Befund)" }),
      elongationAtBreakXy: q(150, "%", { std: "ASTM D638", conditions: "50 mm/min" }),
      flexuralStrengthXy: q(71, "MPa", { std: "ASTM D790", conditions: "1,27 mm/min" }),
      flexuralModulusXy: q(1860, "MPa", { std: "ASTM D790", conditions: "1,27 mm/min" }),
      hdtB: q(80, "°C", { std: "ASTM D648", conditions: "0,455 MPa" }),
      glassTransition: q(90, "°C", { std: "im Blatt als ASTM D1525 angegeben (siehe Befund)" }),
      nozzleTemperature: q(265, "°C", { min: 255, max: 275 }),
      bedTemperature: q(77, "°C", { min: 70, max: 85 }),
      dryingTemperature: q(60, "°C", { conditions: "3 bis 4 Stunden" }),
    },
    features: t("Kerbschlagzähigkeit „no break“ nach ASTM D256 bei 23 °C gekerbt — dieses Copolyester bricht im Kerbschlagversuch schlicht nicht. Mit HDT-B 80 °C und einem Glasübergang von 90 °C liegt es zudem deutlich über gewöhnlichem PETG (75 bis 80 °C).",
                "Notched impact “no break” to ASTM D256 at 23 °C — this copolyester simply does not fracture in the notched impact test. With HDT-B 80 °C and a glass transition of 90 °C it also sits clearly above ordinary PETG (75 to 80 °C)."),
    anomaly: t("Zwei Auffälligkeiten. Erstens ist die Bruchspannung mit 48 MPa HÖHER als die Streckspannung mit 47 MPa. Bei Copolyestern ist Verfestigung nach dem Streckpunkt möglich, aber der Abstand ist so klein, dass er ebenso gut eine Rundung sein kann. Zweitens steht der Glasübergang unter ASTM D1525 — das ist die Norm für die VICAT-Erweichung, nicht für den Glasübergang (dafür wäre ASTM D3418, DSC, einschlägig). Der Wert von 90 °C ist als Vicat-Erweichung plausibel, als Glasübergang für ein Copolyester ungewöhnlich hoch.",
               "Two irregularities. First, the stress at break at 48 MPa is HIGHER than the yield stress at 47 MPa. Strain hardening past the yield point is possible in copolyesters, but the gap is small enough to be rounding. Second, the glass transition sits under ASTM D1525 — that is the standard for VICAT softening, not for glass transition (ASTM D3418, DSC, would apply). The figure of 90 °C is plausible as a Vicat softening point but unusually high as a glass transition for a copolyester.") },

  { id: "fillamentum-cpe-cf112", material: "petg-cf", name: "Fillamentum CPE CF112 Carbon",
    file: "2020/10/TDS_CPE-CF112-Carbon.pdf",
    props: {
      density: q(1.16, "g/cm³"),
      tensileStrengthXy: q(52.4, "MPa", { std: "ISO 527", conditions: "Streckspannung, 50 mm/min; Bruchspannung 37,7 MPa" }),
      elongationAtBreakXy: q(8, "%", { std: "ISO 527", conditions: "50 mm/min" }),
      tensileModulusXy: q(2200, "MPa", { std: "ISO 527", conditions: "0,15 mm/min" }),
      charpyUnnotchedXy: q(105.9, "kJ/m²", { std: "ISO 179", conditions: "25 °C, ungekerbt" }),
      hardnessShoreD: q(77, "Shore D", { std: "ISO 7619" }),
      nozzleTemperature: q(260, "°C", { min: 250, max: 270 }),
      bedTemperature: q(77, "°C", { min: 70, max: 85 }),
    },
    anomaly: t("Der Zug-E-Modul wurde bei 0,15 mm/min gemessen, die Festigkeit bei 50 mm/min — zwei Prüfgeschwindigkeiten, die um den Faktor 333 auseinanderliegen. Bei viskoelastischen Kunststoffen ist der Modul geschwindigkeitsabhängig; langsam geprüft fällt er niedriger aus. Der Vergleich mit Modulwerten anderer Hersteller ist damit nur eingeschränkt zulässig.",
               "The tensile modulus was measured at 0.15 mm/min, the strength at 50 mm/min — two test speeds a factor of 333 apart. In viscoelastic polymers the modulus is rate dependent; tested slowly it comes out lower. Comparison with other manufacturers' modulus figures is therefore only partly admissible.") },

  { id: "fillamentum-pc-abs", material: "abs-pc", name: "Fillamentum PC/ABS",
    file: "2020/10/Technical_Data_Sheet_PC-ABS.pdf",
    props: {
      density: q(1.07, "g/cm³", { std: "ISO 1183-1", conditions: "25 °C" }),
      meltFlowRate: q(15, "g/10min", { std: "ISO 1133", conditions: "220 °C, 10 kg; im Blatt als 15 cm³/10 min" }),
      tensileStrengthXy: q(42, "MPa", { std: "ISO 527-1,2", conditions: "Streckspannung, 50 mm/min" }),
      elongationAtBreakXy: q(7, "%", { std: "ISO 527-1,2", conditions: "50 mm/min" }),
      tensileModulusXy: q(2000, "MPa", { std: "ISO 527-1,2", conditions: "1 mm/min" }),
      flexuralStrengthXy: q(68, "MPa", { std: "ISO 178", conditions: "2 mm/min" }),
      flexuralModulusXy: q(2000, "MPa", { std: "ISO 178", conditions: "2 mm/min" }),
      izodNotchedXy: q(55, "kJ/m²", { std: "ISO 180-1A", conditions: "23 °C, gekerbt; bei −30 °C 41 kJ/m²" }),
      charpyNotchedXy: q(53, "kJ/m²", { std: "ISO 179", conditions: "23 °C, gekerbt" }),
      vicatB50: q(113, "°C", { std: "ISO 306 B50", conditions: "50 °C/h; bei 120 °C/h 115 °C" }),
      clte: q(0.89e-4, "1/K", { std: "ISO 11359-2", conditions: "23 bis 55 °C" }),
      nozzleTemperature: q(270, "°C", { min: 260, max: 280 }),
      bedTemperature: q(97, "°C", { min: 90, max: 105 }),
    },
    features: t("Der beste Kälteschlagwert im Bestand: 55 kJ/m² gekerbt bei 23 °C fallen bei −30 °C nur auf 41 kJ/m² — ein Rückgang von 25 %, während ABS im selben Sprung 58 % verliert. Für Aussen- und Fahrzeuganwendungen ist das der entscheidende Unterschied. Das Blatt nennt zudem als eines von wenigen den Wärmeausdehnungskoeffizienten.",
                "The best low-temperature impact figure in the dataset: 55 kJ/m² notched at 23 °C fall to only 41 kJ/m² at −30 °C — a drop of 25 %, where ABS loses 58 % over the same step. For outdoor and vehicle applications that is the decisive difference. The sheet is also one of the few to give the coefficient of thermal expansion.") },

  { id: "fillamentum-nylon-fx256", material: "pa12", name: "Fillamentum Nylon FX256",
    file: "2020/10/Technical-Data-Sheet_Nylon-FX256.pdf",
    props: {
      density: q(1.01, "g/cm³"),
      meltFlowRate: q(95, "g/10min"),
      tensileStrengthXy: q(45, "MPa", { std: "ISO 527", conditions: "Streckspannung" }),
      elongationAtBreakXy: q(50, "%", { std: "ISO 527", conditions: "Blattangabe „> 50 %“" }),
      tensileModulusXy: q(1400, "MPa", { std: "ISO 527" }),
      vicatB50: q(140, "°C", { std: "ISO 306", conditions: "50 °C/h, 5 kg" }),
      nozzleTemperature: q(248, "°C", { min: 235, max: 260 }),
      bedTemperature: q(92, "°C", { min: 80, max: 105 }),
    },
    features: t("Der Bezugswert für die beiden fasergefüllten Nylons desselben Herstellers: ungefüllt 1400 MPa Zug-E-Modul. Genau daran misst sich, dass CF15 und AF80 mit rund 500 MPa nicht stimmen können.",
                "The reference point for the same manufacturer's two fibre-filled nylons: unfilled, 1400 MPa tensile modulus. It is precisely against this that CF15 and AF80 at roughly 500 MPa cannot be right.") },

  { id: "fillamentum-nylon-cf15", material: "pa12-cf", name: "Fillamentum Nylon CF15 Carbon",
    file: "2020/10/Technical-Data-Sheet_Nylon-CF15-Carbon_03012019.pdf",
    props: {
      meltFlowRate: q(9.92, "g/10min", { std: "ISO 1133", conditions: "235 °C, 2,16 kg" }),
      tensileStrengthXy: q(54.5, "MPa", { std: "ISO 527", conditions: "50 mm/min" }),
      elongationAtBreakXy: q(103, "%", { std: "ISO 527", conditions: "50 mm/min", confidence: "low" }),
      tensileModulusXy: q(500, "MPa", { std: "ISO 527", conditions: "50 mm/min", confidence: "low" }),
      charpyUnnotchedXy: q(86.2, "kJ/m²", { std: "ISO 179", conditions: "25 °C, ungekerbt" }),
      hardnessShoreD: q(75, "Shore D", { std: "ISO 7619" }),
      meltingTemperature: q(160, "°C"),
      nozzleTemperature: q(248, "°C", { min: 235, max: 260 }),
      bedTemperature: q(92, "°C", { min: 80, max: 105 }),
    },
    anomaly: t("Zwei Werte sprechen gegen eine Kohlenstofffaserfüllung. Erstens der Zug-E-Modul von 500 MPa gegen 1400 MPa beim ungefüllten Nylon FX256 desselben Herstellers. Zweitens eine Bruchdehnung von 103 % — Kurzfaserfüllungen senken die Bruchdehnung typisch unter 5 %. Ein Werkstoff, der beides zugleich zeigt, verhält sich nicht wie ein fasergefülltes Nylon. Drittens liegt der Schmelzpunkt bei 160 °C, deutlich unter PA12 (etwa 178 °C) — es dürfte sich um ein Copolyamid handeln, was das Blatt aber nicht sagt. Alle drei Werte sind unverändert übernommen.",
               "Two values argue against a carbon-fibre filler. First, the tensile modulus of 500 MPa against 1400 MPa for the same manufacturer's unfilled Nylon FX256. Second, an elongation at break of 103 % — short-fibre fillers typically take elongation below 5 %. A material showing both at once does not behave like a fibre-filled nylon. Third, the melting point sits at 160 °C, clearly below PA12 (around 178 °C) — it is presumably a copolyamide, which the sheet does not say. All three values are imported unchanged.") },

  { id: "fillamentum-nylon-af80", material: "pa12", name: "Fillamentum Nylon AF80 Aramid",
    file: "2020/10/Technical-Data-Sheet_Nylon-AF80-Aramid.pdf",
    props: {
      density: q(0.99, "g/cm³", { std: "ISO 1183", conditions: "20 °C" }),
      meltFlowRate: q(9.9, "g/10min", { std: "ISO 1133", conditions: "235 °C, 2,16 kg" }),
      tensileStrengthXy: q(50.4, "MPa", { std: "ISO 527", conditions: "bei Bruch, 50 mm/min" }),
      elongationAtBreakXy: q(5.8, "%", { std: "ISO 527", conditions: "bei Bruch, 50 mm/min" }),
      tensileModulusXy: q(510, "MPa", { std: "ISO 527", conditions: "50 mm/min", confidence: "low" }),
      charpyUnnotchedXy: q(53.2, "kJ/m²", { std: "ISO 179", conditions: "20 °C, ungekerbt; bei −20 °C 58,8 kJ/m²" }),
      nozzleTemperature: q(245, "°C", { min: 235, max: 255 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    features: t("Der einzige aramidverstärkte Werkstoff im Bestand — und einer der wenigen mit einer Schlagzähigkeit, die bei −20 °C STEIGT statt zu fallen (58,8 gegen 53,2 kJ/m²). Das Grundpolymer nennt das Blatt ausdrücklich: Polyamid 12.",
                "The only aramid-reinforced material in the dataset — and one of the few whose impact strength RISES at −20 °C instead of falling (58.8 against 53.2 kJ/m²). The sheet names the base polymer explicitly: polyamide 12."),
    anomaly: FIBRE_MODULUS },

  { id: "fillamentum-timberfill", material: "pla", name: "Fillamentum Timberfill",
    file: "2020/10/Technical-Data-Sheet_Timberfill_03012019.pdf",
    props: {
      density: q(1.26, "g/cm³"),
      tensileStrengthXy: q(39, "MPa", { std: "ISO 527", conditions: "bei Bruch, 5 mm/min" }),
      elongationAtBreakXy: q(2, "%", { std: "ISO 527", conditions: "5 mm/min" }),
      tensileModulusXy: q(3200, "MPa", { std: "ISO 527", conditions: "1 mm/min" }),
      charpyUnnotchedXy: q(22, "kJ/m²", { std: "ISO 179" }),
      hardnessShoreD: q(77, "Shore D", { std: "ISO 7619" }),
      meltingTemperature: q(152.5, "°C", { min: 145, max: 160 }),
      nozzleTemperature: q(160, "°C", { min: 150, max: 170 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    features: t("Die niedrigste Drucktemperatur im gesamten Bestand: 150 bis 170 °C. Holzgefüllte Filamente verbrennen bei den üblichen PLA-Temperaturen, deshalb liegt das Fenster so tief — und deshalb ist es so eng.",
                "The lowest printing temperature in the entire dataset: 150 to 170 °C. Wood-filled filaments scorch at the usual PLA temperatures, which is why the window sits so low — and why it is so narrow.") },

  { id: "fillamentum-nonoilen", material: "pla", name: "Fillamentum NonOilen",
    file: "2020/10/Technical-Data-Sheet_NonOilen_EN_03082020_FfN.pdf",
    props: {
      density: q(1.2, "g/cm³"),
      meltFlowRate: q(12.6, "g/10min", { std: "ISO 1133", conditions: "190 °C, 2,16 kg" }),
      tensileStrengthXy: q(38.6, "MPa", { std: "ISO 527", conditions: "Streckspannung; Bruchspannung 31,2 MPa" }),
      elongationAtBreakXy: q(7.7, "%", { std: "ISO 527" }),
      tensileModulusXy: q(1900, "MPa", { std: "ISO 527" }),
      charpyUnnotchedXy: q(25.6, "kJ/m²", { std: "ISO 179", conditions: "23 °C, ungekerbt; gekerbt 2,4 kJ/m²" }),
      hardnessShoreD: q(71, "Shore D", { std: "ISO 868" }),
      hdtB: q(119, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
      vicatB50: q(150, "°C", { std: "ISO 306", conditions: "Methode A, 10 N, 50 °C/h" }),
      nozzleTemperature: q(185, "°C", { min: 175, max: 195 }),
      bedTemperature: q(25, "°C", { min: 0, max: 50 }),
    },
    features: t("Der bemerkenswerteste Wert dieses Imports: HDT-B 119 °C und Vicat 150 °C bei einem PLA-basierten Werkstoff, der bei 175 bis 195 °C gedruckt wird. Gewöhnliches PLA liegt bei 55 °C. Der Werkstoff ist ein Compound aus Polymilchsäure und Polyhydroxybutyrat; das PHB kristallisiert und hebt die Formbeständigkeit weit über PLA. Ein einzelnes Blatt, ein einzelner Hersteller — die Zahl steht hier ausdrücklich als Einzelbeleg, nicht als bestätigter Werkstoffkennwert.",
                "The most remarkable figure of this import: HDT-B 119 °C and Vicat 150 °C for a PLA-based material printed at 175 to 195 °C. Ordinary PLA sits at 55 °C. The material is a compound of polylactic acid and polyhydroxybutyrate; the PHB crystallises and lifts dimensional stability far beyond PLA. A single sheet, a single manufacturer — the figure stands here explicitly as a single piece of evidence, not as a confirmed material property.") },

  { id: "fillamentum-flexfill-tpu-92a", material: "tpu-95a", name: "Fillamentum Flexfill TPU 92A",
    file: "2020/10/Technical-Data-Sheet_Flexfill-TPU-92A_26082019.pdf",
    props: {
      density: q(1.2, "g/cm³", { std: "ISO 1183-1" }),
      tensileStrengthXy: q(49, "MPa", { std: "DIN 53504", conditions: "bei Bruch" }),
      elongationAtBreakXy: q(600, "%", { std: "DIN 53504" }),
      hardnessShoreA: q(91, "Shore A", { std: "ISO 7619" }),
      hardnessShoreD: q(42, "Shore D", { std: "ISO 7619" }),
      abrasionLoss: q(30, "mm³", { std: "ISO 4649" }),
      stressAt100Percent: q(7.5, "MPa", { std: "DIN 53504", conditions: "bei 100 % Dehnung" }),
      stressAt300Percent: q(16, "MPa", { std: "DIN 53504", conditions: "bei 300 % Dehnung" }),
      nozzleTemperature: q(230, "°C", { min: 220, max: 240 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    features: t("Ein Elastomerblatt, wie es sein soll: Spannung bei definierter Dehnung (7,5 MPa bei 100 %, 16 MPa bei 300 %) statt nur einer Bruchspannung, dazu Abriebverlust nach ISO 4649. Genau diese Zahlen entscheiden bei einer Dichtung — und genau sie fehlen bei fast jedem anderen TPU-Blatt.",
                "An elastomer sheet as it should be: stress at defined strain (7.5 MPa at 100 %, 16 MPa at 300 %) instead of only a break stress, plus abrasion loss to ISO 4649. Precisely these figures decide the matter for a seal — and precisely they are missing from almost every other TPU sheet."),
    anomaly: t("Shore A 92 liegt zwischen den geführten Typen TPU 85A und TPU 95A; die Zuordnung zu TPU 95A ist eine Einordnung dieser Datenbank, keine Herstellerangabe.",
               "Shore A 92 sits between the carried types TPU 85A and TPU 95A; the assignment to TPU 95A is this database's judgement, not a manufacturer statement.") },

  { id: "fillamentum-flexfill-tpu-98a", material: "tpu-98a", name: "Fillamentum Flexfill TPU 98A",
    file: "2020/10/Technical-Data-Sheet_Flexfill-TPU-98A_26082019.pdf",
    props: {
      density: q(1.23, "g/cm³"),
      tensileStrengthXy: q(53.7, "MPa", { std: "DIN 53504", conditions: "bei Bruch, 200 mm/min" }),
      elongationAtBreakXy: q(318, "%", { std: "DIN 53504", conditions: "200 mm/min" }),
      hardnessShoreA: q(98, "Shore A", { std: "ISO 7619-1" }),
      hardnessShoreD: q(60, "Shore D", { std: "ISO 7619-1" }),
      abrasionLoss: q(23, "mm³", { std: "ISO 4649", conditions: "Methode A" }),
      stressAt300Percent: q(28.4, "MPa", { std: "DIN 53504", conditions: "bei 300 % Dehnung" }),
      nozzleTemperature: q(230, "°C", { min: 220, max: 240 }),
      bedTemperature: q(55, "°C", { min: 50, max: 60 }),
    },
    features: t("Der beste Abriebwert im Bestand: 23 mm³ nach ISO 4649. Zum Vergleich liegt das weichere TPU 92A desselben Herstellers bei 30 mm³ und PEBA bei unter 48 mm³.",
                "The best abrasion figure in the dataset: 23 mm³ to ISO 4649. For comparison, the same manufacturer's softer TPU 92A sits at 30 mm³ and PEBA below 48 mm³.") },
];

/* ------------------------------------------------------------------ Ausgabe */

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, na = 0, np = 0;
for (const p of P) {
  const url = `${U}/${p.file}`;
  const parts = [p.printed ? PRINTED : UNDECLARED];
  if (p.anomaly) parts.push(t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`,
                              `Finding on this datasheet: ${p.anomaly.en}`));
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "Fillamentum", manufacturer: "Fillamentum Manufacturing Czech s.r.o.",
    productName: p.name, origin: "Tschechien",
    specimenType: p.printed ? "printed" : "undeclared",
    specimenNote: t(parts.map((x) => x.de).join("\n\n"), parts.map((x) => x.en).join("\n\n")),
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technical Data Sheet`, url, retrievedAt: RETRIEVED },
    productUrl: "https://fillamentum.com/collections/",
    properties: p.props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds",
        publisher: "Fillamentum Manufacturing Czech s.r.o.",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url, retrievedAt: RETRIEVED,
        confidenceCeiling: p.printed ? "high" : (p.anomaly ? "low" : "medium"),
        note: t(`Herstellerdatenblatt mit Textebene. Auszug unter data/_sources/fillamentum-tds/. ${p.printed ? "Prüfkörper deklariert: gedruckt, mit XY- und Z-Werten und vollständigen Druckparametern." : "Prüfkörper nicht deklariert."}`,
                `Manufacturer datasheet with text layer. Extract at data/_sources/fillamentum-tds/. ${p.printed ? "Specimen declared: printed, with XY and Z values and complete print parameters." : "Specimen not declared."}`),
      }],
    },
  };
  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  if (p.anomaly) na++;
  if (p.printed) np++;
}

console.log(`${n} Fillamentum-Produkte geschrieben (${na} mit Befund, ${np} mit gedruckten Pruefkoerpern)`);
console.log(`  6 davon tragen die neuen Werkstofftypen: HIPS, PP, PVDF, PVC, PEBA, OBC`);
console.log(`  Ausgelassen: ABS Extrafill transparent (PDF ohne Textebene),`);
console.log(`               Flexfill TPE 90A und 96A (kein passender Typ, alle Werte aus Hausmethode)`);
