/**
 * Import: add:north 3D filaments AB (Ölsremma, Schweden).
 *
 * WARUM DIESER HERSTELLER TROTZ SCHWACHER BLAETTER AUFGENOMMEN WIRD
 * Add:north veroeffentlicht fuer jedes Produkt ein Blatt - kurz, einheitlich, mit Norm
 * und Zahlenwert. Es liefert damit einen zweiten Beleg fuer PLA, PETG und Copolyamid,
 * und mit dem PC Blend HT LCF (125 MPa, 9800 MPa, HDT 185 °C) den steifsten Werkstoff
 * des gesamten Bestands. Die Blaetter haben aber einen systematischen Mangel, der sie
 * durchgehend abwertet.
 *
 * DER FEHLER, DER AUF JEDEM EINZELNEN BLATT STEHT
 * Alle fuenfzehn Blaetter fuehren die Dichte unter "ISO 527". ISO 527 ist die Norm fuer
 * den ZUGVERSUCH; fuer die Dichte waere ISO 1183 einschlaegig. Das ist kein Ausrutscher
 * auf einem Blatt, sondern eine Vorlage, die fuenfzehnmal kopiert wurde - und damit ein
 * Hinweis darauf, wie sorgfaeltig die Normangaben insgesamt gepflegt werden.
 *
 * DER VERDACHT BEIM ADDBOR N25
 * Das Addbor-Blatt weist ausschliesslich Spannen aus: 50-58 MPa, 1460-1720 MPa,
 * 25-46 %, 52-81 MPa, 1425-3650 MPa. Legt man die Blaetter von Adura (50 / 1720 / 46 /
 * 52 / 1425) und Adura X (58 / 1460 / 25 / 81 / 3650) daneben, ist jede dieser fuenf
 * Spannen exakt das Minimum und Maximum der beiden. Das Addbor-Blatt enthaelt keine
 * einzige eigene Messung, sondern die Huelle zweier anderer Produkte. Aufgenommen ist
 * es trotzdem - mit `low` und dem Befund dazu, weil der Werkstoff (Polyamid mit 25 %
 * Borcarbid, ein Neutronenabsorber) sonst nirgends dokumentiert ist.
 *
 * WAS AUSGELASSEN WURDE UND WARUM
 * Koltron G1 ist elektrisch leitfaehig (2 Ω·cm - das ist Leitfaehigkeit, nicht nur
 * ESD-Ableitfaehigkeit) und waere fachlich hochinteressant. Das Blatt nennt aber kein
 * Grundpolymer, und ein Glasuebergang von -34 °C passt zu keinem gefuehrten Typ. Ohne
 * Grundpolymer laesst sich weder eine Chemikalienbestaendigkeit ableiten noch eine
 * Temperaturgrenze begruenden. Nicht aufgenommen.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-02";
const U = "https://storage.googleapis.com/addnorth-com.appspot.com/imgix/assets/production";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

/* Die Dichtenorm ist auf jedem Blatt falsch - einmal formuliert, ueberall angehaengt. */
const DENSITY_STD = "im Blatt als ISO 527 angegeben (siehe Befund); richtig wäre ISO 1183";
const DENSITY_NOTE = t(
  "Die Norm im Blatt ist falsch: ISO 527 prüft Zugeigenschaften, nicht die Dichte. Der Zahlenwert selbst ist plausibel und übernommen.",
  "The standard in the sheet is wrong: ISO 527 tests tensile properties, not density. The figure itself is plausible and has been imported.");

const d = (value) => q(value, "g/cm³", { std: DENSITY_STD, confidence: "low", note: DENSITY_NOTE });

const UNDECLARED = t(
  "Dieses Blatt sagt nicht, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde. Es nennt auch keine Druckparameter, keine Prüfgeschwindigkeit und keine Prüftemperatur — nur Norm, Einheit und Zahl.",
  "This sheet does not say whether values were measured on printed or moulded specimens. It also names no print parameters, no test speed and no test temperature — only standard, unit and figure.");

const ISO527_NOTE = t(
  "Alle fünfzehn add:north-Blätter führen die Dichte unter ISO 527, der Norm für den ZUGVERSUCH — für die Dichte wäre ISO 1183 einschlägig. Ein Fehler, der fünfzehnmal identisch auftritt, stammt aus der Vorlage und nicht aus dem Labor. Er sagt nichts über die Zahlenwerte selbst, aber etwas darüber, wie sorgfältig die Normangaben gepflegt werden. Die Dichteangaben tragen deshalb `low`.",
  "All fifteen add:north sheets carry density under ISO 527, the standard for TENSILE TESTING — for density ISO 1183 would apply. An error appearing identically fifteen times comes from the template, not the laboratory. It says nothing about the figures themselves but something about how carefully the standards are maintained. The density values therefore carry `low`.");

const P = [
  /* ---------------------------------------------------------------------------
     Adamant S1 (PVDF), nachgetragen am 2026-08-07 aus der OFD-Arbeitsliste.

     DREI VON FUENF MECHANIKWERTEN STEHEN ZIFFERNGLEICH IM E-PLA-BLATT DESSELBEN HAUSES

       Kennwert                Adamant S1 (PVDF)   add:north E-PLA
       Zugfestigkeit Bruch     58 MPa              58 MPa      <- gleich
       Zug-E-Modul            387 MPa            2.870 MPa
       Bruchdehnung            > 50 %                 8 %
       Biegefestigkeit        120 MPa              120 MPa     <- gleich
       Biege-E-Modul        3.155 MPa            3.155 MPa     <- gleich

     PVDF und PLA sind chemisch nichts miteinander zu tun habende Polymere. Das ist keine
     geteilte Messung wie bei Spectrum und FormFutura (ADR-038), sondern eine VORLAGE, die
     nicht fertig ueberschrieben wurde: Dichte, Zug-E-Modul, Bruchdehnung und der ganze
     Thermoblock sind ersetzt, drei Zeilen sind stehen geblieben.

     Der Beleg dafuer steht im Blatt selbst: Ein Zug-E-Modul von 387 MPa neben einem
     Biege-E-Modul von 3.155 MPa ist Faktor acht. Bei jedem Thermoplast liegen die beiden
     innerhalb von etwa zwanzig Prozent beieinander; acht ist keine Streuung, sondern zwei
     verschiedene Werkstoffe in einer Tabelle. Ebenso steht die Biegefestigkeit mit 120 MPa
     beim Doppelten der Zugfestigkeit.

     UEBERNOMMEN sind deshalb nur die Werte, die erkennbar zu PVDF gehoeren und sich
     gegenseitig stuetzen: Dichte 1,8 g/cm³ (Literatur 1,78), Glasuebergang -34 °C (der
     Wert von PVDF), Bruchdehnung ueber 50 % und Zug-E-Modul 387 MPa - beide passen zu
     einer WEICHEN PVDF-Type, was das "S" im Namen nahelegt. Dazu die Dauergebrauchs-
     temperatur von 120 °C und die Brandschutzklasse V-0 bei 1,5 mm nach IEC 60695-11.

     NICHT UEBERNOMMEN: 58 MPa, 120 MPa und 3.155 MPa. */
  { id: "addnorth-adamant-s1", material: "pvdf", name: "add:north Adamant S1",
    file: "AdamantS1_TDS_nH7jU9",
    props: {
      density: q(1.8, "g/cm³", { std: "ISO 1183", conditions: "im Blatt faelschlich als ISO 527 bezeichnet", confidence: "low" }),
      tensileModulusXy: q(387, "MPa", { std: "ISO 527", conditions: "weiche Type; das Blatt nennt daneben einen Biege-E-Modul von 3.155 MPa, der aus dem PLA-Blatt desselben Hauses stammt", confidence: "low" }),
      elongationAtBreakXy: q(50, "%", { std: "ISO 527", conditions: "das Blatt nennt „> 50 %“, gefuehrt ist die Untergrenze" }),
      glassTransition: q(-34, "°C", { std: "DSC", confidence: "low", conditions: "derselbe Wert steht im Koltron-G1-Blatt desselben Hauses, dessen Grundpolymer unbekannt ist — für PVDF ist er literaturrichtig (−35 bis −40 °C), das Zusammentreffen bleibt trotzdem stehen" }),
      continuousServiceTemperature: q(120, "°C"),
    },
    ul94: { value: "V-0", thicknessMm: 1.5, strong: true },
    features: t("Der zweite PVDF-Beleg im Bestand neben Fillamentum Fluorodur — und der erste mit einer belegten Brandschutzklasse: V-0 bei 1,5 mm nach IEC 60695-11. Dazu ein Glasübergang von −34 °C und 120 °C Dauergebrauch, also die Spanne, für die man PVDF überhaupt wählt. Die mechanischen Werte deuten auf eine weiche Type: 387 MPa Zug-E-Modul bei über 50 % Bruchdehnung ist eher Dichtung als Konstruktionsteil.",
                "The second PVDF source in the dataset alongside Fillamentum Fluorodur — and the first with a substantiated flame rating: V-0 at 1.5 mm to IEC 60695-11. Plus a glass transition of −34 °C and 120 °C continuous service, which is the span PVDF is chosen for at all. The mechanical figures suggest a soft grade: 387 MPa tensile modulus at over 50 % elongation at break is sealing rather than structural."),
    anomaly: t("Drei von fünf Mechanikwerten stehen zifferngleich im E-PLA-Blatt desselben Herstellers: Zugfestigkeit 58 MPa, Biegefestigkeit 120 MPa, Biege-E-Modul 3.155 MPa. PVDF und PLA haben chemisch nichts miteinander zu tun — das ist keine geteilte Messung, sondern eine Vorlage, die nicht fertig überschrieben wurde. Der Beleg steht im Blatt selbst: 387 MPa Zug-E-Modul neben 3.155 MPa Biege-E-Modul ist Faktor acht, und bei jedem Thermoplast liegen die beiden innerhalb von etwa zwanzig Prozent. Die drei Werte sind NICHT übernommen; übernommen ist nur, was zu PVDF gehört und sich gegenseitig stützt.",
               "Three of five mechanical values appear digit for digit in the same manufacturer's E-PLA sheet: tensile strength 58 MPa, flexural strength 120 MPa, flexural modulus 3,155 MPa. PVDF and PLA are chemically unrelated — this is not a shared measurement but a template that was not fully overwritten. The evidence is in the sheet itself: 387 MPa tensile modulus next to 3,155 MPa flexural modulus is a factor of eight, and for any thermoplastic the two lie within about twenty percent. The three values are NOT imported; only what belongs to PVDF and supports itself is.") },

  { id: "addnorth-e-pla", material: "pla", name: "add:north E-PLA",
    file: "epla_tds_rev21_XTkw2P",
    props: {
      density: d(1.24),
      tensileStrengthXy: q(58, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(2870, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(8, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(120, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(3155, "MPa", { std: "ISO 178" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "DSC" }),
      hdtB: q(55, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    } },

  { id: "addnorth-x-pla", material: "pla", name: "add:north X-PLA",
    file: "XPLA_TDS_kdctbP",
    props: {
      density: d(1.24),
      tensileStrengthXy: q(62, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(2960, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(12, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(52, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(3295, "MPa", { std: "ISO 178" }),
      glassTransition: q(55, "°C", { std: "DSC" }),
      hdtB: q(60, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    anomaly: t("Die Biegefestigkeit von 52 MPa liegt UNTER der Zugfestigkeit von 62 MPa. Bei spröden Thermoplasten ist normalerweise das Gegenteil der Fall — das E-PLA desselben Herstellers weist 120 MPa Biege- gegen 58 MPa Zugfestigkeit aus, also mehr als das Doppelte. Ein Werkstoff derselben Familie mit umgekehrtem Verhältnis ist erklärungsbedürftig; das Blatt erklärt nichts.",
               "The flexural strength of 52 MPa sits BELOW the tensile strength of 62 MPa. In brittle thermoplastics the opposite normally holds — the same manufacturer's E-PLA gives 120 MPa flexural against 58 MPa tensile, more than double. A material of the same family with the inverse ratio calls for explanation; the sheet explains nothing.") },

  { id: "addnorth-ht-pla-pro-matte", material: "pla", name: "add:north HT PLA Pro Matte",
    file: "TDS_htplapromatte_-qP4pe",
    props: {
      density: d(1.4),
      tensileStrengthXy: q(34, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(4500, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(5, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(79, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(3980, "MPa", { std: "ISO 178" }),
      glassTransition: q(60, "°C", { std: "DSC" }),
      hdtB: q(80, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    features: t("Der steifste PLA-Werkstoff im Bestand: 4500 MPa Zug-E-Modul gegenüber 2870 MPa beim E-PLA desselben Herstellers. Die HDT-B von 80 °C liegt 25 K über gewöhnlichem PLA — das ist der Punkt, an dem „HT“ tatsächlich etwas bedeutet.",
                "The stiffest PLA material in the dataset: 4500 MPa tensile modulus against 2870 MPa for the same manufacturer's E-PLA. The HDT-B of 80 °C sits 25 K above ordinary PLA — the point at which “HT” actually means something.") },

  { id: "addnorth-textura", material: "pla", name: "add:north Textura",
    file: "Textura_TDS_HSgAza",
    props: {
      density: d(1.25),
      tensileStrengthXy: q(51, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(2315, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(2, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(89, "MPa", { std: "ISO 178", confidence: "low" }),
      flexuralModulusXy: q(2645, "MPa", { std: "ISO 178", confidence: "low" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "DSC" }),
      hdtB: q(55, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    anomaly: t("Biegefestigkeit 89 MPa und Biege-E-Modul 2645 MPa stehen zeichengleich auch im Blatt von Koltron G1 — einem elektrisch leitfähigen Werkstoff mit einem Glasübergang von −34 °C, der mit diesem matten Biowerkstoff nichts gemein hat. Dass zwei so verschiedene Produkte identische Biegewerte haben, spricht für eine übernommene Vorlage statt einer eigenen Messung. Beide Werte tragen deshalb `low`.",
               "Flexural strength 89 MPa and flexural modulus 2645 MPa appear character-for-character in the Koltron G1 sheet as well — an electrically conductive material with a glass transition of −34 °C that has nothing in common with this matte biomaterial. That two such different products carry identical flexural values suggests a copied template rather than an own measurement. Both values therefore carry `low`.") },

  { id: "addnorth-pla-wood", material: "pla", name: "add:north PLA Wood",
    file: "TDS_plawood_X4tWT1",
    props: {
      density: d(1.15),
      tensileStrengthXy: q(46, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(2950, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(10, "%", { std: "ISO 527" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "DSC" }),
      hdtB: q(55, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    features: t("Das Blatt nennt die Zusammensetzung ausdrücklich: 40 % Holzfasern, 60 % biobasiertes PLA. Eine Mengenangabe zum Füllstoff findet sich sonst auf kaum einem Blatt im Bestand.",
                "The sheet states the composition explicitly: 40 % wood fibres, 60 % biobased PLA. A quantitative filler statement is found on hardly any other sheet in the dataset."),
    anomaly: t("Die Zeile „Flexural Strength ISO 178 MPa“ trägt den Wert 3008, die Zeile darunter für den Biege-E-Modul ist leer. Eine Biegefestigkeit von 3008 MPa gibt es bei keinem Thermoplast — der Modulwert ist offensichtlich eine Zeile nach oben gerutscht. Beide Zeilen sind deshalb nicht übernommen; es wäre geraten, welcher Wert wohin gehört.",
               "The line “Flexural Strength ISO 178 MPa” carries the value 3008, the line below it for flexural modulus is empty. No thermoplastic has a flexural strength of 3008 MPa — the modulus figure has evidently slipped up one row. Neither line is imported; assigning the value would be guesswork.") },

  { id: "addnorth-petg", material: "petg", name: "add:north PETG",
    file: "petg_tds_rev11_ulRIZ3",
    props: {
      density: d(1.27),
      tensileStrengthXy: q(45, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(1651, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(24, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(72, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(1600, "MPa", { std: "ISO 178" }),
      glassTransition: q(80, "°C", { std: "DSC" }),
      hdtB: q(78, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    } },

  { id: "addnorth-petg-v0", material: "petg", name: "add:north PETG Flame Retardant V0",
    file: "TDS_PETGv0_oY3Rem",
    props: {
      density: d(1.25),
      tensileStrengthXy: q(34, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(2600, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(5, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(79, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(2354, "MPa", { std: "ISO 178" }),
      glassTransition: q(70, "°C", { std: "DSC" }),
      hdtB: q(80, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    ul94: { value: "V-0" },
    features: t("Das Blatt nennt die Klasse ausdrücklich und dazu, was NICHT enthalten ist: keine halogenbasierten Flammschutzmittel, kein roter Phosphor. Beides ist für Bahn- und Innenraumanwendungen die eigentlich interessante Angabe. Der Preis steht daneben: Bruchdehnung 5 % statt 24 % beim normalen PETG desselben Herstellers — der Flammschutz kostet vier Fünftel der Zähigkeit.",
                "The sheet names the class explicitly and, alongside it, what is NOT contained: no halogen-based flame retardants, no red phosphorus. For rail and interior applications both are the genuinely interesting statement. The price stands next to it: elongation at break 5 % instead of 24 % for the same manufacturer's ordinary PETG — flame retardancy costs four fifths of the toughness.") },

  { id: "addnorth-esd-petg", material: "esd-petg", name: "add:north ESD PETG",
    file: "TDS_ESD_PETG_3mpUZx",
    props: {
      density: d(1.29),
      tensileStrengthXy: q(52, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(1850, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(14, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(73, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(1697, "MPa", { std: "ISO 178" }),
      glassTransition: q(80, "°C", { std: "DSC" }),
      hdtB: q(75, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
      surfaceResistance: q(1e8, "Ω/sq", { min: 1e7, max: 1e9, conditions: "Blattangabe „>10⁷–10⁹<“; Norm nicht genannt" }),
    },
    features: t("Der Oberflächenwiderstand liegt mit 10⁷ bis 10⁹ Ω/sq im ableitfähigen Bereich nach IEC 61340 — genau dort, wo eine ESD-Vorrichtung hingehört. Das Blatt nennt allerdings keine Prüfnorm für die Messung, und ohne Norm ist die Angabe für eine Auditvorlage nicht ausreichend.",
                "The surface resistance of 10⁷ to 10⁹ Ω/sq lies in the dissipative range to IEC 61340 — exactly where an ESD fixture belongs. The sheet names no test standard for the measurement, however, and without a standard the figure is not sufficient for an audit submission.") },

  { id: "addnorth-rigid-x", material: "petg-cf", name: "add:north Rigid X",
    file: "TDS_rigidX_10waLr",
    props: {
      density: d(1.32),
      tensileStrengthXy: q(52, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(5120, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(8, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(89, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(4930, "MPa", { std: "ISO 178" }),
      glassTransition: q(80, "°C", { std: "DSC" }),
      hdtB: q(82, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    features: t("Ein kohlenstofffaserverstärktes PETG, das den Steifigkeitsgewinn tatsächlich zeigt: 5120 MPa gegen 1651 MPa beim unverstärkten PETG desselben Herstellers, also gut das Dreifache. Die HDT bleibt dabei bei 82 gegen 78 °C praktisch unverändert — der Beleg dafür, dass Kohlenstofffaser bei PETG Steifigkeit bringt und keine Wärmeformbeständigkeit.",
                "A carbon-fibre reinforced PETG that actually shows the stiffness gain: 5120 MPa against 1651 MPa for the same manufacturer's unreinforced PETG, a good threefold. The HDT meanwhile stays practically unchanged at 82 against 78 °C — the evidence that carbon fibre brings PETG stiffness and no heat deflection.") },

  { id: "addnorth-adura", material: "pa12", name: "add:north Adura",
    file: "Adura_TDS_KRM71m",
    props: {
      density: d(1.1),
      tensileStrengthXy: q(50, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(1720, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(46, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(52, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(1425, "MPa", { std: "ISO 178" }),
      glassTransition: q(51, "°C", { std: "DSC" }),
      hdtB: q(105, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    anomaly: t("Das Blatt bezeichnet den Werkstoff als Copolyamid, nennt aber keinen Typ. Die Zuordnung zu PA12 in dieser Datenbank stützt sich auf die niedrige Dichte von 1,1 g/cm³ und die für ein Polyamid ungewöhnlich geringe Feuchteempfindlichkeit, die das Blatt hervorhebt — sie ist eine Einordnung, keine Herstellerangabe. Ein Copolyamid kann sich in der Wasseraufnahme deutlich von PA12 unterscheiden.",
               "The sheet calls the material a co-polyamide but names no type. The assignment to PA12 in this database rests on the low density of 1.1 g/cm³ and the unusually low moisture sensitivity for a polyamide that the sheet stresses — it is a classification, not a manufacturer statement. A co-polyamide can differ markedly from PA12 in water uptake.") },

  { id: "addnorth-adura-x", material: "pa12", name: "add:north Adura X",
    file: "AduraX_TDS_mZ8KLl",
    props: {
      density: d(1.2),
      tensileStrengthXy: q(58, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(1460, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(25, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(81, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(3650, "MPa", { std: "ISO 178" }),
      glassTransition: q(51, "°C", { std: "DSC" }),
      hdtB: q(145, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    features: t("HDT-B 145 °C bei einem Glasübergang von 51 °C — das ist der grösste Abstand zwischen beiden Werten im ganzen Bestand und typisch für ein teilkristallines Polyamid: Oberhalb des Glasübergangs trägt die Kristallphase weiter. Wer nur auf den Glasübergang schaut, unterschätzt diesen Werkstoff um fast 100 K.",
                "HDT-B 145 °C at a glass transition of 51 °C — the largest gap between the two figures in the whole dataset and typical of a semi-crystalline polyamide: above the glass transition the crystalline phase keeps carrying load. Anyone looking only at the glass transition underestimates this material by nearly 100 K."),
    anomaly: t("Der Biege-E-Modul von 3650 MPa liegt um den Faktor 2,5 ÜBER dem Zug-E-Modul von 1460 MPa. Beide messen dieselbe Steifigkeit und sollten bei einem homogenen Werkstoff nahe beieinander liegen. Beim Adura desselben Herstellers ist das Verhältnis umgekehrt (1425 gegen 1720). Einer der vier Werte dürfte nicht stimmen; welcher, lässt sich aus dem Blatt nicht entscheiden.",
               "The flexural modulus of 3650 MPa sits a factor of 2.5 ABOVE the tensile modulus of 1460 MPa. Both measure the same stiffness and should be close together in a homogeneous material. In the same manufacturer's Adura the ratio is inverted (1425 against 1720). One of the four figures is presumably wrong; which one cannot be decided from the sheets.") },

  { id: "addnorth-adura-fda", material: "pa12", name: "add:north Adura FDA",
    file: "adura_fda_tds_krynwK",
    props: {
      density: d(1.1),
      tensileStrengthXy: q(50, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(1720, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(46, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(52, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(1425, "MPa", { std: "ISO 178" }),
      glassTransition: q(51, "°C", { std: "DSC" }),
      hdtB: q(105, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    anomaly: t("Sämtliche sieben Kennwerte sind Ziffer für Ziffer identisch mit denen des Adura-Blattes. Bei einer lebensmittelkonformen Variante desselben Grundpolymers ist das plausibel — es bedeutet aber, dass hier keine zweite Messung vorliegt, sondern dieselbe. Für die Datenbank zählt das als EIN Beleg, nicht als zwei.",
               "All seven values are digit-for-digit identical with those of the Adura sheet. For a food-compliant variant of the same base polymer that is plausible — but it means there is no second measurement here, only the same one. For this database that counts as ONE piece of evidence, not two.") },

  { id: "addnorth-addbor-n25", material: "pa12", name: "add:north Addbor N25",
    file: "AddborN25_TDS_8H-Ujd",
    props: {
      density: d(1.3),
      tensileStrengthXy: q(54, "MPa", { min: 50, max: 58, std: "ISO 527", conditions: "bei Bruch; Blattangabe als Spanne", confidence: "low" }),
      tensileModulusXy: q(1590, "MPa", { min: 1460, max: 1720, std: "ISO 527", conditions: "Blattangabe als Spanne", confidence: "low" }),
      elongationAtBreakXy: q(35.5, "%", { min: 25, max: 46, std: "ISO 527", conditions: "Blattangabe als Spanne", confidence: "low" }),
      flexuralStrengthXy: q(66.5, "MPa", { min: 52, max: 81, std: "ISO 178", conditions: "Blattangabe als Spanne", confidence: "low" }),
      flexuralModulusXy: q(2537, "MPa", { min: 1425, max: 3650, std: "ISO 178", conditions: "Blattangabe als Spanne", confidence: "low" }),
    },
    features: t("Der einzige Werkstoff im Bestand mit einem Neutronenabsorber als Füllstoff: Polyamid mit 25 Gewichtsprozent Borcarbid. Solche Compounds werden für Abschirmungen in der Kern- und Medizintechnik eingesetzt. Eine Angabe zur Abschirmwirkung macht das Blatt nicht.",
                "The only material in the dataset with a neutron absorber as its filler: polyamide with 25 weight percent boron carbide. Such compounds are used for shielding in nuclear and medical technology. The sheet makes no statement about shielding performance."),
    anomaly: t("Alle fünf mechanischen Kennwerte stehen als Spanne da — und jede dieser fünf Spannen ist exakt das Minimum und Maximum der Blätter von Adura und Adura X desselben Herstellers (50 gegen 58, 1460 gegen 1720, 25 gegen 46, 52 gegen 81, 1425 gegen 3650). Das Blatt enthält damit keine einzige eigene Messung, sondern die Hülle zweier anderer Produkte. Sämtliche Werte tragen `low`, und der geführte Wert ist jeweils die Mitte der Spanne. Zudem fehlen thermische Kennwerte vollständig — als einziges der fünfzehn add:north-Blätter.",
               "All five mechanical values appear as ranges — and each of these five ranges is exactly the minimum and maximum of the same manufacturer's Adura and Adura X sheets (50 against 58, 1460 against 1720, 25 against 46, 52 against 81, 1425 against 3650). The sheet thus contains not a single measurement of its own, but the envelope of two other products. All values carry `low`, and the figure held is the midpoint of each range. Thermal values are moreover missing entirely — the only one of the fifteen add:north sheets where that is so.") },

  { id: "addnorth-pc-blend-ht-lcf", material: "pc", name: "add:north PC Blend HT LCF",
    file: "TDS_pcblendhtlcf_utXzD2",
    props: {
      density: d(1.3),
      tensileStrengthXy: q(125, "MPa", { std: "ISO 527", conditions: "bei Bruch" }),
      tensileModulusXy: q(9800, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(2.9, "%", { std: "ISO 527" }),
      glassTransition: q(158, "°C", { std: "DSC" }),
      hdtB: q(185, "°C", { std: "ISO 75", conditions: "0,45 MPa" }),
    },
    features: t("Der steifste und festeste Werkstoff des gesamten Bestands: 125 MPa Zugfestigkeit bei 9800 MPa Zug-E-Modul, dazu HDT-B 185 °C. Zum Vergleich liegt das nächstbeste kohlenstofffaserverstärkte Material bei rund 100 MPa. „LCF“ steht für Langfaser — die längere Faser überträgt mehr Last als die üblichen Kurzfasern und erklärt den Abstand. Das Blatt lässt Biegefestigkeit und Biege-E-Modul allerdings leer.",
                "The stiffest and strongest material in the entire dataset: 125 MPa tensile strength at 9800 MPa tensile modulus, plus HDT-B 185 °C. For comparison, the next best carbon-fibre reinforced material sits at roughly 100 MPa. “LCF” stands for long carbon fibre — the longer fibre transfers more load than the usual short fibres and explains the gap. The sheet does, however, leave flexural strength and flexural modulus empty.") },
];

/* ------------------------------------------------------------------ Ausgabe */

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, na = 0, nu = 0;
for (const p of P) {
  const url = `${U}/${p.file}.pdf`;
  const parts = [UNDECLARED, t(`Befund über alle Blätter dieses Herstellers: ${ISO527_NOTE.de}`,
                               `Finding across all sheets from this manufacturer: ${ISO527_NOTE.en}`)];
  if (p.anomaly) parts.push(t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`,
                              `Finding on this datasheet: ${p.anomaly.en}`));
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "add:north", manufacturer: "add:north 3D filaments AB",
    productName: p.name, origin: "Schweden",
    specimenType: "undeclared",
    specimenNote: t(parts.map((x) => x.de).join("\n\n"), parts.map((x) => x.en).join("\n\n")),
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technical Data Sheet`, url, retrievedAt: RETRIEVED },
    productUrl: "https://addnorth.com/",
    properties: p.props,
    ...(p.ul94 ? {
      compliance: {
        /* Die Dicke entscheidet ueber die Belastbarkeit einer UL94-Angabe: Dieselbe
           Rezeptur kann bei 1,5 mm V-0 und bei 0,8 mm nur V-2 erreichen. Blaetter, die
           sie nennen, bekommen sie deshalb ins Feld und eine andere Notiz - vorher
           standen beide Faelle unter demselben Text "nennt keine Materialdicke", auch
           das Adamant-S1-Blatt, das sie sehr wohl nennt. */
        ul94: {
          value: p.ul94.value, testStandard: p.ul94.thicknessMm ? "IEC 60695-11" : "UL 94",
          ...(p.ul94.thicknessMm ? { thicknessMm: p.ul94.thicknessMm } : {}),
          source: "src_tds", confidence: "low",
          note: p.ul94.thicknessMm
            ? t(`Das Blatt nennt die Klasse ${p.ul94.value} MIT Materialdicke (${String(p.ul94.thicknessMm).replace(".", ",")} mm) und der Prüfnorm IEC 60695-11. Damit ist die Angabe übertragbar — anders als bei den übrigen add:north-Blättern, die eine Klasse ohne Dicke nennen. Was weiterhin fehlt, ist die Prüfstelle und eine Zeugnisnummer: Eine Herstellerangabe ist kein Prüfzeugnis.`,
                `The sheet names class ${p.ul94.value} WITH a material thickness (${p.ul94.thicknessMm} mm) and the test standard IEC 60695-11. That makes the statement transferable — unlike the other add:north sheets, which name a class without a thickness. What is still missing is the test house and a certificate number: a manufacturer statement is not a test certificate.`)
            : t("Das Blatt nennt die Klasse V-0 und dazu, dass weder halogenbasierte Flammschutzmittel noch roter Phosphor enthalten sind. Es nennt aber keine Materialdicke, keine Prüfstelle und keine Zeugnisnummer. Ohne Dickenangabe ist eine UL94-Klasse nicht übertragbar — dieselbe Rezeptur kann bei 1,5 mm V-0 und bei 0,8 mm nur V-2 erreichen.",
                    "The sheet names class V-0 and adds that neither halogen-based flame retardants nor red phosphorus are contained. It names no material thickness, no test house and no certificate number, however. Without a thickness a UL94 class is not transferable — the same formulation can reach V-0 at 1.5 mm and only V-2 at 0.8 mm."),
        },
      },
    } : {}),
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "add:north 3D filaments AB",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url, retrievedAt: RETRIEVED, confidenceCeiling: "low",
        note: t("Herstellerdatenblatt mit Textebene. Prüfkörper nicht deklariert, Dichtenorm auf allen Blättern falsch.",
                "Manufacturer datasheet with text layer. Specimen not declared, density standard wrong on every sheet."),
      }],
    },
  };
  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  if (p.anomaly) na++;
  if (p.ul94) nu++;
}

console.log(`${n} add:north-Produkte geschrieben (${na} mit eigenem Befund, ${nu} mit UL94-Angabe)`);
console.log(`  Alle 14 tragen zusaetzlich den Befund zur falschen Dichtenorm.`);
console.log(`  Koltron G1 ausgelassen: kein Grundpolymer genannt, Tg -34 °C passt zu keinem Typ.`);
