/**
 * Shell, routing and state.
 *
 * The URL is the single source of truth: every requirement and weight lives in the hash
 * query string, so any result is a shareable, bookmarkable link that restores exactly.
 * Hash routing (not history) because GitHub Pages serves no SPA fallback for deep paths.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { SITE, trackedUrl } from "./config/site";
import { LANGS, translate, type Lang } from "./i18n";
import { MATERIALS } from "./data/materials";
import { select, type Requirements } from "./engine";
import { DEFAULT_WEIGHTS } from "./engine/criteria";
import { Button, cx } from "./components/ui";
import { Home } from "./views/Home";
import { Wizard } from "./views/Wizard";
import { Results } from "./views/Results";
import { Detail } from "./views/Detail";
import { Compare } from "./views/Compare";
import { Explorer } from "./views/Explorer";
import { Matrix } from "./views/Matrix";

export type Route =
  | { view: "home" }
  | { view: "wizard"; step: number }
  | { view: "results" }
  | { view: "detail"; id: string }
  | { view: "compare" }
  | { view: "explorer" }
  | { view: "matrix" };

/* ---------------------------------------------------- URL <-> state mapping */

export interface AppState {
  req: Requirements;
  chemicals: string[];
  compare: string[];
  lang: Lang;
}

function parseHash(): { route: Route; params: URLSearchParams } {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  const params = new URLSearchParams(qs ?? "");
  const segs = (path ?? "").split("/").filter(Boolean);
  const view = segs[0] ?? "home";
  if (view === "wizard") return { route: { view: "wizard", step: Number(segs[1] ?? 1) }, params };
  if (view === "results") return { route: { view: "results" }, params };
  if (view === "material" && segs[1]) return { route: { view: "detail", id: segs[1] }, params };
  if (view === "compare") return { route: { view: "compare" }, params };
  if (view === "explorer") return { route: { view: "explorer" }, params };
  if (view === "matrix") return { route: { view: "matrix" }, params };
  return { route: { view: "home" }, params };
}

function stateFromParams(params: URLSearchParams): AppState {
  const req: Requirements = {};
  const n = (k: string) => (params.has(k) ? Number(params.get(k)) : undefined);
  const b = (k: string) => (params.has(k) ? params.get(k) === "1" : undefined);

  req.serviceTemperatureC = n("temp");
  req.outdoorYears = n("years");
  req.maxEdgeMm = n("edge");
  req.quantity = n("qty");
  req.minTensileStrengthMPa = n("minStrength");
  req.minWallThicknessMm = n("wall");
  req.surfaceRaUm = n("ra");
  req.chamberAvailable = b("chamber");
  req.hardenedNozzleAvailable = b("nozzle");
  req.foodContact = b("food");
  req.esd = b("esd");
  req.requiresWatertight = b("watertight");
  req.requiresIsotropic = b("isotropic");
  if (params.get("flex") === "1") req.flexible = true;
  else if (params.get("rigid") === "1") req.flexible = false;
  if (params.get("flame")) req.flameClass = params.get("flame") as Requirements["flameClass"];

  const chemicals = (params.get("chem") ?? "").split(",").filter(Boolean);
  if (chemicals.length) req.chemicals = chemicals;

  const weights: Record<string, number> = { ...DEFAULT_WEIGHTS };
  for (const [k, v] of params.entries()) {
    if (k.startsWith("w.")) weights[k.slice(2)] = Number(v);
  }
  req.weights = weights;

  const lang = (params.get("lang") as Lang) ?? "de";
  return { req, chemicals, compare: (params.get("cmp") ?? "").split(",").filter(Boolean), lang: LANGS.includes(lang) ? lang : "de" };
}

function paramsFromState(s: AppState, base: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); };
  const { req } = s;
  set("temp", req.serviceTemperatureC); set("years", req.outdoorYears);
  set("edge", req.maxEdgeMm); set("qty", req.quantity);
  set("minStrength", req.minTensileStrengthMPa); set("wall", req.minWallThicknessMm); set("ra", req.surfaceRaUm);
  for (const [key, val] of [["chamber", req.chamberAvailable], ["nozzle", req.hardenedNozzleAvailable],
    ["food", req.foodContact], ["esd", req.esd], ["watertight", req.requiresWatertight],
    ["isotropic", req.requiresIsotropic]] as const) {
    if (val !== undefined) p.set(key, val ? "1" : "0");
  }
  if (req.flexible === true) p.set("flex", "1");
  if (req.flexible === false) p.set("rigid", "1");
  set("flame", req.flameClass);
  if (s.chemicals.length) p.set("chem", s.chemicals.join(","));
  if (s.compare.length) p.set("cmp", s.compare.join(","));
  for (const [k, v] of Object.entries(req.weights ?? {})) {
    if (v !== DEFAULT_WEIGHTS[k]) p.set(`w.${k}`, String(v));
  }
  if (s.lang !== "de") p.set("lang", s.lang);
  // preserve view-local params (explorer axes)
  for (const [k, v] of base.entries()) if (k.startsWith("ax")) p.set(k, v);
  return p;
}

/* ---------------------------------------------------------------- the shell */

export function App() {
  const [{ route, params }, setHash] = useState(parseHash);

  useEffect(() => {
    const onHash = () => setHash(parseHash());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const state = useMemo(() => stateFromParams(params), [params]);
  const t = useCallback((k: string, p?: Record<string, string | number>) => translate(state.lang, k, p), [state.lang]);

  const navigate = useCallback((path: string, next?: Partial<AppState>) => {
    const merged: AppState = { ...state, ...next, req: { ...state.req, ...(next?.req ?? {}) } };
    const qs = paramsFromState(merged, params).toString();
    location.hash = `#/${path}${qs ? `?${qs}` : ""}`;
  }, [state, params]);

  const update = useCallback((next: Partial<AppState>) => {
    const path = route.view === "home" ? "" :
      route.view === "wizard" ? `wizard/${route.step}` :
      route.view === "detail" ? `material/${route.id}` : route.view;
    navigate(path, next);
  }, [navigate, route]);

  const result = useMemo(() => select(MATERIALS, state.req), [state.req]);

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header lang={state.lang} onLang={(lang) => update({ lang })} t={t} route={route} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6" id="main">
        {route.view === "home" && <Home t={t} lang={state.lang} navigate={navigate} />}
        {route.view === "wizard" && (
          <Wizard step={route.step} state={state} t={t} navigate={navigate} update={update} />
        )}
        {route.view === "results" && (
          <Results result={result} state={state} t={t} navigate={navigate} update={update} />
        )}
        {route.view === "detail" && (
          <Detail id={route.id} t={t} lang={state.lang} navigate={navigate} state={state} update={update} />
        )}
        {route.view === "compare" && <Compare state={state} t={t} update={update} navigate={navigate} />}
        {route.view === "explorer" && <Explorer t={t} lang={state.lang} params={params} navigate={navigate} />}
        {route.view === "matrix" && <Matrix t={t} lang={state.lang} navigate={navigate} />}
      </main>

      <Footer t={t} lang={state.lang} />
    </div>
  );
}

function Header({ lang, onLang, t, route }: {
  lang: Lang; onLang: (l: Lang) => void; t: (k: string) => string; route: Route;
}) {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white/90 dark:bg-[#141414]/90 backdrop-blur z-20 no-print">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
        <a href="#/" className="flex items-center gap-2.5 shrink-0" aria-label="Start">
          <span className="w-7 h-7 rounded bg-brand-700 dark:bg-brand-300 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 32 32" className="w-5 h-5" aria-hidden="true">
              <path d="M8 22V10h7a4 4 0 0 1 0 8h-3l5 4" className="stroke-brand-300 dark:stroke-brand-800"
                strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-semibold text-sm leading-tight">
            FDM-Material<span className="hl">berater</span>
          </span>
        </a>

        <nav className="ml-auto flex items-center gap-1 text-sm">
          {([["wizard/1", "ui.start.wizard"], ["matrix", "ui.allMaterials"], ["explorer", "ui.start.explorer"]] as const).map(
            ([path, key]) => (
              <a key={path} href={`#/${path}`}
                className={cx("px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 hidden sm:block",
                  route.view === path.split("/")[0] && "text-brand-700 dark:text-brand-300 font-medium")}>
                {t(key)}
              </a>
            ),
          )}
          <div className="flex items-center border border-neutral-300 dark:border-neutral-700 rounded overflow-hidden ml-2">
            {LANGS.map((l) => (
              <button key={l} onClick={() => onLang(l)}
                aria-pressed={lang === l}
                className={cx("px-1.5 py-0.5 text-xs uppercase",
                  lang === l ? "bg-brand-700 text-white dark:bg-brand-300 dark:text-ink" : "hover:bg-neutral-100 dark:hover:bg-neutral-800")}>
                {l}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

function Footer({ t, lang }: { t: (k: string) => string; lang: Lang }) {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 mt-8">
      <div className="max-w-6xl mx-auto px-4 py-6 text-xs muted grid gap-4 sm:grid-cols-3">
        <div>
          <div className="font-medium text-neutral-800 dark:text-neutral-200 mb-1">{SITE.legalEntity}</div>
          <div>{SITE.contact.street}, {SITE.contact.zip} {SITE.contact.city}</div>
          <div>{SITE.facts.machines} · {SITE.facts.maxPart}</div>
          <a className="hl hover:underline" href={trackedUrl(SITE.urls.primary)} target="_blank" rel="noopener">
            reents3d.de
          </a>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2">{t("ui.disclaimerShort")}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <a className="hover:underline" href={SITE.urls.imprint} target="_blank" rel="noopener">
              {lang === "de" ? "Impressum" : "Imprint"}
            </a>
            <a className="hover:underline" href={SITE.urls.privacy} target="_blank" rel="noopener">
              {lang === "de" ? "Datenschutz" : "Privacy"}
            </a>
            <a className="hover:underline" href={`${SITE.urls.repo}/blob/main/DISCLAIMER.md`} target="_blank" rel="noopener">
              {lang === "de" ? "Haftungsausschluss" : "Disclaimer"}
            </a>
            <a className="hover:underline" href={SITE.urls.repo} target="_blank" rel="noopener">GitHub</a>
            <span>{lang === "de" ? "Code MIT · Daten CC BY 4.0" : "Code MIT · Data CC BY 4.0"}</span>
          </div>
          <p className="mt-2 opacity-80">
            {lang === "de"
              ? "Kein Tracking, keine Cookies, keine externen Ressourcen. Marken Dritter gehören ihren Inhabern."
              : "No tracking, no cookies, no external resources. Third-party trademarks belong to their owners."}
          </p>
        </div>
      </div>
    </footer>
  );
}

export { Button };
