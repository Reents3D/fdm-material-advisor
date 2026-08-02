/**
 * The complete material matrix as a plain table.
 *
 * Doubles as the crawlable fallback: it renders every material, its key numbers and a
 * link to its data sheet without requiring any interaction.
 */

import { useState } from "react";
import { MATERIALS } from "../data/materials";
import { PRODUCTS } from "../data/products";
import { dataCompleteness } from "../engine";
import type { Material, Quantity, Rating, Choice } from "../engine/types";
import { Button, Card, Chip, ConfidenceMark, cx, fmt, text } from "../components/ui";
import { tableToCsv, toCsv } from "../lib/csv";
import { downloadText, exportFilename } from "../lib/download";
import { overviewColumns, productRows, valueRows } from "../lib/exports";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

const num = (v: unknown): number | null =>
  v && typeof v === "object" && "value" in (v as object) ? ((v as Quantity | Rating).value as number | null) : null;
const conf = (v: unknown) =>
  v && typeof v === "object" && "confidence" in (v as object) ? (v as Quantity).confidence : null;

type SortKey = "name" | "strength" | "hdt" | "aniso" | "density" | "price" | "value" | "completeness";

/** Zugfestigkeit je Euro Materialpreis - "was bekomme ich fuer mein Geld".
    Aus der Werkstatt: "So kann man auch Festigkeiten gegenueber des Preises
    einschaetzen." Beide Werte stehen im Datensatz, die Division ist Arithmetik. */
const strengthPerEuro = (m: Material): number | null => {
  const s = num(m.mechanics?.tensileStrengthXy);
  const p = num((m.commercial as Record<string, unknown>)?.pricePerKg);
  return s !== null && p ? s / p : null;
};

const ATTRIBUTION = {
  de: "Materialdaten: FDM-Materialberater der Reents Technologies GmbH (https://reents3d.de), "
    + "lizenziert unter CC BY 4.0. Quelle: https://github.com/Reents3D/fdm-material-advisor",
  en: "Material data: FDM Material Advisor by Reents Technologies GmbH (https://reents3d.de), "
    + "licensed under CC BY 4.0. Source: https://github.com/Reents3D/fdm-material-advisor",
};

export function Matrix({ t, lang, navigate }: { t: T; lang: Lang; navigate: (p: string) => void }) {
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");
  const [desc, setDesc] = useState(false);

  const value = (m: Material, k: SortKey): number | string => {
    switch (k) {
      case "strength": return num(m.mechanics?.tensileStrengthXy) ?? -1;
      case "hdt": return num(m.thermal?.hdtB) ?? -1;
      case "aniso": return num(m.mechanics?.anisotropyFactorTensile) ?? -1;
      case "density": return num(m.mechanics?.density) ?? -1;
      case "price": return num((m.commercial as Record<string, unknown>)?.pricePerKg) ?? -1;
      case "value": return strengthPerEuro(m) ?? -1;
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
          <thead className="border-b border-hairline dark:border-[#1E2B3D]">
            <tr>
              {head("name", t("ui.material"))}
              <th className="text-left font-medium py-2 px-2">Familie</th>
              {head("strength", "Zug X-Y", "text-right")}
              <th className="text-right font-medium py-2 px-2 whitespace-nowrap">Zug Z</th>
              {head("aniso", "Aniso", "text-right")}
              {head("hdt", "HDT-B", "text-right")}
              {head("density", "Dichte", "text-right")}
              {head("price", lang === "de" ? "€/kg" : "€/kg", "text-right")}
              {head("value", lang === "de" ? "MPa je €/kg" : "MPa per €/kg", "text-right")}
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
                  className="border-b border-hairline/70 dark:border-[#172233] hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer"
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
                  <td className="py-2 px-2 text-right tabular-nums">{fmt(num((m.commercial as Record<string, unknown>)?.pricePerKg))}</td>
                  <td className="py-2 px-2 text-right tabular-nums muted">
                    {strengthPerEuro(m) === null ? "–" : (Math.round(strengthPerEuro(m)! * 10) / 10).toLocaleString("de-DE")}
                  </td>
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

      {/* Mitnehmen statt abschreiben. Der Export bildet immer den aktuellen Bestand ab,
          nicht die gerade gefilterte Ansicht — eine Datenbank, der ohne Vermerk Zeilen
          fehlen, führt beim Empfänger in die Irre. */}
      <Card className="mt-8 no-print">
        <h2 className="font-display font-bold text-[15px] mb-1.5">{t("ui.export.title")}</h2>
        <p className="text-sm muted leading-relaxed mb-3 max-w-3xl">{t("ui.export.hint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"
            onClick={() => downloadText(exportFilename("uebersicht"),
              tableToCsv(MATERIALS, overviewColumns(lang), "excel-de"))}>
            {t("ui.export.overview")}
            <span className="muted font-normal"> · {MATERIALS.length} {lang === "de" ? "Zeilen" : "rows"}</span>
          </Button>
          <Button variant="outline"
            onClick={() => downloadText(exportFilename("kennwerte"),
              toCsv(valueRows(MATERIALS, lang), "excel-de"))}>
            {t("ui.export.values")}
          </Button>
          <Button variant="outline"
            onClick={() => downloadText(exportFilename("hersteller-produkte"),
              toCsv(productRows(PRODUCTS, MATERIALS, lang), "excel-de"))}>
            {lang === "de" ? "Herstellerprodukte als CSV" : "Manufacturer products as CSV"}
            <span className="muted font-normal"> · {PRODUCTS.length}</span>
          </Button>
        </div>

        {/* Feste Adressen, damit der Datensatz verlinkbar und automatisiert abrufbar ist.
            Dieselben Dateien wie oben — sie entstehen im Build aus derselben Quelle. */}
        <p className="text-xs muted mt-3 leading-relaxed">
          {lang === "de"
            ? "Feste Adressen zum Verlinken oder automatischen Abrufen: "
            : "Permanent addresses for linking or automated retrieval: "}
          {([
            ["daten/materialien-uebersicht.csv", lang === "de" ? "Übersicht" : "Overview"],
            ["daten/materialien-kennwerte.csv", lang === "de" ? "Kennwerte" : "Values"],
            ["daten/hersteller-produkte.csv", lang === "de" ? "Produkte" : "Products"],
            ["daten/LIESMICH.txt", lang === "de" ? "Lesehinweise" : "Read me"],
          ] as const).map(([path, label], i) => (
            <span key={path}>
              {i > 0 && " · "}
              <a href={`${import.meta.env.BASE_URL}${path}`} className="hl hover:underline">{label}</a>
            </span>
          ))}
        </p>
      </Card>

      {/* Nachnutzung: CC BY verlangt Namensnennung — hier kopierfertig. */}
      <Card className="mt-4 bg-petrol-50/60 dark:bg-white/[0.03]">
        <h2 className="font-display font-bold text-[15px] mb-1.5">{t("ui.attribution")}</h2>
        <p className="text-sm muted leading-relaxed mb-3 max-w-3xl">{t("ui.attributionText")}</p>
        <pre className="text-xs bg-white dark:bg-[#0B121F] border border-hairline dark:border-[#1E2B3D] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
{ATTRIBUTION[lang]}
        </pre>
        <div className="mt-3 no-print">
          <Button variant="outline"
            onClick={() => { void navigator.clipboard?.writeText(ATTRIBUTION[lang]); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? t("ui.attributionCopied") : t("ui.attributionCopy")}
          </Button>
        </div>
      </Card>

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
