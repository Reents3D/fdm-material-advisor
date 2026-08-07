/**
 * Side-by-side comparison of up to five materials, grouped by field group,
 * with a "differences only" switch and a sticky first column on mobile.
 *
 * Die Feldliste kommt aus src/lib/fields.ts — dieselbe, aus der der CSV-Export schöpft.
 * Zwei Listen wären zwei Wahrheiten, und die exportierte Tabelle hätte irgendwann andere
 * Zeilen als die angezeigte.
 */

import { Fragment, useState } from "react";
import { MATERIALS, byId } from "../data/materials";
import type { Quantity, Rating, Material } from "../engine/types";
import { Button, Card, RatingBar, Section, Toggle, Value, cx, text } from "../components/ui";
import { toCsv } from "../lib/csv";
import { downloadText, exportFilename } from "../lib/download";
import { compareRows } from "../lib/exports";
import { loadMaterialNotes, withNotes } from "../data/material-notes";
import { COMPARE_FIELDS, GROUP_TITLES, fieldLabel, nodeAt, numberAt, type FieldGroup } from "../lib/fields";
import type { AppState } from "../App";

type T = (k: string, p?: Record<string, string | number>) => string;

/** Gruppen in der Reihenfolge, in der sie im Feldkatalog stehen. */
const GROUP_ORDER: FieldGroup[] = [...new Set(COMPARE_FIELDS.map((d) => d.group))];

export function Compare({ state, t, update, navigate }: {
  state: AppState; t: T; update: (n: Partial<AppState>) => void;
  navigate: (p: string, n?: Partial<AppState>) => void;
}) {
  const [diffOnly, setDiffOnly] = useState(false);
  const selected = state.compare.map(byId).filter((m): m is Material => !!m);
  const { lang } = state;

  const toggle = (id: string) => {
    const next = state.compare.includes(id)
      ? state.compare.filter((x) => x !== id)
      : [...state.compare, id].slice(0, 5);
    update({ compare: next });
  };

  // Der Export nimmt immer die vollstaendige Kennwertliste, auch wenn "nur Unterschiede"
  // aktiv ist: eine Tabelle, der ohne Vermerk Zeilen fehlen, ist im Zweifel irrefuehrend.
  // Die Begruendungen je Kennwert liegen im nachgeladenen Notizbuendel; sie werden erst
  // beim Klick geholt, nicht beim Oeffnen der Vergleichsansicht.
  const exportCsv = () => { void loadMaterialNotes().then((n) => downloadText(
    exportFilename("vergleich"),
    toCsv(compareRows(selected.map((m) => withNotes(m, n)), lang), "excel-de"),
  )); };

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">{t("ui.start.compare")}</h1>

      <Card className="mb-5 no-print">
        <div className="text-sm font-medium mb-2">{t("ui.selectMaterials")}</div>
        <div className="flex flex-wrap gap-1.5">
          {MATERIALS.map((m) => {
            const on = state.compare.includes(m.id);
            const full = state.compare.length >= 5 && !on;
            return (
              <button key={m.id} onClick={() => toggle(m.id)} disabled={full} aria-pressed={on}
                className={cx("px-2 py-1 rounded text-xs border transition-colors disabled:opacity-30",
                  on ? "bg-petrol-700 text-white border-petrol-700 dark:bg-petrol-300 dark:text-ink dark:border-petrol-300"
                     : "border-hairline dark:border-[#1E2B3D] hover:border-petrol-500")}>
                {m.identity.name}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-hairline dark:border-[#1E2B3D]">
            <Toggle checked={diffOnly} onChange={setDiffOnly} label={t("ui.onlyDifferences")} />
            <Button variant="ghost" onClick={() => update({ compare: [] })}>{t("ui.reset")}</Button>
            <Button variant="ghost" onClick={exportCsv}>{t("ui.export.compare")}</Button>
            <Button variant="ghost" onClick={() => print()}>{t("ui.print")}</Button>
          </div>
        )}
      </Card>

      {!selected.length && (
        <p className="muted text-sm">
          {lang === "de" ? "Wählen Sie oben bis zu fünf Materialien." : "Select up to five materials above."}
        </p>
      )}

      {selected.length > 0 && (
        <>
          {/* DER TABELLENKOPF BLIEB NIE STEHEN - ER STAND DAUERHAFT 64 PX ZU TIEF.
              `sticky top-16` haftet nicht am Fenster, sondern am naechsten Element mit
              Ueberlauf - und das war dieser Behaelter. Er scrollt nur waagerecht, senkrecht
              also nie; aus "bleib 64 px unter der Oberkante" wurde damit eine feste
              Verschiebung um 64 px nach unten. Gemessen: Kopf bei y=2243, erste Datenzeile
              bei y=2268 - 28 px Ueberdeckung. Die Gruppenueberschrift und die Werte der
              ersten Zeile (Dichte) verschwanden unter der deckenden Kopfflaeche, und die
              Beschriftung "Material" lag hinter der Zeilenbeschriftung, weil beide auf
              z-10 standen und im Zweifel das spaetere Element gewinnt.
              (Nebenbei: `overflow-x-auto` macht auch die senkrechte Achse zum Scrollbereich -
              deshalb greift die Haftung ueberhaupt hier und nicht am Fenster.)

              Jetzt scrollt der Behaelter in BEIDEN Richtungen und ist in der Hoehe begrenzt.
              Damit haftet der Kopf an genau dem Bereich, in dem gescrollt wird, und tut,
              wofuer er gedacht war: Bei fuenfzig Kennwertzeilen bleibt sichtbar, welche
              Spalte zu welchem Werkstoff gehoert. Die Haftung sitzt an den ZELLEN, nicht
              an <thead> - Safari beherrscht sticky auf Zeilengruppen bis heute nicht
              zuverlaessig.

              Die Hoehe steht als feste Zahl da, nicht als `calc(100dvh - 9rem)`. Das war
              der erste Versuch und er faellt in sich zusammen, sobald eine Umgebung die
              Fensterhoehe mit 0 meldet: `dvh` wird dann 0, der Kasten 2 px hoch, die
              Tabelle unsichtbar. Genau das ist beim Nachmessen passiert. 44 rem zeigen rund
              zwanzig Zeilen und koennen nicht kollabieren. */}
          <div className="compare-scroll overflow-auto overscroll-contain surface p-0 max-h-[44rem]">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-max">
              <thead>
                <tr>
                  {/* Die Ecke muss ueber BEIDEM liegen: ueber den Spaltenkoepfen (z-20)
                      beim Scrollen nach rechts und ueber den Zeilenbeschriftungen (z-10)
                      beim Scrollen nach unten. */}
                  <th className="text-left font-medium py-2 px-3 sticky top-0 left-0 z-30 bg-white dark:bg-[#0E1725] w-48 min-w-48 border-b border-hairline dark:border-[#1E2B3D]">
                    {t("ui.material")}
                  </th>
                  {selected.map((m) => (
                    <th key={m.id} className="text-left font-semibold py-2 px-3 min-w-36 sticky top-0 z-20 bg-white dark:bg-[#0E1725] border-b border-hairline dark:border-[#1E2B3D]">
                      <a href={`#/material/${m.id}`} className="hl hover:underline">{m.identity.name}</a>
                      <span className="block text-xs muted font-normal">{m.identity.family}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUP_ORDER.map((group) => {
                  const rows = COMPARE_FIELDS.filter((d) => {
                    if (d.group !== group) return false;
                    const vals = selected.map((m) => numberAt(m, d));
                    if (vals.every((v) => v === null)) return false;
                    if (!diffOnly) return true;
                    return new Set(vals.map((v) => String(v))).size > 1;
                  });
                  if (!rows.length) return null;
                  return (
                    // Fragment mit key: ohne ihn warnt React bei jeder Gruppe, weil der
                    // Schluessel am inneren <tr> die Liste nicht identifiziert.
                    <Fragment key={group}>
                      <tr>
                        <td colSpan={selected.length + 1}
                          className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide muted sticky left-0 z-10 bg-white dark:bg-[#0E1725] px-3">
                          {lang === "de" ? GROUP_TITLES[group].de : GROUP_TITLES[group].en}
                        </td>
                      </tr>
                      {rows.map((d) => (
                        <tr key={`${d.group}.${d.field}`} className="border-b border-hairline/70 dark:border-[#172233]">
                          <th scope="row"
                            className="text-left font-normal muted py-1.5 px-3 sticky left-0 bg-white dark:bg-[#0E1725] z-10">
                            {fieldLabel(d, lang)}
                          </th>
                          {selected.map((m) => {
                            const v = nodeAt(m, d);
                            return (
                              <td key={m.id} className="py-1.5 px-3">
                                {/* Die Spanne stand hier bis 2026-08-07 aus: Sie machte die
                                    Tabelle breit und trug bei einer einzigen Quelle nichts
                                    bei. Seit dem Abgleich gegen die Produktblätter (ADR-042)
                                    ist sie die eigentliche Auskunft — PETG bricht zwischen
                                    5 und 150 % Dehnung, je nach Rezeptur. Ein Vergleich, der
                                    nur den Median zeigt, suggeriert eine Trennschärfe, die
                                    die Datenlage nicht hergibt. */}
                                {!v ? <span className="muted">–</span>
                                  : d.kind === "rating" ? <RatingBar r={v as Rating} lang={lang} />
                                  : <Value q={v as Quantity} lang={lang} />}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Section title={lang === "de" ? "Kurzeinordnung" : "In short"}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selected.map((m) => (
                <Card key={m.id}>
                  <a href={`#/material/${m.id}`} className="font-medium hl hover:underline">{m.identity.name}</a>
                  <p className="text-sm muted mt-1">{text(m.identity.positioning, lang)}</p>
                </Card>
              ))}
            </div>
          </Section>

          <div className="no-print">
            <Button variant="outline" onClick={() => navigate("matrix")}>{t("ui.allMaterials")} →</Button>
          </div>
        </>
      )}
    </div>
  );
}
