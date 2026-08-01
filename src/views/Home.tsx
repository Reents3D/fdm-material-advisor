import { MATERIALS } from "../data/materials";
import { SITE, trackedUrl } from "../config/site";
import { Card, cx } from "../components/ui";
import type { Lang } from "../i18n";

const countFacts = () => {
  let facts = 0;
  const sources = new Set<string>();
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) return n.forEach(walk);
    const o = n as Record<string, unknown>;
    if ("confidence" in o && "source" in o) facts++;
    Object.values(o).forEach(walk);
  };
  for (const m of MATERIALS) {
    const { governance, ...rest } = m;
    walk(rest);
    governance.sources.forEach((s) => sources.add(s.id));
  }
  return { facts, sources: sources.size };
};

export function Home({ t, lang, navigate }: {
  t: (k: string, p?: Record<string, string | number>) => string;
  lang: Lang;
  navigate: (path: string) => void;
}) {
  const { facts, sources } = countFacts();

  const entries: { path: string; key: string; primary?: boolean }[] = [
    { path: "wizard/1", key: "wizard", primary: true },
    { path: "matrix", key: "database" },
    { path: "brands", key: "brands" },
    { path: "compare", key: "compare" },
    { path: "explorer", key: "explorer" },
  ];

  return (
    <div>
      {/* Hero im Aufbau der Unternehmenswebsite: Eyebrow, massive Montserrat-Versalien
          mit Petrol-zu-Hellblau-Verlauf, darunter Fliesstext in Sora. */}
      <section className="pt-4 pb-10 sm:pt-8 sm:pb-14">
        <p className="eyebrow mb-4">{SITE.claim[lang]}</p>
        <h1 className="font-display font-black uppercase leading-[0.92] tracking-tight
                       text-[clamp(2.3rem,7.2vw,5rem)] max-w-5xl mb-6">
          <span className="hero-gradient">
            {lang === "de" ? "Welches FDM-Material passt" : "Which FDM material fits"}
          </span>
          <br />
          <span className="text-ink dark:text-[#E8EDF2]">
            {lang === "de" ? "— und warum." : "— and why."}
          </span>
        </h1>
        <p className="text-lg muted max-w-2xl leading-relaxed mb-7">{t("ui.subline")}</p>

        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm">
          {([
            [MATERIALS.length, lang === "de" ? "Materialien" : "materials"],
            [facts.toLocaleString("de-DE"), lang === "de" ? "belegte Aussagen" : "sourced statements"],
            [sources, lang === "de" ? "Quellen" : "sources"],
          ] as const).map(([n, label]) => (
            <span key={label} className="flex items-baseline gap-1.5">
              <strong className="font-display text-xl font-bold hl tabular-nums">{n}</strong>
              <span className="muted">{label}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 mb-12">
        {entries.map((e) => (
          <button
            key={e.path}
            onClick={() => navigate(e.path)}
            className={cx(
              "surface p-6 text-left transition-all hover:border-petrol-400 hover:-translate-y-0.5 group",
              e.primary && "sm:col-span-2 border-petrol-700 dark:border-petrol-400 bg-petrol-50/60 dark:bg-white/[0.03]",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className={cx("font-display font-bold", e.primary ? "text-xl" : "text-base")}>
                {t(`ui.start.${e.key}`)}
              </h2>
              <span className="hl text-lg group-hover:translate-x-1 transition-transform" aria-hidden="true">→</span>
            </div>
            <p className="text-sm muted mt-1.5">{t(`ui.start.${e.key}.desc`)}</p>
          </button>
        ))}
      </div>

      <section className="mb-12">
        <p className="eyebrow mb-3">
          {lang === "de" ? "Warum dieses Werkzeug anders rechnet" : "Why this tool computes differently"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              h: lang === "de" ? "Gedruckte Prüfkörper statt Rohstoffdaten" : "Printed specimens, not resin data",
              p: lang === "de"
                ? "PLA steht hier mit 35 MPa, nicht mit den 60 MPa aus Granulat-Datenblättern. Der gedruckte Wert ist der, den Ihr Bauteil hat."
                : "PLA is listed at 35 MPa here, not the 60 MPa from resin datasheets. The printed value is the one your part has.",
            },
            {
              h: lang === "de" ? "Anisotropie wird ausgewiesen" : "Anisotropy is reported",
              p: lang === "de"
                ? "Für jeden Werkstoff steht dabei, wie viel Festigkeit senkrecht zur Schicht übrig bleibt — zwischen 47 % und 90 %."
                : "For every material we state how much strength remains perpendicular to the layers — between 47 % and 90 %.",
            },
            {
              h: lang === "de" ? "Geschätzte Werte sind markiert" : "Estimated values are marked",
              p: lang === "de"
                ? "Wo keine Quelle existiert, steht das dran — statt eine plausible Zahl zu erfinden."
                : "Where no source exists, it says so — instead of inventing a plausible number.",
            },
            {
              h: lang === "de" ? "Unabhängig von Herstellern" : "Independent of manufacturers",
              p: lang === "de"
                ? "Kein Hersteller zahlt für Platzierung, es gibt keine Affiliate-Links. Die Reihenfolge entsteht allein aus Ihren Anforderungen und den Datenblattwerten."
                : "No manufacturer pays for placement and there are no affiliate links. The ranking follows only from your requirements and the datasheet values.",
            },
          ].map((c) => (
            <Card key={c.h}>
              <h3 className="font-display font-bold text-[15px] mb-1.5">{c.h}</h3>
              <p className="text-sm muted leading-relaxed">{c.p}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Abbinder im CD: Petrol-Flaeche mit Fakten und CTA */}
      <section className="rounded-xl bg-petrol-700 text-petrol-100 p-7 sm:p-9 mb-4">
        <p className="font-display font-black uppercase text-2xl sm:text-3xl text-white leading-tight mb-3 max-w-2xl">
          {lang === "de" ? "Bauteil von uns fertigen lassen" : "Have us produce your part"}
        </p>
        <p className="max-w-2xl leading-relaxed opacity-90 mb-5">
          {lang === "de"
            ? "Ingenieurs-Check inklusive: Wir prüfen Orientierung, Wandstärken und Materialwahl, bevor gedruckt wird."
            : "Engineering check included: we review orientation, wall thickness and material choice before printing."}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm opacity-90 mb-6">
          {[SITE.facts.machines, SITE.facts.maxPart, SITE.facts.processes, SITE.facts.finishing, SITE.facts.location]
            .map((f) => (
              <span key={f} className="flex gap-1.5">
                <span aria-hidden="true" className="text-petrol-300">·</span>{f}
              </span>
            ))}
        </div>
        <a href={trackedUrl(SITE.urls.contact)} target="_blank" rel="noopener"
          className="inline-flex items-center gap-2 bg-white text-petrol-700 rounded-xl font-bold text-[13px] uppercase px-6 py-3 hover:bg-petrol-50 transition-colors">
          {lang === "de" ? "Projekt anfragen" : "Request a project"}
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </a>
      </section>
    </div>
  );
}
