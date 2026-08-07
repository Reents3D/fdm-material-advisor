/**
 * Der Werkstoffwert ist der Median seiner Blätter — nicht das erste importierte (ADR-042).
 *
 * DER BEFUND
 * Von 288 Kennwerten auf der Werkstoffebene tragen 199 die Quelle `src_bambu_tds`. Nicht
 * weil Bambu Lab besser misst, sondern weil Bambu zuerst importiert wurde: Jedes
 * Importskript schrieb den Werkstoffwert aus dem Blatt, das gerade auf dem Tisch lag, und
 * das nächste liess ihn stehen. Die 254 Produktdatenblätter, die seither dazukamen, sind
 * auf der Werkstoffebene nie angekommen.
 *
 * Was das im Betrieb heisst, zeigt PETG am deutlichsten:
 *
 *   Bruchdehnung, geführter Wert   9,5 %   (Bambu PETG Basic, `medium`)
 *   17 Blätter im selben Repository  5 - 150 %, Median 24 %
 *
 * Wer im Assistenten „zäh" gewichtet, bekommt PETG also mit der Bruchdehnung EINES
 * Herstellers bewertet, während das Werkzeug siebzehn kennt. Dieselbe Stelle trägt eine
 * offene Frage „Zweite unabhängige Herstellerquelle ergänzen — derzeit beruht der gesamte
 * Kennwertsatz auf einem einzigen Datenblatt". Die zweite Quelle lag die ganze Zeit im
 * Repository.
 *
 * DIE REGEL
 * Ein Werkstofftyp ist keine Rezeptur, sondern eine Familie von Rezepturen. Sein Kennwert
 * ist deshalb der MEDIAN der vergleichbaren Blätter, und seine eigentliche Aussage ist die
 * SPANNE. `min`/`max` sind im Schema wörtlich als „realistische Spanne ÜBER HERSTELLER
 * HINWEG" beschrieben — das Feld gab es von Anfang an, benutzt hat es nur der Preis.
 *
 * WAS NICHT ZUSAMMEN GEMITTELT WIRD
 *   · Spritzguss nie mit Druck. Ein spritzgegossener Prüfkörper beantwortet die Frage
 *     nicht, für die dieses Werkzeug gebaut ist. Er fliegt raus, solange ein gedruckter
 *     oder undeklarierter da ist — und wenn nur Spritzguss da ist, sagt es die Notiz.
 *   · ISO 37 nie mit ISO 527. ISO 37 ist die Elastomer-Zugprüfung mit Hantelkörper; ihre
 *     Dehnungen sind mit denen aus ISO 527 nicht vergleichbar. Betrifft TPU.
 *   · Abgeschriebene Zahlen zählen einmal. Wo `sharedLineage` sagt, dass drei Blätter
 *     denselben Zifferblock führen, sind es nicht drei Belege, sondern einer (ADR-038).
 *     Ohne diesen Schritt zöge jede weitergereichte Herstellertabelle den Median zu sich.
 *
 * WANN ES KEINEN MEDIAN GIBT
 * Nicht die Gesamtspanne entscheidet das, sondern ob die MITTE zusammenhält. Bruchdehnung
 * und Schlagzähigkeit streuen innerhalb einer Polymerfamilie zu Recht um eine
 * Grössenordnung — PLA von 2 bis 14 % ist Rezepturvielfalt, kein Fehler. Läuft dagegen
 * schon das mittlere Viertel um mehr als Faktor 4 auseinander, beschreibt die Werkstoff-ID
 * zwei verschiedene Dinge; dann steht dort keine Zahl, sondern eine offene Frage. Die
 * Gesamtspanne wird trotzdem immer berichtet — sie ist bei diesen Kennwerten die
 * eigentliche Auskunft.
 *
 * WAS BESTEHEN BLEIBT
 * Ein Wert mit Konfidenz `high` wird NICHT ersetzt. Er stammt aus einer Messung mit
 * ausgewiesener Streuung und beiden Orientierungen; ein Median über Marken ist dafür kein
 * Ersatz. Er bekommt aber die Spanne dazu — die Zahl bleibt, der Kontext kommt hinzu.
 *
 * WARUM NIE `high`
 * Der Median mehrerer Hersteller ist eine Aussage über den TYP, nicht über ein Produkt.
 * Keine einzelne Messung deckt ihn. Das Ceiling der Quelle steht deshalb auf `medium`.
 *
 * GRENZEN, DIE DIE PRÜFREGELN ZIEHEN
 * R2 (Z nie über X-Y), R3 (HDT-A nie weit über Tg) und R4 (HDT-A nie über HDT-B) sind
 * Aussagen über EINEN Datensatz. Ein Median je Feld kann sie brechen, weil die Felder aus
 * unterschiedlichen Blättersätzen stammen. Jede Schreibung wird deshalb vorher gegen diese
 * drei Regeln probegerechnet und im Konfliktfall verworfen — mit Meldung, nicht still.
 *
 *   node scripts/derive-mechanics.mjs [--dry]
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAT = path.join(ROOT, "data/materials");
const PROD = path.join(ROOT, "data/products");
const DRY = process.argv.includes("--dry");

export const SRC_ID = "src_type_datasheets";

/** Ab welcher Spanne ist es keine Streuung mehr, sondern eine andere Aussage? */
export const SPREAD_TIGHT = 2;    // darunter: `medium`
export const CORE_REFUSE = 4;     // mittleres Viertel darüber: gar kein Wert, sondern eine Frage
export const SPREAD_REMARK = 10;  // Gesamtspanne darüber: Hinweis auf Rezepturvielfalt
/** Unter so vielen Blättern ist es kein Median, sondern ein Zufall. */
export const MIN_AGGREGATE = 3;
/** Erst ab so vielen Blättern ist ein Quartil mehr als ein anderes Wort für Extremwert. */
export const MIN_FOR_QUARTILES = 6;

/* Felder, die aus Produktblättern zusammengefasst werden. Gleiche Schlüssel auf beiden
   Ebenen — das ist kein Zufall, sondern die Konvention der Importskripte. */
export const FIELDS = [
  ["mechanics", "density"],
  ["mechanics", "tensileStrengthXy"],
  ["mechanics", "tensileModulusXy"],
  ["mechanics", "elongationAtBreakXy"],
  ["mechanics", "flexuralStrengthXy"],
  ["mechanics", "flexuralModulusXy"],
  ["mechanics", "charpyUnnotchedXy"],
  ["mechanics", "charpyNotchedXy"],
  ["mechanics", "izodNotchedXy"],
  ["mechanics", "tensileStrengthZ"],
  ["mechanics", "tensileModulusZ"],
  ["mechanics", "elongationAtBreakZ"],
  ["mechanics", "flexuralStrengthZ"],
  ["mechanics", "flexuralModulusZ"],
  ["mechanics", "charpyUnnotchedZ"],
  ["mechanics", "hardnessShoreD"],
  ["thermal", "hdtA"],
  ["thermal", "hdtB"],
  ["thermal", "vicatB50"],
  ["thermal", "glassTransition"],
  ["thermal", "meltingTemperature"],
];

/* Die Einheit, die das Schema für dieses Feld verlangt. Ein Blatt, das eine andere führt,
   wird NICHT umgerechnet: Izod in J/m und Charpy in kJ/m² unterscheiden sich um die
   Prüfkörperdicke, die kein Datenblatt nennt. Solche Werte fliegen aus dem Vergleich. */
export const UNIT = Object.fromEntries([
  ...["tensileStrengthXy", "tensileModulusXy", "flexuralStrengthXy", "flexuralModulusXy",
      "tensileStrengthZ", "tensileModulusZ", "flexuralStrengthZ", "flexuralModulusZ"].map((f) => [f, "MPa"]),
  ...["elongationAtBreakXy", "elongationAtBreakZ"].map((f) => [f, "%"]),
  ...["charpyUnnotchedXy", "charpyNotchedXy", "izodNotchedXy", "charpyUnnotchedZ"].map((f) => [f, "kJ/m²"]),
  ["density", "g/cm³"], ["hardnessShoreD", "Shore D"],
  ...["hdtA", "hdtB", "vicatB50", "glassTransition", "meltingTemperature"].map((f) => [f, "°C"]),
]);

/** Dehnungs- und Zugfelder, für die ISO 37 eine andere Prüfung ist. */
const TENSILE = new Set([
  "tensileStrengthXy", "tensileModulusXy", "elongationAtBreakXy",
  "tensileStrengthZ", "tensileModulusZ", "elongationAtBreakZ",
]);

const t = (de, en) => ({ de, en });
const round = (x) => (Math.abs(x) >= 100 ? Math.round(x) : Math.round(x * 100) / 100);
const median = (a) => quantile(a, 0.5);

/** Lineare Interpolation zwischen den Rängen — dieselbe Definition wie in R (type 7). */
export function quantile(a, q) {
  const s = [...a].sort((x, y) => x - y);
  if (s.length === 1) return s[0];
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo);
}

/** Ein Ausschluss, zweisprachig. */
const drop = (list, n, de, en) => list.push({ de: `${n}× ${de}`, en: `${n}× ${en}` });

/**
 * Die Normfamilie hinter einer Prüfnormangabe. Datenblätter schreiben "ISO 527-2",
 * "ISO 527 / GB/T 1040" und "ASTM D638, 50 mm/min" für Prüfungen, die zur selben Familie
 * gehören; aneinandergehängt ergäbe das eine unlesbare Kette. Gezählt wird die Familie.
 */
function family(std) {
  if (!std) return null;
  const iso = /ISO\s*(\d+)/i.exec(std);
  if (iso) return `ISO ${iso[1]}`;
  const astm = /ASTM\s*(D\s*\d+)/i.exec(std);
  if (astm) return `ASTM ${astm[1].replace(/\s+/g, "")}`;
  const gb = /GB\/T\s*(\d+)/i.exec(std);
  if (gb) return `GB/T ${gb[1]}`;
  return std.split(/[,/]/)[0].trim() || null;
}

const products = readdirSync(PROD).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(PROD, f), "utf8")));

const byMaterial = new Map();
for (const p of products) {
  if (!byMaterial.has(p.materialId)) byMaterial.set(p.materialId, []);
  byMaterial.get(p.materialId).push(p);
}

/**
 * Die vergleichbaren Messungen eines Feldes — und was dabei aussortiert wurde.
 * Gibt `null` zurück, wenn kein Blatt das Feld führt.
 */
export function pool(prods, field) {
  let cand = prods
    .map((p) => ({ p, n: p.properties?.[field] }))
    .filter((c) => c.n?.value != null);
  if (!cand.length) return null;

  const dropped = [];

  /* Bestrittene Zahlen raus. `disputed` heisst: Die Zahl widerspricht ihrem eigenen
     Umfeld so deutlich, dass sie nicht mitgerechnet werden darf - Extrudrs 220 kJ/m²
     gekerbte Izod-Schlagzaehigkeit fuer ABS ist zehnmal der ungekerbte Wert, und
     Bambus 1.190 MPa E-Modul steht neben 22,4 MPa Zugfestigkeit auf demselben Blatt
     eines Shore-95A-Elastomers. Der Wert BLEIBT im Datensatz und in der Oberflaeche;
     er zieht nur keinen Median mehr zu sich. Der Befund steht am Wert selbst. */
  {
    const sound = cand.filter((c) => c.n.disputed !== true);
    if (sound.length && sound.length < cand.length) {
      drop(dropped, cand.length - sound.length, "bestritten", "disputed");
      cand = sound;
    }
  }

  /* Fremde Einheit raus - siehe UNIT. */
  const want = UNIT[field];
  if (want) {
    const fits = cand.filter((c) => c.n.unit === want);
    if (fits.length < cand.length) drop(dropped, cand.length - fits.length, "andere Einheit", "different unit");
    cand = fits;
    if (!cand.length) return null;
  }

  /* Spritzguss raus, solange etwas anderes da ist. */
  const nonMoulded = cand.filter((c) => c.p.specimenType !== "moulded");
  const onlyMoulded = nonMoulded.length === 0;
  if (!onlyMoulded && nonMoulded.length < cand.length) {
    drop(dropped, cand.length - nonMoulded.length, "Spritzguss", "moulded");
    cand = nonMoulded;
  }

  /* ISO 37 raus, solange etwas anderes da ist — andere Prüfkörpergeometrie. */
  if (TENSILE.has(field)) {
    const nonIso37 = cand.filter((c) => !/ISO\s*37\b/i.test(c.n.testStandard ?? ""));
    if (nonIso37.length && nonIso37.length < cand.length) {
      drop(dropped, cand.length - nonIso37.length, "ISO 37 (Elastomerprüfung)", "ISO 37 (elastomer test)");
      cand = nonIso37;
    }
  }

  /* Weitergereichte Zifferblöcke zählen einmal (ADR-038). Sonst gewichtet ein
     Herstellertabellenblatt, das drei Händler übernommen haben, dreifach. */
  const kept = [];
  const spoken = new Set();
  for (const c of [...cand].sort((a, b) => a.p.id.localeCompare(b.p.id))) {
    if (spoken.has(c.p.id)) continue;
    kept.push(c);
    const sl = c.p.sharedLineage;
    if (sl?.sharedFields?.includes(field)) for (const other of sl.with ?? []) spoken.add(other);
  }
  if (kept.length < cand.length) {
    drop(dropped, cand.length - kept.length, "zifferngleich weitergereicht", "passed on digit-identical");
    cand = kept;
  }

  const vals = cand.map((c) => c.n.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const q1 = quantile(vals, 0.25), q3 = quantile(vals, 0.75);
  const ratio = (x, y) => (x > 0 && y > 0 ? Math.max(x / y, y / x) : Infinity);
  return {
    cand, dropped, onlyMoulded,
    n: cand.length,
    med: median(vals),
    min: lo, max: hi,
    spread: ratio(hi, lo),
    /* Bei wenigen Blättern IST das Quartil der Extremwert — dann zählt die ganze Spanne. */
    core: cand.length >= MIN_FOR_QUARTILES ? ratio(q3, q1) : ratio(hi, lo),
    printed: cand.filter((c) => c.p.specimenType === "printed").length,
    unit: cand[0].n.unit,
    families: countBy(cand.map((c) => family(c.n.testStandard)).filter(Boolean)),
  };
}

/** Wie oft welche Normfamilie, absteigend. */
function countBy(list) {
  const c = new Map();
  for (const x of list) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1]);
}

/** Der Extremfall mit Marke — das ist die Information, nicht die Zahl allein. */
const edge = (pl, which) => {
  const c = pl.cand.reduce((a, b) =>
    (which === "min" ? b.n.value < a.n.value : b.n.value > a.n.value) ? b : a);
  return `${round(c.n.value)} ${pl.unit} (${c.p.brand ?? c.p.manufacturer})`;
};

/* R2/R3/R4/R10 auf dem Ergebnis nachrechnen. Gibt ALLE verletzten Regeln zurück, nicht die
   erste: Sonst verdeckt eine dokumentierte Altlast jede neue Verletzung dahinter. */
function violates(m) {
  const out = [];
  for (const [z, xy] of [
    ["tensileStrengthZ", "tensileStrengthXy"], ["flexuralStrengthZ", "flexuralStrengthXy"],
    ["tensileModulusZ", "tensileModulusXy"], ["flexuralModulusZ", "flexuralModulusXy"],
    ["elongationAtBreakZ", "elongationAtBreakXy"],
  ]) {
    const zv = m.mechanics?.[z]?.value, xv = m.mechanics?.[xy]?.value;
    if (zv != null && xv != null && zv > xv) out.push(`R2 ${z} ${round(zv)} > ${xy} ${round(xv)}`);
  }
  const isBlend = (m.identity?.variant ?? []).includes("blend");
  if (m.identity?.polymerClass === "amorphous" && !isBlend) {
    const h = m.thermal?.hdtA?.value, tg = m.thermal?.glassTransition?.value;
    if (h != null && tg != null && h > tg + 15) out.push(`R3 HDT-A ${round(h)} > Tg ${round(tg)} + 15 K`);
  }
  const a = m.thermal?.hdtA?.value, b = m.thermal?.hdtB?.value;
  if (a != null && b != null && a > b) out.push(`R4 HDT-A ${round(a)} > HDT-B ${round(b)}`);

  /* R10: Der Anisotropiefaktor stammt aus EINEM Blatt. Trifft der Quotient der beiden
     Werkstoffwerte ihn zufällig, sieht er aus wie daraus gerechnet - und genau das darf er
     nicht, wenn Z und X-Y aus verschiedenen Quellen kommen. Ein Median kann diesen Zufall
     herbeiführen; dann bleibt der Operand lieber stehen. */
  const af = m.mechanics?.anisotropyFactorTensile;
  if (af?.value != null) {
    const zs = JSON.stringify(m.mechanics?.tensileStrengthZ?.source);
    const xs = JSON.stringify(m.mechanics?.tensileStrengthXy?.source);
    const naive = m.mechanics?.tensileStrengthZ?.value / m.mechanics?.tensileStrengthXy?.value;
    if (zs !== xs && Math.abs(naive - af.value) < 0.005) {
      out.push(`R10 Anisotropiefaktor ${af.value} sähe quellengemischt gerechnet aus`);
    }
  }
  return out;
}

const SOURCE = {
  id: SRC_ID,
  type: "manufacturer-tds",
  publisher: "mehrere Hersteller",
  title: "Median der Produktdatenblätter dieses Werkstofftyps",
  confidenceCeiling: "medium",
  note: t(
    "Zusammenfassung mehrerer Herstellerdatenblätter aus data/products. Jeder Operand ist ein "
    + "Herstellerdatenblatt; die Zusammenfassung ist es nicht. Spritzguss wird nicht mit gedruckten "
    + "Prüfkörpern gemischt, ISO 37 nicht mit ISO 527. Ceiling `medium`: Ein Median über Marken ist "
    + "eine Aussage über den Werkstofftyp, keine Messung — siehe ADR-042.",
    "Aggregate of several manufacturer datasheets from data/products. Every operand is a manufacturer "
    + "datasheet; the aggregate is not. Moulded specimens are never mixed with printed ones, ISO 37 "
    + "never with ISO 527. Ceiling `medium`: a cross-brand median is a statement about the material "
    + "type, not a measurement — see ADR-042.",
  ),
};

/* Der Lauf steht in einer Funktion, damit ihn ein `import` dieser Datei NICHT ausloest.
   Die Tests brauchen `pool()` und die Schwellen; sie duerfen dabei nicht 43 Datensaetze
   ueberschreiben. */
function run() {
let written = 0, filled = 0, replaced = 0, spanOnly = 0, refused = 0, blocked = 0, retired = 0;
const log = { fill: [], replace: [], refuse: [], block: [], stale: [] };

for (const file of readdirSync(MAT).filter((f) => f.endsWith(".json"))) {
  const p = path.join(MAT, file);
  const m = JSON.parse(readFileSync(p, "utf8"));
  const prods = byMaterial.get(m.id) ?? [];
  if (!prods.length) continue;

  let touched = false;
  const questions = [];
  const oldValues = {};

  for (const [group, field] of FIELDS) {
    const pl = pool(prods, field);
    if (!pl) continue;
    const cur = m[group]?.[field];

    /* Weite Spanne wird VERMERKT — sie ist bei Dehnung und Schlagzähigkeit die Auskunft. */
    const wide = pl.n >= MIN_AGGREGATE && pl.spread > SPREAD_REMARK;
    /* Läuft schon die Mitte auseinander, beschreibt die ID zwei Dinge: keine Zahl.
       Unter sechs Blättern IST der Median eine gemessene Zahl und kein Zwischenwert - dort
       darf die blosse Streubreite ihn nicht verhindern, nur eine ganze Grössenordnung. */
    const incoherent = pl.n >= MIN_AGGREGATE
      && (pl.n >= MIN_FOR_QUARTILES ? pl.core > CORE_REFUSE : pl.spread > SPREAD_REMARK);

    if (wide || incoherent) {
      questions.push({
        id: `oq_spread_${field.toLowerCase()}`,
        question: t(
          `${field}: Die ${pl.n} Blätter dieses Werkstofftyps liegen um Faktor ${round(pl.spread)} `
          + `auseinander (${edge(pl, "min")} bis ${edge(pl, "max")})`
          + (incoherent
            ? `, und schon das mittlere Viertel um Faktor ${round(pl.core)}. Deshalb steht hier kein `
              + `Wert: Unter dieser Werkstoff-ID stehen verschiedene Rezepturen. Prüfen, ob der Typ zu teilen ist.`
            : `. Der Median trägt, das mittlere Viertel liegt um Faktor ${round(pl.core)} zusammen — `
              + `die Spanne gehört aber zur Antwort und ist am Wert vermerkt.`),
          `${field}: the ${pl.n} datasheets of this material type span a factor of ${round(pl.spread)} `
          + `(${edge(pl, "min")} to ${edge(pl, "max")})`
          + (incoherent
            ? `, and the middle quartile alone by a factor of ${round(pl.core)}. Hence no value here: this `
              + `material ID covers several formulations. Check whether the type should be split.`
            : `. The median holds — the middle quartile sits within a factor of ${round(pl.core)} — but the `
              + `range is part of the answer and is recorded at the value.`),
        ),
        blocking: false,
        affectsFields: [`${group}.${field}`],
      });
      if (incoherent) {
        refused++;
        log.refuse.push(`${m.id} ${field}: Mitte Faktor ${round(pl.core)}, gesamt ${round(pl.spread)} `
          + `über ${pl.n} Blätter`);
        continue;
      }
    }

    /* Unter drei Blättern wird nur gefüllt, nie ersetzt. */
    const isGap = !cur || cur.value == null;
    if (!isGap && pl.n < MIN_AGGREGATE) continue;
    if (isGap && pl.n < 1) continue;

    const keepValue = !isGap && cur.confidence === "high";
    const conf = pl.n >= MIN_AGGREGATE && pl.spread <= SPREAD_TIGHT ? "medium" : "low";

    const specimen = pl.onlyMoulded
      ? t("ausschliesslich spritzgegossene Prüfkörper — gedruckte Bauteile erreichen diese Werte nicht",
          "moulded specimens only — printed parts do not reach these figures")
      : pl.printed === pl.n
        ? t("alle gedruckt", "all printed")
        : t(`${pl.printed} von ${pl.n} gedruckt, Rest undeklariert`,
            `${pl.printed} of ${pl.n} printed, remainder undeclared`);

    const spanTxt = pl.n === 1
      ? t(`Einzelnes Blatt: ${pl.cand[0].p.brand ?? pl.cand[0].p.manufacturer}.`,
          `Single datasheet: ${pl.cand[0].p.brand ?? pl.cand[0].p.manufacturer}.`)
      : t(`Median aus ${pl.n} Herstellerblättern, Spanne ${edge(pl, "min")} bis ${edge(pl, "max")}.`,
          `Median of ${pl.n} manufacturer datasheets, range ${edge(pl, "min")} to ${edge(pl, "max")}.`);

    const dropTxt = pl.dropped.length
      ? t(` Nicht mitgezählt: ${pl.dropped.map((d) => d.de).join(", ")}.`,
          ` Not counted: ${pl.dropped.map((d) => d.en).join(", ")}.`)
      : t("", "");

    /* Mehrere Normfamilien nebeneinander sind keine Nebensache: Bruchdehnung nach
       ASTM D638 und nach ISO 527 misst verschiedene Prüfkörper. Also benannt, nicht
       verkettet - `testStandard` trägt die häufigste, die Notiz die Mischung. */
    const mixTxt = pl.families.length > 1
      ? t(` Prüfnormen gemischt: ${pl.families.map(([f, n]) => `${f} (${n})`).join(", ")}.`,
          ` Mixed test standards: ${pl.families.map(([f, n]) => `${f} (${n})`).join(", ")}.`)
      : t("", "");

    const keepTxt = keepValue
      ? t(` Der geführte Wert stammt aus einer Einzelmessung mit ausgewiesener Streuung und bleibt stehen; `
          + `hier steht nur die Spanne, in der er liegt.`,
          ` The recorded value comes from a single measurement with stated scatter and remains; only the `
          + `range it sits in is added here.`)
      : t("", "");

    const node = {
      ...(cur ?? {}),
      value: keepValue ? cur.value : round(pl.med),
      unit: pl.unit,
      source: keepValue ? cur.source : SRC_ID,
      confidence: keepValue ? cur.confidence : conf,
      note: t(
        `${spanTxt.de} Prüfkörper: ${specimen.de}.${mixTxt.de}${dropTxt.de}${keepTxt.de}`,
        `${spanTxt.en} Specimens: ${specimen.en}.${mixTxt.en}${dropTxt.en}${keepTxt.en}`,
      ),
    };
    /* Die Orientierung steckt im Feldnamen und ist auf der Werkstoffebene Pflicht. */
    if (group === "mechanics" && field !== "density" && field !== "hardnessShoreD") {
      node.orientation = field.endsWith("Z") ? "Z" : "XY";
    }

    /* Eine Spanne aus einem einzigen Blatt ist keine Spanne, sondern derselbe Wert zweimal.
       Und eine Spanne, die ihren eigenen Wert nicht enthält, ist ein Widerspruch: Bleibt ein
       `high`-Wert stehen, muss sie ihn einschliessen, auch wenn kein Blatt so weit ging. */
    if (pl.n > 1) {
      node.min = round(Math.min(pl.min, node.value));
      node.max = round(Math.max(pl.max, node.value));
    } else { delete node.min; delete node.max; }

    if (pl.families.length) node.testStandard = pl.families[0][0];
    if (pl.families.length > 1) node.conditions = "mehrere Prüfnormfamilien - siehe Notiz";
    else if (node.conditions === "mehrere Prüfnormfamilien - siehe Notiz") delete node.conditions;
    /* `tolerance` ist die Streuung EINER Quelle. Sie gilt für den Median nicht mehr. */
    if (!keepValue) delete node.tolerance;

    /* Probe: bricht die Schreibung eine Konsistenzregel, die vorher HIELT? Ein Datensatz,
       der schon mit einer dokumentierten Anomalie lebt, darf daran nicht alles scheitern
       lassen - sonst blockiert eine bekannte HDT-Auffälligkeit auch die Dichte. */
    const baseline = new Set(violates(m));
    const before = m[group]?.[field];
    m[group] ??= {};
    m[group][field] = node;
    const bad = violates(m).filter((v) => !baseline.has(v)).join("; ");
    if (bad) {
      if (before === undefined) delete m[group][field];
      else m[group][field] = before;
      blocked++;
      log.block.push(`${m.id} ${field}: ${bad}`);
      continue;
    }

    touched = true;
    written++;
    if (isGap) { filled++; log.fill.push(`${m.id} ${field} = ${round(pl.med)} ${pl.unit} (${pl.n} Blätter)`); }
    else if (keepValue) { spanOnly++; }
    else {
      replaced++;
      const was = before.value;
      oldValues[field] = was;
      const drift = was ? Math.max(pl.med / was, was / pl.med) : 1;
      if (drift >= 1.5) {
        log.replace.push(`${m.id} ${field}: ${round(was)} -> ${round(pl.med)} ${pl.unit} `
          + `(${pl.n} Blätter, Faktor ${round(drift)})`);
      }
    }
  }

  /* Eine offene Frage, deren Anlass weg ist, ist keine offene Frage mehr - sie ist
     Altlast. `oq_spread_*` gehoert dem Lauf, also raeumt der Lauf sie auch weg: Als
     Extrudrs falsch abgelegte Izod-Werte ins richtige Feld wanderten, verschwanden vier
     Widersprueche, deren Fragen sonst stehen geblieben waeren. */
  if (m.governance?.openQuestions?.length) {
    const live = new Set(questions.map((q) => q.id));
    const before = m.governance.openQuestions.length;
    m.governance.openQuestions = m.governance.openQuestions
      .filter((q) => !q.id.startsWith("oq_spread_") || live.has(q.id));
    if (m.governance.openQuestions.length !== before) {
      touched = true;
      retired += before - m.governance.openQuestions.length;
    }
  }

  if (questions.length) {
    m.governance ??= {};
    m.governance.openQuestions ??= [];
    for (const q of questions) {
      const i = m.governance.openQuestions.findIndex((x) => x.id === q.id);
      if (i >= 0) m.governance.openQuestions[i] = q;
      else m.governance.openQuestions.push(q);
      touched = true;
    }
  }

  /* Eine Notiz kann den NACHBARWERT zitieren. Wird der ersetzt, wird die Notiz still
     falsch - genau die Sorte Fehler, die niemand sucht, weil die Zahl daneben stimmt.
     Der Lauf kann das nicht selbst reparieren (Notizen sind Fachtext), aber er kann es
     nicht unbemerkt lassen. */
  for (const [field, old] of Object.entries(oldValues)) {
    const now = m[FIELDS.find(([, x]) => x === field)[0]][field].value;
    if (round(now) === round(old)) continue;   // gerundet gleich - die Notiz stimmt weiter
    const needle = new RegExp(`(?<![\\d,.])${String(old).replace(".", "[.,]")}(?![\\d])`);
    for (const g of ["mechanics", "thermal"]) {
      for (const [f, n] of Object.entries(m[g] ?? {})) {
        if (f === field || !n?.note?.de || n.source === SRC_ID) continue;
        /* Notizen, die ihren Ursprung selbst nennen ("beide Operanden aus dem Blatt von
           X"), zitieren nicht den Nachbarwert, sondern ein fremdes Blatt. Sie veralten
           nicht, wenn der Nachbar sich ändert. */
        if (n.derivedFrom?.length || /nicht aus diesem Datensatz/.test(n.conditions ?? "")) continue;
        if (needle.test(n.note.de)) {
          log.stale.push(`${m.id} ${g}.${f}: Notiz zitiert ${old}, ${field} trägt jetzt ${now}`);
        }
      }
    }
  }

  if (!touched) continue;

  /* Die alte offene Frage „nur ein Datenblatt" ist beantwortet, sobald der Kennwertsatz
     auf mehreren steht — die Quellen sind jetzt da, sie stehen zu lassen wäre falsch.
     Verlangt werden DREI Felder mit je drei Blättern: Ein einzelnes breit belegtes Feld
     macht aus einem Ein-Blatt-Datensatz noch keinen mehrfach belegten. */
  const broad = FIELDS.filter(([, f]) => (pool(prods, f)?.n ?? 0) >= MIN_AGGREGATE).length;
  const multi = broad >= MIN_AGGREGATE;   // drei Felder auf je drei Blättern, nicht eines
  if (multi && m.governance?.openQuestions) {
    m.governance.openQuestions = m.governance.openQuestions.filter((q) => q.id !== "oq_second_source");
  }

  m.governance ??= {};
  m.governance.sources = (m.governance.sources ?? []).filter((s) => s.id !== SRC_ID);
  if (JSON.stringify(m).includes(`"${SRC_ID}"`)) m.governance.sources.push(SOURCE);

  if (!DRY) writeFileSync(p, `${JSON.stringify(m, null, 2)}\n`);
}

const head = (s) => `\n${s}\n${"-".repeat(s.length)}`;
console.log(head("Lücken geschlossen (Werkstoff hatte keinen Wert)"));
log.fill.forEach((s) => console.log("  " + s));
console.log(head("Wert ersetzt, Abweichung ab Faktor 1,5"));
log.replace.forEach((s) => console.log("  " + s));
console.log(head("Nicht gemittelt — Spanne über Faktor 10, offene Frage gesetzt"));
log.refuse.forEach((s) => console.log("  " + s));
console.log(head("Verworfen, weil es eine Konsistenzregel gebrochen hätte"));
log.block.forEach((s) => console.log("  " + s));
console.log(head("Notiz prüfen — sie zitiert einen Wert, der ersetzt wurde"));
log.stale.forEach((s) => console.log("  " + s));
console.log(
  `\n${written} Felder geschrieben: ${filled} Lücken, ${replaced} ersetzt, ${spanOnly} nur Spanne `
  + `(Wert war \`high\`). ${refused} verweigert, ${blocked} verworfen, ${retired} erledigte Frage(n) entfernt.${DRY ? "  [--dry, nichts geschrieben]" : ""}`,
);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
