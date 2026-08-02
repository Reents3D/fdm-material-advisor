/**
 * Ashby-style property chart. Hand-rolled SVG rather than a charting library:
 * the whole page budget is 350 kB gzip and this costs about 5 kB.
 *
 * Drei Dinge, die dieses Diagramm von einem normalen Streudiagramm unterscheiden:
 *
 *  1. DRITTE DIMENSION über die Punktgrösse. Werkstoffauswahl ist selten eine Frage von
 *     zwei Grössen — Festigkeit über Temperatur ist erst dann eine Entscheidung, wenn
 *     der Preis mit im Bild ist.
 *  2. KONFIDENZ IST SICHTBAR. Punkte, deren Koordinate auf einer Schätzung beruht,
 *     bekommen einen gestrichelten Ring. Ein Diagramm, das Messwerte und Schätzungen
 *     gleich aussehen lässt, ist die bequemste Art, Präzision zu erfinden.
 *  3. FEHLENDE WERKSTOFFE WERDEN GENANNT. Wer nur eine Punktwolke zeigt, suggeriert
 *     Vollständigkeit. Unter dem Diagramm steht deshalb namentlich, wer fehlt und warum.
 */

import { useMemo } from "react";
import { MATERIALS } from "../data/materials";
import type { Material } from "../engine/types";
import { Card, Chip, Disclosure, cx, fmt } from "../components/ui";
import type { Lang } from "../i18n";
import { idList } from "../App";

type T = (k: string, p?: Record<string, string | number>) => string;

interface Axis {
  id: string;
  group: string;
  label: [string, string];
  unit: string;
  log?: boolean;
  /** true = kleiner ist besser (Preisindex, Verzug, Hygroskopie). */
  lowerIsBetter?: boolean;
  path: string;
}

/** Pfadzugriff auf den lose typisierten Datensatz. Fehlt etwas, ist es null — nie 0. */
function at(m: Material, path: string): { value: number | null; confidence?: string } | null {
  let cur: unknown = m;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[seg];
  }
  if (cur == null || typeof cur !== "object" || !("value" in (cur as object))) return null;
  const q = cur as { value: unknown; confidence?: string };
  return typeof q.value === "number" ? { value: q.value, confidence: q.confidence } : null;
}

const G_MECH = "Mechanik", G_THERM = "Thermik", G_PROC = "Verarbeitung";
const G_DUR = "Beständigkeit", G_COM = "Wirtschaftlichkeit";

const AXES: Axis[] = [
  { id: "strength", group: G_MECH, label: ["Zugfestigkeit X-Y", "Tensile strength X-Y"], unit: "MPa", path: "mechanics.tensileStrengthXy" },
  { id: "modulus", group: G_MECH, label: ["E-Modul X-Y", "Modulus X-Y"], unit: "MPa", path: "mechanics.tensileModulusXy" },
  { id: "elong", group: G_MECH, label: ["Bruchdehnung", "Elongation at break"], unit: "%", log: true, path: "mechanics.elongationAtBreakXy" },
  { id: "flexstr", group: G_MECH, label: ["Biegefestigkeit", "Flexural strength"], unit: "MPa", path: "mechanics.flexuralStrengthXy" },
  { id: "flexmod", group: G_MECH, label: ["Biegemodul", "Flexural modulus"], unit: "MPa", path: "mechanics.flexuralModulusXy" },
  { id: "impact", group: G_MECH, label: ["Charpy ungekerbt X-Y", "Charpy unnotched X-Y"], unit: "kJ/m²", log: true, path: "mechanics.charpyUnnotchedXy" },
  { id: "notched", group: G_MECH, label: ["Charpy gekerbt X-Y", "Charpy notched X-Y"], unit: "kJ/m²", log: true, path: "mechanics.charpyNotchedXy" },
  { id: "aniso", group: G_MECH, label: ["Anisotropiefaktor Z/X-Y", "Anisotropy factor Z/X-Y"], unit: "", path: "mechanics.anisotropyFactorTensile" },
  { id: "toughness", group: G_MECH, label: ["Zähigkeit (Bewertung)", "Toughness (rating)"], unit: "1–5", path: "mechanics.toughness" },
  { id: "density", group: G_MECH, label: ["Dichte", "Density"], unit: "g/cm³", path: "mechanics.density" },

  { id: "hdtb", group: G_THERM, label: ["HDT-B (0,45 MPa)", "HDT-B (0.45 MPa)"], unit: "°C", path: "thermal.hdtB" },
  { id: "hdta", group: G_THERM, label: ["HDT-A (1,8 MPa)", "HDT-A (1.8 MPa)"], unit: "°C", path: "thermal.hdtA" },
  { id: "vicat", group: G_THERM, label: ["Vicat B50", "Vicat B50"], unit: "°C", path: "thermal.vicatB50" },
  { id: "service", group: G_THERM, label: ["Dauergebrauchstemperatur", "Continuous service temperature"], unit: "°C", path: "thermal.recommendedMaxServiceTemperature" },

  { id: "printability", group: G_PROC, label: ["Druckbarkeit", "Printability"], unit: "1–5", path: "processing.printability" },
  { id: "warping", group: G_PROC, label: ["Verzugsneigung", "Warping tendency"], unit: "1–5", lowerIsBetter: true, path: "processing.warpingTendency" },
  { id: "hygro", group: G_PROC, label: ["Hygroskopie", "Hygroscopy"], unit: "1–5", lowerIsBetter: true, path: "processing.hygroscopy" },
  { id: "abrasive", group: G_PROC, label: ["Abrasivität", "Abrasiveness"], unit: "1–5", lowerIsBetter: true, path: "processing.abrasiveness" },
  { id: "nozzle", group: G_PROC, label: ["Düsentemperatur", "Nozzle temperature"], unit: "°C", path: "processing.nozzleTemperature" },

  { id: "uv", group: G_DUR, label: ["UV-Beständigkeit", "UV resistance"], unit: "1–5", path: "durability.uvResistance" },
  { id: "weather", group: G_DUR, label: ["Witterungsbeständigkeit", "Weather resistance"], unit: "1–5", path: "durability.weatherResistance" },
  { id: "water", group: G_DUR, label: ["Wasseraufnahme", "Water absorption"], unit: "%", log: true, lowerIsBetter: true, path: "durability.waterAbsorption" },

  { id: "price", group: G_COM, label: ["Materialpreis", "Material price"], unit: "€/kg", lowerIsBetter: true, path: "commercial.pricePerKg" },
  { id: "avail", group: G_COM, label: ["Verfügbarkeit", "Availability"], unit: "1–5", path: "commercial.availability" },
  { id: "xxl", group: G_COM, label: ["Sinnvolle XXL-Kante", "Sensible XXL edge"], unit: "mm", path: "commercial.xxl.maxSensibleEdgeMm" },
  { id: "bio", group: G_COM, label: ["Biobasierter Anteil", "Bio-based content"], unit: "%", path: "sustainability.bioBasedContent" },
];

const FAMILY_COLOURS: Record<string, string> = {
  PLA: "#4a9d5f", PETG: "#2f7fa8", PET: "#1c5f7f", ABS: "#c17a1f", ASA: "#b3492a",
  PC: "#6b4fa0", PA: "#a02f6b", TPU: "#7a8a2f", PHA: "#2f8a72",
};
const colourOf = (f: string) => FAMILY_COLOURS[f] ?? "#666";

const GROUPS = [G_MECH, G_THERM, G_PROC, G_DUR, G_COM];

export function Explorer({ t, lang, params, navigate }: {
  t: T; lang: Lang; params: URLSearchParams; navigate: (p: string) => void;
}) {
  const de = lang === "de";
  const L = (a: Axis) => a.label[de ? 0 : 1];

  /* Die URL ist auch hier die einzige Quelle der Wahrheit — ein Diagramm, das man nicht
     verlinken kann, taugt nicht zum Argumentieren. */
  /* Immer alle Änderungen in EINEM Hash-Schreibvorgang: zwei Aufrufe hintereinander
     lesen beide denselben alten `params`-Stand und der zweite verwirft den ersten. */
  const setParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) v ? p.set(k, v) : p.delete(k);
    location.hash = `#/explorer?${p.toString()}`;
  };
  const setParam = (k: string, v: string | null) => setParams({ [k]: v });

  const xa = AXES.find((a) => a.id === params.get("axx")) ?? AXES.find((a) => a.id === "hdtb")!;
  const ya = AXES.find((a) => a.id === params.get("axy")) ?? AXES[0];
  const sa = AXES.find((a) => a.id === params.get("axs")) ?? null;

  const allFamilies = useMemo(
    () => [...new Set(MATERIALS.map((m) => m.identity.family))].sort(), []);
  /* GEKAPPT WIE JEDE ANDERE LISTE AUS DER ADRESSZEILE.
     `cmp` und `chem` werden in App.tsx begrenzt, weil ein geteilter Link mit
     zehntausend Eintraegen den Tab lahmlegt. Diese beiden Listen lasen ihre Werte
     aber direkt aus `params` und gingen an der Grenze vorbei - dieselbe Fehlerklasse,
     nur an der Stelle, die beim ersten Mal uebersehen wurde. Mehr als alle Familien
     verstecken oder alle Werkstoffe anheften kann niemand wollen. */
  const hidden = new Set(idList(params.get("axf"), allFamilies.length));
  const pinned = new Set(idList(params.get("axp"), MATERIALS.length));

  const toggleFamily = (f: string) => {
    const next = new Set(hidden);
    next.has(f) ? next.delete(f) : next.add(f);
    setParam("axf", [...next].join(",") || null);
  };
  const togglePin = (id: string) => {
    const next = new Set(pinned);
    next.has(id) ? next.delete(id) : next.add(id);
    setParam("axp", [...next].join(",") || null);
  };

  const visible = MATERIALS.filter((m) => !hidden.has(m.identity.family));

  /* Punkte und - genauso wichtig - die Ausgeschlossenen mit Begründung. */
  const { points, missing } = useMemo(() => {
    const pts: { m: Material; x: number; y: number; s: number | null; est: boolean }[] = [];
    const miss: { m: Material; axes: string[] }[] = [];
    for (const m of visible) {
      const x = at(m, xa.path), y = at(m, ya.path);
      const gaps: string[] = [];
      if (!x) gaps.push(L(xa));
      if (!y) gaps.push(L(ya));
      if (gaps.length) { miss.push({ m, axes: gaps }); continue; }
      const s = sa ? at(m, sa.path) : null;
      pts.push({
        m, x: x!.value!, y: y!.value!, s: s?.value ?? null,
        est: x!.confidence === "estimated" || y!.confidence === "estimated",
      });
    }
    return { points: pts, missing: miss };
  }, [xa, ya, sa, visible.length, hidden.size]);

  const W = 780, H = 460, P = { l: 78, r: 26, t: 20, b: 52 };

  const scale = (vals: number[], a: Axis) => {
    if (!vals.length) return { lo: 0, hi: 1 };
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (a.log) { lo = Math.max(lo, 0.01); hi = Math.max(hi, lo * 1.1); return { lo: lo * 0.8, hi: hi * 1.25 }; }
    const pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.1 || 1;
    return { lo: lo - pad, hi: hi + pad };
  };
  const sx = scale(points.map((p) => p.x), xa);
  const sy = scale(points.map((p) => p.y), ya);
  const frac = (v: number, s: { lo: number; hi: number }, a: Axis) =>
    a.log ? (Math.log(v) - Math.log(s.lo)) / (Math.log(s.hi) - Math.log(s.lo)) : (v - s.lo) / (s.hi - s.lo);
  const px = (v: number) => P.l + frac(v, sx, xa) * (W - P.l - P.r);
  const py = (v: number) => H - P.b - frac(v, sy, ya) * (H - P.t - P.b);
  const ticks = (a: Axis, s: { lo: number; hi: number }) =>
    Array.from({ length: 5 }, (_, i) =>
      a.log ? Math.exp(Math.log(s.lo) + (i / 4) * (Math.log(s.hi) - Math.log(s.lo))) : s.lo + (i / 4) * (s.hi - s.lo));

  /* Punktgrösse aus der dritten Grösse. Radius über die Wurzel, damit die FLÄCHE
     proportional ist - Radius-proportional übertreibt grosse Werte grob. */
  const sVals = points.map((p) => p.s).filter((v): v is number => v != null);
  const sLo = sVals.length ? Math.min(...sVals) : 0;
  const sHi = sVals.length ? Math.max(...sVals) : 1;
  const radius = (p: { s: number | null }) => {
    if (!sa || p.s == null || sHi === sLo) return 6;
    const f = (p.s - sLo) / (sHi - sLo);
    return Math.sqrt(16 + f * 190);
  };

  /* Beschriftungen ohne Überlappung: rechts, sonst links, sonst oben, sonst unten,
     sonst weglassen. Geprüft wird gegen bereits gesetzte Beschriftungen UND gegen alle
     Punkte — ein Name, der auf einem fremden Kreis liegt, ist genauso unlesbar wie einer,
     der auf einem fremden Namen liegt. */
  type Box = { x1: number; y1: number; x2: number; y2: number };
  const hits = (a: Box, b: Box) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  const dotBoxes: Box[] = points.map((p) => {
    const r = radius(p);
    return { x1: px(p.x) - r, y1: py(p.y) - r, x2: px(p.x) + r, y2: py(p.y) + r };
  });
  const placed: Box[] = [];
  const labelFor = (p: { m: Material; x: number; y: number; s: number | null }) => {
    /* Breite grosszügig geschätzt: eine zu knappe Schätzung lässt Namen doch überlappen. */
    const w = p.m.identity.name.length * 6.9 + 6, h = 14, r = radius(p) + 5;
    const cx0 = px(p.x), cy0 = py(p.y);
    const cands: [number, number, "start" | "end"][] = [
      [cx0 + r, cy0 + 4, "start"], [cx0 - r, cy0 + 4, "end"],
      [cx0, cy0 - r - 3, "start"], [cx0, cy0 + r + 11, "start"],
    ];
    for (const [lx, ly, anchor] of cands) {
      const x1 = anchor === "end" ? lx - w : lx;
      /* ly ist die Grundlinie — Unterlängen reichen darunter, sonst schneidet der Kasten zu früh ab. */
      const box: Box = { x1, y1: ly - h, x2: x1 + w, y2: ly + 3.5 };
      if (box.x1 < 2 || box.x2 > W - 2 || box.y1 < P.t - 6 || box.y2 > H - P.b + 4) continue;
      if (placed.some((q) => hits(box, q))) continue;
      if (dotBoxes.some((q) => hits(box, q))) continue;
      placed.push(box);
      return { lx, ly, anchor };
    }
    return null;
  };

  const families = [...new Set(points.map((p) => p.m.identity.family))].sort();
  const medX = points.length ? [...points].sort((a, b) => a.x - b.x)[Math.floor(points.length / 2)].x : null;
  const medY = points.length ? [...points].sort((a, b) => a.y - b.y)[Math.floor(points.length / 2)].y : null;

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">{t("ui.start.explorer")}</h1>
      <p className="text-sm muted mb-5 max-w-3xl leading-relaxed">
        {de
          ? "Zwei Kennwerte gegeneinander auftragen und sehen, welcher Werkstoff das Feld anführt — und um welchen Preis. Die dritte Grösse steckt in der Punktfläche, die Konfidenz im Ring."
          : "Plot two properties against each other and see which material leads the field — and at what cost. The third quantity sits in the point area, the confidence in the ring."}
      </p>

      <div className="flex flex-wrap gap-3 mb-4 no-print">
        <AxisPicker label={t("ui.axisX")} value={xa.id} onChange={(v) => setParam("axx", v)} lang={lang} />
        <AxisPicker label={t("ui.axisY")} value={ya.id} onChange={(v) => setParam("axy", v)} lang={lang} />
        <AxisPicker label={de ? "Punktgrösse" : "Point size"} value={sa?.id ?? ""} lang={lang}
          onChange={(v) => setParam("axs", v || null)}
          empty={de ? "— einheitlich —" : "— uniform —"} />
        <button onClick={() => setParams({ axx: ya.id, axy: xa.id })}
          className="self-end px-3 py-1.5 rounded-lg text-sm font-medium border border-hairline dark:border-[#1E2B3D] hover:border-petrol-400 transition-colors">
          {de ? "Achsen tauschen" : "Swap axes"}
        </button>
      </div>

      {/* Familien ein- und ausblenden */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 no-print">
        <span className="text-xs muted mr-1">{de ? "Familien:" : "Families:"}</span>
        {allFamilies.map((f) => {
          const off = hidden.has(f);
          return (
            <button key={f} onClick={() => toggleFamily(f)} aria-pressed={!off}
              className={cx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                off ? "border-hairline dark:border-[#1E2B3D] muted opacity-60" : "border-transparent bg-petrol-50 dark:bg-white/5")}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: off ? "transparent" : colourOf(f), border: `1.5px solid ${colourOf(f)}` }} />
              {f}
            </button>
          );
        })}
        {hidden.size > 0 && (
          <button onClick={() => setParam("axf", null)} className="text-xs hl hover:underline ml-1">
            {de ? "alle zeigen" : "show all"}
          </button>
        )}
      </div>

      <Card className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[620px]" role="img"
          aria-label={`${L(ya)} über ${L(xa)}, ${points.length} Werkstoffe`}>
          {ticks(xa, sx).map((v, i) => (
            <g key={`x${i}`}>
              <line x1={px(v)} y1={P.t} x2={px(v)} y2={H - P.b} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="1" />
              <text x={px(v)} y={H - P.b + 16} textAnchor="middle" className="fill-neutral-500 text-[11px]">{fmt(v)}</text>
            </g>
          ))}
          {ticks(ya, sy).map((v, i) => (
            <g key={`y${i}`}>
              <line x1={P.l} y1={py(v)} x2={W - P.r} y2={py(v)} className="stroke-neutral-200 dark:stroke-neutral-800" strokeWidth="1" />
              <text x={P.l - 8} y={py(v) + 4} textAnchor="end" className="fill-neutral-500 text-[11px]">{fmt(v)}</text>
            </g>
          ))}

          {/* Medianlinien: teilen das Feld in vier Quadranten und machen "überdurchschnittlich"
              zu einer ablesbaren statt gefühlten Aussage. */}
          {medX != null && (
            <line x1={px(medX)} y1={P.t} x2={px(medX)} y2={H - P.b} strokeDasharray="3 4"
              className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="1" />
          )}
          {medY != null && (
            <line x1={P.l} y1={py(medY)} x2={W - P.r} y2={py(medY)} strokeDasharray="3 4"
              className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth="1" />
          )}
          {medX != null && (
            <text x={px(medX) + 4} y={P.t + 11} className="fill-neutral-400 text-[10px]">
              {de ? "Median" : "median"}
            </text>
          )}

          <text x={(W + P.l) / 2} y={H - 6} textAnchor="middle" className="fill-neutral-600 dark:fill-neutral-400 text-[12px]">
            {L(xa)} {xa.unit && `[${xa.unit}]`}{xa.log ? (de ? " · logarithmisch" : " · log") : ""}
          </text>
          <text x={-(P.t + (H - P.b - P.t) / 2)} y={15} transform="rotate(-90)" textAnchor="middle"
            className="fill-neutral-600 dark:fill-neutral-400 text-[12px]">
            {L(ya)} {ya.unit && `[${ya.unit}]`}{ya.log ? (de ? " · logarithmisch" : " · log") : ""}
          </text>

          {/* Grosse Punkte zuerst, damit kleine nicht verschwinden. */}
          {[...points].sort((a, b) => radius(b) - radius(a)).map((p) => {
            const on = pinned.has(p.m.id);
            const r = radius(p);
            const lab = labelFor(p);
            return (
              <g key={p.m.id} onClick={() => togglePin(p.m.id)} style={{ cursor: "pointer" }}>
                <title>
                  {p.m.identity.name} — {L(xa)} {fmt(p.x)} {xa.unit} · {L(ya)} {fmt(p.y)} {ya.unit}
                  {sa && p.s != null ? ` · ${L(sa)} ${fmt(p.s)} ${sa.unit}` : ""}
                  {p.est ? (de ? " · enthält eine Schätzung" : " · contains an estimate") : ""}
                </title>
                <circle cx={px(p.x)} cy={py(p.y)} r={r} fill={colourOf(p.m.identity.family)}
                  fillOpacity={on ? 0.95 : 0.6} stroke={on ? "#0C4251" : "#fff"} strokeWidth={on ? 2.5 : 1.5} />
                {/* Gestrichelter Ring = mindestens eine Koordinate ist geschätzt. */}
                {p.est && (
                  <circle cx={px(p.x)} cy={py(p.y)} r={r + 3.5} fill="none" strokeDasharray="2 3"
                    stroke={colourOf(p.m.identity.family)} strokeWidth="1.2" />
                )}
                {lab && (
                  <text x={lab.lx} y={lab.ly} textAnchor={lab.anchor}
                    className={cx("text-[11px] pointer-events-none",
                      on ? "fill-neutral-900 dark:fill-neutral-100 font-semibold" : "fill-neutral-600 dark:fill-neutral-400")}>
                    {p.m.identity.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="4" fill="#888" fillOpacity="0.6" stroke="#fff" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="6.5" fill="none" strokeDasharray="2 3" stroke="#888" strokeWidth="1.2" /></svg>
            {de ? "enthält eine Schätzung" : "contains an estimate"}
          </span>
          {sa && (
            <span className="muted">
              {/* Bewertungsachsen tragen die Skala schon in der Einheit — sonst stünde da "1–5 1–5". */}
              {de ? "Punktfläche" : "Point area"}: {L(sa)}{" "}
              {sa.unit === "1–5" ? "(1–5)" : `(${fmt(sLo)}–${fmt(sHi)} ${sa.unit})`}
              {sa.lowerIsBetter ? (de ? " · kleinere Fläche ist besser" : " · smaller area is better") : ""}
            </span>
          )}
          <span className="muted ml-auto">
            {points.length} {de ? "dargestellt" : "shown"}
            {families.length ? ` · ${families.length} ${de ? "Familien" : "families"}` : ""}
          </span>
        </div>
      </Card>

      {/* Wer fehlt — namentlich, nicht als Zahl. */}
      {missing.length > 0 && (
        <Disclosure className="mt-3"
          summary={de
            ? `Nicht dargestellt: ${missing.length} Werkstoffe ohne belegten Wert auf einer Achse`
            : `Not shown: ${missing.length} materials without a sourced value on one axis`}>
          <p className="text-xs muted mb-2.5 max-w-3xl leading-relaxed">
            {de
              ? "Diese Werkstoffe werden nicht mit null angenommen und nicht weggelassen, ohne es zu sagen — eine Lücke in der Datenlage ist keine Eigenschaft des Werkstoffs."
              : "These materials are neither assumed to be zero nor quietly dropped — a gap in the data is not a property of the material."}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map(({ m, axes }) => (
              <button key={m.id} onClick={() => navigate(`material/${m.id}`)}
                className="text-xs px-2 py-1 rounded-md border border-hairline dark:border-[#1E2B3D] hover:border-petrol-400 transition-colors">
                <span className="font-medium">{m.identity.name}</span>
                <span className="muted"> — {de ? "ohne" : "no"} {axes.join(", ")}</span>
              </button>
            ))}
          </div>
        </Disclosure>
      )}

      {/* Angeheftete Werkstoffe */}
      {pinned.size > 0 && (
        <Card className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs muted">{de ? "Angeheftet:" : "Pinned:"}</span>
            {[...pinned].map((id) => {
              const m = MATERIALS.find((x) => x.id === id);
              if (!m) return null;
              return (
                <span key={id} className="inline-flex items-center gap-1.5">
                  <a href={`#/material/${id}`} className="text-sm hl hover:underline font-medium">{m.identity.name}</a>
                  <Chip tone="neutral">{m.identity.family}</Chip>
                </span>
              );
            })}
            <button onClick={() => setParam("axp", null)} className="text-xs hl hover:underline ml-1">
              {de ? "lösen" : "clear"}
            </button>
            <a href={`#/compare?cmp=${[...pinned].join(",")}`}
              className="ml-auto text-sm font-semibold hl hover:underline">
              {de ? "im Detail vergleichen" : "compare in detail"} →
            </a>
          </div>
        </Card>
      )}

      <p className="text-xs muted mt-3 max-w-3xl leading-relaxed">
        {de
          ? "Punkt anklicken heftet einen Werkstoff an. Die Achsenwahl steht in der Adresszeile — der Link zeigt bei jedem dasselbe Diagramm."
          : "Click a point to pin a material. The axis selection is in the address bar — the link shows everyone the same chart."}
      </p>
    </div>
  );
}

function AxisPicker({ label, value, onChange, lang, empty }: {
  label: string; value: string; onChange: (v: string) => void; lang: Lang; empty?: string;
}) {
  return (
    <label className="text-sm">
      <span className="block text-xs muted mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="surface px-2 py-1.5 bg-transparent text-sm max-w-[15rem]">
        {empty && <option value="">{empty}</option>}
        {GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {AXES.filter((a) => a.group === g).map((a) => (
              <option key={a.id} value={a.id}>{a.label[lang === "de" ? 0 : 1]}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
