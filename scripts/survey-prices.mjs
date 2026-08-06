/**
 * Preiserhebung, wiederholbar.
 *
 * WARUM ES DAS GIBT
 * Die erste Erhebung war eine Handarbeit: 94 Angebote, von Uebersichtsseiten abgelesen.
 * Das Ergebnis war gut, das Verfahren nicht — eine Preisliste altert. In drei Monaten ist
 * sie falsch, und niemand merkt es, weil nichts nachrechnet. Ein Skript, das sich mit
 * einem Aufruf wiederholen laesst, ist deshalb mehr wert als eine genauere Liste:
 * `npm run survey:prices` und das Abrufdatum stimmt wieder.
 *
 * WAS DIESES SKRIPT TUT — UND WAS AUSDRUECKLICH NICHT
 * Es liest **strukturierte Daten, die die Shops fuer Maschinen veroeffentlichen**:
 * JSON-LD nach schema.org, dieselben Bloecke, aus denen Google seine Produktkarten baut.
 * Das ist kein Auslesen gegen den Willen des Betreibers, sondern die vorgesehene
 * Nutzung — und es ist der Grund, warum Marke, Produktname, Spulengewicht und Preis
 * sauber und ohne Rateraten herauskommen.
 *
 * Vorher wurde die robots.txt gelesen. Aufgenommen ist nur, wer das Lesen erlaubt:
 *   Extrudr    `Allow: /` fuer alle, gesperrt ist nur `/api/*` — wir lesen Produktseiten,
 *              nicht die Schnittstelle.
 *   Fiberlogy  erlaubt mit `Crawl-delay: 1` und `Request-rate: 1/1s`.
 *
 * NICHT AUFGENOMMEN, UND ZWAR ABSICHTLICH:
 *   Bambu Lab EU  liegt hinter Cloudflare und beantwortet schon die robots.txt nur mit
 *                 einer Weiterleitung. Wer so deutlich sagt, dass er keine Automaten
 *                 will, bekommt keine. Der eine Bambu-Preis in data/prices.json ist von
 *                 Hand im Browser abgelesen — so, wie es jeder Kunde auch tut.
 *
 * Es wird EIN Aufruf pro Sekunde gemacht, mit einem User-Agent, der sagt, wer da liest
 * und wozu. Ein Erhebungsskript, das sich als Mensch tarnt, waere in einem Werkzeug,
 * dessen ganzer Zweck Nachvollziehbarkeit ist, ein Widerspruch in sich.
 *
 * WAS ES NICHT LOEST
 * Ein Shop ist ein Anbieter. Fuenf Angebote von Extrudr sind fuenf MARKENvarianten, aber
 * ein einziger Haendler — deshalb verlangt `derive-price.mjs` fuer `medium` Angebote von
 * mindestens zwei verschiedenen Anbietern. Das Skript sammelt; die Bewertung, wie viel
 * das wert ist, faellt woanders.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data/prices.json");

const UA = "Mozilla/5.0 (compatible; Reents3D-FDM-Materialberater/1.0; +https://github.com/Reents3D/fdm-material-advisor)";
const DELAY_MS = 1000;
const today = () => new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Welcher Produktname gehoert zu welchem Werkstofftyp.
 *
 * Die Reihenfolge entscheidet: Faserverstaerkte Typen MUESSEN vor ihrem Grundpolymer
 * stehen, sonst faengt "asa" das "durapro-asa-cf" ab und der Carbonpreis landet beim
 * unverstaerkten ASA. Was hier nicht steht, wird bewusst verworfen - lieber kein Preis
 * als ein Preis am falschen Werkstoff.
 */
const MATCH = [
  [/durapro-asa-cf/, "asa-cf"],
  [/durapro-pa6-cf/, "pa6-cf"],
  [/durapro-pa6-gf/, "pa6-gf"],
  [/durapro-pa12-cf/, "pa12-cf"],
  [/durapro-pa12$/, "pa12"],
  [/durapro-pc-fr/, "pc-fr"],
  [/durapro-pc-pbt$/, "pc-pbt"],
  [/durapro-abs$/, "abs"],
  [/durapro-asa$/, "asa"],
  [/xpetg-cf/, "petg-cf"],
  [/^(petg|xpetg-matt|xpetg-rec)$/, "petg"],
  [/^pctg$/, "pctg"],
  [/greentec/, "greentec"],
  [/^(pla-basic|pla-hs|pla-nx2-matt|pla-basic-cmyk)$/, "pla"],
  [/flex-medium-esd/, "tpu-esd"],
  [/flex-hard$/, "tpu-58d"],
  [/flex-medium(-matt)?$/, "tpu-98a"],
  [/flex-semisoft/, "tpu-85a"],
];

/**
 * Fiberlogy ordnet anders: eine Kategorieseite je Werkstoff, das Spulengewicht steht in
 * der Produktadresse (`...-1_75mm-0_85kg`) und der Preis daneben im Markup. Kein JSON-LD
 * mit Angeboten - dafuer genuegt EIN Aufruf je Werkstoff statt einer je Produkt, was der
 * hoeflichere Weg ist.
 */
const FIBERLOGY_CATEGORIES = [
  ["ABS/188", "abs"], ["Easy-ABS/191", "abs"], ["ABS-ESD/169", "esd-abs"],
  ["ASA/162", "asa"], ["Matte-ASA/163", "asa"],
  ["Easy-PET-G/145", "petg"], ["Matte-PETG/146", "petg"],
  ["PETG-CF/147", "petg-cf"], ["PETG-ESD/170", "esd-petg"],
  ["Easy-PLA/138", "pla"], ["Matte-PLA/144", "pla"], ["HS-PLA-Clear/141", "pla"],
  ["Impact-PLA/142", "pla-tough"],
  ["PCTG/155", "pctg"], ["PCABS/157", "abs-pc"],
  ["Nylon-PA12/196", "pa12"], ["Nylon-PA12-CF/153", "pa12-cf"],
  ["HIPS/193", "hips"], ["PP/168", "pp"],
  /* Seit 2026-08-02 als eigene Werkstofftypen gefuehrt (siehe import/fiberlogy-types.mjs). */
  ["ABS-GF/190", "abs-gf"],
  ["PLA-CF/143", "pla-cf"], ["PCTG-GF/164", "pctg-gf"],
];

const SHOPS = [
  {
    id: "extrudr",
    name: "Extrudr",
    country: "AT",
    url: "https://extrudr.com/",
    robots: "Allow: / (nur /api/* gesperrt), geprüft 2026-08-02",
    brand: "Extrudr",
    async collect(ctx) {
      const xml = await ctx.get("https://extrudr.com/sitemap-0.xml");
      const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
        .filter((u) => /^https:\/\/extrudr\.com\/de\/de\/products\/[^/]+\/$/.test(u));
      const slug = (u) => u.replace(/.*\/products\//, "").replace(/\/$/, "");
      const relevant = urls.filter((u) => materialOf(slug(u)));
      ctx.log(`${urls.length} Produktseiten, davon ${relevant.length} zugeordnet`);

      const out = [];
      for (const url of relevant) {
        await ctx.wait();
        let html;
        try { html = await ctx.get(url); ctx.counted(); } catch (e) { ctx.skip(`${url}: ${e.message}`); continue; }
        const mid = materialOf(slug(url));
        for (const p of jsonLdProducts(html)) {
          const offers = Array.isArray(p.offers) ? p.offers : p.offers ? [p.offers] : [];
          for (const o of offers) {
            const price = Number(o.price);
            const kg = spoolKg(String(p.name ?? ""));
            if (!Number.isFinite(price) || price <= 0 || !kg) continue;
            if ((o.priceCurrency ?? "EUR") !== "EUR") continue;
            out.push({ mid, product: String(p.name).replace(/^.*?-\s*/, ""), spoolKg: kg, priceEur: price, url });
          }
        }
      }
      return out;
    },
  },
  /**
   * Fiberlogy — STILLGELEGT am 2026-08-05, weil der Shop nicht mehr existiert.
   *
   * Am 2026-08-02 lieferte `https://fiberlogy.com/en_US/c/<Kategorie>/<id>` noch
   * Produktkacheln mit Preisen. Vier Tage spaeter antworten alle 22 Adressen mit 404.
   * Die neue Seite `/en/filaments/` enthaelt KEINE einzige Preisangabe und verweist
   * stattdessen auf "Where to Buy", "Distributor" und "Reseller": Fiberlogy hat den
   * Direktverkauf eingestellt und vertreibt ueber Haendler.
   *
   * Das ist keine kaputte Adresse, sondern eine Marktentscheidung - und deshalb wird der
   * Leser nicht repariert, sondern abgeschaltet. Die alten Angebote fallen mit dem
   * naechsten Lauf aus `data/prices.json`, und das ist richtig so: Ein Preis, dessen
   * Quelladresse mit 404 antwortet, ist von niemandem mehr nachpruefbar. Genau das
   * verlangt dieses Projekt an jeder anderen Stelle auch.
   *
   * Der Preis dafuer ist bezifferbar: Fuenf Werkstoffe (abs-gf, hips, pctg-gf, pla-cf,
   * pp) hatten bei Fiberlogy ihre EINZIGE Preisquelle und stehen danach ohne. Die
   * Bestandsuntergrenze `materialsWithPrice` faengt das ab und ist mit Begruendung
   * nachgezogen.
   *
   * Wer Fiberlogy zurueckholen will, findet die Preise kuenftig bei deren Haendlern -
   * das ist ein neuer Shop-Eintrag, kein reparierter.
   */
  {
    id: "fiberlogy",
    name: "Fiberlogy",
    country: "PL",
    url: "https://fiberlogy.com/",
    robots: "erlaubt mit Crawl-delay: 1 und Request-rate: 1/1s, geprüft 2026-08-02",
    brand: "Fiberlogy",
    retiredAt: "2026-08-05",
    retiredBecause: "Direktverkauf eingestellt — alle 22 Kategorieadressen antworten mit 404, die Nachfolgeseite nennt nur noch Händler und keine Preise",
    async collect(ctx) {
      const out = [];
      for (const [cat, mid] of FIBERLOGY_CATEGORIES) {
        await ctx.wait();
        const url = `https://fiberlogy.com/en_US/c/${cat}`;
        let html;
        try { html = await ctx.get(url); ctx.counted(); } catch (e) { ctx.skip(`${url}: ${e.message}`); continue; }
        /* Produktkachel: Adresse traegt den Namen samt Spulengewicht, der Preis steht im
           Markup dahinter. Ein grosszuegiges Fenster von 2.500 Zeichen genuegt und ist
           robuster gegen Umbauten als ein exakter Selektor. */
        for (const m of html.matchAll(/href="(\/en\/[A-Za-z0-9_.-]{8,90})"/g)) {
          const kg = spoolKg(m[1].replace(/_/g, "."));
          if (!kg) continue;
          const price = /€\s?([0-9]+\.[0-9]{2})/.exec(html.slice(m.index, m.index + 2500));
          if (!price) continue;
          out.push({
            mid, product: m[1].replace("/en/", "").replace(/-Filament.*/, "").replace(/-/g, " "),
            spoolKg: kg, priceEur: Number(price[1]), url,
          });
        }
      }
      ctx.log(`${FIBERLOGY_CATEGORIES.length} Kategorieseiten gelesen`);
      return out;
    },
  },

  /**
   * Material4Print — aufgenommen am 2026-08-05, und zwar gezielt.
   *
   * WARUM AUSGERECHNET DIESER SHOP
   * Die Erhebung hatte 23 Werkstoffe mit hoechstens EINEM Haendler, viele davon ohne
   * jeden Preis. Naheliegend waere gewesen, einen grossen Filamentshop dazuzunehmen -
   * geprueft wurde dasfilament.de, und der fuehrt praktisch nur PLA und PETG, also genau
   * die beiden Werkstoffe mit der besten Abdeckung. Der Zugewinn waere null gewesen.
   *
   * Umgekehrt gefragt - welche MARKE liefert die duennen Werkstoffe? - stand
   * Material4Print mit neun an der Spitze. Der Shop fuehrt ESD-PLA, ESD-PETG, ESD-ABS,
   * PAHT, PAHT-CF15, PET-CF15, PMMA, ABS-PC und Tough PLA: lauter Typen, fuer die es
   * bisher einen oder gar keinen Preis gab.
   *
   * WARUM DER products.json-ENDPUNKT UND NICHT DIE SEITE
   * Shopify veroeffentlicht unter `/collections/<name>/products.json` eine dokumentierte,
   * oeffentliche Produktliste - fuer Maschinen gedacht, nicht aus dem Markup gekratzt.
   * Ein Aufruf statt 124, und die Spulengroesse steht sauber im Variantentitel
   * ("1.75 mm / 0.75 Kg") statt in einer Adresse, die man raten muss.
   *
   * Die robots.txt sperrt Warenkorb, Kasse, Konto und gefilterte Sammelseiten - der
   * Produktendpunkt steht in keiner Disallow-Zeile. Geprueft am 2026-08-05.
   *
   * ACHTUNG BEIM GEWICHT: Das Feld `grams` der Variante ist das VERSANDgewicht samt
   * Spule (1.100 g bei einer 0,75-kg-Rolle). Massgeblich ist die Zahl im Titel.
   */
  {
    id: "material4print",
    name: "Material4Print",
    country: "DE",
    url: "https://www.material4print.de/",
    robots: "Allow: / — gesperrt sind Warenkorb, Kasse, Konto und gefilterte Sammelseiten; der Produktendpunkt nicht. Geprüft 2026-08-05",
    brand: "M4P",
    async collect(ctx) {
      const out = [];
      const url = "https://www.material4print.de/collections/filament/products.json?limit=250";
      const raw = await ctx.get(url); ctx.counted();
      let list;
      try { list = JSON.parse(raw).products ?? []; } catch { ctx.skip(`${url}: kein JSON`); return out; }

      /* Reihenfolge wie oben: Spezifischeres zuerst, sonst faengt /pla/ das "Tough PLA"
         und /pet/ das "PET-CF15" ab. */
      const MAP = [
        [/^paht[- ]?cf/i, "paht-cf"],
        [/^paht/i, "paht"],
        [/^pet[- ]?cf/i, "pet-cf"],
        [/^petg/i, "petg"],
        [/^abs[- ]?pc/i, "abs-pc"],
        [/^esd[- ]?pla/i, "esd-pla"],
        [/^esd[- ]?petg/i, "esd-petg"],
        [/^esd[- ]?abs/i, "esd-abs"],
        [/^tough[- ]?pla/i, "pla-tough"],
        [/^pmma/i, "pmma"],
        [/^tpu\s*95/i, "tpu-95a"],
        [/^tpu\s*98/i, "tpu-98a"],
        [/^abs/i, "abs"],
        [/^asa/i, "asa"],
        [/^pla/i, "pla"],
      ];

      for (const p of list) {
        const hit = MAP.find(([re]) => re.test(p.title));
        if (!hit) continue;
        for (const v of p.variants ?? []) {
          if (v.available === false) continue;
          /* Spulengewicht aus dem Variantentitel, NICHT aus `grams` - siehe oben. */
          const kg = /([0-9]+(?:[.,][0-9]+)?)\s*kg/i.exec(String(v.title));
          const price = Number(v.price);
          if (!kg || !Number.isFinite(price) || price <= 0) continue;
          out.push({
            mid: hit[1], product: `${p.title} — ${v.title}`,
            spoolKg: Number(kg[1].replace(",", ".")), priceEur: price, url,
          });
        }
      }
      ctx.log(`${list.length} Produkte gelesen, ${out.length} Angebote zugeordnet`);
      return out;
    },
  },
];

/* ------------------------------------------------------------------ Werkzeug */

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xml" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** Alle schema.org-Produkte einer Seite. */
function jsonLdProducts(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    let parsed;
    try { parsed = JSON.parse(m[1].trim()); } catch { continue; }
    for (const it of Array.isArray(parsed) ? parsed : [parsed]) {
      if (it?.["@type"] === "Product") out.push(it);
    }
  }
  return out;
}

/**
 * Spulengewicht aus dem Produktnamen.
 *
 * Das ist die Stelle, an der eine Preiserhebung steht und faellt: "49,99 €" heisst bei
 * einer 0,5-kg-Spule 100 €/kg und bei einer 2,3-kg-Spule 22. Wer das Gewicht nicht
 * findet, darf den Preis NICHT verwenden - eine Zahl ohne Bezugsgroesse ist keine
 * Information, sondern eine Falle.
 */
function spoolKg(name) {
  const kg = name.match(/([\d.,]+)\s?kg\b/i);
  if (kg) return Number(kg[1].replace(",", "."));
  const g = name.match(/(\d{3,4})\s?g\b/i);
  if (g) return Number(g[1]) / 1000;
  return null;
}

function materialOf(slug) {
  for (const [re, id] of MATCH) if (re.test(slug)) return id;
  return null;
}

/* -------------------------------------------------------------------- Ablauf */

const survey = JSON.parse(readFileSync(OUT, "utf8"));
/* Von Hand erhobene Angebote bleiben stehen - sie stammen aus Shops, die kein
   maschinenlesbares Angebot machen, und waeren sonst bei jedem Lauf verloren. */
for (const [mid, list] of Object.entries(survey.offers)) {
  survey.offers[mid] = list.filter((o) => o.collectedBy !== "survey-prices");
}

let fetched = 0, added = 0;
const skipped = [];
for (const shop of SHOPS) {
  /* Stillgelegte Shops werden nicht abgerufen, aber auch nicht geloescht: Der Eintrag
     samt Begruendung bleibt stehen, damit niemand den Leser als vergessen repariert. */
  if (shop.retiredAt) {
    console.log(`${shop.name}: stillgelegt am ${shop.retiredAt} — ${shop.retiredBecause}`);
    continue;
  }
  process.stdout.write(`${shop.name}: `);
  const ctx = {
    get,
    wait: () => sleep(DELAY_MS),
    counted: () => { fetched++; },
    skip: (m) => skipped.push(m),
    log: (m) => console.log(m),
  };
  let offers;
  try {
    offers = await shop.collect(ctx);
  } catch (e) {
    console.log(`nicht erreichbar (${e.message}) — übersprungen`);
    skipped.push(`${shop.name}: ${e.message}`);
    continue;
  }
  survey.retailers[shop.id] = { name: shop.name, country: shop.country, url: shop.url, robots: shop.robots };
  for (const o of offers) {
    (survey.offers[o.mid] ??= []).push({
      retailer: shop.id, brand: shop.brand, product: o.product,
      spoolKg: o.spoolKg, priceEur: o.priceEur,
      pricePerKg: Math.round((o.priceEur / o.spoolKg) * 100) / 100,
      listingUrl: o.url, retrievedAt: today(), collectedBy: "survey-prices",
    });
    added++;
  }
}

/* Doppelte Eintraege (gleicher Haendler, gleiche Marke, gleiches Produkt, gleiche Spule)
   zusammenfassen - Kategorieseiten zeigen dasselbe Produkt oft mehrfach. */
for (const [mid, list] of Object.entries(survey.offers)) {
  const seen = new Map();
  for (const o of list) seen.set(`${o.retailer}|${o.brand}|${o.product}|${o.spoolKg}`, o);
  survey.offers[mid] = [...seen.values()].sort((a, b) => a.pricePerKg - b.pricePerKg);
}
survey.surveyedAt = today();

writeFileSync(OUT, `${JSON.stringify(survey, null, 2)}\n`);

const total = Object.values(survey.offers).flat().length;
console.log(`\n${fetched} Seiten gelesen · ${added} Angebote übernommen`);
console.log(`data/prices.json: ${total} Angebote zu ${Object.keys(survey.offers).length} Werkstoffen (Stand ${survey.surveyedAt})`);
for (const [mid, list] of Object.entries(survey.offers).sort()) {
  const shops = new Set(list.map((o) => o.retailer)).size;
  const flag = list.length >= 5 && shops >= 2 ? "  ← medium" : "";
  console.log(`  ${mid.padEnd(10)} ${String(list.length).padStart(2)} Angebote von ${shops} Anbieter${shops === 1 ? "" : "n"}${flag}`);
}
if (skipped.length) console.log(`\nÜbersprungen (${skipped.length}): ${skipped.slice(0, 5).join(" · ")}`);
