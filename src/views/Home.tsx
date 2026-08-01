import { MATERIALS } from "../data/materials";
import { SITE } from "../config/site";
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
    { path: "compare", key: "compare" },
    { path: "explorer", key: "explorer" },
  ];

  return (
    <div>
      <section className="py-8 sm:py-12 max-w-3xl">
        <p className="text-xs font-mono uppercase tracking-widest hl mb-3">{SITE.claim[lang]}</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">{t("ui.tagline")}</h1>
        <p className="text-base muted mb-6 leading-relaxed">{t("ui.subline")}</p>
        <p className="text-xs muted font-mono">
          {t("ui.counter", { materials: MATERIALS.length, facts, sources })}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 mb-10">
        {entries.map((e) => (
          <button
            key={e.path}
            onClick={() => navigate(e.path)}
            className={cx(
              "surface p-5 text-left transition-colors hover:border-brand-500 group",
              e.primary && "sm:col-span-2 border-brand-600 dark:border-brand-400",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className={cx("font-semibold", e.primary && "text-lg")}>{t(`ui.start.${e.key}`)}</h2>
              <span className="hl opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">→</span>
            </div>
            <p className="text-sm muted mt-1">{t(`ui.start.${e.key}.desc`)}</p>
          </button>
        ))}
      </div>

      <Card className="max-w-3xl">
        <h2 className="font-semibold mb-2 text-sm">
          {lang === "de" ? "Warum dieses Werkzeug anders rechnet" : "Why this tool computes differently"}
        </h2>
        <ul className="text-sm muted space-y-2 leading-relaxed">
          <li>
            <strong className="text-neutral-800 dark:text-neutral-200">
              {lang === "de" ? "Gedruckte Prüfkörper statt Rohstoffdaten." : "Printed specimens, not resin data."}
            </strong>{" "}
            {lang === "de"
              ? "PLA steht hier mit 35 MPa, nicht mit den 60 MPa aus Granulat-Datenblättern. Der gedruckte Wert ist der, den Ihr Bauteil hat."
              : "PLA is listed at 35 MPa here, not the 60 MPa from resin datasheets. The printed value is the one your part has."}
          </li>
          <li>
            <strong className="text-neutral-800 dark:text-neutral-200">
              {lang === "de" ? "Anisotropie wird ausgewiesen." : "Anisotropy is reported."}
            </strong>{" "}
            {lang === "de"
              ? "Für jeden Werkstoff steht dabei, wie viel Festigkeit senkrecht zur Schicht übrig bleibt — zwischen 47 % und 90 %."
              : "For every material we state how much strength remains perpendicular to the layers — between 47 % and 90 %."}
          </li>
          <li>
            <strong className="text-neutral-800 dark:text-neutral-200">
              {lang === "de" ? "Geschätzte Werte sind markiert." : "Estimated values are marked."}
            </strong>{" "}
            {lang === "de"
              ? "Wo keine Quelle existiert, steht das dran — statt eine plausible Zahl zu erfinden."
              : "Where no source exists, it says so — instead of inventing a plausible number."}
          </li>
          <li>
            <strong className="text-neutral-800 dark:text-neutral-200">
              {lang === "de" ? "Kein Anbieter-Bias." : "No vendor bias."}
            </strong>{" "}
            {lang === "de"
              ? "Ob Reents3D ein Material führt, fliesst nicht in die Bewertung ein. Ein Test im Repository erzwingt das."
              : "Whether Reents3D stocks a material does not enter the scoring. A test in the repository enforces this."}
          </li>
        </ul>
      </Card>
    </div>
  );
}
