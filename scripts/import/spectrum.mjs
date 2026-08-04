/**
 * Import: Spectrum Filaments (Spectrum Group, Polen).
 *
 * WAS DIESE BLAETTER AUSZEICHNET
 * Sie sind die informationsreichsten europaeischen Blaetter im Bestand: Sie nennen
 * Druckeinstellungen samt Kammerbedarf und Duesenhaerte, Schwindung, elektrische Werte,
 * Schlagzaehigkeit bei -30 °C — und beim PC/ABS FR V0 eine vollstaendig belegte
 * Brandschutzklassifizierung.
 *
 * ZWEI BLAETTER DEKLARIEREN GEDRUCKTE PRUEFKOERPER
 * PLA Pro traegt die Fussnote "3D printed at 100% infill and annealed at 110°C/20 min,
 * XY axis" — Prueforientierung UND Temperung stehen also da. PLA Matt beschriftet
 * einzelne Zeilen mit "3D printing". Beide bekommen specimenType "printed", der Rest
 * bleibt "undeclared".
 *
 * DER BRANDSCHUTZFALL
 * PC/ABS FR V0 nennt UL 94 V-0 bei 1,5 UND 3,0 mm plus Gluehdrahtindex 960 °C nach
 * IEC 60695-2-12. Das ist eine belegte Klassifizierung — im Gegensatz zum "PET-G V0"
 * von Fiberlogy, dessen Blatt gar keine Klasse nennt. Genau dieser Unterschied ist der
 * Grund, warum die Brandschutzansicht existiert.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-02";
const U = "https://spectrumfilaments.com/wp-content/uploads";

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

/** kg/cm² -> MPa. Eine Einheitenumrechnung ist Arithmetik, keine Auslegung. */
const KGCM2 = 0.0980665;
const fromKgcm2 = (v) => Math.round(v * KGCM2 * 10) / 10;

const UNDECLARED = t(
  "Dieses Blatt sagt nicht, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde. Bemerkenswert ist, dass zwei andere Blätter desselben Herstellers (PLA Pro und PLA Matt) es ausdrücklich tun — der Hersteller kann es also, tut es hier aber nicht.",
  "This sheet does not say whether values were measured on printed or moulded specimens. Notable is that two other sheets from the same manufacturer (PLA Pro and PLA Matt) do so explicitly — the manufacturer is able to, but does not here.");

const PRINTED = t(
  "Dieses Blatt deklariert den Prüfkörper: gedruckt, mit Angabe von Infill, Orientierung und Temperung. Damit sind die Werte mit denen von Ultrafuse, Bambu Lab und Prusa Polymers vergleichbar — und nicht mit den übrigen Blättern desselben Herstellers.",
  "This sheet declares the specimen: printed, stating infill, orientation and annealing. The values are therefore comparable with those from Ultrafuse, Bambu Lab and Prusa Polymers — and not with the manufacturer's other sheets.");

const P = [
  { id: "spectrum-pla-premium", material: "pla", name: "Spectrum PLA Premium",
    file: "2021/12/en_tds_spectrum_pla_premium.pdf",
    props: {
      density: q(1.24, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(60, "MPa", { std: "ASTM D882 (siehe Befund)", conditions: "Streckspannung; Bruchspannung 53 MPa" }),
      tensileModulusXy: q(3500, "MPa", { std: "ASTM D882 (siehe Befund)" }),
      elongationAtBreakXy: q(6, "%", { std: "ASTM D882 (siehe Befund)" }),
      flexuralStrengthXy: q(83, "MPa", { std: "ASTM D790" }),
      izodNotchedXy: q(16, "J/m", { std: "ASTM D256" }),
      hdtB: q(55, "°C", { std: "im Blatt als ASTM E2092 angegeben (siehe Befund)" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "ASTM D3418" }),
      nozzleTemperature: q(200, "°C", { min: 185, max: 215 }),
      bedTemperature: q(22, "°C", { min: 0, max: 45 }),
      printSpeed: q(95, "mm/s", { min: 40, max: 150 }),
    },
    anomaly: t("Drei Auffälligkeiten. Erstens: Die Zugwerte stehen unter ASTM D882, der Norm für dünne FOLIEN — für Formteile wäre D638 einschlägig. Dieselbe Verwechslung steht in den PLA-Blättern von Fiberlogy und Material4Print; sie reist offenbar mit dem Rohstoffdatenblatt durch die Branche. Zweitens: Die Wärmeformbeständigkeit steht unter ASTM E2092, einer thermomechanischen Analyse statt der HDT-Norm D648. Drittens: Der Biege-E-Modul ist mit „3.8 MPa“ angegeben — gemeint sind offenkundig 3,8 GPa, also 3800 MPa. Der Wert wurde nicht übernommen.",
               "Three irregularities. First: the tensile values sit under ASTM D882, the standard for thin FILMS — for mouldings D638 would apply. The same mix-up appears in the PLA sheets from Fiberlogy and Material4Print; it apparently travels with the raw-material datasheet through the industry. Second: heat deflection sits under ASTM E2092, a thermomechanical analysis instead of the HDT standard D648. Third: the flexural modulus reads “3.8 MPa” — obviously 3.8 GPa, i.e. 3800 MPa, is meant. The value was not imported.") },

  { id: "spectrum-pla-pro", material: "pla", name: "Spectrum PLA Pro", printed: true,
    file: "2021/07/en_tds_spectrum_pla_pro.pdf",
    props: {
      density: q(1.22, "g/cm³"),
      meltingTemperature: q(172.5, "°C", { min: 165, max: 180 }),
      tensileStrengthXy: q(40, "MPa", { orientation: "XY", conditions: "gedruckt, 100 % Infill, getempert 110 °C / 20 min" }),
      tensileModulusXy: q(2865, "MPa", { orientation: "XY", conditions: "gedruckt, 100 % Infill, getempert 110 °C / 20 min" }),
      flexuralStrengthXy: q(73, "MPa", { orientation: "XY", conditions: "gedruckt, 100 % Infill, getempert" }),
      flexuralModulusXy: q(2414, "MPa", { orientation: "XY", conditions: "gedruckt, 100 % Infill, getempert" }),
      izodNotchedXy: q(160, "J/m", { orientation: "XY", conditions: "amorph; teilkristallin 233 J/m, gedruckt und getempert" }),
      hdtB: q(80, "°C", { min: 75, max: 85, conditions: "gedruckt, getempert" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60 }),
    },
    features: t("Das aussagekräftigste PLA-Blatt im Bestand: Es nennt Infill, Bauorientierung UND Temperung der Prüfkörper („3D printed at 100% infill and annealed at 110°C/20 min, XY axis“) — und unterscheidet zusätzlich zwischen amorphem und teilkristallinem Zustand bei der Schlagzähigkeit (160 gegen 233 J/m). Die HDT von 75 bis 85 °C gilt entsprechend nur getempert; ungetempertes PLA liegt bei 55 °C.",
                "The most informative PLA sheet in the dataset: it states infill, build orientation AND annealing of the specimens (“3D printed at 100% infill and annealed at 110°C/20 min, XY axis”) — and additionally distinguishes amorphous from semi-crystalline state for impact strength (160 against 233 J/m). The HDT of 75 to 85 °C accordingly applies only after annealing; unannealed PLA sits at 55 °C.") },

  { id: "spectrum-pla-matt", material: "pla", name: "Spectrum PLA Matt", printed: true,
    file: "2022/05/en_tds_spectrum_pla_matt.pdf",
    props: {
      density: q(1.24, "g/cm³", { std: "ISO 1183" }),
      charpyUnnotchedXy: q(14, "kJ/m²", { std: "ISO 179", conditions: "an gedruckten Prüfkörpern 80 × 10 × 4 mm" }),
      charpyNotchedXy: q(3.5, "kJ/m²", { std: "ISO 179", conditions: "an gedruckten Prüfkörpern 80 × 10 × 4 mm" }),
      tensileStrengthXy: q(30, "MPa", { std: "ISO 527, 5 mm/min", conditions: "gedruckt; Bruchspannung" }),
      elongationAtBreakXy: q(2.9, "%", { std: "ISO 527, 5 mm/min", conditions: "gedruckt" }),
      tensileModulusXy: q(2750, "MPa", { std: "ISO 527" }),
      vicatB50: q(85, "°C", { std: "ISO 306, 50 N, 50 °C/h", conditions: "getempert" }),
      hdtA: q(66, "°C", { std: "ISO 75, 1,81 MPa", conditions: "getempert 4 h bei 90 °C" }),
      hdtB: q(116, "°C", { std: "ISO 75, 0,45 MPa", conditions: "getempert 4 h bei 90 °C" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
    },
    features: t("Zeigt den Effekt des Temperns so deutlich wie kein zweites Blatt: HDT-B 116 °C nach vier Stunden bei 90 °C — ungetempertes PLA liegt bei rund 55 °C. Zugleich ehrlich bei der Festigkeit: 30 MPa am GEDRUCKTEN Prüfkörper, gegenüber 53 bis 60 MPa, die andere PLA-Blätter am Rohstoff messen.",
                "Shows the effect of annealing more clearly than any other sheet: HDT-B 116 °C after four hours at 90 °C — unannealed PLA sits at around 55 °C. At the same time honest about strength: 30 MPa on the PRINTED specimen, against the 53 to 60 MPa other PLA sheets measure on the raw material.") },

  { id: "spectrum-pla-tough", material: "pla-tough", name: "Spectrum PLA Tough",
    file: "2022/05/en_tds_spectrum_pla_tough.pdf",
    props: {
      density: q(1.2, "g/cm³"),
      tensileStrengthXy: q(53.2, "MPa", { conditions: "Bruchkraft 43,5 MPa" }),
      elongationAtBreakXy: q(15, "%"),
      flexuralModulusXy: q(2493, "MPa"),
      flexuralStrengthXy: q(71.13, "MPa"),
      hdtB: q(55, "°C"),
      glassTransition: q(57.5, "°C", { min: 55, max: 60 }),
    },
    anomaly: t("Der E-Modul steht mit 432,8 MPa im Blatt. Für PLA ist das rund ein Achtel des Üblichen (3000 bis 3900 MPa), und der Biege-E-Modul desselben Blattes liegt mit 2493 MPa fünfmal höher — beides zusammen kann nicht stimmen. Der Wert wurde nicht übernommen. Denselben Fehler in derselben Grössenordnung tragen die Blätter von magicPLA und mysteryPLA bei 3DJAKE.",
               "The modulus reads 432.8 MPa on the sheet. For PLA that is about an eighth of the usual figure (3000 to 3900 MPa), and the same sheet's flexural modulus is five times higher at 2493 MPa — the two cannot both be right. The value was not imported. The same error of the same magnitude appears in the magicPLA and mysteryPLA sheets at 3DJAKE.") },

  { id: "spectrum-smart-abs", material: "abs", name: "Spectrum Smart ABS",
    file: "2022/05/en_tds_spectrum_smart_abs.pdf",
    props: {
      density: q(1.05, "g/cm³"),
      shrinkage: q(0.55, "%", { min: 0.4, max: 0.7, conditions: "in Fliessrichtung, 3,2 mm" }),
      tensileStrengthXy: q(fromKgcm2(460), "MPa", { conditions: "Streckspannung, 3,2 mm, 50 mm/min; im Blatt 460 kg/cm², umgerechnet" }),
      elongationAtBreakXy: q(10, "%", { conditions: "im Blatt als „>10 %“ angegeben" }),
      flexuralStrengthXy: q(fromKgcm2(740), "MPa", { conditions: "3,2 mm, 15 mm/min; im Blatt 740 kg/cm², umgerechnet" }),
      flexuralModulusXy: q(fromKgcm2(25000), "MPa", { conditions: "3,2 mm, 15 mm/min; im Blatt 25 000 kg/cm², umgerechnet" }),
      hdtB: q(85, "°C", { conditions: "6,4 mm" }),
      vicatB50: q(93, "°C"),
    },
    features: t("Nennt als eines von wenigen Blättern die Schlagzähigkeit bei −30 °C (16 gegen 33 kg·cm/cm bei Raumtemperatur) — die Hälfte. Für Aussenanwendungen im Winter ist das die relevantere Zahl.",
                "One of few sheets giving impact strength at −30 °C (16 against 33 kg·cm/cm at room temperature) — half. For outdoor use in winter that is the more relevant figure.") },

  { id: "spectrum-abs-gp450", material: "abs", name: "Spectrum ABS GP450",
    file: "2021/09/en_tds_spectrum_abs_gp450.pdf",
    props: {
      density: q(1.04, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(39, "MPa", { std: "ISO 527, 50 mm/min", conditions: "Streckspannung" }),
      elongationAtBreakXy: q(13, "%", { std: "ISO 527, 1 mm/min" }),
      tensileModulusXy: q(2100, "MPa", { std: "ISO 527, 1 mm/min" }),
      flexuralModulusXy: q(2000, "MPa", { std: "ISO 178, 2 mm/min" }),
      izodNotchedXy: q(19, "kJ/m²", { std: "ISO 180, 23 °C", conditions: "bei −30 °C nur 10 kJ/m²" }),
      vicatB50: q(95, "°C"),
    },
    ul94: { value: "HB", thicknessMm: 1.6 },
    features: t("Ein sauber durchnormtes ISO-Blatt mit Kugeldruckhärte (95 N/mm²) und Kerbschlagzähigkeit bei −30 °C. Die Brandklasse HB bei 1,6 mm ist ausdrücklich genannt — HB ist die unterste UL94-Stufe und bedeutet nur langsames Brennen.",
                "A cleanly standardised ISO sheet with ball indentation hardness (95 N/mm²) and notched impact at −30 °C. The flame class HB at 1.6 mm is explicitly stated — HB is the lowest UL94 level and only means slow burning.") },

  { id: "spectrum-asa-275", material: "asa", name: "Spectrum ASA 275",
    file: "2022/05/en_tds_spectrum_asa_275.pdf",
    props: {
      density: q(1.07, "g/cm³", { std: "ASTM D792, 23 °C" }),
      tensileStrengthXy: q(42, "MPa", { std: "ASTM D638, 23 °C", conditions: "Streckspannung" }),
      elongationAtBreakXy: q(35, "%", { std: "ASTM D638, 23 °C", conditions: "im Blatt als Mindestwert angegeben" }),
      tensileModulusXy: q(1800, "MPa", { std: "ASTM D638, 23 °C" }),
      flexuralStrengthXy: q(64, "MPa", { std: "ASTM D790, 23 °C" }),
      flexuralModulusXy: q(1900, "MPa", { std: "ASTM D790, 23 °C" }),
      izodNotchedXy: q(435, "J/m", { std: "ASTM D256, 3,2 mm, 23 °C", conditions: "bei −30 °C nur 60 J/m", confidence: "low" }),
      hdtB: q(86, "°C"),
      vicatB50: q(94, "°C", { std: "ISO 306, 50 N, 50 °C/h" }),
    },
    ul94: { value: "HB", thicknessMm: 1.5 },
    anomaly: t("435 J/m gekerbte Izod-Schlagzähigkeit sind für ASA aussergewöhnlich hoch — üblich sind 100 bis 200 J/m, und bei −30 °C nennt dasselbe Blatt nur 60 J/m. Ein Abfall auf ein Siebtel bei 53 Kelvin Temperaturunterschied ist ungewöhnlich steil. Der Wert steht mit niedriger Konfidenz.",
               "435 J/m notched Izod is exceptionally high for ASA — 100 to 200 J/m is usual, and at −30 °C the same sheet gives only 60 J/m. A drop to a seventh over 53 kelvin is unusually steep. The value stands at low confidence.") },

  { id: "spectrum-pc-abs-fr-v0", material: "abs-pc", name: "Spectrum PC/ABS FR V0",
    file: "2024/02/en_tds_spectrum_pc_abs_fr_v0.pdf",
    props: {
      density: q(1.17, "g/cm³", { std: "ISO 1183" }),
      izodNotchedXy: q(35, "kJ/m²", { std: "ISO 180/4A, 23 °C" }),
      elongationAtYieldXy: q(4, "%", { std: "ISO 527-2/50" }),
      elongationAtBreakXy: q(50, "%", { std: "ISO 527-2/50", conditions: "im Blatt als „>50 %“ angegeben" }),
      tensileModulusXy: q(2850, "MPa", { std: "ISO 527-2/1" }),
      tensileStrengthXy: q(60, "MPa", { std: "ISO 527-2/50", conditions: "Streckspannung" }),
      flexuralStrengthXy: q(110, "MPa", { std: "ISO 178" }),
      vicatB50: q(104, "°C", { std: "ISO 306" }),
      hdtA: q(90, "°C", { std: "ISO 75-2/A, 1,8 MPa" }),
    },
    ul94: { value: "V-0", thicknessMm: 1.5, strong: true },
    features: t("Der Gegenentwurf zu Brandschutz im Produktnamen: Dieses Blatt belegt UL 94 V-0 bei 1,5 UND 3,0 mm und nennt zusätzlich den Glühdrahtindex von 960 °C nach IEC 60695-2-12. Dazu halogenfrei. Die Charpy-Schlagzähigkeit ungekerbt ist bei 23 °C UND bei −30 °C mit „NB“ angegeben — no break, der Prüfkörper bricht gar nicht. Für ein flammgeschütztes Material ist das ungewöhnlich, weil Flammschutzmittel Zähigkeit üblicherweise kosten.",
                "The counter-example to flame retardancy in the product name: this sheet documents UL 94 V-0 at 1.5 AND 3.0 mm and additionally states the glow wire index of 960 °C to IEC 60695-2-12. Halogen-free too. Unnotched Charpy impact is given as “NB” at 23 °C AND at −30 °C — no break, the specimen does not fracture at all. For a flame-retardant material that is unusual, because flame retardants normally cost toughness.") },

  { id: "spectrum-pctg-premium", material: "pctg", name: "Spectrum PCTG Premium",
    file: "2022/05/en_tds_spectrum_pctg.pdf",
    props: {
      density: q(1.23, "g/cm³"),
      tensileStrengthXy: q(44, "MPa", { conditions: "Streckspannung; Bruchspannung 46 MPa" }),
      elongationAtYieldXy: q(4.4, "%"),
      elongationAtBreakXy: q(220, "%"),
      flexuralStrengthXy: q(60, "MPa"),
      flexuralModulusXy: q(1600, "MPa"),
      izodNotchedXy: q(93, "kJ/m²", { std: "ISO 180, 23 °C", conditions: "im Blatt steht versehentlich „93°C KJ/m2“" }),
      hdtA: q(64, "°C", { std: "ISO 75, 1,820 MPa" }),
      hdtB: q(76, "°C", { std: "ISO 75, 0,455 MPa" }),
    },
    features: t("Das dritte PCTG-Blatt im Bestand mit praktisch identischen Zahlen — 44/46 MPa, 220 % Bruchdehnung, 1600 MPa Biegemodul, HDT 76/64 °C stehen wortgleich auch bei 3DJAKE und Fiberlogy. Drei Marken, ein Granulat. Solche Dreifachbestätigungen sind selten und machen die Werte belastbarer als jede Einzelquelle.",
                "The third PCTG sheet in the dataset with practically identical figures — 44/46 MPa, 220 % elongation at break, 1600 MPa flexural modulus, HDT 76/64 °C appear verbatim at 3DJAKE and Fiberlogy too. Three brands, one pellet grade. Such triple confirmations are rare and make the values more dependable than any single source.") },

  { id: "spectrum-pa6-cf15", material: "pa6-cf", name: "Spectrum PA6 Low Warp CF15",
    file: "2022/10/en_tds_spectrum_pa6_low_warp_cf15s.pdf",
    props: {
      density: q(1.18, "g/cm³"),
      waterAbsorption: q(8, "%", { conditions: "Sättigung in Wasser bei 23 °C; bei 50 % rF nur 2,5 %" }),
      tensileStrengthXy: q(120, "MPa", { conditions: "23 °C, 50 mm/min", confidence: "low" }),
      tensileModulusXy: q(9000, "MPa", { conditions: "23 °C, 50 mm/min", confidence: "low" }),
      elongationAtBreakXy: q(4, "%", { conditions: "23 °C, 50 mm/min" }),
      flexuralStrengthXy: q(180, "MPa", { conditions: "23 °C, 2 mm/min", confidence: "low" }),
      flexuralModulusXy: q(8000, "MPa", { conditions: "23 °C, 2 mm/min", confidence: "low" }),
      charpyUnnotchedXy: q(60, "kJ/m²", { std: "23 °C" }),
      charpyNotchedXy: q(4, "kJ/m²", { std: "23 °C" }),
      hdtA: q(65, "°C", { conditions: "1,8 MPa" }),
    },
    anomaly: t("Die Festigkeitswerte liegen im selben Bereich wie beim SUNLU PA6-CF (120 gegen 170 MPa) und damit weit über dem gedruckten PA6-CF von Bambu Lab (102 MPa) — bei einer HDT-A von nur 65 °C. 9000 MPa Steifigkeit neben einer Wärmeformbeständigkeit von 65 °C passen schlecht zusammen; carbonverstärkte Polyamide erreichen üblicherweise 150 bis 200 °C. Die mechanischen Werte stehen deshalb mit niedriger Konfidenz. Bemerkenswert ehrlich ist dagegen die Feuchteangabe: 8 % Wasseraufnahme bis zur Sättigung, 2,5 % im Normklima — diese Zahl verschweigen die meisten Polyamidblätter.",
               "The strength figures sit in the same range as SUNLU's PA6-CF (120 against 170 MPa) and thus far above Bambu Lab's printed PA6-CF (102 MPa) — with an HDT-A of only 65 °C. 9000 MPa stiffness alongside a heat deflection temperature of 65 °C sit poorly together; carbon-reinforced polyamides usually reach 150 to 200 °C. The mechanical values therefore stand at low confidence. Remarkably honest by contrast is the moisture statement: 8 % water uptake to saturation, 2.5 % in standard climate — a figure most polyamide sheets keep quiet about.") },

  { id: "spectrum-s-flex-98a", material: "tpu-98a", name: "Spectrum S-Flex 98A",
    file: "2022/05/en_tds_spectrum_sflex_98a.pdf",
    props: {
      density: q(1.09, "g/cm³"),
      shrinkage: q(0.8, "%"),
      hardnessShoreA: q(98, "Shore A"),
      tensileStrengthXy: q(55, "MPa"),
      elongationAtBreakXy: q(510, "%"),
      tearStrength: q(120, "kN/m", { conditions: "im Blatt als 120 N/mm angegeben" }),
      abrasionLoss: q(30, "mm³"),
      compressionSet: q(32, "%", { conditions: "70 h bei 23 °C; bei 24 h und 70 °C sind es 50 %" }),
      reboundResilience: q(30, "%", { conditions: "Bayshore" }),
    },
    features: t("Ein Elastomerblatt, wie es sein sollte: Spannung bei definierter Dehnung (15,4 MPa bei 100 %, 25 MPa bei 300 %), Abrieb, Druckverformungsrest bei zwei Bedingungen und Rückprallelastizität. Genau diese Grössen entscheiden bei einer Dichtung oder einem Dämpfer — und genau sie fehlen in fast allen TPU-Blättern.",
                "An elastomer sheet as it should be: stress at defined strain (15.4 MPa at 100 %, 25 MPa at 300 %), abrasion, compression set at two conditions and rebound resilience. Precisely these figures decide the matter for a seal or a damper — and precisely they are missing from almost every TPU sheet.") },

  { id: "spectrum-s-flex-90a", material: "tpu-95a", name: "Spectrum S-Flex 90A",
    file: "2022/05/en_tds_spectrum_sflex_90a.pdf",
    props: {
      density: q(1.22, "g/cm³"),
      hardnessShoreA: q(90, "Shore A"),
      tensileStrengthXy: q(35, "MPa", { conditions: "in Maschinenrichtung" }),
      elongationAtBreakXy: q(500, "%", { conditions: "in Maschinenrichtung" }),
      tearStrength: q(90, "kN/m", { conditions: "Weiterreisswiderstand in Maschinenrichtung; im Blatt 90 N/mm" }),
      abrasionLoss: q(35, "mm³"),
    },
    anomaly: t("Shore A 90 liegt zwischen den geführten Typen TPU 85A und TPU 95A; die Zuordnung zu TPU 95A ist eine Einordnung dieser Datenbank, keine Herstellerangabe. Zudem nennt das Blatt die Werte „in Maschinenrichtung“ — das ist eine Angabe aus der Folien- und Extrusionsprüfung und sagt nichts über die Bauorientierung eines gedruckten Teils.",
               "Shore A 90 sits between the carried types TPU 85A and TPU 95A; the assignment to TPU 95A is this database's judgement, not a manufacturer statement. The sheet moreover gives the values “in machine direction” — that is a statement from film and extrusion testing and says nothing about the build orientation of a printed part.") },
];

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, na = 0, nu = 0;
for (const p of P) {
  const url = `${U}/${p.file}`;
  const parts = [p.printed ? PRINTED : UNDECLARED];
  if (p.anomaly) parts.push(t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`,
                              `Finding on this datasheet: ${p.anomaly.en}`));
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "Spectrum", manufacturer: "Spectrum Group", productName: p.name, origin: "Polen",
    specimenType: p.printed ? "printed" : "undeclared",
    specimenNote: t(parts.map((x) => x.de).join("\n\n"), parts.map((x) => x.en).join("\n\n")),
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technical Data Sheet`, url, retrievedAt: RETRIEVED },
    productUrl: "https://spectrumfilaments.com/en/",
    properties: p.props,
    ...(p.ul94 ? {
      compliance: {
        ul94: {
          value: p.ul94.value, thicknessMm: p.ul94.thicknessMm, testStandard: "UL 94",
          source: "src_tds", confidence: p.ul94.strong ? "medium" : "low",
          note: p.ul94.strong
            ? t("Belegt bei 1,5 UND 3,0 mm, zusätzlich Glühdrahtindex 960 °C nach IEC 60695-2-12 und halogenfrei. Das Blatt nennt keine Prüfstelle und keine Zeugnisnummer — für eine Bahn- oder Luftfahrtanwendung wäre das noch anzufordern.",
                "Documented at 1.5 AND 3.0 mm, plus glow wire index 960 °C to IEC 60695-2-12 and halogen-free. The sheet names no test house and no certificate number — for a rail or aerospace application that would still have to be requested.")
            : t("HB ist die unterste Stufe der UL94-Skala und bedeutet nur, dass das Material langsam brennt — kein Brandschutz im Sinne einer Bahn- oder Luftfahrtanforderung.",
                "HB is the lowest level of the UL94 scale and only means the material burns slowly — not flame retardancy in the sense of a rail or aerospace requirement."),
        },
      },
    } : {}),
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Spectrum Group",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url, retrievedAt: RETRIEVED,
        confidenceCeiling: p.printed ? "high" : (p.anomaly ? "low" : "medium"),
        note: t(`Herstellerdatenblatt mit Textebene. ${p.printed ? "Prüfkörper deklariert: gedruckt, mit Infill, Orientierung und Temperung." : "Prüfkörper nicht deklariert."}`,
                `Manufacturer datasheet with text layer. ${p.printed ? "Specimen declared: printed, with infill, orientation and annealing." : "Specimen not declared."}`),
      }],
    },
  };
  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  if (p.anomaly) na++;
  if (p.ul94) nu++;
}

console.log(`${n} Spectrum-Produkte geschrieben (${na} mit Befund, ${nu} mit UL94-Angabe)`);
console.log(`  2 Blaetter deklarieren gedruckte Pruefkoerper (PLA Pro, PLA Matt)`);
console.log(`  HIPS-X ausgelassen: kein HIPS-Werkstofftyp in der Datenbank`);
