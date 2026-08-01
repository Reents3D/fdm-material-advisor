/**
 * Ashby-style property chart. Hand-rolled SVG rather than a charting library:
 * the whole page budget is 350 kB gzip and this costs about 4 kB.
 */

import { useMemo, useState } from "react";
import { MATERIALS } from "../data/materials";
import type { Material, Quantity, Rating } from "../engine/types";
import { Card, Chip, cx, fmt } from "../components/ui";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

interface Axis { id: string; label: [string, string]; unit: string; log?: boolean; get: (m: Material) => number | null }

const num = (v: unknown): number | null =>
  v && typeof v === "object" && "value" in (v as object) ? ((v as Quantity | Rating).value as number | null) : null;

const AXES: Axis[] = [
  { id: "strength", label: ["Zugfestigkeit X-Y", "Tensile strength X-Y"], unit: "MPa", get: (m) => num(m.mechanics?.tensileStrengthXy) },
  { id: "modulus", label: ["E-Modul X-Y", "Modulus X-Y"], unit: "MPa", get: (m) => num(m.mechanics?.tensileModulusXy) },
  { id: "hdt", label: ["HDT-B", "HDT-B"], unit: "°C", get: (m) => num(m.thermal?.hdtB) },
  { id: "elong", label: ["Bruchdehnung", "Elongation"], unit: "%", log: true, get: (m) => num(m.mechanics?.elongationAtBreakXy) },
  { id: "density", label: ["Dichte", "Density"], unit: "g/cm³", get: (m) => num(m.mechanics?.density) },
  { id: "aniso", label: ["Anisotropiefaktor", "Anisotropy factor"], unit: "", get: (m) => num(m.mechanics?.anisotropyFactorTensile) },
  { id: "impact", label: ["Schlagzähigkeit X-Y", "Impact X-Y"], unit: "kJ/m²", get: (m) => num(m.mechanics?.charpyUnnotchedXy) },
  { id: "printability", label: ["Druckbarkeit", "Printability"], unit: "1-5", get: (m) => num(m.processing?.printability) },
  { id: "price", label: ["Preisindex", "Price index"], unit: "1-5", get: (m) => num((m.commercial as Record<string, unknown>)?.priceIndex) },
  { id: "xxl", label: ["XXL-Kante", "XXL edge"], unit: "mm", get: (m) => num((m.commercial as { xxl?: { maxSensibleEdgeMm?: Quantity } })?.xxl?.maxSensibleEdgeMm) },
  { id: "water", label: ["Wasseraufnahme", "Water absorption"], unit: "%", log: true, get: (m) => num(m.durability?.waterAbsorption) },
];

const FAMILY_COLOURS: Record<string, string> = {
  PLA: "#4a9d5f", PETG: "#2f7fa8", PET: "#1c5f7f", ABS: "#c17a1f", ASA: "#b3492a",
  PC: "#6b4fa0", PA: "#a02f6b", TPU: "#7a8a2f",
};
const colourOf = (f: string) => FAMILY_COLOURS[f] ?? "#666";

export function Explorer({ t, lang, params, navigate }: {
  t: T; lang: Lang; params: URLSearchParams; navigate: (p: string) => void;
}) {
  const [xId, setX] = useState(params.get("axx") ?? "hdt");
  const [yId, setY] = useState(params.get("axy") ?? "strength");
  const [hover, setHover] = useState<string | null>(null);

  const xa = AXES.find((a) => a.id === xId) ?? AXES[0];
  const ya = AXES.find((a) => a.id === yId) ?? AXES[1];

  const points = useMemo(
    () => MATERIALS.map((m) => ({ m, x: xa.get(m), y: ya.get(m) }))
      .filter((p): p is { m: Material; x: number; y: number } => p.x !== null && p.y !== null),
    [xa, ya],
  );

  const W = 760, H = 440, P = { l: 74, r: 24, t: 18, b: 50 };
  const scale = (vals: number[], a: Axis) => {
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (a.log) { lo = Math.max(lo, 0.01); hi = Math.max(hi, lo * 1.1); }
    const pad = (hi - lo) * 0.08 || 1;
    return { lo: a.log ? lo * 0.8 : lo - pad, hi: a.log ? hi * 1.25 : hi + pad };
  };
  const sx = scale(points.map((p) => p.x), xa);
  const sy = scale(points.map((p) => p.y), ya);
  const px = (v: number) => {
    const f = xa.log ? (Math.log(v) - Math.log(sx.lo)) / (Math.log(sx.hi) - Math.log(sx.lo)) : (v - sx.lo) / (sx.hi - sx.lo);
    return P.l + f * (W - P.l - P.r);
  };
  const py = (v: number) => {
    const f = ya.log ? (Math.log(v) - Math.log(sy.lo)) / (Math.log(sy.hi) - Math.log(sy.lo)) : (v - sy.lo) / (sy.hi - sy.lo);
    return H - P.b - f * (H - P.t - P.b);
  };
  const ticks = (a: Axis, s: { lo: number; hi: number }) =>
    Array.from({ length: 5 }, (_, i) => (a.log ? Math.exp(Math.log(s.lo) + (i / 4) * (Math.log(s.hi) - Math.log(s.lo))) : s.lo + (i / 4) * (s.hi - s.lo)));

  const families = [...new Set(points.map((p) => p.m.identity.family))].sort();

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">{t("ui.start.explorer")}</h1>
      <p className="text-sm muted mb-4">{t("ui.start.explorer.desc")}</p>

      <div className="flex flex-wrap gap-3 mb-4 no-print">
        <AxisPicker label={t("ui.axisX")} value={xId} onChange={setX} lang={lang} />
        <AxisPicker label={t("ui.axisY")} value={yId} onChange={setY} lang={lang} />
      </div>

      <Card className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[600px]" role="img"
          aria-label={`${ya.label[lang === "de" ? 0 : 1]} über ${xa.label[lang === "de" ? 0 : 1]}`}>
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

          <text x={(W + P.l) / 2} y={H - 6} textAnchor="middle" className="fill-neutral-600 dark:fill-neutral-400 text-[12px]">
            {xa.label[lang === "de" ? 0 : 1]} {xa.unit && `[${xa.unit}]`}
          </text>
          <text x={-(P.t + (H - P.b - P.t) / 2)} y={15} transform="rotate(-90)" textAnchor="middle"
            className="fill-neutral-600 dark:fill-neutral-400 text-[12px]">
            {ya.label[lang === "de" ? 0 : 1]} {ya.unit && `[${ya.unit}]`}
          </text>

          {points.map(({ m, x, y }) => {
            const active = hover === m.id;
            // Roughly 6.2 px per character at 11 px; flip the label inward near the edge
            // so long names like "PET-CF" are not clipped by the viewBox.
            const flip = px(x) + 12 + m.identity.name.length * 6.2 > W - 2;
            return (
              <g key={m.id} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)}
                onClick={() => navigate(`material/${m.id}`)} style={{ cursor: "pointer" }}>
                <circle cx={px(x)} cy={py(y)} r={active ? 9 : 6} fill={colourOf(m.identity.family)}
                  fillOpacity={active ? 1 : 0.75} stroke="#fff" strokeWidth="1.5" />
                <text x={px(x) + (flip ? -11 : 11)} y={py(y) + 4} textAnchor={flip ? "end" : "start"}
                  className={cx("text-[11px]", active ? "fill-neutral-900 dark:fill-neutral-100 font-semibold" : "fill-neutral-600 dark:fill-neutral-400")}>
                  {m.identity.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {families.map((f) => (
            <span key={f} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colourOf(f) }} />
              {f}
            </span>
          ))}
          <span className="muted ml-auto">
            {points.length} / {MATERIALS.length} {lang === "de" ? "mit Daten für beide Achsen" : "with data on both axes"}
          </span>
        </div>
      </Card>

      {hover && (
        <Card className="mt-3">
          {(() => {
            const m = MATERIALS.find((x) => x.id === hover)!;
            return (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <a href={`#/material/${m.id}`} className="font-medium hl hover:underline">{m.identity.name}</a>
                <Chip tone="neutral">{m.identity.family}</Chip>
                <span className="muted">
                  {xa.label[lang === "de" ? 0 : 1]} {fmt(xa.get(m))} {xa.unit} ·{" "}
                  {ya.label[lang === "de" ? 0 : 1]} {fmt(ya.get(m))} {ya.unit}
                </span>
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
}

function AxisPicker({ label, value, onChange, lang }: {
  label: string; value: string; onChange: (v: string) => void; lang: Lang;
}) {
  return (
    <label className="text-sm">
      <span className="block text-xs muted mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="surface px-2 py-1.5 bg-transparent text-sm">
        {AXES.map((a) => (
          <option key={a.id} value={a.id}>{a.label[lang === "de" ? 0 : 1]}</option>
        ))}
      </select>
    </label>
  );
}
