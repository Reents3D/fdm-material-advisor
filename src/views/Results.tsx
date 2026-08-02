/**
 * Result view: ranking, reasoning, trade-offs, "why not X?" and the process switch.
 */

import { useState } from "react";
import { MATERIALS, byId } from "../data/materials";
import { whyNot, type SelectionResult } from "../engine";
import { CRITERIA } from "../engine/criteria";
import { SITE, trackedUrl } from "../config/site";
import { Button, Card, Chip, ScoreMeter, Section, cx, fmt, text } from "../components/ui";
import { tableToCsv } from "../lib/csv";
import { downloadText, exportFilename } from "../lib/download";
import { resultColumns, toRankedRows } from "../lib/exports";
import type { AppState } from "../App";

type T = (k: string, p?: Record<string, string | number>) => string;

type Explanation = SelectionResult["ranked"][number]["explanations"][number];

/**
 * Welche Erklaerungen eine Karte zeigt, wenn nicht alle hineinpassen.
 *
 * Risiken zuerst und vollstaendig - sie sind der Grund, warum ein Werkstoff ueberhaupt
 * einen Vorbehalt traegt, und seit die Engine bei knapper Temperatur und Bauteilgroesse
 * abstuft statt auszuschliessen, ersetzen sie einen Ausschluss. Erst danach fuellen
 * Staerken und Schwaechen auf. Vorher standen Risiken am Ende der Liste und fielen bei
 * `slice(0, 4)` regelmaessig heraus.
 */
function visibleExplanations(all: readonly Explanation[], limit: number): Explanation[] {
  const usable = all.filter((e) => e.type !== "gap");
  const risks = usable.filter((e) => e.type === "risk");
  const rest = usable.filter((e) => e.type !== "risk");
  return [...risks, ...rest.slice(0, Math.max(0, limit - risks.length))];
}

export function Results({ result, state, t, navigate, update }: {
  result: SelectionResult; state: AppState; t: T;
  navigate: (p: string, n?: Partial<AppState>) => void;
  update: (n: Partial<AppState>) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [whyId, setWhyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { lang } = state;

  const top = result.ranked.slice(0, showAll ? undefined : 5);

  // Bewusst die vollstaendige Rangliste, nicht die angezeigten fuenf: wer exportiert,
  // will die Tabelle selbst filtern - und merkt sonst nicht, dass etwas fehlt.
  const exportCsv = () => downloadText(
    exportFilename("ergebnis"),
    tableToCsv(toRankedRows(result.ranked), resultColumns(lang, t), "excel-de"),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl font-semibold" aria-live="polite">
          {result.ranked.length ? t("ui.results.count", { n: result.ranked.length }) : t("ui.results.none")}
        </h1>
        <div className="flex flex-wrap gap-2 no-print">
          <Button variant="outline" onClick={() => navigate("wizard/1")}>← {t("ui.back")}</Button>
          <Button variant="outline" onClick={() => { void navigator.clipboard?.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? t("ui.shared") : t("ui.share")}
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={!result.ranked.length}>
            {t("ui.export.result")}
          </Button>
          <Button variant="primary" onClick={() => navigate("report")}>{t("ui.report")}</Button>
        </div>
      </div>

      {!result.ranked.length && (
        <Card className="mb-6 border-ok/40">
          <p className="text-sm">{t("ui.results.noneHint")}</p>
        </Card>
      )}

      {result.processHints.length > 0 && (
        <Section title={t("ui.processHints")}>
          <Card className="border-ok/40 bg-ok/5">
            <ul className="space-y-2 text-sm">
              {result.processHints.map((h) => (
                <li key={h.key}>
                  <span>{t(h.key, h.params)}</span>{" "}
                  <span className="muted">
                    {t("process.alternatives")} {h.suggestedProcesses.join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {top.length > 0 && (
        <Section
          title={lang === "de" ? "Empfehlung" : "Recommendation"}
          right={
            result.ranked.length > 5 && (
              <button className="text-xs hl hover:underline no-print" onClick={() => setShowAll(!showAll)}>
                {showAll ? t("ui.showLess") : t("ui.showAll", { n: result.ranked.length })}
              </button>
            )
          }
        >
          <div className="grid gap-3">
            {top.map((rec, i) => (
              <Card key={rec.material.id} className={cx(
                i === 0 && !rec.unverifiedConstraints.length && "border-petrol-600 dark:border-petrol-400",
                rec.unverifiedConstraints.length > 0 && "border-dashed opacity-90",
              )}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs tabular-nums muted w-5">#{i + 1}</span>
                      <a href={`#/material/${rec.material.id}`} className="font-semibold hover:underline hl">
                        {rec.material.identity.name}
                      </a>
                      <Chip tone="neutral">{rec.material.identity.family}</Chip>
                      {rec.estimatedShare >= 0.4 && <Chip tone="ok">≈ {Math.round(rec.estimatedShare * 100)} % {t("ui.estimatedBadge")}</Chip>}
                      {rec.unverifiedConstraints.length > 0 && (
                        <Chip tone="bad">
                          {lang === "de" ? "nicht belegt" : "unverified"}
                        </Chip>
                      )}
                    </div>
                    <p className="text-sm muted mt-1.5 max-w-2xl">{text(rec.material.identity.positioning, lang)}</p>
                  </div>
                  <div className="w-28 shrink-0">
                    <ScoreMeter score={rec.score} label={t("ui.score")} />
                  </div>
                </div>

                {/* Risiken werden NIE weggeschnitten. Seit die Engine knappe Temperatur
                    und Bauteilgrösse abstuft statt auszuschliessen, ersetzt die Warnung
                    einen Ausschluss - ein Werkstoff, der ohne seinen Vorbehalt in der
                    Liste steht, wäre irreführender als einer, der ganz fehlt. Stärken und
                    Schwächen füllen nur die Plätze, die danach übrig sind. */}
                <ul className="grid gap-1 text-sm mt-3">
                  {visibleExplanations(rec.explanations, i === 0 ? 8 : 4).map((e, k) => (
                    <li key={k} className="flex gap-2 items-start">
                      <span aria-hidden="true" className={cx("mt-0.5 text-xs shrink-0",
                        e.type === "strength" ? "text-good" : e.type === "weakness" ? "text-bad" :
                        e.type === "risk" ? "text-ok" : "muted")}>
                        {e.type === "strength" ? "+" : e.type === "weakness" ? "−" : e.type === "risk" ? "!" : "i"}
                      </span>
                      <span className={e.type === "risk" ? "text-ok dark:text-amber-400" : ""}>
                        {t(e.key, e.params)}
                      </span>
                    </li>
                  ))}
                </ul>

                {rec.dataGaps.length > 0 && (
                  <p className="text-xs muted mt-3">
                    {t("ui.dataGaps")}: {rec.dataGaps.map((g) => t(`criterion.${g}.label`)).join(", ")}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3 no-print">
                  <a href={`#/material/${rec.material.id}`} className="text-xs hl hover:underline">{t("ui.detail")} →</a>
                  <button className="text-xs muted hover:underline"
                    onClick={() => update({ compare: [...new Set([...state.compare, rec.material.id])].slice(0, 5) })}>
                    + {t("ui.compareWith")}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {result.tradeOffs.length > 0 && (
        <Section title={t("ui.tradeoffs")}>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.tradeOffs.map((to) => (
              <Card key={to.material.id}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <a href={`#/material/${to.material.id}`} className="font-medium hl hover:underline">
                    {to.material.identity.name}
                  </a>
                  <Chip tone="brand">{t("ui.tradeoff.relative", { pct: Math.round(to.relativeScore * 100) })}</Chip>
                </div>
                <Deltas title={t("ui.tradeoff.gains")} rows={to.gains} tone="good" t={t} />
                <Deltas title={t("ui.tradeoff.losses")} rows={to.losses} tone="bad" t={t} />
                {to.tightConstraints.length > 0 && (
                  <p className="text-xs text-ok mt-2">
                    ! {lang === "de" ? "Erfüllt eine Anforderung nur knapp." : "Meets one requirement only just."}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </Section>
      )}

      {result.sensitivity.length > 0 && (
        <p className="text-sm muted mb-6">
          {result.sensitivity.map((s) => (
            <span key={s.criterionId} className="block">
              {t("ui.sensitivity", {
                criterion: t(`criterion.${s.criterionId}.label`),
                material: byId(s.wouldWin)?.identity.name ?? s.wouldWin,
              })}
            </span>
          ))}
        </p>
      )}

      <Section title={t("ui.rejected", { n: result.rejected.length })}>
        <div className="no-print">
          <select
            className="surface px-2 py-1.5 text-sm bg-transparent w-full sm:w-auto"
            value={whyId ?? ""}
            onChange={(e) => setWhyId(e.target.value || null)}
            aria-label={t("ui.whyNot")}
          >
            <option value="">{t("ui.whyNot")}</option>
            {MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>{m.identity.name}</option>
            ))}
          </select>
        </div>

        {whyId && <WhyNot id={whyId} state={state} t={t} />}

        {result.rejected.length > 0 && (
          <ul className="grid gap-1.5 mt-3 text-sm">
            {result.rejected.map((r) => (
              <li key={r.material.id} className="flex flex-wrap gap-x-2 items-baseline">
                <a href={`#/material/${r.material.id}`} className="font-medium hover:underline w-24 shrink-0">
                  {r.material.identity.name}
                </a>
                <span className="text-bad">{t(r.failed[0].key, r.failed[0].params)}</span>
                {r.failed.length > 1 && <span className="muted text-xs">+{r.failed.length - 1}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Card className="border-petrol-600/40 bg-petrol-50 dark:bg-petrol-900/20 no-print">
        <p className="text-sm mb-2 font-medium">{t("ui.ctaResult")}</p>
        <p className="text-xs muted mb-3">
          {SITE.facts.machines} · {SITE.facts.maxPart} · {SITE.facts.finishing} · {SITE.facts.location}
        </p>
        <a href={trackedUrl(SITE.urls.contact)} target="_blank" rel="noopener"
          className="inline-block px-3 py-1.5 rounded text-sm font-medium bg-petrol-700 text-white hover:bg-petrol-600 dark:bg-petrol-300 dark:text-ink">
          {SITE.contact.company} →
        </a>
      </Card>
    </div>
  );
}

function Deltas({ title, rows, tone, t }: {
  title: string; tone: "good" | "bad"; t: T;
  rows: { criterionId: string; deltaPct: number; rawFrom: number | null; rawTo: number | null; unit?: string }[];
}) {
  if (!rows.length) return null;
  return (
    <div className="mt-2">
      <div className="text-xs font-medium muted mb-1">{title}</div>
      <ul className="text-sm space-y-0.5">
        {rows.slice(0, 4).map((d) => (
          <li key={d.criterionId} className="flex justify-between gap-2">
            <span>{t(`criterion.${d.criterionId}.label`)}</span>
            <span className={cx("tabular-nums text-xs", tone === "good" ? "text-good" : "text-bad")}>
              {d.rawFrom !== null && d.rawTo !== null && (
                <span className="muted mr-1.5">{fmt(d.rawFrom)} → {fmt(d.rawTo)} {d.unit === "-" ? "" : d.unit}</span>
              )}
              {d.deltaPct > 0 ? "+" : ""}{d.deltaPct} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhyNot({ id, state, t }: { id: string; state: AppState; t: T }) {
  const m = byId(id);
  if (!m) return null;
  const verdicts = whyNot(m, state.req);
  const criteriaLabel = CRITERIA.length; // keep import used for label coverage
  void criteriaLabel;

  return (
    <Card className="mt-3">
      <h3 className="font-medium mb-2">{t("ui.whyNotFor", { name: m.identity.name })}</h3>
      {verdicts.length === 0 && <p className="text-sm muted">{state.lang === "de" ? "Keine Anforderungen gesetzt." : "No requirements set."}</p>}
      <ul className="space-y-1.5 text-sm">
        {verdicts.map((v, i) => (
          <li key={i} className="flex gap-2 items-start">
            <span aria-hidden="true" className={cx("shrink-0 font-mono text-xs mt-0.5",
              v.passed ? (v.dataMissing ? "text-ok" : "text-good") : "text-bad")}>
              {v.passed ? (v.dataMissing ? "?" : "✓") : "✕"}
            </span>
            <span className={v.passed ? "" : "text-bad"}>{t(v.key, v.params)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
