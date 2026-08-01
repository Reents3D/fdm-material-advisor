/**
 * Material data sheet: every value with unit, standard, orientation, source and confidence.
 * This is the page an engineer bookmarks — and the long-tail SEO surface.
 */

import { byId, MATERIALS } from "../data/materials";
import { dataCompleteness, confidenceProfile } from "../engine";
import type { ChemicalResistance, Quantity, Rating, Flag, Material } from "../engine/types";
import { SITE, trackedUrl } from "../config/site";
import { Card, Chip, ConfidenceMark, RatingBar, Section, Value, cx, text } from "../components/ui";
import type { Lang } from "../i18n";
import type { AppState } from "../App";

import { chemicalById } from "../data/chemicals";

type T = (k: string, p?: Record<string, string | number>) => string;

/* Bezeichnung, Beispiele und Wirkung kommen aus dem Medienregister — vorher stand die
   Liste hier ein zweites Mal und war nur deutsch. */
const chemLabel = (id: string, lang: Lang) => {
  const c = chemicalById(id);
  return c ? text(c.name, lang) : id;
};

const isQ = (v: unknown): v is Quantity => !!v && typeof v === "object" && "unit" in (v as object);
const isR = (v: unknown): v is Rating => !!v && typeof v === "object" && "scale" in (v as object);

export function Detail({ id, t, lang, navigate, state, update }: {
  id: string; t: T; lang: Lang;
  navigate: (p: string, n?: Partial<AppState>) => void;
  state: AppState; update: (n: Partial<AppState>) => void;
}) {
  const m = byId(id);
  if (!m) {
    return (
      <div>
        <p className="mb-4">Material „{id}" nicht gefunden.</p>
        <a className="hl hover:underline" href="#/matrix">{t("ui.allMaterials")} →</a>
      </div>
    );
  }

  const completeness = dataCompleteness(m);
  const conf = confidenceProfile(m);
  const total = Object.values(conf).reduce((a, b) => a + b, 0);

  return (
    <article>
      <nav className="text-xs muted mb-3 no-print">
        <a href="#/" className="hover:underline">Start</a> ›{" "}
        <a href="#/matrix" className="hover:underline">{t("ui.allMaterials")}</a> › {m.identity.name}
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">{m.identity.name}</h1>
          <Chip tone="neutral">{m.identity.family}</Chip>
          <Chip tone="neutral">{m.identity.polymerClass === "amorphous" ? "amorph" : m.identity.polymerClass === "semi-crystalline" ? "teilkristallin" : m.identity.polymerClass}</Chip>
          {m.identity.variant.map((v) => <Chip key={v} tone="brand">{v}</Chip>)}
        </div>
        {/* First 40 words answer "what is it for and where are the limits" — AEO surface. */}
        <p className="text-base leading-relaxed max-w-3xl">{text(m.identity.abstract, lang)}</p>
        {m.identity.aliases?.length ? (
          <p className="text-xs muted mt-2">{lang === "de" ? "Auch bekannt als" : "Also known as"}: {m.identity.aliases.join(" · ")}</p>
        ) : null}
      </header>

      {m.identity.notToBeConfusedWith?.length ? (
        <Card className="mb-6 border-ok/50 bg-ok/5">
          <h2 className="text-sm font-semibold mb-1">⚠ {t("ui.notConfused")}</h2>
          {m.identity.notToBeConfusedWith.map((c) => (
            <p key={c.materialId} className="text-sm">
              <a href={`#/material/${c.materialId}`} className="hl hover:underline font-medium">{byId(c.materialId)?.identity.name ?? c.materialId}</a>
              {" — "}{text(c.reason, lang)}
            </p>
          ))}
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3 mb-6 text-sm">
        <Card>
          <div className="text-xs muted mb-1">{t("ui.completeness")}</div>
          <div className="text-2xl font-semibold tabular-nums">{completeness} %</div>
        </Card>
        <Card className="sm:col-span-2">
          <div className="text-xs muted mb-1">{t("ui.confidence")} ({total})</div>
          <div className="flex h-3 rounded overflow-hidden" role="img"
            aria-label={`high ${conf.high}, medium ${conf.medium}, low ${conf.low}, estimated ${conf.estimated}`}>
            {([["high", "bg-good"], ["medium", "bg-petrol-500"], ["low", "bg-ok"], ["estimated", "bg-amber-400"]] as const)
              .map(([k, c]) => conf[k] ? <span key={k} className={c} style={{ width: `${(conf[k] / total) * 100}%` }} /> : null)}
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs muted mt-1.5">
            <span>◆◆ {conf.high}</span><span>◆ {conf.medium}</span><span>! {conf.low}</span>
            <span className="text-amber-600 dark:text-amber-400">≈ {conf.estimated} {t("ui.estimatedBadge")}</span>
          </div>
        </Card>
      </div>

      <PropertyGroup title={lang === "de" ? "Mechanik" : "Mechanics"} node={m.mechanics} lang={lang} t={t} />
      <PropertyGroup title={lang === "de" ? "Thermik" : "Thermal"} node={m.thermal as Record<string, unknown>} lang={lang} t={t} />
      <PropertyGroup title={t("ui.printParams")} node={m.processing as Record<string, unknown>} lang={lang} t={t} />
      <PropertyGroup title={lang === "de" ? "Beständigkeit" : "Durability"} node={m.durability as Record<string, unknown>} lang={lang} t={t} skip={["chemicalResistance"]} />
      <PropertyGroup title={lang === "de" ? "Optik & Veredelung" : "Finishing"} node={m.finishing as Record<string, unknown>} lang={lang} t={t} />

      <ChemicalMatrix m={m} lang={lang} t={t} />

      <Section title={t("ui.sources")}>
        <ul className="space-y-2 text-sm">
          {m.governance.sources.map((s) => (
            <li key={s.id} className="surface p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{s.publisher}</span>
                <Chip tone="neutral">{s.type}</Chip>
                <span className="text-xs muted">max. {s.confidenceCeiling}</span>
              </div>
              <div className="text-sm mt-0.5">{s.title}{s.documentVersion ? ` (${s.documentVersion})` : ""}</div>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener nofollow" className="text-xs hl hover:underline break-all">
                  {s.url}
                </a>
              )}
              {s.retrievedAt && <span className="text-xs muted ml-2">abgerufen {s.retrievedAt}</span>}
              {s.note && <p className="text-xs muted mt-1.5 leading-relaxed">{text(s.note, lang)}</p>}
            </li>
          ))}
        </ul>
      </Section>

      {m.governance.openQuestions?.some((q) => !q.assignee) ? (
        <Section title={t("ui.openQuestions")}>
          <ul className="space-y-1.5 text-sm">
            {m.governance.openQuestions.filter((q) => !q.assignee).map((q) => (
              <li key={q.id} className="flex gap-2">
                <span className={cx("text-xs mt-0.5 shrink-0", q.blocking ? "text-bad" : "muted")}>
                  {q.blocking ? "●" : "○"}
                </span>
                <span className="muted">{text(q.question, lang)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs muted mt-3">
            {t("ui.lastReviewed")}: {m.governance.lastReviewed} · {m.governance.reviewedBy}
          </p>
        </Section>
      ) : null}

      <div className="flex flex-wrap gap-2 mb-6 no-print">
        <button className="text-sm hl hover:underline"
          onClick={() => update({ compare: [...new Set([...state.compare, m.id])].slice(0, 5) })}>
          + {t("ui.compareWith")}
        </button>
        <button className="text-sm muted hover:underline" onClick={() => navigate("matrix")}>
          {t("ui.allMaterials")} →
        </button>
      </div>

      <Card className="border-petrol-600/40 bg-petrol-50 dark:bg-petrol-900/20 no-print">
        <p className="text-sm font-medium mb-1">{t("ui.ctaDetail")}</p>
        <p className="text-xs muted mb-3">{t("ui.portfolioNeutral")}</p>
        <a href={trackedUrl(SITE.urls.contact)} target="_blank" rel="noopener"
          className="inline-block px-3 py-1.5 rounded text-sm font-medium bg-petrol-700 text-white hover:bg-petrol-600 dark:bg-petrol-300 dark:text-ink">
          {SITE.brand} →
        </a>
      </Card>

      <p className="text-xs muted mt-6">
        {MATERIALS.length > 1 && (
          <>
            {lang === "de" ? "Weitere Materialien" : "More materials"}:{" "}
            {MATERIALS.filter((x) => x.id !== m.id).slice(0, 8).map((x, i) => (
              <span key={x.id}>
                {i > 0 && " · "}
                <a href={`#/material/${x.id}`} className="hover:underline">{x.identity.name}</a>
              </span>
            ))}
          </>
        )}
      </p>
    </article>
  );
}

function PropertyGroup({ title, node, lang, t, skip = [] }: {
  title: string; node: Record<string, unknown> | undefined; lang: Lang; t: T; skip?: string[];
}) {
  if (!node) return null;
  const rows = Object.entries(node).filter(([k, v]) => !skip.includes(k) && (isQ(v) || isR(v)));
  if (!rows.length) return null;

  return (
    <Section title={title}>
      <div className="surface overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([key, v]) => (
              <tr key={key} className="border-b border-hairline/70 dark:border-[#172233] last:border-0 align-top">
                <th scope="row" className="text-left font-normal muted py-2 px-3 w-52">{humanise(key, lang)}</th>
                <td className="py-2 px-3 w-40">
                  {isQ(v) ? <Value q={v} lang={lang} /> : isR(v) ? <RatingBar r={v} lang={lang} /> : null}
                </td>
                <td className="py-2 px-3 text-xs muted">
                  {isQ(v) && (
                    <>
                      {v.orientation && v.orientation !== "n/a" && <Chip tone="neutral">{v.orientation}</Chip>}{" "}
                      {v.testStandard && <span className="mr-2">{v.testStandard}</span>}
                      {v.conditions && <span className="block mt-0.5 opacity-80">{v.conditions}</span>}
                    </>
                  )}
                  {(isQ(v) || isR(v)) && v.note && (
                    <span className="block mt-1 leading-relaxed max-w-xl">{text(v.note, lang)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sr-only">{t("ui.evidence")}</p>
    </Section>
  );
}

function ChemicalMatrix({ m, lang, t }: { m: Material; lang: Lang; t: T }) {
  const list = (m.durability?.chemicalResistance as ChemicalResistance[] | undefined) ?? [];
  if (!list.length) return null;
  const tone = { resistant: "bg-good/15 text-good", limited: "bg-ok/15 text-ok", "not-resistant": "bg-bad/15 text-bad", unknown: "bg-neutral-200/60 dark:bg-neutral-700/60 muted" };
  const label = { resistant: lang === "de" ? "beständig" : "resistant", limited: lang === "de" ? "bedingt" : "limited", "not-resistant": lang === "de" ? "unbeständig" : "not resistant", unknown: lang === "de" ? "unbekannt" : "unknown" };

  return (
    <Section title={t("ui.chemicals")}>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <div key={c.chemicalId} className={cx("rounded px-2.5 py-1.5 text-sm flex items-center justify-between gap-2", tone[c.rating])}
            title={c.conditions ?? ""}>
            <span title={chemicalById(c.chemicalId) ? `${text(chemicalById(c.chemicalId)!.examples, lang)} — ${text(chemicalById(c.chemicalId)!.effect, lang)}` : undefined}>
              {chemLabel(c.chemicalId, lang)}
            </span>
            <span className="text-xs whitespace-nowrap">
              {label[c.rating]} <ConfidenceMark c={c.confidence} lang={lang} />
            </span>
          </div>
        ))}
      </div>
      {list.filter((c) => c.note).map((c) => (
        <p key={c.chemicalId} className="text-xs muted mt-2 leading-relaxed">
          <strong>{chemLabel(c.chemicalId, lang)}:</strong> {text(c.note, lang)}
        </p>
      ))}
    </Section>
  );
}

const LABELS: Record<string, [string, string]> = {
  density: ["Dichte", "Density"],
  tensileStrengthXy: ["Zugfestigkeit X-Y", "Tensile strength X-Y"],
  tensileStrengthZ: ["Zugfestigkeit Z", "Tensile strength Z"],
  tensileModulusXy: ["E-Modul X-Y", "Young's modulus X-Y"],
  tensileModulusZ: ["E-Modul Z", "Young's modulus Z"],
  elongationAtBreakXy: ["Bruchdehnung X-Y", "Elongation at break X-Y"],
  elongationAtBreakZ: ["Bruchdehnung Z", "Elongation at break Z"],
  flexuralStrengthXy: ["Biegefestigkeit X-Y", "Flexural strength X-Y"],
  flexuralStrengthZ: ["Biegefestigkeit Z", "Flexural strength Z"],
  flexuralModulusXy: ["Biegemodul X-Y", "Flexural modulus X-Y"],
  flexuralModulusZ: ["Biegemodul Z", "Flexural modulus Z"],
  charpyUnnotchedXy: ["Schlagzähigkeit X-Y (ungekerbt)", "Impact X-Y (unnotched)"],
  charpyNotchedXy: ["Schlagzähigkeit X-Y (gekerbt)", "Impact X-Y (notched)"],
  charpyUnnotchedZ: ["Schlagzähigkeit Z", "Impact Z"],
  izodNotchedXy: ["Izod gekerbt X-Y", "Izod notched X-Y"],
  anisotropyFactorTensile: ["Anisotropiefaktor Zug", "Anisotropy factor (tensile)"],
  anisotropyFactorImpact: ["Anisotropiefaktor Schlag", "Anisotropy factor (impact)"],
  hdtA: ["HDT-A (1,8 MPa)", "HDT-A (1.8 MPa)"],
  hdtB: ["HDT-B (0,45 MPa)", "HDT-B (0.45 MPa)"],
  vicatB50: ["Vicat", "Vicat"],
  glassTransition: ["Glasübergang Tg", "Glass transition Tg"],
  meltingTemperature: ["Schmelztemperatur", "Melting temperature"],
  continuousServiceTemperature: ["Dauergebrauch (Hersteller)", "Continuous service (manufacturer)"],
  recommendedMaxServiceTemperature: ["Dauereinsatz (unsere Empfehlung)", "Continuous service (our recommendation)"],
  nozzleTemperature: ["Düsentemperatur", "Nozzle temperature"],
  bedTemperature: ["Betttemperatur", "Bed temperature"],
  chamberTemperature: ["Kammertemperatur", "Chamber temperature"],
  dryingTemperature: ["Trocknung Temperatur", "Drying temperature"],
  dryingTime: ["Trocknung Dauer", "Drying time"],
  maxResidualHumidity: ["max. Restfeuchte", "Max residual humidity"],
  printSpeed: ["Druckgeschwindigkeit", "Print speed"],
  maxOverhangAngle: ["max. Überhang", "Max overhang"],
  minNozzleDiameter: ["min. Düsendurchmesser", "Min nozzle diameter"],
  waterAbsorption: ["Wasseraufnahme", "Water absorption"],
  outdoorServiceLife: ["Standzeit im Freien", "Outdoor service life"],
  shrinkage: ["Schwindung", "Shrinkage"],
  printability: ["Druckbarkeit", "Printability"],
  warpingTendency: ["Verzugsneigung", "Warping tendency"],
  hygroscopy: ["Hygroskopie", "Hygroscopy"],
  abrasiveness: ["Abrasivität", "Abrasiveness"],
  stringingTendency: ["Stringing", "Stringing"],
  layerAdhesion: ["Schichthaftung", "Layer adhesion"],
  toughness: ["Zähigkeit", "Toughness"],
  creepTendency: ["Kriechneigung", "Creep tendency"],
  notchSensitivity: ["Kerbempfindlichkeit", "Notch sensitivity"],
  wearResistance: ["Verschleissfestigkeit", "Wear resistance"],
  fatigueResistance: ["Dauerfestigkeit", "Fatigue resistance"],
  uvResistance: ["UV-Beständigkeit", "UV resistance"],
  weatherResistance: ["Witterungsbeständigkeit", "Weather resistance"],
  hydrolysisResistance: ["Hydrolysebeständigkeit", "Hydrolysis resistance"],
  yellowingTendency: ["Vergilbung", "Yellowing"],
  stressCrackingSensitivity: ["Spannungsrissneigung", "Stress cracking"],
  gasBarrier: ["Gassperrwirkung", "Gas barrier"],
  surfaceQuality: ["Oberflächengüte", "Surface quality"],
  layerLineVisibility: ["Sichtbarkeit Schichtlinien", "Layer line visibility"],
  sandability: ["Schleifbarkeit", "Sandability"],
  fillability: ["Spachtelbarkeit", "Fillability"],
  paintAdhesion: ["Lackhaftung", "Paint adhesion"],
  bondability: ["Verklebbarkeit", "Bondability"],
  hardnessShoreD: ["Härte Shore D", "Hardness Shore D"],
};

const humanise = (key: string, lang: Lang): string => {
  const l = LABELS[key];
  if (l) return lang === "de" ? l[0] : l[1];
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
};

export type { Flag };
