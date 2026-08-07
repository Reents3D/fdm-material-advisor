/**
 * Zweisprachige Texte einmal ausliefern statt hundertfach (ADR-041).
 *
 * DAS PROBLEM, GEMESSEN
 * Der Bestand traegt 2.580 `{de, en}`-Bloecke mit zusammen 1.423 kB. Verschieden davon
 * sind nur 950 mit 672 kB - **53 % sind woertliche Wiederholung**. Der Spitzenreiter ist
 * eine einzige Chemikaliennotiz, die 746-mal dasteht und dabei 364 kB belegt: Sie haengt
 * an jeder abgeleiteten Bestaendigkeitsbewertung, und davon gibt es 903.
 *
 * WARUM GZIP DAS NICHT ERLEDIGT
 * Der naheliegende Einwand ist, dass ein Kompressor genau dafuer da ist. Er tut es auch -
 * aber nur innerhalb seines Suchfensters von 32 kB. Zwei identische Absaetze, die im
 * Bundle 400 kB auseinanderliegen, werden zweimal voll kodiert. Gemessen an den erzeugten
 * Buendeln:
 *
 *                      gzip vorher   mit Tabelle
 *   Werkstoffkern         57 kB         51 kB
 *   Notizbuendel         105 kB         69 kB
 *
 * WIE
 * `scripts/build-data-chunks.mjs` sammelt jeden `{de, en}`-Block in eine Tabelle und
 * ersetzt ihn im Baum durch `{ $: <index> }`. Diese Datei macht das rueckgaengig.
 *
 * WARUM `{ $: n }` UND NICHT EINFACH DIE ZAHL
 * Eine nackte Zahl waere kuerzer, aber nicht unterscheidbar: `value: 12` und `note: 12`
 * saehen gleich aus, und das Aufloesen muesste eine Liste aller Schluessel kennen, die
 * i18n-Texte tragen - `note`, `question`, `abstract`, `positioning`, `features`,
 * `specimenNote`, `partLevelWarning` und weitere. Diese Liste waere bei der naechsten
 * Schemaaenderung still unvollstaendig. Ein Objekt mit genau einem Schluessel `$` ist
 * selbstbeschreibend und kostet nach der Kompression nichts.
 */

export interface I18nBlock { de: string; en: string; note?: string }

/** Ein Verweis auf die Textabelle, wie ihn der Build erzeugt. */
type Ref = { $: number };

const isRef = (n: unknown): n is Ref =>
  typeof n === "object" && n !== null && !Array.isArray(n)
  && Object.keys(n).length === 1 && typeof (n as Ref).$ === "number";

/**
 * Loest die Verweise eines erzeugten Buendels auf.
 *
 * Gibt einen NEUEN Baum zurueck. Die Textobjekte selbst werden dabei GETEILT: Alle 746
 * Stellen zeigen auf dasselbe Objekt aus der Tabelle. Das ist der Sinn der Sache und
 * unbedenklich, solange niemand sie veraendert - was in diesem Projekt ohnehin gilt
 * (`common/coding-style.md`, Immutabilitaet).
 */
export function expand<T>(bundle: { t: I18nBlock[]; d: unknown }): T {
  const table = bundle.t;
  const walk = (n: unknown): unknown => {
    if (n === null || typeof n !== "object") return n;
    if (isRef(n)) return table[n.$];
    if (Array.isArray(n)) return n.map(walk);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(n)) out[k] = walk(v);
    return out;
  };
  return walk(bundle.d) as T;
}
