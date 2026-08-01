/**
 * Werkstofftyp PA6 (unverstärkt).
 *
 * WARUM ER FEHLTE UND WARUM ER JETZT DA IST
 * Die Datenbank führte PA6-CF und PA6-GF, aber nicht den Grundtyp. Damit liess sich die
 * naheliegendste Frage nicht beantworten: Was bringt die Faser eigentlich? Und ein
 * unverstärktes Polyamid ohne Zuordnung konnte gar nicht aufgenommen werden.
 *
 * WOHER DIE WERTE STAMMEN — UND WOHER NICHT
 * Es gibt zu diesem Typ kein einzelnes Datenblatt. Die Kennwerte sind deshalb ganz
 * überwiegend als `estimated` gekennzeichnet und stützen sich auf zwei Dinge: die
 * beiden gefüllten PA6-Typen im Bestand (gleiche Matrix, bekannter Fasereinfluss) und
 * das allgemeine Werkstoffwissen zu PA6. Wo ein Datenblatt einen Wert hergibt, steht er
 * mit seiner Quelle da.
 *
 * DAS EIGENTLICHE THEMA BEI PA6 IST WASSER
 * Kein anderer gängiger FDM-Werkstoff verändert sein Verhalten durch Feuchte so stark.
 * Trocken ist PA6 steif und fest, konditioniert wird es zäh und weich — die
 * Glasübergangstemperatur fällt von rund 60 °C auf unter Raumtemperatur. Ein Kennwert
 * ohne Angabe des Feuchtezustands ist bei PA6 deshalb kaum verwertbar. Das steht an
 * jedem betroffenen Wert und nicht nur im Fliesstext.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REVIEWED = "2026-08-02";

const t = (de, en) => ({ de, en });
const EST = "estimate_reasoning";

const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.orientation ? { orientation: o.orientation } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: o.source ?? EST, confidence: o.confidence ?? "estimated",
  ...(o.note ? { note: o.note } : {}),
});
const r = (value, scale, o = {}) => ({
  value, scale, source: o.source ?? EST, confidence: o.confidence ?? "estimated",
  ...(o.note ? { note: o.note } : {}),
});
const c = (value, o = {}) => ({
  value, source: o.source ?? EST, confidence: o.confidence ?? "estimated",
  ...(o.note ? { note: o.note } : {}),
});

const MOISTURE = t(
  "Gilt für den trockenen Zustand. PA6 nimmt bis zu 3 % Wasser auf; konditioniert fällt die Steifigkeit deutlich, die Zähigkeit steigt, und die Glasübergangstemperatur rutscht unter Raumtemperatur. Ein Bauteil, das im Betrieb Feuchte zieht, verhält sich anders als der Prüfkörper.",
  "Applies to the dry state. PA6 takes up to 3 % water; conditioned, stiffness drops markedly, toughness rises, and the glass transition slides below room temperature. A part that picks up moisture in service behaves differently from the specimen.");

const material = {
  $schema: "../../schema/material.schema.json",
  schemaVersion: "1.0.0",
  id: "pa6",
  identity: {
    name: "PA6",
    family: "PA",
    polymerClass: "semi-crystalline",
    variant: ["basic"],
    aliases: ["Polyamid 6", "Nylon 6", "PA 6"],
    abstract: t(
      "PA6 unverstärkt ist der zähe, verschleissfeste Grundtyp der Polyamidreihe: hohe Schlagzähigkeit, gute Gleiteigenschaften und Beständigkeit gegen Öle, Fette und Kraftstoffe. Der Preis dafür ist Wasser — PA6 nimmt bis zu 3 % auf und verändert dabei Steifigkeit, Mass und Glasübergangstemperatur. Im Druck heisst das: trocknen, trocken halten, beheizte Kammer.",
      "Unfilled PA6 is the tough, wear-resistant base grade of the polyamide range: high impact strength, good sliding properties and resistance to oils, greases and fuels. The price is water — PA6 takes up to 3 % and changes stiffness, dimensions and glass transition in the process. In printing that means: dry it, keep it dry, heated chamber."),
    positioning: t(
      "Der zähe Grundtyp — wenn das Bauteil einstecken muss statt steif zu sein.",
      "The tough base grade — when the part has to take a hit rather than stay stiff."),
    notToBeConfusedWith: [
      { materialId: "pa6-cf", reason: t(
        "PA6-CF ist derselbe Grundwerkstoff mit rund 20 % Carbonfaser. Die Faser vervierfacht die Steifigkeit und hebt die Wärmeformbeständigkeit massiv — sie kostet aber genau das, wofür man unverstärktes PA6 nimmt: die Zähigkeit. Wer ein Bauteil braucht, das nachgibt statt zu brechen, ist beim unverstärkten Typ richtig.",
        "PA6-CF is the same base material with about 20 % carbon fibre. The fibre quadruples stiffness and lifts heat resistance massively — but it costs exactly what unfilled PA6 is chosen for: toughness. Anyone needing a part that yields rather than breaks belongs with the unfilled grade.") },
      { materialId: "pa12", reason: t(
        "PA12 nimmt deutlich weniger Wasser auf (rund 1 % gegen 3 %) und ist damit masshaltiger und im Druck gutmütiger. PA6 ist dafür fester, steifer und wärmeformbeständiger. Die Wahl zwischen beiden ist fast immer eine Feuchtefrage, keine Festigkeitsfrage.",
        "PA12 takes up considerably less water (around 1 % against 3 %) and is therefore more dimensionally stable and better behaved in printing. PA6 in return is stronger, stiffer and more heat resistant. The choice between them is almost always a moisture question, not a strength question.") },
    ],
  },

  mechanics: {
    density: q(1.13, "g/cm³", { note: t(
      "Standardwert für unverstärktes PA6. Gefülltes PA6 liegt darunter (PA6-CF 1,09) oder darüber (PA6-GF 1,21).",
      "Standard value for unfilled PA6. Filled PA6 sits below (PA6-CF 1.09) or above (PA6-GF 1.21).") }),
    tensileStrengthXy: q(55, "MPa", { min: 45, max: 70, orientation: "XY", note: MOISTURE }),
    tensileModulusXy: q(1900, "MPa", { min: 1500, max: 2400, orientation: "XY", note: MOISTURE }),
    elongationAtBreakXy: q(20, "%", { min: 10, max: 40, orientation: "XY", note: MOISTURE }),
    toughness: r(4, "toughness", { note: t(
      "Die Stärke dieses Werkstoffs. Unverstärktes PA6 bricht nicht spröde, es gibt nach — der Grund, warum es bei Zahnrädern, Klemmen und Schnapphaken steht.",
      "The strength of this material. Unfilled PA6 does not break brittle, it yields — the reason it is used for gears, clamps and snap hooks.") }),
    notchSensitivity: r(2, "notchSensitivity"),
    creepTendency: r(3, "creepTendency"),
    wearResistance: r(4, "wearResistance", { note: t(
      "Gute Gleit- und Verschleisseigenschaften auch ohne Schmierung — der klassische Einsatz für Lagerbuchsen und Zahnräder.",
      "Good sliding and wear properties even without lubrication — the classic use for bearing bushes and gears.") }),
  },

  thermal: {
    hdtA: q(60, "°C", { min: 50, max: 75, std: "ISO 75, 1,8 MPa", note: t(
      "Der grosse Abstand zwischen HDT-A und HDT-B ist bei teilkristallinen Polyamiden typisch und keine Datenblattschwäche: Unter kleiner Last trägt die Kristallphase weit über den Glasübergang hinaus, unter grosser Last nicht.",
      "The large gap between HDT-A and HDT-B is typical of semi-crystalline polyamides and no datasheet weakness: under low load the crystalline phase carries far beyond the glass transition, under high load it does not.") }),
    hdtB: q(160, "°C", { min: 140, max: 180, std: "ISO 75, 0,45 MPa" }),
    glassTransition: q(60, "°C", { conditions: "trocken", note: MOISTURE }),
    meltingTemperature: q(220, "°C", { min: 215, max: 225 }),
    recommendedMaxServiceTemperature: q(80, "°C", { min: 70, max: 90, note: t(
      "Konservativ angesetzt und bewusst nicht an der HDT-B orientiert. Oberhalb des Glasübergangs kriecht das Material unter Dauerlast.",
      "Set conservatively and deliberately not oriented on HDT-B. Above the glass transition the material creeps under sustained load.") }),
  },

  processing: {
    nozzleTemperature: q(260, "°C", { min: 240, max: 280 }),
    bedTemperature: q(75, "°C", { min: 60, max: 90 }),
    chamberRequirement: c("recommended", { note: t(
      "Ohne beheizte Kammer sind grössere Bauteile durch Verzug kaum beherrschbar. Für kleine Teile geht es, für XXL nicht.",
      "Without a heated chamber, larger parts are barely controllable due to warping. For small parts it works, for XXL it does not.") }),
    dryingTemperature: q(80, "°C", { min: 70, max: 90 }),
    dryingTime: q(10, "h", { min: 6, max: 16 }),
    printability: r(2, "printability"),
    warpingTendency: r(4, "warpingTendency"),
    hygroscopy: r(5, "hygroscopy", { note: t(
      "Der höchste Wert der Skala, und er ist verdient: Eine offene Rolle PA6 zieht binnen Stunden so viel Feuchte, dass der Druck sichtbar schäumt und die Schichthaftung einbricht.",
      "The highest value on the scale, and it is deserved: an open spool of PA6 pulls enough moisture within hours that the print visibly foams and layer adhesion collapses.") }),
    abrasiveness: r(1, "abrasiveness", { note: t(
      "Unverstärkt ist PA6 nicht abrasiv — eine Messingdüse reicht. Das gilt für die gefüllten Varianten ausdrücklich NICHT.",
      "Unfilled, PA6 is not abrasive — a brass nozzle suffices. That expressly does NOT hold for the filled variants.") }),
  },

  durability: {
    uvResistance: r(2, "uvResistance"),
    weatherResistance: r(2, "weatherResistance"),
    hydrolysisResistance: r(2, "hydrolysisResistance"),
    waterAbsorption: q(2.7, "%", { min: 2, max: 3.5, std: "ISO 62, Sättigung", note: MOISTURE }),
  },

  compliance: {
    foodContact: {
      status: c("not-declared"),
      partLevelWarning: t(
        "Auch bei einem lebensmittelkonformen Material ist das FDM-Bauteil nicht automatisch lebensmittelkonform: die Schichtstruktur bildet Spalten, in denen sich Keime halten.",
        "Even with a food-contact compliant material the FDM PART is not automatically compliant: the layer structure forms crevices in which germs survive."),
    },
  },

  finishing: {
    surfaceQuality: r(3, "surfaceQuality"),
    paintAdhesion: r(2, "paintAdhesion", { note: t(
      "Polyamide sind unpolar und schlecht benetzbar — ohne Haftvermittler oder Vorbehandlung hält kein Lack dauerhaft.",
      "Polyamides are non-polar and poorly wettable — without a bonding agent or pre-treatment no paint holds permanently.") }),
    sandability: r(3, "sandability"),
    bondability: r(2, "bondability"),
  },

  commercial: {
    priceIndex: r(4, "priceIndex"),
    availability: r(3, "availability"),
    smallSeriesSuitability: r(3, "smallSeriesSuitability"),
    xxl: {
      maxSensibleEdgeMm: q(400, "mm", { min: 200, max: 700, note: t(
        "Geschätzt aus Verzugsneigung und Kammerbedarf, nicht durch eigene Fertigung belegt.",
        "Estimated from warping tendency and chamber requirement, not backed by own production.") }),
    },
    reentsPortfolioStatus: c("unknown"),
  },

  governance: {
    lastReviewed: REVIEWED,
    reviewedBy: "Claude Code (Typprofil aus Ableitung) - fachliche Freigabe ausstehend",
    reviewCycleMonths: 12,
    dataCompleteness: null,
    sources: [{
      id: "estimate_reasoning",
      type: "estimate",
      publisher: "FDM-Materialberater",
      title: "Fachliche Ableitung ohne Primärquelle",
      confidenceCeiling: "estimated",
      note: t(
        "Zu diesem Typ liegt kein einzelnes Datenblatt vor. Die Werte stützen sich auf die beiden gefüllten PA6-Typen im Bestand (gleiche Matrix, bekannter Fasereinfluss) und auf allgemeines Werkstoffwissen zu PA6. Sie sind Richtwerte für die Vorauswahl und ersetzen kein Herstellerdatenblatt.",
        "No single datasheet exists for this type. The values rest on the two filled PA6 types in the dataset (same matrix, known fibre effect) and on general PA6 material knowledge. They are guide values for pre-selection and do not replace a manufacturer datasheet."),
    }],
    openQuestions: [{
      id: "oq_pa6_primary_source",
      question: t(
        "Ein Herstellerdatenblatt für unverstärktes PA6 mit deklarierten gedruckten Prüfkörpern würde dieses Typprofil von Schätzung auf Beleg heben. Welcher Hersteller im Portfolio führt eins?",
        "A manufacturer datasheet for unfilled PA6 with declared printed specimens would lift this type profile from estimate to evidence. Which manufacturer in the portfolio has one?"),
      blocking: false,
      affectsFields: ["mechanics.tensileStrengthXy", "mechanics.tensileModulusXy", "thermal.hdtB"],
    }],
  },
};

writeFileSync(path.join(ROOT, "data/materials/pa6.json"), `${JSON.stringify(material, null, 2)}\n`);
console.log("Werkstofftyp pa6 geschrieben (Profil ueberwiegend als 'estimated' gekennzeichnet)");
