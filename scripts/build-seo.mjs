/**
 * Statische Seiten, robots.txt und sitemap.xml — läuft NACH `vite build` in dist/.
 *
 * DAS PROBLEM, DAS DIESES SKRIPT LÖST
 * Die Anwendung nutzt Hash-Routing: Jede Ansicht liegt hinter `#/...`. Suchmaschinen
 * werfen den Fragmentteil weg — für sie ist die gesamte Anwendung EINE Seite. Ein
 * Glossareintrag zu "HDT-A gegen HDT-B" oder ein Werkstoffdatensatz zu PPS-CF ist so
 * grundsätzlich nicht auffindbar, egal wie gut er ist.
 *
 * DIE LÖSUNG UND IHRE GRENZE
 * Dieses Skript erzeugt für jeden Glossarbegriff, jeden Werkstoff und jeden
 * Anwendungsfall eine eigene statische HTML-Seite mit echtem Inhalt, eigenem Canonical
 * und strukturierten Daten. Das macht die Inhalte auffindbar, OHNE das Routing der
 * Anwendung umzubauen — ein Umbau auf History-API würde die URL-als-Zustand-Architektur
 * berühren, an der die ganze Teilbarkeit von Ergebnissen hängt.
 *
 * Die Grenze bleibt: Die interaktiven Ansichten (Assistent, Ergebnis, Diagramm) sind
 * weiterhin nur über die eine Startseite indexierbar. Das ist eine bewusste Abwägung,
 * kein Versehen.
 *
 * KEINE DÜNNEN SEITEN. Jede erzeugte Seite trägt den vollständigen erklärenden Text aus
 * den Daten und verlinkt in die Anwendung. Wo eine Seite nichts Eigenes zu sagen hätte,
 * wird sie nicht erzeugt.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SITE = "https://reents3d.github.io/fdm-material-advisor";
const TODAY = new Date().toISOString().slice(0, 10);

if (!existsSync(DIST)) {
  console.error("dist/ fehlt — bitte zuerst `npm run build`.");
  process.exit(1);
}

const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));
const de = (x) => (x && typeof x === "object" ? x.de : x) ?? "";

/** HTML-Escaping. Die Texte stammen aus eigenen Daten, aber Anführungszeichen und
    Ampersands sind darin reichlich vorhanden. */
const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const urls = [];

function page({ slug, title, description, jsonLd, h1, kicker, blocks, appHash, related }) {
  const url = `${SITE}/${slug}/`;
  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#204B63">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="FDM-Materialberater">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${SITE}/favicon.svg">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
:root{--ink:#0B1220;--muted:#5A6473;--line:#E5E7EB;--petrol:#0C4251;--accent:#95C6E5;--warn:#B45309}
*{box-sizing:border-box}
body{margin:0;background:#F9FAFB;color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:46rem;margin:0 auto;padding:2.5rem 1.25rem 4rem}
a{color:var(--petrol)}
.kicker{font-size:.72rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);margin:0 0 .4rem}
h1{font-size:1.85rem;line-height:1.2;margin:0 0 .75rem}
h2{font-size:1.05rem;margin:2rem 0 .5rem}
.lead{font-size:1.08rem;font-weight:600;margin:0 0 1rem}
p{margin:0 0 1rem}
.pitfall{border-left:3px solid var(--warn);padding:.1rem 0 .1rem .85rem;margin:1.25rem 0}
.pitfall strong{color:var(--warn)}
dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:.35rem 1.25rem}
dt{color:var(--muted)}
dd{margin:0;font-variant-numeric:tabular-nums}
.cta{display:inline-block;background:var(--petrol);color:#fff;text-decoration:none;font-weight:600;padding:.7rem 1.15rem;border-radius:.75rem;margin:.5rem 0 1.5rem}
footer{border-top:1px solid var(--line);margin-top:2.5rem;padding-top:1.25rem;font-size:.85rem;color:var(--muted)}
nav.rel{font-size:.9rem;margin-top:1.5rem}
@media(prefers-color-scheme:dark){
body{background:#070E18;color:#E8EDF2}
a{color:var(--accent)}
.cta{background:var(--accent);color:#0B1220}
footer{border-color:#1E2B3D}
:root{--muted:#93A0B4;--warn:#F0B37E}
}
</style>
</head>
<body>
<div class="wrap">
<p class="kicker">${esc(kicker)}</p>
<h1>${esc(h1)}</h1>
${blocks}
<a class="cta" href="${SITE}/${appHash}">Im Werkzeug öffnen →</a>
${related ?? ""}
<footer>
<p><strong>FDM-Materialberater</strong> — kostenloser, quelloffener Materialberater der
<a href="https://reents3d.de/?utm_source=seo&amp;utm_medium=tool&amp;utm_campaign=materialberater">Reents Technologies GmbH</a>.
Jeder Kennwert mit Quelle, Prüfnorm und Konfidenzangabe.</p>
<p>Alle Werte sind Richtwerte und ersetzen keine Bauteilqualifizierung.
Daten unter <a href="https://creativecommons.org/licenses/by/4.0/deed.de">CC BY 4.0</a> ·
<a href="https://github.com/Reents3D/fdm-material-advisor">Quellcode und Daten auf GitHub</a></p>
</footer>
</div>
</body>
</html>
`;
  const dir = path.join(DIST, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.html"), html);
  urls.push(url);
}

/* ------------------------------------------------------------------ Glossar */

const glossary = read("data/glossary.json").terms;
const termName = Object.fromEntries(glossary.map((x) => [x.id, de(x.term)]));

for (const x of glossary) {
  const rel = (x.seeAlso ?? []).filter((s) => termName[s]);
  page({
    slug: `glossar/${x.id}`,
    title: `${de(x.term)} — was der Kennwert bedeutet | FDM-Materialberater`,
    description: de(x.short),
    kicker: "Glossar",
    h1: de(x.term) + (x.unit ? ` (${x.unit})` : ""),
    appHash: `#/glossar#${x.id}`,
    jsonLd: {
      "@context": "https://schema.org", "@type": "DefinedTerm",
      name: de(x.term), description: de(x.short),
      ...(x.aliases?.length ? { alternateName: x.aliases } : {}),
      inDefinedTermSet: {
        "@type": "DefinedTermSet", name: "FDM-Materialberater — Glossar",
        url: `${SITE}/glossar/`,
      },
      url: `${SITE}/glossar/${x.id}/`,
    },
    blocks: [
      `<p class="lead">${esc(de(x.short))}</p>`,
      `<p>${esc(de(x.detail))}</p>`,
      x.pitfall ? `<div class="pitfall"><p><strong>Häufiger Irrtum.</strong> ${esc(de(x.pitfall))}</p></div>` : "",
      x.aliases?.length ? `<p><small>Auch bekannt als: ${esc(x.aliases.join(", "))}</small></p>` : "",
    ].join("\n"),
    related: rel.length
      ? `<nav class="rel">Verwandte Begriffe: ${rel.map((s) => `<a href="${SITE}/glossar/${s}/">${esc(termName[s])}</a>`).join(" · ")}</nav>`
      : "",
  });
}

/* --------------------------------------------------------------- Werkstoffe */

const matDir = path.join(ROOT, "data/materials");
const materials = readdirSync(matDir).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(matDir, f), "utf8")));

const q = (n) => (n && typeof n === "object" && n.value != null ? n : null);
const fmt = (n, unit) => (n ? `${String(n.value).replace(".", ",")}${unit ? ` ${unit}` : ""}` : null);

for (const m of materials) {
  const id = m.identity;
  const rows = [
    ["Zugfestigkeit X-Y", fmt(q(m.mechanics?.tensileStrengthXy), "MPa")],
    ["Zugfestigkeit Z", fmt(q(m.mechanics?.tensileStrengthZ), "MPa")],
    ["E-Modul X-Y", fmt(q(m.mechanics?.tensileModulusXy), "MPa")],
    ["Bruchdehnung", fmt(q(m.mechanics?.elongationAtBreakXy), "%")],
    ["Anisotropiefaktor Z/X-Y", fmt(q(m.mechanics?.anisotropyFactorTensile), "")],
    ["HDT-A (1,8 MPa)", fmt(q(m.thermal?.hdtA), "°C")],
    ["HDT-B (0,45 MPa)", fmt(q(m.thermal?.hdtB), "°C")],
    ["Dichte", fmt(q(m.mechanics?.density), "g/cm³")],
    ["Düsentemperatur", fmt(q(m.processing?.nozzleTemperature), "°C")],
    ["Beheizte Kammer", { mandatory: "zwingend", recommended: "empfohlen", "not-required": "nicht nötig" }[m.processing?.chamberRequirement?.value] ?? null],
  ].filter(([, v]) => v);

  page({
    slug: `material/${m.id}`,
    title: `${id.name} im FDM-Druck — Kennwerte, Grenzen, Einsatz | FDM-Materialberater`,
    description: de(id.abstract).slice(0, 300),
    kicker: `Werkstoff · ${id.family}`,
    h1: `${id.name} im FDM-Druck`,
    appHash: `#/material/${m.id}`,
    jsonLd: {
      "@context": "https://schema.org", "@type": "TechArticle",
      headline: `${id.name} im FDM-Druck — Kennwerte, Grenzen, Einsatz`,
      description: de(id.abstract).slice(0, 300),
      url: `${SITE}/material/${m.id}/`,
      dateModified: m.governance?.lastReviewed ?? TODAY,
      author: { "@type": "Organization", name: "Reents Technologies GmbH", url: "https://reents3d.de" },
      about: { "@type": "Thing", name: id.name, alternateName: id.aliases ?? [] },
      isPartOf: { "@type": "Dataset", name: "FDM-Materialberater — Materialdatenbank", url: `${SITE}/` },
    },
    blocks: [
      de(id.positioning) ? `<p class="lead">${esc(de(id.positioning))}</p>` : "",
      `<p>${esc(de(id.abstract))}</p>`,
      rows.length ? `<h2>Kennwerte im Überblick</h2><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : "",
      `<p><small>Diese Auswahl zeigt die wichtigsten Werte. Im Werkzeug steht zu jedem Kennwert
       die Quelle, die Prüfnorm und die Konfidenz — sowie alle übrigen Eigenschaften.</small></p>`,
      id.aliases?.length ? `<p><small>Auch bekannt als: ${esc(id.aliases.join(", "))}</small></p>` : "",
    ].join("\n"),
  });
}

/* ------------------------------------------------------------ Anwendungsfälle */

const ucDir = path.join(ROOT, "data/usecases");
const usecases = existsSync(ucDir)
  ? readdirSync(ucDir).filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(path.join(ucDir, f), "utf8")))
  : [];

for (const u of usecases) {
  const reasons = Object.entries(u.rationale ?? {});
  page({
    slug: `anwendungsfall/${u.id}`,
    title: `${de(u.title)} — welches FDM-Material passt | FDM-Materialberater`,
    description: de(u.context).slice(0, 300),
    kicker: "Anwendungsfall",
    h1: de(u.title),
    appHash: `#/usecases`,
    jsonLd: {
      "@context": "https://schema.org", "@type": "HowTo",
      name: de(u.title), description: de(u.context),
      url: `${SITE}/anwendungsfall/${u.id}/`,
      step: reasons.map(([k, v]) => ({ "@type": "HowToStep", name: k, text: de(v) })),
    },
    blocks: [
      `<p class="lead">${esc(de(u.context))}</p>`,
      reasons.length
        ? `<h2>Das Anforderungsprofil — und warum es so gesetzt ist</h2>${
            reasons.map(([, v]) => `<p>${esc(de(v))}</p>`).join("")}`
        : "",
      u.caveat ? `<div class="pitfall"><p><strong>Wichtig.</strong> ${esc(de(u.caveat))}</p></div>` : "",
    ].join("\n"),
  });
}

/* -------------------------------------------------- Übersichten, robots, sitemap */

page({
  slug: "glossar",
  title: "Glossar: Kennwerte im 3D-Druck verständlich erklärt | FDM-Materialberater",
  description: "Vicat, HDT-A, Anisotropiefaktor, Kerbschlagzähigkeit — die Begriffe aus Datenblättern, und woran man sich bei jedem üblicherweise verrechnet.",
  kicker: "Übersicht", h1: "Glossar der Werkstoffkennwerte", appHash: "#/glossar",
  jsonLd: {
    "@context": "https://schema.org", "@type": "DefinedTermSet",
    name: "FDM-Materialberater — Glossar", url: `${SITE}/glossar/`,
    hasDefinedTerm: glossary.map((x) => ({ "@type": "DefinedTerm", name: de(x.term), url: `${SITE}/glossar/${x.id}/` })),
  },
  blocks: `<p class="lead">Die Begriffe, mit denen Datenblätter arbeiten — und woran man sich bei jedem von ihnen üblicherweise verrechnet.</p>
<ul>${glossary.map((x) => `<li><a href="${SITE}/glossar/${x.id}/">${esc(de(x.term))}</a> — ${esc(de(x.short))}</li>`).join("")}</ul>`,
});

writeFileSync(path.join(DIST, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

/* Startseite zuerst, hoechste Prioritaet. */
const all = [{ loc: `${SITE}/`, pri: "1.0" }, ...urls.map((u) => ({ loc: u, pri: "0.7" }))];
writeFileSync(path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map(({ loc, pri }) => `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><priority>${pri}</priority></url>`).join("\n")}
</urlset>
`);

console.log(`${urls.length} statische Seiten, robots.txt und sitemap.xml in dist/ geschrieben`);
console.log(`  Glossar ${glossary.length} · Werkstoffe ${materials.length} · Anwendungsfälle ${usecases.length}`);
