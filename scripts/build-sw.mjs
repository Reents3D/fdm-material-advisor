/**
 * Service Worker erzeugen — läuft NACH `vite build` in dist/.
 *
 * DAS PROBLEM
 * Der Werkstoffberater wird auf Messen und in Werkstätten benutzt. Genau dort ist das
 * Netz unzuverlässig. Die Anwendung braucht keinen Server — alle Daten stecken im Bundle —
 * aber ohne Service Worker fällt sie trotzdem aus, sobald das WLAN wegbricht.
 *
 * WARUM HANDGESCHRIEBEN STATT WORKBOX
 * Die zu cachende Menge ist eine HTML-Datei, ein Bundle, ein Stylesheet, zwei Schriften
 * und ein paar Symbole. Dafür eine Bibliothek samt Buildkette einzuziehen, wäre mehr
 * Abhängigkeit als Nutzen. Die Liste entsteht hier aus dem, was tatsächlich in dist/
 * liegt — nicht aus einer gepflegten Aufzählung, die beim nächsten Umbau veraltet.
 *
 * BEWUSST OHNE skipWaiting
 * Ein Service Worker, der sich sofort aktiviert, tauscht Dateien unter einer laufenden
 * Seite aus. Diese Fassung übernimmt erst beim nächsten Laden. Der Preis: eine Aktualisierung
 * kommt einen Seitenaufruf später an. Das ist der richtige Preis für ein Werkzeug, das
 * jemand gerade im Kundengespräch offen hat.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const BASE = process.env.VITE_BASE ?? "/fdm-material-advisor/";

if (!existsSync(DIST)) {
  console.error("dist/ fehlt — bitte zuerst `npm run build`.");
  process.exit(1);
}

/** Alles, was die Anwendung zum Starten braucht. Statische Seiten und CSV bleiben aussen
    vor: sie sind für Suchmaschinen und Downloads da, nicht für den Betrieb. */
const walk = (dir, prefix = "") => {
  const out = [];
  for (const entry of readdirSync(path.join(DIST, dir))) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(DIST, rel)).isDirectory()) continue;
    out.push(prefix + entry);
  }
  return out;
};

const assets = existsSync(path.join(DIST, "assets")) ? walk("assets", "assets/") : [];
const rootFiles = readdirSync(DIST).filter((f) => {
  if (statSync(path.join(DIST, f)).isDirectory()) return false;
  return ["index.html", "manifest.webmanifest", "favicon.svg", "apple-touch-icon.png",
    "icon-192.png", "icon-512.png", "og-image.png"].includes(f);
});
const brand = existsSync(path.join(DIST, "brand")) ? walk("brand", "brand/") : [];

const precache = [BASE, ...[...rootFiles, ...assets, ...brand].map((f) => BASE + f)];

/**
 * Der Cache-Name trägt den Hash über die Dateiliste UND ihren Inhalt. Nur über die Namen
 * zu hashen reicht nicht: index.html behält ihren Namen und ändert sich trotzdem bei
 * jedem Build. Ein gleichbleibender Cache-Name würde die alte Seite konservieren.
 */
const hash = createHash("sha256");
for (const f of [...rootFiles, ...assets, ...brand].sort()) {
  hash.update(f);
  hash.update(readFileSync(path.join(DIST, f)));
}
const VERSION = hash.digest("hex").slice(0, 12);

const sw = `/*
 * Service Worker des FDM-Materialberaters — erzeugt von scripts/build-sw.mjs.
 * Nicht von Hand bearbeiten: bei jedem Build neu geschrieben.
 */
const CACHE = "fdm-materialberater-${VERSION}";
const BASE = ${JSON.stringify(BASE)};
const PRECACHE = ${JSON.stringify(precache, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/**
 * Seitenaufrufe zuerst aus dem Netz: so kommt eine neue Fassung an, sobald es Netz gibt.
 * Faellt das Netz aus, uebernimmt die zwischengespeicherte Startseite - die Anwendung
 * traegt ihre Daten im Bundle, laeuft also ohne jede weitere Anfrage.
 *
 * Der Vergleich auf BASE ist wichtig: unter derselben Herkunft liegen 81 statische
 * Seiten fuer Suchmaschinen. Wuerde jede davon unter dem Schluessel der Startseite
 * abgelegt, zeigte die Anwendung beim naechsten Start ohne Netz einen Glossareintrag
 * statt sich selbst.
 */
const isShell = (url) => new URL(url).pathname === BASE;

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (isShell(request.url) && response.ok) {
      (await caches.open(CACHE)).put(BASE, response.clone());
    }
    return response;
  } catch {
    // Ohne Netz auf einer der statischen Seiten: zur Anwendung umleiten statt deren
    // Inhalt unter fremder Adresse auszuliefern. Sonst zeigt die Adresszeile weiter
    // /glossar/..., und die Adresse steht in der Anwendung fuer den Zustand.
    if (!isShell(request.url)) return Response.redirect(BASE, 302);
    const cached = await caches.match(BASE);
    if (cached) return cached;
    throw new Error("offline und nichts im Zwischenspeicher");
  }
}

/** Dateien mit Hash im Namen aendern sich nie - was im Zwischenspeicher liegt, gilt. */
async function handleAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }
  if (url.pathname.startsWith(BASE)) {
    event.respondWith(handleAsset(request));
  }
});
`;

writeFileSync(path.join(DIST, "sw.js"), sw, "utf8");

const bytes = precache.reduce((sum, p) => {
  const rel = p.slice(BASE.length);
  const file = rel === "" ? "index.html" : rel;
  const full = path.join(DIST, file);
  return sum + (existsSync(full) ? statSync(full).size : 0);
}, 0);

console.log(`Service Worker → dist/sw.js (${VERSION})`);
console.log(`  ${precache.length} Dateien im Zwischenspeicher, ${(bytes / 1024).toFixed(0)} kB`);
