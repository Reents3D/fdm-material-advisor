/**
 * Die Produktauswahl der Herstelleransicht kommt aus der Adresszeile.
 *
 * Damit gehoert sie in dieselbe Fehlerklasse wie `cmp` und `chem` in
 * `url-input.test.ts`: Ein geteilter Link ist eine Eingabe von aussen, und die
 * Vergleichsansicht hat schon einmal zweitausend Spalten gerendert, weil die
 * Schaltflaeche kappte und der Parser nicht. Der Explorer hatte dieselbe Luecke ein
 * zweites Mal. Beim dritten Mal steht der Test vorher da.
 */

import { describe, expect, it } from "vitest";
import {
  BRAND_SELECTION_NONE, MAX_BRAND_COLUMNS, resolveBrandSelection,
} from "../../src/lib/brand-selection";

const available = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("Produktauswahl der Herstelleransicht", () => {
  it("belegt ohne Parameter mit den ersten Produkten vor", () => {
    /* `available` kommt gedruckt-zuerst sortiert an - die Vorbelegung trifft damit
       automatisch die aussagekraeftigsten Belege und nicht die alphabetisch ersten. */
    expect(resolveBrandSelection(null, available)).toEqual(["a", "b", "c", "d", "e", "f"]);
  });

  it("unterscheidet die leere Auswahl vom unberuehrten Zustand", () => {
    /* Ohne diesen Unterschied holt das Abwaehlen des letzten Produkts die Vorbelegung
       zurueck: Der Nutzer klickt weg, und es kommt wieder. */
    expect(resolveBrandSelection(BRAND_SELECTION_NONE, available)).toEqual([]);
    expect(resolveBrandSelection(null, available)).not.toEqual([]);
  });

  it("kappt die Liste, egal wie lang der Link ist", () => {
    const angriff = Array(2000).fill("a").join(",");
    expect(resolveBrandSelection(angriff, available).length).toBeLessThanOrEqual(MAX_BRAND_COLUMNS);
  });

  it("entfernt Wiederholungen, bevor es kappt", () => {
    /* Sonst waere `a,a,a,a,a,a,b` nach dem Kappen sechsmal A und kein B - der Nutzer
       haette seine Auswahl verloren, nicht nur den Angriff. */
    expect(resolveBrandSelection("a,a,a,a,a,a,b", available)).toEqual(["a", "b"]);
  });

  it("wirft unbekannte IDs weg, statt an ihnen zu scheitern", () => {
    expect(resolveBrandSelection("a,gibtesnicht,c", available)).toEqual(["a", "c"]);
  });

  it("prueft gegen den Bestand, BEVOR es kappt", () => {
    /* Andersherum haetten neun unbekannte IDs die beiden gueltigen dahinter
       abgeschnitten, und die Ansicht bliebe leer - fuer den Nutzer nicht von einem
       kaputten Link zu unterscheiden. */
    const raw = [...Array(9).fill("unbekannt"), "g", "h"].join(",");
    expect(resolveBrandSelection(raw, available)).toEqual(["g", "h"]);
  });

  it("liefert die Reihenfolge des Bestands, nicht die des Links", () => {
    /* Die Spaltenreihenfolge muss der Gruppierung nach Pruefkoerper folgen. Sonst
       koennte ein Link gedruckte und spritzgegossene Werte optisch mischen - genau
       die Verwechslung, gegen die diese Ansicht gebaut ist. */
    expect(resolveBrandSelection("e,b,a", available)).toEqual(["a", "b", "e"]);
  });

  it("kommt mit Leerraum und leeren Feldern im Link zurecht", () => {
    expect(resolveBrandSelection(" a , , c ", available)).toEqual(["a", "c"]);
  });

  it("bleibt leer, wenn der Werkstofftyp keine Produkte hat", () => {
    expect(resolveBrandSelection(null, [])).toEqual([]);
    expect(resolveBrandSelection("a,b", [])).toEqual([]);
  });
});
