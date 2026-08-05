/**
 * Zwei Marken duerfen sich nicht gegenseitig bestaetigen, wenn sie dieselbe Messung
 * fuehren.
 *
 * DER FEHLER, DER SICH ALS STAERKE TARNT
 * Ein Compoundeur beliefert mehrere Marken, und alle geben die Tabelle des Lieferanten
 * weiter. In einem Vergleichswerkzeug sieht das dann aus wie zwei unabhaengige
 * Hersteller, die zu denselben Zahlen kommen - das ueberzeugendste Muster, das es gibt,
 * und hier ist es eine Messung unter zwei Logos.
 *
 * Dreimal ist genau das im Bestand passiert, und dreimal ist es erst per Hand
 * aufgefallen: FormFutura/Nebula bei PLA, Alzament/Bambu bei ABS, ASA und PLA Basic,
 * FormFutura/Spectrum bei PA6-CF15 mit 10 von 10 gleichen Werten. Dreimal derselbe
 * Fehler heisst, dass er nicht durch Aufmerksamkeit verhindert wird, sondern durch eine
 * Pruefung.
 *
 * WAS DIESER TEST LEISTET UND WAS NICHT
 * Er behauptet nicht, die 16 offenen Faelle seien geklaert - sie sind es nicht. Er haelt
 * fest, wie viele es sind, damit ein Import sie nicht still vermehrt. Und er sichert die
 * Faelle, die geklaert SIND: Wer ihre Konfidenz anhebt, macht aus einer Messung wieder
 * zwei, und der Test faellt.
 *
 * Die Erkennung selbst steht in `scripts/check-lineage.ts` und wird hier importiert statt
 * nachgebaut. Eine Regel, die an zwei Stellen formuliert ist, driftet - das ist in diesem
 * Projekt schon zweimal passiert (Kappung von Listen aus der URL, Bundle-Budget).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { findLineagePairs } from "../../scripts/check-lineage.ts";

const PROD = path.resolve(__dirname, "../../data/products");

const products = readdirSync(PROD).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(path.join(PROD, f), "utf8")));

const pairs = findLineagePairs(products);
const open = pairs.filter((p: { handled: boolean }) => !p.handled);

/* Stand 2026-08-05. Untergrenze, kein Ziel: Wer einen Fall klaert, zieht die Zahl nach. */
const KNOWN_OPEN = 16;

describe("Markenuebergreifende Messungsdubletten", () => {
  it("vermehrt die offenen Faelle nicht still", () => {
    /* Ein Import bringt neue Produkte, und neue Produkte koennen alte Tabellen
       mitbringen. Wenn diese Zahl steigt, ist ein Paar dazugekommen, das noch niemand
       gelesen hat - das gehoert gesehen, bevor es in `main` liegt. */
    expect(open.length).toBeLessThanOrEqual(KNOWN_OPEN);
  });

  it("fuehrt die gefundenen Alzament-Faelle weiter als nicht eigenstaendig", () => {
    /* Die Blaetter zu ABS, ASA und PLA Basic sind zeilenweise die Bambu-Blaetter -
       10 von 14 Zeilen ziffernidentisch, samt Toleranzen und samt dem Tippfehler "MPA".
       Ihre Werte tragen deshalb `low`. Wuerde jemand sie auf `medium` heben, saehe es im
       Werkzeug wieder nach zwei Belegen aus. */
    const alzament = pairs.filter(
      (p: { a: { brand: string }; b: { brand: string } }) =>
        p.a.brand === "Alzament" || p.b.brand === "Alzament",
    );
    expect(alzament.length).toBeGreaterThanOrEqual(2);
    for (const p of alzament) expect(p.handled).toBe(true);
  });

  it("faengt nicht alles - und das gehoert festgehalten", () => {
    /* DIE PRUEFUNG IST EIN NETZ, KEIN BEWEIS.
       Von den drei per Hand belegten Alzament-Uebernahmen findet sie nur zwei. Das dritte
       Paar - Alzament PLA Basic gegen Bambu PLA Basic - kommt auf 6 von 8 gleichen
       Werten, also 75 %, und liegt damit knapp unter der Schwelle. Gleich sind dort
       ausgerechnet Dichte, beide Zug-E-Moduln, Biegefestigkeit und Zugfestigkeit in X-Y
       UND Z; verschieden sind nur Schlagzaehigkeit und Bruchdehnung.

       Die Schwelle auf 75 % zu senken wuerde diesen einen Fall einfangen und
       gleichzeitig zehn weitere aufwerfen, die niemand geprueft hat - schlechter Tausch.
       Sie bleibt, wo sie ist, und dieser Test haelt fest, dass ein Fund oberhalb der
       Schwelle kein Freispruch fuer alles darunter ist. Wer sich auf die Zahl verlaesst,
       hat den Punkt verfehlt: Gefunden wurde diese Uebernahme durch Lesen. */
    const plaBasic = pairs.find(
      (p: { a: { productName: string }; b: { productName: string } }) =>
        p.a.productName === "PLA Basic" || p.b.productName === "PLA Basic",
    );
    expect(plaBasic).toBeUndefined();
  });

  it("erkennt einen erfundenen Zwilling", () => {
    /* Gegenprobe: Ohne sie wuerde ein Test, der versehentlich nichts prueft, genauso
       gruen leuchten wie einer, der funktioniert. */
    const twin = JSON.parse(JSON.stringify(products.find((p) => p.brand === "Alzament" && p.productName === "PETG")));
    twin.id = "test-twin";
    twin.brand = "Erfundene Marke";
    const withTwin = findLineagePairs([...products, twin]);
    expect(withTwin.length).toBeGreaterThan(pairs.length);
  });
});
