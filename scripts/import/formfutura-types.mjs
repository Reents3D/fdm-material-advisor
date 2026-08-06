/**
 * `pctg-cf` — der 43. Werkstofftyp, und die Absage an `pc-cf`.
 *
 * DIE FRAGE, DIE SEIT DEM FORMFUTURA-IMPORT OFFEN WAR
 * Zwei Blaetter lagen seit 2026-08-04 ausgewertet im Arbeitsplatz und konnten nicht
 * importiert werden, weil es keinen passenden Werkstofftyp gab: **AthenaX CF10**
 * (PCTG + 10 % Kohlefaser) und **Kratos PC CF10** (PC + 10 % Kohlefaser). Der Importer
 * `formfutura.mjs` haelt beide bis heute mit dem Satz zurueck: "Es gibt weder `pctg-cf`
 * noch `pc-cf`."
 *
 * Beide Blaetter sind am 2026-08-06 gegen ihr jeweiliges UNGEFUELLTES Schwesterblatt
 * gehalten worden - dieselbe Pruefung, die R16 seit dem Alzament-Import automatisch
 * macht. Das Ergebnis faellt fuer die beiden gegensaetzlich aus.
 *
 * ── AthenaX CF10 gegen AthenaX ───────────────────────────────────────────────
 *
 *                       ungefuellt      CF10        Richtung
 *   Dichte              1,23 g/cm³      1,28        steigt   - Fuellstoff wiegt
 *   Zugfestigkeit       44 MPa          70          steigt   - +59 %
 *   Bruchdehnung        220 %           5 %         bricht ein
 *   Schlag gekerbt      93 kJ/m²        4           bricht ein
 *   HDT (0,455 MPa)     76 °C           78          steigt leicht
 *   Vicat               88 °C           89          steigt leicht
 *
 * JEDER Wert bewegt sich in die Richtung, die eine Kohlefaserfuellung erzwingt. Die
 * Bruchdehnung von 220 auf 5 Prozent ist der entscheidende Beleg: Das laesst sich nicht
 * abschreiben, das muss gemessen worden sein. Zusaetzlich stimmt die Eigenwerbung des
 * Blattes ("59 % higher tensile strength") auf den Prozentpunkt mit seinen eigenen
 * Zahlen ueberein - 44 auf 70 sind 59,1 %.
 *
 * ── Kratos PC CF10 gegen Kratos PC ───────────────────────────────────────────
 *
 *                       ungefuellt      CF10        Befund
 *   Dichte              1,20 g/cm³      1,22        leicht hoeher
 *   Zugfestigkeit       630 kg/cm²      76 MPa      = 61,8 gegen 76 MPa
 *   Bruchdehnung        > 100 %         > 100 %     ZIFFERNGLEICH
 *   Biegefestigkeit     920 kg/cm²      920 kg/cm²  ZIFFERNGLEICH
 *   Biege-E-Modul       24.000 kg/cm²   24.000      ZIFFERNGLEICH
 *   Izod gekerbt        70 kgcm/cm      70 kgcm/cm  ZIFFERNGLEICH
 *   HDT / Vicat         139/128/150     140/129/150 je +1 °C
 *
 * Vier von acht Kennwerten sind zifferngleich, und zwar genau die vier, die eine
 * Faserfuellung am staerksten veraendern muesste. Eine Bruchdehnung von ueber 100 % ist
 * bei 10 % Kohlefaser physikalisch ausgeschlossen; ein Biege-E-Modul, das sich durch die
 * Fuellung um kein einziges Prozent bewegt, ebenfalls. Das ist die Tabelle des
 * Grundpolymers mit zwei geaenderten Zeilen.
 *
 * **`pc-cf` wird deshalb NICHT angelegt.** Nicht, weil der Werkstoff uninteressant waere,
 * sondern weil die einzige verfuegbare Quelle ihn nicht belegt. Ein Werkstofftyp, dessen
 * Kennwerte aus dem ungefuellten Nachbarn stammen, waere schlimmer als keiner: Er saehe
 * aus wie Wissen. Das Blatt bleibt im Arbeitsplatz; kommt eine zweite Quelle, ist die
 * Entscheidung in zehn Minuten umgedreht.
 *
 * WAS DIESES BLATT NICHT HERGIBT
 *   Keinen E-Modul.  Weder Zug noch Biegung. Ausgerechnet die Zahl, die eine
 *                    Faserfuellung am deutlichsten zeigt, fehlt - und damit auch die
 *                    Moeglichkeit, R16 auf diesen Typ anzuwenden.
 *   Keine Druckparameter. Die Duesen- und Betttemperatur stammen aus `pctg` und tragen
 *                    `estimated`. Das Blatt nennt nur die Trocknung (75 °C / 24 h).
 *   Keine Bauorientierung. Wie bei den Fiberlogy-Typen stehen die Zugwerte ohne
 *                    Richtungsangabe - "X-Y" waere eine Annahme, die niemand belegt.
 *
 * ZWEI BESCHRIFTUNGSFEHLER DES BLATTES, DOKUMENTIERT STATT GEGLAETTET
 *   1. Beide Schlagzeilen tragen die Norm "ISO 179-1eU" - das ist Charpy UNGEKERBT.
 *      Eine davon ist aber als "Izod Notched" beschriftet. Ein gekerbter Wert kann nicht
 *      nach einer ungekerbten Norm entstehen. Das ungefuellte Schwesterblatt nennt fuer
 *      dieselbe Zeile ISO 180 (Izod). Uebernommen sind beide Zahlen - 4 und 45 kJ/m²,
 *      ein Verhaeltnis von 1:11, das genau zu gekerbt/ungekerbt passt -, die gekerbte
 *      mit ausdruecklichem Vorbehalt zur Norm.
 *   2. Die Vicat-Zeile nennt als Methode "DSC". DSC misst Phasenuebergaenge, keine
 *      Vicat-Erweichung; das ist keine Vicat-Norm. Der Wert steht deshalb OHNE
 *      Pruefnorm - eine anzugeben, die das Blatt nicht nennt, waere eine Erfindung.
 *      Derselbe Fehler steht im ungefuellten Blatt: eine Vorlagenschwaeche bei
 *      FormFutura, kein Einzelfall.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-06";
const DOC = 256481; // AthenaX CF10, Ausgabe 07-10-2024
const URL = `https://www.formfutura.com/web/content/${DOC}?download=true`;

const t = (de, en) => ({ de, en });

/** Datenblattwert. Konfidenz `low`: eine einzige Quelle zeigt keine Streuung. */
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

const s = (value, scale, note) => ({
  value, scale, source: "estimate_reasoning", confidence: "estimated",
  ...(note ? { note } : {}),
});

const est = (value, o = {}) => ({
  value, ...(o.unit ? { unit: o.unit } : {}),
  ...(o.min != null ? { min: o.min, max: o.max } : {}),
  source: "estimate_reasoning", confidence: "estimated",
  ...(o.note ? { note: o.note } : {}),
});

const NO_ORIENTATION = t(
  "Das Blatt nennt keine Bauorientierung. Der Wert steht deshalb ohne Richtungsangabe — als X-Y zu führen wäre eine Annahme, die die Quelle nicht deckt.",
  "The sheet states no build orientation. The value therefore carries no direction — labelling it X-Y would be an assumption the source does not support.");

const FROM_BASE = t(
  "Nicht aus dem Datenblatt: Das AthenaX-CF10-Blatt nennt keine Druckparameter. Übernommen aus dem Grundpolymer PCTG und um den Aufschlag angehoben, den eine Faserfüllung üblicherweise verlangt. Als Schätzung gekennzeichnet.",
  "Not from the datasheet: the AthenaX CF10 sheet states no print settings. Taken from the base polymer PCTG and raised by the increment a fibre filling usually requires. Flagged as an estimate.");

/* ------------------------------------------------------------------ Werkstoff */

const record = {
  $schema: "../../schema/material.schema.json",
  schemaVersion: "1.0.0",
  id: "pctg-cf",
  identity: {
    name: "PCTG-CF",
    family: "PET",
    polymerClass: "amorphous",
    variant: ["CF"],
    filler: { type: "carbon-fibre-chopped" },
    aliases: ["Carbon-PCTG", "PCTG CF", "PCTG + 10 % Kohlefaser", "carbon filled PCTG"],
    abstract: t(
      "PCTG mit 10 % Kohlefaser: 70 MPa Zugfestigkeit gegen 44 MPa beim ungefüllten PCTG — 59 % mehr, und das Datenblatt rechnet diesen Zugewinn selbst vor. Bezahlt wird er mit der Dehnung, und zwar drastisch: von 220 % auf 5 %. PCTG ist der Werkstoff, der sich verbiegt statt zu brechen; die Carbonvariante tut das nicht mehr. Was bleibt, ist die einfache Verarbeitung — das Blatt nennt ausdrücklich offene Drucker ohne Kammer — bei einer Wärmeformbeständigkeit, die mit 78 °C nur zwei Grad über dem Grundpolymer liegt. Wer Steifigkeit sucht, findet hier keine belegte Zahl: Das Blatt nennt keinen E-Modul.",
      "PCTG with 10 % carbon fibre: 70 MPa tensile strength against 44 MPa for unfilled PCTG — 59 % more, and the datasheet works out that gain itself. It is paid for in ductility, and drastically: from 220 % down to 5 %. PCTG is the material that bends instead of breaking; the carbon variant no longer does. What remains is easy processing — the sheet explicitly names open printers without a chamber — at a heat deflection temperature that, at 78 °C, sits just two degrees above the base polymer. Anyone looking for stiffness will find no substantiated figure here: the sheet states no modulus."),
    positioning: t(
      "Festeres PCTG für maßhaltige Gehäuse — ohne Kammer druckbar, aber ohne die Zähigkeit des Grundpolymers.",
      "Stronger PCTG for dimensionally stable housings — printable without a chamber, but without the base polymer's toughness."),
  },
  mechanics: {
    density: q(1.28, "g/cm³", { std: "ASTM D792" }),
    tensileStrengthXy: q(70, "MPa", {
      std: "ISO 527", conditions: "bei Streckgrenze", orientation: "n/a",
      note: t(
        "Der Bruchwert liegt mit 65 MPa darunter — das Blatt nennt beide. Geführt ist die Streckgrenze, weil sie die konstruktiv maßgebliche Zahl ist. Gegenüber dem ungefüllten AthenaX (44 MPa) sind das 59 % mehr; das Blatt rechnet denselben Zugewinn in seiner Produktbeschreibung vor, was die beiden Zahlen gegenseitig stützt.",
        "The break value is lower at 65 MPa — the sheet states both. The yield figure is carried because it is the one that matters structurally. Against unfilled AthenaX (44 MPa) that is 59 % more; the sheet works out the same gain in its own product description, which makes the two figures support each other."),
    }),
    elongationAtBreakXy: q(5, "%", {
      std: "ISO 527", orientation: "n/a",
      note: t(
        "Der stärkste Beleg dafür, dass dieses Blatt wirklich gemessen wurde: Das ungefüllte AthenaX steht bei 220 %. Ein Einbruch um den Faktor 44 ist genau das, was 10 % Kohlefaser anrichten — und es ist nichts, was man aus einer Nachbartabelle abschreiben könnte.",
        "The strongest evidence that this sheet was genuinely measured: unfilled AthenaX sits at 220 %. A collapse by a factor of 44 is exactly what 10 % carbon fibre does — and it is not something that could be copied from a neighbouring table."),
    }),
    charpyUnnotchedXy: q(45, "kJ/m²", {
      std: "ISO 179-1eU", conditions: "ungekerbt, 23 °C", orientation: "n/a",
    }),
    charpyNotchedXy: q(4, "kJ/m²", {
      conditions: "gekerbt, 23 °C", orientation: "n/a",
      note: t(
        "OHNE Prüfnorm, und das ist Absicht. Das Blatt beschriftet diese Zeile als „Izod Notched“, nennt als Norm aber ISO 179-1eU — das ist Charpy UNGEKERBT. Ein gekerbter Wert kann nicht nach einer ungekerbten Norm entstehen; eine der beiden Angaben ist falsch, und welche, sagt das Blatt nicht. Das ungefüllte Schwesterblatt nennt für dieselbe Zeile ISO 180 (Izod). Die Zahl selbst ist plausibel: 4 gegen 45 kJ/m² ungekerbt ist ein Verhältnis von 1:11, wie man es bei einem gefüllten, spröden Werkstoff erwartet.",
        "WITHOUT a test standard, deliberately. The sheet labels this row “Izod Notched” but names ISO 179-1eU as the standard — that is Charpy UNNOTCHED. A notched value cannot arise from an unnotched standard; one of the two statements is wrong, and the sheet does not say which. The unfilled sister sheet names ISO 180 (Izod) for the same row. The figure itself is plausible: 4 against 45 kJ/m² unnotched is a ratio of 1:11, as expected for a filled, brittle material."),
    }),
    toughness: s(2, "toughness", t(
      "Aus 5 % Bruchdehnung und 4 kJ/m² gekerbter Schlagzähigkeit. Das Grundpolymer PCTG steht bei 4 — der Unterschied ist der ganze Punkt dieses Werkstoffs.",
      "From 5 % elongation at break and 4 kJ/m² notched impact strength. The base polymer PCTG sits at 4 — that difference is the whole point of this material.")),
    notchSensitivity: s(4, "notchSensitivity", t(
      "Verhältnis ungekerbt zu gekerbt 45 zu 4, also Faktor 11. Kerben, Bohrungen und scharfe Innenecken kosten hier deutlich mehr als beim ungefüllten PCTG.",
      "Unnotched to notched ratio 45 to 4, a factor of 11. Notches, holes and sharp internal corners cost considerably more here than with unfilled PCTG.")),
  },
  thermal: {
    hdtA: q(68, "°C", { std: "ISO 75", conditions: "1,82 MPa" }),
    hdtB: q(78, "°C", { std: "ISO 75", conditions: "0,455 MPa" }),
    vicatB50: q(89, "°C", {
      note: t(
        "OHNE Prüfnorm: Das Blatt nennt als Methode „DSC“. DSC misst Phasenübergänge, keine Vicat-Erweichung — das ist keine Vicat-Norm. Eine anzugeben, die das Blatt nicht nennt, wäre eine Erfindung. Derselbe Fehler steht im ungefüllten AthenaX-Blatt; es ist eine Vorlagenschwäche bei FormFutura, kein Einzelfall.",
        "WITHOUT a test standard: the sheet names “DSC” as the method. DSC measures phase transitions, not Vicat softening — that is not a Vicat standard. Stating one the sheet does not name would be an invention. The same error appears in the unfilled AthenaX sheet; it is a template weakness at FormFutura, not a one-off."),
    }),
    recommendedMaxServiceTemperature: {
      value: 55, unit: "°C", conditions: "dauerhaft unter mechanischer Last, Luft",
      source: "estimate_reasoning", confidence: "estimated",
      note: t(
        "HDT-A 68 °C abzüglich Sicherheitsabstand. Die Kohlefaser hebt die Festigkeit, nicht die Erweichungsgrenze des Grundpolymers — 55 °C gegen 50 °C beim ungefüllten PCTG ist der ganze Zugewinn.",
        "HDT-A 68 °C less a safety margin. The carbon fibre raises strength, not the softening limit of the base polymer — 55 °C against 50 °C for unfilled PCTG is the entire gain."),
    },
  },
  processing: {
    nozzleTemperature: est(260, { unit: "°C", min: 250, max: 275, note: FROM_BASE }),
    bedTemperature: est(100, { unit: "°C", min: 90, max: 110, note: FROM_BASE }),
    dryingTemperature: q(75, "°C", {
      note: t("Aus dem Blatt: „pre-dry the filament at 75 °C for approximately 24 hours“.",
              "From the sheet: “pre-dry the filament at 75 °C for approximately 24 hours”."),
    }),
    dryingTime: q(24, "h"),
    chamberRequirement: {
      value: "not-required", source: "src_tds", confidence: "low",
      note: t(
        "Ausdrücklich im Blatt: „very easy to 3D print on open desktop machines. No enclosure, or heated chamber needed.“ Das ist für einen faserverstärkten Technikwerkstoff ungewöhnlich und der praktische Hauptvorteil dieses Typs.",
        "Explicitly in the sheet: “very easy to 3D print on open desktop machines. No enclosure, or heated chamber needed.” That is unusual for a fibre-reinforced engineering material and is this type's main practical advantage."),
    },
    hardenedNozzleRequired: {
      value: true, source: "src_tds", confidence: "low",
      note: t(
        "Aus dem Blatt: „We recommend to use ruby nozzles or hardened steel nozzles.“ Anders als bei den Fiberlogy-Typen muss diese Anforderung hier nicht aus dem Füllstoff abgeleitet werden — sie steht da.",
        "From the sheet: “We recommend to use ruby nozzles or hardened steel nozzles.” Unlike the Fiberlogy types this requirement does not have to be inferred from the filler here — it is stated."),
    },
    printability: s(3, "printability", t(
      "Das Grundpolymer steht bei 4. Abgezogen wird für die gehärtete Düse und die Trocknungspflicht, nicht für Verzug — den nennt das Blatt ausdrücklich als gering, und ohne Kammer zu drucken ist bei faserverstärkten Werkstoffen die Ausnahme.",
      "The base polymer sits at 4. Deducted for the hardened nozzle and the mandatory drying, not for warping — the sheet explicitly calls that low, and printing without a chamber is the exception among fibre-reinforced materials.")),
    warpingTendency: s(2, "warpingTendency", t(
      "Wie beim Grundpolymer. Das Blatt nennt „low shrinkage factor“, und eine Faserfüllung senkt den Verzug zusätzlich.",
      "As for the base polymer. The sheet names a “low shrinkage factor”, and a fibre filling reduces warping further.")),
    hygroscopy: s(3, "hygroscopy"),
    abrasiveness: s(4, "abrasiveness"),
  },
  durability: {
    uvResistance: s(3, "uvResistance"),
    weatherResistance: s(3, "weatherResistance"),
  },
  compliance: {
    foodContact: {
      status: { value: "not-declared", source: "estimate_reasoning", confidence: "estimated" },
      partLevelWarning: t(
        "Auch bei einem lebensmittelkonformen Material ist das FDM-BAUTEIL nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Kapillaren und Keimnischen.",
        "Even with a food-compliant material the FDM PART is not automatically food safe: the layer structure forms capillaries and bacterial niches."),
    },
    flameRetardancy: {
      ul94: { value: "not-classified", source: "estimate_reasoning", confidence: "estimated" },
    },
    printEmissions: {
      concernLevel: { value: "low", source: "estimate_reasoning", confidence: "estimated" },
    },
  },
  sustainability: {
    bioBasedContent: { value: 0, unit: "%", source: "estimate_reasoning", confidence: "estimated" },
    industriallyCompostable: { value: false, source: "estimate_reasoning", confidence: "estimated" },
    practicalRecyclability: { value: "possible-in-theory", source: "estimate_reasoning", confidence: "estimated" },
  },
  finishing: {
    surfaceQuality: s(3, "surfaceQuality"),
    layerLineVisibility: s(2, "layerLineVisibility", t(
      "Kohlefaser mattiert und kaschiert Schichtlinien — der eine optische Vorteil gegenüber dem glänzenden Grundpolymer.",
      "Carbon fibre matts the surface and masks layer lines — the one optical advantage over the glossy base polymer.")),
    sandability: s(3, "sandability"),
    fillability: s(3, "fillability"),
    paintAdhesion: s(4, "paintAdhesion"),
    bondability: s(3, "bondability"),
    gloss: { value: "matte", source: "estimate_reasoning", confidence: "estimated" },
    colourAvailability: { value: "narrow", source: "estimate_reasoning", confidence: "estimated" },
  },
  commercial: {
    priceIndex: s(3, "priceIndex"),
    availability: s(2, "availability"),
    smallSeriesSuitability: s(3, "smallSeriesSuitability"),
    xxl: {
      maxSensibleEdgeMm: est(1200, {
        unit: "mm", min: 800, max: 1600,
        note: t(
          "Geschätzt aus Kammerbedarf, Verzugsneigung und Schichthaftung — nicht durch eigene Fertigung belegt. Keine Fertigungsgrenze, sondern die Kantenlänge, ab der es aufwendig wird. Höher als bei den meisten faserverstärkten Typen, weil dieser ohne Kammer auskommt.",
          "Estimated from chamber requirement, warping tendency and layer adhesion — not backed by our own production. Not a manufacturing limit but the edge length from which it becomes demanding. Higher than for most fibre-reinforced types because this one needs no chamber."),
      }),
      segmentationRecommended: { value: true, source: "estimate_reasoning", confidence: "estimated" },
    },
    reentsPortfolioStatus: {
      value: "unknown", source: "estimate_reasoning", confidence: "estimated",
      note: t("Fließt unter keinen Umständen in Filterung oder Bewertung ein (ADR-004).",
              "Never enters filtering or scoring under any circumstances (ADR-004)."),
    },
  },
  governance: {
    lastReviewed: RETRIEVED,
    reviewedBy: "Claude Code (Erstanlage aus Herstellerdatenblatt)",
    openQuestions: [
      {
        id: "oq_pctg_cf_single_source",
        question: t(
          "Zweite unabhängige Quelle für diesen Werkstofftyp finden. Alle Kennwerte stammen aus einem einzigen FormFutura-Blatt; eine einzelne Quelle zeigt keine Streuung. Das Blatt selbst ist gegen sein ungefülltes Schwesterblatt geprüft und besteht die Probe — jeder Wert bewegt sich in die von einer Faserfüllung erzwungene Richtung —, aber das ersetzt keinen zweiten Hersteller.",
          "Find a second independent source for this material type. All values come from a single FormFutura sheet; one source shows no scatter. The sheet itself was checked against its unfilled sister sheet and passes — every value moves in the direction a fibre filling forces — but that does not replace a second manufacturer."),
        blocking: false,
        affectsFields: ["mechanics", "thermal"],
      },
      {
        id: "oq_pctg_cf_modulus",
        question: t(
          "E-Modul beschaffen — weder Zug noch Biegung steht auf dem Blatt. Das ist ausgerechnet die Zahl, die eine Faserfüllung am deutlichsten zeigt: Beim glasgefüllten Schwestertyp `pctg-gf` steigt sie von 1.650 auf 3.400 MPa. Ohne sie fehlt dem Typ die Steifigkeitsangabe, er kann in der Kompromissanalyse nicht auf Steifigkeit verglichen werden, und die Plausibilitätsregel R16 (Füllstoff muss den Modul heben) läuft für ihn ins Leere.",
          "Obtain a modulus — neither tensile nor flexural appears on the sheet. That is precisely the figure a fibre filling shows most clearly: for the glass-filled sister type `pctg-gf` it rises from 1,650 to 3,400 MPa. Without it the type carries no stiffness figure, it cannot be compared on stiffness in the trade-off analysis, and plausibility rule R16 (filler must raise the modulus) has nothing to check."),
        blocking: false,
        affectsFields: ["mechanics.tensileModulusXy", "mechanics.flexuralModulusXy"],
      },
    ],
    sources: [
      {
        id: "src_tds", type: "manufacturer-tds", publisher: "FormFutura BV",
        title: "FormFutura AthenaX CF10 — Technical Data Sheet",
        documentVersion: "07-10-2024",
        url: URL, retrievedAt: "2026-08-04", confidenceCeiling: "low",
        note: t(
          "Einziges Datenblatt für diesen Werkstofftyp. Keine Bauorientierung, kein E-Modul, keine Druckparameter. Zwei Beschriftungsfehler stehen an den betroffenen Werten.",
          "Only datasheet for this material type. No build orientation, no modulus, no print settings. Two labelling errors are documented at the affected values."),
      },
      {
        id: "estimate_reasoning", type: "estimate", publisher: "Reents Technologies GmbH",
        title: "Fachliche Ableitung ohne Primärquelle",
        retrievedAt: RETRIEVED, confidenceCeiling: "estimated",
        note: t(
          "Skalenwerte, konservative Dauergebrauchstemperatur und die Druckparameter, die das Blatt nicht nennt. Ausdrücklich als Schätzung gekennzeichnet.",
          "Scale values, the conservative continuous service temperature and the print settings the sheet does not state. Explicitly flagged as estimates."),
      },
    ],
  },
};

const out = path.join(ROOT, "data/materials");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "pctg-cf.json"), `${JSON.stringify(record, null, 2)}\n`);

const facts = JSON.stringify(record).match(/"confidence":/g)?.length ?? 0;
console.log("Werkstofftyp `pctg-cf` aus FormFutura AthenaX CF10 angelegt.");
console.log(`  ${facts} belegte Aussagen · 8 davon aus dem Datenblatt, der Rest Skalen und Ableitungen`);
console.log("  Zugfestigkeit 70 MPa (+59 % gegen PCTG) · Bruchdehnung 5 % (gegen 220 %)");
console.log("  Ohne Kammer druckbar — das nennt das Blatt ausdrücklich, und bei einem");
console.log("  faserverstaerkten Werkstoff ist es der praktische Hauptvorteil.");
console.log();
console.log("`pc-cf` wurde NICHT angelegt. Das einzige Blatt (Kratos PC CF10) traegt vier von");
console.log("acht Kennwerten zifferngleich mit dem ungefuellten Kratos PC - darunter eine");
console.log("Bruchdehnung von ueber 100 %, die bei 10 % Kohlefaser ausgeschlossen ist, und");
console.log("einen Biege-E-Modul, den die Fuellung um kein Prozent bewegt haben soll.");
console.log("Begruendung im Kopf dieser Datei.");
