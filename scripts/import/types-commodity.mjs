/**
 * Werkstofftypen, die erst durch die Fillamentum-Blaetter belegbar wurden.
 *
 * WARUM DIESE SECHS UND NICHT MEHR
 * Ein Werkstofftyp entsteht in dieser Datenbank nicht, weil der Name bekannt ist, sondern
 * weil ein Datenblatt ihn traegt. HIPS, PP, PVDF, PVC, PEBA und OBC standen bisher aus
 * genau einem Grund nicht drin: Es gab kein Blatt. Fillamentum liefert fuer alle sechs
 * eines - mit Norm, Pruefbedingung und Zahlenwert.
 *
 * WAS DAMIT ENDLICH BEANTWORTBAR WIRD
 * Vier Fragen, die der Berater bisher nicht beantworten konnte:
 *   - "Ich brauche etwas fuer verduennte Lauge und Heissdampf." -> PP, autoklavierbar.
 *   - "Was haelt Kraftstoff und Loesemittel aus?"               -> PVDF.
 *   - "Ich brauche eine Stuetzstruktur, die sich ausloesen laesst." -> HIPS in Limonen.
 *   - "Weicher als TPU, aber leichter."                          -> PEBA, 1,0 g/cm3.
 *
 * DIE GRENZE DIESER SECHS DATENSAETZE
 * Jeder Typ steht auf EINEM Herstellerblatt. Bei PLA stuetzen sich die Typwerte auf
 * zwoelf Blaetter und mitteln die Streuung heraus; hier gibt es nichts zu mitteln. Die
 * Datenblattwerte tragen deshalb `low` statt `medium` - nicht weil das Blatt schlechter
 * waere, sondern weil eine einzelne Quelle keine Streuung zeigt. Sobald ein zweiter
 * Hersteller dazukommt, gehoert der Wert neu bewertet.
 *
 * OBC 905 IST DER AUSREISSER IM POSITIVEN SINN
 * Es ist der einzige Werkstoff im Bestand, dessen Typwerte aus einem Blatt stammen, das
 * XY UND Z ausweist - und zwar an gedruckten Pruefkoerpern mit angegebener Duesen- und
 * Betttemperatur. Daher als einziger dieser sechs ein belegter Anisotropiefaktor.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-02";
const U = "https://fillamentum.com/wp-content/uploads";

const t = (de, en) => ({ de, en });

/** Datenblattwert. Konfidenz bewusst `low`: eine Quelle zeigt keine Streuung. */
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: o.source ?? "src_tds",
  confidence: o.confidence ?? "low",
  ...(o.note ? { note: o.note } : {}),
});

/** Eigene Einschaetzung auf einer 1-5-Skala. Immer `estimated`. */
const s = (value, scale, note) => ({
  value, scale, source: "estimate_reasoning", confidence: "estimated",
  ...(note ? { note } : {}),
});

/** Eigene konservative Dauergebrauchsempfehlung mit Abstand zur Erweichungsgrenze. */
const service = (value, note) => ({
  value, unit: "°C", conditions: "dauerhaft unter mechanischer Last, Luft",
  source: "estimate_reasoning", confidence: "estimated", note,
});

const XXL_NOTE = t(
  "Geschätzt aus Kammerbedarf, Verzugsneigung und Schichthaftung — nicht durch eigene Fertigung belegt. Muss durch Reents3D-Werkstatterfahrung ersetzt werden.",
  "Estimated from chamber requirement, warping tendency and layer adhesion — not backed by our own production. To be replaced by Reents3D shop-floor experience.");

const PORTFOLIO_NOTE = t(
  "Noch nicht mit dem Reents3D-Materiallager abgeglichen. Geht per ADR-004 NICHT in das Scoring ein.",
  "Not yet reconciled with the Reents3D inventory. Per ADR-004 this does NOT enter scoring.");

const SINGLE_SOURCE = t(
  "Dieser Werkstofftyp steht auf einem einzigen Herstellerdatenblatt. Die Datenblattwerte tragen deshalb `low` statt `medium`: Eine Quelle kann keine Streuung zeigen, und genau die Streuung zwischen Herstellern ist bei den gut belegten Typen die eigentliche Information. Sobald ein zweites Blatt vorliegt, gehören die Werte neu bewertet.",
  "This material type rests on a single manufacturer datasheet. Its datasheet values therefore carry `low` instead of `medium`: one source cannot show scatter, and it is precisely the scatter between manufacturers that carries the information for the well-covered types. As soon as a second sheet exists, the values should be reassessed.");

const TYPES = [
  /* ------------------------------------------------------------------ HIPS */
  {
    id: "hips", name: "HIPS", family: "HIPS", polymerClass: "amorphous",
    variant: ["support", "basic"],
    aliases: ["Polystyrol schlagzäh", "High Impact Polystyrene", "Stützmaterial"],
    file: "2020/10/Technical-Data-Sheet_HIPS-Extrafill_03012019.pdf",
    title: "HIPS Extrafill — Technical Data Sheet",
    abstract: t(
      "HIPS ist im FDM-Druck vor allem eines: das Stützmaterial, das sich in D-Limonen auflöst, während ABS und ASA unberührt bleiben. Als Konstruktionswerkstoff ist es gutmütig zu drucken, mit HDT-A 85 °C sogar wärmer belastbar als PLA, und dielektrisch sehr gut. Seine eigentliche Kennzahl steht im Kleingedruckten: Charpy ungekerbt bei 23 °C „kein Bruch“ — es zerbricht schlicht nicht. Gekerbt fällt derselbe Wert auf 17 kJ/m². Diese Spreizung ist die ehrlichste Kerbempfindlichkeitsangabe im ganzen Bestand.",
      "In FDM printing HIPS is above all one thing: the support material that dissolves in D-limonene while ABS and ASA remain untouched. As a construction material it is forgiving to print, at HDT-A 85 °C it takes more heat than PLA, and it is dielectrically excellent. Its real figure hides in the fine print: Charpy unnotched at 23 °C reads “no break” — it simply does not fracture. Notched, the same figure drops to 17 kJ/m². That spread is the most honest notch-sensitivity statement in the whole dataset."),
    positioning: t(
      "Das lösliche Stützmaterial für ABS und ASA — und ein unterschätzter Gehäusewerkstoff.",
      "The soluble support material for ABS and ASA — and an underrated housing material."),
    mechanics: {
      density: q(1.05, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(26, "MPa", { std: "ISO 527", orientation: "n/a" }),
      elongationAtBreakXy: q(40, "%", { std: "ISO 527", orientation: "n/a" }),
      tensileModulusXy: q(2000, "MPa", { std: "ISO 527", orientation: "n/a" }),
      flexuralStrengthXy: q(40, "MPa", { std: "ISO 178", orientation: "n/a" }),
      flexuralModulusXy: q(2100, "MPa", { std: "ISO 178", orientation: "n/a" }),
      charpyNotchedXy: q(17, "kJ/m²", { std: "ISO 179-1eA", conditions: "23 °C, gekerbt", orientation: "n/a" }),
      charpyUnnotchedXy: q(130, "kJ/m²", {
        std: "ISO 179-1eU", conditions: "−30 °C, ungekerbt", orientation: "n/a",
        note: t("Bei 23 °C weist dasselbe Blatt ungekerbt „kein Bruch“ aus — der Wert lässt sich nicht als Zahl führen. Übernommen ist deshalb der −30-°C-Wert, der die untere Grenze markiert.",
                "At 23 °C the same sheet reads “no break” unnotched — that cannot be carried as a number. The −30 °C value is imported instead, marking the lower bound."),
      }),
      toughness: s(4, "toughness"),
      notchSensitivity: s(4, "notchSensitivity", t(
        "Kerbempfindlich, und das Blatt belegt es ausnahmsweise selbst: ungekerbt kein Bruch, gekerbt 17 kJ/m². Scharfe Innenecken sind bei HIPS keine Schönheitsfrage.",
        "Notch sensitive, and for once the sheet documents it: unnotched no break, notched 17 kJ/m². Sharp internal corners are not a cosmetic question with HIPS.")),
    },
    thermal: {
      hdtA: q(85, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(89, "°C", { std: "ISO 75, 0,45 MPa" }),
      vicatB50: q(88.5, "°C", { std: "ISO 306, 50 °C/h, 50 N" }),
      recommendedMaxServiceTemperature: service(60, t(
        "Abstand zur HDT-B von 89 °C. Gedruckte Teile erreichen die Blattwerte ohnehin nicht.",
        "Margin to the HDT-B of 89 °C. Printed parts do not reach sheet values anyway.")),
    },
    processing: {
      nozzleTemperature: q(240, "°C", { min: 230, max: 250 }),
      bedTemperature: q(97, "°C", { min: 90, max: 105 }),
      chamberRequirement: { value: "recommended", source: "estimate_reasoning", confidence: "estimated" },
      printability: s(4, "printability"),
      warpingTendency: s(3, "warpingTendency"),
      hygroscopy: s(1, "hygroscopy", t(
        "Wasseraufnahme unter 0,1 % nach ISO 62 — belegt, nicht geschätzt. HIPS ist einer der wenigen Werkstoffe, die ohne Trockner auskommen.",
        "Water uptake below 0.1 % to ISO 62 — documented, not estimated. HIPS is one of the few materials that manages without a dryer.")),
      abrasiveness: s(1, "abrasiveness"),
    },
    durability: { uvResistance: s(1, "uvResistance"), weatherResistance: s(1, "weatherResistance") },
    finishing: {
      surfaceQuality: s(3, "surfaceQuality"), layerLineVisibility: s(3, "layerLineVisibility"),
      sandability: s(4, "sandability"), fillability: s(4, "fillability"),
      paintAdhesion: s(4, "paintAdhesion"), bondability: s(4, "bondability"),
      gloss: { value: "matte", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 2, availability: 3, smallSeries: 4, xxl: 800, xxlMin: 400, xxlMax: 1200 },
    emissions: "moderate",
    emissionsNote: t(
      "Das Blatt sagt es selbst: Beim Drucken werden kleine Mengen Styrol frei. Absaugung oder geschlossener Bauraum sind bei HIPS keine Vorsichtsmaßnahme, sondern eine Angabe des Herstellers.",
      "The sheet says so itself: small quantities of styrene are released during printing. Extraction or an enclosed build chamber is not a precaution with HIPS but a manufacturer statement."),
  },

  /* -------------------------------------------------------------------- PP */
  {
    id: "pp", name: "PP", family: "PP", polymerClass: "semi-crystalline",
    variant: ["basic"],
    aliases: ["Polypropylen", "Polypropylene", "PP-H"],
    file: "2020/10/Technical-Data-Sheet_PP-2320.pdf",
    title: "PP 2320 — Technical Data Sheet",
    abstract: t(
      "PP ist der Chemikalienwerkstoff des Bestands und der leichteste dazu: 0,96 g/cm³ — es schwimmt. Gegen Säuren, Laugen, Salze und Alkohole ist es beständig, es lässt sich autoklavieren, und seine Charpy-Schlagzähigkeit von 184 kJ/m² ungekerbt ist der höchste Wert der Datenbank. Der Preis dafür ist der Druck: PP schwindet stark, haftet auf nahezu keinem Druckbett und braucht eine PP-Unterlage oder Spezialkleber. Die Zugfestigkeit von 23 MPa ist die niedrigste aller starren Werkstoffe hier.",
      "PP is the dataset's chemicals material and the lightest one at that: 0.96 g/cm³ — it floats. It resists acids, alkalis, salts and alcohols, it can be autoclaved, and its Charpy impact strength of 184 kJ/m² unnotched is the highest figure in the database. The price is printing: PP shrinks heavily, adheres to almost no build surface and needs a PP sheet or special adhesive. Its tensile strength of 23 MPa is the lowest of any rigid material here."),
    positioning: t(
      "Wenn das Medium den Werkstoff bestimmt — und niemand auf Festigkeit angewiesen ist.",
      "When the medium picks the material — and nobody depends on strength."),
    mechanics: {
      density: q(0.96, "g/cm³", { std: "ISO 1183 A", conditions: "(23 ± 2) °C" }),
      tensileStrengthXy: q(23, "MPa", { std: "ISO 527", orientation: "n/a" }),
      elongationAtBreakXy: q(20, "%", { std: "ISO 527", orientation: "n/a" }),
      tensileModulusXy: q(1400, "MPa", { std: "ISO 527", orientation: "n/a" }),
      charpyUnnotchedXy: q(184, "kJ/m²", { std: "ISO 179-1/1eU", conditions: "25 °C, ungekerbt", orientation: "n/a" }),
      toughness: s(5, "toughness"),
      notchSensitivity: s(2, "notchSensitivity"),
    },
    thermal: {
      meltingTemperature: q(163, "°C", {
        source: "estimate_reasoning", confidence: "estimated",
        note: t("Das Blatt nennt keinen Schmelzpunkt. 163 °C ist der Lehrbuchwert für isotaktisches Homopolymer-PP und dient nur der Einordnung.",
                "The sheet names no melting point. 163 °C is the textbook value for isotactic homopolymer PP and serves only for orientation."),
      }),
      recommendedMaxServiceTemperature: service(80, t(
        "PP ist dampfsterilisierbar; die Grenze setzt hier die Kriechneigung unter Last, nicht die Erweichung. Das Blatt weist keine HDT aus.",
        "PP can be steam sterilised; the limit here is creep under load, not softening. The sheet gives no HDT.")),
      minServiceTemperature: q(-40, "°C", {
        conditions: "Biegefestigkeit laut Blatt bis hierhin erhalten",
        note: t("Das Blatt hebt ausdrücklich hervor, dass die Biegefestigkeit bis −40 °C gut bleibt. Bei den Styrolcopolymeren bricht die Schlagzähigkeit in diesem Bereich ein — PP ist damit der kältetauglichste starre Werkstoff im Bestand.",
                "The sheet explicitly stresses that flexural strength stays good down to −40 °C. With the styrenics impact strength collapses in this range — making PP the most cold-capable rigid material in the dataset."),
      }),
    },
    processing: {
      nozzleTemperature: q(235, "°C", { min: 225, max: 245 }),
      bedTemperature: q(97, "°C", { min: 90, max: 105 }),
      chamberRequirement: { value: "recommended", source: "estimate_reasoning", confidence: "estimated" },
      printSpeed: q(30, "mm/s", { min: 20, max: 40 }),
      printability: s(2, "printability", t(
        "Der niedrigste Wert im Bestand, und das Blatt begründet ihn selbst: „Use of adhesive is necessary due to nonpolar polymer structure. Always use brim.“ PP haftet auf PEI, Glas und Klebeband praktisch nicht — es braucht eine PP-Platte oder einen PP-Haftvermittler.",
        "The lowest figure in the dataset, and the sheet justifies it itself: “Use of adhesive is necessary due to nonpolar polymer structure. Always use brim.” PP barely adheres to PEI, glass or tape — it needs a PP sheet or a PP adhesion promoter.")),
      warpingTendency: s(5, "warpingTendency"),
      hygroscopy: s(1, "hygroscopy"),
      abrasiveness: s(1, "abrasiveness"),
    },
    durability: { uvResistance: s(2, "uvResistance"), weatherResistance: s(3, "weatherResistance") },
    finishing: {
      surfaceQuality: s(3, "surfaceQuality"), layerLineVisibility: s(3, "layerLineVisibility"),
      sandability: s(2, "sandability"), fillability: s(1, "fillability"),
      paintAdhesion: s(1, "paintAdhesion", t(
        "Der schlechteste Wert im Bestand. Dieselbe unpolare Oberfläche, die PP am Druckbett scheitern lässt, lässt auch jeden Lack abplatzen. Ohne Beflammen oder Plasmavorbehandlung ist PP nicht lackierbar.",
        "The worst figure in the dataset. The same non-polar surface that makes PP fail on the build plate makes every paint flake off. Without flame or plasma treatment PP cannot be painted.")),
      bondability: s(1, "bondability"),
      gloss: { value: "matte", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 3, availability: 2, smallSeries: 3, xxl: 400, xxlMin: 200, xxlMax: 700 },
    emissions: "low",
    /* Vom Blatt belegte Medienangaben - keine Ableitung aus der Polymerklasse. */
    chemicals: [
      ["chem_water", "resistant"], ["chem_acetone", "resistant"], ["chem_dilute_acid", "resistant"],
      ["chem_dilute_alkali", "resistant"], ["chem_ethanol", "resistant"], ["chem_ipa", "resistant"],
      ["chem_salt_water", "resistant"],
      ["chem_mineral_oil", "limited"], ["chem_grease", "limited"], ["chem_hydraulic_oil", "limited"],
      ["chem_brake_fluid", "limited"],
    ],
    chemicalsNote: t(
      "Diese elf Einstufungen stammen aus dem Datenblatt, nicht aus der Familienmatrix: Es nennt ausdrücklich „Resistance against water, acetone, acids, alkalis, alcohols, salts: good“ und „against oils, greases, car fluids, ozone: medium“, jeweils bei 25 °C. Die übrigen Medien sind wie üblich abgeleitet.",
      "These eleven ratings come from the datasheet, not from the family matrix: it explicitly states “Resistance against water, acetone, acids, alkalis, alcohols, salts: good” and “against oils, greases, car fluids, ozone: medium”, each at 25 °C. The remaining media are derived as usual."),
    foodContact: "not-declared",
    foodNote: t(
      "Das Blatt erklärt ausdrücklich: „The material complies with requirements for food contact applications.“ Es nennt jedoch weder eine Verordnung noch eine Prüfstelle — für eine Konformitätserklärung nach EU 10/2011 reicht das nicht.",
      "The sheet explicitly states: “The material complies with requirements for food contact applications.” It names neither a regulation nor a test house — that is not enough for a declaration of conformity under EU 10/2011."),
  },

  /* ------------------------------------------------------------------ PVDF */
  {
    id: "pvdf", name: "PVDF", family: "PVDF", polymerClass: "semi-crystalline",
    variant: ["basic"],
    aliases: ["Polyvinylidenfluorid", "Fluorkunststoff", "Fluorodur", "Kynar", "Solef"],
    file: "2021/01/Technical-Data-Sheet_Fluorodur_EN_09122020_FI.pdf",
    title: "Fluorodur (PVDF) — Technical Data Sheet",
    abstract: t(
      "PVDF ist der chemisch beständigste Werkstoff, der sich noch auf einem gewöhnlichen FDM-Drucker verarbeiten lässt: beständig gegen Säuren, Laugen, Kraftstoffe, Öle und die meisten Lösemittel, dauerhaft UV- und witterungsfest, Einsatztemperatur bis etwa 100 bis 140 °C. Zwei Dinge muss man wissen. Erstens ist es mit 1,79 g/cm³ der schwerste Kunststoff im Bestand — fast doppelt so schwer wie PP bei gleichem Volumen. Zweitens hat es eine echte chemische Lücke: starke Laugen und Ketone greifen es an, ausgerechnet Aceton und MEK.",
      "PVDF is the most chemically resistant material still processable on an ordinary FDM printer: resistant to acids, alkalis, fuels, oils and most solvents, permanently UV and weather stable, service temperature to roughly 100 to 140 °C. Two things must be known. First, at 1.79 g/cm³ it is the heaviest polymer in the dataset — nearly twice the weight of PP at equal volume. Second, it has a genuine chemical gap: strong alkalis and ketones attack it, acetone and MEK of all things."),
    positioning: t(
      "Wenn das Medium alles andere auflöst — und Gewicht keine Rolle spielt.",
      "When the medium dissolves everything else — and weight does not matter."),
    mechanics: {
      density: q(1.79, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(34, "MPa", { std: "ASTM D638", conditions: "Streckspannung", orientation: "n/a" }),
      elongationAtBreakXy: q(8, "%", { std: "ASTM D638", orientation: "n/a" }),
      tensileModulusXy: q(2000, "MPa", { std: "ASTM D638", orientation: "n/a" }),
      flexuralStrengthXy: q(50, "MPa", { std: "ASTM D790", orientation: "n/a" }),
      flexuralModulusXy: q(1700, "MPa", { std: "ASTM D790", conditions: "1,27 mm/min", orientation: "n/a" }),
      charpyNotchedXy: q(5, "kJ/m²", {
        std: "ASTM D256", conditions: "23 °C, gekerbt",
        orientation: "n/a",
        note: t("Das Blatt beschreibt PVDF im Fließtext als „high impact strength“ und weist im Tabellenteil 5 kJ/m² gekerbt aus — ein niedriger Wert. Beides ist vereinbar, wenn der Fließtext den ungekerbten Fall meint, aber das Blatt sagt es nicht.",
                "The sheet describes PVDF in prose as “high impact strength” while the table gives 5 kJ/m² notched — a low figure. Both are reconcilable if the prose means the unnotched case, but the sheet does not say so."),
      }),
      toughness: s(2, "toughness"),
      notchSensitivity: s(4, "notchSensitivity"),
    },
    thermal: {
      recommendedMaxServiceTemperature: service(100, t(
        "Das Blatt nennt 100 bis 140 °C, abhängig von Medium, Temperatur und Dauer. Übernommen ist die untere Grenze.",
        "The sheet names 100 to 140 °C depending on medium, temperature and duration. The lower bound is imported.")),
    },
    processing: {
      nozzleTemperature: q(260, "°C", { min: 250, max: 270, note: t(
        "Die Obergrenze ist bei PVDF keine Qualitätsfrage. Fluorpolymere können bei Überhitzung Flusssäure freisetzen, die Messing- und Stahldüsen angreift — ein längerer Stillstand mit heißer Düse genügt.",
        "The upper limit is not a quality question with PVDF. Fluoropolymers can release hydrofluoric acid when overheated, which attacks brass and steel nozzles — a longer stall with a hot nozzle is enough.") }),
      bedTemperature: q(105, "°C", { min: 100, max: 120 }),
      chamberRequirement: { value: "mandatory", source: "estimate_reasoning", confidence: "estimated" },
      printability: s(2, "printability"),
      warpingTendency: s(4, "warpingTendency"),
      hygroscopy: s(1, "hygroscopy"),
      abrasiveness: s(2, "abrasiveness"),
    },
    durability: { uvResistance: s(5, "uvResistance"), weatherResistance: s(5, "weatherResistance") },
    finishing: {
      surfaceQuality: s(3, "surfaceQuality"), layerLineVisibility: s(3, "layerLineVisibility"),
      sandability: s(2, "sandability"), fillability: s(1, "fillability"),
      paintAdhesion: s(1, "paintAdhesion"), bondability: s(1, "bondability"),
      gloss: { value: "semi-gloss", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 5, availability: 1, smallSeries: 2, xxl: 300, xxlMin: 150, xxlMax: 500 },
    emissions: "high",
    emissionsNote: t(
      "Fluorpolymere gehören zu den wenigen FDM-Werkstoffen mit einem realen inhalativen Risiko: Bei Überhitzung entstehen Fluorwasserstoff und Fluorphosgen. Geschlossener Bauraum mit Abluftführung, nicht nur Filter.",
      "Fluoropolymers are among the few FDM materials with a real inhalation risk: overheating produces hydrogen fluoride and fluorophosgene. Enclosed chamber with exhaust ducting, not just a filter."),
  },

  /* ------------------------------------------------------------------- PVC */
  {
    id: "pvc", name: "PVC", family: "PVC", polymerClass: "amorphous",
    variant: ["basic"],
    aliases: ["Polyvinylchlorid", "Vinyl", "Hart-PVC", "PVC-U"],
    file: "2020/10/TDS_Vinyl-303_FI.pdf",
    title: "Vinyl 303 (PVC) — Technical Data Sheet",
    abstract: t(
      "PVC im FDM-Druck ist ein Sonderfall: 46 MPa Zugfestigkeit bei Shore D 78, sehr gute Beständigkeit gegen Säuren und Laugen, von Haus aus schwer entflammbar — und mit einer Vicat-Erweichung von nur 71 °C thermisch enger begrenzt als PLA. Der eigentliche Grund, warum PVC im 3D-Druck selten ist, steht nicht im Datenblatt: Bei Überhitzung spaltet es Chlorwasserstoff ab, der Düse, Heizblock und Lunge angreift. Wer PVC druckt, braucht eine Temperaturführung, die keinen Stau verzeiht.",
      "PVC in FDM printing is a special case: 46 MPa tensile strength at Shore D 78, very good resistance to acids and alkalis, inherently flame retardant — and with a Vicat softening point of only 71 °C thermally tighter than PLA. The real reason PVC is rare in 3D printing is not in the datasheet: when overheated it splits off hydrogen chloride, which attacks the nozzle, the heat block and the lungs. Anyone printing PVC needs temperature control that forgives no stall."),
    positioning: t(
      "Chemisch beständig und schwer entflammbar — mit einem Verarbeitungsrisiko, das man kennen muss.",
      "Chemically resistant and flame retardant — with a processing risk that has to be known."),
    mechanics: {
      density: q(1.35, "g/cm³"),
      tensileStrengthXy: q(46.1, "MPa", {
        std: "werkseigene Methode 10-LA 049 (siehe Befund)", conditions: "bei Bruch", orientation: "n/a",
      }),
      elongationAtBreakXy: q(13.1, "%", { std: "werkseigene Methode 10-LA 049 (siehe Befund)", orientation: "n/a" }),
      hardnessShoreD: q(78, "Shore D", { std: "werkseigene Methode 10-LA 031 (siehe Befund)" }),
      toughness: s(2, "toughness"),
      notchSensitivity: s(4, "notchSensitivity"),
    },
    thermal: {
      vicatB50: q(71, "°C", { std: "ISO 306", conditions: "50 °C/h, 5 kg" }),
      recommendedMaxServiceTemperature: service(50, t(
        "Deutlicher Abstand zur Vicat-Erweichung von 71 °C. PVC ist thermisch der engste starre Werkstoff im Bestand.",
        "Clear margin to the Vicat softening point of 71 °C. PVC is thermally the tightest rigid material in the dataset.")),
    },
    processing: {
      nozzleTemperature: q(222, "°C", { min: 215, max: 230, note: t(
        "Das Blatt betont, das Polymer sei thermisch stabil genug, um Düsenverstopfung zu vermeiden — es erwähnt die Chlorwasserstoffabspaltung bei Überhitzung nicht. Ein längerer Stillstand mit heißer Düse genügt, um Heizblock und Düse dauerhaft zu schädigen.",
        "The sheet stresses that the polymer is thermally stable enough to avoid nozzle clogging — it does not mention hydrogen chloride release on overheating. A longer stall with a hot nozzle is enough to permanently damage the heat block and nozzle.") }),
      bedTemperature: q(80, "°C"),
      chamberRequirement: { value: "recommended", source: "estimate_reasoning", confidence: "estimated" },
      printability: s(2, "printability"),
      warpingTendency: s(3, "warpingTendency"),
      hygroscopy: s(2, "hygroscopy"),
      abrasiveness: s(1, "abrasiveness"),
    },
    durability: { uvResistance: s(4, "uvResistance"), weatherResistance: s(4, "weatherResistance") },
    finishing: {
      surfaceQuality: s(3, "surfaceQuality"), layerLineVisibility: s(3, "layerLineVisibility"),
      sandability: s(3, "sandability"), fillability: s(3, "fillability"),
      paintAdhesion: s(3, "paintAdhesion"), bondability: s(5, "bondability", t(
        "Der einzige Werkstoff im Bestand mit einem echten Kaltschweißkleber: PVC-Kleber löst die Oberfläche an und verschweißt die Fügepartner stofflich.",
        "The only material in the dataset with a genuine solvent-weld adhesive: PVC cement dissolves the surface and fuses the parts materially.")),
      gloss: { value: "semi-gloss", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 4, availability: 1, smallSeries: 2, xxl: 300, xxlMin: 150, xxlMax: 500 },
    emissions: "high",
    emissionsNote: t(
      "Bei Überhitzung entsteht Chlorwasserstoff. Geschlossener Bauraum mit Abluftführung ist bei PVC Pflicht, nicht Empfehlung.",
      "Overheating produces hydrogen chloride. An enclosed chamber with exhaust ducting is mandatory with PVC, not a recommendation."),
    ul94Note: t(
      "Hart-PVC gilt wegen seines Chloranteils als von Haus aus schwer entflammbar, und in der Literatur wird es regelmäßig mit V-0 geführt. Diese Datenbank trägt hier trotzdem KEINE Klasse ein: Das Fillamentum-Blatt nennt weder eine UL94-Klassifizierung noch eine Materialdicke noch eine Prüfstelle. Eine Brandschutzklasse ist eine regulatorische Aussage über ein geprüftes Bauteil einer bestimmten Dicke — sie lässt sich nicht aus der Polymerklasse ableiten. Wer PVC für eine V-0-Anforderung einsetzen will, braucht ein Zeugnis, keine Lehrbuchstelle.",
      "Rigid PVC counts as inherently flame retardant because of its chlorine content, and the literature routinely lists it as V-0. This database nevertheless enters NO class here: the Fillamentum sheet names neither a UL94 classification nor a material thickness nor a test house. A fire class is a regulatory statement about a tested part of a given thickness — it cannot be inferred from the polymer class. Anyone wanting to use PVC for a V-0 requirement needs a certificate, not a textbook passage."),
  },

  /* ------------------------------------------------------------------ PEBA */
  {
    id: "peba", name: "PEBA", family: "PEBA", polymerClass: "semi-crystalline",
    variant: ["flexible"],
    aliases: ["Polyether-Block-Amid", "PEBAX", "TPA", "Polyetherblockamid"],
    file: "2020/11/TDS_Flexfill-PEBA-90A_EN.pdf",
    title: "Flexfill PEBA 90A — Technical Data Sheet",
    abstract: t(
      "PEBA ist das Elastomer für alles, wofür TPU zu schwer und zu träge ist: 1,0 g/cm³ — die niedrigste Dichte aller flexiblen Werkstoffe hier — mit über 1000 % Bruchdehnung, hoher Rückstellenergie und dem Kälteverhalten eines Polyamids. Genau diese Kombination ist der Grund, warum Skischuhe und Laufsohlen aus PEBA bestehen. Für Dichtungen gegen Öle und Kraftstoffe ist der Polyamidblock der eigentliche Vorteil: PEBA hält, wo TPU auf Polyesterbasis verseift.",
      "PEBA is the elastomer for everything TPU is too heavy and too sluggish for: 1.0 g/cm³ — the lowest density of any flexible material here — with over 1000 % elongation at break, high energy return and the cold behaviour of a polyamide. Precisely this combination is why ski boots and running soles are made of PEBA. For seals against oils and fuels the polyamide block is the real advantage: PEBA holds where polyester-based TPU saponifies."),
    positioning: t(
      "Leichter, kälter belastbar und ölfester als TPU — und deutlich teurer.",
      "Lighter, better in the cold and more oil resistant than TPU — and considerably more expensive."),
    mechanics: {
      density: q(1.0, "g/cm³"),
      tensileStrengthXy: q(9, "MPa", {
        std: "ASTM D638", conditions: "Spannung bei 50 % Dehnung, nicht Bruchspannung", orientation: "n/a",
        note: t("Das Blatt gibt keine Bruchspannung an, sondern die Spannung bei 50 % Dehnung. Für ein Elastomer ist das die brauchbarere Angabe — sie ist aber nicht mit den Bruchspannungen der starren Werkstoffe vergleichbar.",
                "The sheet gives no stress at break but the stress at 50 % strain. For an elastomer that is the more useful figure — but it is not comparable with the break stresses of the rigid materials."),
      }),
      elongationAtBreakXy: q(1000, "%", { std: "ASTM D638", conditions: "Blattangabe „> 1000 %“", orientation: "n/a" }),
      flexuralModulusXy: q(65, "MPa", { std: "ASTM D790", conditions: "1,27 mm/min", orientation: "n/a" }),
      hardnessShoreD: q(42, "Shore D", { std: "ASTM D2240" }),
      wearResistance: s(4, "wearResistance", t(
        "Das Blatt weist einen Abriebverlust unter 48 mm³ nach ISO 4649 aus (10 N, 40 m) — ein belegter Wert, für den das Schema kein eigenes Feld führt. Die Einstufung 4 leitet sich daraus ab.",
        "The sheet gives an abrasion loss below 48 mm³ to ISO 4649 (10 N, 40 m) — a documented value for which the schema carries no dedicated field. The rating of 4 is derived from it.")),
      toughness: s(5, "toughness"),
      notchSensitivity: s(1, "notchSensitivity"),
    },
    thermal: {
      recommendedMaxServiceTemperature: service(70, t(
        "Das Blatt weist keine Wärmeformbeständigkeit aus. 70 °C ist eine konservative Einschätzung aus der Polymerklasse.",
        "The sheet gives no heat deflection figure. 70 °C is a conservative assessment from the polymer class.")),
      minServiceTemperature: q(-40, "°C", {
        source: "estimate_reasoning", confidence: "estimated",
        note: t("Das Blatt nennt keine Zahl, hebt aber hervor, dass Schlagzähigkeit und Flexibilität „bis in tiefe Temperaturen“ erhalten bleiben — genau der Punkt, an dem TPU spröde wird. −40 °C ist die übliche Einordnung für PEBA und ausdrücklich geschätzt.",
                "The sheet gives no figure but stresses that impact strength and flexibility are retained “down to low temperatures” — precisely where TPU turns brittle. −40 °C is the usual rating for PEBA and is explicitly an estimate."),
      }),
    },
    processing: {
      nozzleTemperature: q(235, "°C", { min: 225, max: 245 }),
      bedTemperature: q(80, "°C", { min: 70, max: 90 }),
      chamberRequirement: { value: "not-required", source: "estimate_reasoning", confidence: "estimated" },
      printability: s(2, "printability", t(
        "Wie jedes weiche Filament braucht PEBA einen Direktextruder mit kurzem, geführtem Filamentweg. Ein Bowden-System knickt es.",
        "Like every soft filament PEBA needs a direct drive with a short, guided filament path. A Bowden system buckles it.")),
      warpingTendency: s(2, "warpingTendency"),
      hygroscopy: s(4, "hygroscopy", t(
        "Der Polyamidblock macht PEBA hygroskopisch wie ein Nylon. Trocknen ist Pflicht.",
        "The polyamide block makes PEBA hygroscopic like a nylon. Drying is mandatory.")),
      abrasiveness: s(1, "abrasiveness"),
    },
    durability: { uvResistance: s(3, "uvResistance"), weatherResistance: s(3, "weatherResistance") },
    finishing: {
      surfaceQuality: s(4, "surfaceQuality"), layerLineVisibility: s(2, "layerLineVisibility"),
      sandability: s(1, "sandability"), fillability: s(1, "fillability"),
      paintAdhesion: s(1, "paintAdhesion"), bondability: s(2, "bondability"),
      gloss: { value: "glossy", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 5, availability: 1, smallSeries: 2, xxl: 400, xxlMin: 200, xxlMax: 600 },
    emissions: "low",
  },

  /* ------------------------------------------------------------------- OBC */
  {
    id: "obc", name: "OBC", family: "PE", polymerClass: "semi-crystalline",
    variant: ["flexible"],
    aliases: ["Olefin-Blockcopolymer", "Olefinic Block Copolymer", "Polyolefin-Elastomer"],
    file: "2022/11/TDS_OBC-905_EN_07102022_FI.pdf",
    title: "OBC 905 — Technical Data Sheet",
    abstract: t(
      "OBC ist ein weiches Polyolefin mit 0,905 g/cm³ — der leichteste Werkstoff der ganzen Datenbank, leichter als Wasser. Es kombiniert 700 % Bruchdehnung mit einem Glasübergang von −13 °C und einer vom Hersteller genannten Temperaturbeständigkeit bis 100 °C, ist wasserdicht und beständig gegen Wasser, Säuren, Alkohol und Aceton. Bemerkenswert ist auch die Quellenlage: Von 13 Werkstofftypen mit Z-Kennwert ist OBC der einzige, dessen Blatt NICHT von Bambu Lab stammt — Fillamentum weist XY und Z an gedruckten Prüfkörpern aus.",
      "OBC is a soft polyolefin at 0.905 g/cm³ — the lightest material in the whole database, lighter than water. It combines 700 % elongation at break with a glass transition of −13 °C and a manufacturer-stated temperature resistance to 100 °C, is waterproof and resists water, acids, alcohol and acetone. Its sourcing is notable too: of 13 material types carrying a Z value, OBC is the only one whose sheet does NOT come from Bambu Lab — Fillamentum states XY and Z on printed specimens."),
    positioning: t(
      "Das leichteste Material im Bestand — und der einzige Z-Kennwert, der nicht von Bambu Lab stammt.",
      "The lightest material in the dataset — and the only Z value not sourced from Bambu Lab."),
    mechanics: {
      density: q(0.905, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(14, "MPa", { std: "ASTM D1708", orientation: "XY", conditions: "gedruckt, 100 % Infill, 200 °C Düse, 65 °C Bett" }),
      tensileStrengthZ: q(11, "MPa", { std: "ASTM D1708", orientation: "Z", conditions: "gedruckt, 100 % Infill, Streckspannung" }),
      elongationAtBreakXy: q(700, "%", { std: "ASTM D1708", orientation: "XY", conditions: "gedruckt, 100 % Infill" }),
      elongationAtBreakZ: q(480, "%", { std: "ASTM D1708", orientation: "Z", conditions: "gedruckt, 100 % Infill" }),
      flexuralStrengthXy: q(7.8, "MPa", { std: "ASTM D790", orientation: "XY", conditions: "5 % Dehnung" }),
      flexuralModulusXy: q(244, "MPa", { std: "ASTM D790", orientation: "XY", conditions: "1 % Dehnung" }),
      izodNotchedXy: q(34.3, "kJ/m²", {
        std: "ASTM D256", orientation: "XY", conditions: "gekerbt, gedruckt",
        note: t("Das Blatt nennt denselben Versuch zweimal: 347 J/m und 34,3 kJ/m². Beide passen zueinander (347 ÷ 10,16 mm Restligament = 34,2). In Z passen sie NICHT: 352 J/m ergäben 34,6 kJ/m², das Blatt nennt aber 43,1. Übernommen ist die kJ/m²-Angabe, weil das Schema diese Einheit führt.",
                "The sheet gives the same test twice: 347 J/m and 34.3 kJ/m². The two agree (347 ÷ 10.16 mm remaining ligament = 34.2). In Z they do NOT: 352 J/m would give 34.6 kJ/m², yet the sheet states 43.1. The kJ/m² figure is imported because the schema carries that unit."),
      }),
      hardnessShoreD: q(53, "Shore D", { std: "ISO 7619" }),
      anisotropyFactorImpact: {
        value: 1.01, unit: "-", orientation: "Z",
        derivedFrom: ["mechanics.izodNotchedXy"],
        conditions: "347 J/m (XY) gegen 352 J/m (Z), beide gekerbt nach ASTM D256 im selben Blatt",
        source: "src_tds", confidence: "low",
        note: t("Aus 352 J/m (Z) zu 347 J/m (XY) gerechnet, beide gekerbt nach ASTM D256 im selben Blatt. Der Wert liegt ÜBER 1, die stehend gedruckte Probe ist also schlagzäher als die liegende. Bei sprödharten Werkstoffen liegt dieser Faktor typisch zwischen 0,05 und 0,3 — die Schichtgrenze ist bei einem weichen Polyolefin schlicht nicht der Schwachpunkt.",
                "Calculated from 352 J/m (Z) against 347 J/m (XY), both notched to ASTM D256 in the same sheet. The value exceeds 1, so the upright-printed specimen is tougher than the flat one. For brittle-hard materials this factor typically sits between 0.05 and 0.3 — with a soft polyolefin the layer boundary simply is not the weak point. Note: computing instead from the same sheet\u2019s kJ/m\u00b2 figures (43.1 against 34.3) would give 1.26. The sheet is internally inconsistent; the lower value is imported."),
      },
      anisotropyFactorTensile: {
        value: 0.79, unit: "-", orientation: "Z",
        derivedFrom: ["mechanics.tensileStrengthZ", "mechanics.tensileStrengthXy"],
        conditions: "11 MPa (Z) gegen 14 MPa (XY), gedruckte Prüfkörper aus demselben Blatt",
        source: "src_tds", confidence: "low",
        note: t("Aus 11 MPa (Z) zu 14 MPa (XY) gerechnet — beide Werte stehen im selben Blatt an gedruckten Prüfkörpern. 0,79 ist ein sehr hoher Wert; die meisten starren Werkstoffe liegen zwischen 0,3 und 0,6. Bei der Schlagzähigkeit liegt Z sogar ÜBER XY (352 gegen 347 J/m). Das ist für weiche Polyolefine plausibel, weil die Bindung zwischen den Schichten nicht der Schwachpunkt ist, den ein sprödes Polymer dort hat.",
                "Calculated from 11 MPa (Z) against 14 MPa (XY) — both values are in the same sheet on printed specimens. 0.79 is a very high figure; most rigid materials sit between 0.3 and 0.6. For impact strength Z even exceeds XY (352 against 347 J/m). That is plausible for soft polyolefins because the bond between layers is not the weak point it is in a brittle polymer."),
      },
      toughness: s(5, "toughness"),
      notchSensitivity: s(1, "notchSensitivity"),
    },
    thermal: {
      meltingTemperature: q(130, "°C", { std: "ISO 11357" }),
      glassTransition: q(-13, "°C", { std: "ISO 11357" }),
      recommendedMaxServiceTemperature: service(70, t(
        "Das Blatt nennt 100 °C Temperaturbeständigkeit, ohne Norm und ohne Last. Bei einem Schmelzpunkt von 130 °C ist das ohne Abstand zur Kriechgrenze; 70 °C ist die konservative Empfehlung.",
        "The sheet names 100 °C temperature resistance without standard and without load. At a melting point of 130 °C that leaves no margin to the creep limit; 70 °C is the conservative recommendation.")),
    },
    processing: {
      nozzleTemperature: q(200, "°C", { conditions: "Prüfkörperbedingung des Blattes" }),
      bedTemperature: q(65, "°C", { conditions: "Prüfkörperbedingung des Blattes" }),
      chamberRequirement: { value: "not-required", source: "estimate_reasoning", confidence: "estimated" },
      printSpeed: q(20, "mm/s", { conditions: "Prüfkörperbedingung des Blattes" }),
      printability: s(3, "printability"),
      warpingTendency: s(3, "warpingTendency"),
      hygroscopy: s(1, "hygroscopy"),
      abrasiveness: s(1, "abrasiveness"),
    },
    durability: {
      uvResistance: s(1, "uvResistance", t(
        "Das Blatt beantwortet die Frage „UV stability“ ausdrücklich mit „No“. Das ist eine belegte Verneinung und keine Schätzung — sie hat nur keine Norm hinter sich.",
        "The sheet answers the question “UV stability” explicitly with “No”. That is a documented negative rather than an estimate — it just has no standard behind it.")),
      weatherResistance: s(2, "weatherResistance"),
    },
    finishing: {
      surfaceQuality: s(3, "surfaceQuality"), layerLineVisibility: s(3, "layerLineVisibility"),
      sandability: s(1, "sandability"), fillability: s(1, "fillability"),
      paintAdhesion: s(1, "paintAdhesion"), bondability: s(1, "bondability"),
      gloss: { value: "matte", source: "estimate_reasoning", confidence: "estimated" },
      colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
    },
    commercial: { price: 4, availability: 1, smallSeries: 2, xxl: 400, xxlMin: 200, xxlMax: 600 },
    emissions: "low",
    chemicals: [
      ["chem_water", "resistant"], ["chem_dilute_acid", "resistant"],
      ["chem_ethanol", "resistant"], ["chem_acetone", "resistant"],
      ["chem_mineral_oil", "not-resistant"], ["chem_grease", "not-resistant"],
      ["chem_hydraulic_oil", "not-resistant"], ["chem_brake_fluid", "not-resistant"],
    ],
    chemicalsNote: t(
      "Vom Blatt belegt: „Good chemical resistance: water, acids, alcohol, acetone“ und „Low chemical resistance: car fluids, oils, grasses“ (im Original so geschrieben, gemeint sind Fette). Die übrigen Medien sind aus der Polymerklasse abgeleitet.",
      "Documented by the sheet: “Good chemical resistance: water, acids, alcohol, acetone” and “Low chemical resistance: car fluids, oils, grasses” (spelled thus in the original; greases are meant). The remaining media are derived from the polymer class."),
    foodContact: "explicitly-not-suitable",
    foodNote: t(
      "Das Blatt beantwortet „Food contact“ ausdrücklich mit „No“ — eine seltene klare Verneinung, wo die meisten Blätter schweigen.",
      "The sheet answers “Food contact” explicitly with “No” — a rare clear negative where most sheets stay silent."),
  },
];

/* ------------------------------------------------------------------ Ausgabe */

const out = path.join(ROOT, "data/materials");
mkdirSync(out, { recursive: true });

const CHEM_NOTE_SOURCED = t(
  "Diese Einstufung steht im Herstellerdatenblatt, sie ist nicht aus der Polymerklasse abgeleitet. Sie nennt allerdings weder Konzentration noch Auslagerungsdauer — für kritische Anwendungen ersetzt sie keinen Versuch im Originalmedium.",
  "This rating is stated in the manufacturer datasheet, it is not derived from the polymer class. It names neither concentration nor exposure duration — for critical applications it does not replace a test in the actual medium.");

let n = 0;
for (const T of TYPES) {
  const url = `${U}/${T.file}`;
  const rec = {
    $schema: "../../schema/material.schema.json",
    schemaVersion: "1.0.0",
    id: T.id,
    identity: {
      name: T.name, family: T.family, polymerClass: T.polymerClass,
      variant: T.variant, aliases: T.aliases,
      abstract: T.abstract, positioning: T.positioning,
    },
    mechanics: T.mechanics,
    thermal: T.thermal,
    processing: T.processing,
    durability: {
      ...T.durability,
      ...(T.chemicals ? {
        chemicalResistance: T.chemicals.map(([chemicalId, rating]) => ({
          chemicalId, rating, source: "src_tds", confidence: "low",
          note: T.chemicalsNote ?? CHEM_NOTE_SOURCED,
        })),
      } : {}),
    },
    compliance: {
      foodContact: {
        status: {
          value: T.foodContact ?? "not-declared",
          source: T.foodContact ? "src_tds" : "estimate_reasoning",
          confidence: T.foodContact ? "low" : "estimated",
          ...(T.foodNote ? { note: T.foodNote } : {}),
        },
        partLevelWarning: t(
          "Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen.",
          "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches."),
      },
      flameRetardancy: {
        ul94: {
          value: T.ul94 ?? "not-classified",
          source: "estimate_reasoning",
          confidence: "estimated",
          ...(T.ul94Note ? { note: T.ul94Note } : {}),
        },
      },
      printEmissions: {
        concernLevel: {
          value: T.emissions, source: "estimate_reasoning", confidence: "estimated",
          ...(T.emissionsNote ? { note: T.emissionsNote } : {}),
        },
      },
    },
    sustainability: {
      bioBasedContent: { value: 0, unit: "%", source: "estimate_reasoning", confidence: "estimated" },
      industriallyCompostable: { value: false, source: "estimate_reasoning", confidence: "estimated" },
      practicalRecyclability: { value: "possible-in-theory", source: "estimate_reasoning", confidence: "estimated" },
    },
    finishing: T.finishing,
    commercial: {
      priceIndex: s(T.commercial.price, "priceIndex"),
      availability: s(T.commercial.availability, "availability"),
      smallSeriesSuitability: s(T.commercial.smallSeries, "smallSeriesSuitability"),
      xxl: {
        maxSensibleEdgeMm: {
          value: T.commercial.xxl, unit: "mm", min: T.commercial.xxlMin, max: T.commercial.xxlMax,
          source: "estimate_reasoning", confidence: "estimated", note: XXL_NOTE,
        },
      },
      reentsPortfolioStatus: {
        value: "unknown", source: "estimate_reasoning", confidence: "estimated", note: PORTFOLIO_NOTE,
      },
    },
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstanlage aus Herstellerdatenblatt)",
      openQuestions: [{
        id: `oq_${T.id}_single_source`,
        question: SINGLE_SOURCE,
        blocking: false,
        affectsFields: ["mechanics", "thermal", "processing"],
      }],
      sources: [
        {
          id: "src_tds", type: "manufacturer-tds", publisher: "Fillamentum Manufacturing Czech s.r.o.",
          title: T.title, url, retrievedAt: RETRIEVED, confidenceCeiling: "low",
          note: t("Einziges Datenblatt für diesen Werkstofftyp.",
                  "Only datasheet for this material type."),
        },
        {
          id: "estimate_reasoning", type: "estimate", publisher: "Reents Technologies GmbH",
          title: "Eigene Einschätzung aus Polymerklasse und Werkstattpraxis",
          retrievedAt: RETRIEVED, confidenceCeiling: "estimated",
          note: t("Skalenwerte und konservative Dauergebrauchstemperaturen. Ausdrücklich als Schätzung gekennzeichnet.",
                  "Scale values and conservative continuous service temperatures. Explicitly flagged as estimates."),
        },
      ],
    },
  };
  writeFileSync(path.join(out, `${T.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
}

console.log(`${n} neue Werkstofftypen geschrieben: ${TYPES.map((x) => x.id).join(", ")}`);
console.log(`  Alle aus je EINEM Fillamentum-Blatt - Datenblattwerte daher 'low', nicht 'medium'.`);
console.log(`  OBC 905 ist der einzige mit belegtem Anisotropiefaktor (XY und Z im selben Blatt).`);
