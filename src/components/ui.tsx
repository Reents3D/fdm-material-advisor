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
    medium: "bg-petrol-500/10 text-petrol-700 dark:text-petrol-300 border-petrol-500/30",
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
            className={cx("w-2 h-3 rounded-[1px]", i <= (r.value ?? 0) ? "bg-petrol-600 dark:bg-petrol-300" : "bg-neutral-200 dark:bg-neutral-700")}
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
  return <div className={cx("surface p-5 print-break", className)}>{children}</div>;
}

/**
 * Aufklappbarer Hinweis.
 *
 * Auf nativem <details> statt eigenem State: funktioniert ohne JavaScript, ist per
 * Tastatur bedienbar, wird von Screenreadern als aufklappbar angesagt und findet sich
 * in der Seitensuche des Browsers auch im zugeklappten Zustand.
 *
 * Regel fuer den Einsatz: Der BEFUND gehoert in die Zusammenfassung und bleibt sichtbar,
 * nur die BEGRUENDUNG klappt weg. Eine Warnung, die man erst aufklappen muss, um sie
 * ueberhaupt zu bemerken, ist keine Warnung.
 */
export function Disclosure({
  summary, children, tone = "neutral", defaultOpen = false, className,
}: {
  summary: ReactNode; children: ReactNode;
  tone?: "neutral" | "warn" | "info"; defaultOpen?: boolean; className?: string;
}) {
  const tones = {
    neutral: "border-hairline dark:border-[#1E2B3D] hover:border-petrol-400",
    warn: "border-warn/40 bg-warn/5 hover:border-warn/70",
    info: "border-ok/40 bg-ok/5 hover:border-ok/70",
  }[tone];
  return (
    <details className={cx("group rounded-xl border transition-colors", tones, className)} open={defaultOpen}>
      <summary className="cursor-pointer list-none px-3.5 py-2.5 flex items-start gap-2.5 text-sm font-medium select-none">
        <svg viewBox="0 0 24 24" aria-hidden="true"
          className="w-4 h-4 mt-0.5 shrink-0 transition-transform group-open:rotate-90 muted"
          fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="min-w-0">{summary}</span>
      </summary>
      <div className="px-3.5 pb-3.5 pt-0.5 pl-[2.6rem] text-sm leading-relaxed">{children}</div>
    </details>
  );
}

export function Button({
  children, onClick, variant = "primary", disabled, type = "button", className, ariaLabel,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "outline" | "cta";
  disabled?: boolean; type?: "button" | "submit"; className?: string; ariaLabel?: string;
}) {
  // 12 px Radius und Petrol wie im Corporate Design. Versalien bleiben dem CTA
  // vorbehalten - bei Bedienelementen wie "Drucken / PDF" kosten sie Lesbarkeit.
  const styles = {
    cta: "bg-petrol-700 text-canvas uppercase font-bold text-[13px] tracking-wide hover:bg-petrol-600 dark:bg-petrol-300 dark:text-ink dark:hover:bg-petrol-200 px-5 py-2.5",
    primary: "bg-petrol-700 text-canvas font-semibold hover:bg-petrol-600 dark:bg-petrol-300 dark:text-ink dark:hover:bg-petrol-200 px-4 py-2",
    outline: "border border-hairline dark:border-[#1E2B3D] font-medium hover:border-petrol-400 hover:text-petrol-700 dark:hover:text-petrol-300 px-4 py-2",
    ghost: "font-medium hover:bg-petrol-50 dark:hover:bg-white/5 px-3 py-2",
  }[variant];
  return (
    <button
      type={type} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      className={cx(
        "rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
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
        className="mt-0.5 w-4 h-4 accent-petrol-700 dark:accent-petrol-300 cursor-pointer"
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
        <h2 className="eyebrow">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "ok" | "bad" | "brand" }) {
  const tones = {
    neutral: "bg-petrol-50 dark:bg-white/5 text-petrol-800 dark:text-petrol-200",
    good: "bg-good/10 text-good", ok: "bg-ok/10 text-ok", bad: "bg-bad/10 text-bad",
    brand: "bg-petrol-100 dark:bg-petrol-900 text-petrol-700 dark:text-petrol-200",
  }[tone];
  return <span className={cx("inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold", tones)}>{children}</span>;
}
