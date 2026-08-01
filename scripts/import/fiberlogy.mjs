/**
 * Import: Fiberlogy (Fiberlab S.A., Brzezie, Polen).
 *
 * DIE WICHTIGSTE ZEILE STEHT IM KLEINGEDRUCKTEN
 * Jedes Fiberlogy-Datenblatt schliesst mit dem Satz: "The information set forth herein
 * has been gathered from standard reference materials and/or supplier test data."
 * Fiberlogy sagt damit offen, dass die Werte NICHT aus eigener Messung stammen, sondern
 * aus Referenzwerken und von den Rohstofflieferanten. Das ist ehrlicher als das
 * Schweigen der meisten Blaetter — und es heisst zugleich, dass keine dieser Zahlen an
 * einem gedruckten Bauteil entstanden ist. specimenType bleibt "undeclared", das Ceiling
 * steht auf "low", und der Satz steht an jedem Produkt.
 *
 * ZWEI GENERATIONEN
 * Vier Blaetter (ABS ESD, ABS GF, ASA+AF, Velvet PLA) tragen eine Textebene und lassen
 * sich maschinell auslesen. Sechs sind reine Bild-PDF; ihre Werte wurden von der
 * gerenderten Seite abgelesen. Siehe data/_sources/fiberlogy-tds/LIESMICH.txt.
 *
 * ZU DEN ADRESSEN
 * Sie enthalten einen Hash. Geprueft: Der Hash bestimmt die Datei, der Dateiname ist
 * folgenlos — dieselbe Hash-Adresse mit anderem Dateinamen liefert byteweise dieselbe
 * PDF. Adressen lassen sich deshalb nicht konstruieren.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RETRIEVED = "2026-08-02";
const BASE = "https://fiberlogy.com/en_US/p/file";

const t = (de, en) => ({ de, en });
const q = (value, unit, o = {}) => ({
  value, unit,
  ...(o.min != null ? { min: o.min } : {}),
  ...(o.max != null ? { max: o.max } : {}),
  ...(o.std ? { testStandard: o.std } : {}),
  ...(o.conditions ? { conditions: o.conditions } : {}),
  source: "src_tds", confidence: o.confidence ?? "low",
  ...(o.note ? { note: o.note } : {}),
});

const SPECIMEN_NOTE = t(
  "Fiberlogy schreibt in jedes Datenblatt: „The information set forth herein has been gathered from standard reference materials and/or supplier test data.“ Der Hersteller sagt damit ausdrücklich, dass die Werte aus Referenzwerken und von den Rohstofflieferanten stammen und nicht aus eigener Messung. Das ist offener als das Schweigen der meisten Blätter — und es heisst zugleich, dass keine dieser Zahlen an einem gedruckten Bauteil entstanden ist. Für einen Vergleich mit den gedruckten Werten von Ultrafuse, Bambu Lab oder Prusa Polymers sind sie deshalb nicht geeignet.",
  "Fiberlogy writes in every datasheet: “The information set forth herein has been gathered from standard reference materials and/or supplier test data.” The manufacturer thereby says explicitly that the values come from reference works and from the raw-material suppliers, not from its own measurement. That is more open than the silence of most sheets — and it also means none of these figures arose on a printed part. They are therefore not suitable for comparison with the printed values from Ultrafuse, Bambu Lab or Prusa Polymers.");

const IMAGE_ONLY = t(
  "Dieses Blatt ist eine reine Bild-PDF ohne Textebene; die Werte wurden von der gerenderten Seite abgelesen statt maschinell extrahiert.",
  "This sheet is a pure image PDF without a text layer; the values were read off the rendered page rather than extracted mechanically.");

const P = [
  /* ---- mit Textebene ----------------------------------------------------- */

  { id: "fiberlogy-abs-esd", material: "esd-abs", name: "Fiberlogy ESD ABS",
    file: "ea13014b3a227261b6b5018c7c851a39/FIBERLOGY_ABS_ESD_TDS.pdf", text: true,
    props: {
      density: q(1.05, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(55, "MPa", { std: "ISO 527", conditions: "Bruchspannung" }),
      tensileModulusXy: q(2100, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(5, "%", { std: "ISO 527" }),
      izodNotchedXy: q(5, "kJ/m²", { std: "ISO 180, 23 °C" }),
      nozzleTemperature: q(258, "°C", { min: 250, max: 265 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    features: t("Eines der wenigen Blätter, das die ESD-Werte differenziert angibt: Oberflächenwiderstand 3,8·10⁷ bis 8,1·10⁷ Ω, Durchgangswiderstand 4,1·10⁷ Ω·cm. Beide liegen im dissipativen Bereich — das Material leitet nicht, es baut Ladung kontrolliert ab.",
                "One of few sheets giving the ESD figures in detail: surface resistivity 3.8·10⁷ to 8.1·10⁷ Ω, volume resistivity 4.1·10⁷ Ω·cm. Both sit in the dissipative range — the material does not conduct, it dissipates charge in a controlled way.") },

  { id: "fiberlogy-abs-gf", material: "abs", name: "Fiberlogy ABS GF",
    file: "ad67f01787e264250db273bd8a43e839/FIBERLOGY_ABSGF_TDS.pdf", text: true,
    props: {
      density: q(1.12, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(50, "MPa", { std: "ISO 527", conditions: "Bruchspannung" }),
      tensileModulusXy: q(3500, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(3.5, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(70, "MPa", { std: "ISO 178" }),
      charpyNotchedXy: q(10, "kJ/m²", { std: "ISO 179, 23 °C" }),
      charpyUnnotchedXy: q(30, "kJ/m²", { std: "ISO 179, 23 °C" }),
      hdtA: q(80, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(90, "°C", { std: "ISO 75, 0,45 MPa" }),
      vicatB50: q(95, "°C", { std: "ISO 306" }),
      nozzleTemperature: q(282, "°C", { min: 270, max: 295 }),
      bedTemperature: q(90, "°C"),
    },
    features: t("Glasfaser statt Carbon: Die Steifigkeit steigt gegenüber unverstärktem ABS deutlich (3500 statt rund 2300 MPa), die Bruchdehnung fällt auf 3,5 %. Die Düsentemperatur von bis zu 295 °C ist bemerkenswert hoch für ABS — Glasfaser braucht Wärme, um sich benetzen zu lassen.",
                "Glass fibre instead of carbon: stiffness rises markedly against unfilled ABS (3500 instead of around 2300 MPa), elongation falls to 3.5 %. The nozzle temperature of up to 295 °C is notably high for ABS — glass fibre needs heat to be wetted.") },

  { id: "fiberlogy-asa-af", material: "asa", name: "Fiberlogy ASA+AF",
    file: "8155c1da1791d89e2516617d17591044/FIBERLOGY_ASA-AF_TDS.pdf", text: true,
    props: {
      density: q(1.07, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(40, "MPa", { std: "ISO 527", conditions: "Streckspannung; Bruchspannung 35 MPa" }),
      tensileModulusXy: q(2200, "MPa", { std: "ISO 527" }),
      elongationAtYieldXy: q(2.8, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(6, "%", { std: "ISO 527" }),
      charpyNotchedXy: q(7.5, "kJ/m²", { std: "ISO 179" }),
      charpyUnnotchedXy: q(25, "kJ/m²", { std: "ISO 179" }),
      nozzleTemperature: q(268, "°C", { min: 255, max: 280 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    anomaly: t("Wofür „AF“ steht, sagt das Blatt nicht. Die Dichte von 1,07 g/cm³ liegt im Bereich von normalem ASA — für einen aufschäumenden Typ (wie ASA Aero mit 0,99) ist sie zu hoch, und eine Brandschutzklasse nennt das Blatt auch nicht. Das Produkt ist deshalb dem Grundtyp ASA zugeordnet.",
               "What “AF” stands for the sheet does not say. The density of 1.07 g/cm³ sits in the range of normal ASA — too high for a foaming grade (like ASA Aero at 0.99), and the sheet names no flame class either. The product is therefore assigned to the base ASA type.") },

  { id: "fiberlogy-velvet-pla", material: "pla", name: "Fiberlogy Velvet PLA",
    file: "d9a18c051bddd4400aa9f2b27e8ed5eb/FIBERLOGY_VELVET-PLA_TDS.pdf", text: true,
    props: {
      density: q(1.27, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(56, "MPa", { std: "ISO 527", conditions: "Streckspannung; Bruchspannung 28 MPa" }),
      tensileModulusXy: q(3100, "MPa", { std: "ISO 527" }),
      elongationAtYieldXy: q(3, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(5, "%", { std: "ISO 527" }),
      charpyUnnotchedXy: q(17, "kJ/m²", { std: "ISO 179, 23 °C" }),
      hdtB: q(53, "°C", { std: "ISO 75, 0,45 MPa" }),
      vicatB50: q(63, "°C", { std: "ISO 306" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
      bedTemperature: q(60, "°C", { min: 50, max: 70 }),
    },
    features: t("Die Dichte von 1,27 g/cm³ gegenüber 1,24 beim Easy PLA desselben Hauses zeigt die Füllung, die den samtigen Effekt macht. Bemerkenswert ist der Abstand zwischen Streck- und Bruchspannung: 56 gegen 28 MPa — das Material fliesst deutlich, bevor es reisst.",
                "The density of 1.27 g/cm³ against 1.24 for this house's Easy PLA shows the filler that creates the velvet effect. Notable is the gap between yield and break stress: 56 against 28 MPa — the material yields markedly before it tears.") },

  /* ---- Bild-PDF, Werte von der gerenderten Seite abgelesen ---------------- */

  { id: "fiberlogy-easy-pla", material: "pla", name: "Fiberlogy Easy PLA",
    file: "c612c2bddb7a71aa950b9a3d64fad640/FIBERLOGY_EASYPLA_TDS.pdf",
    props: {
      density: q(1.24, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(60, "MPa", { std: "ASTM D882 (siehe Befund)", conditions: "Streckspannung; Bruchspannung 53 MPa" }),
      tensileModulusXy: q(3500, "MPa", { std: "ASTM D882 (siehe Befund)" }),
      elongationAtYieldXy: q(6, "%", { std: "ASTM D882 (siehe Befund)" }),
      flexuralStrengthXy: q(81, "MPa", { std: "ASTM D790" }),
      flexuralModulusXy: q(3800, "MPa", { std: "ASTM D790" }),
      izodNotchedXy: q(16, "J/m", { std: "ASTM D256, 23 °C" }),
      hdtB: q(55, "°C", { std: "im Blatt als ASTM E2092 angegeben (siehe Befund)" }),
      glassTransition: q(57.5, "°C", { min: 55, max: 60, std: "ASTM D3418" }),
      meltingTemperature: q(152.5, "°C", { min: 145, max: 160, std: "ASTM D3418" }),
      nozzleTemperature: q(215, "°C", { min: 200, max: 230 }),
      bedTemperature: q(60, "°C", { min: 50, max: 70 }),
    },
    anomaly: t("Zwei Prüfnormen passen nicht zur Eigenschaft. Die Zugwerte stehen unter ASTM D882 — das ist die Norm für dünne FOLIEN, nicht für Formteile; für Zug an Kunststoffprüfkörpern wäre D638 einschlägig. Und die Wärmeformbeständigkeit steht unter ASTM E2092, einer thermomechanischen Analyse; die HDT ist ASTM D648. Dieselbe Folien-Verwechslung steht auch im PLA-Blatt von Material4Print — offenbar reist sie mit dem Rohstoffdatenblatt durch die Branche.",
               "Two test standards do not fit the property. The tensile values sit under ASTM D882 — the standard for thin FILMS, not for mouldings; for tensile on plastic specimens D638 would apply. And heat deflection sits under ASTM E2092, a thermomechanical analysis; HDT is ASTM D648. The same film mix-up appears in the PLA sheet from Material4Print — apparently it travels with the raw-material datasheet through the industry.") },

  { id: "fiberlogy-easy-petg", material: "petg", name: "Fiberlogy Easy PET-G",
    file: "382d10e153b41349d577adb3c47b11fd/FIBERLOGY_EASYPETG_TDS.pdf",
    props: {
      density: q(1.29, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(51, "MPa", { std: "ISO 527", conditions: "Streckspannung" }),
      tensileModulusXy: q(2800, "MPa", { std: "ISO 527" }),
      elongationAtYieldXy: q(4, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(29, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(70, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(2000, "MPa", { std: "ISO 178" }),
      izodNotchedXy: q(5, "kJ/m²", { std: "ISO 180, 23 °C" }),
      hdtA: q(62, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(68, "°C", { std: "ISO 75, 0,45 MPa" }),
      vicatB50: q(78, "°C", { std: "ISO 306" }),
      glassTransition: q(80, "°C", { std: "ASTM D3418" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }),
      bedTemperature: q(90, "°C"),
    },
    features: t("Der meistverkaufte Werkstoff des Hauses und eines der wenigen PETG-Blätter, das BEIDE HDT-Lasten und zusätzlich die Glasübergangstemperatur nennt. 29 % Bruchdehnung bei 51 MPa Streckspannung ist die Zähigkeit, für die PETG gewählt wird.",
                "The house's best-selling material and one of few PETG sheets stating BOTH HDT loads plus the glass transition. 29 % elongation at break at 51 MPa yield stress is the toughness PETG is chosen for.") },

  { id: "fiberlogy-petg-v0", material: "petg", name: "Fiberlogy PET-G V0",
    file: "19f02e6404902eac8378c5c9cd20136b/FIBERLOGY_PETGV0_TDS.pdf",
    props: {
      density: q(1.26, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(40, "MPa", { std: "ISO 527", conditions: "Streckspannung; Bruchspannung 25 MPa" }),
      tensileModulusXy: q(2350, "MPa", { std: "ISO 527" }),
      elongationAtYieldXy: q(3.3, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(40, "%", { std: "ISO 527" }),
      charpyNotchedXy: q(3, "kJ/m²", { std: "ISO 179, 23 °C" }),
      hdtA: q(58, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(63, "°C", { std: "ISO 75, 0,45 MPa" }),
      vicatB50: q(70, "°C", { std: "ISO 306" }),
      nozzleTemperature: q(235, "°C", { min: 220, max: 250 }),
      bedTemperature: q(90, "°C"),
    },
    anomaly: t("Das Produkt heisst „PET-G V0“ — das Datenblatt nennt aber KEINE UL94-Klasse, keine Prüfdicke und keine Prüfstelle. Ein V-0 im Produktnamen ohne Klassifizierung im Blatt ist keine Brandschutzangabe, auf die sich eine Konstruktion stützen kann. Für eine Anwendung mit Brandschutzanforderung müsste ein Prüfzeugnis angefordert werden. Die Datenbank führt deshalb für dieses Produkt keine Flammklasse.",
               "The product is called “PET-G V0” — but the datasheet names NO UL94 class, no test thickness and no test house. A V-0 in the product name without a classification on the sheet is not a flame-retardancy statement a design can rest on. For an application with a fire requirement a test certificate would have to be requested. The database therefore carries no flame class for this product."),
    features: t("Gegenüber dem Easy PET-G desselben Hauses kostet die Flammschutzausrüstung erkennbar Festigkeit (40 statt 51 MPa) und Wärmeformbeständigkeit (HDT-B 63 statt 68 °C) — dafür steigt die Bruchdehnung von 29 auf 40 %.",
                "Against this house's Easy PET-G the flame-retardant package visibly costs strength (40 instead of 51 MPa) and heat resistance (HDT-B 63 instead of 68 °C) — in return elongation at break rises from 29 to 40 %.") },

  { id: "fiberlogy-pctg", material: "pctg", name: "Fiberlogy PCTG",
    file: "b170d0f24c85647183f2d25df7d5efff/FIBERLOGY_PCTG_TDS.pdf",
    props: {
      density: q(1.23, "g/cm³", { std: "ASTM D792" }),
      tensileStrengthXy: q(43, "MPa", { std: "ISO 527", conditions: "Streckspannung; Bruchspannung 45 MPa" }),
      elongationAtYieldXy: q(4, "%", { std: "ISO 527" }),
      elongationAtBreakXy: q(220, "%", { std: "ISO 527" }),
      flexuralStrengthXy: q(60, "MPa", { std: "ISO 178" }),
      flexuralModulusXy: q(1600, "MPa", { std: "ISO 178" }),
      izodNotchedXy: q(92, "kJ/m²", { std: "ISO 180, 23 °C" }),
      hdtA: q(64, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(76, "°C", { std: "ISO 75, 0,45 MPa" }),
      nozzleTemperature: q(260, "°C", { min: 250, max: 270 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    features: t("Praktisch deckungsgleich mit dem PCTG-Blatt von 3DJAKE: 43 gegen 44 MPa, 220 % Bruchdehnung bei beiden, 1600 MPa Biegemodul bei beiden, HDT 76/64 °C bei beiden. Zwei Marken, dasselbe Granulat — und ein seltener Fall, in dem sich zwei unabhängige Blätter gegenseitig bestätigen. Die 92 kJ/m² gekerbte Izod-Schlagzähigkeit sind der Grund, warum PCTG dort steht, wo PETG zu spröde bricht.",
                "Practically identical with the PCTG sheet from 3DJAKE: 43 against 44 MPa, 220 % elongation at break in both, 1600 MPa flexural modulus in both, HDT 76/64 °C in both. Two brands, the same pellets — and a rare case of two independent sheets confirming each other. The 92 kJ/m² notched Izod is why PCTG is used where PETG breaks too brittle.") },

  { id: "fiberlogy-nylon-pa12-cf15", material: "pa12-cf", name: "Fiberlogy Nylon PA12+CF15",
    file: "b7b3b44f467d07334ce84143e2521e08/FIBERLOGY_NYLONPA12CF15_TDS.pdf",
    props: {
      density: q(1.07, "g/cm³", { std: "ISO 1183" }),
      tensileStrengthXy: q(120, "MPa", { std: "ISO 527", conditions: "Bruchspannung" }),
      tensileModulusXy: q(7300, "MPa", { std: "ISO 527" }),
      elongationAtBreakXy: q(5, "%", { std: "ISO 527" }),
      charpyNotchedXy: q(15, "kJ/m²", { std: "ISO 179, 23 °C" }),
      charpyUnnotchedXy: q(75, "kJ/m²", { std: "ISO 179, 23 °C" }),
      hdtA: q(150, "°C", { std: "ISO 75, 1,8 MPa" }),
      hdtB: q(170, "°C", { std: "ISO 75, 0,45 MPa" }),
      meltingTemperature: q(178, "°C", { std: "ISO 3146" }),
      nozzleTemperature: q(263, "°C", { min: 255, max: 270 }),
      bedTemperature: q(100, "°C", { min: 90, max: 110 }),
    },
    anomaly: t("Die Zahlen liegen weit über allem anderen im selben Werkstofftyp: 120 MPa Zugfestigkeit und 7300 MPa Steifigkeit gegen 60 MPa und 2820 MPa beim PA12-CF von Extrudr. Ein Schmelzpunkt von 178 °C bei einer HDT-B von 170 °C ist zusätzlich schwer zusammenzubringen — nur acht Kelvin unter dem Schmelzen soll das Material noch formstabil sein. Zusammen mit dem Hinweis des Herstellers, dass die Werte aus Referenzwerken und Lieferantendaten stammen, spricht alles dafür, dass hier das Granulat beschrieben wird.",
               "The figures sit far above everything else in the same material type: 120 MPa tensile and 7300 MPa stiffness against 60 MPa and 2820 MPa for Extrudr's PA12-CF. A melting point of 178 °C alongside an HDT-B of 170 °C is additionally hard to reconcile — only eight kelvin below melting the material is supposed to still be dimensionally stable. Together with the manufacturer's note that the values come from reference works and supplier data, everything points to the pellets being described here.") },

  { id: "fiberlogy-fiberflex-40d", material: "tpu-95a", name: "Fiberlogy FiberFlex 40D",
    file: "d6bf9fbd43348bfb83f3c21d1b14687c/FIBERLOGY_FIBERFLEX40D_TDS.pdf",
    props: {
      density: q(1.16, "g/cm³", { std: "ASTM D792" }),
      hardnessShoreA: q(91, "Shore A", { std: "ASTM D2240" }),
      hardnessShoreD: q(40, "Shore D", { std: "ASTM D2240" }),
      tensileStrengthXy: q(28, "MPa", { std: "ASTM D638", conditions: "Bruchspannung; bei 5 % Dehnung 2 MPa, bei 10 % 4 MPa" }),
      elongationAtBreakXy: q(700, "%", { std: "ASTM D638" }),
      flexuralModulusXy: q(67, "MPa", { std: "ISO 178" }),
      hdtB: q(70, "°C", { std: "ASTM D648, 0,45 MPa" }),
      meltingTemperature: q(157, "°C", { std: "ASTM D3418" }),
      tearStrength: q(115, "kN/m", { std: "ASTM D1004" }),
      nozzleTemperature: q(210, "°C", { min: 200, max: 220 }),
      bedTemperature: q(60, "°C", { min: 50, max: 70 }),
    },
    anomaly: t("Shore A 91 liegt zwischen den beiden in der Datenbank geführten Typen TPU 85A und TPU 95A. Das Produkt ist dem TPU 95A zugeordnet, weil es mit 91 A näher daran liegt — eine Herstellerangabe ist diese Zuordnung ausdrücklich nicht. Bemerkenswert ist, dass das Blatt die Zugspannung bei definierter Dehnung angibt (2 MPa bei 5 %, 4 MPa bei 10 %): Genau das braucht man für ein Elastomer, und genau das fehlt in fast allen anderen Blättern.",
               "Shore A 91 sits between the two types carried in the database, TPU 85A and TPU 95A. The product is assigned to TPU 95A because at 91 A it is closer — that assignment is expressly not a manufacturer statement. Notable is that the sheet gives tensile stress at defined strain (2 MPa at 5 %, 4 MPa at 10 %): precisely what one needs for an elastomer, and precisely what is missing from almost every other sheet.") },
];

const out = path.join(ROOT, "data/products");
mkdirSync(out, { recursive: true });

let n = 0, na = 0;
for (const p of P) {
  const url = `${BASE}/${p.file}`;
  const parts = [SPECIMEN_NOTE];
  if (!p.text) parts.push(IMAGE_ONLY);
  if (p.anomaly) parts.push(t(`Befund zu diesem Datenblatt: ${p.anomaly.de}`,
                              `Finding on this datasheet: ${p.anomaly.en}`));
  const rec = {
    $schema: "../../schema/product.schema.json", schemaVersion: "1.0.0",
    id: p.id, materialId: p.material,
    brand: "Fiberlogy", manufacturer: "Fiberlab S.A. (Fiberlogy)", productName: p.name, origin: "Polen",
    specimenType: "undeclared",
    specimenNote: t(parts.map((x) => x.de).join("\n\n"), parts.map((x) => x.en).join("\n\n")),
    ...(p.features ? { features: p.features } : {}),
    datasheet: { title: `${p.name} — Technical Data Sheet`, url, retrievedAt: RETRIEVED },
    productUrl: "https://fiberlogy.com/en_US/c/Our-Filaments/136",
    properties: p.props,
    governance: {
      lastReviewed: RETRIEVED,
      reviewedBy: "Claude Code (Erstimport aus Herstellerdatenblatt)",
      sources: [{
        id: "src_tds", type: "manufacturer-tds", publisher: "Fiberlab S.A. (Fiberlogy)",
        productName: p.name, title: `${p.name} — Technical Data Sheet`,
        url, retrievedAt: RETRIEVED, confidenceCeiling: "low",
        note: t(`Herstellerdatenblatt. Der Hersteller weist selbst aus, dass die Werte aus Referenzwerken und Lieferantendaten stammen und nicht aus eigener Messung — deshalb Ceiling 'low'. ${p.text ? "Blatt mit Textebene, maschinell ausgelesen." : "Reine Bild-PDF, Werte von der gerenderten Seite abgelesen."}`,
                `Manufacturer datasheet. The manufacturer itself declares that the values come from reference works and supplier data rather than own measurement — hence ceiling 'low'. ${p.text ? "Sheet with text layer, read mechanically." : "Pure image PDF, values read off the rendered page."}`),
      }],
    },
  };
  writeFileSync(path.join(out, `${p.id}.json`), `${JSON.stringify(rec, null, 2)}\n`);
  n++;
  if (p.anomaly) na++;
}

console.log(`${n} Fiberlogy-Produkte geschrieben (${na} mit dokumentiertem Datenblatt-Befund)`);
console.log(`  4 Blaetter mit Textebene, ${n - 4} als Bild-PDF abgelesen`);
