/**
 * The complete material matrix as a plain table.
 *
 * Doubles as the crawlable fallback: it renders every material, its key numbers and a
 * link to its data sheet without requiring any interaction.
 */

import { useState } from "react";
import { MATERIALS } from "../data/materials";
import { dataCompleteness } from "../engine";
import type { Material, Quantity, Rating, Choice } from "../engine/types";
import { Card, Chip, ConfidenceMark, cx, fmt, text } from "../components/ui";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

const num = (v: unknown): number | null =>
  v && typeof v === "object" && "value" in (v as object) ? ((v as Quantity | Rating).value as number | null) : null;
const conf = (v: unknown) =>
  v && typeof v === "object" && "confidence" in (v as object) ? (v as Quantity).confidence : null;

type SortKey = "name" | "strength" | "hdt" | "aniso" | "density" | "completeness";

export function Matrix({ t, lang, navigate }: { t: T; lang: Lang; navigate: (p: string) => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [desc, setDesc] = useState(false);

  const value = (m: Material, k: SortKey): number | string => {
    switch (k) {
      case "strength": return num(m.mechanics?.tensileStrengthXy) ?? -1;
      case "hdt": return num(m.thermal?.hdtB) ?? -1;
      case "aniso": return num(m.mechanics?.anisotropyFactorTensile) ?? -1;
      case "density": return num(m.mechanics?.density) ?? -1;
      case "completeness": return dataCompleteness(m);
      default: return m.identity.name;
    }
  };

  const filtered = MATERIALS.filter((m) => {
    if (!q.trim()) return true;
    const hay = [m.identity.name, m.identity.family, ...(m.identity.aliases ?? [])].join(" ").toLowerCase();
    return hay.includes(q.toLowerCase());
  }).sort((a, b) => {
    const va = value(a, sort), vb = value(b, sort);
    const r = typeof va === "string" ? String(va).localeCompare(String(vb)) : (vb as number) - (va as number);
    return desc ? -r : r;
  });

  const head = (key: SortKey, label: string, cls = "") => (
    <th className={cx("text-left font-medium py-2 px-2 whitespace-nowrap", cls)}>
      <button className="hover:underline inline-flex items-center gap-1"
        onClick={() => { if (sort === key) setDesc(!desc); else { setSort(key); setDesc(false); } }}
        aria-label={`Sortieren nach ${label}`}>
        {label}{sort === key && <span aria-hidden="true">{desc ? "↑" : "↓"}</span>}
      </button>
    </th>
  );

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{t("ui.allMaterials")}</h1>
      <p className="text-sm muted mb-4">
        {lang === "de"
          ? "Alle Datensätze mit Quellen und Prüfnormen. Klicken Sie auf ein Material für das vollständige Datenblatt."
          : "Every record with sources and test standards. Click a material for the full data sheet."}
      </p>

      <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={t("ui.searchPlaceholder")} aria-label={t("ui.filter")}
        className="surface px-3 py-2 text-sm w-full sm:w-80 mb-4 bg-transparent no-print" />

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-max">
          <thead className="border-b border-neutral-300 dark:border-neutral-700">
            <tr>
              {head("name", t("ui.material"))}
              <th className="text-left font-medium py-2 px-2">Familie</th>
              {head("strength", "Zug X-Y", "text-right")}
              <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Zug Z</th>
              {head("aniso", "Aniso", "text-right")}
              {head("hdt", "HDT-B", "text-right")}
              {head("density", "Dichte", "text-right")}
              <th className="text-left font-medium py-2 px-2">Kammer</th>
              {head("completeness", "Daten", "text-right")}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => {
              const chamber = ((m.processing as Record<string, unknown>)?.chamberRequirement as Choice | undefined)?.value;
              const aniso = num(m.mechanics?.anisotropyFactorTensile);
              return (
                <tr key={m.id}
                  className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
                  onClick={() => navigate(`material/${m.id}`)}>
                  <td className="py-2 px-2 font-medium">
                    <a href={`#/material/${m.id}`} className="hl hover:underline" onClick={(e) => e.stopPropagation()}>
                      {m.identity.name}
                    </a>
                  </td>
                  <td className="py-2 px-2 muted">{m.identity.family}</td>
                  <td className="py-2 px-2 text-right tabular-nums">
                    {fmt(num(m.mechanics?.tensileStrengthXy))} <ConfidenceMark c={conf(m.mechanics?.tensileStrengthXy)} lang={lang} />
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums muted">{fmt(num(m.mechanics?.tensileStrengthZ))}</td>
                  <td className={cx("py-2 px-2 text-right tabular-nums",
                    aniso === null ? "muted" : aniso >= 0.8 ? "text-good" : aniso >= 0.6 ? "" : "text-bad")}>
                    {aniso === null ? "–" : `${Math.round(aniso * 100)} %`}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">{fmt(num(m.thermal?.hdtB))}</td>
                  <td className="py-2 px-2 text-right tabular-nums muted">{fmt(num(m.mechanics?.density))}</td>
                  <td className="py-2 px-2">
                    {chamber === "mandatory" ? <Chip tone="bad">nötig</Chip>
                      : chamber === "recommended" ? <Chip tone="ok">empfohlen</Chip>
                      : <Chip tone="good">nein</Chip>}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums muted">{dataCompleteness(m)} %</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs muted mt-3">
        {lang === "de"
          ? "Zug in MPa, HDT-B in °C nach ISO 75 bei 0,45 MPa, Dichte in g/cm³. Aniso = Anteil der Zugfestigkeit, der senkrecht zur Schicht erhalten bleibt."
          : "Tensile in MPa, HDT-B in °C per ISO 75 at 0.45 MPa, density in g/cm³. Aniso = share of tensile strength remaining perpendicular to the layers."}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        {filtered.map((m) => (
          <Card key={m.id}>
            <a href={`#/material/${m.id}`} className="font-medium hl hover:underline">{m.identity.name}</a>
            <p className="text-sm muted mt-1 leading-relaxed">{text(m.identity.abstract, lang)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
