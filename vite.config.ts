import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Inhaltssicherheitsrichtlinie — NUR im Build, nicht im Entwicklungsserver.
 *
 * WARUM SIE NICHT IN index.html STEHT
 * Der erste Versuch war ein Meta-Tag direkt in der Quelldatei. Ergebnis: eine vollständig
 * leere Seite unter `npm run dev` — `#root` hatte null Kinder. Vite spielt im
 * Entwicklungsbetrieb ein Inline-Modul für React Refresh ein, und `script-src 'self'`
 * erlaubt kein Inline-Skript. Der Build liefert dagegen eine einzige externe Moduldatei
 * aus; dort greift dieselbe Richtlinie ohne Nebenwirkung. Eine Sicherheitsmaßnahme, die
 * den Entwicklungsserver lahmlegt, wird beim ersten Verdruss wieder ausgebaut — deshalb
 * sitzt sie da, wo sie hingehört: am ausgelieferten Artefakt.
 *
 * WOGEGEN SIE HILFT
 * Heute gegen nichts Konkretes: Im gesamten Quelltext gibt es kein
 * dangerouslySetInnerHTML, kein innerHTML, kein eval und kein new Function. Sie ist
 * Vorsorge gegen den Rückfall — gegen eine künftige Änderung, die eine dieser Türen
 * aufmacht, und gegen eine kompromittierte Abhängigkeit, die nach Hause telefonieren
 * will. Alles ist selbst gehostet, auch die Schriften, deshalb kommt sie ohne eine
 * einzige Fremdadresse aus.
 *
 * WARUM DIE EINZELNEN RICHTUNGEN SO STEHEN
 *   script-src 'self'    nichts Fremdes, nichts Inline. Der JSON-LD-Block in index.html
 *                        ist ein Datenblock, kein ausgeführtes Skript, und fällt nicht
 *                        darunter.
 *   style-src            braucht 'unsafe-inline': React setzt Stilattribute direkt am
 *                        Element (Balken der Eignungszahl, Punkte im Kennwerte-Diagramm).
 *                        Ohne die Freigabe bleiben sie leer.
 *   img-src data:        das Favicon ist ein eingebettetes SVG in index.html.
 *   connect-src 'self'   es gibt keinen Server, zu dem etwas gehen dürfte.
 *   frame-ancestors      fehlt bewusst: Die Richtung wirkt laut Spezifikation NUR als
 *                        echte Kopfzeile und ist im Meta-Tag wirkungslos. GitHub Pages
 *                        lässt keine eigenen Kopfzeilen zu — Klickjacking-Schutz gibt es
 *                        deshalb erst nach dem Umzug auf eine eigene Domain mit
 *                        vorgelagertem CDN. Dann gehört auch diese Richtung dorthin.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

function securityHeaders(): Plugin {
  return {
    name: "reents-security-headers",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "<head>",
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n` +
          `    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
      );
    },
  };
}

// Base path is environment-driven so the same build works on GitHub Pages
// (/fdm-material-advisor/) and later on materialberater.reents3d.de (/).
export default defineConfig({
  base: process.env.VITE_BASE ?? "/fdm-material-advisor/",
  plugins: [react(), tailwindcss(), securityHeaders()],
  build: { outDir: "dist", sourcemap: false, target: "es2022" },
});
