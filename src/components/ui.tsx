/**
 * Shared UI primitives. Deliberately small and dependency-free.
 */

import type { ReactNode } from "react";
import type { Confidence, Quantity, Rating, I18nText } from "../engine/types";
import type { Lang } from "../i18n";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export const fmt = (n: number | null | undefined): string => {
  if (n === null || n === undefined || !Number.isFinite(n)) return "–";
  if (Math.abs(n) >= 100) return n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 10) return n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
  return n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
};

export const text = (t: I18nText | undefined, lang: Lang): string => (t ? t[lang] ?? t.de : "");

/* ------------------------------------------------------------------ badges */

export function ConfidenceMark({ c, lang }: { c: Confidence | null | undefined; lang: Lang }) {
  if (!c) return null;
  const label: Record<Confidence, string> = {
    high: lang === "de" ? "belegt (mehrere Quellen)" : "substantiated (multiple sources)",
    medium: lang === "de" ? "belegt (eine Quelle)" : "substantiated (one source)",
    low: lang === "de" ? "Quelle zweifelhaft" : "source questionable",
    estimated: lang === "de" ? "geschätzt, keine Quelle" : "estimated, no source",
  };
  const style: Record<Confidence, string> = {
    high: "bg-good/10 text-good border-good/30",
    medium: "bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-500/30",
    low: "bg-ok/10 text-ok border-ok/30",
    estimated: "border-dashed border-amber-500/70 text-amber-700 dark:text-amber-400 bg-amber-500/5",
  };
  const short: Record<Confidence, string> = { high: "◆◆", medium: "◆", low: "!", estimated: "≈" };
  return (
    <span
      title={label[c]}
      aria-label={label[c]}
      className={cx("inline-block border rounded px-1 text-[10px] leading-4 font-mono align-middle", style[c])}
    >
      {short[c]}
    </span>
  );
}

/** A quantity with its unit, range, standard and confidence — the atom of this tool. */
export function Value({ q, lang, showRange = true }: { q?: Quantity; lang: Lang; showRange?: boolean }) {
  if (!q || q.value === null) return <span className="muted">–</span>;
  const range =
    showRange && (q.min !== undefined || q.max !== undefined)
      ? ` (${fmt(q.min ?? q.value)}–${fmt(q.max ?? q.value)})`
      : q.tolerance
        ? ` ±${fmt(q.tolerance)}`
        : "";
  return (
    <span className={cx("whitespace-nowrap", q.confidence === "estimated" && "estimated")}>
      <span className="tabular-nums font-medium">{fmt(q.value)}</span>
      <span className="muted text-xs ml-0.5">{q.unit === "-" ? "" : q.unit}</span>
      {range && <span className="muted text-xs">{range}</span>}{" "}
      <ConfidenceMark c={q.confidence} lang={lang} />
    </span>
  );
}

export function RatingBar({ r, lang }: { r?: Rating; lang: Lang }) {
  if (!r || r.value === null) return <span className="muted">–</span>;
  return (
    <span className={cx("inline-flex items-center gap-1", r.confidence === "estimated" && "estimated")}>
      <span className="inline-flex gap-px" aria-label={`${r.value} von 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={cx("w-2 h-3 rounded-[1px]", i <= (r.value ?? 0) ? "bg-brand-600 dark:bg-brand-300" : "bg-neutral-200 dark:bg-neutral-700")}
          />
        ))}
      </span>
      <ConfidenceMark c={r.confidence} lang={lang} />
    </span>
  );
}

/** 0..1 score as a horizontal meter with a traffic-light colour. */
export function ScoreMeter({ score, label }: { score: number | null; label?: string }) {
  if (score === null) return <span className="muted text-xs">–</span>;
  const pct = Math.round(score * 100);
  const colour = score >= 0.66 ? "bg-good" : score >= 0.35 ? "bg-ok" : "bg-bad";
  return (
    <span className="inline-flex items-center gap-2 w-full" title={label ? `${label}: ${pct} %` : `${pct} %`}>
      <span className="h-1.5 flex-1 min-w-8 bg-neutral-200 dark:bg-neutral-700 rounded overflow-hidden">
        <span className={cx("block h-full rounded", colour)} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums text-xs muted w-8 text-right">{pct}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ layout */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("surface p-4 print-break", className)}>{children}</div>;
}

export function Button({
  children, onClick, variant = "primary", disabled, type = "button", className, ariaLabel,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline";
  disabled?: boolean; type?: "button" | "submit"; className?: string; ariaLabel?: string;
}) {
  const styles = {
    primary: "bg-brand-700 text-white hover:bg-brand-600 dark:bg-brand-300 dark:text-ink dark:hover:bg-brand-200",
    outline: "border border-neutral-300 dark:border-neutral-700 hover:border-brand-500 hover:text-brand-700 dark:hover:text-brand-300",
    ghost: "hover:bg-neutral-100 dark:hover:bg-neutral-800",
  }[variant];
  return (
    <button
      type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={cx(
        "px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        styles, className,
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked, onChange, label, hint,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer py-1.5 group">
      <input
        type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-brand-700 dark:accent-brand-300 cursor-pointer"
      />
      <span className="text-sm">
        {label}
        {hint && <span className="block text-xs muted mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mb-6 print-break">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide muted">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "ok" | "bad" | "brand" }) {
  const tones = {
    neutral: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
    good: "bg-good/10 text-good", ok: "bg-ok/10 text-ok", bad: "bg-bad/10 text-bad",
    brand: "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-200",
  }[tone];
  return <span className={cx("inline-block px-1.5 py-0.5 rounded text-[11px] font-medium", tones)}>{children}</span>;
}
