/**
 * Import: Alzament (Handelsmarke von Alza.cz, Prag).
 *
 * Gefunden ueber die OFD-Arbeitsliste (ADR-035): 13 Fundstellen, alle mit Textebene,
 * alle englisch. Neue Marke im Bestand.
 *
 * DER FUND: DIESE BLAETTER SIND BAMBU-BLAETTER
 * Der ABS-Zeilenvergleich gegen Bambu ABS ergibt 10 von 14 Zeilen ZIFFERNGLEICH -
 * einschliesslich der Toleranzen und einschliesslich des Tippfehlers "MPA" statt "MPa"
 * beim Z-Modul. Die vier abweichenden Zeilen sind genau die Festigkeiten, und die
 * entsprechen der Fassung V3.0, die dieser Datensatz von Bambu fuehrt:
 *
 *                         Bambu V2.0   Bambu V3.0 (unser Wert)   Alzament
 *   Zugfestigkeit X-Y     41 ± 1       33                        33 ± 3
 *   Zugfestigkeit Z       32 ± 2       28                        28 ± 2
 *   E-Modul X-Y           2200 ± 190   -                         2200 ± 190
 *   E-Modul Z             1960 ± 110   -                         1960 ± 110   (beide "MPA")
 *
 * Dazu weist das Alzament-ABS-Blatt zum Trocknen auf das "X1 Series Printer Heatbed"
 * hin - ein Bambu-Lab-Druckermodell. Dieselbe Lage bei ASA und PLA Basic: die
 * Zugfestigkeiten stimmen zifferngleich mit den Bambu-Werten dieses Datensatzes ueberein
 * (ASA 37/31, PLA 35/31), waehrend die lokale aeltere Arbeitskopie andere Zahlen nennt.
 *
 * WAS DAS FUER DIE DATENBANK BEDEUTET
 * Ohne diesen Befund saehe es im Werkzeug so aus, als bestaetigten zwei unabhaengige
 * Hersteller dieselben Kennwerte. Das waere falsch: es ist EINE Messung unter zwei
 * Logos. Die drei betroffenen Produkte tragen deshalb durchgaengig `low` und einen
 * Befund, der Bambu namentlich nennt. Wer sie vergleicht, sieht sofort, dass er sich
 * selbst vergleicht.
 *
 * Was hier NICHT behauptet wird: wer von wem abgeschrieben hat. Die Blaetter nennen als
 * Hersteller "Landu Innovations Technology Co., Ltd." in Shenzhen und als Pruefer
 * "Alza.cz, a.s." - beides sagt nichts ueber die Richtung. Belegt ist die gemeinsame
 * Herkunft, nicht ihr Verlauf.
 *
 * DREI DER DREIZEHN SIND GAR KEINE TECHNISCHEN BLAETTER
 * PETG Hyper, PLA Matte und PLA Silk liegen als SICHERHEITSdatenblatt vor (GHS-Einstufung,
 * Loeschmittel, Schutzausruestung) - kein einziger mechanischer Kennwert. Die OFD fuehrt
 * sie trotzdem unter `data_sheet_url`. Sie werden nicht importiert; ein Produkt ohne
 * Messwert ist kein Datensatz, sondern ein Eintrag.
 *
 * VIER BLAETTER TRAGEN EIGENE MESSUNGEN - UND EINE SCHLIESST EINE LUECKE
 * PETG, PETG-CF und PLA-CF weichen von Bambu ab und bringen eigene Z-Werte mit. PLA-CF
 * fuehrt 31,2 MPa in X-Y gegen 15,1 MPa in Z: ein Anisotropiefaktor von 0,48 fuer einen
 * Werkstofftyp, der bisher keinen hatte. Das PETG-Blatt ist ausserdem das einzige der
 * dreizehn, das seine Pruefkoerperbedingungen nennt (240 °C, 80 °C Bett, 100 % Infill).
 *
 * ZWEI BLAETTER SIND IN SICH FEHLERHAFT
 * PLA Chameleon fuehrt Zugfestigkeit X-Y UND Z mit demselben Wert (26,1 MPa). Ein
 * Anisotropiefaktor von 1,00 kommt bei FDM nicht vor - das ist ein Kopierfehler im
 * Blatt, geprueft an der gerenderten Seite. Der Z-Wert wird nicht uebernommen. Dasselbe
 * Blatt nennt im Einleitungssatz "PLA-CF" statt PLA Chameleon und traegt denselben
 * Schmelzindex wie das PLA-CF-Blatt.
 * PLA+ fuehrt unter "Composition" den Eintrag "Polyvinyl alcohol" und unter "Solubility"
 * "Soluble in water" - die Chemietabelle eines wasserloeslichen Stuetzmaterials, in ein
 * PLA-Blatt kopiert. In der Zeile Schmelzindex steht statt eines Messwerts die
 * Pruefbedingung ("190°C/2.16kg").
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-05";

const t = (de, en) => ({ de, en });

const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.tolerance != null ? { tolerance: o.tolerance } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

/* Die Blaetter nennen durchgaengig beide Normfamilien nebeneinander. Das ist keine
   Redundanz: GB/T 1040 ist die chinesische Entsprechung zu ISO 527, und wer den Wert
   nachpruefen will, muss wissen, dass beide Wege offenstanden. */
const ISO527 = "ISO 527 / GB/T 1040";
const ISO178 = "ISO 178 / GB/T 9341";
const ISO179 = "ISO 179 / GB/T 1043";
const ISO1183 = "ISO 1183 / GB/T 1033";

/* Die drei Bambu-gleichen Blaetter. Alle Werte `low`, weil sie keine zweite Messung
   sind. Das ist der einzige Hebel, den das Datenmodell dafuer hat: Die Zahl bleibt
   sichtbar, aber sie zaehlt nicht als Beleg. */
const LOW = { confidence: "low" };

const BAMBU_LINEAGE = t(
  "Dieses Blatt ist keine eigene Messung. Der Zeilenvergleich gegen das Bambu-Blatt desselben Werkstoffs ergibt 10 von 14 Zeilen ziffernidentisch — einschließlich der Toleranzen und einschließlich des Tippfehlers „MPA“ statt „MPa“ beim Z-Modul. Die abweichenden Zeilen sind die Festigkeiten, und die entsprechen der Bambu-Fassung V3.0, die dieser Datensatz führt. Das ABS-Blatt verweist zum Trocknen zusätzlich auf das „X1 Series Printer Heatbed“ — ein Bambu-Lab-Drucker. Alle Werte tragen deshalb `low`: Wer Alzament und Bambu nebeneinanderstellt, vergleicht nicht zwei Hersteller, sondern eine Messung mit sich selbst. Wer von wem abgeschrieben hat, sagen die Blätter nicht — belegt ist die gemeinsame Herkunft, nicht ihr Verlauf.",
  "This sheet is not an independent measurement. A row-by-row comparison against the Bambu sheet for the same material gives 10 of 14 rows digit-identical — including the tolerances and including the typo “MPA” instead of “MPa” on the Z modulus. The differing rows are the strengths, and they match the Bambu revision V3.0 this dataset holds. The ABS sheet additionally points to the “X1 Series Printer Heatbed” for drying — a Bambu Lab printer. All values therefore carry `low`: placing Alzament next to Bambu does not compare two manufacturers, it compares one measurement with itself. Who copied from whom the sheets do not say — the shared origin is established, its direction is not.",
);

const OEM = t(
  "Alzament ist die Eigenmarke des tschechischen Händlers Alza.cz. Als Hersteller nennt das Blatt Landu Innovations Technology Co., Ltd. in Shenzhen, als Prüfer Alza.cz selbst.",
  "Alzament is the own brand of the Czech retailer Alza.cz. The sheet names Landu Innovations Technology Co., Ltd. in Shenzhen as manufacturer and Alza.cz itself as tester.",
);

/* ---------------------------------------------------------------- Produkte */

const P = [
  /* --- Die drei Bambu-gleichen ------------------------------------------- */
  {
    id: "alzament-abs", material: "abs", name: "ABS", manual: "161246",
    nozzle: [240, 270], bed: [80, 100], specimen: "printed", lineage: true,
    props: {
      density: q(1.05, "g/cm³", { std: "ISO 1183", ...LOW }),
      meltFlowRate: q(34.2, "g/10min", { tolerance: 3.8, conditions: "260 °C, 2,16 kg", ...LOW }),
      waterAbsorption: q(0.65, "%", { conditions: "25 °C, 55 % rF, gesättigt", ...LOW }),
      tensileModulusXy: q(2200, "MPa", { tolerance: 190, std: ISO527, orientation: "XY", ...LOW }),
      tensileModulusZ: q(1960, "MPa", { tolerance: 110, std: ISO527, orientation: "Z", ...LOW }),
      tensileStrengthXy: q(33, "MPa", { tolerance: 3, std: ISO527, orientation: "XY", ...LOW }),
      tensileStrengthZ: q(28, "MPa", { tolerance: 2, std: ISO527, orientation: "Z", ...LOW }),
      elongationAtBreakXy: q(10.5, "%", { tolerance: 1.0, std: ISO527, orientation: "XY", ...LOW }),
      elongationAtBreakZ: q(4.7, "%", { tolerance: 0.8, std: ISO527, orientation: "Z", ...LOW }),
      flexuralModulusXy: q(1880, "MPa", { tolerance: 110, std: ISO178, orientation: "XY", ...LOW }),
      flexuralModulusZ: q(1590, "MPa", { tolerance: 100, std: ISO178, orientation: "Z", ...LOW }),
      flexuralStrengthXy: q(62, "MPa", { tolerance: 4, std: ISO178, orientation: "XY", ...LOW }),
      flexuralStrengthZ: q(39, "MPa", { tolerance: 4, std: ISO178, orientation: "Z", ...LOW }),
      charpyUnnotchedXy: q(39.3, "kJ/m²", { tolerance: 3.6, std: ISO179, orientation: "XY", ...LOW }),
      charpyNotchedXy: q(21.5, "kJ/m²", { tolerance: 2.2, std: ISO179, orientation: "XY", ...LOW }),
      charpyUnnotchedZ: q(7.4, "kJ/m²", {
        tolerance: 1.2, std: ISO179, orientation: "Z", ...LOW,
        conditions: "Blatt sagt für die Z-Zeile nicht, ob gekerbt; die X-Y-Zeile markiert die gekerbte Zahl ausdrücklich, die unmarkierte gilt hier als ungekerbt",
      }),
    },
    anomaly: t(
      "Das Blatt nennt zum Trocknen „X1 Series Printer Heatbed: 90–100 °C, 12 h“ — ein Druckermodell von Bambu Lab, nicht von Alzament.",
      "For drying the sheet names “X1 Series Printer Heatbed: 90–100 °C, 12 h” — a printer model made by Bambu Lab, not by Alzament.",
    ),
  },
  {
    id: "alzament-asa", material: "asa", name: "ASA", manual: "161245",
    nozzle: [240, 270], bed: [80, 100], specimen: "printed", lineage: true,
    props: {
      density: q(1.05, "g/cm³", { std: "ISO 1183", ...LOW }),
      meltFlowRate: q(7.0, "g/10min", { tolerance: 0.8, conditions: "260 °C, 2,16 kg", ...LOW }),
      meltingTemperature: q(210, "°C", { std: "DSC", conditions: "10 °C/min", ...LOW }),
      vicatA: q(106, "°C", {
        std: "ISO 306 / GB/T 1633", ...LOW,
        conditions: "Blatt nennt die Methode nicht (A oder B) und auch nicht die Heizrate — hier als Methode A geführt, weil das die üblichere Angabe ist",
      }),
      hdtA: q(92, "°C", { std: "ISO 75", conditions: "1,8 MPa (Methode A)", ...LOW }),
      waterAbsorption: q(0.45, "%", { conditions: "25 °C, 55 % rF, gesättigt", ...LOW }),
      tensileModulusXy: q(2450, "MPa", { tolerance: 270, std: ISO527, orientation: "XY", ...LOW }),
      tensileModulusZ: q(2120, "MPa", { tolerance: 260, std: ISO527, orientation: "Z", ...LOW }),
      tensileStrengthXy: q(37, "MPa", { tolerance: 3, std: ISO527, orientation: "XY", ...LOW }),
      tensileStrengthZ: q(31, "MPa", { tolerance: 4, std: ISO527, orientation: "Z", ...LOW }),
      elongationAtBreakXy: q(9.2, "%", { tolerance: 1.4, std: ISO527, orientation: "XY", ...LOW }),
      elongationAtBreakZ: q(4.6, "%", { tolerance: 0.8, std: ISO527, orientation: "Z", ...LOW }),
      flexuralModulusXy: q(1920, "MPa", { tolerance: 130, std: ISO178, orientation: "XY", ...LOW }),
      flexuralModulusZ: q(1650, "MPa", { tolerance: 120, std: ISO178, orientation: "Z", ...LOW }),
      flexuralStrengthXy: q(65, "MPa", { tolerance: 5, std: ISO178, orientation: "XY", ...LOW }),
      flexuralStrengthZ: q(40, "MPa", { tolerance: 3, std: ISO178, orientation: "Z", ...LOW }),
      charpyUnnotchedXy: q(41.0, "kJ/m²", { tolerance: 2.3, std: ISO179, orientation: "XY", ...LOW }),
      charpyNotchedXy: q(19.6, "kJ/m²", { tolerance: 1.8, std: ISO179, orientation: "XY", ...LOW }),
      charpyUnnotchedZ: q(4.9, "kJ/m²", {
        tolerance: 0.6, std: ISO179, orientation: "Z", ...LOW,
        conditions: "Blatt sagt für die Z-Zeile nicht, ob gekerbt",
      }),
    },
    features: t(
      "Das einzige der zehn Blätter, das Vicat UND Wärmeformbeständigkeit nennt — und die HDT mit Lastangabe (1,8 MPa, also Methode A). Weil die Zahlen aber aus derselben Quelle stammen wie die Bambu-Werte, ist das kein zusätzlicher Beleg, sondern dieselbe Angabe an zweiter Stelle.",
      "The only one of the ten sheets to state both Vicat and heat deflection temperature — and the HDT with its load (1.8 MPa, i.e. method A). But because the figures come from the same source as the Bambu values, this is not additional evidence, merely the same statement in a second place.",
    ),
  },
  {
    id: "alzament-pla-basic", material: "pla", name: "PLA Basic", manual: "148629",
    nozzle: [190, 220], bed: [45, 60], specimen: "printed", lineage: true,
    props: {
      density: q(1.24, "g/cm³", { std: ISO1183, ...LOW }),
      meltFlowRate: q(42.4, "g/10min", { tolerance: 3.5, conditions: "210 °C, 2,16 kg", ...LOW }),
      tensileModulusXy: q(2580, "MPa", { tolerance: 220, std: ISO527, orientation: "XY", ...LOW }),
      tensileModulusZ: q(2060, "MPa", { tolerance: 170, std: ISO527, orientation: "Z", ...LOW }),
      tensileStrengthXy: q(35, "MPa", { tolerance: 4, std: ISO527, orientation: "XY", ...LOW }),
      tensileStrengthZ: q(31, "MPa", { tolerance: 3, std: ISO527, orientation: "Z", ...LOW }),
      elongationAtBreakXy: q(6.3, "%", { tolerance: 0.6, std: ISO527, orientation: "XY", ...LOW }),
      elongationAtBreakZ: q(1.8, "%", {
        tolerance: 0.1, std: ISO527, orientation: "Z", ...LOW,
        conditions: "Blatt schreibt in dieser Zeile „1.8 ± 0.1 MPa“ — die Einheit ist falsch, gemeint ist Prozent wie in der Zeile darüber",
      }),
      flexuralModulusXy: q(2750, "MPa", { tolerance: 160, std: ISO178, orientation: "XY", ...LOW }),
      flexuralModulusZ: q(2370, "MPa", { tolerance: 150, std: ISO178, orientation: "Z", ...LOW }),
      flexuralStrengthXy: q(76, "MPa", { tolerance: 5, std: ISO178, orientation: "XY", ...LOW }),
      flexuralStrengthZ: q(59, "MPa", { tolerance: 6, std: ISO178, orientation: "Z", ...LOW }),
      charpyUnnotchedXy: q(3.3, "kJ/m²", { tolerance: 0.2, std: ISO179, orientation: "XY", ...LOW }),
    },
    anomaly: t(
      "Die Bruchdehnung in Z steht mit der Einheit MPa statt Prozent im Blatt — ein Übertragungsfehler in der Vorlage, der hier korrigiert übernommen wird; die Blattangabe steht in `conditions`.",
      "The elongation at break in Z carries the unit MPa instead of per cent on the sheet — a transcription error in the template, imported corrected here, with the sheet's wording in `conditions`.",
    ),
  },

  /* --- Die vier mit eigenen Messungen ------------------------------------ */
  {
    id: "alzament-petg", material: "petg", name: "PETG", manual: "149498",
    nozzle: [230, 240], bed: [70, 80], specimen: "printed",
    props: {
      density: q(1.25, "g/cm³", { std: ISO1183, conditions: "23 °C" }),
      meltFlowRate: q(10.8, "g/10min", { conditions: "240 °C, 2,16 kg" }),
      tensileModulusXy: q(2116.8, "MPa", { tolerance: 68.1, std: ISO527, orientation: "XY" }),
      tensileModulusZ: q(1898.7, "MPa", { tolerance: 98.5, std: ISO527, orientation: "Z" }),
      tensileStrengthXy: q(50.8, "MPa", { tolerance: 0.9, std: ISO527, orientation: "XY" }),
      tensileStrengthZ: q(42.8, "MPa", { tolerance: 2.8, std: ISO527, orientation: "Z" }),
      elongationAtBreakXy: q(8.4, "%", { tolerance: 1.7, std: ISO527, orientation: "XY" }),
      elongationAtBreakZ: q(3.3, "%", { tolerance: 0.2, std: ISO527, orientation: "Z" }),
      flexuralModulusXy: q(1898.5, "MPa", { tolerance: 35.5, std: ISO178, orientation: "XY" }),
      flexuralStrengthXy: q(69.6, "MPa", { tolerance: 0.8, std: ISO178, orientation: "XY" }),
      charpyUnnotchedXy: q(2.6, "kJ/m²", { tolerance: 0.2, std: ISO179, orientation: "XY" }),
    },
    features: t(
      "Das einzige der dreizehn Blätter, das seine Prüfkörper beschreibt: gedruckt bei 240 °C Düse, 80 °C Bett, 100 % Infill. Damit ist nicht nur belegt, DASS gedruckt wurde, sondern auch wie — im Bestand sagen das 31 % der Messwerte, hier steht es vollständig. Die Zahlen weichen von Bambu PETG ab und sind eine eigene Messung.",
      "The only one of the thirteen sheets to describe its specimens: printed at 240 °C nozzle, 80 °C bed, 100 % infill. That establishes not merely THAT printing took place but how — across the dataset 31 % of measured values say so, here it is stated in full. The figures differ from Bambu PETG and are an independent measurement.",
    ),
    anomaly: t(
      "Biegemodul und Biegefestigkeit in Z sind mit „N/A“ ausgewiesen, obwohl die Zug- und Dehnungszeilen Z-Werte tragen. Der Grund steht nicht dabei.",
      "Flexural modulus and strength in Z are given as “N/A” although the tensile and elongation rows carry Z values. No reason is stated.",
    ),
  },
  {
    id: "alzament-petg-cf", material: "petg-cf", name: "PETG-CF", manual: "161247",
    nozzle: [250, 280], bed: [70, 80], specimen: "printed",
    props: {
      density: q(1.32, "g/cm³", {
        std: ISO1183,
        conditions: "Blatt schreibt „at 79 °C“ — das ist keine Dichtemessbedingung; das PETG-Blatt derselben Reihe nennt an dieser Stelle 23 °C",
        confidence: "low",
      }),
      meltFlowRate: q(4.3, "g/10min", { conditions: "220 °C, 2,16 kg" }),
      tensileModulusXy: q(3062.7, "MPa", { tolerance: 43.0, std: ISO527, orientation: "XY" }),
      tensileModulusZ: q(2170.3, "MPa", { tolerance: 46.1, std: ISO527, orientation: "Z" }),
      tensileStrengthXy: q(46.1, "MPa", { tolerance: 1.9, std: ISO527, orientation: "XY" }),
      tensileStrengthZ: q(30.3, "MPa", { tolerance: 1.2, std: ISO527, orientation: "Z" }),
      elongationAtBreakXy: q(5.9, "%", { tolerance: 0.7, std: ISO527, orientation: "XY" }),
      elongationAtBreakZ: q(1.6, "%", { tolerance: 1.0, std: ISO527, orientation: "Z" }),
      flexuralModulusXy: q(3013.8, "MPa", { tolerance: 57.1, std: ISO178, orientation: "XY" }),
      flexuralStrengthXy: q(85.1, "MPa", { tolerance: 0.5, std: ISO178, orientation: "XY" }),
      charpyUnnotchedXy: q(3.5, "kJ/m²", { tolerance: 0.5, std: ISO179, orientation: "XY" }),
    },
    anomaly: t(
      "Die Dichte ist mit „1,32 g/cm³ at 79 °C“ angegeben. Bei 79 °C misst niemand eine Filamentdichte, und das PETG-Blatt derselben Reihe schreibt an derselben Stelle 23 °C — vermutlich ein vertippter Zahlendreher. Der Wert trägt deshalb `low`.",
      "The density is given as “1.32 g/cm³ at 79 °C”. Nobody measures filament density at 79 °C, and the PETG sheet of the same series writes 23 °C in the same place — presumably a typo. The value therefore carries `low`.",
    ),
  },
  {
    id: "alzament-pla-cf", material: "pla-cf", name: "PLA-CF", manual: "161248",
    nozzle: [210, 240], bed: [30, 60], specimen: "printed",
    props: {
      density: q(1.22, "g/cm³", { std: ISO1183 }),
      meltFlowRate: q(3.7, "g/10min", { tolerance: 0.6, conditions: "220 °C, 2,16 kg" }),
      tensileModulusXy: q(3280.7, "MPa", { tolerance: 79.6, std: ISO527, orientation: "XY" }),
      tensileModulusZ: q(2213.1, "MPa", { tolerance: 42.9, std: ISO527, orientation: "Z" }),
      tensileStrengthXy: q(31.2, "MPa", { tolerance: 0.7, std: ISO527, orientation: "XY" }),
      tensileStrengthZ: q(15.1, "MPa", { tolerance: 0.7, std: ISO527, orientation: "Z" }),
      elongationAtBreakXy: q(13.2, "%", {
        tolerance: 1.7, std: ISO527, orientation: "XY", confidence: "low",
        conditions: "13,2 % ist für ein kurzfaserverstärktes PLA außergewöhnlich hoch — die übrigen PLA-CF-Belege im Bestand liegen unter 3 %",
      }),
      elongationAtBreakZ: q(0.9, "%", { tolerance: 0.1, std: ISO527, orientation: "Z" }),
      flexuralModulusXy: q(3380.5, "MPa", { tolerance: 52.1, std: ISO178, orientation: "XY" }),
      flexuralStrengthXy: q(51.7, "MPa", { tolerance: 0.6, std: ISO178, orientation: "XY" }),
      charpyUnnotchedXy: q(5.5, "kJ/m²", { tolerance: 0.2, std: ISO179, orientation: "XY" }),
    },
    features: t(
      "Das wertvollste Blatt dieser Marke: Es führt Zugfestigkeit in X-Y UND Z aus demselben Prüfdurchgang — 31,2 gegen 15,1 MPa. Der Werkstofftyp `pla-cf` hatte bisher keinen Anisotropiefaktor; aus diesem Blatt ergibt er sich zu 0,48. Quer zur Schicht bleibt also weniger als die Hälfte der Festigkeit, deutlich weniger als bei ungefülltem PLA (0,89). Das passt zum Mechanismus: Kurzfasern richten sich in Extrusionsrichtung aus und tragen quer dazu nichts bei.",
      "The most valuable sheet of this brand: it carries tensile strength in X-Y AND Z from the same test run — 31.2 against 15.1 MPa. The material type `pla-cf` had no anisotropy factor so far; from this sheet it works out to 0.48. Perpendicular to the layers less than half the strength remains, markedly less than for unfilled PLA (0.89). That fits the mechanism: short fibres align in the extrusion direction and contribute nothing across it.",
    ),
    anomaly: t(
      "Die Bruchdehnung in X-Y steht mit 13,2 % im Blatt. Für ein kurzfaserverstärktes PLA ist das außergewöhnlich hoch — Fasern versteifen und verspröden, die übrigen PLA-CF-Belege im Bestand liegen unter 3 %. Zusammen mit einer für PLA-CF niedrigen Zugfestigkeit von 31,2 MPa liest sich das eher wie ein schwach gefülltes Compound. Der Dehnungswert trägt deshalb `low`.",
      "The elongation at break in X-Y is stated as 13.2 %. For a short-fibre reinforced PLA that is exceptionally high — fibres stiffen and embrittle, and the other PLA-CF records in the dataset lie below 3 %. Together with a tensile strength of 31.2 MPa, low for PLA-CF, this reads more like a lightly filled compound. The elongation value therefore carries `low`.",
    ),
  },
  {
    id: "alzament-hyper-pla-plus", material: "pla", name: "Hyper PLA+", manual: "148631",
    nozzle: [210, 230], bed: [45, 60], specimen: "undeclared",
    props: {
      density: q(1.23, "g/cm³", { std: ISO1183, conditions: "21,5 °C" }),
      meltFlowRate: q(15.5, "g/10min", { conditions: "210 °C, 2,16 kg" }),
      tensileModulusXy: q(2360, "MPa", { tolerance: 30.1, std: ISO527, orientation: "XY" }),
      tensileStrengthXy: q(42.1, "MPa", { tolerance: 0.6, std: ISO527, orientation: "XY" }),
      elongationAtBreakXy: q(23.4, "%", {
        tolerance: 6.3, std: ISO527, orientation: "XY", confidence: "low",
        conditions: "23,4 ± 6,3 % — der Wert ist hoch für ein PLA und seine Streuung beträgt gut ein Viertel des Werts",
      }),
      flexuralModulusXy: q(2688.7, "MPa", { tolerance: 26.1, std: ISO178, orientation: "XY" }),
      flexuralStrengthXy: q(67.5, "MPa", { tolerance: 0.7, std: ISO178, orientation: "XY" }),
      charpyUnnotchedXy: q(22.7, "kJ/m²", {
        tolerance: 2.5, std: ISO179, orientation: "XY",
        conditions: "Blatt schreibt die Einheit als „KJ/²“ — gemeint ist kJ/m², wie in den übrigen Blättern der Reihe",
      }),
    },
    features: t(
      "Bruchdehnung 23,4 % und Schlagzähigkeit 22,7 kJ/m² liegen weit über dem, was ein Standard-PLA erreicht (6,3 % und 3,3 kJ/m² auf dem PLA-Basic-Blatt derselben Marke). Das ist das Profil eines schlagzäh modifizierten PLA, und es deckt sich mit der Vermarktung als Hochgeschwindigkeitsmaterial. Der Werkstofftyp `pla-tough` wäre die genauere Zuordnung — das Blatt sagt aber nur „Hyper PLA“, und eine Modifikation wird nirgends benannt.",
      "Elongation at break of 23.4 % and impact strength of 22.7 kJ/m² lie far above what a standard PLA reaches (6.3 % and 3.3 kJ/m² on the same brand's PLA Basic sheet). That is the profile of an impact-modified PLA and matches its marketing as a high-speed material. The material type `pla-tough` would be the more accurate assignment — but the sheet says only “Hyper PLA” and names no modification.",
    ),
    anomaly: t(
      "Der Einleitungssatz nennt das Produkt „Hyper PLA“, die Verpackung und der Händlereintrag „Hyper PLA+“. Ob das Blatt zu diesem Produkt gehört, sagt es selbst nicht eindeutig.",
      "The introductory sentence names the product “Hyper PLA”, the packaging and the retail listing “Hyper PLA+”. Whether the sheet belongs to this product it does not itself state unambiguously.",
    ),
  },

  /* --- Die zwei in sich fehlerhaften ------------------------------------- */
  {
    id: "alzament-pla-chameleon", material: "pla", name: "PLA Chameleon", manual: "149500",
    nozzle: [190, 230], bed: [45, 60], specimen: "undeclared",
    props: {
      density: q(1.21, "g/cm³", { std: ISO1183, ...LOW }),
      meltFlowRate: q(3.7, "g/10min", {
        tolerance: 0.6, conditions: "220 °C, 2,16 kg — ziffernidentisch mit dem PLA-CF-Blatt derselben Marke", ...LOW,
      }),
      tensileStrengthXy: q(26.1, "MPa", { std: ISO527, orientation: "XY", ...LOW }),
      elongationAtBreakXy: q(3.9, "%", { std: ISO527, orientation: "XY", ...LOW }),
      flexuralStrengthXy: q(115.6, "MPa", {
        std: "GB/T 9341", orientation: "XY", ...LOW,
        conditions: "115,6 MPa ist für ein PLA sehr hoch — das PLA-Basic-Blatt derselben Marke nennt 76 MPa",
      }),
      flexuralModulusXy: q(3303, "MPa", { std: "GB/T 9341", orientation: "XY", ...LOW }),
      hdtB: q(52, "°C", {
        std: "GB/T 1634", ...LOW,
        conditions: "Blatt nennt keine Prüflast; als Methode B geführt, weil 52 °C für ein PLA nur unter der kleinen Last (0,45 MPa) plausibel ist",
      }),
      izodNotchedXy: q(3, "kJ/m²", { std: "GB/T 1843", orientation: "XY", ...LOW }),
    },
    anomaly: t(
      "Drei Befunde an einem Blatt. Erstens: Zugfestigkeit X-Y und Z stehen mit demselben Wert da (26,1 MPa). Ein Anisotropiefaktor von 1,00 kommt bei FDM nicht vor — quer zur Schicht liegt jeder gemessene Werkstoff darunter. Das ist ein Kopierfehler, geprüft an der gerenderten Seite; der Z-Wert ist deshalb NICHT übernommen. Zweitens: Der Einleitungssatz nennt „PLA-CF“ statt PLA Chameleon. Drittens: Der Schmelzindex ist ziffernidentisch mit dem PLA-CF-Blatt derselben Marke. Zusammen ergibt das ein aus einem anderen Blatt zusammengesetztes Dokument — alle Werte tragen `low`.",
      "Three findings on one sheet. First: tensile strength X-Y and Z carry the same value (26.1 MPa). An anisotropy factor of 1.00 does not occur in FDM — every measured material lies below it across the layers. This is a copy error, verified against the rendered page; the Z value is therefore NOT imported. Second: the introductory sentence names “PLA-CF” instead of PLA Chameleon. Third: the melt index is digit-identical with the same brand's PLA-CF sheet. Together this is a document assembled from another one — all values carry `low`.",
    ),
  },
  {
    id: "alzament-pla-plus", material: "pla", name: "PLA+", manual: "148632",
    nozzle: [210, 230], bed: [45, 60], specimen: "undeclared",
    props: {
      density: q(1.23, "g/cm³", { std: "GB/T 1033", ...LOW }),
      glassTransition: q(60, "°C", { std: "DSC", conditions: "10 °C/min", ...LOW }),
      waterAbsorption: q(0.43, "%", { conditions: "25 °C, 55 % rF, gesättigt", ...LOW }),
      tensileStrengthXy: q(63, "MPa", {
        std: "GB/T 1040", orientation: "XY", ...LOW,
        conditions: "Blatt nennt keine Orientierung; hier als X-Y geführt, weil gedruckte Zugproben liegend geprüft werden",
      }),
      elongationAtBreakXy: q(20, "%", { std: "GB/T 1040", orientation: "XY", ...LOW }),
      flexuralModulusXy: q(1973, "MPa", { std: "GB/T 9341", orientation: "XY", ...LOW }),
      flexuralStrengthXy: q(75, "MPa", { std: "GB/T 9341", orientation: "XY", ...LOW }),
      izodNotchedXy: q(9, "kJ/m²", { std: "GB/T 1843", orientation: "XY", ...LOW }),
      hdtB: q(53, "°C", {
        std: "GB/T 1634", ...LOW,
        conditions: "Blatt nennt keine Prüflast; als Methode B geführt, weil 53 °C für ein PLA nur unter der kleinen Last plausibel ist",
      }),
    },
    anomaly: t(
      "Das Blatt trägt die Chemietabelle eines anderen Werkstoffs: Unter „Composition“ steht „Polyvinyl alcohol“ und unter „Solubility“ „Soluble in water“ — das beschreibt PVA, ein wasserlösliches Stützmaterial, nicht PLA. In der Zeile Schmelzindex steht statt eines Messwerts die Prüfbedingung („190 °C/2,16 kg“), der Wert fehlt also ganz. Und anders als die übrigen Blätter der Marke nennt dieses ausschließlich GB/T-Normen, keine ISO-Entsprechungen. Alle Werte tragen `low`; die Zugfestigkeit von 63 MPa ist für ein PLA+ zwar erreichbar, steht hier aber auf einem Blatt, das nachweislich fremde Abschnitte enthält.",
      "The sheet carries another material's chemistry table: under “Composition” it says “Polyvinyl alcohol” and under “Solubility” “Soluble in water” — that describes PVA, a water-soluble support material, not PLA. In the melt index row the test condition (“190 °C/2.16 kg”) stands where the measured value should be, so the value is missing entirely. And unlike the brand's other sheets this one names only GB/T standards, no ISO equivalents. All values carry `low`; a tensile strength of 63 MPa is attainable for a PLA+, but here it stands on a sheet demonstrably containing foreign sections.",
    ),
  },
  {
    id: "alzament-tpu-95a", material: "tpu-95a", name: "TPU 95A", manual: "161249",
    nozzle: [220, 240], bed: null, specimen: "undeclared",
    props: {
      density: q(1.22, "g/cm³", { min: 1.20, max: 1.24, std: "GB/T 1033", ...LOW }),
      meltFlowRate: q(4.5, "g/10min", { min: 3, max: 6, conditions: "210 °C, 1,2 kg", ...LOW }),
      tensileModulusXy: q(29, "MPa", {
        tolerance: 2.8, std: "ISO 37 / GB/T 528", orientation: "XY",
        conditions: "ISO 37 ist die Zugprüfung für Elastomere; das Blatt beschriftet die Zeile als „Young's modulus“",
      }),
      stressAt100Percent: q(9.4, "MPa", { tolerance: 0.3, std: "ISO 37 / GB/T 528", orientation: "XY" }),
      elongationAtBreakXy: q(330.1, "%", { tolerance: 14, std: "ISO 37 / GB/T 528", orientation: "XY" }),
      hardnessShoreA: q(95, "Shore A", { std: "ISO 7619-1 / GB/T 531.1" }),
    },
    anomaly: t(
      "Eine Zugfestigkeit nennt das Blatt nicht — bei einem Elastomer ist gerade sie die Kennzahl, an der man Typen vergleicht. Angegeben sind stattdessen E-Modul, Spannung bei 100 % Dehnung und Bruchdehnung. Die Dichte steht als Spanne (1,20–1,24) und nur nach GB/T 1033, ohne ISO-Entsprechung.",
      "The sheet states no tensile strength — for an elastomer that is precisely the figure by which types are compared. Given instead are modulus, stress at 100 % elongation and elongation at break. The density is a range (1.20–1.24) and cites only GB/T 1033, with no ISO equivalent.",
    ),
  },
];

/* Die drei, die als Sicherheitsdatenblatt vorliegen. Nicht importiert, aber benannt -
   sonst sieht die Arbeitsliste sie beim naechsten Durchlauf wieder als offene Blaetter. */
const SDS_ONLY = [
  ["PETG Hyper", "149499"],
  ["PLA Matte", "149496"],
  ["PLA Silk", "149497"],
];

/* ------------------------------------------------------------------ Ausgabe */

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, nLineage = 0, nZ = 0;
const byMaterial = new Map();

for (const p of P) {
  const url = `https://dwn.alza.cz/manual/${p.manual}`;
  const parts = [];

  if (p.specimen === "printed") {
    parts.push(t(
      "Prüfkörper GEDRUCKT: Das Blatt weist Kennwerte getrennt nach X-Y und Z aus, und eine Z-Richtung gibt es nur an einem additiv gefertigten Prüfkörper.",
      "Specimens PRINTED: the sheet reports values separately for X-Y and Z, and a Z direction exists only on an additively manufactured specimen.",
    ));
  } else {
    parts.push(t(
      "Prüfkörper nicht deklariert — das Blatt sagt nicht, ob an gedruckten oder spritzgegossenen Proben gemessen wurde, und weist auch keine Z-Werte aus, aus denen es sich ableiten ließe.",
      "Specimen not declared — the sheet does not say whether printed or moulded specimens were measured, and reports no Z values from which it could be inferred.",
    ));
  }
  if (p.lineage) parts.push(BAMBU_LINEAGE);
  if (p.anomaly) parts.push(t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`, `Finding on this datasheet: ${p.anomaly.en}`));

  const props = { ...p.props };
  props.nozzleTemperature = q(Math.round((p.nozzle[0] + p.nozzle[1]) / 2), "°C",
    { min: p.nozzle[0], max: p.nozzle[1], conditions: "Herstellerempfehlung" });
  if (p.bed) {
    props.bedTemperature = q(Math.round((p.bed[0] + p.bed[1]) / 2), "°C",
      { min: p.bed[0], max: p.bed[1], conditions: "Herstellerempfehlung" });
  }

  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "Alzament", manufacturer: "Landu Innovations Technology Co., Ltd. (Shenzhen) für Alza.cz, a.s. (Prag)",
    productName: p.name, origin: "China (Handelsmarke Tschechien)",
    specimenType: p.specimen,
    specimenNote: t(parts.map((x) => x.de).join("\n\n"), parts.map((x) => x.en).join("\n\n")),
    features: p.features ?? OEM,
    datasheet: { title: `Alzament ${p.name} — Technical Data Sheet`, url, retrievedAt: RETRIEVED },
    productUrl: "https://alzament.com",
    properties: props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Alzament (Alza.cz, a.s.)",
        productName: p.name, title: `Alzament ${p.name} — Technical Data Sheet`,
        url, retrievedAt: RETRIEVED,
        confidenceCeiling: p.lineage ? "low" : "medium",
        note: p.lineage
          ? t("Englischsprachiges Herstellerdatenblatt mit Textebene. Der Zeilenvergleich weist es als Wiedergabe des Bambu-Blattes desselben Werkstoffs aus — deshalb Obergrenze `low`, siehe Befund am Datensatz.",
              "English-language manufacturer datasheet with text layer. The row-by-row comparison identifies it as a rendering of the Bambu sheet for the same material — hence ceiling `low`, see the finding on the record.")
          : t("Englischsprachiges Herstellerdatenblatt mit Textebene. Eigene Messung; die Werte weichen von den Bambu-Blättern derselben Werkstoffe ab.",
              "English-language manufacturer datasheet with text layer. Independent measurement; the values differ from the Bambu sheets for the same materials."),
      }],
    },
  };

  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  if (p.lineage) nLineage++;
  if (props.tensileStrengthZ) nZ++;
  byMaterial.set(p.material, (byMaterial.get(p.material) ?? 0) + 1);
}

console.log(`${n} Alzament-Produkte geschrieben - neue Marke im Bestand.`);
console.log(`  ${nZ} mit Z-Zugfestigkeit aus demselben Pruefdurchgang · ${nLineage} als Bambu-Wiedergabe markiert\n`);
console.log("  Werkstofftyp   Produkte");
for (const [m, c] of [...byMaterial.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(14)}${String(c).padStart(4)}`);
}
console.log("\n  Der Fund: ABS, ASA und PLA Basic sind zeilenweise die Bambu-Blaetter -");
console.log("  10 von 14 Zeilen ziffernidentisch, samt Toleranzen und samt dem Tippfehler");
console.log("  \"MPA\". Sie tragen durchgaengig `low`, damit sie nicht als zweite Messung");
console.log("  gelesen werden.\n");
console.log("  Der Gewinn: PLA-CF fuehrt 31,2 MPa in X-Y gegen 15,1 MPa in Z und schliesst");
console.log("  damit die Anisotropie-Luecke dieses Werkstofftyps (Faktor 0,48).\n");
console.log(`  Nicht importiert - Sicherheitsdatenblatt statt technischem Blatt:`);
for (const [name, id] of SDS_ONLY) {
  console.log(`    ${name.padEnd(12)} https://dwn.alza.cz/manual/${id}`);
}
console.log("  Die OFD fuehrt diese drei unter `data_sheet_url`; sie enthalten GHS-Einstufung");
console.log("  und Loeschmittel, aber keinen einzigen mechanischen Kennwert.");
