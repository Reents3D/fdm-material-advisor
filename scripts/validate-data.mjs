/**
 * Plausibility and provenance rules.
 *
 * Two severities:
 *   error — breaks CI. Structural or provenance faults we never accept.
 *   warn  — reported, does not break CI. Used for anomalies that are genuinely present
 *           in the source datasheet and are documented via an openQuestion. Suppressing
 *           them silently would be dishonest; failing on them would make it impossible
 *           to carry a faithful transcription of a flawed source.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data/materials");

const CONF = { estimated: 0, low: 1, medium: 2, high: 3 };

/** Polarity of every named 1-5 scale. Single source of truth, mirrored in DATA_MODEL.md. */
export const SCALE_POLARITY = {
  printability: 1, layerAdhesion: 1, toughness: 1, fatigueResistance: 1, wearResistance: 1,
  uvResistance: 1, weatherResistance: 1, hydrolysisResistance: 1, gasBarrier: 1,
  surfaceQuality: 1, sandability: 1, fillability: 1, paintAdhesion: 1, wrappingSuitability: 1,
  bondability: 1, availability: 1, batchConsistency: 1, dimensionalAccuracy: 1,
  smallSeriesSuitability: 1, ralAccuracy: 1,
  warpingTendency: -1, hygroscopy: -1, abrasiveness: -1, stringingTendency: -1,
  creepTendency: -1, notchSensitivity: -1, yellowingTendency: -1,
  stressCrackingSensitivity: -1, layerLineVisibility: -1, priceIndex: -1, distortionRisk: -1,
};

const findings = [];
const stats = { files: 0, facts: 0, conf: {} };

const report = (sev, id, rule, msg) => findings.push({ sev, id, rule, msg });

/* -------------------------------------------------------------- tree walkers */

function walk(node, p, fn) {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${p}[${i}]`, fn));
  fn(node, p);
  for (const [k, v] of Object.entries(node)) walk(v, p ? `${p}.${k}` : k, fn);
}

const isQuantity = (n) => n && typeof n === "object" && "unit" in n && "value" in n && "confidence" in n;
const isProvenanced = (n) => n && typeof n === "object" && "source" in n && "confidence" in n;
const srcList = (n) => (Array.isArray(n.source) ? n.source : [n.source]);

const isI18n = (n) => {
  if (!n || typeof n !== "object" || Array.isArray(n)) return false;
  const keys = Object.keys(n);
  return keys.length > 0 &&
    keys.every((k) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k)) &&
    Object.values(n).every((v) => typeof v === "string");
};

/* ------------------------------------------------------------------ per file */

if (!existsSync(DIR)) {
  console.log("Keine Materialdaten gefunden.");
  process.exit(0);
}

/* Medienregister: einzige Quelle der gueltigen Chemikalien-IDs. */
const CHEM_IDS = new Set(
  JSON.parse(readFileSync(path.join(ROOT, "data/chemicals.json"), "utf8")).chemicals.map((c) => c.id),
);

const ids = new Set();

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const m = JSON.parse(readFileSync(path.join(DIR, file), "utf8"));
  const id = m.id;
  stats.files++;

  if (ids.has(id)) report("error", id, "R0-unique-id", `doppelte Material-ID ${id}`);
  ids.add(id);
  if (`${id}.json` !== file) report("error", id, "R0-filename", `Dateiname ${file} passt nicht zur ID ${id}`);

  const acknowledged = new Set(
    (m.governance?.openQuestions ?? []).flatMap((q) => q.affectsFields ?? []),
  );
  const isAck = (...fields) => fields.some((f) => [...acknowledged].some((a) => f.startsWith(a) || a.startsWith(f)));

  const declared = new Map((m.governance?.sources ?? []).map((s) => [s.id, s.confidenceCeiling]));

  /* R1 min <= value <= max */
  walk(m, "", (n, p) => {
    if (!isQuantity(n) || n.value === null) return;
    if (n.min !== undefined && n.value < n.min) report("error", id, "R1-range", `${p}: value ${n.value} < min ${n.min}`);
    if (n.max !== undefined && n.value > n.max) report("error", id, "R1-range", `${p}: value ${n.value} > max ${n.max}`);
    if (n.min !== undefined && n.max !== undefined && n.min > n.max) report("error", id, "R1-range", `${p}: min > max`);
  });

  /* R2 Z never exceeds XY for strength, stiffness, elongation */
  for (const [z, xy] of [
    ["tensileStrengthZ", "tensileStrengthXy"], ["flexuralStrengthZ", "flexuralStrengthXy"],
    ["tensileModulusZ", "tensileModulusXy"], ["flexuralModulusZ", "flexuralModulusXy"],
    ["elongationAtBreakZ", "elongationAtBreakXy"],
  ]) {
    const zv = m.mechanics?.[z]?.value, xv = m.mechanics?.[xy]?.value;
    if (zv != null && xv != null && zv > xv) report("error", id, "R2-anisotropy", `${z} ${zv} > ${xy} ${xv}`);
  }

  /* R2b jede referenzierte Chemikalie muss im Medienregister stehen.
     Sonst zeigt die Oberflaeche die nackte ID an und der Assistent kann das Medium
     gar nicht erst anbieten - ein Tippfehler bliebe unsichtbar. */
  for (const e of m.durability?.chemicalResistance ?? []) {
    if (!CHEM_IDS.has(e.chemicalId)) {
      report("error", id, "R2b-chemical-id", `unbekannte Chemikalie "${e.chemicalId}" - fehlt in data/chemicals.json`);
    }
  }

  /* R3 amorphous: HDT-A must not exceed Tg by more than 15 K.

     Gilt NICHT fuer Blends. Ein ABS/PC-Blend hat zwei Glasuebergaenge — einen der
     ABS-Phase bei rund 100 °C und einen der PC-Phase bei rund 145 °C. Datenblaetter
     nennen meist nur den niedrigeren, waehrend die Formbestaendigkeit von der hoeheren
     Phase getragen wird. Die Regel wuerde hier eine korrekte Angabe als Fehler melden.
     Wie bei R6 wird die REGEL eingeschraenkt, nicht der Datensatz gebogen. */
  const isBlend = (m.identity?.variant ?? []).includes("blend");
  if (m.identity?.polymerClass === "amorphous" && !isBlend) {
    const h = m.thermal?.hdtA?.value, tg = m.thermal?.glassTransition?.value;
    if (h != null && tg != null && h > tg + 15) report("error", id, "R3-hdt-tg", `HDT-A ${h} > Tg ${tg} + 15 K`);
  }

  /* R4 higher load must give lower temperature */
  const a = m.thermal?.hdtA?.value, b = m.thermal?.hdtB?.value;
  if (a != null && b != null && a > b) {
    const ack = isAck("thermal.hdtA", "thermal.hdtB");
    const lowConf = CONF[m.thermal.hdtA.confidence] <= 1 && CONF[m.thermal.hdtB.confidence] <= 1;
    report(ack && lowConf ? "warn" : "error", id, "R4-hdt-order",
      `HDT-A ${a} > HDT-B ${b}${ack ? " (dokumentierte Datenblatt-Anomalie)" : ""}`);
  }

  /* R5 bed below nozzle */
  const bed = m.processing?.bedTemperature?.max ?? m.processing?.bedTemperature?.value;
  const noz = m.processing?.nozzleTemperature?.min ?? m.processing?.nozzleTemperature?.value;
  if (bed != null && noz != null && bed >= noz) report("error", id, "R5-bed-nozzle", `Bett ${bed} >= Düse ${noz}`);

  /* R6 drying below Tg — amorphous only.
     For semi-crystalline polymers (PA, PET, PP) the crystalline phase holds shape well
     above Tg, so drying at 80 °C with a Tg of 68 °C is standard practice, not a fault. */
  if (m.identity?.polymerClass === "amorphous") {
    const dry = m.processing?.dryingTemperature?.value, tg2 = m.thermal?.glassTransition?.value;
    if (dry != null && tg2 != null && dry >= tg2) {
      report("warn", id, "R6-drying-tg", `Trocknung ${dry} °C >= Tg ${tg2} °C - Spulenverbackung möglich`);
    }
  }

  /* R7/R8/R9 provenance */
  walk(m, "", (n, p) => {
    if (!isProvenanced(n) || p.startsWith("governance")) return;
    stats.facts++;
    stats.conf[n.confidence] = (stats.conf[n.confidence] ?? 0) + 1;

    const srcs = srcList(n);
    if (CONF[n.confidence] >= 2 && srcs.every((s) => s === "estimate_reasoning")) {
      report("error", id, "R7-source-required", `${p}: confidence ${n.confidence} ohne echte Quelle`);
    }
    let ceiling = -1;
    for (const s of srcs) {
      if (!declared.has(s)) { report("error", id, "R8-source-resolvable", `${p}: unbekannte Quelle ${s}`); continue; }
      ceiling = Math.max(ceiling, CONF[declared.get(s)] ?? 0);
    }
    if (ceiling >= 0 && CONF[n.confidence] > ceiling) {
      report("error", id, "R9-confidence-ceiling", `${p}: confidence ${n.confidence} über Quellen-Ceiling`);
    }
  });

  /* R10 anisotropy must be source-pure */
  const af = m.mechanics?.anisotropyFactorTensile;
  if (af?.value != null) {
    const zs = JSON.stringify(m.mechanics?.tensileStrengthZ?.source);
    const xs = JSON.stringify(m.mechanics?.tensileStrengthXy?.source);
    const naive = m.mechanics?.tensileStrengthZ?.value / m.mechanics?.tensileStrengthXy?.value;
    if (zs !== xs && Math.abs(naive - af.value) < 0.005) {
      report("error", id, "R10-anisotropy-provenance",
        `Anisotropiefaktor ${af.value} aus quellengemischten Operanden berechnet`);
    }
  }

  /* R11 i18n completeness */
  walk(m, "", (n, p) => {
    if (!isI18n(n)) return;
    if (!n.de?.trim() || !n.en?.trim()) report("error", id, "R11-i18n", `${p}: de oder en fehlt`);
  });

  /* R12 impact anisotropy sanity */
  const iz = m.mechanics?.charpyUnnotchedZ?.value, ix = m.mechanics?.charpyUnnotchedXy?.value;
  if (iz != null && ix != null && iz > ix) {
    const ack = isAck("mechanics.charpyUnnotchedZ", "mechanics.anisotropyFactorImpact");
    report(ack ? "warn" : "error", id, "R12-impact-anisotropy",
      `Schlagzähigkeit Z ${iz} > X-Y ${ix}${ack ? " (dokumentierte Datenblatt-Anomalie)" : ""}`);
  }

  /* R13 rating scales must have a known polarity */
  walk(m, "", (n, p) => {
    if (!n || typeof n !== "object" || !("scale" in n) || !("value" in n)) return;
    if (SCALE_POLARITY[n.scale] === undefined) {
      report("error", id, "R13-scale-polarity", `${p}: Skala '${n.scale}' hat keine definierte Polarität`);
    }
  });

  /* R14 food contact status requires the part-level warning */
  if (m.compliance?.foodContact?.status && !m.compliance?.foodContact?.partLevelWarning) {
    report("error", id, "R14-food-warning", "foodContact.status gesetzt, aber partLevelWarning fehlt");
  }

  /* R15 blocking open questions must name affected fields */
  for (const oqn of m.governance?.openQuestions ?? []) {
    if (oqn.blocking && !(oqn.affectsFields?.length)) {
      report("error", id, "R15-open-question", `${oqn.id}: blocking ohne affectsFields`);
    }
  }
}

/* ----------------------------------------------------- R16, auf der Produktebene

   FASERN VERSTEIFEN. WENN DAS BLATT DAS NICHT ZEIGT, STIMMT DAS BLATT NICHT.

   Die erste Regel dieses Validators, die Produkte statt Werkstofftypen liest. Anlass war
   Extrudr DuraPro ABS gegen DuraPro ABS CF: ALLE zehn gemeinsamen Kennwerte identisch,
   Zug-E-Modul in beiden Fällen 2.350 MPa. Ein kurzfaserverstärktes ABS erreicht das Zwei-
   bis Dreifache — die CF-Variante hat die Tabelle des ungefüllten Materials geerbt.

   WARUM DIE DUBLETTENPRÜFUNG DAS NICHT FINDET
   `check-lineage.ts` vergleicht nur über Markengrenzen, weil Farbvarianten sich zu Recht
   eine Tabelle teilen. Innerhalb einer Marke sieht sie nichts. Hier ist der Vergleich
   aber gerade innerhalb der Marke fällig, und er braucht kein Zahlenkriterium, sondern
   ein physikalisches: Kurzfasern erhöhen den E-Modul. Tun sie es im Blatt nicht, ist
   entweder die Tabelle falsch oder der Füllgrad bedeutungslos — beides gehört gesehen.

   WARUM ARAMID EINE EIGENE SCHWELLE HAT
   Kohle- und Glasfasern werden zum Versteifen zugesetzt und heben den Zug-E-Modul
   typischerweise um die Hälfte oder mehr. Aramid wird für Zähigkeit und Verschleiß
   zugesetzt; sein Steifigkeitsbeitrag ist deutlich kleiner. FormFutura ApolloX Kevlar
   liegt bei Faktor 1,09 — für Kohlefaser wäre das ein Befund, für Aramid nicht.

   NUR GEGEN DIESELBE PRÜFNORM
   Die erste Fassung verglich stur die Zahlen und meldete Extrudr DuraPro ASA GF: 3.100
   gegen 3.500 MPa, also angeblich weicher. Tatsächlich ist der eine Wert nach ISO 178
   gemessen und der andere nach ASTM D790 — ein Vergleich, vor dem dieses Projekt sonst
   überall warnt, hier von der Prüfung selbst begangen. Verglichen wird deshalb nur, wo
   beide Seiten dieselbe Norm nennen; sonst schweigt die Regel.

   NICHT FÜR ELASTOMERE
   Die Regel gilt für steife Thermoplaste. Bei Extrudr Flex Hard CF meldete sie einen
   Zug-E-Modul von 35 gegen 40 MPa und lag damit falsch: Das Blatt zeigt bei ALLEN
   Zuggrößen einen Rückgang (auch σ50, σ100, σ300), während Shore-Härte 58 → 70 D und
   Druckfestigkeit 40 → 50 MPa steigen. Zehn von zehn Werten unterscheiden sich — das
   ist keine übernommene Tabelle, sondern eine eigenständige Prüfung, in der die Fasern
   den Zug schwächen und Härte wie Druckfestigkeit anheben. In einer weichen Matrix
   wirken kurze Fasern unter Zug als Kerbstellen. Elastomere sind deshalb ausgenommen.

   DAS PRODUKT ZÄHLT, NICHT DAS EINZELFELD
   Gemeldet wird erst, wenn KEIN vergleichbarer Modul eine Versteifung zeigt. DuraPro ASA
   CF liegt beim Zugmodul bei Faktor 1,14 und damit knapp unter der Schwelle, beim
   Biegemodul aber bei 1,29 — das Blatt zeigt den Effekt also sehr wohl. Auf ein
   fehlendes Hundertstel in einem von zwei Feldern zu reagieren wäre Rauschen.

   WARN, NICHT ERROR
   Der Befund liegt im fremden Datenblatt, nicht in unserer Übertragung. Ihn zum Fehler
   zu machen hieße, eine fehlerhafte Quelle nicht mehr treu wiedergeben zu können - genau
   die Begründung, die oben schon für R12 gilt. */

const PRODDIR = path.join(ROOT, "data/products");
const FILLER = {
  stiff: /\b(cf\d*|gf\d*)\b|carbon|glass\s*fib|basalt/i,
  tough: /aramid|kevlar/i,
};
/* Ab welchem Faktor gilt eine Faser als wirksam? Kohle/Glas: 1,15 - darunter ist der
   Unterschied kleiner als die Streuung zwischen zwei Chargen. Aramid: 1,0 - dort genügt,
   dass es überhaupt steifer wird. */
const MIN_GAIN = { stiff: 1.15, tough: 1.0 };

if (existsSync(PRODDIR)) {
  const prods = readdirSync(PRODDIR).filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(PRODDIR, f), "utf8")));
  const kindOf = (p) => {
    const s = `${p.productName} ${p.materialId}`;
    if (FILLER.tough.test(s)) return "tough";
    if (FILLER.stiff.test(s)) return "stiff";
    return null;
  };
  const strip = (n) => n.replace(FILLER.stiff, "").replace(FILLER.tough, "").replace(/\s+/g, " ").trim();

  /* Elastomere sind ausgenommen - siehe Kopfkommentar. Erkannt an der Shore-Härte, die
     nur weiche Werkstoffe fuehren, und ersatzweise am Werkstofftyp. */
  const isElastomer = (p) =>
    p.properties?.hardnessShoreA != null || p.properties?.hardnessShoreD != null ||
    /^(tpu|peba|tpe)/i.test(p.materialId ?? "");

  for (const filled of prods) {
    const kind = kindOf(filled);
    if (!kind) continue;
    const base = prods.find((p) => p.brand === filled.brand && !kindOf(p) && p.productName === strip(filled.productName));
    if (!base) continue;
    if (isElastomer(base) || isElastomer(filled)) continue;

    const comparable = [];
    for (const field of ["tensileModulusXy", "flexuralModulusXy"]) {
      const b = base.properties?.[field], f = filled.properties?.[field];
      if (typeof b?.value !== "number" || typeof f?.value !== "number" || b.value === 0) continue;
      /* Ohne gemeinsame Norm ist der Vergleich wertlos - siehe Kopfkommentar. */
      if (!b.testStandard || b.testStandard !== f.testStandard) continue;
      comparable.push({ field, base: b.value, filled: f.value, gain: f.value / b.value });
    }
    if (!comparable.length) continue;
    if (comparable.some((c) => c.gain >= MIN_GAIN[kind])) continue;

    const detail = comparable.map((c) => {
      const g = Math.round(c.gain * 100) / 100;
      return `${c.field} ${c.filled} gegen ${c.base} MPa (${g === 1 ? "zifferngleich" : g < 1 ? `Faktor ${g}, also NIEDRIGER` : `nur Faktor ${g}`})`;
    }).join("; ");
    report("warn", filled.id, "R16-filler-no-stiffening",
      `kein Steifigkeitsgewinn gegenüber ${base.productName} — ${detail}. Eine ${kind === "tough" ? "Aramid" : "Kohle-/Glasfaser"}füllung hebt den Modul an; tut das Blatt es nicht, ist die Tabelle vermutlich vom ungefüllten Werkstoff übernommen`);
  }
}

/* --------------------------------------------- R17, ebenfalls auf der Produktebene

   QUER ZUR SCHICHT IST NICHTS BESSER ALS LAENGS.

   Die Schichtgrenze ist bei FDM die schwaechste Ebene: Dort haelt nur, was beim Drucken
   verschweisst ist, waehrend laengs der ganze Strang traegt. Jede mechanische Groesse
   muss in Z deshalb unter dem X-Y-Wert liegen. Steht sie darueber, stimmt das Blatt
   nicht - meist ein vertauschtes Zahlenpaar.

   WARUM DAS NICHT SCHON R12 ERLEDIGT
   R12 prueft genau eine Groesse (ungekerbte Schlagzaehigkeit) und nur auf der
   WERKSTOFFebene. Beim Bambu-Import fiel auf, dass PLA Glow denselben Fehler auf der
   Produktebene traegt, wo ihn niemand pruefte: 19,8 kJ/m² in Z gegen 8,8 in X-Y. Diese
   Regel deckt acht Groessenpaare ab und sieht auf beiden Ebenen nach.

   NUR GEGEN DIESELBE PRUEFNORM - dieselbe Lehre wie bei R16. Ein ISO-Wert gegen einen
   ASTM-Wert gestellt ergibt eine Aussage ueber die Normen, nicht ueber den Werkstoff.

   WARN, NICHT ERROR: Der Befund liegt im fremden Blatt. */

const ZPAIRS = [
  ["charpyUnnotchedXy", "charpyUnnotchedZ", "ungekerbte Schlagzähigkeit"],
  ["charpyNotchedXy", "charpyNotchedZ", "gekerbte Schlagzähigkeit"],
  ["izodNotchedXy", "izodNotchedZ", "Izod-Kerbschlagzähigkeit"],
  ["tensileStrengthXy", "tensileStrengthZ", "Zugfestigkeit"],
  ["flexuralStrengthXy", "flexuralStrengthZ", "Biegefestigkeit"],
  ["tensileModulusXy", "tensileModulusZ", "Zug-E-Modul"],
  ["flexuralModulusXy", "flexuralModulusZ", "Biegemodul"],
  ["elongationAtBreakXy", "elongationAtBreakZ", "Bruchdehnung"],
];

/* ------------------------------------------ R18, Produkt- und Werkstoffebene

   CHARPY IST NICHT IZOD, UND GEKERBT IST NICHT UNGEKERBT.

   Die Schlagzaehigkeit ist die einzige Groesse im Datensatz, bei der VIER verschiedene
   Pruefungen unter aehnlichen Namen laufen: Charpy nach ISO 179 (Pendel trifft die
   liegende Probe mittig), Izod nach ISO 180 und ASTM D256 (Probe steht eingespannt),
   jeweils gekerbt und ungekerbt. Die Zahlen unterscheiden sich um ein Vielfaches, und
   zwar systematisch - ungekerbt liegt oft fuenf- bis zehnmal ueber gekerbt.

   WAS DAS AUFGEDECKT HAT
   Acht Produktblaetter fuehrten ASTM-D256- und ISO-180-Werte im FELD `charpyNotchedXy`.
   ASTM D256 IST Izod - das ist keine Auslegungsfrage, sondern steht im Titel der Norm.
   Auffallen konnte es niemandem, weil beide Felder dieselbe Einheit tragen und der Wert
   fuer sich plausibel aussieht. Bemerkt wurde es erst, als der Blaetterabgleich nach
   ADR-042 fuer `asa-cf` eine Spanne von Faktor 18 meldete: 9 kJ/m² (ISO 179/1eA),
   100 kJ/m² (ASTM D256) und 5,4 kJ/m² (ISO 179/1eU) standen nebeneinander im selben
   Feld. Das war keine Rezepturvielfalt, das waren drei verschiedene Pruefungen.

   Die acht Werte sind seither im Izod-Feld. Diese Regel haelt fest, dass es so bleibt.

   WARN, NICHT ERROR: Manche Blaetter nennen ihre Norm gar nicht, andere nur mit
   Bedingungen ("23 °C"). Das ist eine Luecke im fremden Blatt, kein Fehler im Datensatz -
   die Regel meldet nur, wenn eine Norm DA ist und zur falschen Familie gehoert. */

const IMPACT_FAMILY = {
  charpyUnnotchedXy: "charpy", charpyNotchedXy: "charpy",
  charpyUnnotchedZ: "charpy", charpyNotchedZ: "charpy", charpyUnnotchedXz: "charpy",
  izodNotchedXy: "izod", izodUnnotchedXy: "izod", izodNotchedZ: "izod",
};
const FAMILY_RE = {
  charpy: /ISO\s*179|GB\/T\s*1043/i,
  izod: /ISO\s*180|ASTM\s*D\s*256|GB\/T\s*1843/i,
};
/** Die Kerbart steht im Suffix der Norm: 1eU ungekerbt, 1eA/1eB/1eC gekerbt. */
const NOTCH_STATED = (std) => (/1eU|\bungekerbt\b|unnotched/i.test(std) ? "unnotched"
  : /1e[ABC]\b|1A\b|\bgekerbt\b|notched/i.test(std) ? "notched" : null);

/* Eine bestrittene Zahl ohne Begruendung waere schlimmer als gar keine Kennzeichnung:
   Sie verschwindet aus jeder Zusammenfassung, und niemand kann nachlesen warum. */
function checkDisputed(id, props) {
  for (const [field, v] of Object.entries(props ?? {})) {
    if (v?.disputed !== true) continue;
    if (!v.note?.de?.trim()) {
      report("error", id, "R19-disputed-unexplained", `${field}: disputed ohne Begründung in note`);
      continue;
    }
    report("warn", id, "R19-disputed",
      `${field} = ${v.value} ${v.unit ?? ""} steht im Blatt, wird aber nicht mitgerechnet`.trim());
  }
}

function checkImpact(id, props) {
  for (const [field, family] of Object.entries(IMPACT_FAMILY)) {
    const v = props?.[field];
    if (!v?.testStandard || v.value == null) continue;
    if (!FAMILY_RE[family].test(v.testStandard)) {
      /* Nur melden, wenn ueberhaupt eine Norm dasteht - "23 °C" ist keine. */
      if (!/ISO|ASTM|GB\/T|DIN|EN\b/i.test(v.testStandard)) continue;
      report("warn", id, "R18-impact-family",
        `${field} zitiert "${v.testStandard}" — das ist nicht ${family === "charpy" ? "Charpy" : "Izod"}`);
      continue;
    }
    const stated = NOTCH_STATED(v.testStandard);
    const wanted = /Unnotched/i.test(field) ? "unnotched" : "notched";
    if (stated && stated !== wanted) {
      report("warn", id, "R18-impact-notch",
        `${field} zitiert "${v.testStandard}" — die Norm nennt die andere Kerbart`);
    }
  }
}

if (existsSync(PRODDIR)) {
  for (const f of readdirSync(PRODDIR).filter((x) => x.endsWith(".json"))) {
    const p = JSON.parse(readFileSync(path.join(PRODDIR, f), "utf8"));
    checkImpact(p.id, p.properties);
    checkDisputed(p.id, p.properties);
    for (const [kx, kz, label] of ZPAIRS) {
      const x = p.properties?.[kx], z = p.properties?.[kz];
      if (typeof x?.value !== "number" || typeof z?.value !== "number") continue;
      if (!x.testStandard || x.testStandard !== z.testStandard) continue;
      if (z.value <= x.value) continue;
      /* Wer den Befund schon am Wert benannt hat, bekommt eine mildere Meldung - der
         Fall ist gesehen, nicht uebersehen. Erkennbar an `low` auf dem Z-Wert. */
      const ack = z.confidence === "low" || z.confidence === "estimated";
      report("warn", p.id, "R17-z-exceeds-xy",
        `${label}: Z ${z.value} > X-Y ${x.value} ${x.unit ?? ""}`.trim() +
        (ack ? " (am Datensatz benannt)" : " — quer zur Schicht kann nichts fester sein als längs"));
    }
  }
}

/* -------------------------------------------------------------------- report */

const errors = findings.filter((f) => f.sev === "error");
const warns = findings.filter((f) => f.sev === "warn");

for (const f of warns) console.log(`WARN   ${f.id} [${f.rule}] ${f.msg}`);
for (const f of errors) console.log(`ERROR  ${f.id} [${f.rule}] ${f.msg}`);

const pct = (k) => Math.round(((stats.conf[k] ?? 0) / stats.facts) * 100);
console.log(`\nDatensätze: ${stats.files} · belegte Aussagen: ${stats.facts}`);
console.log(
  `Konfidenz: high ${stats.conf.high ?? 0} (${pct("high")} %) · ` +
  `medium ${stats.conf.medium ?? 0} (${pct("medium")} %) · ` +
  `low ${stats.conf.low ?? 0} (${pct("low")} %) · ` +
  `estimated ${stats.conf.estimated ?? 0} (${pct("estimated")} %)`,
);
console.log(`\nWarnungen: ${warns.length} · Fehler: ${errors.length}`);
process.exit(errors.length ? 1 : 0);
