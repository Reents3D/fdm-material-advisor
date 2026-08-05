/**
 * Import: Nebula Filaments (Stare Bystre, Polen).
 *
 * Gefunden ueber die OFD-Arbeitsliste (ADR-035): 17 Fundstellen, alle mit Textebene,
 * alle polnisch. Neue Marke im Bestand.
 *
 * DER FUND, DER UEBER DIESEN HERSTELLER HINAUSGEHT
 * Die PLA-Tabelle dieses Blattes ist dieselbe wie die von FormFutura EasyFil ePLA und
 * Galaxy PLA - aber sie nennt die Originaleinheiten, und die loesen zwei Fehler auf, die
 * im FormFutura-Import nur als Verdacht dokumentiert werden konnten:
 *
 *   FormFutura              Nebula                        Aufloesung
 *   "Tensile modulus 3,5    "524,000 PSI (3.6)"           524.000 psi = 3.613 MPa.
 *    MPa"                                                 Die Klammer ist GPa, nicht
 *                                                         MPa - der Verdacht stimmte.
 *   "HDT 55 °C, HDT A"      "66 PSI (0,45 PA)"            66 psi = 0,45 MPa. Das ist
 *                                                         HDT-B, nicht HDT-A. FormFutura
 *                                                         beschriftet die Zeile falsch.
 *
 * Beide Hersteller geben damit dieselbe Rohstofftabelle weiter - vermutlich das Blatt
 * des Granulatlieferanten. Acht Produkte (2 FormFutura + 6 Nebula) haengen an EINER
 * Messung. Das steht an jedem betroffenen Datensatz.
 *
 * SIEBZEHN PRODUKTE, NEUN TABELLEN
 * Auch innerhalb von Nebula wiederholen sich die Blaetter:
 *
 *   PLA Premium + 5x PLA Art        eine Tabelle (die oben genannte)
 *   ABS Tech 702 + 3x ABS Art       eine Tabelle
 *   PETG Premium + PETG Chameleon   eine Tabelle
 *   ASA 301, HIPS 404, PLA Silk,    je eigen
 *   PLA Tech 607, PLA Tech 609 HD
 *
 * WAS DIESER HERSTELLER BESSER MACHT ALS DIE MEISTEN
 * Das ABS-Blatt nennt die UL94-Klasse fuer DREI Materialdicken (1,5 / 3,0 / 6,0 mm).
 * Eine UL94-Angabe ohne Dicke ist nicht uebertragbar - hier steht sie dreimal. Dazu
 * nennen die ASTM-Zeilen die Pruefgeschwindigkeit (D638 bei 5 bzw. 6 mm/min, D790 bei
 * 2,8 mm/min), was auf Blaettern dieser Preisklasse selten ist.
 *
 * SPULENGROESSEN
 * PLA und PETG bis 9 kg, ABS und ASA bis 8 bzw. 9 kg, HIPS nur bis 2,5 kg. Die
 * Marktbeobachtung aus der OFD nennt fuer PLA ein Maximum von 12 kg - Nebula liegt mit
 * 9 kg im oberen Feld und ist damit fuer Grossteile interessant. Die Angaben stehen in
 * `commercial.spoolSizes` nicht zur Verfuegung (das ist ein Werkstofffeld), deshalb
 * stehen sie in `features`.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-05";
const BASE = "https://api.nebulafilaments.com/wp-content/uploads/2025/02";

const t = (de, en) => ({ de, en });

const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  source: "src_tds", confidence: o.confidence ?? "medium",
  ...(o.note ? { note: o.note } : {}),
});

/* kg/cm² -> MPa, wie beim Kratos PC. Originalwert bleibt in `conditions`. */
const kgcm2 = (v, o = {}) => q(
  Math.round(v * 0.0980665 * 10) / 10, "MPa",
  { ...o, confidence: "low", conditions: `Blattangabe ${v} kg/cm², umgerechnet mit 1 kg/cm² = 0,0980665 MPa` },
);

/* ---------------------------------------------------------------- Tabellen */

/* A · Die generische PLA-Tabelle. Sechs Nebula-Produkte und zwei FormFutura-Produkte. */
const PLA_GENERIC = {
  density: q(1.24, "g/cm³", { std: "ASTM D792", confidence: "low" }),
  meltFlowRate: q(6, "g/10min", { std: "ASTM D1238", confidence: "low" }),
  glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "ASTM D3418", confidence: "low" }),
  tensileStrengthXy: q(60, "MPa", { std: "ASTM D882", conditions: "Blattangabe 8.700 psi; bei Bruch nennt das Blatt 7.700 psi (53 MPa)", orientation: "XY", confidence: "low" }),
  tensileModulusXy: q(3613, "MPa", { std: "ASTM D882", conditions: "Blattangabe 524.000 psi (3,6 GPa)", orientation: "XY", confidence: "low" }),
  elongationAtBreakXy: q(6, "%", { std: "ASTM D882", orientation: "XY", confidence: "low" }),
  flexuralStrengthXy: q(83, "MPa", { std: "ASTM D790", conditions: "Blattangabe 12.000 psi", orientation: "XY", confidence: "low" }),
  flexuralModulusXy: q(3827, "MPa", { std: "ASTM D790", conditions: "Blattangabe 555.000 psi (3,8 GPa)", orientation: "XY", confidence: "low" }),
  hdtB: q(55, "°C", { std: "ASTM E2092", conditions: "66 psi = 0,45 MPa", confidence: "low" }),
};

const PLA_SHARED = t(
  "Diese Tabelle gehört nicht diesem Produkt allein. Sie steht identisch auf den Blättern von Nebula PLA Premium und fünf PLA-Art-Varianten — und zusätzlich, mit umgerechneten Zahlen, auf denen von FormFutura EasyFil ePLA und Galaxy PLA. Acht Produkte zweier Hersteller hängen damit an EINER Messung, vermutlich dem Blatt des Granulatlieferanten. Für diese Datenbank zählt das als ein Beleg; alle Werte tragen `low`. Die Zugkennwerte sind zudem nach ASTM D882 geprüft, der Norm für dünne Folien — für starre Formteile gilt D638 beziehungsweise ISO 527. Die Schlagzähigkeit steht in J/m und ist nicht übernommen, weil ihre Umrechnung die Probendicke braucht.",
  "This table does not belong to this product alone. It appears identically on the sheets of Nebula PLA Premium and five PLA Art variants — and additionally, with converted figures, on those of FormFutura EasyFil ePLA and Galaxy PLA. Eight products from two manufacturers thus hang on ONE measurement, presumably the resin supplier's sheet. For this database that counts as one piece of evidence; all values carry `low`. The tensile values are moreover tested to ASTM D882, the standard for thin film — for rigid mouldings D638 or ISO 527 applies. The impact strength is in J/m and is not imported because its conversion needs the specimen thickness.",
);

const PLA_RESOLVES = t(
  "Dieses Blatt löst zwei Fehler des FormFutura-Imports auf. FormFutura führt den Zug-E-Modul als „3,5 MPa“ — hier steht „524.000 PSI (3.6)“, und 524.000 psi sind 3.613 MPa. Die Klammer war also GPa, nicht MPa; der dort dokumentierte Verdacht ist damit bestätigt. Und FormFutura beschriftet die Wärmeformbeständigkeit mit „HDT A“, während hier „66 PSI (0,45 PA)“ steht — 66 psi sind 0,45 MPa, das ist HDT-B. Zwei unabhängige Wiedergaben derselben Tabelle, und erst die zweite macht sie lesbar.",
  "This sheet resolves two errors from the FormFutura import. FormFutura carries the tensile modulus as “3.5 MPa” — here it reads “524,000 PSI (3.6)”, and 524,000 psi is 3,613 MPa. The bracket was GPa, not MPa; the suspicion documented there is confirmed. And FormFutura labels the heat deflection temperature “HDT A” while this sheet says “66 PSI (0.45 PA)” — 66 psi is 0.45 MPa, which is HDT-B. Two independent renderings of the same table, and only the second makes it readable.",
);

/* B · Die ABS-Tabelle. Vier Produkte. */
const ABS_TABLE = {
  density: q(1.04, "g/cm³", { std: "ASTM D792" }),
  tensileStrengthXy: q(44, "MPa", { std: "ASTM D638", conditions: "5 mm/min", orientation: "XY" }),
  elongationAtBreakXy: q(13, "%", { std: "ASTM D638", conditions: "5 mm/min", orientation: "XY" }),
  flexuralStrengthXy: q(64, "MPa", { std: "ASTM D790", conditions: "2,8 mm/min", orientation: "XY" }),
  shrinkage: q(0.55, "%", { min: 0.4, max: 0.7, std: "ASTM D955", conditions: "3,2 mm, in Fließrichtung" }),
  hdtA: q(81, "°C", { std: "ASTM D648", conditions: "18,56 kg/cm² = 1,82 MPa (Methode A)" }),
  vicatA: q(94, "°C", { std: "ASTM D1525", conditions: "5 kg" }),
};

const ABS_SHARED = t(
  "Dieselbe Tabelle steht auf den Blättern von ABS Tech 702, ABS Art Glowing, ABS Art Marble Gray und ABS Art Thermo. Vier Produkte, eine Messung — die Art-Varianten unterscheiden sich im Farbeffekt, nicht im Grundwerkstoff, was diesmal plausibel ist. Sie zählen trotzdem als ein Beleg.",
  "The same table appears on the sheets of ABS Tech 702, ABS Art Glowing, ABS Art Marble Gray and ABS Art Thermo. Four products, one measurement — the Art variants differ in colour effect, not in base material, which is plausible this time. They still count as one piece of evidence.",
);

const UL94_THREE = t(
  "Die einzige UL94-Angabe im ganzen Bestand mit MEHREREN Materialdicken: HB bei 1,5 mm, bei 3,0 mm und bei 6,0 mm. Eine UL94-Klasse ohne Dickenangabe ist nicht übertragbar, weil dieselbe Rezeptur je nach Dicke unterschiedlich eingestuft wird — hier steht sie dreimal und ist damit belastbar. HB bleibt allerdings die unterste Stufe und bedeutet nur „brennt langsam“; als Brandschutz im Sinne einer Bahn- oder Innenraumanforderung zählt sie nicht. Eine Prüfstelle und eine Zeugnisnummer nennt auch dieses Blatt nicht.",
  "The only UL 94 statement in the entire dataset with SEVERAL material thicknesses: HB at 1.5 mm, at 3.0 mm and at 6.0 mm. A UL 94 class without a thickness is not transferable, because the same formulation is rated differently depending on thickness — here it appears three times and is therefore solid. HB remains the lowest rating and means only “burns slowly”; it does not count as flame protection in the sense of a rail or interior requirement. This sheet too names no test house and no certificate number.",
);

/* C · Das PETG-Blatt. Zwei Produkte, und es ist kein Bauteilblatt. */
const PETG_TABLE = {
  density: q(1.23, "g/cm³", { confidence: "low" }),
  glassTransition: q(80, "°C", { std: "ASTM D3418" }),
};

const PETG_RESIN = t(
  "Dieses Blatt beschreibt den ROHSTOFF, nicht das Bauteil: Grenzviskosität nach ISO 1628-5, Glasübergang, Schütt- und Reindichte — und keinen einzigen mechanischen Kennwert. Weder Zugfestigkeit noch Modul, Biegung oder Schlagzähigkeit stehen darauf. Für eine Werkstoffauswahl trägt es damit nur die Dichte und den Glasübergang bei. Nicht übernommen ist die angegebene Schüttdichte von 0,72 g/cm³ — das ist die Schüttdichte des Granulats, nicht die Dichte des Werkstoffs, und eine Verwechslung der beiden würde jede Masseabschätzung um ein Drittel danebenlegen. Dieselbe Tabelle steht auch auf dem Blatt von PETG Art Chameleon.",
  "This sheet describes the RAW MATERIAL, not the part: intrinsic viscosity to ISO 1628-5, glass transition, bulk and true density — and not a single mechanical value. Neither tensile strength nor modulus, flexure or impact appears on it. For material selection it therefore contributes only density and glass transition. Not imported is the stated bulk density of 0.72 g/cm³ — that is the bulk density of the pellets, not the density of the material, and confusing the two would put any mass estimate out by a third. The same table also appears on the PETG Art Chameleon sheet.",
);

/* ---------------------------------------------------------------- Produkte */

const P = [
  /* --- PLA: eine Tabelle, sechs Produkte ----------------------------------- */
  { id: "nebula-pla-premium", material: "pla", name: "PLA Premium", file: "TDS-PLA-PREMIUM", props: PLA_GENERIC,
    nozzle: [190, 240], bed: [0, 60], spools: "0,5 / 1 / 3 / 9 kg",
    features: PLA_RESOLVES, anomaly: PLA_SHARED },
  { id: "nebula-pla-art-glitter", material: "pla", name: "PLA Art Glitter", file: "TDS-PLA-GLITTER", props: PLA_GENERIC,
    nozzle: [190, 240], bed: [0, 60], spools: "0,5 / 1 / 3 / 9 kg", anomaly: PLA_SHARED },
  { id: "nebula-pla-art-glowing", material: "pla", name: "PLA Art Glowing", file: "TDS-PLA-GLOWING", props: PLA_GENERIC,
    nozzle: [190, 240], bed: [0, 60], spools: "0,5 / 1 / 3 / 9 kg", anomaly: PLA_SHARED },
  { id: "nebula-pla-art-marble", material: "pla", name: "PLA Art Marble", file: "TDS-PLA-MARBLE", props: PLA_GENERIC,
    nozzle: [190, 240], bed: [0, 60], spools: "0,5 / 1 / 3 / 9 kg", anomaly: PLA_SHARED },
  { id: "nebula-pla-art-mystic-green", material: "pla", name: "PLA Art Mystic Green", file: "TDS-PLA-MYSTIC-GREEN", props: PLA_GENERIC,
    nozzle: [190, 240], bed: [0, 60], spools: "0,5 / 1 / 3 / 9 kg", anomaly: PLA_SHARED },
  { id: "nebula-pla-art-thermo", material: "pla", name: "PLA Art Thermo", file: "TDS-PLA-THERMO", props: PLA_GENERIC,
    nozzle: [190, 240], bed: [0, 60], spools: "0,5 / 1 / 3 / 9 kg", anomaly: PLA_SHARED },

  /* --- PLA mit eigenen Tabellen -------------------------------------------- */
  {
    id: "nebula-pla-premium-silk", material: "pla", name: "PLA Premium Silk", file: "TDS-PLA-SILK",
    nozzle: [200, 240], bed: [40, 60], spools: "0,5 / 1 / 3 / 5 / 9 kg",
    props: {
      density: q(1.22, "g/cm³", { std: "ISO 1183" }),
      meltFlowRate: q(6, "g/10min", { std: "ASTM D1238" }),
      tensileStrengthXy: q(59, "MPa", { std: "ISO 527", conditions: "bei Bruch nennt das Blatt 47 MPa", orientation: "XY" }),
      tensileModulusXy: q(2700, "MPa", { std: "ISO 527", orientation: "XY" }),
      elongationAtBreakXy: q(9, "%", { std: "im Blatt als ASTM D882 angegeben, während die übrigen Zugzeilen ISO 527 nennen", orientation: "XY", confidence: "low" }),
      flexuralStrengthXy: q(72, "MPa", { std: "ASTM D790", orientation: "XY" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "DSC" }),
    },
    features: t("Ein zweiter Beleg für dieselben Zahlen, die FormFutura beim High Gloss PLA ausweist: 1,22 g/cm³, 2700 MPa Zug-E-Modul, 72 MPa Biegefestigkeit, 6 J/m Izod — bei zwei unabhängigen Herstellern. Silk- und Hochglanz-PLA sind derselbe Rezepturtyp, insofern passt das zusammen; die kleinen Abweichungen (Bruchspannung 47 gegen 45 MPa, HDT 51 gegen 50 °C) sprechen dafür, dass beide dieselbe Quelle unterschiedlich gerundet wiedergeben.",
                "A second piece of evidence for the same figures FormFutura states for High Gloss PLA: 1.22 g/cm³, 2700 MPa tensile modulus, 72 MPa flexural strength, 6 J/m Izod — from two independent manufacturers. Silk and high-gloss PLA are the same formulation type, so that fits; the small deviations (break stress 47 against 45 MPa, HDT 51 against 50 °C) suggest both reproduce the same source with different rounding."),
    anomaly: t("Die Wärmeformbeständigkeit steht mit 51 °C unter „ISO 75“ — ohne Methode und ohne Last. ISO 75 kennt Methode A (1,8 MPa) und B (0,45 MPa), und die beiden liegen bei PLA rund 10 K auseinander. Ohne die Angabe lässt sich der Wert weder als HDT-A noch als HDT-B führen; er ist nicht übernommen. Die Bruchdehnung trägt als einzige Zeile ASTM D882, während die übrigen Zugzeilen ISO 527 nennen.",
               "The heat deflection temperature is given as 51 °C under “ISO 75” — without method and without load. ISO 75 knows method A (1.8 MPa) and B (0.45 MPa), and for PLA the two lie about 10 K apart. Without that statement the value can be held neither as HDT-A nor as HDT-B; it is not imported. The elongation at break is the only row to carry ASTM D882 while the other tensile rows name ISO 527."),
  },
  {
    id: "nebula-pla-tech-607", material: "pla", name: "PLA Tech 607", file: "TDS-PLA-607",
    nozzle: [190, 240], bed: [60, 80], spools: "0,5 / 1 / 3 / 9 kg",
    props: {
      density: q(1.22, "g/cm³", { std: "ASTM D792" }),
      meltFlowRate: q(6, "g/10min", { min: 5, max: 7, std: "ASTM D1238" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "ASTM D3418" }),
      tensileStrengthXy: q(40, "MPa", { std: "ASTM D638", conditions: "Blattangabe 5.802 psi", orientation: "XY" }),
      tensileModulusXy: q(2865, "MPa", { std: "ASTM D638", conditions: "Blattangabe 416 kpsi; siehe Befund zur zweiten Modulzeile", orientation: "XY", confidence: "low" }),
      elongationAtBreakXy: q(2.3, "%", { std: "im Blatt als ASTM D256 angegeben — das ist die Schlagprüfnorm; für die Dehnung gilt D638", orientation: "XY", confidence: "low" }),
      hdtB: q(85, "°C", { min: 80, max: 90, std: "ASTM E2092", conditions: "66 psi = 0,45 MPa" }),
    },
    features: t("Die interessanteste Zahl auf dem Blatt ist die Wärmeformbeständigkeit: 80 bis 90 °C bei 0,45 MPa, gegenüber 55 °C beim gewöhnlichen PLA desselben Herstellers. Ein PLA, das 30 K über dem Standardwert liegt, ist entweder nukleiert oder für die Kristallisation ausgelegt — genau der Unterschied, der PLA für warme Umgebungen überhaupt in Betracht kommen lässt.",
                "The most interesting figure on the sheet is the heat deflection temperature: 80 to 90 °C at 0.45 MPa, against 55 °C for the same manufacturer's ordinary PLA. A PLA sitting 30 K above the standard value is either nucleated or designed to crystallise — precisely the difference that puts PLA in contention for warm environments at all."),
    anomaly: t("Drei Punkte. Das Blatt führt ZWEI Zug-E-Moduln: „416 kpsi (2.865 MPa)“ und „348.440 psi (2.402 MPa)“ — beide in sich stimmig umgerechnet, aber 463 MPa auseinander. Welcher gilt, sagt das Blatt nicht; geführt ist der erste mit `low`. Die Bruchdehnung steht unter ASTM D256, der Schlagprüfnorm. Und die gekerbte Izod-Schlagzähigkeit ist mit 6,05 ft·lb/in (323 J/m) angegeben — das wäre zäher als Polycarbonat und liegt für ein PLA um mehr als eine Größenordnung zu hoch; sie ist nicht übernommen.",
               "Three points. The sheet carries TWO tensile moduli: “416 kpsi (2,865 MPa)” and “348,440 psi (2,402 MPa)” — each internally consistent in its conversion, but 463 MPa apart. Which one applies the sheet does not say; the first is held, with `low`. The elongation at break is filed under ASTM D256, the impact standard. And the notched Izod impact is given as 6.05 ft·lb/in (323 J/m) — that would be tougher than polycarbonate and is more than an order of magnitude too high for a PLA; it is not imported."),
  },
  {
    id: "nebula-pla-tech-609-hd", material: "pla", name: "PLA Tech 609 HD", file: "TDS-PLA-609-HD",
    nozzle: [190, 240], bed: [60, 80], spools: "0,5 / 1 / 3 / 9 kg",
    props: {
      density: q(1.22, "g/cm³", { std: "ASTM D792" }),
      meltFlowRate: q(12, "g/10min", { min: 9, max: 15, std: "ASTM D1238" }),
      meltingTemperature: q(172.5, "°C", { min: 165, max: 180, std: "ASTM D3418" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "ASTM D3418" }),
      tensileStrengthXy: q(40, "MPa", { std: "ASTM D638", conditions: "Blattangabe 5.802 psi", orientation: "XY" }),
      tensileModulusXy: q(2865, "MPa", { std: "ASTM D638", conditions: "Blattangabe 416 kpsi", orientation: "XY" }),
      flexuralStrengthXy: q(73, "MPa", { std: "ASTM D790", conditions: "Blattangabe 10.588 psi", orientation: "XY" }),
      flexuralModulusXy: q(3827, "MPa", { std: "ASTM D790", conditions: "Blattangabe 555.000 psi (3,8 GPa)", orientation: "XY" }),
      hdtB: q(80, "°C", { min: 75, max: 85, std: "ASTM E2092", conditions: "66 psi = 0,45 MPa" }),
    },
    features: t("Das einzige PLA-Blatt im Bestand, das die Schlagzähigkeit für den amorphen UND den kristallinen Zustand getrennt ausweist: 2,99 gegen 4,37 ft·lb/in. Kristallisieren macht dieses PLA also um knapp die Hälfte zäher — die Angabe erklärt, wofür das „HD“ im Namen steht, und sie ist der Grund, warum die Wärmeformbeständigkeit mit 75 bis 85 °C weit über gewöhnlichem PLA liegt.",
                "The only PLA sheet in the dataset to state impact strength separately for the amorphous AND the crystalline state: 2.99 against 4.37 ft·lb/in. Crystallising thus makes this PLA nearly half as tough again — the statement explains what the “HD” in the name stands for, and it is the reason the heat deflection lies at 75 to 85 °C, far above ordinary PLA."),
    anomaly: t("Beide Schlagwerte stehen in ft·lb/in beziehungsweise J/m (160 und 233 J/m). J/m ist Energie je Probenbreite, die hier geführte Einheit kJ/m² Energie je Bruchfläche; die Umrechnung braucht die Probendicke. Beide sind deshalb nicht übernommen, obwohl gerade der Vergleich amorph/kristallin die aussagekräftigste Angabe des Blattes wäre.",
               "Both impact figures are in ft·lb/in and J/m respectively (160 and 233 J/m). J/m is energy per specimen width, the unit used here, kJ/m², energy per fracture area; the conversion needs the specimen thickness. Both are therefore not imported, although the amorphous/crystalline comparison would be the sheet's most informative statement."),
  },

  /* --- ABS: eine Tabelle, vier Produkte ------------------------------------ */
  { id: "nebula-abs-tech-702", material: "abs", name: "ABS Tech 702", file: "TDS-ABS-702", props: ABS_TABLE,
    nozzle: [240, 250], bed: [90, 100], spools: "0,5 / 1 / 2,5 / 8 kg",
    ul94: { value: "HB", thicknessMm: 1.5, note: UL94_THREE }, anomaly: ABS_SHARED },
  { id: "nebula-abs-art-glowing", material: "abs", name: "ABS Art Glowing", file: "TDS-ABS-GLOWING", props: ABS_TABLE,
    nozzle: [240, 250], bed: [90, 100], spools: "0,5 / 1 / 2,5 / 8 kg",
    ul94: { value: "HB", thicknessMm: 1.5, note: UL94_THREE }, anomaly: ABS_SHARED },
  { id: "nebula-abs-art-marble-gray", material: "abs", name: "ABS Art Marble Gray", file: "TDS-ABS-MARBLE-GRAY", props: ABS_TABLE,
    nozzle: [240, 250], bed: [90, 100], spools: "0,5 / 1 / 2,5 / 8 kg",
    ul94: { value: "HB", thicknessMm: 1.5, note: UL94_THREE }, anomaly: ABS_SHARED },
  { id: "nebula-abs-art-thermo", material: "abs", name: "ABS Art Thermo", file: "TDS-ABS-THERMO", props: ABS_TABLE,
    nozzle: [240, 250], bed: [90, 100], spools: "0,5 / 1 / 2,5 / 8 kg",
    ul94: { value: "HB", thicknessMm: 1.5, note: UL94_THREE }, anomaly: ABS_SHARED },

  /* --- ASA, HIPS, PETG ------------------------------------------------------ */
  {
    id: "nebula-asa-tech-301", material: "asa", name: "ASA Tech 301", file: "TDS-ASA-301",
    nozzle: [250, 265], bed: [90, 100], spools: "0,5 / 1 / 3 / 9 kg",
    props: {
      density: q(1.07, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: kgcm2(440, { std: "ASTM D638", orientation: "XY" }),
      elongationAtBreakXy: q(55, "%", { std: "ASTM D638", conditions: "6 mm/min", orientation: "XY" }),
      flexuralStrengthXy: kgcm2(650, { std: "ASTM D790", orientation: "XY" }),
      vicatA: q(105, "°C", { std: "ASTM D1525", conditions: "1 kg" }),
    },
    ul94: { value: "HB", thicknessMm: 3, note: t("HB bei 3,0 mm, mit Dickenangabe. HB ist die unterste UL94-Stufe und bedeutet nur „brennt langsam“.",
                                                 "HB at 3.0 mm, with the thickness stated. HB is the lowest UL 94 rating and means only “burns slowly”.") },
    features: t("Eine Bruchdehnung von 55 % ist für ein ASA ungewöhnlich hoch — die übrigen ASA-Datensätze im Bestand liegen zwischen 1,8 und 15 %. Zusammen mit einer Vicat-Temperatur von 105 °C ergibt das ein für den Außeneinsatz interessantes Profil: zäh und wärmefest zugleich.",
                "An elongation at break of 55 % is unusually high for an ASA — the other ASA records in the dataset lie between 1.8 and 15 %. Together with a Vicat temperature of 105 °C that gives a profile interesting for outdoor use: tough and heat-resistant at once."),
    anomaly: t("Die Festigkeiten stehen in kg/cm², einer seit Jahrzehnten außer Gebrauch gekommenen Einheit; sie sind umgerechnet und tragen `low`, die Blattangabe steht in `conditions`. Eine Wärmeformbeständigkeit weist das Blatt nicht aus — bei einem Außenwerkstoff wäre gerade sie die entscheidende Angabe.",
               "The strengths are in kg/cm², a unit out of use for decades; they are converted and carry `low`, with the sheet figure in `conditions`. The sheet states no heat deflection temperature — for an outdoor material that would be precisely the decisive figure."),
  },
  {
    id: "nebula-hips-tech-404", material: "hips", name: "HIPS Tech 404", file: "TDS-HIPS-404",
    nozzle: [235, 245], bed: [90, 100], spools: "0,5 / 1 / 2,5 kg",
    props: {
      density: q(1.05, "g/cm³", { std: "ISO 1183" }),
      tensileModulusXy: q(1750, "MPa", { std: "ISO 527-2/1", conditions: "1 mm/min", orientation: "XY" }),
      flexuralStrengthXy: q(38, "MPa", { std: "ISO 178", orientation: "XY" }),
      vicatA: q(100, "°C", { std: "ISO 306/A120", conditions: "Methode A, 120 °C/h" }),
    },
    features: t("Der dritte HIPS-Beleg im Bestand und der einzige, der die Vicat-Methode vollständig nennt (ISO 306/A120 — Methode A bei 120 °C/h). Das Blatt weist den Werkstoff ausdrücklich als Stützmaterial aus, was die dünne Kennwertlage erklärt: Für ein Material, das nach dem Druck weggelöst wird, sind Zugfestigkeit und Schlagzähigkeit nachrangig.",
                "The third HIPS record in the dataset and the only one to name the Vicat method in full (ISO 306/A120 — method A at 120 °C/h). The sheet explicitly designates the material as support material, which explains the thin data: for a material dissolved away after printing, tensile strength and impact are secondary."),
    anomaly: t("Die Tabelle nennt weder Zugfestigkeit noch Bruchdehnung, Schlagzähigkeit oder Wärmeformbeständigkeit — vier Zeilen insgesamt. Für einen Vergleich mit den beiden anderen HIPS-Datensätzen reicht das nur beim E-Modul und bei der Biegefestigkeit.",
               "The table names neither tensile strength nor elongation, impact or heat deflection — four rows in total. For a comparison with the two other HIPS records that suffices only for modulus and flexural strength."),
  },
  { id: "nebula-petg-premium", material: "petg", name: "PETG Premium", file: "TDS-PETG-PREMIUM", props: PETG_TABLE,
    nozzle: [220, 230], bed: [60, 90], spools: "0,5 / 1 / 3 / 9 kg", anomaly: PETG_RESIN },
  { id: "nebula-petg-art-chameleon", material: "petg", name: "PETG Art Chameleon", file: "TDS-PETG-CHAMELEON", props: PETG_TABLE,
    nozzle: [220, 230], bed: [60, 90], spools: "0,5 / 1 / 3 / 9 kg", anomaly: PETG_RESIN },
];

/* ------------------------------------------------------------------ Ausgabe */

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

const POLISH = t(
  "Das Blatt ist polnisch. Prüfkörper nicht deklariert — es sagt nicht, ob an gedruckten oder spritzgegossenen Proben gemessen wurde.",
  "The sheet is in Polish. Specimen not declared — it does not say whether printed or moulded specimens were measured.",
);

let n = 0, nu = 0, na = 0;
const byMaterial = new Map();

for (const p of P) {
  const url = `${BASE}/${p.file}.pdf`;
  const parts = [POLISH];
  if (p.anomaly) parts.push(t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`, `Finding on this datasheet: ${p.anomaly.en}`));

  const props = {
    ...p.props,
    nozzleTemperature: q(Math.round((p.nozzle[0] + p.nozzle[1]) / 2), "°C", { min: p.nozzle[0], max: p.nozzle[1], conditions: "Herstellerempfehlung" }),
    bedTemperature: q(Math.round((p.bed[0] + p.bed[1]) / 2), "°C", { min: p.bed[0], max: p.bed[1], conditions: "Herstellerempfehlung" }),
  };

  const spoolNote = t(
    `Spulengrößen laut Blatt: ${p.spools}.`,
    `Spool sizes per the sheet: ${p.spools}.`,
  );

  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "Nebula Filaments", manufacturer: "Nebula Filaments (Stare Bystre, Polen)",
    productName: p.name, origin: "Polen",
    specimenType: "undeclared",
    specimenNote: t(parts.map((x) => x.de).join("\n\n"), parts.map((x) => x.en).join("\n\n")),
    features: p.features
      ? t(`${p.features.de}\n\n${spoolNote.de}`, `${p.features.en}\n\n${spoolNote.en}`)
      : spoolNote,
    datasheet: { title: `${p.name} — Karta techniczna`, url, retrievedAt: RETRIEVED },
    productUrl: "https://nebulafilaments.com/",
    properties: props,
    ...(p.ul94 ? {
      compliance: {
        ul94: {
          value: p.ul94.value,
          ...(p.ul94.thicknessMm ? { thicknessMm: p.ul94.thicknessMm } : {}),
          testStandard: "UL 94", source: "src_tds", confidence: "low", note: p.ul94.note,
        },
      },
    } : {}),
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Nebula Filaments",
        productName: p.name, title: `${p.name} — Karta techniczna`,
        url, retrievedAt: RETRIEVED, confidenceCeiling: "medium",
        note: t("Polnischsprachiges Herstellerdatenblatt mit Textebene. Prüfkörper nicht deklariert; mehrere Blätter teilen sich eine Tabelle, siehe Befunde am Datensatz.",
                "Polish-language manufacturer datasheet with text layer. Specimen not declared; several sheets share one table, see findings on the record."),
      }],
    },
  };

  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  if (p.ul94) nu++;
  if (p.anomaly) na++;
  byMaterial.set(p.material, (byMaterial.get(p.material) ?? 0) + 1);
}

console.log(`${n} Nebula-Produkte geschrieben - neue Marke im Bestand.`);
console.log(`  ${na} mit eigenem Befund · ${nu} mit UL94-Angabe (alle mit Dickenangabe)\n`);
console.log("  Werkstofftyp   Produkte");
for (const [m, c] of [...byMaterial.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(14)}${String(c).padStart(4)}`);
}
console.log("\n  17 Produkte hinter 9 Tabellen:");
console.log("    PLA Premium + 5x PLA Art        eine Tabelle - dieselbe wie FormFutura ePLA/Galaxy");
console.log("    ABS Tech 702 + 3x ABS Art       eine Tabelle");
console.log("    PETG Premium + PETG Chameleon   eine Tabelle, und zwar ein Rohstoffblatt ohne Mechanik");
console.log("    ASA 301 · HIPS 404 · PLA Silk · PLA 607 · PLA 609 HD   je eigen");
console.log("\n  Der Fund ueber Nebula hinaus: Das PLA-Blatt nennt die Originaleinheiten");
console.log("  (524.000 psi = 3,6 GPa; 66 psi = 0,45 MPa) und loest damit zwei Fehler auf,");
console.log("  die im FormFutura-Import nur als Verdacht dokumentiert werden konnten.");
