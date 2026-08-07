/**
 * Guided advice.
 *
 * WAS SICH GEGENUEBER DER ERSTEN FASSUNG GEAENDERT HAT UND WARUM
 *
 * 1. SIEBEN SCHRITTE WAREN SIEBEN UNGLEICHE SCHRITTE. Schritt 1 bestand aus zwei
 *    Schaltflaechen, Schritt 6 aus drei Haken, einundzwanzig Medien und drei
 *    Werkstattfragen. Jetzt sind es sechs Schritte mit vergleichbarer Fuellung: Umgebung
 *    und Temperatur gehoeren zusammen, die Werkstattausstattung gehoert zum Bauteil.
 *
 * 2. "UEBERSPRINGEN" TAT NICHTS ANDERES ALS "WEITER". Beide riefen dieselbe Funktion auf.
 *    Eine Schaltflaeche, die "ueberspringen" heisst und nichts ueberspringt, ist eine
 *    Falschaussage. Sie setzt jetzt die Angaben DIESES Schritts zurueck und geht weiter -
 *    und sie erscheint nur, wenn es ueberhaupt etwas zurueckzusetzen gibt.
 *
 * 3. NIEMAND KONNTE SEHEN, WAS ER SCHON GESAGT HATTE. Sieben Schritte ohne Rueckblick.
 *    Jetzt steht ueber dem Formular eine Leiste mit allen gesetzten Anforderungen; jede
 *    laesst sich einzeln wieder entfernen.
 *
 * 4. DIE SACKGASSE WAR EINE SACKGASSE. Wer sich auf null Treffer filterte, erfuhr das
 *    erst auf der Ergebnisseite und ohne Begruendung. Jetzt sagt der Assistent an Ort und
 *    Stelle, WELCHE Anforderung alles ausgeschlossen hat, und bietet an, genau sie zu
 *    loesen. Die Auskunft stammt aus den Ablehnungsgruenden der Engine, nicht aus einer
 *    Heuristik.
 *
 * 5. ZWANZIG ANWENDUNGSFAELLE LAGEN UNGENUTZT DANEBEN. Wer ein Gleitlager auslegt, muss
 *    nicht sechs Schritte durchklicken - der fertige Fall setzt alles auf einmal.
 *
 * 6. SECHZEHN REGLER WAREN DER LETZTE EINDRUCK. Die Gewichtung entscheidet die
 *    Reihenfolge, aber "Schichthaftung 3" sagt einem Konstrukteur nichts, der zum ersten
 *    Mal hier ist. Jetzt waehlt man einen benannten Schwerpunkt; die Regler bleiben
 *    darunter fuer alle, die es genau wissen wollen.
 */

import { useState } from "react";
import { MATERIALS } from "../data/materials";
import { select } from "../engine";
import { CRITERIA, DEFAULT_WEIGHTS } from "../engine/criteria";
import { USECASES, useCaseParams } from "../data/usecases";
import { Button, Card, Toggle, cx, text } from "../components/ui";
import { CHEMICALS, CHEMICAL_CATEGORIES, chemicalById, chemicalCoverage, isThinData, MATERIAL_COUNT } from "../data/chemicals";
/* Anforderungsliste und Schwerpunkte liegen seit 2026-08-02 gemeinsam in lib/requirements.ts -
   die Ergebnisseite zeigt dieselbe Aufstellung, und zwei Fassungen waeren zwei Wahrheiten. */
import { activeRequirements, matchesPreset, PRESETS, type ActiveReq } from "../lib/requirements";
import type { Requirements } from "../engine";
import type { AppState } from "../App";

type Req = AppState["req"];

/* Jeder Schritt weiss, welche Anforderungsfelder ihm gehoeren. Nur so kann
   "Ueberspringen" wirklich ueberspringen, statt bloss weiterzublaettern. */
const STEPS: { key: string; owns: (keyof Req)[]; ownsWeights?: string[] }[] = [
  { key: "env", owns: ["outdoorYears", "serviceTemperatureC", "thermalLoad"] },
  { key: "load", owns: ["minTensileStrengthMPa", "flexible"] },
  { key: "part", owns: ["quantity", "chamberAvailable", "hardenedNozzleAvailable", "annealingOvenAvailable"] },
  { key: "look", owns: [], ownsWeights: ["paintability", "surface"] },
  { key: "rules", owns: ["foodContact", "flameClass", "esd", "chemicals"] },
  { key: "weights", owns: [] },
];
const TOTAL = STEPS.length;

type Props = {
  step: number;
  state: AppState;
  t: (k: string, p?: Record<string, string | number>) => string;
  navigate: (path: string, next?: Partial<AppState>) => void;
  update: (next: Partial<AppState>) => void;
};

export function Wizard({ step: rawStep, state, t, navigate, update }: Props) {
  const [showSliders, setShowSliders] = useState(false);
  // Alte Lesezeichen zeigen auf Schritt 7 - der Assistent hat jetzt sechs. Klemmen statt
  // eine leere Seite zeigen.
  const step = Math.min(Math.max(1, rawStep), TOTAL);
  const { req } = state;
  const result = select(MATERIALS, req);
  const live = result.ranked.length;
  const set = (patch: Partial<Req>) => update({ req: patch });
  const go = (n: number) => navigate(`wizard/${Math.min(Math.max(1, n), TOTAL)}`);
  const lang = state.lang;

  /* --- was gerade gesetzt ist, und wie man es einzeln wieder loswird ------- */
  const active = activeRequirements(req, state.chemicals, t, lang);
  const clearOne = (r: ActiveReq) => update(r.patch(req));

  /* --- Sackgasse: welche Anforderung hat alles ausgeschlossen? -------------
     Nicht geraten, sondern aus den Ablehnungsgruenden der Engine gezaehlt. */
  const blocker = live === 0 ? dominantBlocker(result) : null;
  const blockerReq = blocker ? active.find((a) => a.constraintId === blocker) : undefined;

  /* --- Ueberspringen zeigt sich nur, wenn es etwas zu ueberspringen gibt --- */
  const cur = STEPS[step - 1];
  const hasOwnAnswers =
    cur.owns.some((f) => req[f] !== undefined) ||
    (cur.ownsWeights?.some((w) => (req.weights?.[w] ?? 0) !== (DEFAULT_WEIGHTS[w] ?? 0)) ?? false);

  const skipStep = () => {
    const patch: Partial<Req> = {};
    for (const f of cur.owns) patch[f] = undefined as never;
    const weights = { ...req.weights };
    for (const w of cur.ownsWeights ?? []) weights[w] = DEFAULT_WEIGHTS[w] ?? 0;
    update({ req: { ...patch, weights }, ...(cur.owns.includes("chemicals") ? { chemicals: [] } : {}) });
    go(step + 1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* --- Schrittleiste: zeigt den Stand UND laesst springen -------------- */}
      <nav aria-label={t("wiz.nav.label")} className="flex items-center gap-1 mb-2">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const answered = s.owns.some((f) => req[f] !== undefined);
          return (
            <button
              key={s.key}
              onClick={() => go(n)}
              aria-current={n === step ? "step" : undefined}
              title={t(`wiz.${s.key}.title`)}
              className={cx(
                "flex-1 group flex flex-col gap-1 pt-1 text-left",
                n === step ? "" : "opacity-70 hover:opacity-100",
              )}
            >
              <span className={cx(
                "h-1 rounded transition-colors",
                n === step ? "bg-petrol-600 dark:bg-petrol-300"
                  : answered ? "bg-petrol-400/70 dark:bg-petrol-400/60"
                  : "bg-neutral-200 dark:bg-white/10",
              )} />
              <span className="text-[10px] uppercase tracking-wider muted truncate hidden sm:block">
                {t(`wiz.${s.key}.short`)}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Auf schmalen Schirmen untereinander: nebeneinander brechen beide Texte
          ineinander und "Schritt 5 von 6" zerfaellt mitten in die Trefferzahl. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 mb-4 text-xs muted">
        <span className="shrink-0">{t("ui.step", { n: step, total: TOTAL })}</span>
        <span aria-live="polite" className="tabular-nums">
          {live === MATERIALS.length
            ? t("wiz.count.all", { n: live })
            : t("wiz.count.some", { n: live, total: MATERIALS.length })}
        </span>
      </div>

      {/* --- Was Sie bisher gesagt haben ------------------------------------ */}
      {active.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider muted mr-0.5">{t("wiz.summary")}</span>
          {active.map((a) => (
            <button
              key={a.id}
              onClick={() => clearOne(a)}
              title={t("wiz.summary.remove")}
              className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs border
                         border-hairline dark:border-[#1E2B3D] hover:border-bad hover:text-bad transition-colors"
            >
              {a.label}
              <span aria-hidden="true" className="opacity-50">×</span>
            </button>
          ))}
        </div>
      )}

      {/* --- Sackgasse: nicht schweigen, sondern den Grund nennen ------------ */}
      {live === 0 && (
        <Card className="mb-4 border-warn/50">
          <p className="text-sm font-medium mb-1">{t("wiz.dead.title")}</p>
          <p className="text-xs muted leading-relaxed mb-3">
            {blockerReq ? t("wiz.dead.blocker", { what: blockerReq.label }) : t("wiz.dead.generic")}
          </p>
          <div className="flex flex-wrap gap-2">
            {blockerReq && (
              <Button variant="outline" onClick={() => clearOne(blockerReq)}>
                {t("wiz.dead.release", { what: blockerReq.label })}
              </Button>
            )}
            <Button variant="ghost" onClick={() => update({ req: resetAll(), chemicals: [] })}>
              {t("wiz.dead.reset")}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {/* ------------------------------------------------ 1 Umgebung */}
        {step === 1 && (
          <Step title={t("wiz.env.title")} hint={t("wiz.env.hint")}>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Choice active={req.outdoorYears === undefined} onClick={() => set({ outdoorYears: undefined })}>
                {t("wiz.1.indoor")}
              </Choice>
              <Choice active={req.outdoorYears !== undefined} onClick={() => set({ outdoorYears: req.outdoorYears ?? 5 })}>
                {t("wiz.1.outdoor")}
              </Choice>
            </div>
            {req.outdoorYears !== undefined && (
              <Slider label={t("wiz.1.outdoorYears")} min={1} max={15} step={1} unit="a"
                value={req.outdoorYears} onChange={(v) => set({ outdoorYears: v })} />
            )}

            <div className="mt-5 pt-4 border-t border-hairline dark:border-[#1E2B3D]">
              <Toggle checked={req.serviceTemperatureC !== undefined}
                onChange={(v) => set({ serviceTemperatureC: v ? 60 : undefined })}
                label={t("wiz.2.temp")} hint={t("wiz.2.tempHint")} />
              {req.serviceTemperatureC !== undefined && (
                <>
                  <Slider label={t("wiz.2.temp")} min={30} max={220} step={5} unit="°C"
                    value={req.serviceTemperatureC} onChange={(v) => set({ serviceTemperatureC: v })} />

                  {/* DIE WICHTIGSTE FRAGE ZUR TEMPERATUR - UND SIE FEHLTE.
                      Wie warm ein Bauteil darf, ist keine Werkstoffkonstante: Was einen
                      Thermoplast begrenzt, ist Kriechen unter Spannung, und Spannung senkt
                      man mit Wandstaerke und Fuellgrad. Ohne diese Angabe musste die Engine
                      immer vom schlimmeren Fall ausgehen - deshalb trug PETG bei 60 °C
                      selbst fuer ein Gehaeuse einen Warnhinweis, obwohl 71 °C gemessen sind.
                      Sie steht direkt unter dem Regler, weil sie nur mit ihm zusammen
                      einen Sinn ergibt. */}
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-1">{t("wiz.2.load")}</div>
                    <p className="text-xs muted mb-2.5 leading-relaxed">{t("wiz.2.loadHint")}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {(["none", "sustained"] as const).map((k) => (
                        <Choice key={k} active={req.thermalLoad === k}
                          label={t(`wiz.2.load.${k}`)}
                          onClick={() => set({ thermalLoad: req.thermalLoad === k ? undefined : k })}>
                          <span className="block font-medium">{t(`wiz.2.load.${k}`)}</span>
                          <span className="block text-xs muted mt-0.5">{t(`wiz.2.load.${k}.desc`)}</span>
                        </Choice>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Der schnellste Weg zum Ergebnis fuehrt oft gar nicht durch das Formular. */}
            <div className="mt-5 pt-4 border-t border-hairline dark:border-[#1E2B3D]">
              <div className="text-sm font-medium mb-1">{t("wiz.usecase.title")}</div>
              <p className="text-xs muted mb-2.5 leading-relaxed">{t("wiz.usecase.hint")}</p>
              <div className="flex flex-wrap gap-1.5">
                {USECASES.slice(0, 6).map((u) => (
                  <button key={u.id}
                    onClick={() => { location.hash = `#/results?${useCaseParams(u, lang)}`; }}
                    className="px-2 py-1 rounded text-xs border border-hairline dark:border-[#1E2B3D]
                               hover:border-petrol-500 transition-colors">
                    {text(u.title, lang)}
                  </button>
                ))}
                <button onClick={() => navigate("usecases")}
                  className="px-2 py-1 rounded text-xs hl hover:underline">
                  {t("wiz.usecase.all", { n: USECASES.length })} →
                </button>
              </div>
            </div>
          </Step>
        )}

        {/* ------------------------------------------------ 2 Belastung */}
        {step === 2 && (
          <Step title={t("wiz.load.title")} hint={t("wiz.load.hint")}>
            <div className="grid gap-2 mb-4">
              {([["none", undefined], ["light", 25], ["medium", 45], ["high", 70]] as const).map(([k, v]) => (
                <Choice key={k} active={req.minTensileStrengthMPa === v} onClick={() => set({ minTensileStrengthMPa: v })}>
                  {t(`wiz.3.load.${k}`)}
                  {v !== undefined && <span className="muted text-xs ml-2">≥ {v} MPa</span>}
                </Choice>
              ))}
            </div>
            <Toggle checked={req.flexible === true}
              onChange={(v) => set({ flexible: v ? true : undefined })} label={t("wiz.3.flexible")} />
          </Step>
        )}

        {/* ------------------------------------------------ 3 Bauteil und Fertigung */}
        {step === 3 && (
          <Step title={t("wiz.part.title")}>
            {/* Die Frage nach der Kantenlaenge stand hier bis 2026-08-07. Sie stufte
                Werkstoffe an einer Fertigungsaussage ab - siehe engine/criteria.ts. */}
            <Toggle checked={req.quantity !== undefined} onChange={(v) => set({ quantity: v ? 10 : undefined })}
              label={t("wiz.4.quantity")} />
            {req.quantity !== undefined && (
              <Slider label={t("wiz.4.quantity")} min={1} max={5000} step={10} unit=""
                value={req.quantity} onChange={(v) => set({ quantity: v })} />
            )}

            <div className="mt-5 pt-4 border-t border-hairline dark:border-[#1E2B3D]">
              <div className="text-sm font-medium mb-1">{t("wiz.shop.title")}</div>
              <p className="text-xs muted mb-1.5 leading-relaxed">{t("wiz.shop.hint")}</p>
              <Toggle checked={req.chamberAvailable !== false}
                onChange={(v) => set({ chamberAvailable: v ? undefined : false })} label={t("wiz.shop.chamber")} />
              <Toggle checked={req.hardenedNozzleAvailable !== false}
                onChange={(v) => set({ hardenedNozzleAvailable: v ? undefined : false })} label={t("wiz.shop.nozzle")} />
              <Toggle checked={req.annealingOvenAvailable !== false}
                onChange={(v) => set({ annealingOvenAvailable: v ? undefined : false })}
                label={t("wiz.shop.oven")} hint={t("wiz.shop.ovenHint")} />
            </div>
          </Step>
        )}

        {/* ------------------------------------------------ 4 Optik */}
        {step === 4 && (
          <Step title={t("wiz.look.title")} hint={t("wiz.look.hint")}>
            <WeightToggle state={state} update={update} id="paintability" label={t("wiz.5.painted")} />
            <WeightToggle state={state} update={update} id="surface" label={t("wiz.5.visible")} />
          </Step>
        )}

        {/* ------------------------------------------------ 5 Regulatorik und Medien */}
        {step === 5 && (
          <Step title={t("wiz.rules.title")}>
            <Toggle checked={!!req.foodContact} onChange={(v) => set({ foodContact: v || undefined })} label={t("wiz.6.food")} />
            <Toggle checked={req.flameClass === "V-0"} onChange={(v) => set({ flameClass: v ? "V-0" : undefined })} label={t("wiz.6.flame")} />
            <Toggle checked={!!req.esd} onChange={(v) => set({ esd: v || undefined })} label={t("wiz.6.esd")} />

            <div className="mt-5 pt-4 border-t border-hairline dark:border-[#1E2B3D]">
              <div className="text-sm font-medium mb-1">{t("wiz.6.chemicals")}</div>
              <p className="text-xs muted mb-2.5 max-w-2xl leading-relaxed">{t("wiz.6.chemicalsHint")}</p>
              {CHEMICAL_CATEGORIES.map((cat) => {
                const items = CHEMICALS.filter((c) => c.category === cat.id);
                if (!items.length) return null;
                return (
                  <div key={cat.id} className="mb-2.5">
                    <div className="text-[11px] uppercase tracking-wider muted mb-1">
                      {lang === "de" ? cat.de : cat.en}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((c) => {
                        const on = state.chemicals.includes(c.id);
                        const thin = isThinData(c.id);
                        return (
                          <button key={c.id}
                            onClick={() => {
                              const next = on ? state.chemicals.filter((x) => x !== c.id) : [...state.chemicals, c.id];
                              update({ chemicals: next, req: { ...req, chemicals: next.length ? next : undefined } });
                            }}
                            aria-pressed={on}
                            title={`${text(c.examples, lang)} — ${text(c.effect, lang)}`}
                            className={cx("px-2 py-1 rounded text-xs border transition-colors inline-flex items-center gap-1.5",
                              on ? "bg-petrol-700 text-white border-petrol-700 dark:bg-petrol-300 dark:text-ink dark:border-petrol-300"
                                 : "border-hairline dark:border-[#1E2B3D] hover:border-petrol-500")}>
                            {text(c.name, lang)}
                            {/* Die Abdeckungszahl steht nur da, wo sie etwas aussagt: bei
                                duenner Datenlage. Sie ueberall zu zeigen hiesse, einundzwanzig
                                Mal dieselbe Zahl zu wiederholen. */}
                            {thin && <span className="tabular-nums text-warn">{chemicalCoverage(c.id)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {state.chemicals.length > 0 && (
                <div className="mt-3 space-y-2">
                  {state.chemicals.map(chemicalById).filter(Boolean).map((c) => (
                    <p key={c!.id} className="text-xs leading-relaxed">
                      <strong>{text(c!.name, lang)}</strong>
                      <span className="muted"> — {text(c!.examples, lang)}. </span>
                      {text(c!.effect, lang)}
                      {isThinData(c!.id) && (
                        <span className="text-warn">
                          {" "}{lang === "de"
                            ? `Nur ${chemicalCoverage(c!.id)} von ${MATERIAL_COUNT} Werkstoffen haben hierzu einen belegten Wert.`
                            : `Only ${chemicalCoverage(c!.id)} of ${MATERIAL_COUNT} materials carry a sourced value here.`}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </Step>
        )}

        {/* ------------------------------------------------ 6 Schwerpunkt */}
        {step === 6 && (
          <Step title={t("wiz.weights.title")} hint={t("wiz.weights.hint")}>
            <div className="grid sm:grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <Choice key={p.id}
                  active={matchesPreset(req.weights, p.weights)}
                  label={t(`wiz.preset.${p.id}`)}
                  onClick={() => update({ req: { ...req, weights: { ...DEFAULT_WEIGHTS, ...p.weights } } })}>
                  <span className="block font-medium">{t(`wiz.preset.${p.id}`)}</span>
                  <span className="block text-xs muted mt-0.5">{t(`wiz.preset.${p.id}.desc`)}</span>
                </Choice>
              ))}
            </div>

            <button onClick={() => setShowSliders((v) => !v)}
              className="mt-4 text-xs hl hover:underline"
              aria-expanded={showSliders}>
              {showSliders ? t("wiz.weights.hideDetail") : t("wiz.weights.showDetail")}
            </button>

            {showSliders && (
              <div className="grid gap-2.5 mt-3 pt-3 border-t border-hairline dark:border-[#1E2B3D]">
                {CRITERIA.map((c) => (
                  <div key={c.id} className="grid grid-cols-[9rem_1fr_1.5rem] items-center gap-3">
                    <label htmlFor={`w-${c.id}`} className="text-sm truncate">{t(`criterion.${c.id}.label`)}</label>
                    <input id={`w-${c.id}`} type="range" min={0} max={5} step={1}
                      value={req.weights?.[c.id] ?? 0}
                      onChange={(e) => update({ req: { ...req, weights: { ...req.weights, [c.id]: Number(e.target.value) } } })}
                      className="accent-petrol-700 dark:accent-petrol-300" />
                    <span className="text-xs tabular-nums muted text-right">{req.weights?.[c.id] ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </Step>
        )}

        <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-hairline dark:border-[#1E2B3D]">
          <Button variant="ghost" onClick={() => (step > 1 ? go(step - 1) : navigate(""))}>
            ← {t("ui.back")}
          </Button>
          <div className="flex gap-2">
            {step < TOTAL && hasOwnAnswers && (
              <Button variant="ghost" onClick={skipStep}>{t("wiz.reset.step")}</Button>
            )}
            <Button onClick={() => (step < TOTAL ? go(step + 1) : navigate("results"))} disabled={step === TOTAL && live === 0}>
              {step < TOTAL ? `${t("ui.next")} →` : `${t("ui.results.count", { n: live })} →`}
            </Button>
          </div>
        </div>
      </Card>

      {step < TOTAL && (
        <div className="text-center mt-3">
          <button onClick={() => navigate("results")} disabled={live === 0}
            className="text-xs hl hover:underline disabled:opacity-40 disabled:no-underline">
            {t("wiz.jumpToResults", { n: live })} →
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Hilfsteile */

/** Welche Anforderung hat die meisten Werkstoffe ausgeschlossen? Gezaehlt, nicht geraten. */
function dominantBlocker(result: ReturnType<typeof select>): string | null {
  const tally = new Map<string, number>();
  for (const r of result.rejected) {
    for (const f of r.failed) tally.set(f.constraintId, (tally.get(f.constraintId) ?? 0) + 1);
  }
  let best: string | null = null, n = 0;
  for (const [id, count] of tally) if (count > n) { best = id; n = count; }
  return best;
}

/** Alles zuruecksetzen - bis auf die Gewichtung, die keine Treffer ausschliesst. */
function resetAll(): Requirements {
  return { weights: { ...DEFAULT_WEIGHTS } };
}

function Step({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">{title}</h1>
      {hint && <p className="text-xs muted mb-4 leading-relaxed">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

/** `label` setzt einen expliziten Namen, wo der Inhalt mehrzeilig ist - sonst liest ein
    Screenreader Titel und Beschreibung als einen Satz vor. */
function Choice({ active, onClick, children, label }: {
  active: boolean; onClick: () => void; children: React.ReactNode; label?: string;
}) {
  return (
    <button onClick={onClick} aria-pressed={active} aria-label={label}
      className={cx("px-3 py-2 rounded border text-sm text-left transition-colors",
        active ? "border-petrol-600 bg-petrol-50 dark:bg-petrol-900/40 dark:border-petrol-400 font-medium"
               : "border-hairline dark:border-[#1E2B3D] hover:border-petrol-400")}>
      {children}
    </button>
  );
}

function Slider({ label, min, max, step, value, unit, onChange }: {
  label: string; min: number; max: number; step: number; value: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="muted">{label}</span>
        <span className="font-medium tabular-nums">{value.toLocaleString("de-DE")} {unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-petrol-700 dark:accent-petrol-300" />
    </div>
  );
}

/** Aus-Zustand heisst Standardgewicht, nicht 1 - sonst geht der Standard beim
    Abwaehlen still verloren (Oberflaeche steht im Standard auf 2, nicht auf 1). */
function WeightToggle({ state, update, id, label }: {
  state: AppState; update: (n: Partial<AppState>) => void; id: string; label: string;
}) {
  const on = (state.req.weights?.[id] ?? 0) >= 4;
  return (
    <Toggle checked={on} label={label}
      onChange={(v) => update({
        req: { ...state.req, weights: { ...state.req.weights, [id]: v ? 5 : (DEFAULT_WEIGHTS[id] ?? 1) } },
      })} />
  );
}
