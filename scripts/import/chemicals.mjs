/**
 * Medienregister — die Chemikalien, gegen die ein Bauteil bestehen muss.
 *
 * WARUM ES DAS BRAUCHT
 * Die Bezeichnungen standen doppelt im Code: einmal in der Auswahl des Assistenten,
 * einmal in der Detailansicht — nur deutsch, ohne Erklärung. Wer "verd. Lauge" liest,
 * weiss nicht, ob sein Reinigungsmittel dazugehört. Genau daran scheitert der Filter in
 * der Praxis: nicht am fehlenden Werkstoffwissen, sondern daran, dass niemand sein
 * eigenes Medium im Register wiedererkennt.
 *
 * Jeder Eintrag führt deshalb BEISPIELE aus dem Alltag ("Ballistol", "Bremsenreiniger")
 * und einen Satz dazu, was das Medium mit Kunststoff macht. Die Kategorie steuert die
 * Gruppierung in der Oberfläche.
 *
 * `aggressiveness` ist eine grobe Einordnung, wie viele Werkstoffe ein Medium
 * erfahrungsgemäss ausschliesst — sie hilft beim Erwartungsmanagement, ersetzt aber
 * keinen Kennwert und fliesst NICHT in die Bewertung ein.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const t = (de, en) => ({ de, en });

const schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://reents3d.github.io/fdm-material-advisor/schema/chemical.schema.json",
  title: "Medienregister",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "chemicals"],
  properties: {
    $schema: { type: "string" },
    schemaVersion: { type: "string" },
    chemicals: {
      type: "array", minItems: 1,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "name", "category", "examples", "effect", "aggressiveness"],
        properties: {
          id: { type: "string", pattern: "^chem_[a-z0-9_]+$" },
          name: { $ref: "#/$defs/i18n" },
          category: { enum: ["wasser", "oel", "loesemittel", "kraftstoff", "reiniger", "saeure-lauge"] },
          /** Alltagsbeispiele, damit der Nutzer sein eigenes Medium wiedererkennt. */
          examples: { $ref: "#/$defs/i18n" },
          /** Was das Medium mit Kunststoff macht - ein Satz, kein Lehrbuch. */
          effect: { $ref: "#/$defs/i18n" },
          /** 1 = schliesst kaum etwas aus, 5 = schliesst fast alles aus. Nur Erwartungsmanagement. */
          aggressiveness: { type: "integer", minimum: 1, maximum: 5 },
          concentration: { $ref: "#/$defs/i18n" },
          note: { $ref: "#/$defs/i18n" },
        },
      },
    },
  },
  $defs: {
    i18n: {
      type: "object", required: ["de", "en"], additionalProperties: false,
      properties: { de: { type: "string", minLength: 1 }, en: { type: "string", minLength: 1 } },
    },
  },
};

const C = [
  /* ------------------------------------------------------------- Wasser */
  { id: "chem_water", cat: "wasser", agg: 1,
    name: t("Wasser", "Water"),
    ex: t("Leitungswasser, Kondensat, Regen, Spritzwasser", "Tap water, condensate, rain, splash water"),
    eff: t("Für sich harmlos, aber Polyamide nehmen Wasser auf und verlieren dabei Steifigkeit; Polyester können bei Dauerwärme hydrolysieren.",
           "Harmless in itself, but polyamides absorb water and lose stiffness; polyesters can hydrolyse under sustained heat.") },
  { id: "chem_salt_water", cat: "wasser", agg: 2,
    name: t("Salzwasser", "Salt water"),
    ex: t("Meerwasser, Streusalzlösung, Sole", "Sea water, road-salt solution, brine"),
    eff: t("Greift die Kunststoffe kaum an, dafür jedes eingelegte Metallteil — Gewindeeinsätze und Schrauben sind hier das Risiko, nicht der Werkstoff.",
           "Barely attacks the plastics but attacks every embedded metal part — threaded inserts and screws are the risk here, not the polymer.") },
  { id: "chem_steam", cat: "wasser", agg: 4,
    name: t("Heißdampf", "Steam"),
    ex: t("Autoklav 121 °C, Dampfreiniger, Sterilisation", "Autoclave at 121 °C, steam cleaner, sterilisation"),
    eff: t("Die Kombination aus Temperatur, Druck und Feuchte ist deutlich schärfer als heißes Wasser und schliesst fast alle Standardwerkstoffe aus.",
           "The combination of temperature, pressure and moisture is far harsher than hot water and rules out almost every standard material."),
    note: t("Wo ein Werkstoff hierzu keinen belegten Wert hat, ist das kein Freibrief — bitte selbst prüfen.",
            "Where a material has no sourced value here, that is not a licence — please test it yourself.") },

  /* ---------------------------------------------------------------- Öle */
  { id: "chem_mineral_oil", cat: "oel", agg: 2,
    name: t("Mineralöl", "Mineral oil"),
    ex: t("Motoröl, Getriebeöl, Ballistol, Maschinenöl", "Engine oil, gear oil, machine oil"),
    eff: t("Die meisten technischen Kunststoffe halten Mineralöl gut aus; kritisch wird es erst mit Temperatur.",
           "Most engineering plastics tolerate mineral oil well; it only becomes critical with temperature.") },
  { id: "chem_grease", cat: "oel", agg: 1,
    name: t("Fett", "Grease"),
    ex: t("Lagerfett, Lithiumseifenfett, Montagepaste", "Bearing grease, lithium soap grease, assembly paste"),
    eff: t("Das mildeste Medium dieser Liste. Relevant vor allem, weil Fett kriecht und dorthin gelangt, wo es nicht geplant war.",
           "The mildest medium on this list. Mainly relevant because grease creeps and reaches places nobody planned for.") },
  { id: "chem_hydraulic_oil", cat: "oel", agg: 3,
    name: t("Hydrauliköl", "Hydraulic fluid"),
    ex: t("HLP 46, Hydraulikanlagen, Pressen", "HLP 46, hydraulic systems, presses"),
    eff: t("Schärfer als Motoröl, weil es unter Druck in Grenzflächen gedrückt wird — bei gedruckten Teilen also zwischen die Schichten.",
           "Harsher than engine oil because pressure drives it into interfaces — with printed parts, between the layers.") },
  { id: "chem_coolant_mwf", cat: "oel", agg: 4,
    name: t("Kühlschmierstoff", "Metalworking coolant"),
    ex: t("Emulsion an der Fräse, Bohröl, wassermischbare KSS", "Emulsion at the mill, drilling oil, water-miscible coolant"),
    eff: t("Das am meisten unterschätzte Medium in der Werkstatt: eine alkalische Emulsion mit Tensiden, die Polyester angreift. PETG ist hier der beliebteste Fehlgriff.",
           "The most underestimated medium in the workshop: an alkaline emulsion with surfactants that attacks polyesters. PETG is the most popular mistake here."),
    note: t("Der pH-Wert einer gebrauchten Emulsion steigt mit der Standzeit — ein Teil, das im frischen Bad hält, kann im alten versagen.",
            "The pH of a used emulsion rises with service life — a part that survives a fresh bath may fail in an old one.") },
  { id: "chem_brake_fluid", cat: "oel", agg: 5,
    name: t("Bremsflüssigkeit", "Brake fluid"),
    ex: t("DOT 4, DOT 5.1", "DOT 4, DOT 5.1"),
    eff: t("Glykolether — eines der aggressivsten Medien im Fahrzeugbereich und für die meisten Kunststoffe ein Ausschlusskriterium.",
           "A glycol ether — one of the most aggressive media in vehicles and a knock-out criterion for most plastics.") },

  /* -------------------------------------------------------- Kraftstoffe */
  { id: "chem_petrol_diesel", cat: "kraftstoff", agg: 4,
    name: t("Benzin und Diesel", "Petrol and diesel"),
    ex: t("Tankstellenkraftstoff, E10, Heizöl", "Pump fuel, E10, heating oil"),
    eff: t("Löst und quillt viele Kunststoffe. Der Ethanolanteil in E10 verschärft das gegenüber reinem Benzin zusätzlich.",
           "Dissolves and swells many plastics. The ethanol content in E10 makes it harsher still than pure petrol.") },

  /* -------------------------------------------------------- Lösemittel */
  { id: "chem_ipa", cat: "loesemittel", agg: 2,
    name: t("Isopropanol", "Isopropanol"),
    ex: t("Reinigungsalkohol, Druckbettreiniger, Desinfektion", "Cleaning alcohol, print-bed cleaner, disinfection"),
    eff: t("Das übliche Reinigungsmittel in der Druckerei. Meist unkritisch, kann aber bei gespannten Bauteilen Spannungsrisse auslösen.",
           "The usual cleaning agent in a print shop. Mostly uncritical, but can trigger stress cracking in strained parts.") },
  { id: "chem_ethanol", cat: "loesemittel", agg: 2,
    name: t("Ethanol", "Ethanol"),
    ex: t("Spiritus, Händedesinfektion, Alkohol in Getränken", "Methylated spirit, hand sanitiser, alcohol in drinks"),
    eff: t("Ähnlich mild wie Isopropanol, aber bei Dauerkontakt und in Kombination mit Spannung riskant.",
           "As mild as isopropanol, but risky on prolonged contact combined with stress.") },
  { id: "chem_acetone", cat: "loesemittel", agg: 5,
    name: t("Aceton", "Acetone"),
    ex: t("Nagellackentferner, Bremsenreiniger, ABS-Glättung", "Nail polish remover, brake cleaner, ABS smoothing"),
    eff: t("Löst ABS und ASA vollständig auf — was bei der Dampfglättung erwünscht ist und im Einsatz das Ende des Bauteils bedeutet.",
           "Completely dissolves ABS and ASA — desirable in vapour smoothing and the end of the part in service.") },
  { id: "chem_mek", cat: "loesemittel", agg: 5,
    name: t("MEK (Butanon)", "MEK (butanone)"),
    ex: t("Industriereiniger, Klebstoffe, Verdünner", "Industrial cleaner, adhesives, thinner"),
    eff: t("Noch schärfer als Aceton und für nahezu alle amorphen Thermoplaste ein Ausschlusskriterium.",
           "Harsher still than acetone and a knock-out criterion for nearly all amorphous thermoplastics.") },

  /* ----------------------------------------------------------- Reiniger */
  { id: "chem_surface_disinfectant", cat: "reiniger", agg: 3,
    name: t("Flächendesinfektion", "Surface disinfectant"),
    ex: t("Alkoholische und quaternäre Desinfektionstücher, Praxis- und Laborreiniger",
          "Alcohol and quaternary disinfectant wipes, clinic and lab cleaners"),
    eff: t("Der wiederholte Kontakt ist das Problem, nicht der einzelne. Bauteile mit Spannungen reissen nach Wochen, nicht nach Minuten.",
           "Repeated contact is the problem, not a single wipe. Stressed parts crack after weeks, not minutes.") },
  { id: "chem_bleach", cat: "reiniger", agg: 3,
    name: t("Bleichmittel", "Bleach"),
    ex: t("Natriumhypochlorit, Chlorreiniger, Poolwasser", "Sodium hypochlorite, chlorine cleaner, pool water"),
    eff: t("Oxidierend. Greift vor allem Polyamide an und macht sie über die Zeit spröde.",
           "Oxidising. Attacks polyamides above all and embrittles them over time.") },
  { id: "chem_hydrogen_peroxide", cat: "reiniger", agg: 3,
    name: t("Wasserstoffperoxid", "Hydrogen peroxide"),
    ex: t("H₂O₂ 3–35 %, Sterilisation, Bleiche", "H₂O₂ 3–35 %, sterilisation, bleaching"),
    eff: t("Oxidierend, mit stark konzentrationsabhängiger Wirkung — 3 % im Haushalt und 35 % in der Anlage sind zwei verschiedene Medien.",
           "Oxidising, with a strongly concentration-dependent effect — 3 % in the household and 35 % in a plant are two different media.") },

  /* ------------------------------------------------------- Säure/Lauge */
  { id: "chem_dilute_acid", cat: "saeure-lauge", agg: 3,
    name: t("Verdünnte Säure", "Dilute acid"),
    ex: t("Essigsäure, Zitronensäure, Entkalker, Batteriesäure verdünnt",
          "Acetic acid, citric acid, descaler, dilute battery acid"),
    eff: t("Polyamide sind hier die empfindlichsten; Polyolefine und Fluorpolymere stecken es am besten weg.",
           "Polyamides are the most sensitive here; polyolefins and fluoropolymers cope best."),
    conc: t("Bezugsgrösse sind etwa 10 %. Konzentrierte Säuren sind ein anderes Medium.",
            "The reference is roughly 10 %. Concentrated acids are a different medium.") },
  { id: "chem_dilute_alkali", cat: "saeure-lauge", agg: 4,
    name: t("Verdünnte Lauge", "Dilute alkali"),
    ex: t("Natronlauge, Rohrreiniger, alkalische Industriereiniger, Geschirrspülmittel",
          "Caustic soda, drain cleaner, alkaline industrial cleaners, dishwasher detergent"),
    eff: t("Verseift Polyester. PETG, PET-CF und PC fallen dadurch aus dem Feld — obwohl gerade PETG der naheliegende Griff wäre.",
           "Saponifies polyesters. PETG, PET-CF and PC drop out of the field — even though PETG would be the obvious choice."),
    conc: t("Bezugsgrösse sind etwa 10 %.", "The reference is roughly 10 %.") },

  /* Nachtrag 2026-08-02: Diese drei Medien kamen dazu, weil Herstellerdatenblätter sie
     als eigene Zeile führen (SUNLU nennt starke und schwache Säuren/Laugen getrennt) und
     sich ihre Angaben sonst nirgends ablegen liessen. Eine "starke Säure" ist chemisch
     etwas anderes als eine verdünnte, nicht bloss mehr davon. */
  { id: "chem_strong_acid", cat: "saeure-lauge", agg: 5,
    name: t("Starke Säure", "Strong acid"),
    ex: t("Salzsäure, Schwefelsäure, Salpetersäure, Batteriesäure unverdünnt, Beizen",
          "Hydrochloric, sulphuric and nitric acid, undiluted battery acid, pickling baths"),
    eff: t("Greift Polyamide und Polycarbonat schnell an und baut Polyester hydrolytisch ab. Nur wenige Werkstoffe halten dagegen — PPS ist unter den druckbaren die verlässlichste Wahl.",
           "Attacks polyamides and polycarbonate quickly and hydrolytically degrades polyesters. Few materials hold up — among the printable ones PPS is the most reliable choice."),
    conc: t("Gemeint ist pH unter 3 beziehungsweise die technisch übliche Konzentration.",
            "Meant is pH below 3 or the technically usual concentration.") },
  { id: "chem_strong_alkali", cat: "saeure-lauge", agg: 5,
    name: t("Starke Lauge", "Strong alkali"),
    ex: t("Konzentrierte Natronlauge, Kalilauge, alkalische Entfettungsbäder, Ätznatron",
          "Concentrated caustic soda, potassium hydroxide, alkaline degreasing baths, lye"),
    eff: t("Verseift Polyester und Polycarbonat regelrecht. ABS und Polyamid halten dagegen erstaunlich gut — hier dreht sich die übliche Reihenfolge um.",
           "Saponifies polyesters and polycarbonate outright. ABS and polyamide hold up surprisingly well — here the usual order reverses."),
    conc: t("Gemeint ist pH über 10 beziehungsweise die technisch übliche Konzentration.",
            "Meant is pH above 10 or the technically usual concentration.") },
  { id: "chem_ester", cat: "loesemittel", agg: 4,
    name: t("Ester", "Esters"),
    ex: t("Ethylacetat, Butylacetat, Nagellackentferner, viele Lackverdünner und Klebstoffe",
          "Ethyl acetate, butyl acetate, nail polish remover, many paint thinners and adhesives"),
    eff: t("Löst und quillt amorphe Werkstoffe — ABS, PC und PMMA reagieren deutlich. Teilkristalline Polyamide stecken es weg. Praxisrelevant vor allem beim Lackieren und Verkleben.",
           "Dissolves and swells amorphous materials — ABS, PC and PMMA react markedly. Semi-crystalline polyamides shrug it off. Relevant in practice above all when painting and bonding."),
    conc: t("Bezugsgrösse ist das reine Lösemittel bei Raumtemperatur.",
            "The reference is the neat solvent at room temperature.") },
];

const outS = path.join(ROOT, "schema");
const outD = path.join(ROOT, "data");
mkdirSync(outS, { recursive: true });
mkdirSync(outD, { recursive: true });

writeFileSync(path.join(outS, "chemical.schema.json"), JSON.stringify(schema, null, 2) + "\n");
writeFileSync(path.join(outD, "chemicals.json"), JSON.stringify({
  $schema: "../schema/chemical.schema.json", schemaVersion: "1.0.0",
  chemicals: C.map((c) => ({
    id: c.id, name: c.name, category: c.cat, examples: c.ex, effect: c.eff,
    aggressiveness: c.agg,
    ...(c.conc ? { concentration: c.conc } : {}),
    ...(c.note ? { note: c.note } : {}),
  })),
}, null, 2) + "\n");

console.log(`${C.length} Medien + schema/chemical.schema.json geschrieben`);
