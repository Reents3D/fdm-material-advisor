/**
 * Shell, routing and state.
 *
 * The URL is the single source of truth: every requirement and weight lives in the hash
 * query string, so any result is a shareable, bookmarkable link that restores exactly.
 * Hash routing (not history) because GitHub Pages serves no SPA fallback for deep paths.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { LANGS, translate, type Lang } from "./i18n";
import { MATERIALS } from "./data/materials";
import { select, type Requirements } from "./engine";
import { DEFAULT_WEIGHTS } from "./engine/criteria";
import { Button } from "./components/ui";
import { Header, Footer } from "./components/Chrome";
import { Home } from "./views/Home";
import { Wizard } from "./views/Wizard";
import { Results } from "./views/Results";
import { Detail } from "./views/Detail";
import { Compare } from "./views/Compare";
import { Explorer } from "./views/Explorer";
import { Matrix } from "./views/Matrix";
import { Brands } from "./views/Brands";
import { UseCases } from "./views/UseCases";
import { Glossary } from "./views/Glossary";
import { Compliance } from "./views/Compliance";

export type Route =
  | { view: "home" }
  | { view: "wizard"; step: number }
  | { view: "results" }
  | { view: "detail"; id: string }
  | { view: "compare" }
  | { view: "explorer" }
  | { view: "matrix" }
  | { view: "brands" }
  | { view: "usecases" }
  | { view: "glossary" }
  | { view: "compliance" };

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
  if (view === "brands") return { route: { view: "brands" }, params };
  if (view === "usecases") return { route: { view: "usecases" }, params };
  if (view === "glossar" || view === "glossary") return { route: { view: "glossary" }, params };
  if (view === "compliance") return { route: { view: "compliance" }, params };
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
  req.annealingOvenAvailable = b("oven");
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
  for (const [key, val] of [["chamber", req.chamberAvailable], ["nozzle", req.hardenedNozzleAvailable], ["oven", req.annealingOvenAvailable],
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
      <Header lang={state.lang} onLang={(lang) => update({ lang })} t={t} view={route.view === "detail" ? "material" : route.view} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8" id="main">
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
        {route.view === "brands" && <Brands t={t} lang={state.lang} navigate={navigate} />}
        {route.view === "usecases" && <UseCases t={t} lang={state.lang} />}
        {route.view === "glossary" && <Glossary t={t} lang={state.lang} />}
        {route.view === "compliance" && <Compliance t={t} lang={state.lang} navigate={navigate} />}
      </main>

      <Footer t={t} lang={state.lang} />
    </div>
  );
}

export { Button };
