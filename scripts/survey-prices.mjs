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

const SHOPS = [
  {
    id: "extrudr",
    name: "Extrudr",
    country: "AT",
    url: "https://extrudr.com/",
    robots: "Allow: / (nur /api/* gesperrt), geprüft 2026-08-02",
    sitemap: "https://extrudr.com/sitemap-0.xml",
    /** Aus der Sitemap nur die deutschsprachigen Produktseiten. */
    isProduct: (u) => /^https:\/\/extrudr\.com\/de\/de\/products\/[^/]+\/$/.test(u),
    slug: (u) => u.replace(/.*\/products\//, "").replace(/\/$/, ""),
    brand: () => "Extrudr",
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

let fetched = 0, added = 0, skipped = [];
for (const shop of SHOPS) {
  process.stdout.write(`${shop.name}: Sitemap … `);
  let urls;
  try {
    const xml = await get(shop.sitemap);
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter(shop.isProduct);
  } catch (e) {
    console.log(`nicht erreichbar (${e.message}) — übersprungen`);
    skipped.push(`${shop.name}: ${e.message}`);
    continue;
  }
  const relevant = urls.filter((u) => materialOf(shop.slug(u)));
  console.log(`${urls.length} Produktseiten, davon ${relevant.length} zugeordnet`);

  survey.retailers[shop.id] = { name: shop.name, country: shop.country, url: shop.url, robots: shop.robots };

  for (const url of relevant) {
    await sleep(DELAY_MS);
    let html;
    try { html = await get(url); fetched++; } catch (e) { skipped.push(`${url}: ${e.message}`); continue; }
    const mid = materialOf(shop.slug(url));
    for (const p of jsonLdProducts(html)) {
      const offers = Array.isArray(p.offers) ? p.offers : p.offers ? [p.offers] : [];
      for (const o of offers) {
        const price = Number(o.price);
        const kg = spoolKg(String(p.name ?? ""));
        if (!Number.isFinite(price) || price <= 0 || !kg) continue;
        if ((o.priceCurrency ?? "EUR") !== "EUR") continue;
        (survey.offers[mid] ??= []).push({
          retailer: shop.id, brand: shop.brand(p), product: String(p.name).replace(/^.*?-\s*/, ""),
          spoolKg: kg, priceEur: price, pricePerKg: Math.round((price / kg) * 100) / 100,
          listingUrl: url, retrievedAt: today(), collectedBy: "survey-prices",
        });
        added++;
      }
    }
  }
}

/* Doppelte Eintraege (gleiche Marke, gleiches Produkt, gleicher Haendler) zusammenfassen. */
for (const [mid, list] of Object.entries(survey.offers)) {
  const seen = new Map();
  for (const o of list) seen.set(`${o.retailer}|${o.brand}|${o.product}|${o.spoolKg}`, o);
  survey.offers[mid] = [...seen.values()].sort((a, b) => a.pricePerKg - b.pricePerKg);
}
survey.surveyedAt = today();

writeFileSync(OUT, `${JSON.stringify(survey, null, 2)}\n`);

const total = Object.values(survey.offers).flat().length;
console.log(`\n${fetched} Seiten gelesen · ${added} Angebote aus strukturierten Daten übernommen`);
console.log(`data/prices.json: ${total} Angebote zu ${Object.keys(survey.offers).length} Werkstoffen (Stand ${survey.surveyedAt})`);
for (const [mid, list] of Object.entries(survey.offers).sort()) {
  const shops = new Set(list.map((o) => o.retailer)).size;
  console.log(`  ${mid.padEnd(10)} ${String(list.length).padStart(2)} Angebote von ${shops} Anbieter${shops === 1 ? "" : "n"}`);
}
if (skipped.length) console.log(`\nÜbersprungen (${skipped.length}): ${skipped.slice(0, 5).join(" · ")}`);
