/**
 * Side-by-side comparison of up to five materials, grouped by field group,
 * with a "differences only" switch and a sticky first column on mobile.
 */

import { useState } from "react";
import { MATERIALS, byId } from "../data/materials";
import type { Quantity, Rating, Material } from "../engine/types";
import { Button, Card, RatingBar, Section, Toggle, Value, cx, text } from "../components/ui";
import type { AppState } from "../App";

type T = (k: string, p?: Record<string, string | number>) => string;

const GROUPS: { title: [string, string]; path: keyof Material; fields: string[] }[] = [
  {
    title: ["Mechanik", "Mechanics"], path: "mechanics",
    fields: ["density", "tensileStrengthXy", "tensileStrengthZ", "anisotropyFactorTensile",
      "tensileModulusXy", "elongationAtBreakXy", "flexuralStrengthXy", "charpyUnnotchedXy", "toughness"],
  },
  {
    title: ["Thermik", "Thermal"], path: "thermal",
    fields: ["hdtA", "hdtB", "glassTransition", "recommendedMaxServiceTemperature"],
  },
  {
    title: ["Verarbeitung", "Processing"], path: "processing",
    fields: ["nozzleTemperature", "bedTemperature", "dryingTemperature", "printability",
      "warpingTendency", "hygroscopy", "abrasiveness", "layerAdhesion"],
  },
  {
    title: ["Beständigkeit", "Durability"], path: "durability",
    fields: ["uvResistance", "weatherResistance", "waterAbsorption", "stressCrackingSensitivity"],
  },
  {
    title: ["Veredelung", "Finishing"], path: "finishing",
    fields: ["surfaceQuality", "paintAdhesion", "sandability", "bondability"],
  },
];

const LABEL: Record<string, string> = {
  density: "Dichte", tensileStrengthXy: "Zugfestigkeit X-Y", tensileStrengthZ: "Zugfestigkeit Z",
  anisotropyFactorTensile: "Anisotropiefaktor", tensileModulusXy: "E-Modul X-Y",
  elongationAtBreakXy: "Bruchdehnung X-Y", flexuralStrengthXy: "Biegefestigkeit X-Y",
  charpyUnnotchedXy: "Schlagzähigkeit X-Y", toughness: "Zähigkeit",
  hdtA: "HDT-A (1,8 MPa)", hdtB: "HDT-B (0,45 MPa)", glassTransition: "Tg",
  recommendedMaxServiceTemperature: "Dauereinsatz (Empfehlung)",
  nozzleTemperature: "Düse", bedTemperature: "Bett", dryingTemperature: "Trocknung",
  printability: "Druckbarkeit", warpingTendency: "Verzugsneigung", hygroscopy: "Hygroskopie",
  abrasiveness: "Abrasivität", layerAdhesion: "Schichthaftung",
  uvResistance: "UV", weatherResistance: "Witterung", waterAbsorption: "Wasseraufnahme",
  stressCrackingSensitivity: "Spannungsrisse", surfaceQuality: "Oberfläche",
  paintAdhesion: "Lackhaftung", sandability: "Schleifbarkeit", bondability: "Verklebbarkeit",
};

const isQ = (v: unknown): v is Quantity => !!v && typeof v === "object" && "unit" in (v as object);
const isR = (v: unknown): v is Rating => !!v && typeof v === "object" && "scale" in (v as object);
const raw = (v: unknown): number | null => (isQ(v) || isR(v) ? (v.value as number | null) : null);

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
                  on ? "bg-brand-700 text-white border-brand-700 dark:bg-brand-300 dark:text-ink dark:border-brand-300"
                     : "border-neutral-300 dark:border-neutral-700 hover:border-brand-500")}>
                {m.identity.name}
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <Toggle checked={diffOnly} onChange={setDiffOnly} label={t("ui.onlyDifferences")} />
            <Button variant="ghost" onClick={() => update({ compare: [] })}>{t("ui.reset")}</Button>
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
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-max">
              <thead className="sticky top-14 bg-white dark:bg-[#141414] z-10">
                <tr>
                  <th className="text-left font-medium py-2 pr-3 sticky left-0 bg-white dark:bg-[#141414] w-48 min-w-48">
                    {t("ui.material")}
                  </th>
                  {selected.map((m) => (
                    <th key={m.id} className="text-left font-semibold py-2 px-3 min-w-36 border-b border-neutral-200 dark:border-neutral-800">
                      <a href={`#/material/${m.id}`} className="hl hover:underline">{m.identity.name}</a>
                      <span className="block text-xs muted font-normal">{m.identity.family}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map((g) => {
                  const rows = g.fields.filter((f) => {
                    const vals = selected.map((m) => raw((m[g.path] as Record<string, unknown> | undefined)?.[f]));
                    if (vals.every((v) => v === null)) return false;
                    if (!diffOnly) return true;
                    return new Set(vals.map((v) => String(v))).size > 1;
                  });
                  if (!rows.length) return null;
                  return (
                    <>
                      <tr key={g.path as string}>
                        <td colSpan={selected.length + 1}
                          className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide muted sticky left-0 bg-white dark:bg-[#141414]">
                          {lang === "de" ? g.title[0] : g.title[1]}
                        </td>
                      </tr>
                      {rows.map((f) => (
                        <tr key={`${g.path as string}.${f}`} className="border-b border-neutral-100 dark:border-neutral-800">
                          <th scope="row"
                            className="text-left font-normal muted py-1.5 pr-3 sticky left-0 bg-white dark:bg-[#141414]">
                            {LABEL[f] ?? f}
                          </th>
                          {selected.map((m) => {
                            const v = (m[g.path] as Record<string, unknown> | undefined)?.[f];
                            return (
                              <td key={m.id} className="py-1.5 px-3">
                                {isQ(v) ? <Value q={v} lang={lang} showRange={false} />
                                  : isR(v) ? <RatingBar r={v} lang={lang} />
                                  : <span className="muted">–</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
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

          <Button variant="outline" onClick={() => navigate("matrix")}>{t("ui.allMaterials")} →</Button>
        </>
      )}
    </div>
  );
}
