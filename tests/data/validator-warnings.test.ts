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

/* Stand 2026-08-07. OBERGRENZE, kein Ziel: Wer einen Befund aufklaert, zieht die Zahl
   nach. Die elf sind:
     R12 pa6-cf, pla   Schlagzaehigkeit in Z groesser als in X-Y (Werkstoffebene)
     R16 extrudr-durapro-abs-cf   CF-Variante ohne Steifigkeitsgewinn
     R17 bambu-pla-glow, bambu-pla-translucent, fillamentum-obc-905
         dasselbe auf der Produktebene, alle drei am Datensatz benannt
     R19 sieben bestrittene Zahlen (siehe unten)

   ZWEI VERAENDERUNGEN AM 2026-08-07, beide gewollt:

   R4 bei `pc` ist WEGGEFALLEN. Nicht weil das Blatt sich geaendert haette - Bambu meldet
   die HDT bei 1,8 MPa weiterhin ueber der bei 0,45 MPa -, sondern weil die HDT-B seit
   ADR-042 auf drei Blaettern ruht (Median 139 °C) statt allein auf diesem einen. Die
   REIHENFOLGE im Datensatz stimmt damit wieder; der Widerspruch im Blatt steht weiter in
   der Notiz und in der offenen Frage.

   R19 ist NEU und meldet sieben bestrittene Zahlen. Sie sind kein Zuwachs an Problemen,
   sondern der Ertrag einer Suche: Der Blaetterabgleich meldete fuer `abs` eine Izod-Spanne
   von Faktor 16, und dahinter standen Extrudrs 220 kJ/m² - zehnmal der ungekerbte Wert
   desselben Polymers und exakt der Lehrbuchwert fuer ABS in J/M. Vier solche Faelle bei
   Extrudr, dazu Bambus 1.190 MPa E-Modul fuer ein Shore-95A-Elastomer. Alle sieben
   bleiben im Datensatz stehen und werden nur nicht mehr mitgerechnet - deshalb `warn`
   und nicht `error`. */
const KNOWN_WARNINGS = 11;

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

  it("haelt die drei Z-ueber-X-Y-Faelle der Produktebene fest", () => {
    /* R17 ist die Verallgemeinerung von R12: acht Groessenpaare statt einem, und auf
       BEIDEN Ebenen. Gefunden hat sie ausser den zwei bekannten Bambu-Faellen einen
       dritten - Fillamentum OBC 905 mit 43,1 gegen 34,3 kJ/m² Izod. Der ist nicht
       zwingend falsch: Bei Shore D 53 und 700 % Bruchdehnung bricht die gekerbte Probe
       oft nicht durch, und dann misst man Verformungs- statt Bruchenergie. Genau
       deshalb steht er als Befund da und nicht als Korrektur. */
    for (const id of ["bambu-pla-glow", "bambu-pla-translucent", "fillamentum-obc-905"]) {
      expect(out).toContain(`${id} [R17-z-exceeds-xy]`);
    }
    /* Alle drei sind am Datensatz benannt - wer die Kennzeichnung entfernt, faellt hier
       auf, weil der Zusatz aus der Meldung verschwindet. */
    expect(out.match(/R17-z-exceeds-xy.*am Datensatz benannt/g)).toHaveLength(3);
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
