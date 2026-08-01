/**
 * Der Bericht — die Ansicht, die als PDF beim Kunden in der Projektakte landet.
 *
 * WARUM EINE EIGENE ANSICHT
 * Die Ergebnisansicht ist zum Arbeiten gebaut: aufklappen, umgewichten, vergleichen. Ein
 * Dokument ist zum Ablegen gebaut. Es muss ohne den Menschen funktionieren, der es
 * erzeugt hat — also mit Anforderungsprofil, Begründung, Datenlage und Quellen in einem
 * Zug, und ohne einen einzigen Knopf, der im Papier ins Leere zeigt.
 *
 * WARUM DRUCKEN UND KEIN PDF-ERZEUGER
 * Eine PDF-Bibliothek im Browser kostet ein paar hundert Kilobyte plus eingebettete
 * Schriften und erzeugt am Ende ein schlechteres Layout, als CSS es kann. Der Weg über
 * die Druckfunktion liefert auswählbaren Text, echte Schriften, Links — und kommt ohne
 * jede zusätzliche Abhängigkeit aus. Die Grenze steht im Hinweis über dem Dokument:
 * Kopf- und Fusszeilen des Browsers muss man im Druckdialog abschalten.
 *
 * Der Bericht liest denselben Zustand aus der URL wie alles andere. Er ist damit ein
 * teilbarer Link, nicht nur eine Datei.
 */

import { MATERIALS } from "../data/materials";
import { CRITERIA, DEFAULT_WEIGHTS, type Recommendation, type SelectionResult } from "../engine";
import { dataCompleteness } from "../engine/completeness";
import { SITE } from "../config/site";
import { Button, fmt, text } from "../components/ui";
import { numberAt, FIELDS, fieldKey } from "../lib/fields";
import type { AppState } from "../App";

type T = (k: string, p?: Record<string, string | number>) => string;

const field = (key: string) => FIELDS.find((d) => fieldKey(d) === key)!;
const TENSILE = field("mechanics.tensileStrengthXy");
const HDTB = field("thermal.hdtB");
const DENSITY = field("mechanics.density");
const ANISO = field("mechanics.anisotropyFactorTensile");

/** "(+ 1 weiterer Grund)" bzw. "(+ 3 weitere Gründe)" — der Ausschluss steht ausgeschrieben,
    die übrigen Gründe nur gezählt. Ausgeschrieben wären es 31 Absätze Kleingedrucktes. */
const moreReasons = (n: number, de: boolean): string =>
  de
    ? (n === 1 ? "(+ 1 weiterer Grund)" : `(+ ${n} weitere Gründe)`)
    : (n === 1 ? "(+ 1 more reason)" : `(+ ${n} more reasons)`);

const dateLong = (lang: string) =>
  new Date().toLocaleDateString(lang === "en" ? "en-GB" : "de-DE",
    { day: "2-digit", month: "long", year: "numeric" });

/* --------------------------------------------------- Anforderungen in Klartext */

/**
 * Das Anforderungsprofil in Sätze. Ein Bericht ohne diesen Abschnitt behauptet ein
 * Ergebnis, ohne die Frage mitzuliefern — und ist in drei Monaten wertlos, weil niemand
 * mehr weiss, wonach gesucht wurde.
 */
function requirementLines(state: AppState, t: T): { label: string; value: string }[] {
  const { req, lang } = state;
  const de = lang !== "en";
  const out: { label: string; value: string }[] = [];
  const add = (label: string, value: string | number | undefined | null) => {
    if (value !== undefined && value !== null && value !== "") out.push({ label, value: String(value) });
  };
  const yn = (v: boolean | undefined) => (v === undefined ? undefined : v ? (de ? "ja" : "yes") : (de ? "nein" : "no"));

  add(de ? "Dauereinsatztemperatur" : "Service temperature",
    req.serviceTemperatureC !== undefined ? `${req.serviceTemperatureC} °C` : undefined);
  add(de ? "Bewitterung" : "Outdoor exposure",
    req.outdoorYears !== undefined ? (de ? `${req.outdoorYears} Jahre im Freien` : `${req.outdoorYears} years outdoors`) : undefined);
  add(de ? "Grösste Kantenlänge" : "Largest edge",
    req.maxEdgeMm !== undefined ? `${req.maxEdgeMm} mm` : undefined);
  add(de ? "Mindestzugfestigkeit X-Y" : "Minimum tensile strength X-Y",
    req.minTensileStrengthMPa !== undefined ? `${req.minTensileStrengthMPa} MPa` : undefined);
  add(de ? "Kleinste Wandstärke" : "Minimum wall thickness",
    req.minWallThicknessMm !== undefined ? `${req.minWallThicknessMm} mm` : undefined);
  add(de ? "Geforderte Oberflächenrauheit" : "Required surface roughness",
    req.surfaceRaUm !== undefined ? `Ra ${req.surfaceRaUm} µm` : undefined);
  add(de ? "Stückzahl" : "Quantity", req.quantity);
  add(de ? "Lebensmittelkontakt" : "Food contact", yn(req.foodContact));
  add(de ? "ESD-Anforderung" : "ESD requirement", yn(req.esd));
  add(de ? "Brandschutzklasse" : "Flame class", req.flameClass);
  add(de ? "Dicht gegen Flüssigkeiten" : "Watertight", yn(req.requiresWatertight));
  add(de ? "Richtungsunabhängige Festigkeit" : "Isotropic strength", yn(req.requiresIsotropic));
  add(de ? "Flexibles Bauteil" : "Flexible part",
    req.flexible === undefined ? undefined : req.flexible ? (de ? "ja" : "yes") : (de ? "nein, steif" : "no, rigid"));
  add(de ? "Beheizte Bauraumkammer vorhanden" : "Heated chamber available", yn(req.chamberAvailable));
  add(de ? "Gehärtete Düse vorhanden" : "Hardened nozzle available", yn(req.hardenedNozzleAvailable));
  add(de ? "Temperofen vorhanden" : "Annealing oven available", yn(req.annealingOvenAvailable));
  if (state.chemicals.length) {
    add(de ? "Medienkontakt" : "Chemical exposure", state.chemicals.join(", "));
  }

  const weighted = CRITERIA
    .filter((c) => (req.weights?.[c.id] ?? 0) !== (DEFAULT_WEIGHTS[c.id] ?? 0))
    .map((c) => `${t(`criterion.${c.id}.label`)} ${req.weights?.[c.id] ?? 0}/5`);
  if (weighted.length) add(de ? "Abweichende Gewichtung" : "Adjusted weighting", weighted.join(", "));

  return out;
}

/* ------------------------------------------------------------------ Bericht */

export function Report({ result, state, t, navigate }: {
  result: SelectionResult; state: AppState; t: T;
  navigate: (p: string, n?: Partial<AppState>) => void;
}) {
  const { lang } = state;
  const de = lang !== "en";
  const reqs = requirementLines(state, t);
  const top = result.ranked.slice(0, 5);
  const leader = top[0];

  // Ein Datenblatt kann hinter mehreren Werkstoffen stehen. Doppelte Nennungen machen
  // das Quellenverzeichnis unlesbar, ohne etwas hinzuzufügen.
  const sources = dedupeSources(top.slice(0, 3));

  /**
   * Abschnitte fallen weg, wenn es nichts zu sagen gibt — "Empfehlung" etwa, wenn kein
   * Werkstoff durchkommt. Feste Nummern sprängen dann von 1 auf 5 und liessen den Leser
   * nach den fehlenden Abschnitten suchen.
   *
   * Bewusst als vorab berechnete Liste und NICHT als hochzählender Zähler: ein Zähler,
   * den auch eine Unterkomponente hochzählt, ist von deren Renderzeitpunkt abhängig.
   * Genau daran sprang die Nummerierung im Entwurf von 6 auf 8, weil React im
   * Entwicklungsmodus zweimal rendert. Diese Fassung ist von der Renderreihenfolge
   * unabhängig.
   */
  const sections = [
    "profile",
    ...(top.length ? ["recommendation", "reasoning"] : []),
    ...(result.tradeOffs.length ? ["tradeoffs"] : []),
    ...(result.rejected.length ? ["rejected"] : []),
    "limits",
    ...(sources.length ? ["sources"] : []),
  ];
  const no = (id: string) => sections.indexOf(id) + 1;

  return (
    <div className="report">
      {/* Bildschirmleiste — im Druck weg. */}
      <div className="no-print flex flex-wrap items-center gap-3 mb-6 pb-5 border-b border-hairline dark:border-[#1E2B3D]">
        <Button variant="primary" onClick={() => print()}>
          {de ? "Als PDF speichern" : "Save as PDF"}
        </Button>
        <Button variant="outline" onClick={() => navigate("results")}>← {t("ui.back")}</Button>
        <p className="text-xs muted max-w-md leading-relaxed">
          {de
            ? "Im Druckdialog „Als PDF sichern“ wählen. Kopf- und Fusszeilen des Browsers abschalten — sonst steht die Browser-Adresse über dem Briefkopf."
            : "Choose “Save as PDF” in the print dialog. Turn off the browser’s headers and footers — otherwise the browser URL sits above the letterhead."}
        </p>
      </div>

      {/* ------------------------------------------------------------ Titelblock */}
      <header className="report-head">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="report-eyebrow">{de ? "Werkstoffempfehlung" : "Material recommendation"}</p>
            <h1 className="report-title">
              {de ? "Welches FDM-Material passt" : "Which FDM material fits"}
            </h1>
            <p className="report-sub">
              {SITE.toolName[lang]} · {dateLong(lang)}
            </p>
          </div>
          <img src={`${import.meta.env.BASE_URL}brand/reents-logo-horizontal-color.svg`}
            alt={SITE.legalEntity} className="h-10 w-auto shrink-0 dark:brightness-0 dark:invert print:!filter-none"
            width={220} height={40} />
        </div>

        <p className="report-lead">
          {result.ranked.length === 0
            ? (de
              ? `Kein Werkstoff aus dem geprüften Bestand von ${MATERIALS.length} erfüllt dieses Anforderungsprofil vollständig. Die Abschnitte unten zeigen, woran es scheitert.`
              : `None of the ${MATERIALS.length} materials examined meets this requirement profile in full. The sections below show where it fails.`)
            : de
              ? `Von ${MATERIALS.length} geprüften Werkstoffen ${result.ranked.length === 1 ? "erfüllt einer" : `erfüllen ${result.ranked.length}`} das Anforderungsprofil. Am besten passt ${leader!.material.identity.name}.`
              : `Of ${MATERIALS.length} materials examined, ${result.ranked.length === 1 ? "one meets" : `${result.ranked.length} meet`} the requirement profile. The best fit is ${leader!.material.identity.name}.`}
        </p>
      </header>

      {/* ------------------------------------------------- 1 Anforderungsprofil */}
      <section className="report-section">
        <h2 className="report-h2">{no("profile")} · {de ? "Anforderungsprofil" : "Requirement profile"}</h2>
        {reqs.length === 0 ? (
          <p className="report-note">
            {de
              ? "Es wurde keine Anforderung gesetzt. Die Reihenfolge beruht damit allein auf der Standardgewichtung — für eine belastbare Empfehlung sollte der Assistent durchlaufen werden."
              : "No requirement was set. The ranking therefore rests on the default weighting alone — for a dependable recommendation, run the wizard."}
          </p>
        ) : (
          <dl className="report-dl">
            {reqs.map((r) => (
              <div key={r.label} className="report-dl-row">
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* --------------------------------------------------------- 2 Empfehlung */}
      {top.length > 0 && (
        <section className="report-section">
          <h2 className="report-h2">{no("recommendation")} · {de ? "Empfehlung" : "Recommendation"}</h2>
          <table className="report-table">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th>{t("ui.material")}</th>
                <th>{de ? "Familie" : "Family"}</th>
                <th className="num">{t("ui.score")}</th>
                <th className="num">{de ? "Zug X-Y" : "Tensile X-Y"}<br /><span className="unit">MPa</span></th>
                <th className="num">{de ? "Aniso" : "Aniso"}<br /><span className="unit">%</span></th>
                <th className="num">HDT-B<br /><span className="unit">°C</span></th>
                <th className="num">{de ? "Dichte" : "Density"}<br /><span className="unit">g/cm³</span></th>
                <th className="num">{de ? "Datenlage" : "Data"}<br /><span className="unit">%</span></th>
              </tr>
            </thead>
            <tbody>
              {top.map((rec, i) => {
                const aniso = numberAt(rec.material, ANISO);
                return (
                  <tr key={rec.material.id} className={i === 0 ? "lead" : undefined}>
                    <td className="num">{i + 1}</td>
                    <td className="strong">{rec.material.identity.name}</td>
                    <td>{rec.material.identity.family}</td>
                    <td className="num strong">{Math.round(rec.score * 100)} %</td>
                    <td className="num">{fmt(numberAt(rec.material, TENSILE))}</td>
                    <td className="num">{aniso === null ? "–" : Math.round(aniso * 100)}</td>
                    <td className="num">{fmt(numberAt(rec.material, HDTB))}</td>
                    <td className="num">{fmt(numberAt(rec.material, DENSITY))}</td>
                    <td className="num">{dataCompleteness(rec.material)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="report-note">
            {de
              ? "Aniso = Anteil der Zugfestigkeit, der senkrecht zur Schichtebene erhalten bleibt. „Eignung“ ist ein gewichteter Vergleichswert innerhalb dieser Auswahl, keine absolute Note."
              : "Aniso = share of tensile strength retained perpendicular to the layer plane. “Fit” is a weighted comparison within this selection, not an absolute grade."}
          </p>
        </section>
      )}

      {/* -------------------------------------------------------- 3 Begründung */}
      {top.length > 0 && (
        <section className="report-section">
          <h2 className="report-h2">{no("reasoning")} · {de ? "Begründung" : "Reasoning"}</h2>
          {top.slice(0, 3).map((rec, i) => (
            <Reasoning key={rec.material.id} rec={rec} rank={i + 1} t={t} de={de} />
          ))}
        </section>
      )}

      {/* -------------------------------------------------------- 4 Kompromisse */}
      {result.tradeOffs.length > 0 && (
        <section className="report-section">
          <h2 className="report-h2">{no("tradeoffs")} · {de ? "Kompromisse" : "Trade-offs"}</h2>
          <ul className="report-list">
            {result.tradeOffs.map((to) => (
              <li key={to.material.id}>
                <span className="strong">{to.material.identity.name}</span>{" "}
                <span className="muted">({t("ui.tradeoff.relative", { pct: Math.round(to.relativeScore * 100) })})</span>
                {to.gains.length > 0 && (
                  <div className="report-delta">
                    <span className="tag good">{t("ui.tradeoff.gains")}</span>{" "}
                    {to.gains.slice(0, 3).map((d) => `${t(`criterion.${d.criterionId}.label`)} ${d.deltaPct > 0 ? "+" : ""}${d.deltaPct} %`).join(", ")}
                  </div>
                )}
                {to.losses.length > 0 && (
                  <div className="report-delta">
                    <span className="tag bad">{t("ui.tradeoff.losses")}</span>{" "}
                    {to.losses.slice(0, 3).map((d) => `${t(`criterion.${d.criterionId}.label`)} ${d.deltaPct} %`).join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --------------------------------------------------- 5 Ausgeschlossene */}
      {result.rejected.length > 0 && (
        <section className="report-section">
          <h2 className="report-h2">
            {no("rejected")} · {de ? "Ausgeschlossen" : "Excluded"}{" "}
            <span className="report-count">{result.rejected.length}</span>
          </h2>
          <table className="report-table">
            <thead>
              <tr>
                <th>{t("ui.material")}</th>
                <th>{de ? "Grund" : "Reason"}</th>
              </tr>
            </thead>
            <tbody>
              {result.rejected.map((r) => (
                <tr key={r.material.id}>
                  <td className="strong">{r.material.identity.name}</td>
                  <td>
                    {t(r.failed[0].key, r.failed[0].params)}
                    {r.failed.length > 1 && (
                      <span className="muted"> {moreReasons(r.failed.length - 1, de)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ------------------------------------------------ 6 Datenlage & Grenzen */}
      <section className="report-section">
        <h2 className="report-h2">{no("limits")} · {de ? "Datenlage und Grenzen" : "Data basis and limits"}</h2>
        <ul className="report-list">
          {leader && leader.estimatedShare > 0 && (
            <li>
              {de
                ? `Beim erstplatzierten Werkstoff beruhen rund ${Math.round(leader.estimatedShare * 100)} % der bewerteten Kennwerte auf fachlicher Schätzung ohne Primärquelle.`
                : `For the leading material, roughly ${Math.round(leader.estimatedShare * 100)} % of the assessed values rest on expert estimate without a primary source.`}
            </li>
          )}
          {leader && leader.dataGaps.length > 0 && (
            <li>
              {de ? "Für diese gewichteten Kriterien liegen beim erstplatzierten Werkstoff keine Daten vor: " : "No data exists for these weighted criteria on the leading material: "}
              {leader.dataGaps.map((g) => t(`criterion.${g}.label`)).join(", ")}.{" "}
              {de ? "Eine fehlende Angabe wird nirgends als Null gewertet." : "A missing value is never treated as zero."}
            </li>
          )}
          {leader && leader.unverifiedConstraints.length > 0 && (
            <li className="warn">
              {de
                ? "Der erstplatzierte Werkstoff erfüllt mindestens eine Anforderung nur deshalb, weil die zugehörige Angabe im Datenblatt fehlt — nicht, weil sie belegt erfüllt wäre."
                : "The leading material passes at least one requirement only because the corresponding datasheet value is missing — not because it is demonstrably met."}
            </li>
          )}
          <li>
            {de
              ? "Die Kennwerte stammen aus Herstellerdatenblättern. Werte an gedruckten Prüfkörpern und Rohstoffkennwerte aus dem Spritzguss sind nicht direkt vergleichbar; der Datensatz weist die Prüfkörperart je Produkt aus."
              : "Values come from manufacturer datasheets. Values from printed specimens and raw-material values from injection moulding are not directly comparable; the dataset declares the specimen type per product."}
          </li>
          <li>
            {de
              ? "Gedruckte Bauteile sind anisotrop. Jede Festigkeitsangabe gilt für die angegebene Richtung, nicht für das Bauteil als Ganzes."
              : "Printed parts are anisotropic. Every strength value applies to the stated direction, not to the part as a whole."}
          </li>
          <li className="warn">
            {de
              ? "Diese Empfehlung ersetzt keine Bauteilqualifizierung. Vor Serienfreigabe gehört ein Musterteil unter reale Last."
              : "This recommendation does not replace part qualification. Before series release, a sample part belongs under real load."}
          </li>
        </ul>
      </section>

      {/* -------------------------------------------------------------- Quellen */}
      {sources.length > 0 && <Sources sources={sources} de={de} no={no("sources")} />}

      {/* -------------------------------------------------------- Schlussblock */}
      <footer className="report-foot">
        <div className="report-foot-grid">
          <div>
            <p className="strong">{SITE.legalEntity}</p>
            <p>{SITE.contact.street}<br />{SITE.contact.zip} {SITE.contact.city}</p>
            <p>{SITE.contact.phone}<br />{SITE.contact.email}</p>
          </div>
          <div>
            <p className="strong">{de ? "Fertigung" : "Production"}</p>
            <p>
              {SITE.facts.machines}<br />
              {SITE.facts.maxPart}<br />
              {SITE.facts.finishing}<br />
              {SITE.facts.location}
            </p>
          </div>
          <div>
            <p className="strong">{de ? "Zu diesem Dokument" : "About this document"}</p>
            <p>
              {de ? "Erzeugt mit dem " : "Generated with the "}{SITE.toolName[lang]}<br />
              {SITE.urls.live}<br />
              {de ? "Code MIT · Daten CC BY 4.0" : "Code MIT · Data CC BY 4.0"}
            </p>
          </div>
        </div>
        <p className="report-disclaimer">
          {de
            ? "Richtwerte aus Herstellerangaben und Erfahrung. Sie ersetzen keine Bauteilqualifizierung. Reents Technologies GmbH ist 3D-Druck-Dienstleister und kein Materialhersteller — die Bewertung ist herstellerunabhängig und der Portfolio-Status fliesst nicht in sie ein."
            : "Reference values from manufacturer data and experience. They do not replace part qualification. Reents Technologies GmbH is a 3D printing service provider, not a material manufacturer — the assessment is vendor-independent and portfolio status does not enter into it."}
        </p>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------- Unterbausteine */

function Reasoning({ rec, rank, t, de }: { rec: Recommendation; rank: number; t: T; de: boolean }) {
  const groups = [
    { type: "strength", mark: "+", cls: "good", title: de ? "Spricht dafür" : "In favour" },
    { type: "weakness", mark: "−", cls: "bad", title: de ? "Spricht dagegen" : "Against" },
    { type: "risk", mark: "!", cls: "warn", title: de ? "Zu beachten" : "Watch out" },
  ] as const;

  return (
    <article className="report-reason">
      <h3 className="report-h3">
        <span className="rank">{rank}</span> {rec.material.identity.name}
        <span className="muted"> · {Math.round(rec.score * 100)} % {t("ui.score")}</span>
      </h3>
      <p className="report-positioning">{text(rec.material.identity.positioning, de ? "de" : "en")}</p>
      {groups.map((g) => {
        const items = rec.explanations.filter((e) => e.type === g.type);
        if (!items.length) return null;
        return (
          <div key={g.type} className="report-reason-group">
            <p className="report-reason-title">{g.title}</p>
            <ul>
              {items.map((e, i) => (
                <li key={i}><span className={`mark ${g.cls}`} aria-hidden="true">{g.mark}</span>{t(e.key, e.params)}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </article>
  );
}

type SourceEntry = { publisher: string; title: string; url?: string; retrievedAt?: string };

function dedupeSources(recs: Recommendation[]): SourceEntry[] {
  const seen = new Map<string, SourceEntry>();
  for (const r of recs) {
    for (const s of r.material.governance.sources) {
      const key = s.url ?? `${s.publisher}|${s.title}`;
      if (!seen.has(key)) seen.set(key, s);
    }
  }
  return [...seen.values()];
}

function Sources({ sources, de, no }: { sources: SourceEntry[]; de: boolean; no: number }) {
  return (
    <section className="report-section">
      <h2 className="report-h2">{no} · {de ? "Quellen" : "Sources"}</h2>
      <ol className="report-sources">
        {sources.map((s, i) => (
          <li key={i}>
            <span className="strong">{s.publisher}</span>: {s.title}
            {s.url && <span className="url"> — {s.url}</span>}
            {s.retrievedAt && <span className="muted"> ({de ? "abgerufen" : "retrieved"} {s.retrievedAt})</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
