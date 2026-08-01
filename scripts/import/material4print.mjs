/**
 * Import: Material 4 Print GmbH & Co. KG (Deutschland).
 *
 * Quelle: Materialdatenblätter von material4print.de, Stand 12.04.2021, vom Betreiber
 * dieses Projekts bereitgestellt (die Datenblattseite blockt automatisierte Abrufe).
 *
 * DER GRUND, WARUM DIESE MARKE WICHTIG IST:
 * Unter jedem Blatt steht wörtlich "These data were taken from the raw material
 * manufacturer." Material4Print ist damit der erste Hersteller dieser Datenbank, der
 * OFFEN erklärt, dass die Kennwerte vom Rohstofflieferanten stammen und nicht an
 * gedruckten Bauteilen gemessen wurden. Das ist keine Schwäche des Datenblatts, sondern
 * seine Stärke — andere veröffentlichen dieselbe Art von Zahlen ohne den Hinweis.
 * specimenType steht deshalb auf "moulded", und zwar erklärt statt erschlossen.
 *
 * Die einzige Ausnahme ist Tough PLA: dort steht als Fussnote an der Kennwerttabelle
 * "3D printet part with 100% in-fill" — im Widerspruch zur Fusszeile derselben Seite.
 * Der Widerspruch ist dokumentiert.
 *
 * ESD: Mit ESD-PLA, ESD-ABS und ESD-PETG bekommt die Datenbank erstmals STEIFE
 * ESD-Werkstoffe. Bisher konnte eine ESD-Anforderung nur mit einem Elastomer bedient
 * werden, was für Gehäuse und Vorrichtungen keine Antwort ist.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-01";
const SHEET_DATE = "2021-04-12";
const DOCS = "https://www.material4print.de/pages/materialdatenblatter";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: o.source ?? "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});
const rating = (value, scale) => ({ value, scale, source: "estimate_reasoning", confidence: "estimated" });
const flag = (value, o = {}) => ({ value, source: o.source ?? "estimate_reasoning", confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}) });
const choice = (value, o = {}) => ({ value, source: o.source ?? "estimate_reasoning", confidence: o.confidence ?? "estimated", ...(o.note ? { note: o.note } : {}) });

/* ">10^6 - 10^8<" heisst: zwischen 1e6 und 1e8 Ohm — das ist der ableitfaehige Bereich. */
const ESD_OHM = { value: 1e7, min: 1e6, max: 1e8 };

/* ============================================================== PRODUKTE ==== */

const P = [
  { id: "m4p-pla", material: "pla", name: "M4P PLA", file: "PLA", specimen: "moulded",
    props: {
      tensileStrengthXy: q(60, "MPa", { std: "ASTM D882", confidence: "low" }),
      tensileModulusXy: q(3610, "MPa", { std: "ASTM D882", confidence: "low" }),
      flexuralModulusXy: q(3830, "MPa", { std: "ASTM D790" }),
      izodNotchedXy: q(16, "J/m", { std: "ASTM D256" }),
      hdtB: q(57.5, "°C", { min: 55, max: 60, std: "ASTM D648" }),
      density: q(1.24, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
      bedTemperature: q(50, "°C", { min: 40, max: 60 }),
    },
    anomaly: t("Das Blatt nennt 160 % Bruchdehnung für PLA. PLA reisst bei etwa 3 bis 6 %; 160 % erreicht kein PLA-Formteil. Der Grund steht in der Methodenspalte: geprüft wurde nach ASTM D882, einer Norm für dünne FOLIEN. Gereckte Folie erreicht solche Werte, ein Zugstab nicht. Die Bruchdehnung wurde deshalb nicht übernommen; Zugfestigkeit und E-Modul stammen aus derselben Folienprüfung und tragen nur 'low'.",
               "The sheet states 160 % elongation at break for PLA. PLA breaks at about 3 to 6 %; no PLA moulding reaches 160 %. The reason is in the method column: it was tested to ASTM D882, a standard for thin FILM. Drawn film reaches such values, a tensile bar does not. Elongation was therefore not imported; tensile strength and modulus come from the same film test and carry only 'low'.") },

  { id: "m4p-petg", material: "petg", name: "M4P PETG", file: "PETG", specimen: "moulded",
    props: {
      tensileStrengthXy: q(53, "MPa", { std: "ASTM D638" }),
      elongationAtBreakXy: q(70, "%", { std: "ASTM D638" }),
      flexuralModulusXy: q(2150, "MPa", { std: "ASTM D790" }),
      hdtB: q(70, "°C", { std: "ASTM D648" }),
      density: q(1.27, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(247, "°C", { min: 235, max: 260 }),
      bedTemperature: q(70, "°C", { min: 60, max: 80 }),
    } },

  { id: "m4p-abs", material: "abs", name: "M4P ABS", file: "ABS", specimen: "moulded",
    props: {
      tensileStrengthXy: q(32, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(20, "%", { std: "ISO 527" }),
      flexuralModulusXy: q(1900, "MPa", { std: "ISO 178" }),
      izodNotchedXy: q(180, "J/m", { std: "ISO 180-1A" }),
      hdtA: q(81, "°C", { std: "ISO 75/A" }),
      density: q(1.04, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(255, "°C", { min: 240, max: 270 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    } },

  { id: "m4p-asa", material: "asa", name: "M4P ASA", file: "ASA", specimen: "moulded",
    props: {
      tensileStrengthXy: q(50, "MPa", { std: "DIN EN ISO 527" }),
      elongationAtBreakXy: q(20, "%", { std: "DIN EN ISO 527" }),
      flexuralModulusXy: q(2300, "MPa", { std: "DIN EN ISO 178" }),
      hdtA: q(84, "°C", { std: "DIN EN ISO 75/1" }),
      density: q(1.06, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(255, "°C", { min: 240, max: 270 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    } },

  { id: "m4p-tough-pla", material: "pla-tough", name: "M4P Tough PLA", file: "Tough_PLA", specimen: "printed",
    props: {
      tensileStrengthXy: q(40, "MPa", { std: "ASTM D638 (Bruchspannung)", conditions: "gedrucktes Bauteil, 100 % Infill" }),
      tensileModulusXy: q(2870, "MPa", { std: "ASTM D638", conditions: "gedrucktes Bauteil, 100 % Infill" }),
      flexuralStrengthXy: q(73, "MPa", { std: "ASTM D790", conditions: "gedrucktes Bauteil, 100 % Infill" }),
      flexuralModulusXy: q(2410, "MPa", { std: "ASTM D790", conditions: "gedrucktes Bauteil, 100 % Infill" }),
      izodNotchedXy: q(160, "J/m", { std: "ASTM D256", conditions: "gedrucktes Bauteil, 100 % Infill",
        note: t("Getempert (110 °C, 15 min) nennt das Blatt 230 J/m statt 160 J/m — ein Plus von 44 %.",
                "Annealed (110 °C, 15 min) the sheet states 230 J/m instead of 160 J/m — a gain of 44 %.") }),
      hdtB: q(75, "°C", { std: "ASTM E2092", conditions: "gedrucktes Bauteil, 100 % Infill",
        note: t("Getempert (110 °C, 15 min) nennt das Blatt 85 °C statt 75 °C.",
                "Annealed (110 °C, 15 min) the sheet states 85 °C instead of 75 °C.") }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "ASTM D3418" }),
      density: q(1.22, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(217, "°C", { min: 205, max: 230 }),
      bedTemperature: q(52, "°C", { min: 40, max: 65 }),
    },
    anomaly: t("Dieses Blatt widerspricht sich auf derselben Seite. An der Kennwerttabelle steht als Fussnote „3D printet part with 100% in-fill“, in der Fusszeile darunter der auf allen Material4Print-Blättern gleiche Satz „These data were taken from the raw material manufacturer“. Beides kann nicht zutreffen. Wir folgen der spezifischen Fussnote an der Tabelle und führen den Datensatz als gedruckten Prüfkörper — die Fusszeile erscheint unverändert auf allen 14 Blättern und ist damit erkennbar Standardtext.",
               "This sheet contradicts itself on the same page. The properties table carries the footnote “3D printet part with 100% in-fill”, while the page footer below states the sentence common to all Material4Print sheets, “These data were taken from the raw material manufacturer”. Both cannot hold. We follow the specific footnote on the table and record the dataset as a printed specimen — the footer appears unchanged on all 14 sheets and is therefore recognisably boilerplate."),
    features: t("Der einzige Datensatz dieser Marke an einem gedruckten Bauteil — und einer der wenigen überhaupt mit Temper-Werten in Klammern: Schlagzähigkeit 160 auf 230 J/m, Wärmeformbeständigkeit 75 auf 85 °C nach 15 Minuten bei 110 °C.",
                "The only dataset from this brand on a printed part — and one of the few anywhere with annealed values in brackets: impact 160 to 230 J/m, heat deflection 75 to 85 °C after 15 minutes at 110 °C.") },

  { id: "m4p-pmma", material: "pmma", name: "M4P PMMA", file: "PMMA", specimen: "moulded",
    props: {
      tensileStrengthXy: q(35, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(49, "%", { std: "ISO 527" }),
      flexuralModulusXy: q(1800, "MPa", { std: "ISO 178" }),
      hdtB: q(77, "°C", { std: "ISO 75" }),
      glassTransition: q(105, "°C", { std: "ISO 11357-2" }),
      density: q(1.17, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(255, "°C", { min: 240, max: 270 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    features: t("49 % Bruchdehnung sind für PMMA aussergewöhnlich — klassisches Acrylglas bricht bei 2 bis 5 %. Der Wert deutet auf ein schlagzähmodifiziertes Compound hin. Glasübergang 105 °C bei einem transparenzfähigen Werkstoff ist der eigentliche Grund, PMMA zu wählen.",
                "49 % elongation is exceptional for PMMA — classic acrylic breaks at 2 to 5 %. The value points to an impact-modified compound. A glass transition of 105 °C in a material capable of transparency is the actual reason to choose PMMA.") },

  { id: "m4p-abs-pc", material: "abs-pc", name: "M4P ABS-PC", file: "ABS-PC", specimen: "moulded",
    props: {
      tensileStrengthXy: q(54, "MPa", { std: "ISO 527 (Bruchspannung)" }),
      elongationAtBreakXy: q(4.4, "%", { std: "ISO 527" }),
      flexuralModulusXy: q(2400, "MPa", { std: "ISO 527" }),
      hdtA: q(122, "°C", { std: "ISO 75-1/-2" }),
      glassTransition: q(100, "°C"),
      density: q(1.13, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }),
      bedTemperature: q(105, "°C", { min: 90, max: 120 }),
    },
    features: t("122 °C Wärmeformbeständigkeit — und zwar der Wert unter Last, nicht der geschmeichelte. Damit liegt das Blend über jedem ABS und über den meisten PC-Typen dieser Datenbank bei gleichzeitig moderateren Druckanforderungen als reines PC.",
                "122 °C heat deflection — and that is the value under load, not the flattering one. The blend therefore sits above every ABS and above most PC grades in this database, while asking less of the printer than pure PC.") },

  { id: "m4p-pet-cf", material: "pet-cf", name: "M4P PET-CF", file: "PET-CF", specimen: "moulded",
    props: {
      tensileStrengthXy: q(80, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(2.5, "%", { std: "ISO 527 (bei Höchstkraft)" }),
      tensileModulusXy: q(9000, "MPa", { std: "ISO 527" }),
      flexuralStrengthXy: q(130, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(8000, "MPa", { std: "ISO 178" }),
      charpyUnnotchedXy: q(40, "kJ/m²", { std: "ISO 179 1eU" }),
      density: q(1.4, "g/cm³", { std: "ASTM D792" }),
      waterAbsorption: q(0.3, "%", { std: "< 0,3 %" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }),
      bedTemperature: q(90, "°C", { min: 80, max: 100 }),
    } },

  { id: "m4p-paht", material: "paht", name: "M4P PAHT", file: "PAHT", specimen: "moulded",
    props: {
      tensileStrengthXy: q(85, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(3.6, "%", { std: "ISO 527" }),
      tensileModulusXy: q(3400, "MPa", { std: "ISO 527" }),
      hdtA: q(90, "°C", { std: "ISO 75" }),
      nozzleTemperature: q(275, "°C", { min: 260, max: 290 }),
      bedTemperature: q(70, "°C", { min: 60, max: 80 }),
    },
    features: t("Die seltenste Angabe im ganzen Bestand: eine Dauergebrauchstemperatur mit Zeitangabe. 120 °C über 20.000 Stunden nach IEC 60216, kurzzeitig bis 160 °C für maximal 200 Stunden. Im ungekerbten Schlagversuch kein Bruch. Oberflächenwiderstand über 10^12 Ohm, also isolierend.",
                "The rarest statement in the whole database: a continuous service temperature with a time base. 120 °C over 20,000 hours to IEC 60216, and up to 160 °C short-term for at most 200 hours. No break in the unnotched impact test. Surface resistance above 10^12 ohm, i.e. insulating.") },

  { id: "m4p-paht-cf", material: "paht-cf", name: "M4P PAHT-CF", file: "PAHT-CF", specimen: "moulded",
    props: {
      tensileStrengthXy: q(120, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(2, "%", { std: "ISO 527" }),
      tensileModulusXy: q(10500, "MPa", { std: "ISO 527" }),
      charpyUnnotchedXy: q(35, "kJ/m²", { std: "ISO 179 1eU" }),
      hdtA: q(90, "°C", { std: "ISO 75" }),
      nozzleTemperature: q(280, "°C", { min: 270, max: 290 }),
      bedTemperature: q(90, "°C", { min: 80, max: 100 }),
    },
    features: t("10,5 GPa Zug-E-Modul und 120 MPa Festigkeit sind die höchsten Werte dieser Datenbank. Bemerkenswert daneben: Der Oberflächenwiderstand von 10^8 bis 10^10 Ohm liegt im ableitfähigen Bereich — anders als bei den meisten carbonverstärkten Werkstoffen ist das hier gemessen und nicht behauptet.",
                "10.5 GPa tensile modulus and 120 MPa strength are the highest values in this database. Also notable: the surface resistance of 10^8 to 10^10 ohm sits in the dissipative range — unlike most carbon-reinforced materials, here it is measured rather than asserted.") },

  { id: "m4p-tpu-98a", material: "tpu-98a", name: "M4P TPU 98A", file: "TPU_98A", specimen: "moulded",
    props: {
      tensileStrengthXy: q(40, "MPa", { std: "ISO 527-2/5A/500" }),
      vicatA: q(116, "°C", { std: "ISO 306 (A50)" }),
      hardnessShoreA: q(98, "Shore A", { std: "ISO 868" }),
      tearStrength: q(175, "kN/m", { std: "ISO 34-1B" }),
      abrasionLoss: q(25, "mm³", { std: "ISO 4649-A" }),
      nozzleTemperature: q(225, "°C", { min: 215, max: 235 }),
      bedTemperature: q(42, "°C", { min: 35, max: 50 }),
    },
    features: t("Praktisch deckungsgleich mit Extrudr Flex Medium (Shore 98A, Weiterreissfestigkeit 170 gegen 175 kN/m, Abrieb 25 mm³). Zwei Marken, ein Grundpolymer — genau die Erkenntnis, für die ein Herstellervergleich da ist.",
                "Practically identical to Extrudr Flex Medium (Shore 98A, tear strength 170 against 175 kN/m, abrasion 25 mm³). Two brands, one base polymer — precisely the insight a manufacturer comparison exists for.") },

  { id: "m4p-esd-pla", material: "esd-pla", name: "M4P ESD-PLA", file: "ESD-PLA", specimen: "moulded",
    props: {
      tensileStrengthXy: q(37, "MPa", { std: "DIN 53455" }),
      tensileModulusXy: q(2150, "MPa", { std: "DIN 53457" }),
      flexuralModulusXy: q(3800, "MPa", { std: "ASTM D790" }),
      hdtB: q(67.5, "°C", { min: 65, max: 70, std: "ASTM D648" }),
      nozzleTemperature: q(220, "°C", { min: 210, max: 230 }),
      bedTemperature: q(52, "°C", { min: 40, max: 65 }),
    } },

  { id: "m4p-esd-abs", material: "esd-abs", name: "M4P ESD-ABS", file: "ESD-ABS", specimen: "moulded",
    props: {
      tensileStrengthXy: q(40, "MPa", { std: "ISO 527 (Streckspannung)" }),
      elongationAtBreakXy: q(10, "%", { std: "ISO 527" }),
      elongationAtYieldXy: q(4, "%", { std: "ISO 527" }),
      flexuralModulusXy: q(1900, "MPa", { std: "ISO 178" }),
      hdtB: q(88, "°C", { std: "ISO 75/Bf" }),
      nozzleTemperature: q(262, "°C", { min: 250, max: 275 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    features: t("88 °C Wärmeformbeständigkeit machen ESD-ABS zum wärmefestesten ableitfähigen Werkstoff dieser Datenbank — für Vorrichtungen und Gehäuse in der Elektronikfertigung, wo TPU-ESD zu weich ist.",
                "88 °C heat deflection makes ESD-ABS the most heat-resistant dissipative material in this database — for jigs and enclosures in electronics manufacturing where TPU-ESD is too soft.") },

  { id: "m4p-esd-petg", material: "esd-petg", name: "M4P ESD-PETG", file: "ESD-PETG", specimen: "moulded",
    props: {
      tensileStrengthXy: q(53, "MPa", { std: "ASTM D638" }),
      elongationAtBreakXy: q(70, "%", { std: "ASTM D638" }),
      flexuralModulusXy: q(2150, "MPa", { std: "ASTM D790" }),
      hdtB: q(70, "°C", { std: "ASTM D648" }),
      density: q(1.27, "g/cm³", { std: "ASTM D792" }),
      nozzleTemperature: q(247, "°C", { min: 235, max: 260 }),
      bedTemperature: q(70, "°C", { min: 60, max: 80 }),
    },
    anomaly: t("Sämtliche mechanischen und thermischen Kennwerte stimmen mit dem unmodifizierten M4P PETG überein — Dichte, Bruchdehnung, Biegemodul, Schmelzbereich und Wärmeformbeständigkeit. Ein ESD-Compound entsteht durch Zugabe leitfähiger Füllstoffe, was Steifigkeit und Bruchdehnung regelmässig verändert. Die Übereinstimmung spricht dafür, dass die mechanischen Werte vom Grundtyp übernommen und nicht am ESD-Compound gemessen wurden. Der Oberflächenwiderstand ist davon nicht betroffen.",
               "All mechanical and thermal values match unmodified M4P PETG — density, elongation, flexural modulus, melting range and heat deflection. An ESD compound is created by adding conductive fillers, which regularly changes stiffness and elongation. The match suggests the mechanical values were carried over from the base grade rather than measured on the ESD compound. The surface resistance is unaffected by this.") },
];

/* =========================================================== NEUE TYPEN ==== */

const NEW_MATERIALS = {
  "pmma": {
    name: "PMMA", family: "PMMA", polymerClass: "amorphous", variant: ["basic", "translucent"],
    aliases: ["Acrylglas", "Polymethylmethacrylat", "Plexiglas", "Acryl"],
    abstract: t("PMMA ist der Werkstoff für lichtführende und transparenzfähige Bauteile: Glasübergang 105 °C, hohe Witterungs- und UV-Beständigkeit, schleif- und polierbar. Die hier erfasste Type ist schlagzähmodifiziert (49 % Bruchdehnung statt der 2 bis 5 % von klassischem Acrylglas). Grenzen: geringe Festigkeit von 35 MPa, kerbempfindlich, und im FDM-Druck wird echte Transparenz durch die Schichtstruktur nie erreicht.",
                "PMMA is the material for light-guiding and translucency-capable parts: glass transition 105 °C, high weather and UV resistance, sandable and polishable. The grade recorded here is impact-modified (49 % elongation instead of the 2 to 5 % of classic acrylic). Limits: low strength of 35 MPa, notch sensitive, and in FDM printing true transparency is never reached because of the layer structure."),
    positioning: t("Wenn Licht durch soll — mit der ehrlichen Einschränkung, dass FDM keine Klarsicht liefert.",
                   "When light has to pass through — with the honest caveat that FDM does not deliver clarity."),
    tensile: 35, elong: 49, hdtA: 77, tg: 105, density: 1.17, flexMod: 1800,
    nozzle: [240, 270], bed: [90, 110], chamber: "recommended", dry: [80, 4],
    ul94: "HB", translucency: "translucent",
    ratings: { printability: 2, warpingTendency: 3, hygroscopy: 3, abrasiveness: 1, toughness: 2,
      notchSensitivity: 5, uvResistance: 5, weatherResistance: 5, surfaceQuality: 4, paintAdhesion: 3,
      bondability: 4, priceIndex: 4, availability: 2, smallSeriesSuitability: 3 },
  },
  "abs-pc": {
    name: "ABS-PC", family: "PC", polymerClass: "amorphous", variant: ["blend"],
    aliases: ["ABS/PC", "PC/ABS", "Polycarbonat-ABS-Blend", "Bayblend"],
    abstract: t("ABS-PC verbindet die Verarbeitbarkeit von ABS mit der Wärmeformbeständigkeit von Polycarbonat: 122 °C unter 1,8 MPa Last — mehr als jedes ABS und mehr als die meisten PC-Typen dieser Datenbank. Für Gehäuse und Halterungen mit Wärmebelastung, die sich nicht wie reines PC drucken lassen sollen. Grenzen: nur 4,4 % Bruchdehnung, braucht Kammer und Trocknung.",
                "ABS-PC combines the processability of ABS with the heat resistance of polycarbonate: 122 °C under 1.8 MPa load — more than any ABS and more than most PC grades in this database. For housings and brackets under heat that should not print like pure PC. Limits: only 4.4 % elongation, needs a chamber and drying."),
    positioning: t("Die Wärmeformbeständigkeit von PC, ohne dessen Zickigkeit beim Drucken.",
                   "The heat resistance of PC without its temperament on the printer."),
    tensile: 54, elong: 4.4, hdtA: 122, tg: 100, density: 1.13, flexMod: 2400,
    nozzle: [260, 290], bed: [90, 120], chamber: "mandatory", dry: [90, 6],
    ratings: { printability: 2, warpingTendency: 4, hygroscopy: 4, abrasiveness: 1, toughness: 3,
      notchSensitivity: 3, uvResistance: 2, weatherResistance: 2, surfaceQuality: 3, paintAdhesion: 3,
      bondability: 4, priceIndex: 4, availability: 2, smallSeriesSuitability: 3 },
  },
  "paht": {
    name: "PAHT", family: "PA", polymerClass: "semi-crystalline", variant: ["high-temp"],
    aliases: ["Hochtemperatur-Polyamid", "PA HT", "PPA", "High Temperature Polyamide"],
    abstract: t("PAHT ist ein Hochtemperatur-Polyamid mit der seltensten Angabe überhaupt: einer Dauergebrauchstemperatur MIT Zeitbasis — 120 °C über 20.000 Stunden nach IEC 60216, kurzzeitig 160 °C für maximal 200 Stunden. 85 MPa Festigkeit, im ungekerbten Schlagversuch kein Bruch. Für dauerwarme Funktionsteile im Motorraum und in der Anlagentechnik. Grenzen: stark hygroskopisch, Kammer und Trocknung zwingend.",
                "PAHT is a high-temperature polyamide with the rarest statement of all: a continuous service temperature WITH a time base — 120 °C over 20,000 hours to IEC 60216, and 160 °C short-term for at most 200 hours. 85 MPa strength, no break in the unnotched impact test. For permanently warm functional parts in engine bays and plant engineering. Limits: strongly hygroscopic, chamber and drying mandatory."),
    positioning: t("Dauerwarm statt kurz heiss — der einzige Werkstoff hier mit belegter Lebensdauer.",
                   "Permanently warm rather than briefly hot — the only material here with a documented service life."),
    tensile: 85, elong: 3.6, modulus: 3400, hdtA: 90, density: 1.15,
    nozzle: [260, 290], bed: [60, 80], chamber: "mandatory", dry: [100, 10],
    serviceTemp: 120,
    ratings: { printability: 2, warpingTendency: 4, hygroscopy: 5, abrasiveness: 1, toughness: 4,
      creepTendency: 2, notchSensitivity: 2, wearResistance: 4, uvResistance: 2, weatherResistance: 3,
      hydrolysisResistance: 3, surfaceQuality: 3, paintAdhesion: 1, bondability: 2,
      priceIndex: 5, availability: 2, smallSeriesSuitability: 2 },
  },
  "paht-cf": {
    name: "PAHT-CF", family: "PA", polymerClass: "semi-crystalline", variant: ["high-temp", "CF"],
    aliases: ["PAHT Carbon", "Hochtemperatur-Polyamid carbonfaserverstärkt", "PPA-CF"],
    abstract: t("PAHT-CF ist der steifste und festeste Werkstoff dieser Datenbank: 10,5 GPa Zug-E-Modul und 120 MPa Festigkeit, dazu 120 °C Dauergebrauchstemperatur über 20.000 Stunden. Zusätzlich ableitfähig mit 10^8 bis 10^10 Ohm — gemessen, nicht behauptet. Für hochbelastete, dauerwarme Metallersatzteile. Grenzen: 2 % Bruchdehnung, abrasiv, Kammer und Trocknung zwingend, teuer.",
                "PAHT-CF is the stiffest and strongest material in this database: 10.5 GPa tensile modulus and 120 MPa strength, plus 120 °C continuous service over 20,000 hours. Also dissipative at 10^8 to 10^10 ohm — measured, not asserted. For highly loaded, permanently warm metal-replacement parts. Limits: 2 % elongation, abrasive, chamber and drying mandatory, expensive."),
    positioning: t("Das Ende der Fahnenstange bei Steifigkeit — und zufällig auch noch ableitfähig.",
                   "The top of the stiffness range — and dissipative into the bargain."),
    tensile: 120, elong: 2, modulus: 10500, hdtA: 90, density: 1.25,
    nozzle: [270, 290], bed: [80, 100], chamber: "mandatory", dry: [100, 10], abrasive: true,
    serviceTemp: 120, esd: "dissipative", esdOhm: { value: 1e9, min: 1e8, max: 1e10 },
    ratings: { printability: 1, warpingTendency: 4, hygroscopy: 5, abrasiveness: 5, toughness: 2,
      creepTendency: 1, notchSensitivity: 4, wearResistance: 5, uvResistance: 2, weatherResistance: 3,
      hydrolysisResistance: 3, surfaceQuality: 2, paintAdhesion: 1, bondability: 2,
      priceIndex: 5, availability: 1, smallSeriesSuitability: 1 },
  },
  "esd-pla": {
    name: "ESD-PLA", family: "PLA", polymerClass: "semi-crystalline", variant: ["ESD"],
    aliases: ["ableitfähiges PLA", "antistatisches PLA", "PLA ESD"],
    abstract: t("ESD-PLA ist der einfachste Einstieg in ableitfähige Bauteile: Oberflächenwiderstand 10^6 bis 10^8 Ohm, gedruckt wie normales PLA ohne Kammer. Für Ablagen, Einsätze und Handhabungshilfen in der Elektronikfertigung. Grenzen: nur 65 bis 70 °C Wärmeformbeständigkeit, damit nicht für Lötnähe oder dauerwarme Umgebungen geeignet.",
                "ESD-PLA is the simplest entry into dissipative parts: surface resistance 10^6 to 10^8 ohm, printed like normal PLA without a chamber. For trays, inserts and handling aids in electronics manufacturing. Limits: only 65 to 70 °C heat deflection, so unsuitable near soldering or in permanently warm environments."),
    positioning: t("Ableitfähig ohne Kammer — solange es nicht warm wird.",
                   "Dissipative without an enclosure — as long as it does not get warm."),
    tensile: 37, modulus: 2150, hdtA: 67, density: 1.24, flexMod: 3800,
    nozzle: [210, 230], bed: [40, 65], chamber: "not-required", dry: [50, 4],
    esd: "dissipative", esdOhm: ESD_OHM,
    ratings: { printability: 4, warpingTendency: 1, hygroscopy: 2, abrasiveness: 3, toughness: 2,
      notchSensitivity: 4, uvResistance: 2, weatherResistance: 2, surfaceQuality: 3, paintAdhesion: 3,
      bondability: 3, priceIndex: 4, availability: 2, smallSeriesSuitability: 3 },
  },
  "esd-abs": {
    name: "ESD-ABS", family: "ABS", polymerClass: "amorphous", variant: ["ESD"],
    aliases: ["ableitfähiges ABS", "antistatisches ABS", "ABS ESD"],
    abstract: t("ESD-ABS ist der wärmefesteste ableitfähige Werkstoff dieser Datenbank: 88 °C Wärmeformbeständigkeit bei 10^6 bis 10^8 Ohm Oberflächenwiderstand. Für Vorrichtungen, Aufnahmen und Gehäuse in der Elektronikfertigung, bei denen ESD-PLA zu weich und TPU-ESD zu nachgiebig ist. Grenzen: braucht geschlossenen Bauraum, Verzugsneigung wie ABS.",
                "ESD-ABS is the most heat-resistant dissipative material in this database: 88 °C heat deflection at 10^6 to 10^8 ohm surface resistance. For jigs, fixtures and enclosures in electronics manufacturing where ESD-PLA is too soft and TPU-ESD too compliant. Limits: needs an enclosure, warping tendency as with ABS."),
    positioning: t("Die steife, warmfeste Antwort auf eine ESD-Anforderung.",
                   "The rigid, heat-resistant answer to an ESD requirement."),
    tensile: 40, elong: 10, hdtB: 88, density: 1.06, flexMod: 1900,
    nozzle: [250, 275], bed: [90, 110], chamber: "mandatory", dry: [80, 4],
    esd: "dissipative", esdOhm: ESD_OHM,
    ratings: { printability: 2, warpingTendency: 4, hygroscopy: 3, abrasiveness: 3, toughness: 3,
      notchSensitivity: 3, uvResistance: 1, weatherResistance: 2, surfaceQuality: 3, paintAdhesion: 4,
      bondability: 4, priceIndex: 4, availability: 2, smallSeriesSuitability: 3 },
  },
  "esd-petg": {
    name: "ESD-PETG", family: "PETG", polymerClass: "amorphous", variant: ["ESD"],
    aliases: ["ableitfähiges PETG", "antistatisches PETG", "PETG ESD"],
    abstract: t("ESD-PETG ist der Kompromiss zwischen Druckbarkeit und Wärme: 70 °C Wärmeformbeständigkeit bei 10^6 bis 10^8 Ohm, ohne Kammer druckbar. Für Ablagen, Trennwände und Sichtteile in ESD-Bereichen. Grenzen: Die mechanischen Kennwerte des Datenblatts stimmen mit dem unmodifizierten PETG überein, was auf übernommene statt gemessene Werte hindeutet.",
                "ESD-PETG is the compromise between printability and heat: 70 °C heat deflection at 10^6 to 10^8 ohm, printable without an enclosure. For trays, dividers and visible parts in ESD areas. Limits: the mechanical values in the datasheet match unmodified PETG, which suggests carried-over rather than measured values."),
    positioning: t("Ableitfähig, ohne Kammer, mit etwas mehr Wärmereserve als ESD-PLA.",
                   "Dissipative, no enclosure, with a little more thermal headroom than ESD-PLA."),
    tensile: 53, elong: 70, hdtB: 70, density: 1.27, flexMod: 2150,
    nozzle: [235, 260], bed: [60, 80], chamber: "not-required", dry: [65, 4],
    ul94: "HB", esd: "dissipative", esdOhm: ESD_OHM,
    ratings: { printability: 4, warpingTendency: 2, hygroscopy: 3, abrasiveness: 3, toughness: 3,
      notchSensitivity: 2, uvResistance: 3, weatherResistance: 3, surfaceQuality: 3, paintAdhesion: 2,
      bondability: 3, priceIndex: 4, availability: 2, smallSeriesSuitability: 3 },
  },
};

/* ============================================================== schreiben === */

const SRC_ID = "src_m4p_tds";
const outP = path.join(ROOT, "data/products");
const outM = path.join(ROOT, "data/materials");
mkdirSync(outP, { recursive: true });

const SPECIMEN_NOTE = t(
  "Material4Print erklärt unter jedem Datenblatt wörtlich: „These data were taken from the raw material manufacturer.“ Die Kennwerte stammen also vom Rohstofflieferanten und wurden nicht an gedruckten Bauteilen ermittelt. Das ist der offenste Umgang damit im ganzen Bestand — andere Marken veröffentlichen dieselbe Art von Zahlen ohne diesen Hinweis. Ein gedrucktes Bauteil erreicht diese Werte nicht; ein Vergleich mit Bambu Lab oder Prusa Polymers ist unzulässig.",
  "Material4Print states verbatim under every datasheet: “These data were taken from the raw material manufacturer.” The values therefore come from the resin supplier and were not measured on printed parts. This is the most candid handling of the matter in the entire database — other brands publish the same kind of figures without the notice. A printed part does not reach these values; comparison with Bambu Lab or Prusa Polymers is not admissible.");

const src = (name, file) => ({
  id: SRC_ID, type: "manufacturer-tds", publisher: "Material 4 Print GmbH & Co. KG",
  productName: name, title: `${name} — Material Data Sheet`,
  url: DOCS, retrievedAt: RETRIEVED, confidenceCeiling: "medium",
  note: t(`Materialdatenblatt vom ${SHEET_DATE}, Datei Data_Sheet_M4P_${file}.pdf. Der Hersteller erklärt die Werte ausdrücklich als Rohstoffkennwerte. Die Datenblattseite blockt automatisierte Abrufe; das Dokument wurde manuell bezogen.`,
          `Material data sheet dated ${SHEET_DATE}, file Data_Sheet_M4P_${file}.pdf. The manufacturer explicitly declares the values as raw-material data. The datasheet page blocks automated retrieval; the document was obtained manually.`),
});

let np = 0, na = 0;
for (const p of P) {
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "Material4Print", manufacturer: "Material 4 Print GmbH & Co. KG",
    productName: p.name, origin: "Deutschland",
    specimenType: p.specimen,
    specimenNote: p.anomaly
      ? t(`${SPECIMEN_NOTE.de}\n\nBefund zu diesem Datenblatt: ${p.anomaly.de}`,
          `${SPECIMEN_NOTE.en}\n\nFinding on this datasheet: ${p.anomaly.en}`)
      : SPECIMEN_NOTE,
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Material Data Sheet`, url: DOCS, version: SHEET_DATE, retrievedAt: RETRIEVED },
    productUrl: DOCS,
    properties: p.props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{ ...src(p.name, p.file), id: "src_tds" }],
    },
  };
  writeFileSync(path.join(outP, `${p.id}.json`), JSON.stringify(rec, null, 2) + "\n");
  np++;
  if (p.anomaly) na++;
}
console.log(`${np} Material4Print-Produkte geschrieben (${na} mit dokumentiertem Datenblatt-Befund)`);

let nm = 0;
for (const [id, m] of Object.entries(NEW_MATERIALS)) {
  const mech = {};
  if (m.density) mech.density = q(m.density, "g/cm³", { std: "ASTM D792", source: SRC_ID });
  if (m.tensile) mech.tensileStrengthXy = q(m.tensile, "MPa", { std: "ISO 527 bzw. ASTM D638", orientation: "n/a", source: SRC_ID });
  if (m.modulus) mech.tensileModulusXy = q(m.modulus, "MPa", { std: "ISO 527", orientation: "n/a", source: SRC_ID });
  if (m.elong) mech.elongationAtBreakXy = q(m.elong, "%", { std: "ISO 527", orientation: "n/a", source: SRC_ID });
  if (m.flexMod) mech.flexuralModulusXy = q(m.flexMod, "MPa", { std: "ISO 178", orientation: "n/a", source: SRC_ID });
  for (const [s, v] of Object.entries(m.ratings ?? {})) {
    if (["toughness", "creepTendency", "notchSensitivity", "wearResistance", "fatigueResistance"].includes(s)) mech[s] = rating(v, s);
  }

  const thermal = {};
  if (m.hdtA) thermal.hdtA = q(m.hdtA, "°C", { std: "ISO 75, 1.8 MPa", source: SRC_ID });
  if (m.hdtB) thermal.hdtB = q(m.hdtB, "°C", { std: "ISO 75, 0.45 MPa", source: SRC_ID });
  if (m.tg) thermal.glassTransition = q(m.tg, "°C", { std: "ISO 11357", source: SRC_ID });
  thermal.recommendedMaxServiceTemperature = m.serviceTemp
    ? q(m.serviceTemp, "°C", { conditions: "20.000 h nach IEC 60216", source: SRC_ID, confidence: "medium",
        note: t("Vom Hersteller mit Zeitbasis angegeben — die belastbarste Form dieser Angabe im ganzen Bestand.",
                "Stated by the manufacturer with a time base — the most robust form of this figure in the entire database.") })
    : q(Math.round(((m.hdtA ?? m.hdtB ?? 60) - 25) / 5) * 5, "°C", {
        conditions: "unbelastet, Luft, dauerhaft", source: "estimate_reasoning", confidence: "estimated",
        note: t("Eigene konservative Empfehlung mit Abstand zur Erweichungsgrenze.",
                "Our own conservative recommendation with margin to the softening limit.") });

  const processing = {
    nozzleTemperature: q(Math.round((m.nozzle[0] + m.nozzle[1]) / 2), "°C", { min: m.nozzle[0], max: m.nozzle[1], source: SRC_ID }),
    bedTemperature: q(Math.round((m.bed[0] + m.bed[1]) / 2), "°C", { min: m.bed[0], max: m.bed[1], source: SRC_ID }),
    chamberRequirement: choice(m.chamber, { source: SRC_ID, confidence: "medium" }),
    dryingTemperature: q(m.dry[0], "°C", { source: SRC_ID, confidence: "medium" }),
    dryingTime: q(m.dry[1], "h", { source: SRC_ID, confidence: "medium" }),
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
    { chemicalId: "chem_mineral_oil", rating: "limited", source: "estimate_reasoning", confidence: "estimated" },
  ];

  const compliance = {
    foodContact: {
      status: choice("not-declared", { source: SRC_ID, confidence: "medium" }),
      partLevelWarning: t("Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen.",
                          "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches."),
    },
    flameRetardancy: {
      ul94: choice(m.ul94 ?? "not-classified", { source: m.ul94 ? SRC_ID : "estimate_reasoning", confidence: m.ul94 ? "medium" : "estimated" }),
    },
    ...(m.esd ? { esd: {
      classification: choice(m.esd, { source: SRC_ID, confidence: "medium",
        note: t(`Herstellerangabe Oberflächenwiderstand ${m.esdOhm.min.toExponential(0)} bis ${m.esdOhm.max.toExponential(0)} Ohm nach ASTM D257 — das liegt im ableitfähigen Bereich.`,
                `Manufacturer states a surface resistance of ${m.esdOhm.min.toExponential(0)} to ${m.esdOhm.max.toExponential(0)} ohm to ASTM D257 — that is within the dissipative range.`) }),
      surfaceResistivity: q(m.esdOhm.value, "Ω/sq", { min: m.esdOhm.min, max: m.esdOhm.max, std: "ASTM D257", source: SRC_ID }),
    } } : {}),
    printEmissions: {
      concernLevel: choice(m.chamber === "mandatory" ? "moderate" : "low", { confidence: "estimated" }),
      extractionRecommended: flag(m.chamber === "mandatory", { confidence: "estimated" }),
    },
    translucency: choice(m.translucency ?? "opaque", { source: SRC_ID, confidence: "medium" }),
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

  const rec = {
    $schema: "../../schema/material.schema.json", schemaVersion: "1.0.0", id,
    identity: {
      name: m.name, family: m.family, polymerClass: m.polymerClass, variant: m.variant,
      aliases: m.aliases,
      abstract: m.abstract, positioning: m.positioning,
    },
    mechanics: mech, thermal, processing, durability, compliance, finishing, commercial,
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
        { id: "oq_printed_values", question: t("Alle Kennwerte dieses Typs stammen aus Rohstoffdatenblättern. Werte an gedruckten Prüfkörpern ergänzen, sobald eine Quelle vorliegt.",
            "All values for this type come from raw-material datasheets. Add printed-specimen values as soon as a source is available."),
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
console.log(`\n${np} Produkte, ${nm} neue Werkstofftypen, ${na} dokumentierte Befunde.`);
