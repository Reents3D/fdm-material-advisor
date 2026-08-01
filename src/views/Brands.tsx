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
import { CHEMICALS } from "../data/chemicals";
import { Chip, Disclosure, cx, fmt, text } from "../components/ui";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

/**
 * Die Zeilen des Vergleichs.
 *
 * Die Z-Zeilen stehen jeweils direkt unter ihrer XY-Zeile, damit der Einbruch quer zur
 * Schicht ins Auge springt statt am Tabellenende zu verschwinden. Nur wenige Hersteller
 * geben sie ueberhaupt an - Ultrafuse in drei Orientierungen, SUNLU beim PA6-CF -, und
 * genau daran haengt die Aussage, um die es in diesem Werkzeug geht.
 */
const ROWS: [string, string, string][] = [
  ["tensileStrengthXy", "Zugfestigkeit", "Tensile strength"],
  ["tensileStrengthXz", "Zugfestigkeit XZ (hochkant)", "Tensile strength XZ (on edge)"],
  ["tensileStrengthZ", "Zugfestigkeit Z (stehend)", "Tensile strength Z (upright)"],
  ["tensileModulusXy", "E-Modul", "Modulus"],
  ["tensileModulusZ", "E-Modul Z (stehend)", "Modulus Z (upright)"],
  ["elongationAtBreakXy", "Bruchdehnung", "Elongation at break"],
  ["elongationAtBreakZ", "Bruchdehnung Z (stehend)", "Elongation at break Z (upright)"],
  ["elongationAtYieldXy", "Dehnung an der Streckgrenze", "Elongation at yield"],
  ["flexuralStrengthXy", "Biegefestigkeit", "Flexural strength"],
  ["flexuralStrengthXz", "Biegefestigkeit XZ (hochkant)", "Flexural strength XZ (on edge)"],
  ["flexuralStrengthZ", "Biegefestigkeit Z (stehend)", "Flexural strength Z (upright)"],
  ["flexuralModulusXy", "Biegemodul", "Flexural modulus"],
  ["flexuralModulusXz", "Biegemodul XZ (hochkant)", "Flexural modulus XZ (on edge)"],
  ["flexuralModulusZ", "Biegemodul Z (stehend)", "Flexural modulus Z (upright)"],
  ["charpyUnnotchedXy", "Charpy ungekerbt", "Charpy unnotched"],
  ["charpyUnnotchedXz", "Charpy ungekerbt XZ (hochkant)", "Charpy unnotched XZ (on edge)"],
  ["charpyUnnotchedZ", "Charpy ungekerbt Z (stehend)", "Charpy unnotched Z (upright)"],
  ["charpyNotchedXy", "Charpy gekerbt", "Charpy notched"],
  ["charpyNotchedZ", "Charpy gekerbt Z (stehend)", "Charpy notched Z (upright)"],
  ["izodUnnotchedXy", "Izod ungekerbt", "Izod unnotched"],
  ["izodNotchedXy", "Izod gekerbt", "Izod notched"],
  ["izodNotchedZ", "Izod gekerbt Z (stehend)", "Izod notched Z (upright)"],
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

/** Bestaendigkeitsklassen aus dem Produktdatenblatt, zweisprachig und farbig. */
const RESISTANCE: Record<string, { de: string; en: string; tone: "good" | "ok" | "bad" }> = {
  resistant: { de: "beständig", en: "resistant", tone: "good" },
  limited: { de: "bedingt", en: "limited", tone: "ok" },
  "not-resistant": { de: "nicht beständig", en: "not resistant", tone: "bad" },
  unknown: { de: "keine Angabe", en: "unknown", tone: "ok" },
};

/**
 * Was der HERSTELLER zu Medien und Brandverhalten sagt.
 *
 * Bewusst getrennt von der Familienmatrix am Werkstofftyp: Diese Angaben stehen im
 * Datenblatt des konkreten Produkts und sind damit eine andere Aussage als eine
 * Ableitung aus der Polymerfamilie — auch wenn beide dieselbe Skala benutzen.
 */
function ProductClaims({ p, lang }: { p: Product; lang: Lang }) {
  const chem = p.chemicalResistance ?? [];
  const ul94 = p.compliance?.ul94;
  if (!chem.length && !ul94?.value) return null;
  const nameOf = (id: string) => CHEMICALS.find((c) => c.id === id)?.name;

  return (
    <div className="mt-3 pt-3 border-t border-hairline dark:border-[#1E2B3D]">
      <p className="eyebrow mb-2">
        {lang === "de" ? "Angaben aus diesem Datenblatt" : "Statements from this datasheet"}
      </p>

      {ul94?.value && (
        <p className="text-sm mb-2">
          <span className="muted">UL94: </span>
          <Chip tone={ul94.value === "HB" ? "ok" : "good"}>{ul94.value}</Chip>
          {ul94.thicknessMm ? <span className="muted text-xs"> bei {ul94.thicknessMm} mm</span> : null}
          {ul94.note ? <span className="block text-xs muted mt-1 leading-relaxed">{text(ul94.note, lang)}</span> : null}
        </p>
      )}

      {chem.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
          {chem.map((cr) => {
            const cls = RESISTANCE[cr.rating] ?? RESISTANCE.unknown;
            const n = nameOf(cr.chemicalId);
            return (
              <span key={cr.chemicalId} className="inline-flex items-center gap-1.5">
                <span className="muted">{n ? text(n, lang) : cr.chemicalId}</span>
                <Chip tone={cls.tone}>{lang === "de" ? cls.de : cls.en}</Chip>
              </span>
            );
          })}
        </div>
      )}
      <p className="text-xs muted mt-2 leading-relaxed">
        {lang === "de"
          ? "Herstellerangaben ohne Konzentration, Temperatur und Dauer — als Vorauswahl brauchbar, als Freigabe nicht."
          : "Manufacturer statements without concentration, temperature and duration — usable for pre-selection, not as a release."}
      </p>
    </div>
  );
}

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

      {/* Kern in einem Satz sichtbar, die Herleitung dahinter aufklappbar. */}
      <Disclosure className="mb-6" tone="info"
        summary={
          <span>
            {lang === "de"
              ? "Warum hier nicht einfach sortiert wird — gedruckt erreicht bei der Bruchdehnung nur ein Achtel des Rohstoffwerts"
              : "Why this is not simply sorted — printed reaches only an eighth of the raw-material elongation"}
          </span>
        }>
        <p className="leading-relaxed max-w-3xl">
          {lang === "de"
            ? "Dieselbe Zeile bedeutet bei zwei Herstellern nicht dasselbe. Bambu Lab und Prusa Polymers messen an gedruckten Prüfkörpern, Extrudr und 3DJAKE sagen gar nicht, woran gemessen wurde. In einer gemeinsamen Rangliste wären diese Zahlen irreführend — deshalb stehen sie hier getrennt."
            : "The same row does not mean the same thing for two manufacturers. Bambu Lab and Prusa Polymers measure on printed specimens; Extrudr and 3DJAKE do not state what was measured at all. In a shared ranking these figures would mislead — hence the separation."}
        </p>
        <p className="leading-relaxed max-w-3xl mt-3">
          {lang === "de"
            ? "Die Angabe allein reicht allerdings nicht. AzureFilm deklariert gedruckte Prüfkörper und nennt als einziger Hersteller die vollständigen Druckparameter — und genau dadurch wird sichtbar, dass PLA, PLA Silk und ASA mit nur 20 % Infill geprüft wurden. Ein Kennwert aus einem halb gefüllten Prüfkörper beschreibt eine Geometrie, keinen Werkstoff. Deshalb steht die Prüfbedingung hier an jedem einzelnen Wert und nicht nur in einer Fussnote."
            : "The declaration alone is not enough. AzureFilm declares printed specimens and is the only manufacturer to state the full print parameters — which is precisely what reveals that PLA, PLA Silk and ASA were tested at only 20 % infill. A value from a half-filled specimen describes a geometry, not a material. That is why the test condition appears here on every single value, not just in a footnote."}
        </p>

        {/* Der beste Beleg fuer die These dieses Werkzeugs stammt von einem Rohstoffhersteller
            selbst: ein Datenblatt, das beide Spalten nebeneinander stellt. */}
        <div className="mt-4 pt-4 border-t border-hairline dark:border-[#1E2B3D]">
          <p className="leading-relaxed max-w-3xl">
            {lang === "de"
              ? "Wie gross der Unterschied ist, beziffert ein Rohstoffhersteller selbst. Shenzhen Zhinengpai stellt in einem PLA-Datenblatt beide Spalten nebeneinander — dasselbe Material, einmal gedruckt (210 °C, 0,4 mm Düse, 2 Perimeter, 100 % Infill), einmal spritzgegossen:"
              : "How large the difference is has been quantified by a raw-material producer itself. Shenzhen Zhinengpai places both columns side by side in one PLA datasheet — the same material, once printed (210 °C, 0.4 mm nozzle, 2 perimeters, 100 % infill), once injection moulded:"}
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="text-sm border-separate border-spacing-0 min-w-max">
              <thead>
                <tr className="text-left">
                  <th className="font-medium py-1.5 pr-6" />
                  <th className="font-medium py-1.5 pr-6">{lang === "de" ? "gedruckt" : "printed"}</th>
                  <th className="font-medium py-1.5 pr-6">{lang === "de" ? "spritzgegossen" : "moulded"}</th>
                  <th className="font-medium py-1.5">{lang === "de" ? "gedruckt erreicht" : "printed reaches"}</th>
                </tr>
              </thead>
              <tbody>
                {([
                  [lang === "de" ? "Zugfestigkeit" : "Tensile strength", "40,5 MPa", "55,3 MPa", "73 %"],
                  [lang === "de" ? "Bruchdehnung" : "Elongation at break", "3,2 %", "25,5 %", "13 %"],
                  [lang === "de" ? "Biegefestigkeit" : "Flexural strength", "72,5 MPa", "85,5 MPa", "85 %"],
                  [lang === "de" ? "Izod gekerbt" : "Izod notched", "3,5 kJ/m²", "5,6 kJ/m²", "63 %"],
                ] as const).map(([label, pr, mo, pct]) => (
                  <tr key={label} className="border-t border-hairline/70 dark:border-[#172233]">
                    <td className="py-1.5 pr-6 muted">{label}</td>
                    <td className="py-1.5 pr-6 tabular-nums font-medium">{pr}</td>
                    <td className="py-1.5 pr-6 tabular-nums muted">{mo}</td>
                    <td className="py-1.5 tabular-nums font-semibold hl">{pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs muted mt-3 max-w-3xl leading-relaxed">
            {lang === "de"
              ? "Die Bruchdehnung bricht am stärksten ein: Ein gedrucktes Teil erreicht ein Achtel des Wertes, den dasselbe Granulat spritzgegossen liefert. Wer ein Rohstoffdatenblatt für die Auslegung heranzieht, rechnet an dieser Stelle um den Faktor acht daneben. "
              : "Elongation collapses hardest: a printed part reaches an eighth of what the same pellets deliver when injection moulded. Anyone using a raw-material datasheet for design is off by a factor of eight at this point. "}
            <a href="https://3d.nice-cdn.com/upload/file/TDS_PLA.pdf" target="_blank" rel="noopener nofollow"
              className="hl hover:underline">
              {lang === "de" ? "Datenblatt ansehen" : "View datasheet"} →
            </a>
          </p>
        </div>
      </Disclosure>

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

  /* Die Prüfbedingung gehört einmal in den Spaltenkopf, nicht unter jeden Wert — sonst
     steht dieselbe Zeile achtmal untereinander und erschlägt die Zahlen. Unter einem Wert
     erscheint sie nur noch, wenn sie von der Spaltenvorgabe ABWEICHT. */
  const dominant = new Map<string, string>();
  for (const p of products) {
    const counts = new Map<string, number>();
    for (const v of Object.values(p.properties)) {
      if (v?.conditions) counts.set(v.conditions, (counts.get(v.conditions) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] > 1) dominant.set(p.id, top[0]);
  }
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
                  {dominant.get(p.id) && (
                    <span className="block text-[11px] font-normal text-warn mt-1 max-w-[13rem] leading-snug">
                      {dominant.get(p.id)}
                    </span>
                  )}
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
                          {/* Nur abweichende Bedingungen — die Spaltenvorgabe steht im Kopf. */}
                          {v.conditions && v.conditions !== dominant.get(p.id) && (
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

      {/* Hinweise je Produkt. Zugeklappt, damit die Tabelle die Seite bestimmt — aber die
          Existenz eines Befunds steht in der Zusammenfassung und ist farblich markiert. */}
      <div className="mt-4 space-y-2 max-w-4xl">
        {products.map((p) => {
          const note = p.specimenNote ? text(p.specimenNote, lang) : "";
          const feat = p.features ? text(p.features, lang) : "";
          const hasClaims = (p.chemicalResistance?.length ?? 0) > 0 || !!p.compliance?.ul94?.value;
          if (!note && !feat && !hasClaims) return null;
          const isFinding = /Befund zu diesem Datenblatt|Finding on this datasheet/.test(note);
          return (
            <Disclosure key={p.id} tone={isFinding ? "warn" : "neutral"}
              summary={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{p.productName}</span>
                  {isFinding
                    ? <Chip tone="bad">{lang === "de" ? "Datenblatt-Befund" : "datasheet finding"}</Chip>
                    : <span className="muted font-normal text-xs">
                        {lang === "de" ? "Hinweise zum Datenblatt" : "notes on the datasheet"}
                      </span>}
                </span>
              }>
              {note && <p className="leading-relaxed whitespace-pre-line">{note}</p>}
              {feat && <p className="leading-relaxed mt-2.5 muted">{feat}</p>}
              <ProductClaims p={p} lang={lang} />
            </Disclosure>
          );
        })}
      </div>
    </section>
  );
}

export { PRODUCTS };
