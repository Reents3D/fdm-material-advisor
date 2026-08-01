/**
 * Guided advice. Every step is skippable and the live hit count updates as you type —
 * so it never feels like filling in a form for an unknown result.
 */

import { MATERIALS } from "../data/materials";
import { select } from "../engine";
import { CRITERIA } from "../engine/criteria";
import { Button, Card, Toggle, cx } from "../components/ui";
import { SITE } from "../config/site";
import type { AppState } from "../App";

const TOTAL = 7;

const CHEMICALS = [
  ["chem_water", "Wasser"], ["chem_mineral_oil", "Mineralöl"], ["chem_grease", "Fett"],
  ["chem_coolant_mwf", "Kühlschmierstoff"], ["chem_ipa", "IPA / Alkohol"],
  ["chem_acetone", "Aceton"], ["chem_dilute_acid", "verd. Säure"], ["chem_dilute_alkali", "verd. Lauge"],
] as const;

type Props = {
  step: number;
  state: AppState;
  t: (k: string, p?: Record<string, string | number>) => string;
  navigate: (path: string, next?: Partial<AppState>) => void;
  update: (next: Partial<AppState>) => void;
};

export function Wizard({ step, state, t, navigate, update }: Props) {
  const { req } = state;
  const live = select(MATERIALS, req).ranked.length;
  const set = (patch: Partial<AppState["req"]>) => update({ req: patch });
  const go = (n: number) => navigate(`wizard/${n}`);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1 text-xs muted">
        <span>{t("ui.step", { n: step, total: TOTAL })}</span>
        <span aria-live="polite" className="tabular-nums">
          {t("ui.results.count", { n: live })}
        </span>
      </div>
      <div className="h-1 bg-neutral-200 dark:bg-white/5 rounded mb-6 overflow-hidden">
        <div className="h-full bg-petrol-600 dark:bg-petrol-300 transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
      </div>

      <Card>
        {step === 1 && (
          <Step title={t("wiz.1.title")}>
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
          </Step>
        )}

        {step === 2 && (
          <Step title={t("wiz.2.title")} hint={t("wiz.2.tempHint")}>
            <Toggle checked={req.serviceTemperatureC !== undefined}
              onChange={(v) => set({ serviceTemperatureC: v ? 60 : undefined })}
              label={t("wiz.2.temp")} />
            {req.serviceTemperatureC !== undefined && (
              <Slider label={t("wiz.2.temp")} min={30} max={220} step={5} unit="°C"
                value={req.serviceTemperatureC} onChange={(v) => set({ serviceTemperatureC: v })} />
            )}
          </Step>
        )}

        {step === 3 && (
          <Step title={t("wiz.3.title")}>
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

        {step === 4 && (
          <Step title={t("wiz.4.title")}>
            <Toggle checked={req.maxEdgeMm !== undefined} onChange={(v) => set({ maxEdgeMm: v ? 500 : undefined })}
              label={t("wiz.4.edge")} />
            {req.maxEdgeMm !== undefined && (
              <Slider label={t("wiz.4.edge")} min={50} max={SITE.maxEdgeMm} step={50} unit="mm"
                value={req.maxEdgeMm} onChange={(v) => set({ maxEdgeMm: v })} />
            )}
            <Toggle checked={req.quantity !== undefined} onChange={(v) => set({ quantity: v ? 10 : undefined })}
              label={t("wiz.4.quantity")} />
            {req.quantity !== undefined && (
              <Slider label={t("wiz.4.quantity")} min={1} max={5000} step={10} unit=""
                value={req.quantity} onChange={(v) => set({ quantity: v })} />
            )}
          </Step>
        )}

        {step === 5 && (
          <Step title={t("wiz.5.title")}>
            <WeightToggle t={t} state={state} update={update} id="paintability" label={t("wiz.5.painted")} />
            <WeightToggle t={t} state={state} update={update} id="surface" label={t("wiz.5.visible")} />
          </Step>
        )}

        {step === 6 && (
          <Step title={t("wiz.6.title")}>
            <Toggle checked={!!req.foodContact} onChange={(v) => set({ foodContact: v || undefined })} label={t("wiz.6.food")} />
            <Toggle checked={req.flameClass === "V-0"} onChange={(v) => set({ flameClass: v ? "V-0" : undefined })} label={t("wiz.6.flame")} />
            <Toggle checked={!!req.esd} onChange={(v) => set({ esd: v || undefined })} label={t("wiz.6.esd")} />

            <div className="mt-4">
              <div className="text-sm font-medium mb-2">{t("wiz.6.chemicals")}</div>
              <div className="flex flex-wrap gap-1.5">
                {CHEMICALS.map(([id, label]) => {
                  const on = state.chemicals.includes(id);
                  return (
                    <button key={id}
                      onClick={() => {
                        const next = on ? state.chemicals.filter((c) => c !== id) : [...state.chemicals, id];
                        update({ chemicals: next, req: { ...req, chemicals: next.length ? next : undefined } });
                      }}
                      aria-pressed={on}
                      className={cx("px-2 py-1 rounded text-xs border transition-colors",
                        on ? "bg-petrol-700 text-white border-petrol-700 dark:bg-petrol-300 dark:text-ink dark:border-petrol-300"
                           : "border-hairline dark:border-[#1E2B3D] hover:border-petrol-500")}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-hairline dark:border-[#1E2B3D]">
              <div className="text-sm font-medium mb-1">{t("wiz.shop.title")}</div>
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

        {step === 7 && (
          <Step title={t("wiz.7.title")} hint={t("wiz.7.hint")}>
            <div className="grid gap-2.5">
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
          </Step>
        )}

        <div className="flex items-center justify-between gap-2 mt-6 pt-4 border-t border-hairline dark:border-[#1E2B3D]">
          <Button variant="ghost" onClick={() => (step > 1 ? go(step - 1) : navigate(""))}>
            ← {t("ui.back")}
          </Button>
          <div className="flex gap-2">
            {step < TOTAL && <Button variant="ghost" onClick={() => go(step + 1)}>{t("ui.skip")}</Button>}
            <Button onClick={() => (step < TOTAL ? go(step + 1) : navigate("results"))}>
              {step < TOTAL ? `${t("ui.next")} →` : `${t("ui.results.count", { n: live })} →`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
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

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active}
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

function WeightToggle({ state, update, id, label }: {
  t: unknown; state: AppState; update: (n: Partial<AppState>) => void; id: string; label: string;
}) {
  const on = (state.req.weights?.[id] ?? 0) >= 4;
  return (
    <Toggle checked={on} label={label}
      onChange={(v) => update({ req: { ...state.req, weights: { ...state.req.weights, [id]: v ? 5 : 1 } } })} />
  );
}
