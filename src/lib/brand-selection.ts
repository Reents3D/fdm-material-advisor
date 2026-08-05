/**
 * Welche Produkte in der Herstelleransicht nebeneinander stehen.
 *
 * WARUM DAS HIER LIEGT UND NICHT IN DER ANSICHT
 * Es ist eine Liste aus der Adresszeile, und damit gehoert es in dieselbe Fehlerklasse
 * wie `cmp` und `chem`: Am 2026-08-02 kappten die Schaltflaechen laengst, nur der Parser
 * tat es nicht - ein geteilter Link mit zweitausend Wiederholungen erzeugte zweitausend
 * Tabellenspalten. Der Explorer hatte dieselbe Luecke ein zweites Mal. Diese Aufloesung
 * steht deshalb als eigene Funktion hier, wo `tests/lib/url-input.test.ts` ihre
 * Nachbarn schon prueft. Eine Grenze ohne Test ist eine Grenze auf Zuruf.
 *
 * DREI ZUSTAENDE, NICHT ZWEI
 * Der Parameter fehlt, ist der Leerwert, oder nennt Produkte. Ohne den mittleren Fall
 * waere "nichts ausgewaehlt" von "noch nichts angefasst" nicht zu unterscheiden, und das
 * Abwaehlen des letzten Produkts wuerde die Vorbelegung zurueckholen - der Nutzer klickt
 * weg, und es kommt wieder.
 */

/** Hoechstens sechs Spalten. Der Werkstoffvergleich deckelt aus demselben Grund bei fünf. */
export const MAX_BRAND_COLUMNS = 6;

/** Ausdrücklich leere Auswahl. */
export const BRAND_SELECTION_NONE = "-";

/**
 * @param raw       Wert des `bp`-Parameters: `null` = unberührt, `"-"` = leer, sonst Liste
 * @param available Produkt-IDs des gewählten Werkstofftyps, in Anzeigereihenfolge
 *                  (gedruckte Prüfkörper zuerst — daraus entsteht die Vorbelegung)
 * @returns         IDs in der Reihenfolge von `available`, gekappt auf MAX_BRAND_COLUMNS
 */
export function resolveBrandSelection(raw: string | null, available: string[]): string[] {
  if (raw === null) return available.slice(0, MAX_BRAND_COLUMNS);
  if (raw === BRAND_SELECTION_NONE || raw === "") return [];

  /* Erst gegen den Bestand pruefen, dann kappen - nicht umgekehrt. Ein Link, der neun
     unbekannte IDs und danach zwei gueltige nennt, soll die zwei zeigen und nicht leer
     bleiben, weil das Kappen die gueltigen abgeschnitten hat. */
  const known = new Set(available);
  const wanted = new Set(
    raw.split(",").map((s) => s.trim()).filter((s) => known.has(s)),
  );
  return available.filter((id) => wanted.has(id)).slice(0, MAX_BRAND_COLUMNS);
}
