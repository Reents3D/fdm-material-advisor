/**
 * App-Symbole aus der Bildmarke erzeugen.
 *
 * WARUM ES DAS GIBT
 * Das Favicon war bis 2026-08-02 ein handgezeichneter Platzhalter: ein `R` aus drei
 * Linienzuegen, direkt als Daten-URI in der index.html. Es sah dem echten Zeichen
 * aehnlich genug, um nicht aufzufallen, und war doch keins. Jetzt kommen alle Symbole
 * aus der ECHTEN Bildmarke - derselben Datei, die auch auf Briefbogen und Profilbildern
 * liegt.
 *
 * WARUM NICHT IMAGEMAGICK
 * ImageMagick ist auf diesem Rechner vorhanden und scheitert an dieser Datei gleich
 * zweimal: Sein interner SVG-Renderer liest keine `<style>`-Bloecke (die Marke faerbt
 * ueber CSS-Klassen) und keine `linearGradient` mit `userSpaceOnUse`. Das Ergebnis war
 * ein graustufiges Bild mit schwarzem Grund - erkennbar erst beim Nachmessen einzelner
 * Bildpunkte, nicht beim Draufschauen. Deshalb rendert hier der Browser, der ohnehin
 * auf jedem Entwicklungsrechner steht und dieselbe Engine benutzt wie die Nutzer.
 *
 * PRUEFUNG STATT VERTRAUEN
 * Nach jedem Rendern werden drei Bildpunkte gemessen: die beiden Verlaufsenden und eine
 * Flaeche im Zeichen. Stimmen sie nicht, bricht das Skript ab. Ein stillschweigend
 * falsch gerendertes Symbol faellt sonst erst auf dem Startbildschirm eines Kunden auf.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const MARK = path.join(PUBLIC, "brand/reents-mark-square.svg");
const TMP = mkdtempSync(path.join(tmpdir(), "icons-"));

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => existsSync(p));

if (!CHROME) {
  console.error("Kein Chrome/Chromium gefunden. Die Symbole bleiben unveraendert.");
  process.exit(1);
}

/**
 * Maskierbare Symbole duerfen am Rand beschnitten werden - Android stanzt je nach
 * Geraet Kreis, Kleeblatt oder abgerundetes Quadrat aus. Sicher ist nur der innere
 * Kreis mit 80 % Durchmesser. Die Marke fuellt im Original knapp die Haelfte der
 * Kantenlaenge und liegt damit gerade so drin; mit 78 % Verkleinerung liegt sie
 * bequem drin, ohne verloren zu wirken. Der Verlauf bleibt randlos.
 */
function padded(svg, factor) {
  const box = 708.66;
  const off = (box * (1 - factor)) / 2;
  return svg.replace(
    /(<path class="cls-1")/,
    `<g transform="translate(${off.toFixed(2)} ${off.toFixed(2)}) scale(${factor})">$1`,
  ).replace(/(<\/svg>)/, "</g>$1");
}

function render(svgPath, size, out) {
  const html = path.join(TMP, `${path.basename(out)}.html`);
  writeFileSync(html, `<html><head><style>html,body{margin:0;padding:0}
img{display:block;width:${size}px;height:${size}px}</style></head>
<body><img src="file://${svgPath}"></body></html>`);
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--hide-scrollbars",
    "--force-device-scale-factor=1", `--window-size=${size},${size}`,
    `--screenshot=${out}`, html,
  ], { stdio: "ignore" });
}

/** Bildpunkt auslesen - ueber ImageMagick, das PNG kann, auch wenn es SVG nicht kann. */
function pixel(file, x, y) {
  return execFileSync("magick", [file, "-format", `%[pixel:p{${x},${y}}]`, "info:"])
    .toString().trim();
}

const svg = readFileSync(MARK, "utf8");
const maskableSvg = path.join(TMP, "maskable.svg");
writeFileSync(maskableSvg, padded(svg, 0.78));

const JOBS = [
  { src: MARK, size: 512, out: "icon-512.png", check: true },
  { src: MARK, size: 192, out: "icon-192.png", check: true },
  { src: MARK, size: 180, out: "apple-touch-icon.png", check: true },
  { src: maskableSvg, size: 512, out: "icon-maskable-512.png", check: false },
];

let failed = 0;
for (const job of JOBS) {
  const out = path.join(PUBLIC, job.out);
  render(job.src, job.size, out);

  /* Die Ecken tragen die beiden Enden des Verlaufs: oben links das dunkle #204b63,
     unten rechts das helle #95c6e5. Beim maskierbaren Symbol gilt dasselbe, weil der
     Verlauf randlos bleibt - nur das Zeichen sitzt kleiner. */
  const s = job.size;
  const tl = pixel(out, 6, 6);
  const br = pixel(out, s - 7, s - 7);
  const dark = /srgb\((3[0-9]|2[0-9]),(7[0-9]|8[0-9]),(9[0-9]|10[0-9])\)/.test(tl);
  const light = /srgb\((1[3-5][0-9]),(18[0-9]|19[0-9]|20[0-9]),(2[1-3][0-9])\)/.test(br);
  const ok = dark && light;
  console.log(`  ${job.out.padEnd(24)} ${s}×${s}  ${tl} → ${br}  ${ok ? "✓" : "✗ VERLAUF FEHLT"}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} Symbol(e) ohne Verlauf gerendert - bitte nicht ausliefern.`);
  process.exit(1);
}
console.log("\nAlle Symbole aus der echten Bildmarke erzeugt und nachgemessen.");
