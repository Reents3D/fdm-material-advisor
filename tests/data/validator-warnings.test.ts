/**
 * Warnungen des Plausibilitaetspruefers duerfen nicht unbemerkt mehr werden.
 *
 * WARUM DAS NOETIG IST
 * `validate-data.mjs` kennt zwei Schweregrade: `error` bricht den Bau, `warn` nicht.
 * Die Unterscheidung ist richtig - eine Warnung meldet einen Befund im FREMDEN
 * Datenblatt, und daran zu scheitern hiesse, eine fehlerhafte Quelle nicht mehr treu
 * wiedergeben zu koennen. Nur hat das eine Kehrseite: Eine Warnung, die niemand liest,
 * ist keine Pruefung, sondern eine Zeile im Protokoll.
 *
 * Dieser Test schliesst die Luecke, ohne die Unterscheidung aufzugeben. Die Warnungen
 * duerfen dastehen - sie duerfen nur nicht mehr werden, ohne dass jemand hinsieht.
 *
 * DER PRUEFER LAEUFT ALS UNTERPROZESS
 * Er ist ein Skript mit `process.exit()` am Ende; ihn zu importieren wuerde die Testlaeufe
 * beenden. Ihn hier nachzubauen waere schlimmer - eine Regel an zwei Stellen driftet.
 * Also: aufrufen und die Schlusszeile lesen, so wie ein Mensch es taete.
 */

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

/* Stand 2026-08-05. Untergrenze, kein Ziel: Wer einen Befund aufklaert, zieht die Zahl
   nach. Die vier sind:
     R4  pc            HDT-A ueber HDT-B im Blatt
     R12 pa6-cf, pla   Schlagzaehigkeit in Z groesser als in X-Y
     R16 extrudr-durapro-abs-cf   CF-Variante ohne Steifigkeitsgewinn */
const KNOWN_WARNINGS = 4;

const out = execFileSync("node", [path.join(ROOT, "scripts/validate-data.mjs")], {
  cwd: ROOT, encoding: "utf8",
});

describe("Plausibilitaetspruefer", () => {
  it("meldet keine Fehler", () => {
    expect(out).toMatch(/Fehler: 0\b/);
  });

  it("vermehrt die Warnungen nicht still", () => {
    const m = out.match(/Warnungen: (\d+)/);
    expect(m, "Schlusszeile des Pruefers nicht gefunden").not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(KNOWN_WARNINGS);
  });

  it("haelt den CF-Befund bei Extrudr fest", () => {
    /* DuraPro ABS CF traegt Zug- UND Biegemodul zifferngleich mit dem ungefuellten
       DuraPro ABS - 2350 und 2550 MPa. Eine Kohlefaserfuellung hebt den Modul um die
       Haelfte oder mehr; hier hebt sie ihn gar nicht. Wer die Werte glaubt, haelt ein
       gefuelltes und ein ungefuelltes ABS fuer gleich steif.

       Der Test steht hier, weil dieser Befund die Regel R16 ueberhaupt ausgeloest hat.
       Verschwindet er, ist entweder das Blatt korrigiert worden - dann gehoert die Zahl
       oben angepasst - oder die Regel greift nicht mehr. */
    expect(out).toMatch(/extrudr-durapro-abs-cf.*R16-filler-no-stiffening/);
  });
});
