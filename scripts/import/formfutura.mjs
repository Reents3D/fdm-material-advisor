/**
 * Import: FormFutura BV (Nijmegen, Niederlande) - einschliesslich der von FormFutura
 * vertriebenen LUVOCOM-3F-Linie der Lehvoss Group.
 *
 * WIE DIESE BLAETTER GEFUNDEN WURDEN
 * Ueber die Arbeitsliste aus der Open Filament Database (ADR-035): 48 Fundstellen bei
 * einem einzigen Hersteller, mehr als bei jeder anderen Marke. Die Blaetter selbst
 * stammen von formfutura.com und sind dort frei abrufbar; OFD hat nur den Weg dorthin
 * abgekuerzt.
 *
 * WAS ANKOMMT UND WAS NICHT
 * 46 eindeutige Blaetter, davon tragen 33 eine Textebene. Die uebrigen 13 sind
 * Rasterseiten ohne Text - ausgerechnet die Volumentypen ABSpro, TitanX, EasyFil ABS,
 * EasyFil ePLA, EasyWood, Galaxy PLA, High Gloss PLA, EasyFil HIPS, PETG CarbonFil,
 * ReFill PETG und ReForm rPET. Sie sind NICHT importiert: Ohne den Text bliebe nur
 * Raten, und geraten wird in dieser Datenbank nicht.
 *
 * DER WICHTIGERE FUND SIND DIE LUVOCOM-BLAETTER
 * Lehvoss stand auf dem Erschliessungsplan in SOURCES.md unter "mittel" und war bisher
 * gar nicht vertreten. Diese fuenf Blaetter sind die besten im ganzen Bestand: ISO-Norm
 * UND Pruefkoerper deklariert ("MPTS ISO 3167 A" - der Mehrzweckpruefkoerper, also
 * SPRITZGEGOSSEN), Dauergebrauchstemperatur mit Zeitbasis nach IEC 60216, beim
 * KK 50056 FR sogar die UL-94-Klasse MIT Dickenangabe und die EN-45545-Stufen fuer den
 * Bahnbereich. Das PAHT CF 9742 bringt mit 15.000 MPa den mit Abstand steifsten
 * Werkstoff des Bestands - zum Vergleich lag der bisherige Spitzenreiter, add:north
 * PC Blend HT LCF, bei 9.800 MPa.
 *
 * Der Preis dafuer steht im selben Feld: `specimenType: moulded`. Diese Zahlen sind an
 * spritzgegossenen Koerpern gemessen und von einem gedruckten Bauteil NICHT erreichbar.
 * Sie duerfen nicht gegen gedruckte Werte gestellt werden.
 *
 * UMRECHNUNGEN - EINE BEWUSSTE AUSNAHME VON DATA_MODEL, ABSCHNITT 4
 * Das Datenmodell sagt: nicht umrechnen, weil jede Umrechnung beim Erfassen eine
 * Fehlerquelle ist. Drei Blaetter zwingen dazu, weil sie in Einheiten liefern, die der
 * Katalog nicht kennt:
 *
 *   GPa -> MPa          (x1000)        Lehvoss fuehrt Moduln in GPa. Verlustfrei und
 *                                      eindeutig, Konfidenz bleibt unveraendert.
 *   kg/cm² -> MPa       (x0,0980665)   Kratos PC. Eindeutig, aber eine ungewoehnliche
 *                                      Einheit auf einem Blatt von 2024 ist ein
 *                                      Sorgfaltssignal - deshalb `low`.
 *   ft·lbf/in² -> kJ/m² (x2,1013)      ApolloX CF10. Ebenso `low`.
 *
 * In jedem Fall steht der URSPRUENGLICHE Zahlenwert samt Originaleinheit in
 * `conditions`. Wer nachrechnen will, braucht das Blatt nicht dafuer.
 *
 * NICHT umgerechnet wird Izod in J/m (ASTM D256). J/m ist Energie je Breite, kJ/m²
 * Energie je Flaeche - die Umrechnung braucht die Probendicke und verschiebt die
 * Bedeutung. ApolloX FR und ApolloX Foaming verlieren dadurch ihre Schlagwerte. Das ist
 * der richtige Verlust.
 *
 * WAS AUSGELASSEN WURDE, OBWOHL EIN BLATT VORLIEGT
 * PEEK 9581, PEEK CF 9676, PEI 50236, PEI ULTEM 9085, BioFil PCL, BioFil Wood und BVOH:
 * Fuer diese Werkstoffe fuehrt die Datenbank keinen Typ. PEI wurde in ac59507
 * ausdruecklich wieder entfernt ("kein gaengiges Material"). Ein Produkt ohne
 * Werkstofftyp waere eine tote Referenz - die Blaetter bleiben im Arbeitsplatz liegen,
 * bis ueber die Typen entschieden ist. Ebenso AthenaX CF10 und Kratos PC CF10: Es gibt
 * weder `pctg-cf` noch `pc-cf`.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-04";
const BASE = "https://www.formfutura.com/web/content";

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

/* Umrechnungen. Der Originalwert wandert in `conditions`, damit nachvollziehbar bleibt,
   was auf dem Blatt stand und was daraus gerechnet wurde. */
const gpa = (v, o = {}) => q(v * 1000, "MPa", { ...o, conditions: `Blattangabe ${String(v).replace(".", ",")} GPa` });
const kgcm2 = (v, o = {}) => q(
  Math.round(v * 0.0980665 * 10) / 10, "MPa",
  { ...o, confidence: "low", conditions: `Blattangabe ${v} kg/cm², umgerechnet mit 1 kg/cm² = 0,0980665 MPa` },
);
const ftlb = (v, o = {}) => q(
  Math.round(v * 2.1013 * 10) / 10, "kJ/m²",
  { ...o, confidence: "low", conditions: `Blattangabe ${v} ft·lbf/in², umgerechnet mit 1 ft·lbf/in² = 2,1013 kJ/m²` },
);

const iso = (d) => (d ? `${d.slice(6)}-${d.slice(3, 5)}-${d.slice(0, 2)}` : null);

/* ------------------------------------------------------------------ Produkte */

const FF = "FormFutura";
const LV = "LUVOCOM 3F (Lehvoss Group, vertrieben durch FormFutura)";

const MOULDED = t(
  "Das Blatt deklariert den Prüfkörper ausdrücklich als „MPTS ISO 3167 A“ — den spritzgegossenen Mehrzweckprüfkörper. Diese Werte sind Rohstoffkennwerte und von einem gedruckten Bauteil NICHT erreichbar; die Schichtstruktur kostet je nach Werkstoff und Richtung ein Drittel bis die Hälfte. Sie dürfen nicht gegen gedruckte Werte gestellt werden.",
  "The sheet declares the specimen explicitly as “MPTS ISO 3167 A” — the injection-moulded multi-purpose specimen. These are raw-material values and NOT achievable by a printed part; the layer structure costs a third to a half depending on material and direction. They must not be set against printed values.",
);

const UNDECLARED = t(
  "Dieses Blatt sagt nicht, ob an gedruckten oder spritzgegossenen Prüfkörpern gemessen wurde.",
  "This sheet does not say whether values were measured on printed or moulded specimens.",
);

const SELF_DECLARED_V0 = t(
  "Das Blatt nennt die Klasse V-0 und setzt selbst eine Fußnote darunter: „meets the self-extinguishing flammability standards of UL 94 V0, but is not certified by Underwriters Laboratories and does not have a UL number.“ Diese Offenheit ist anzuerkennen und ändert nichts an der Konsequenz — ohne Prüfzeugnis und ohne Dickenangabe ist die Angabe für eine Auditvorlage nicht verwendbar. Dieselbe Rezeptur kann bei 1,5 mm V-0 und bei 0,8 mm nur V-2 erreichen.",
  "The sheet names class V-0 and puts a footnote under it itself: “meets the self-extinguishing flammability standards of UL 94 V0, but is not certified by Underwriters Laboratories and does not have a UL number.” That openness deserves credit and changes nothing about the consequence — without a test certificate and without a thickness the statement cannot be used for an audit submission. The same formulation can reach V-0 at 1.5 mm and only V-2 at 0.8 mm.",
);

const P = [
  /* ---------------------------------------------------------------- PCTG */
  {
    id: "formfutura-athenax", material: "pctg", name: "AthenaX", doc: 256479, date: "07-10-2024",
    props: {
      density: q(1.23, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(44, "MPa", { std: "ISO 527", conditions: "bei Streckgrenze", orientation: "XY" }),
      elongationAtBreakXy: q(220, "%", { std: "ISO 527", orientation: "XY" }),
      elongationAtYieldXy: q(4.4, "%", { std: "ISO 527", orientation: "XY" }),
      flexuralStrengthXy: q(60, "MPa", { std: "ISO 178", conditions: "15 mm/min", orientation: "XY" }),
      flexuralModulusXy: q(1600, "MPa", { std: "ISO 178", conditions: "15 mm/min", orientation: "XY" }),
      hdtB: q(76, "°C", { std: "ISO 75", conditions: "0,455 MPa" }),
      hdtA: q(64, "°C", { std: "ISO 75", conditions: "1,82 MPa" }),
      vicatB50: q(88, "°C", { std: "im Blatt als DSC angegeben; für Vicat wäre ISO 306 einschlägig", confidence: "low" }),
    },
    features: t("Die Bruchdehnung von 220 % ist der höchste Wert unter allen nicht-elastomeren Werkstoffen des Bestands — PETG desselben Marktes liegt bei 20 bis 30 %. Zusammen mit einer HDT-B von 76 °C erklärt das, warum PCTG als zäher PETG-Ersatz gehandelt wird.",
                "The elongation at break of 220 % is the highest figure among all non-elastomeric materials in the dataset — PETG in the same market sits at 20 to 30 %. Together with an HDT-B of 76 °C this explains why PCTG is traded as a tough PETG substitute."),
    anomaly: t("Zwei Mängel auf einem Blatt. Erstens steht die Schlagzähigkeit als „93°C KJ/m2“ da — eine Temperatureinheit an einem Schlagwert. Was gemeint ist, lässt sich nicht entscheiden, der Wert ist deshalb nicht übernommen. Zweitens ist die Vicat-Erweichungstemperatur unter „DSC“ geführt; DSC ist die Kalorimetrie, für Vicat gilt ISO 306. Der Zahlenwert 88 °C ist plausibel und übernommen, trägt aber `low`.",
               "Two defects on one sheet. First, the impact strength appears as “93°C KJ/m2” — a temperature unit on an impact value. What is meant cannot be decided, so the value is not imported. Second, the Vicat softening temperature is filed under “DSC”; DSC is calorimetry, ISO 306 applies to Vicat. The figure of 88 °C is plausible and imported but carries `low`."),
  },
  {
    id: "formfutura-athenax-gf10", material: "pctg-gf", name: "AthenaX GF10", doc: 256483, date: "07-10-2024",
    props: {
      density: q(1.31, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(55, "MPa", { std: "ISO 527", conditions: "bei Streckgrenze", orientation: "XY" }),
      elongationAtBreakXy: q(8, "%", { std: "ISO 527", orientation: "XY" }),
      charpyUnnotchedXy: q(45, "kJ/m²", { std: "ISO 179-1eU", conditions: "23 °C; im Blatt als „Izod“ bezeichnet", orientation: "XY", confidence: "low" }),
      hdtB: q(78, "°C", { std: "ISO 75", conditions: "0,455 MPa" }),
      hdtA: q(68, "°C", { std: "ISO 75", conditions: "1,82 MPa" }),
      vicatB50: q(77, "°C", { std: "im Blatt als DSC angegeben; für Vicat wäre ISO 306 einschlägig", confidence: "low" }),
    },
    features: t("Glasfaser kostet hier die Zähigkeit fast vollständig: 8 % Bruchdehnung gegenüber 220 % beim unverstärkten AthenaX desselben Herstellers, also ein Achtundzwanzigstel. Die Wärmeformbeständigkeit steigt dabei um zwei Kelvin. Wer GF10 wegen der Temperatur wählt, hat den falschen Grund.",
                "Glass fibre costs almost all of the toughness here: 8 % elongation at break against 220 % for the same manufacturer's unreinforced AthenaX, a twenty-eighth. Heat deflection rises by two kelvin in return. Anyone choosing GF10 for the temperature has the wrong reason."),
    anomaly: t("Die Schlagzähigkeit ist als „Izod“ bezeichnet, die Norm daneben lautet ISO 179 — das ist der Charpy-Versuch, Izod wäre ISO 180. Beide Versuche belasten den Prüfkörper unterschiedlich und liefern nicht dieselbe Zahl. Geführt als Charpy nach der genannten Norm, mit `low`. Zudem liegt die Vicat-Temperatur mit 77 °C UNTER der HDT-B von 78 °C; normalerweise liegt sie darüber.",
               "The impact strength is labelled “Izod” while the standard next to it reads ISO 179 — that is the Charpy test, Izod would be ISO 180. The two tests load the specimen differently and do not give the same figure. Held as Charpy per the named standard, with `low`. The Vicat temperature of 77 °C moreover sits BELOW the HDT-B of 78 °C; normally it lies above."),
  },

  /* ---------------------------------------------------------------- ASA */
  {
    id: "formfutura-apollox", material: "asa", name: "ApolloX", doc: 256142,
    props: {
      density: q(1.11, "g/cm³", { std: "ISO 1183" }),
      meltFlowRate: q(45, "g/10min", { std: "ISO 1133", conditions: "260 °C / 5 kg" }),
      tensileStrengthXy: q(47.5, "MPa", { std: "ISO 527", conditions: "bei Streckgrenze, 50 mm/min", orientation: "XY" }),
      tensileModulusXy: q(2020, "MPa", { std: "ISO 527", conditions: "1 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(15, "%", { std: "ISO 527", conditions: "50 mm/min", orientation: "XY" }),
      charpyNotchedXy: q(18, "kJ/m²", { std: "ISO 179", conditions: "gekerbt, 23 °C", orientation: "XY" }),
      vicatA: q(98, "°C", { std: "ISO 306", conditions: "VST/A/50 (50 °C/h, 10 N); Blattangabe „≈ 98 °C“" }),
    },
    anomaly: t("Das Blatt nennt für ASA eine Schmelztemperatur von „≈ 230 ± 10 °C“ nach ISO 294. ASA ist amorph und hat keinen Schmelzpunkt, sondern einen Erweichungsbereich — ISO 294 ist zudem die Norm für das Spritzgießen von Probekörpern, keine Schmelzpunktbestimmung. Gemeint ist offenkundig eine Verarbeitungstemperatur. Nicht als Schmelzpunkt übernommen.",
               "The sheet gives ASA a melting temperature of “≈ 230 ± 10 °C” to ISO 294. ASA is amorphous and has no melting point but a softening range — and ISO 294 is the standard for injection moulding of test specimens, not a melting point determination. A processing temperature is evidently meant. Not imported as a melting point."),
  },
  {
    id: "formfutura-apollox-cf10", material: "asa-cf", name: "ApolloX CF10", doc: 256467,
    props: {
      density: q(1.1, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(79, "MPa", { std: "ISO 527", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      tensileModulusXy: q(7580, "MPa", { std: "ISO 527", orientation: "XY" }),
      elongationAtBreakXy: q(1.8, "%", { std: "ISO 527", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      charpyUnnotchedXy: ftlb(8, { std: "ISO 179/1eU", orientation: "XY" }),
      charpyNotchedXy: ftlb(2.57, { std: "ISO 179/1eU", orientation: "XY" }),
      vicatA: q(101.6, "°C", { std: "ISO 306" }),
      hdtB: q(100.5, "°C", { std: "ISO 75", conditions: "66 psi = 0,45 MPa" }),
      hdtA: q(95, "°C", { std: "ISO 75", conditions: "264 psi = 1,82 MPa" }),
    },
    features: t("Der steifste ASA-Werkstoff des Bestands: 7580 MPa gegenüber 2020 MPa beim unverstärkten ApolloX desselben Herstellers, also fast das Vierfache. Anders als bei PETG steigt hier auch die Wärmeformbeständigkeit deutlich mit — HDT-B 100,5 °C. Bezahlt wird mit 1,8 % Bruchdehnung gegenüber 15 %.",
                "The stiffest ASA material in the dataset: 7580 MPa against 2020 MPa for the same manufacturer's unreinforced ApolloX, almost fourfold. Unlike with PETG the heat deflection rises markedly too — HDT-B 100.5 °C. The price is 1.8 % elongation at break against 15 %."),
    anomaly: t("Ein europäisches Blatt mit ISO-Normen führt die Schlagzähigkeit in ft·lbf/in² und die HDT-Last in psi. Die Zahlen sind eindeutig umrechenbar und stehen hier in kJ/m² beziehungsweise mit der Lastangabe in MPa; die Blattangaben stehen jeweils in `conditions`. Der Mischmasch aus ISO-Norm und imperialer Einheit deutet auf eine übernommene Vorlage aus einer anderen Quelle — die Schlagwerte tragen deshalb `low`.",
               "A European sheet with ISO standards carries impact strength in ft·lbf/in² and the HDT load in psi. The figures convert unambiguously and appear here in kJ/m² and with the load in MPa; the sheet's own figures stand in `conditions` in each case. The mixture of ISO standard and imperial unit suggests a template taken from another source — the impact values therefore carry `low`."),
  },
  {
    id: "formfutura-apollox-kevlar", material: "asa", name: "ApolloX Kevlar", doc: 256474,
    props: {
      density: q(1.07, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(40, "MPa", { std: "ISO 527-1", conditions: "bei Streckgrenze", orientation: "XY" }),
      tensileModulusXy: q(2200, "MPa", { std: "ISO 527-1", orientation: "XY" }),
      elongationAtYieldXy: q(2.8, "%", { std: "ISO 527-1", orientation: "XY" }),
      elongationAtBreakXy: q(6, "%", { std: "ISO 527-1", orientation: "XY" }),
      charpyUnnotchedXy: q(25, "kJ/m²", { std: "ISO 179/1eU", conditions: "23 °C", orientation: "XY" }),
      charpyNotchedXy: q(7.5, "kJ/m²", { std: "ISO 179/1eU", conditions: "23 °C, gekerbt", orientation: "XY" }),
      vicatA: q(94, "°C", { std: "ISO 306" }),
      hdtB: q(89, "°C", { std: "ISO 75", conditions: "0,45 MPa — siehe Befund zur Reihenfolge", confidence: "low" }),
      hdtA: q(95, "°C", { std: "ISO 75", conditions: "1,81 MPa — siehe Befund zur Reihenfolge", confidence: "low" }),
    },
    features: t("Der einzige aramidverstärkte Werkstoff im Bestand: ASA mit 10 % Kevlar. Aramidfaser ist im Gegensatz zu Kohlenstoff- und Glasfaser nicht spröde, und das zeigt sich — 7,5 kJ/m² gekerbte Schlagzähigkeit bei 2200 MPa Steifigkeit. Zum Vergleich bricht ApolloX CF10 desselben Herstellers bei 1,8 % Dehnung, dieses hier bei 6 %.",
                "The only aramid-reinforced material in the dataset: ASA with 10 % Kevlar. Unlike carbon and glass fibre, aramid fibre is not brittle, and it shows — 7.5 kJ/m² notched impact at 2200 MPa stiffness. For comparison, the same manufacturer's ApolloX CF10 breaks at 1.8 % strain, this one at 6 %."),
    anomaly: t("Die HDT-Werte stehen in der falschen Reihenfolge: Das Blatt nennt bei 0,45 MPa 89 °C und bei 1,81 MPa 95 °C. Eine HÖHERE Last muss zu einer NIEDRIGEREN Temperatur führen — bei jedem Thermoplast, ausnahmslos. Einer der beiden Werte ist falsch zugeordnet oder falsch gemessen; welcher, lässt sich aus dem Blatt nicht entscheiden. Beide sind unverändert übernommen und tragen `low`. Sie zu vertauschen wäre geraten.",
               "The HDT values stand in the wrong order: the sheet gives 89 °C at 0.45 MPa and 95 °C at 1.81 MPa. A HIGHER load must lead to a LOWER temperature — in every thermoplastic, without exception. One of the two values is mis-assigned or mis-measured; which one cannot be decided from the sheet. Both are imported unchanged and carry `low`. Swapping them would be guesswork."),
  },
  {
    id: "formfutura-apollox-fr", material: "asa", name: "ApolloX Flame Retardant", doc: 256472, date: "20-01-2025",
    props: {
      density: q(1.08, "g/cm³", { std: "ASTM D792" }),
      meltFlowRate: q(5, "g/10min", { std: "ASTM D1238", conditions: "220 °C / 10 kg" }),
      tensileStrengthXy: q(42, "MPa", { std: "ASTM D638", conditions: "23 °C, 50 mm/min, 3,2 mm; bei Streckgrenze", orientation: "XY" }),
      tensileModulusXy: q(1800, "MPa", { std: "ASTM D638", conditions: "23 °C, 50 mm/min, 3,2 mm", orientation: "XY" }),
      elongationAtBreakXy: q(35, "%", { std: "ASTM D638", conditions: "23 °C, 50 mm/min, 3,2 mm; Blattangabe „35 % (Min)“", orientation: "XY" }),
      flexuralStrengthXy: q(64, "MPa", { std: "ASTM D790", conditions: "23 °C, 15 mm/min, 3,2 mm", orientation: "XY" }),
      flexuralModulusXy: q(1900, "MPa", { std: "ASTM D790", conditions: "23 °C, 15 mm/min, 3,2 mm", orientation: "XY" }),
      hdtB: q(86, "°C", { std: "ASTM D648", conditions: "Last im Blatt nicht genannt", confidence: "low" }),
      vicatA: q(90, "°C", { std: "ASTM D1525", conditions: "50 N, 50 °C/h" }),
      continuousServiceTemperature: q(50, "°C", { std: "UL 746B", conditions: "RTI mechanisch mit Schlag" }),
    },
    ul94: { value: "V-0", note: SELF_DECLARED_V0 },
    features: t("Die Dauergebrauchstemperatur von 50 °C nach UL 746B ist die ehrlichste Zahl auf diesem Blatt und die unbequemste: Sie liegt 36 K unter der HDT. Der RTI ist eine Langzeitgröße mit Alterung, die HDT eine Kurzzeitmessung — wer ein Bauteil auf Jahre auslegt, rechnet mit 50 °C, nicht mit 86 °C. Nur wenige Blätter im Bestand geben diese Zahl überhaupt an.",
                "The continuous service temperature of 50 °C to UL 746B is the most honest figure on this sheet and the most inconvenient: it sits 36 K below the HDT. The RTI is a long-term figure including ageing, the HDT a short-term measurement — anyone designing a part for years counts on 50 °C, not 86 °C. Few sheets in the dataset state this figure at all."),
    anomaly: t("Die Schlagzähigkeit steht in J/m nach ASTM D256 (435 J/m bei 3,2 mm, 60 J/m bei −30 °C). J/m ist Energie je Probenbreite, die hier geführte Einheit kJ/m² ist Energie je Bruchfläche — die Umrechnung braucht die Probendicke und verschiebt die Aussage. Die Werte sind deshalb nicht übernommen. Ebenso fehlt bei der HDT die Lastangabe, ohne die eine HDT nicht einzuordnen ist.",
               "The impact strength appears in J/m to ASTM D256 (435 J/m at 3.2 mm, 60 J/m at −30 °C). J/m is energy per specimen width, the unit used here, kJ/m², is energy per fracture area — the conversion requires the specimen thickness and shifts the meaning. The values are therefore not imported. The HDT likewise lacks the load without which an HDT cannot be placed."),
  },
  {
    id: "formfutura-apollox-foaming", material: "asa-aero", name: "ApolloX Foaming", doc: 266229, date: "25-07-2025",
    props: {
      density: q(1.07, "g/cm³", { std: "ASTM D792", conditions: "23 °C; Filament, NICHT das geschäumte Bauteil" }),
      meltFlowRate: q(5, "g/10min", { std: "ASTM D1238", conditions: "220 °C / 10 kg" }),
      vicatA: q(94, "°C", { std: "ASTM D1525", conditions: "50 N, 50 °C/h" }),
    },
    features: t("Das Blatt nennt eine Gewichtsersparnis von bis zu 66 % durch Aufschäumen und gibt dazu eine Vorgehensweise zur Flusskalibrierung an — typische Flusswerte 28 bis 40 %, Lüfter auf 0 bis 10 %. Solche Verarbeitungshinweise sind für ein schäumendes Filament wertvoller als jeder Kennwert, weil das Ergebnis fast vollständig an der Einstellung hängt.",
                "The sheet states a weight saving of up to 66 % through foaming and gives a procedure for flow calibration alongside — typical flow values 28 to 40 %, fan at 0 to 10 %. For a foaming filament such processing notes are worth more than any material value, because the result hangs almost entirely on the setting."),
    anomaly: t("Der schwerwiegendste Befund dieses Imports. Sämtliche mechanischen Kennwerte des Blattes — 42 MPa, 35 %, 1800 MPa, 64 MPa, 1900 MPa, 435 J/m, 60 J/m, Rockwell 92, HDT 86 °C — stehen Ziffer für Ziffer auch im Blatt von ApolloX Flame Retardant desselben Herstellers. Abweichend sind nur Dichte (1,07 gegen 1,08) und Vicat (94 gegen 90). Ein schäumendes und ein flammgeschütztes Filament haben keine gemeinsame Rezeptur; hier wurde eine Tabelle übernommen. Dazu kommt das grundsätzliche Problem: Ein GESCHÄUMT gedrucktes Bauteil erreicht die Kennwerte des kompakten Werkstoffs prinzipiell nicht — genau dafür wird geschäumt. Die mechanischen Werte sind deshalb NICHT übernommen; geführt sind nur Dichte, Schmelzindex und Vicat.",
               "The most serious finding of this import. Every mechanical value on the sheet — 42 MPa, 35 %, 1800 MPa, 64 MPa, 1900 MPa, 435 J/m, 60 J/m, Rockwell 92, HDT 86 °C — appears digit for digit in the same manufacturer's ApolloX Flame Retardant sheet as well. Only density (1.07 against 1.08) and Vicat (94 against 90) differ. A foaming and a flame-retardant filament share no formulation; a table was copied here. On top of that comes the fundamental problem: a FOAMED printed part cannot in principle reach the values of the compact material — that is precisely why one foams. The mechanical values are therefore NOT imported; only density, melt index and Vicat are held."),
  },

  /* ---------------------------------------------------------------- PC */
  {
    id: "formfutura-kratos-pc", material: "pc", name: "Kratos PC", doc: 256573, date: "15-08-2024",
    props: {
      density: q(1.2, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: kgcm2(630, { std: "ASTM D638", orientation: "XY" }),
      flexuralStrengthXy: kgcm2(920, { std: "ASTM D790", orientation: "XY" }),
      flexuralModulusXy: kgcm2(24000, { std: "ASTM D790", orientation: "XY" }),
      hdtB: q(139, "°C", { std: "ASTM D648", conditions: "0,45 MPa" }),
      hdtA: q(128, "°C", { std: "ASTM D648", conditions: "1,81 MPa; im Blatt fälschlich ebenfalls als „HDT B“ bezeichnet", confidence: "low" }),
      vicatA: q(150, "°C", { std: "ASTM D1525" }),
    },
    features: t("HDT-B 139 °C und Vicat 150 °C — nach dem add:north PC Blend HT LCF der wärmeformbeständigste unverstärkte Werkstoff des Bestands. Die Bruchdehnung gibt das Blatt mit „> 100 %“ an, was zu Polycarbonat passt: Es ist einer der wenigen technischen Thermoplaste, die zäh bleiben statt zu splittern.",
                "HDT-B 139 °C and Vicat 150 °C — after the add:north PC Blend HT LCF the most heat-resistant unreinforced material in the dataset. The sheet gives the elongation at break as “> 100 %”, which fits polycarbonate: it is one of the few engineering thermoplastics that stay tough instead of splintering."),
    anomaly: t("Zwei Punkte. Erstens führt das Blatt Festigkeiten in kg/cm² und die Schlagzähigkeit in kgcm/cm — Einheiten, die seit Jahrzehnten außer Gebrauch sind. Die Festigkeiten sind umgerechnet und tragen `low`, die Schlagzähigkeit ist nicht übernommen. Zweitens sind BEIDE HDT-Zeilen mit „HDT B“ beschriftet, obwohl die zweite mit 1,81 MPa geprüft wurde — das ist HDT A. Der niedrigere Wert bei höherer Last bestätigt die Zuordnung; die Beschriftung ist trotzdem falsch. Die Bruchdehnung „> 100 %“ ist als offene Angabe nicht als Zahl übernommen.",
               "Two points. First, the sheet carries strengths in kg/cm² and impact strength in kgcm/cm — units out of use for decades. The strengths are converted and carry `low`, the impact strength is not imported. Second, BOTH HDT rows are labelled “HDT B” although the second was tested at 1.81 MPa — that is HDT A. The lower value at the higher load confirms the assignment; the labelling is wrong nonetheless. The elongation at break of “> 100 %” is an open statement and not imported as a figure."),
  },

  /* ---------------------------------------------------------------- PA6 (Styx) */
  {
    id: "formfutura-styx-pa6", material: "pa6", name: "STYX PA6", doc: 281451,
    props: {
      density: q(1.15, "g/cm³", { std: "ISO 1183" }),
      waterAbsorption: q(9.5, "%", { std: "ISO 62", conditions: "23 °C, Sättigung in Wasser" }),
      tensileStrengthXy: q(50, "MPa", { std: "ISO 527-1/-2", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      tensileModulusXy: q(2900, "MPa", { std: "ISO 527-1/-2", conditions: "23 °C, 1 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(1.9, "%", { std: "ISO 527-1/-2", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      flexuralStrengthXy: q(112, "MPa", { std: "ISO 178", conditions: "23 °C, 2 mm/min", orientation: "XY" }),
      flexuralModulusXy: q(2800, "MPa", { std: "ISO 178", conditions: "23 °C, 2 mm/min", orientation: "XY" }),
      charpyNotchedXy: q(6.8, "kJ/m²", { std: "ISO 179/1eU", conditions: "23 °C, gekerbt", orientation: "XY" }),
      meltingTemperature: q(185, "°C", { std: "ISO 3146", conditions: "DSC, 10 °C/min", confidence: "low" }),
      hdtB: q(60, "°C", { std: "ISO 75-1/-2", conditions: "Last im Blatt nicht genannt", confidence: "low" }),
    },
    features: t("Die Wasseraufnahme bis zur Sättigung ist mit 9,5 % ausgewiesen — eine Angabe, die kaum ein Blatt macht und die bei Polyamid die wichtigste überhaupt ist: Ein gesättigtes PA6-Bauteil verliert einen erheblichen Teil seiner Steifigkeit und wächst maßlich. Dazu die Konditionierung bei 23 °C und 50 % relativer Feuchte mit 3,0 %.",
                "Water absorption to saturation is stated at 9.5 % — a figure hardly any sheet gives and the single most important one for polyamide: a saturated PA6 part loses a substantial part of its stiffness and grows dimensionally. Alongside it the conditioning at 23 °C and 50 % relative humidity at 3.0 %."),
    anomaly: t("Zwei Werte passen nicht zu PA6. Die Schmelztemperatur von 185 °C liegt rund 35 K unter dem Literaturwert für PA6 (etwa 220 °C) und deutet auf ein Copolyamid statt auf reines PA6 — das Blatt sagt dazu nichts. Und eine Bruchdehnung von 1,9 % ist für trockenes PA6 außergewöhnlich niedrig; übliche Werte liegen bei 20 bis 50 %. Beide Zahlen sind übernommen und tragen `low`. Der HDT fehlt zudem die Lastangabe.",
               "Two values do not fit PA6. The melting temperature of 185 °C sits some 35 K below the literature figure for PA6 (about 220 °C) and points to a co-polyamide rather than pure PA6 — the sheet says nothing about it. And an elongation at break of 1.9 % is exceptionally low for dry PA6; usual values lie at 20 to 50 %. Both figures are imported and carry `low`. The HDT moreover lacks its load."),
  },
  {
    id: "formfutura-styx-pa6-cf15", material: "pa6-cf", name: "STYX PA6-CF15", doc: 256638,
    props: {
      density: q(1.18, "g/cm³", { std: "ISO 1183" }),
      waterAbsorption: q(8, "%", { std: "ISO 62", conditions: "23 °C, Sättigung in Wasser" }),
      tensileStrengthXy: q(120, "MPa", { std: "ISO 527-1", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      tensileModulusXy: q(9000, "MPa", { std: "ISO 527-1", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(4, "%", { std: "ISO 527-1", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      flexuralStrengthXy: q(180, "MPa", { std: "ISO 178", conditions: "23 °C, 2 mm/min", orientation: "XY" }),
      flexuralModulusXy: q(8000, "MPa", { std: "ISO 178", conditions: "23 °C, 2 mm/min", orientation: "XY" }),
      charpyUnnotchedXy: q(60, "kJ/m²", { std: "ISO 179/1eU", conditions: "23 °C", orientation: "XY" }),
      charpyNotchedXy: q(4, "kJ/m²", { std: "ISO 179/1eU", conditions: "23 °C, gekerbt", orientation: "XY" }),
      hdtB: q(180, "°C", { std: "ISO 75", conditions: "0,45 MPa", confidence: "low" }),
      hdtA: q(65, "°C", { std: "ISO 75", conditions: "1,8 MPa", confidence: "low" }),
    },
    features: t("120 MPa Zugfestigkeit bei 9000 MPa Steifigkeit — das dritthöchste Wertepaar des Bestands. Der Abstand zwischen HDT-B (180 °C) und HDT-A (65 °C) beträgt 115 K und ist typisch für ein faserverstärktes teilkristallines Polyamid: Unter geringer Last trägt die Kristallphase weit über den Glasübergang hinaus, unter hoher Last nicht.",
                "120 MPa tensile strength at 9000 MPa stiffness — the third highest value pair in the dataset. The gap between HDT-B (180 °C) and HDT-A (65 °C) is 115 K and is typical of a fibre-reinforced semi-crystalline polyamide: under low load the crystalline phase carries far beyond the glass transition, under high load it does not."),
    anomaly: t("Die HDT-Werte 180 °C und 65 °C sowie die gekerbte Schlagzähigkeit von 4 kJ/m² stehen zeichengleich auch im Blatt des STYX PA6-GF30 desselben Herstellers — bei einem anderen Fasertyp und einem um mehr als das Doppelte abweichenden Fasergehalt. Zwei so verschiedene Compounds mit identischen thermischen Kennwerten deuten auf eine übernommene Vorlage statt auf zwei Messungen. Alle drei Werte tragen `low`.",
               "The HDT values of 180 °C and 65 °C as well as the notched impact strength of 4 kJ/m² appear character for character in the same manufacturer's STYX PA6-GF30 sheet — with a different fibre type and a fibre content differing by more than a factor of two. Two such different compounds with identical thermal values point to a copied template rather than two measurements. All three values carry `low`."),
  },
  {
    id: "formfutura-styx-pa6-gf30", material: "pa6-gf", name: "STYX PA6-GF30", doc: 256639,
    props: {
      density: q(1.34, "g/cm³", { std: "ISO 1183" }),
      waterAbsorption: q(6.5, "%", { std: "ISO 62", conditions: "23 °C, Sättigung in Wasser" }),
      tensileStrengthXy: q(80, "MPa", { std: "ISO 527-1", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      tensileModulusXy: q(5500, "MPa", { std: "ISO 527-1", conditions: "23 °C, 50 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(3.5, "%", { min: 3, max: 4, std: "ISO 527-1", conditions: "23 °C, 50 mm/min; Blattangabe „3–4 %“", orientation: "XY" }),
      flexuralStrengthXy: q(125, "MPa", { std: "ISO 178", conditions: "23 °C, 2 mm/min", orientation: "XY" }),
      flexuralModulusXy: q(4500, "MPa", { std: "ISO 178", conditions: "23 °C, 2 mm/min", orientation: "XY" }),
      charpyUnnotchedXy: q(25, "kJ/m²", { std: "ISO 179/1eU", conditions: "23 °C", orientation: "XY" }),
      charpyNotchedXy: q(4, "kJ/m²", { std: "ISO 179/1eU", conditions: "23 °C, gekerbt", orientation: "XY" }),
      hdtB: q(180, "°C", { std: "ISO 75", conditions: "0,45 MPa", confidence: "low" }),
      hdtA: q(65, "°C", { std: "ISO 75", conditions: "1,8 MPa", confidence: "low" }),
    },
    features: t("Der bislang einzige zweite Beleg für PA6-GF im Bestand. Aufschlussreich ist der Vergleich mit dem PA6-CF15 desselben Herstellers: 30 % Glasfaser bringen 5500 MPa, 15 % Kohlenstofffaser 9000 MPa. Die doppelte Fasermenge des billigeren Werkstoffs erreicht nicht zwei Drittel der Steifigkeit — dafür bleibt die ungekerbte Schlagzähigkeit bei 25 statt 60 kJ/m².",
                "So far the only second piece of evidence for PA6-GF in the dataset. The comparison with the same manufacturer's PA6-CF15 is instructive: 30 % glass fibre yields 5500 MPa, 15 % carbon fibre 9000 MPa. Twice the fibre load of the cheaper material does not reach two thirds of the stiffness — in exchange the unnotched impact stays at 25 instead of 60 kJ/m²."),
    anomaly: t("Siehe den Befund beim STYX PA6-CF15: HDT-B 180 °C, HDT-A 65 °C und gekerbte Schlagzähigkeit 4 kJ/m² sind auf beiden Blättern identisch, obwohl Fasertyp und Fasergehalt sich deutlich unterscheiden. Die drei Werte tragen deshalb `low`.",
               "See the finding on the STYX PA6-CF15: HDT-B 180 °C, HDT-A 65 °C and notched impact strength 4 kJ/m² are identical on both sheets although fibre type and fibre content differ markedly. The three values therefore carry `low`."),
  },

  /* ---------------------------------------------------------------- PAHT (LUVOCOM 3F) */
  {
    id: "formfutura-luvocom-paht-9825", material: "paht", name: "LUVOCOM 3F PAHT 9825", doc: 256549, lehvoss: true,
    props: {
      density: q(1.2, "g/cm³", { std: "ISO 1183" }),
      waterAbsorption: q(0.3, "%", { std: "ISO 62", conditions: "23 °C / 24 h; Blattangabe „< 0,3 %“", confidence: "low" }),
      meltFlowRate: q(3.6, "g/10min", { std: "ISO 1133", conditions: "Granulat" }),
      shrinkage: q(0.4, "%", { min: 0.3, max: 0.5, std: "DIN 16901", conditions: "VSR 3 mm, längs; Blattangabe „0,3–0,5 %“" }),
      tensileStrengthXy: q(85, "MPa", { std: "ISO 527", conditions: "MPTS ISO 3167 A", orientation: "XY" }),
      tensileModulusXy: gpa(3.4, { std: "ISO 527", orientation: "XY" }),
      elongationAtBreakXy: q(3.6, "%", { std: "ISO 527", conditions: "MPTS ISO 3167 A", orientation: "XY" }),
      hdtA: q(90, "°C", { std: "ISO 75", conditions: "1,8 MPa (HDT A)" }),
      continuousServiceTemperature: q(120, "°C", { std: "UL 746B", conditions: "MPTS ISO 3167 A" }),
    },
    features: t("Ein Blatt, das den Prüfkörper benennt — im Bestand die Ausnahme. „MPTS ISO 3167 A“ ist der spritzgegossene Mehrzweckprüfkörper; damit ist eindeutig, worauf sich die Zahlen beziehen, und ebenso eindeutig, dass ein gedrucktes Bauteil sie nicht erreicht. Diese Klarheit ist mehr wert als eine Nachkommastelle.",
                "A sheet that names the specimen — the exception in this dataset. “MPTS ISO 3167 A” is the injection-moulded multi-purpose specimen; that makes clear what the figures refer to, and equally clear that a printed part will not reach them. This clarity is worth more than a decimal place."),
    anomaly: t("Die Tabelle des Blattes hat leere Zellen: Biegefestigkeit, Biegedehnung, Biege-E-Modul, alle vier Charpy-Zeilen und die Vicat-Temperatur stehen ohne Wert da. Auch die UL-94-Zeile ist angelegt, aber nicht gefüllt. Das ist kein Fehler — es ist eine Vorlage mit offenen Feldern —, begrenzt aber, was dieses Blatt beitragen kann.",
               "The sheet's table has empty cells: flexural strength, flexural strain, flexural modulus, all four Charpy rows and the Vicat temperature stand without a value. The UL 94 row too is laid out but not filled. This is not an error — it is a template with open fields — but it limits what this sheet can contribute."),
  },
  {
    id: "formfutura-luvocom-paht-9936", material: "paht", name: "LUVOCOM 3F PAHT 9936", doc: 256551, lehvoss: true,
    props: {
      density: q(1.25, "g/cm³", { std: "ISO 1183-3" }),
      waterAbsorption: q(0.3, "%", { std: "ISO 62", conditions: "23 °C / 24 h; Blattangabe „< 0,3 %“", confidence: "low" }),
      meltFlowRate: q(5.5, "g/10min", { std: "ISO 1133", conditions: "250 °C / 2,16 kg, Granulat" }),
      shrinkage: q(0.4, "%", { min: 0.3, max: 0.5, std: "DIN 16742", conditions: "MPTS ISO 3167 A; Blattangabe „0,3–0,5 %“" }),
      tensileStrengthXy: q(78, "MPa", { std: "ISO 527", conditions: "trocken, 50 mm/min, MPTS ISO 3167 A", orientation: "XY" }),
      tensileModulusXy: gpa(3.4, { std: "ISO 527", conditions: "trocken, 1 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(4.4, "%", { std: "ISO 527", conditions: "trocken, 50 mm/min; Dehnung bei Höchstkraft", orientation: "XY" }),
      charpyUnnotchedXy: q(90, "kJ/m²", { std: "ISO 179/1eU", conditions: "trocken, 80 × 10 × 4 mm", orientation: "XY" }),
      hdtA: q(90, "°C", { std: "ISO 75", conditions: "1,8 MPa (HDT A), Spritzgusskörper" }),
      continuousServiceTemperature: q(120, "°C", { std: "IEC 60216", conditions: "20.000 h, MPTS ISO 3167 A" }),
      shortTermTemperature: q(160, "°C", { conditions: "max. 200 h über die Lebensdauer, MPTS ISO 3167 A" }),
    },
    features: t("Die Dauergebrauchstemperatur steht hier MIT Zeitbasis: 120 °C über 20.000 Stunden nach IEC 60216, kurzzeitig 160 °C für höchstens 200 Stunden über die gesamte Lebensdauer. Genau diese Trennung fehlt fast überall — eine Temperaturangabe ohne Zeitbasis ist für die Auslegung eines dauerwarmen Bauteils wertlos. Dazu 90 kJ/m² ungekerbte Schlagzähigkeit bei 78 MPa Festigkeit.",
                "The continuous service temperature stands here WITH a time basis: 120 °C over 20,000 hours to IEC 60216, short-term 160 °C for at most 200 hours across the entire service life. Precisely this distinction is missing almost everywhere — a temperature statement without a time basis is worthless for designing a permanently warm part. Alongside it 90 kJ/m² unnotched impact at 78 MPa strength."),
  },
  {
    id: "formfutura-luvocom-paht-cf-9742", material: "paht-cf", name: "LUVOCOM 3F PAHT CF 9742", doc: 256553, lehvoss: true,
    props: {
      density: q(1.25, "g/cm³", { std: "ISO 1183-3" }),
      waterAbsorption: q(0.3, "%", { std: "ISO 62", conditions: "23 °C / 24 h; Blattangabe „< 0,3 %“", confidence: "low" }),
      shrinkage: q(0.05, "%", { min: 0, max: 0.1, std: "DIN 16742", conditions: "ISO 3167 A; Blattangabe „0,00–0,1 %“" }),
      tensileStrengthXy: q(170, "MPa", { std: "ISO 527", conditions: "trocken, 50 mm/min, ISO 3167 A", orientation: "XY" }),
      tensileModulusXy: gpa(15, { std: "ISO 527", conditions: "trocken, 1 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(1, "%", { std: "ISO 527", conditions: "trocken, 50 mm/min; Dehnung bei Höchstkraft", orientation: "XY" }),
      charpyUnnotchedXy: q(47, "kJ/m²", { std: "ISO 179/1eU", conditions: "trocken, 80 × 10 × 4 mm", orientation: "XY" }),
      hdtA: q(200, "°C", { std: "ISO 75", conditions: "1,8 MPa (HDT A), 80 × 10 × 4 mm" }),
      continuousServiceTemperature: q(150, "°C", { std: "IEC 60216", conditions: "20.000 h, ISO 3167 A" }),
      shortTermTemperature: q(180, "°C", { conditions: "max. 200 h über die Lebensdauer, ISO 3167 A" }),
      thermalConductivity: q(1, "W/(m·K)", { std: "ISO 22007", conditions: "Hot-Disk, 60 × 60 × 3 mm, in der Ebene" }),
    },
    features: t("Der steifste Werkstoff des gesamten Bestands: 15.000 MPa Zug-E-Modul bei 170 MPa Festigkeit. Der bisherige Spitzenreiter, add:north PC Blend HT LCF, lag bei 9.800 MPa. Dazu HDT-A 200 °C und eine Dauergebrauchstemperatur von 150 °C über 20.000 Stunden — kein anderer Datensatz erreicht diese Kombination. Die Wärmeleitfähigkeit von 1 W/(m·K) ist etwa das Vierfache eines ungefüllten Thermoplasten und für Bauteile mit Wärmeabfuhr interessant.",
                "The stiffest material in the entire dataset: 15,000 MPa tensile modulus at 170 MPa strength. The previous leader, add:north PC Blend HT LCF, sat at 9,800 MPa. Alongside it HDT-A 200 °C and a continuous service temperature of 150 °C over 20,000 hours — no other record reaches this combination. The thermal conductivity of 1 W/(m·K) is about four times that of an unfilled thermoplastic and interesting for parts that must shed heat."),
    anomaly: t("Der lineare Wärmeausdehnungskoeffizient steht mit dem Wert 0,4 und der Einheit „10/K“ da. Gemeint ist ersichtlich eine Zehnerpotenz, deren Exponent bei der Erstellung des Blattes verloren gegangen ist; ob 10⁻⁴ oder 10⁻⁵ gemeint war, entscheidet über den Faktor zehn. Nicht übernommen. Die Bruchdehnung von 1 % ist kein Fehler, sondern der Preis der Steifigkeit: Dieses Material bricht ohne Vorwarnung.",
               "The linear coefficient of thermal expansion appears with the value 0.4 and the unit “10/K”. A power of ten is evidently meant whose exponent was lost when the sheet was produced; whether 10⁻⁴ or 10⁻⁵ was intended decides a factor of ten. Not imported. The elongation at break of 1 % is not an error but the price of the stiffness: this material breaks without warning."),
  },
  {
    id: "formfutura-luvocom-paht-cf-9891", material: "paht-cf", name: "LUVOCOM 3F PAHT CF 9891", doc: 256555, lehvoss: true,
    props: {
      density: q(1.24, "g/cm³", { std: "ISO 1183-3" }),
      waterAbsorption: q(0.3, "%", { std: "ISO 62", conditions: "23 °C / 24 h; Blattangabe „< 0,3 %“", confidence: "low" }),
      meltFlowRate: q(4, "g/10min", { std: "ISO 1133", conditions: "250 °C / 2,16 kg, Granulat" }),
      shrinkage: q(0.4, "%", { min: 0.3, max: 0.5, std: "DIN 16742", conditions: "MPTS ISO 3167 A; Blattangabe „0,3–0,5 %“" }),
      tensileStrengthXy: q(120, "MPa", { std: "ISO 527", conditions: "trocken, 50 mm/min, MPTS ISO 3167 A", orientation: "XY" }),
      tensileModulusXy: gpa(10.5, { std: "ISO 527", conditions: "trocken, 1 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(2, "%", { std: "ISO 527", conditions: "trocken, 50 mm/min; Dehnung bei Höchstkraft", orientation: "XY" }),
      charpyUnnotchedXy: q(35, "kJ/m²", { std: "ISO 179/1eU", conditions: "trocken, 80 × 10 × 4 mm", orientation: "XY" }),
      hdtA: q(90, "°C", { std: "ISO 75", conditions: "1,8 MPa (HDT A), Spritzgusskörper", confidence: "low" }),
      continuousServiceTemperature: q(120, "°C", { std: "IEC 60216", conditions: "20.000 h, MPTS ISO 3167 A", confidence: "low" }),
      shortTermTemperature: q(160, "°C", { conditions: "max. 200 h über die Lebensdauer, MPTS ISO 3167 A", confidence: "low" }),
    },
    anomaly: t("Die thermischen Kennwerte passen nicht zum mechanischen Befund. Dieses Compound erreicht mit 10.500 MPa mehr als das Dreifache der Steifigkeit des unverstärkten PAHT 9936 — bei den Temperaturen steht aber exakt derselbe Satz wie dort: HDT-A 90 °C, Dauergebrauch 120 °C, kurzzeitig 160 °C. Beim PAHT CF 9742 desselben Herstellers, mechanisch vergleichbar aufgebaut, liegt die HDT-A stattdessen bei 200 °C. Kohlenstofffaser hebt bei teilkristallinen Polyamiden die Wärmeformbeständigkeit erfahrungsgemäß deutlich; dass sie es hier nicht tut, ist erklärungsbedürftig und wird vom Blatt nicht erklärt. Die drei Temperaturwerte tragen `low`.",
               "The thermal values do not fit the mechanical finding. At 10,500 MPa this compound reaches more than three times the stiffness of the unreinforced PAHT 9936 — yet for the temperatures it carries exactly the same set as that sheet: HDT-A 90 °C, continuous service 120 °C, short-term 160 °C. On the same manufacturer's PAHT CF 9742, comparably built mechanically, the HDT-A sits at 200 °C instead. In semi-crystalline polyamides carbon fibre raises heat deflection markedly by experience; that it does not here calls for explanation, and the sheet gives none. The three temperature values carry `low`."),
  },
  {
    id: "formfutura-luvocom-paht-kk-fr", material: "paht", name: "LUVOCOM 3F PAHT KK 50056 BK FR", doc: 256575, date: "04-02-2025", lehvoss: true,
    props: {
      density: q(1.49, "g/cm³", { std: "ISO 1183-3" }),
      waterAbsorption: q(0.3, "%", { std: "ISO 62", conditions: "23 °C / 24 h; Blattangabe „< 0,3 %“", confidence: "low" }),
      shrinkage: q(0.05, "%", { min: 0, max: 0.1, std: "DIN 16742", conditions: "Blattangabe „0,0–0,1 %“" }),
      tensileStrengthXy: q(55, "MPa", { std: "ISO 527", conditions: "trocken, 50 mm/min", orientation: "XY" }),
      tensileModulusXy: gpa(6, { std: "ISO 527", conditions: "trocken, 1 mm/min", orientation: "XY" }),
      elongationAtBreakXy: q(1.2, "%", { std: "ISO 527", conditions: "trocken, 50 mm/min; Dehnung bei Höchstkraft", orientation: "XY" }),
      hdtA: q(90, "°C", { std: "ISO 75", conditions: "1,8 MPa (HDT A)" }),
      continuousServiceTemperature: q(120, "°C", { std: "IEC 60216", conditions: "20.000 h" }),
      shortTermTemperature: q(160, "°C", { conditions: "max. 200 h über die Lebensdauer" }),
    },
    ul94: {
      value: "V-0", thicknessMm: 1.6, confidence: "medium",
      note: t("Anders als bei den ApolloX- und PETG-Flammschutztypen desselben Vertriebs nennt dieses Blatt die Materialdicke: 1/16 Zoll, also 1,6 mm. Ohne Dickenangabe ist eine UL-94-Klasse nicht übertragbar — mit ihr ist sie eine belastbare Aussage. Eine Zeugnisnummer und eine Prüfstelle nennt auch dieses Blatt nicht.",
              "Unlike the ApolloX and PETG flame-retardant grades from the same distributor, this sheet names the material thickness: 1/16 inch, that is 1.6 mm. Without a thickness a UL 94 class is not transferable — with it, it is a solid statement. This sheet too names no certificate number and no test house."),
    },
    features: t("Der einzige Werkstoff im Bestand mit Bahnzulassungsdaten: EN 45545 mit den Anforderungssätzen R22 und R23 in den Gefährdungsstufen HL1, HL2 und HL3, belegt über ISO 4589-2 (Sauerstoffindex) und ISO 5659-2 (Rauchdichte). Wer im Schienenfahrzeugbau fertigt, braucht genau diese Nachweise — und findet sie sonst auf keinem FDM-Datenblatt. Der Füllstoff sind Keramikmikrokugeln, was die Dichte von 1,49 g/cm³ erklärt, die höchste aller geführten Polyamide.",
                "The only material in the dataset with rail approval data: EN 45545 with requirement sets R22 and R23 at hazard levels HL1, HL2 and HL3, evidenced via ISO 4589-2 (oxygen index) and ISO 5659-2 (smoke density). Anyone manufacturing for rail vehicles needs exactly these proofs — and finds them on no other FDM datasheet. The filler is ceramic microspheres, which explains the density of 1.49 g/cm³, the highest of all polyamides held here."),
    anomaly: t("Das Blatt bezeichnet den Werkstoff im Fließtext als „PA6 filament filled with ceramic microspheres“, führt ihn im Produktnamen aber als PAHT. PA6 und Hochtemperatur-Polyamid sind nicht dasselbe; die Zuordnung zu `paht` in dieser Datenbank folgt dem Produktnamen und der Linie, nicht der Beschreibung. Die Temperaturkennwerte (HDT-A 90 °C, Dauergebrauch 120 °C) stimmen mit den übrigen PAHT-Blättern dieser Linie überein und stützen die Zuordnung — auflösen lässt sich der Widerspruch aus dem Blatt allein nicht.",
               "In its body text the sheet calls the material a “PA6 filament filled with ceramic microspheres” but carries it in the product name as PAHT. PA6 and high-temperature polyamide are not the same; the assignment to `paht` in this database follows the product name and the product line, not the description. The temperature values (HDT-A 90 °C, continuous service 120 °C) agree with the other PAHT sheets of this line and support the assignment — the contradiction cannot be resolved from the sheet alone."),
  },

  /* ---------------------------------------------------------------- PETG */
  {
    id: "formfutura-bulk-petg", material: "petg", name: "Bulk PETG", doc: 273965, date: "01-08-2025",
    props: {
      density: q(1.29, "g/cm³", { std: "ASTM D792", conditions: "23 °C" }),
      tensileStrengthXy: q(50.2, "MPa", { std: "ASTM D638", conditions: "23 °C, 50 mm/min; bei Streckgrenze", orientation: "XY" }),
      flexuralStrengthXy: q(66.8, "MPa", { std: "ASTM D790", orientation: "XY" }),
    },
  },
  {
    id: "formfutura-easyfil-epetg", material: "petg", name: "EasyFil ePETG", doc: 281456,
    props: {
      density: q(1.29, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(25, "MPa", { std: "ASTM D638", conditions: "bei Streckgrenze", orientation: "XY", confidence: "low" }),
      tensileModulusXy: q(2980, "MPa", { std: "ASTM D638", orientation: "XY" }),
      izodNotchedXy: q(4.7, "kJ/m²", { std: "Norm im Blatt nicht genannt", conditions: "gekerbt", orientation: "XY", confidence: "low" }),
    },
    anomaly: t("Die Streckspannung von 25 MPa liegt bei der Hälfte dessen, was die übrigen PETG-Blätter dieses Herstellers ausweisen (Bulk PETG 50,2 MPa, Hdglass 50 MPa) — bei einem E-Modul von 2980 MPa, das über beiden liegt. Hohe Steifigkeit bei halber Festigkeit ist bei derselben Polymerfamilie erklärungsbedürftig. Der Wert ist übernommen und trägt `low`. Für die Schlagzähigkeit nennt das Blatt keine Prüfnorm.",
               "The yield stress of 25 MPa is half of what the same manufacturer's other PETG sheets state (Bulk PETG 50.2 MPa, Hdglass 50 MPa) — at a modulus of 2980 MPa that lies above both. High stiffness at half the strength calls for explanation within the same polymer family. The value is imported and carries `low`. For the impact strength the sheet names no test standard."),
  },
  {
    id: "formfutura-hdglass", material: "petg", name: "HDglass", doc: 256561,
    props: {
      density: q(1.27, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(50, "MPa", { std: "ASTM D638", conditions: "bei Streckgrenze, 50 mm/min", orientation: "XY" }),
      tensileModulusXy: q(1940, "MPa", { std: "ISO 527", conditions: "1 mm/min", orientation: "XY" }),
      flexuralStrengthXy: q(70.6, "MPa", { std: "ASTM D790", conditions: "1,27 mm/min", orientation: "XY" }),
      flexuralModulusXy: q(2147.6, "MPa", { std: "ASTM D790", conditions: "1,27 mm/min", orientation: "XY" }),
      izodNotchedXy: q(7.2, "kJ/m²", { std: "ASTM D256", conditions: "gekerbt, 23 °C", orientation: "XY" }),
      hdtB: q(70, "°C", { std: "ASTM D648", conditions: "0,455 MPa (66 psi); im Blatt fälschlich als Vicat bezeichnet — siehe Befund", confidence: "low" }),
    },
    anomaly: t("Die Zeile „Viscat softening temp.“ trägt die Norm ASTM D648 und die Bedingung „@ 0.455 Mpa (66psi)“. ASTM D648 ist die Wärmeformbeständigkeit unter Last, nicht der Vicat-Versuch — und eine Lastangabe gibt es beim Vicat gar nicht in dieser Form. Der Wert ist deshalb als HDT-B geführt, nicht als Vicat. Die Schreibweise „Viscat“ und der Biege-E-Modul mit 2147,6 MPa auf eine Zehntelstelle genau runden das Bild ab: Dieses Blatt ist nicht sorgfältig gepflegt. Der Wert trägt `low`.",
               "The row “Viscat softening temp.” carries the standard ASTM D648 and the condition “@ 0.455 Mpa (66psi)”. ASTM D648 is heat deflection under load, not the Vicat test — and a load statement does not exist for Vicat in this form at all. The value is therefore held as HDT-B, not as Vicat. The spelling “Viscat” and a flexural modulus given as 2147.6 MPa to a tenth complete the picture: this sheet is not carefully maintained. The value carries `low`."),
  },
  {
    id: "formfutura-carbonfil-cf03", material: "petg-cf", name: "CarbonFil CF03", doc: 256494, date: "15-05-2024",
    props: {
      density: q(1.29, "g/cm³", { std: "Norm im Blatt nicht genannt", confidence: "low" }),
      tensileStrengthXy: q(44, "MPa", { std: "ISO 527-2", conditions: "bei Bruch", orientation: "XY" }),
      tensileModulusXy: q(3515, "MPa", { std: "ISO 527-2", orientation: "XY" }),
      izodNotchedXy: q(4.6, "kJ/m²", { std: "ISO 180", conditions: "gekerbt", orientation: "XY" }),
    },
    features: t("Ein dritter unabhängiger Beleg für den Kernbefund zu PETG-CF: 3515 MPa gegenüber 1940 MPa beim HDglass desselben Herstellers — Kohlenstofffaser bringt bei PETG Steifigkeit, ungefähr das Doppelte. Eine Wärmeformbeständigkeit weist auch dieses Blatt nicht aus, womit die Aussage „CF bringt bei PETG keinen Temperaturgewinn“ weiter unwidersprochen bleibt.",
                "A third independent piece of evidence for the core finding on PETG-CF: 3515 MPa against 1940 MPa for the same manufacturer's HDglass — carbon fibre brings PETG stiffness, roughly double. This sheet too states no heat deflection temperature, leaving the statement “CF brings PETG no temperature gain” unchallenged."),
  },
  {
    id: "formfutura-premium-petg-fr", material: "petg", name: "Premium PETG Flame Retardant", doc: 263077, date: "15-01-2025",
    props: {
      density: q(1.26, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(40, "MPa", { std: "ISO 527", conditions: "bei Streckgrenze, 5 mm/min", orientation: "XY" }),
      tensileModulusXy: q(2350, "MPa", { std: "ISO 527", conditions: "1 mm/min", orientation: "XY" }),
      charpyNotchedXy: q(3, "kJ/m²", { std: "ISO 179-1eA", conditions: "23 °C, gekerbt; im Blatt als „Izod“ bezeichnet", orientation: "XY", confidence: "low" }),
    },
    ul94: { value: "V-0", note: SELF_DECLARED_V0 },
    features: t("Der Preis des Flammschutzes ist hier nachrechenbar: 3 kJ/m² gekerbte Schlagzähigkeit gegenüber 7,2 kJ/m² beim HDglass desselben Herstellers, und 40 MPa Streckspannung gegenüber 50 MPa. Flammschutzadditive stören die Molekülbeweglichkeit — das ist keine Rezepturschwäche, sondern der Mechanismus.",
                "The price of flame retardancy is calculable here: 3 kJ/m² notched impact against 7.2 kJ/m² for the same manufacturer's HDglass, and 40 MPa yield stress against 50 MPa. Flame-retardant additives interfere with molecular mobility — that is not a formulation weakness but the mechanism."),
    anomaly: t("Die Schlagzähigkeit ist als „Izod Notched“ bezeichnet, die Norm daneben lautet ISO 179-1eA — das ist der Charpy-Versuch mit Kerbe A. Geführt als Charpy nach der genannten Norm, mit `low`.",
               "The impact strength is labelled “Izod Notched” while the standard next to it reads ISO 179-1eA — that is the Charpy test with notch A. Held as Charpy per the named standard, with `low`."),
  },

  /* ---------------------------------------------------------------- ABS */
  {
    id: "formfutura-premium-abs-medical", material: "abs", name: "Premium ABS Medical", doc: 306558, date: "05-01-2026",
    props: {
      density: q(1.06, "g/cm³", { std: "ISO 1183-1" }),
      tensileStrengthXy: q(48, "MPa", { std: "ISO 527", conditions: "bei Streckgrenze", orientation: "XY" }),
      tensileModulusXy: q(2475, "MPa", { std: "ISO 527", orientation: "XY" }),
      flexuralModulusXy: q(2524, "MPa", { std: "ISO 178", orientation: "XY" }),
      izodNotchedXy: q(14, "kJ/m²", { std: "ISO 180", conditions: "gekerbt, 23 °C", orientation: "XY" }),
    },
    features: t("Das Blatt weist die gekerbte Schlagzähigkeit auch bei −30 °C aus: 7 kJ/m² gegenüber 14 kJ/m² bei Raumtemperatur. Die Hälfte der Zähigkeit bei Kälte ist die Angabe, die über die Eignung eines Bauteils im Außenbereich oder im Kühlbetrieb entscheidet — und sie steht auf kaum einem Blatt.",
                "The sheet also states the notched impact at −30 °C: 7 kJ/m² against 14 kJ/m² at room temperature. Half the toughness in the cold is the figure that decides whether a part is suitable outdoors or in refrigerated operation — and it appears on hardly any sheet."),
  },
  {
    id: "formfutura-reform-rtitan", material: "abs", name: "ReForm rTitan", doc: 256633,
    props: {
      density: q(1.1, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(43.6, "MPa", { std: "ISO 527", conditions: "bei Streckgrenze, 50 mm/min", orientation: "XY" }),
      tensileModulusXy: q(2030, "MPa", { std: "ISO 527", conditions: "1 mm/min", orientation: "XY" }),
      charpyNotchedXy: q(58, "kJ/m²", { std: "ISO 179", conditions: "gekerbt, 23 °C", orientation: "XY", confidence: "low" }),
    },
    features: t("Ein Rezyklat-ABS, dessen Kennwerte sich vor dem Neuware-ABS desselben Herstellers nicht verstecken müssen: 43,6 gegenüber 48 MPa Streckspannung. Für Anwendungen, bei denen die Herkunft des Materials zählt, ist der Abstand von rund einem Zehntel eine brauchbare Größe.",
                "A recycled ABS whose values need not hide behind the same manufacturer's virgin ABS: 43.6 against 48 MPa yield stress. For applications where the origin of the material matters, a gap of about a tenth is a workable figure."),
    anomaly: t("Die gekerbte Schlagzähigkeit von 58 kJ/m² nach ISO 179 ist für ABS außergewöhnlich hoch — übliche Werte liegen bei 10 bis 25 kJ/m², das Premium ABS Medical desselben Vertriebs nennt 14 kJ/m² (ISO 180). Ein Rezyklat übertrifft Neuware in der Zähigkeit normalerweise nicht. Wahrscheinlich ist eine UNGEKERBTE Messung als gekerbt ausgewiesen; entscheiden lässt sich das aus dem Blatt nicht. Der Wert ist unverändert übernommen und trägt `low`.",
               "The notched impact strength of 58 kJ/m² to ISO 179 is exceptionally high for ABS — usual values lie at 10 to 25 kJ/m², and the same distributor's Premium ABS Medical states 14 kJ/m² (ISO 180). A recyclate does not normally exceed virgin material in toughness. An UNNOTCHED measurement reported as notched is likely; this cannot be decided from the sheet. The value is imported unchanged and carries `low`."),
  },

  /* ---------------------------------------------------------------- PLA */
  {
    id: "formfutura-bulk-pla", material: "pla", name: "Bulk PLA", doc: 273966, date: "01-09-2025",
    props: {
      density: q(1.24, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(47, "MPa", { std: "ASTM D882", orientation: "XY", confidence: "low" }),
      tensileModulusXy: q(3400, "MPa", { std: "ASTM D882", orientation: "XY", confidence: "low" }),
    },
    anomaly: t("Beide Zugkennwerte sind nach ASTM D882 geprüft. Das ist die Norm für dünne Kunststofffolien unter 1 mm Dicke; für starre Formteile gilt ASTM D638 beziehungsweise ISO 527. An einer Folie gemessene Zugwerte sind nicht auf ein gedrucktes Bauteil übertragbar, weil Probengeometrie und Spannungszustand andere sind. Die Zahlen sind plausibel und übernommen, tragen aber `low`.",
               "Both tensile values are tested to ASTM D882. That is the standard for thin plastic sheeting below 1 mm thickness; for rigid mouldings ASTM D638 or ISO 527 applies. Tensile values measured on film do not transfer to a printed part because specimen geometry and stress state differ. The figures are plausible and imported but carry `low`."),
  },
];

/* ------------------------------------------------------------------ Ausgabe */

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, na = 0, nu = 0, nm = 0;
const byMaterial = new Map();

for (const p of P) {
  const url = `${BASE}/${p.doc}?download=true`;
  const version = iso(p.date);
  const parts = [p.lehvoss ? MOULDED : UNDECLARED];
  if (p.anomaly) {
    parts.push(t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`, `Finding on this datasheet: ${p.anomaly.en}`));
  }

  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: p.lehvoss ? "LUVOCOM 3F" : FF,
    manufacturer: p.lehvoss ? LV : "FormFutura BV",
    productName: p.name,
    origin: p.lehvoss ? "Deutschland" : "Niederlande",
    specimenType: p.lehvoss ? "moulded" : "undeclared",
    specimenNote: t(parts.map((x) => x.de).join("\n\n"), parts.map((x) => x.en).join("\n\n")),
    ...(p.features ? { features: p.features } : {}),
    /* Das Datenblatt-Objekt fuehrt `version`, der Quellensatz `documentVersion` -
       zwei Namen fuer dasselbe, beide vom Schema so vorgegeben. */
    datasheet: {
      title: `${p.name} — Technical Data Sheet`,
      url,
      ...(version ? { version } : {}),
      retrievedAt: RETRIEVED,
    },
    productUrl: "https://www.formfutura.com/",
    properties: p.props,
    ...(p.ul94 ? {
      compliance: {
        ul94: {
          value: p.ul94.value,
          ...(p.ul94.thicknessMm ? { thicknessMm: p.ul94.thicknessMm } : {}),
          testStandard: "UL 94",
          source: "src_tds",
          confidence: p.ul94.confidence ?? "low",
          note: p.ul94.note,
        },
      },
    } : {}),
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds",
        type: "manufacturer-tds",
        publisher: p.lehvoss ? "Lehvoss Group" : "FormFutura BV",
        productName: p.name,
        title: `${p.name} — Technical Data Sheet`,
        url,
        ...(version ? { documentVersion: version } : {}),
        retrievedAt: RETRIEVED,
        confidenceCeiling: p.lehvoss ? "high" : "medium",
        note: p.lehvoss
          ? t("Herstellerdatenblatt der Lehvoss Group mit Textebene. Prüfnorm UND Prüfkörper deklariert (MPTS ISO 3167 A, spritzgegossen) — im Bestand die Ausnahme.",
              "Manufacturer datasheet from the Lehvoss Group with text layer. Test standard AND specimen declared (MPTS ISO 3167 A, injection-moulded) — the exception in this dataset.")
          : t("Herstellerdatenblatt mit Textebene. Prüfkörper nicht deklariert; Normangaben teils fehlerhaft, siehe Befunde am Datensatz.",
              "Manufacturer datasheet with text layer. Specimen not declared; standards partly erroneous, see findings on the record."),
      }],
    },
  };

  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  if (p.anomaly) na++;
  if (p.ul94) nu++;
  if (p.lehvoss) nm++;
  byMaterial.set(p.material, (byMaterial.get(p.material) ?? 0) + 1);
}

console.log(`${n} FormFutura-Produkte geschrieben (${nm} davon LUVOCOM 3F von Lehvoss).`);
console.log(`  ${na} mit eigenem Befund · ${nu} mit UL94-Angabe · ${nm} mit deklariertem Pruefkoerper (moulded)\n`);
console.log("  Werkstofftyp   Produkte");
for (const [m, c] of [...byMaterial.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${m.padEnd(14)}${String(c).padStart(4)}`);
}
console.log("\n  Nicht importiert:");
console.log("    13 Blaetter ohne Textebene (ABSpro, TitanX, EasyFil ABS/ePLA/HIPS, EasyWood,");
console.log("       Galaxy PLA, High Gloss PLA, PETG CarbonFil, ReFill PETG, ReForm rPET u. a.)");
console.log("    7 Blaetter ohne Werkstofftyp in dieser Datenbank (PEEK x2, PEI x2, PCL x2, BVOH)");
console.log("    2 Blaetter ohne passenden Variantentyp (AthenaX CF10 -> pctg-cf, Kratos PC CF10 -> pc-cf)");
