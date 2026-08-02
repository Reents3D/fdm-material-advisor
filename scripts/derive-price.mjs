/**
 * Wirtschaftlichkeit auf €/kg stellen — jetzt aus einer echten Erhebung.
 *
 * WAS VORHER FALSCH WAR
 * Der Preis stand als `priceIndex` von 1 bis 5 im Datensatz, war bei allen 38 Werkstoffen
 * geschaetzt — und trug mit Gewicht 3 das hoechste Standardgewicht ueberhaupt, gleichauf
 * mit Festigkeit und Temperatur. In einem WERKSTOFFberater. Dazu war die Verteilung
 * entartet: 29 der 38 Werkstoffe standen auf 4 oder 5, genau einer auf 1.
 *
 * Seither wird der Preis als €/kg mit Spanne gefuehrt. Zwei Gruende:
 *
 *   1. NACHPRUEFBAR. "PA6-CF kostet 70 bis 120 €/kg" kann jeder gegen einen Shop halten.
 *      "PA6-CF hat Preisindex 4" kann niemand pruefen und niemand korrigieren.
 *   2. VERHAELTNISSE BLEIBEN ERHALTEN. Zwischen PLA (19 €/kg) und PPS-CF (157 €/kg)
 *      liegt Faktor 8. Auf einer Skala von 1 bis 5 wird daraus Faktor 5 — die eigentliche
 *      Information geht verloren.
 *
 * WAS SICH JETZT AENDERT: DIE ZAHLEN SIND ERHOBEN, NICHT GESCHAETZT
 * `data/prices.json` enthaelt 120 Haendlerangebote zu 27 Werkstoffen, jedes mit Marke,
 * Produkt, Spulengewicht, Preis, Uebersichtsseite und Abrufdatum. Der gefuehrte Wert ist
 * der MEDIAN der Angebote — nicht der Mittelwert, damit ein einzelner Industriepreis die
 * Einordnung nicht kippt. `min` und `max` sind das guenstigste und teuerste tatsaechlich
 * gefundene Angebot.
 *
 * DIE ERHEBUNG HAT DIE SCHAETZUNGEN WIDERLEGT — UND ZWAR EINSEITIG
 * 14 von 16 vergleichbaren Schaetzungen lagen ZU HOCH, mehrere drastisch:
 * TPU 95A +74 %, PC-FR +67 %, ASA-CF +44 %, PC/ABS +44 %, PC +39 %. Das ist keine
 * Streuung, das ist eine Schlagseite: Geschaetzt wurde nach WERKSTOFFKLASSE — dem
 * Preispunkt, den ein technischer Werkstoff "haben sollte" — statt nach dem, was
 * Filament dieser Klasse im Handel tatsaechlich kostet. Derselbe Fehler wie seinerzeit
 * bei PPS-CF (275 statt 179 €/kg), nur diesmal flaechendeckend.
 *
 * WIE VIEL EINE ZAHL WERT IST, HAENGT DARAN, WIE VIELE ANGEBOTE SIE TRAGEN
 *   ab 5 Angeboten von mindestens 2 Haendlern -> `medium`, Spanne aus den Angeboten
 *   sonst ab 2 Angeboten                      -> `low`, Spanne aus den Angeboten
 *   genau 1         -> `low`, OHNE Spanne - aus einem Angebot laesst sich keine
 *                      ableiten, und eine erfundene waere schlimmer als keine
 *   gar keins       -> die Schaetzung bleibt stehen, ausdruecklich als solche markiert
 *
 * Der `priceIndex` bleibt fuer die grobe Anzeige erhalten, wird aber aus den €/kg
 * ABGELEITET (Quintile ueber das Feld). Damit koennen die beiden Angaben nicht
 * auseinanderlaufen.
 *
 * DIE GRENZE DIESER ZAHLEN
 * Listenpreise im europaeischen Fachhandel, inklusive Mehrwertsteuer, ohne Versand und
 * ohne Rabattaktionen. Keine Einkaufspreise und kein Angebot. Sie schwanken mit Marke,
 * Farbe, Spulengroesse und Wechselkurs, und sie altern. Korrekturen sind ausdruecklich
 * willkommen — der Weg dafuer steht auf der Herstellerseite.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data/materials");
const SURVEY = JSON.parse(readFileSync(path.join(ROOT, "data/prices.json"), "utf8"));
const SURVEYED = SURVEY.surveyedAt;

/**
 * Ab wann die Erhebung die Schaetzung schlaegt.
 *
 * Die erste Fassung verlangte drei Angebote und liess sonst die Schaetzung stehen. Das
 * war herum falsch: PPS-CF hat genau zwei Angebote - darunter den Listenpreis im
 * Herstellershop - und waere damit auf die geschaetzten 180 €/kg zurueckgefallen,
 * obwohl der Median der beiden echten Angebote bei 157 liegt. Eine Schaetzung, die
 * nachweislich systematisch zu hoch liegt, darf nicht ueber zwei nachpruefbare Preise
 * gestellt werden. Also: JEDES Angebot zaehlt mehr als gar keins.
 *
 * Was die Zahl der Angebote steuert, ist die Konfidenz - und ob es ueberhaupt eine
 * Spanne gibt. Aus einem einzigen Angebot laesst sich keine Spanne ableiten; dort steht
 * dann gar keine, statt einer, die Sicherheit vortaeuscht.
 */
const MIN_OFFERS_RANGE = 2;
const MIN_OFFERS_MEDIUM = 5;
/**
 * Fuenf Angebote von EINEM Haendler sind keine Marktspanne.
 *
 * Sichtbar geworden, als der Sammler den Extrudr-Katalog einlas: PC stand danach auf acht
 * Angeboten - alle aus demselben Shop. Das ist die Preisliste eines Anbieters, nicht der
 * Markt. Wer daraus `medium` machte, wuerde die Zahl der Produktvarianten mit der Breite
 * der Erhebung verwechseln.
 */
const MIN_RETAILERS_MEDIUM = 2;

/* Konservative Marktspannen fuer die Werkstoffe, zu denen die Erhebung (noch) zu duenn
   ist. Sie richten sich nach den MARKEN, die den Werkstoff hier tragen - nicht nach dem
   Preispunkt der Werkstoffklasse. Genau diese Verwechslung hat die Erhebung als
   flaechendeckende Schlagseite entlarvt; wo unten noch geschaetzt wird, ist die Zahl
   deshalb mit Vorsicht zu lesen. [min, max], der gefuehrte Wert ist die Mitte. */
const BAND = {
  pla: [18, 30], "pla-tough": [25, 40], hips: [22, 35],
  petg: [20, 32], abs: [20, 32], asa: [25, 40],
  greentec: [35, 55], pctg: [30, 45], pp: [35, 60],
  "petg-cf": [40, 65], "asa-cf": [45, 70], "asa-aero": [45, 70],
  "pet-cf": [80, 130], "pa6-cf": [70, 120], "pa6-gf": [65, 110],
  "pa12-cf": [55, 90], "paht-cf": [70, 120], "pps-cf": [150, 210],
  pa6: [45, 75], pa12: [60, 100], paht: [70, 120],
  pc: [45, 70], "pc-pbt": [60, 95], "pc-fr": [70, 120], "abs-pc": [45, 70],
  pmma: [45, 75], pvc: [45, 80], pvdf: [90, 140], obc: [50, 85],
  "tpu-95a": [30, 50], "tpu-98a": [30, 50],
  "tpu-85a": [35, 60], "tpu-58d": [35, 60], peba: [60, 100],
  "esd-pla": [60, 100], "esd-petg": [70, 110], "esd-abs": [70, 110], "tpu-esd": [70, 110],
  /* Neu seit 2026-08-02 - nur als Rueckfall, die Erhebung liefert echte Preise. */
  "abs-gf": [30, 50], "pla-cf": [30, 50], "pctg-gf": [35, 60],
};

const t = (de, en) => ({ de, en });
const eur = (n) => n.toFixed(2).replace(".", ",");
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 100) / 100;
};

const ESTIMATE_NOTE = t(
  `Geschätzte Marktspanne, KEIN Erhebungswert: Zu diesem Werkstoff wurde bei der Erhebung kein einziges Händlerangebot gefunden. Die Erhebung vom ${SURVEYED} hat gezeigt, dass solche Schätzungen bei 14 von 16 prüfbaren Werkstoffen zu hoch lagen — teils um mehr als die Hälfte. Diese Zahl ist deshalb im Zweifel eher zu hoch als zu niedrig.`,
  `Estimated market range, NOT a surveyed figure: the survey found no retail offer at all for this material. The survey of ${SURVEYED} showed such estimates ran high for 14 of 16 checkable materials — several by more than half. Read this figure as more likely too high than too low.`);

const INDEX_NOTE = t(
  "Abgeleitet aus commercial.pricePerKg (Quintile über alle Werkstoffe), damit beide Angaben nicht auseinanderlaufen können. Die belastbare Zahl ist der €/kg-Wert; diese Fünferskala dient nur der schnellen Einordnung.",
  "Derived from commercial.pricePerKg (quintiles across all materials) so the two figures cannot diverge. The meaningful figure is the €/kg value; this five-point scale serves only for quick orientation.");

/** Was fuer diesen Werkstoff gilt: erhoben oder geschaetzt. */
function priceFor(id) {
  const offers = SURVEY.offers[id] ?? [];
  if (offers.length > 0) {
    const pk = offers.map((o) => o.pricePerKg);
    const range = offers.length >= MIN_OFFERS_RANGE
      ? { min: Math.min(...pk), max: Math.max(...pk) }
      : {};
    const retailers = new Set(offers.map((o) => o.retailer)).size;
    const broad = offers.length >= MIN_OFFERS_MEDIUM && retailers >= MIN_RETAILERS_MEDIUM;
    return {
      surveyed: true, offers, retailers, value: median(pk), ...range,
      confidence: broad ? "medium" : "low",
    };
  }
  const b = BAND[id];
  if (!b) return null;
  return {
    surveyed: false, offers,
    value: Math.round(((b[0] + b[1]) / 2) * 10) / 10, min: b[0], max: b[1],
    confidence: "estimated",
  };
}

/* Erst alle Werte sammeln, dann die Quintilgrenzen bestimmen. */
const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const values = new Map();
for (const f of files) {
  const m = JSON.parse(readFileSync(path.join(DIR, f), "utf8"));
  const p = priceFor(m.id);
  if (p) values.set(m.id, p.value);
}
const sorted = [...values.values()].sort((a, b) => a - b);
const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const CUTS = [q(0.2), q(0.4), q(0.6), q(0.8)];
const indexOf = (v) => CUTS.filter((c) => v > c).length + 1;

let n = 0, surveyed = 0;
const missing = [];
for (const f of files) {
  const file = path.join(DIR, f);
  const m = JSON.parse(readFileSync(file, "utf8"));
  const p = priceFor(m.id);
  if (!p) { missing.push(m.id); continue; }

  m.commercial ??= {};
  /* Quellen aus dem vorigen Lauf entfernen, damit sich nichts anhaeuft. */
  m.governance.sources = (m.governance.sources ?? []).filter((x) => !x.id.startsWith("src_price_"));

  if (p.surveyed) {
    /* Je Haendler EINE Quelle - sie traegt die Uebersichtsseite, auf der die Angebote
       tatsaechlich gesehen wurden. Produktadressen wurden nicht einzeln aufgerufen und
       wuerden hier eine Genauigkeit vortaeuschen, die die Erhebung nicht hat. */
    const byRetailer = new Map();
    for (const o of p.offers) {
      if (!byRetailer.has(o.retailer)) byRetailer.set(o.retailer, []);
      byRetailer.get(o.retailer).push(o);
    }
    const srcIds = [];
    for (const [rid, list] of byRetailer) {
      const r = SURVEY.retailers[rid];
      const srcId = `src_price_${m.id.replace(/-/g, "_")}_${rid.replace(/-/g, "_")}`;
      srcIds.push(srcId);
      m.governance.sources.push({
        id: srcId, type: "retailer-listing", publisher: r.name,
        title: `${r.name} — Listenpreise ${m.identity.name}`,
        url: list[0].listingUrl, retrievedAt: list[0].retrievedAt,
        confidenceCeiling: "medium",
        note: t(
          `${list.length} Angebot${list.length === 1 ? "" : "e"}: ${list.map((o) => `${o.brand} ${o.product}, ${String(o.spoolKg).replace(".", ",")} kg, ${eur(o.priceEur)} €`).join(" · ")}`,
          `${list.length} offer${list.length === 1 ? "" : "s"}: ${list.map((o) => `${o.brand} ${o.product}, ${o.spoolKg} kg, ${o.priceEur.toFixed(2)} €`).join(" · ")}`),
      });
    }
    const brands = [...new Set(p.offers.map((o) => o.brand))];
    m.commercial.pricePerKg = {
      value: p.value,
      ...(p.min !== undefined ? { min: p.min, max: p.max } : {}),
      unit: "€/kg",
      conditions: p.offers.length === 1
        ? `Ein einzelnes Händlerangebot, auf €/kg normiert, inkl. MwSt., Stand ${SURVEYED} — keine Spanne ableitbar`
        : `Median aus ${p.offers.length} Händlerangeboten, auf €/kg normiert, inkl. MwSt., Stand ${SURVEYED}`,
      source: srcIds, confidence: p.confidence,
      note: t(
        p.offers.length === 1
          ? `Erhoben, nicht geschätzt — aber auf einem einzigen Angebot: ${p.offers[0].brand} ${p.offers[0].product}, ${String(p.offers[0].spoolKg).replace(".", ",")} kg für ${eur(p.offers[0].priceEur)} €. Eine Spanne lässt sich daraus nicht ableiten, deshalb steht keine da. Ein echter Preis ist trotzdem mehr wert als eine Schätzung: Die Erhebung hat gezeigt, dass die Schätzungen hier systematisch zu hoch lagen.`
          : `Erhoben, nicht geschätzt: ${p.offers.length} Listenpreise von ${brands.length} Marken (${brands.join(", ")}) über ${byRetailer.size} Händler, jeweils auf €/kg normiert — die Spulengröße ist dabei die eigentliche Falle, Spezialfilamente kommen auf 0,5- und 0,75-kg-Spulen. Geführt ist der Median, die Spanne ist das günstigste bis teuerste gefundene Angebot. Kein Einkaufspreis und kein Angebot; Preise ändern sich täglich.`,
        p.offers.length === 1
          ? `Surveyed, not estimated — but on a single offer: ${p.offers[0].brand} ${p.offers[0].product}, ${p.offers[0].spoolKg} kg for ${p.offers[0].priceEur.toFixed(2)} €. No range can be derived from that, so none is given. A real price still beats an estimate: the survey showed the estimates here ran systematically high.`
          : `Surveyed, not estimated: ${p.offers.length} list prices from ${brands.length} brands (${brands.join(", ")}) across ${byRetailer.size} retailer(s), each normalised to €/kg — spool size is the real trap here, specialty filaments ship on 0.5 and 0.75 kg spools. The carried value is the median, the range is the cheapest to the most expensive offer found. Not a purchase price and not an offer; prices change daily.`),
    };
    surveyed++;
  } else {
    m.commercial.pricePerKg = {
      value: p.value, min: p.min, max: p.max, unit: "€/kg",
      conditions: `1-kg-Spule, europäischer Fachhandel, geschätzt, Stand ${SURVEYED}`,
      source: "estimate_reasoning", confidence: "estimated", note: ESTIMATE_NOTE,
    };
  }

  m.commercial.priceIndex = {
    value: indexOf(p.value), scale: "priceIndex",
    derivedFrom: ["commercial.pricePerKg"],
    source: "estimate_reasoning", confidence: "estimated", note: INDEX_NOTE,
  };

  /* Die blockierende offene Frage nach der Preiserhebung ist beantwortet, sobald fuenf
     Angebote vorliegen. Bei duennerer Lage bleibt sie stehen - mit dem Stand dran. */
  const oq = m.governance.openQuestions ?? [];
  const idx = oq.findIndex((x) => /Preiserhebung/i.test(x.question?.de ?? ""));
  if (idx >= 0) {
    if (p.confidence === "medium") oq.splice(idx, 1);
    else {
      /* Blockierend bleibt die Frage nur dort, wo GAR KEIN Angebot vorliegt und die
         Zahl damit weiter eine reine Schaetzung ist. Ein oder zwei echte Preise machen
         sie nicht vollstaendig, aber sie nehmen ihr die Sprengkraft. */
      oq[idx].blocking = p.offers.length === 0;
      oq[idx].question = t(
        `Preiserhebung vertiefen: Bisher ${p.offers.length} Angebot${p.offers.length === 1 ? "" : "e"} von ${p.retailers ?? 0} Anbieter${p.retailers === 1 ? "" : "n"} (${SURVEYED}). Angestrebt sind fünf Angebote von mindestens zwei Anbietern — fünf Preise aus demselben Shop sind eine Preisliste, kein Markt. Bis dahin ${p.surveyed ? "trägt der Median mit niedriger Konfidenz" : "bleibt die Schätzung stehen"}.`,
        `Deepen the price survey: ${p.offers.length} offer${p.offers.length === 1 ? "" : "s"} from ${p.retailers ?? 0} retailer${p.retailers === 1 ? "" : "s"} (${SURVEYED}). The target is five offers from at least two retailers — five prices from one shop are a price list, not a market. Until then ${p.surveyed ? "the median carries at low confidence" : "the estimate stands"}.`);
    }
    if (!oq.length) delete m.governance.openQuestions;
  }

  writeFileSync(file, `${JSON.stringify(m, null, 2)}\n`);
  n++;
}

const dist = {};
for (const v of values.values()) { const i = indexOf(v); dist[i] = (dist[i] ?? 0) + 1; }
const offerCount = Object.values(SURVEY.offers).flat().length;

console.log(`${n} Werkstoffe mit €/kg versehen — davon ${surveyed} ERHOBEN, ${n - surveyed} geschätzt.`);
console.log(`  Erhebung: ${offerCount} Angebote zu ${Object.keys(SURVEY.offers).length} Werkstoffen, Stand ${SURVEYED}`);
console.log(`  Quintilgrenzen: ${CUTS.map((c) => `${c} €/kg`).join(" · ")}`);
console.log(`  Verteilung des abgeleiteten Index: ${Object.entries(dist).sort().map(([k, v]) => `${k}→${v}`).join("  ")}`);
console.log(`  Spanne im Feld: ${sorted[0]} bis ${sorted[sorted.length - 1]} €/kg (Faktor ${Math.round(sorted[sorted.length - 1] / sorted[0])})`);
if (missing.length) console.log(`  ! ohne Preisangabe: ${missing.join(", ")}`);
