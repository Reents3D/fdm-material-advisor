/**
 * Herstellervergleich.
 *
 * Der eigentliche Zweck dieser Ansicht ist nicht "wer hat die höhere Zahl", sondern
 * sichtbar zu machen, dass die Hersteller unter derselben Überschrift Verschiedenes
 * veröffentlichen. Produkte werden deshalb nach `specimenType` gruppiert und nicht
 * quer darüber sortiert — ein Rohstoffkennwert gehört nicht in dieselbe Rangliste
 * wie ein gedruckter Prüfkörper.
 */

import { useState } from "react";
import { PRODUCTS, productsByMaterial, type Product } from "../data/products";
import { byId } from "../data/materials";
import { Card, Chip, cx, fmt, text } from "../components/ui";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

const ROWS: [string, string, string][] = [
  ["tensileStrengthXy", "Zugfestigkeit", "Tensile strength"],
  ["tensileStrengthXz", "Zugfestigkeit XZ", "Tensile strength XZ"],
  ["tensileModulusXy", "E-Modul", "Modulus"],
  ["elongationAtBreakXy", "Bruchdehnung", "Elongation at break"],
  ["elongationAtYieldXy", "Dehnung an der Streckgrenze", "Elongation at yield"],
  ["flexuralStrengthXy", "Biegefestigkeit", "Flexural strength"],
  ["flexuralModulusXy", "Biegemodul", "Flexural modulus"],
  ["charpyUnnotchedXy", "Charpy ungekerbt", "Charpy unnotched"],
  ["charpyNotchedXy", "Charpy gekerbt", "Charpy notched"],
  ["izodUnnotchedXy", "Izod ungekerbt", "Izod unnotched"],
  ["izodNotchedXy", "Izod gekerbt", "Izod notched"],
  ["interlayerAdhesion", "Schichthaftung", "Interlayer adhesion"],
  ["hdtA", "HDT-A (1,8 MPa)", "HDT-A (1.8 MPa)"],
  ["hdtB", "HDT-B (0,45 MPa)", "HDT-B (0.45 MPa)"],
  ["vicatA", "Vicat A", "Vicat A"],
  ["vicatB50", "Vicat B50", "Vicat B50"],
  ["glassTransition", "Glasübergang", "Glass transition"],
  ["density", "Dichte", "Density"],
  ["hardnessShoreA", "Härte Shore A", "Hardness Shore A"],
  ["hardnessShoreD", "Härte Shore D", "Hardness Shore D"],
  ["tearStrength", "Weiterreißfestigkeit", "Tear strength"],
  ["abrasionLoss", "Abriebverlust", "Abrasion loss"],
  ["reboundResilience", "Rückprallelastizität", "Rebound resilience"],
  ["compressionSet", "Druckverformungsrest", "Compression set"],
  ["waterAbsorption", "Wasseraufnahme", "Water absorption"],
  ["nozzleTemperature", "Düsentemperatur", "Nozzle temperature"],
  ["bedTemperature", "Betttemperatur", "Bed temperature"],
];

const SPECIMEN: Record<Product["specimenType"], { de: string; en: string; tone: "good" | "bad" | "ok" }> = {
  printed: { de: "gedruckter Prüfkörper", en: "printed specimen", tone: "good" },
  moulded: { de: "Rohstoffkennwert (spritzgegossen)", en: "raw-material value (moulded)", tone: "bad" },
  undeclared: { de: "Prüfkörper nicht deklariert", en: "specimen not declared", tone: "ok" },
};

export function Brands({ lang, navigate }: { t: T; lang: Lang; navigate: (p: string) => void }) {
  const grouped = productsByMaterial();
  // Nach Markenzahl sortieren: eine Ansicht, die mit einem einzigen Anbieter startet,
  // wirkt leer und verfehlt den Zweck des Vergleichs.
  const materialIds = [...grouped.keys()].sort(
    (a, b) => (grouped.get(b)?.length ?? 0) - (grouped.get(a)?.length ?? 0) || a.localeCompare(b),
  );
  const [sel, setSel] = useState(materialIds[0] ?? "");
  const list = grouped.get(sel) ?? [];

  const printed = list.filter((p) => p.specimenType === "printed");
  const other = list.filter((p) => p.specimenType !== "printed");

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">
        {lang === "de" ? "Hersteller vergleichen" : "Compare manufacturers"}
      </h1>
      <p className="text-sm muted mb-6 max-w-3xl leading-relaxed">
        {lang === "de"
          ? "Dieselbe Werkstoffbezeichnung bedeutet bei verschiedenen Marken nicht dasselbe. Entscheidend ist, woran gemessen wurde."
          : "The same material designation does not mean the same thing across brands. What matters is what was measured."}
      </p>

      <Card className="mb-6 border-ok/50 bg-ok/5">
        <h2 className="font-display font-bold text-[15px] mb-2">
          {lang === "de" ? "Warum hier nicht einfach sortiert wird" : "Why this is not simply sorted"}
        </h2>
        <p className="text-sm leading-relaxed max-w-3xl">
          {lang === "de"
            ? "Dieselbe Zeile bedeutet bei zwei Herstellern nicht dasselbe. Bambu Lab und Prusa Polymers messen an gedruckten Prüfkörpern, Extrudr sagt gar nicht, woran gemessen wurde. In einer gemeinsamen Rangliste wären diese Zahlen irreführend — deshalb stehen sie hier getrennt."
            : "The same row does not mean the same thing for two manufacturers. Bambu Lab and Prusa Polymers measure on printed specimens; Extrudr does not state what was measured at all. In a shared ranking these figures would mislead — hence the separation."}
        </p>
        <p className="text-sm leading-relaxed max-w-3xl mt-3">
          {lang === "de"
            ? "Die Angabe allein reicht allerdings nicht. AzureFilm deklariert gedruckte Prüfkörper und nennt als einziger Hersteller die vollständigen Druckparameter — und genau dadurch wird sichtbar, dass PLA, PLA Silk und ASA mit nur 20 % Infill geprüft wurden. Ein Kennwert aus einem halb gefüllten Prüfkörper beschreibt eine Geometrie, keinen Werkstoff. Deshalb steht die Prüfbedingung hier an jedem einzelnen Wert und nicht nur in einer Fussnote."
            : "The declaration alone is not enough. AzureFilm declares printed specimens and is the only manufacturer to state the full print parameters — which is precisely what reveals that PLA, PLA Silk and ASA were tested at only 20 % infill. A value from a half-filled specimen describes a geometry, not a material. That is why the test condition appears here on every single value, not just in a footnote."}
        </p>
      </Card>

      <div className="flex flex-wrap gap-1.5 mb-5 no-print">
        {materialIds.map((id) => (
          <button key={id} onClick={() => setSel(id)} aria-pressed={sel === id}
            className={cx("px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
              sel === id
                ? "bg-petrol-700 text-white border-petrol-700 dark:bg-petrol-300 dark:text-ink dark:border-petrol-300"
                : "border-hairline dark:border-[#1E2B3D] hover:border-petrol-400")}>
            {byId(id)?.identity.name ?? id}
            <span className="opacity-70 ml-1.5">{(grouped.get(id) ?? []).length}</span>
          </button>
        ))}
      </div>

      {printed.length > 0 && <Group title={lang === "de" ? "An gedruckten Prüfkörpern gemessen" : "Measured on printed specimens"}
        products={printed} lang={lang} />}
      {other.length > 0 && <Group title={lang === "de" ? "Rohstoffkennwerte / nicht deklariert — nicht mit obigen vergleichbar" : "Raw-material or undeclared — not comparable with the above"}
        products={other} lang={lang} />}

      <p className="text-sm muted mt-6">
        <button className="hl hover:underline" onClick={() => navigate(`material/${sel}`)}>
          {lang === "de" ? `Werkstofftyp ${byId(sel)?.identity.name ?? sel} im Detail` : `Material type ${byId(sel)?.identity.name ?? sel} in detail`} →
        </button>
      </p>
    </div>
  );
}

function Group({ title, products, lang }: { title: string; products: Product[]; lang: Lang }) {
  const rows = ROWS.filter(([key]) => products.some((p) => p.properties[key]));
  return (
    <section className="mb-8 print-break">
      <p className="eyebrow mb-2">{title}</p>
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-max border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left font-medium py-2 pr-4 sticky left-0 bg-canvas dark:bg-[#070E18] w-56 min-w-56" />
              {products.map((p) => (
                <th key={p.id} className="text-left py-2 px-3 min-w-52 align-top border-b border-hairline dark:border-[#1E2B3D]">
                  <span className="block font-display font-bold">{p.brand}</span>
                  <span className="block text-xs muted font-normal">{p.productName}</span>
                  {p.origin && <span className="block text-xs muted font-normal">{p.origin}</span>}
                  <span className="inline-block mt-1.5">
                    <Chip tone={SPECIMEN[p.specimenType].tone}>{SPECIMEN[p.specimenType][lang]}</Chip>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, de, en]) => (
              <tr key={key} className="border-b border-hairline/70 dark:border-[#172233]">
                <th scope="row" className="text-left font-normal muted py-2 pr-4 sticky left-0 bg-canvas dark:bg-[#070E18] align-top">
                  {lang === "de" ? de : en}
                </th>
                {products.map((p) => {
                  const v = p.properties[key];
                  return (
                    <td key={p.id} className="py-2 px-3 align-top">
                      {v ? (
                        <>
                          <span className={cx("tabular-nums font-medium", v.confidence === "low" && "estimated")}>
                            {fmt(v.value)}
                          </span>
                          <span className="muted text-xs ml-0.5">{v.unit}</span>
                          {v.tolerance ? <span className="muted text-xs"> ±{fmt(v.tolerance)}</span> : null}
                          {v.min != null && v.max != null && v.min !== v.max && (
                            <span className="muted text-xs"> ({fmt(v.min)}–{fmt(v.max)})</span>
                          )}
                          {v.testStandard && <span className="block text-[11px] muted mt-0.5">{v.testStandard}</span>}
                          {/* Die Prüfbedingung entscheidet über die Vergleichbarkeit — sie gehört an den
                              Wert und nicht in eine Fussnote. AzureFilms 20-%-Infill wäre sonst unsichtbar. */}
                          {v.conditions && (
                            <span className="block text-[11px] mt-0.5 text-warn dark:text-warn">{v.conditions}</span>
                          )}
                        </>
                      ) : <span className="muted">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Datenblatt zum Download — je Produkt */}
            <tr>
              <th scope="row" className="text-left font-normal muted py-3 pr-4 sticky left-0 bg-canvas dark:bg-[#070E18] align-top">
                {lang === "de" ? "Datenblatt" : "Datasheet"}
              </th>
              {products.map((p) => (
                <td key={p.id} className="py-3 px-3 align-top">
                  <a href={p.datasheet.url} target="_blank" rel="noopener nofollow"
                    className="inline-flex items-center gap-1.5 text-xs hl hover:underline font-medium">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    PDF{p.datasheet.version ? ` (${p.datasheet.version})` : ""}
                  </a>
                  <span className="block text-[11px] muted mt-1">
                    {lang === "de" ? "abgerufen" : "retrieved"} {p.datasheet.retrievedAt}
                  </span>
                  {p.productUrl && (
                    <a href={p.productUrl} target="_blank" rel="noopener nofollow"
                      className="block text-[11px] muted hover:underline mt-0.5">
                      {lang === "de" ? "Produktseite" : "Product page"} →
                    </a>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {products.filter((p) => p.specimenNote).map((p) => (
        <p key={p.id} className="text-xs muted mt-3 leading-relaxed max-w-4xl">
          <strong className="text-ink dark:text-[#E8EDF2]">{p.brand} {p.productName}:</strong>{" "}
          {text(p.specimenNote, lang)}
        </p>
      ))}
      {products.filter((p) => p.features).map((p) => (
        <p key={`f-${p.id}`} className="text-xs muted mt-2 leading-relaxed max-w-4xl">
          <strong className="text-ink dark:text-[#E8EDF2]">{p.brand}:</strong> {text(p.features, lang)}
        </p>
      ))}
    </section>
  );
}

export { PRODUCTS };
