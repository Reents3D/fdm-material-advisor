/**
 * Chemikalienbeständigkeit aus der Polymerklasse ableiten.
 *
 * DAS PROBLEM
 * Das Medienregister hat eine Lücke offengelegt, die vorher niemand sehen konnte: Für zehn
 * der achtzehn Medien lag ein belegter Wert zu höchstens einem Werkstoff vor. Wer im
 * Assistenten "Bremsflüssigkeit" wählte, filterte damit faktisch nach Erfassungsstand.
 *
 * DIE ABLEITUNG
 * Chemische Beständigkeit ist im Kern eine Eigenschaft des GRUNDPOLYMERS, nicht der
 * Füllung. Ob ein PA6 Carbon- oder Glasfasern enthält, ändert nichts daran, dass die
 * Amidbindung von verdünnter Säure angegriffen wird. Die Matrix arbeitet deshalb auf der
 * Polymerfamilie; Blends bekommen dokumentierte Abweichungen.
 *
 * DIE REGELN, DIE DABEI GELTEN
 * 1. NICHT-ZERSTÖREND. Vorhandene Einträge bleiben unangetastet — auch geschätzte. Wer
 *    einen Wert bewusst gesetzt hat, soll ihn nicht durch eine Pauschale verlieren.
 *    Ergänzt wird ausschliesslich, was fehlt.
 * 2. ALLES MARKIERT. Jeder abgeleitete Eintrag trägt `confidence: "estimated"` und
 *    `source: "estimate_reasoning"`. Er sieht in der Oberfläche anders aus als ein
 *    Datenblattwert, und das ist Absicht.
 * 3. IM ZWEIFEL "limited", NICHT "resistant". Eine falsche Freigabe kostet ein Bauteil im
 *    Feld; eine zu vorsichtige Einstufung kostet einen Platz in der Rangliste. Die
 *    Asymmetrie ist eindeutig.
 *
 * Die Matrix ist Lehrbuchwissen zur Polymerchemie, keine Messung. Sie ersetzt für
 * kritische Anwendungen keinen Auslagerungsversuch im Originalmedium.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data/materials");
const REGISTER = JSON.parse(readFileSync(path.join(ROOT, "data/chemicals.json"), "utf8")).chemicals;
const ALL = REGISTER.map((c) => c.id);

const R = "resistant", L = "limited", N = "not-resistant";

/* Reihenfolge = Reihenfolge im Register, damit die Matrix lesbar bleibt:
   water, salt_water, steam, mineral_oil, grease, hydraulic_oil, coolant_mwf,
   brake_fluid, petrol_diesel, ipa, ethanol, acetone, mek, surface_disinfectant,
   bleach, hydrogen_peroxide, dilute_acid, dilute_alkali */
const ORDER = ["chem_water", "chem_salt_water", "chem_steam", "chem_mineral_oil", "chem_grease",
  "chem_hydraulic_oil", "chem_coolant_mwf", "chem_brake_fluid", "chem_petrol_diesel", "chem_ipa",
  "chem_ethanol", "chem_acetone", "chem_mek", "chem_surface_disinfectant", "chem_bleach",
  "chem_hydrogen_peroxide", "chem_dilute_acid", "chem_dilute_alkali"];

const FAMILY = {
  /* Polyester: Esterbindung wird von Lauge verseift und von Heissdampf hydrolysiert.
     Das ist der Grund, warum PETG an der Fraese scheitert - Kuehlschmierstoff ist alkalisch. */
  PLA: [R, R, N, R, R, R, N, N, L, R, L, L, N, L, L, L, L, N],
  PHA: [R, R, N, R, R, R, N, N, L, R, L, L, N, L, L, L, L, N],
  PETG: [R, R, N, R, R, R, N, N, L, L, L, N, N, L, L, L, R, N],
  PET: [R, R, N, R, R, R, N, N, L, L, L, N, N, L, L, L, R, N],

  /* Styrolcopolymere: gegen Saeure und Lauge unempfindlich, gegen Ketone chancenlos.
     Aceton loest ABS vollstaendig - was bei der Dampfglaettung erwuenscht ist. */
  ABS: [R, R, N, L, R, L, L, N, N, L, L, N, N, L, L, L, R, R],
  ASA: [R, R, N, L, R, L, L, N, N, L, L, N, N, L, L, L, R, R],

  /* Polycarbonat: beruechtigt fuer Spannungsrissbildung schon bei Alkoholen und
     Flaechendesinfektion - der haeufigste Ausfall in der Praxis, nicht das Aufloesen. */
  PC: [R, R, N, R, R, L, N, N, N, L, N, N, N, N, L, L, R, N],

  /* Polyamide: gegen Oele, Kraftstoffe und Loesemittel hervorragend, gegen Saeure und
     Oxidationsmittel schlecht - und Wasser ist hier ein Kennwertproblem, kein Angriff. */
  PA: [L, L, L, R, R, R, R, R, R, R, R, R, R, R, N, N, N, R],

  /* PPS ist der Ausreisser: praktisch gegen alles bestaendig, was hier gelistet ist. */
  PPS: [R, R, R, R, R, R, R, R, R, R, R, R, R, R, L, L, R, R],

  /* PMMA: optisch brillant, chemisch das Sorgenkind. Spannungsrisse schon durch IPA. */
  PMMA: [R, R, N, L, L, N, L, N, N, N, N, N, N, N, L, L, R, L],

  /* TPU wird ueberwiegend auf Polyesterbasis geliefert - daher dieselbe Laugen- und
     Hydrolyseschwaeche wie bei den Polyestern, bei sehr guter Oelbestaendigkeit. */
  TPU: [L, L, N, R, R, R, L, N, L, L, L, N, N, L, N, L, L, N],
};

/* Werkstoffbezogene Abweichungen von der Familienmatrix, jede mit Grund. */
const OVERRIDE = {
  "pc-pbt": {
    chem_petrol_diesel: [L, "Der PBT-Anteil hebt die Kraftstoffbeständigkeit deutlich über die von reinem PC."],
    chem_coolant_mwf: [L, "Der teilkristalline PBT-Anteil verzögert den alkalischen Angriff gegenüber reinem PC."],
    chem_ipa: [L, "Blends neigen weniger zur Spannungsrissbildung als reines PC."],
    chem_ethanol: [L, "Blends neigen weniger zur Spannungsrissbildung als reines PC."],
    chem_surface_disinfectant: [L, "Blends neigen weniger zur Spannungsrissbildung als reines PC."],
  },
};

const t = (de, en) => ({ de, en });

const NOTE = t(
  "Aus der Polymerklasse abgeleitet, nicht gemessen. Chemische Beständigkeit ist im Kern eine Eigenschaft des Grundpolymers — eine Faserfüllung ändert daran nichts. Für kritische Anwendungen ersetzt das keinen Auslagerungsversuch im Originalmedium.",
  "Derived from the polymer class, not measured. Chemical resistance is fundamentally a property of the base polymer — a fibre filler does not change it. For critical applications this does not replace an immersion test in the actual medium.");

let touched = 0, added = 0, kept = 0;
const perRating = {};

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const p = path.join(DIR, file);
  const m = JSON.parse(readFileSync(p, "utf8"));
  const fam = m.identity?.family;
  const row = FAMILY[fam];
  if (!row) { console.log(`  ! keine Matrix für Familie ${fam} (${m.id})`); continue; }

  m.durability ??= {};
  const existing = m.durability.chemicalResistance ?? [];
  const have = new Set(existing.map((e) => e.chemicalId));
  kept += existing.length;

  const ov = OVERRIDE[m.id] ?? {};
  const fresh = [];
  for (const id of ALL) {
    if (have.has(id)) continue;
    const i = ORDER.indexOf(id);
    if (i < 0) continue;
    const [rating, reason] = ov[id] ? ov[id] : [row[i], null];
    fresh.push({
      chemicalId: id, rating,
      source: "estimate_reasoning", confidence: "estimated",
      note: reason
        ? t(`${reason} ${NOTE.de}`, `${reason} ${NOTE.en}`)
        : NOTE,
    });
    perRating[rating] = (perRating[rating] ?? 0) + 1;
    added++;
  }
  if (!fresh.length) continue;

  /* In Registerreihenfolge sortieren, damit die Detailansicht eine stabile Liste zeigt. */
  const all = [...existing, ...fresh].sort((a, b) => ALL.indexOf(a.chemicalId) - ALL.indexOf(b.chemicalId));
  m.durability.chemicalResistance = all;
  writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
  touched++;
}

console.log(`${touched} Werkstoffe ergänzt · ${added} neue Einträge · ${kept} vorhandene unangetastet`);
console.log(`  ${Object.entries(perRating).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
