/**
 * Glossar.
 *
 * Das Werkzeug wirft mit Vicat, HDT-A und Anisotropiefaktor um sich. Für die Zielgruppe —
 * Entscheider ohne Werkstoffstudium — ist das die grösste verbleibende Hürde.
 *
 * Der Aufbau folgt der Haltung der Daten: Definition kurz, Bedeutung für die Werkstoffwahl
 * darunter, und wo es einen verbreiteten Irrtum gibt, steht der hervorgehoben dabei. Genau
 * daran entscheidet sich in der Praxis eine Werkstoffwahl — nicht an der Lehrbuchdefinition.
 */

import { useState } from "react";
import { GLOSSARY, GLOSSARY_CATEGORIES, termById } from "../data/glossary";
import { Chip, cx, text } from "../components/ui";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

export function Glossary({ lang }: { t: T; lang: Lang }) {
  const de = lang === "de";
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const match = (id: string) => {
    if (!needle) return true;
    const x = termById(id)!;
    return [text(x.term, lang), text(x.short, lang), text(x.detail, lang), ...(x.aliases ?? [])]
      .join(" ").toLowerCase().includes(needle);
  };
  const hits = GLOSSARY.filter((x) => match(x.id));

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">{de ? "Glossar" : "Glossary"}</h1>
      <p className="text-sm muted mb-5 max-w-3xl leading-relaxed">
        {de
          ? "Die Begriffe, mit denen Datenblätter arbeiten — und woran man sich bei jedem von ihnen üblicherweise verrechnet."
          : "The terms datasheets work with — and how each of them is commonly misread."}
      </p>

      <div className="mb-6 no-print">
        <label className="block">
          <span className="sr-only">{de ? "Begriff suchen" : "Search a term"}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={de ? "Begriff suchen — etwa „Vicat“, „Kerbe“, „ESD“" : "Search a term — e.g. “Vicat”, “notch”, “ESD”"}
            className="surface w-full max-w-md px-3 py-2 text-sm bg-transparent" />
        </label>
        {needle && (
          <p className="text-xs muted mt-2">
            {hits.length === 0
              ? (de ? "Kein Treffer." : "No match.")
              : (de ? `${hits.length} von ${GLOSSARY.length} Begriffen` : `${hits.length} of ${GLOSSARY.length} terms`)}
          </p>
        )}
      </div>

      {GLOSSARY_CATEGORIES.map((cat) => {
        const items = hits.filter((x) => x.category === cat.id);
        if (!items.length) return null;
        return (
          <section key={cat.id} className="mb-9">
            <p className="eyebrow mb-3">{de ? cat.de : cat.en}</p>
            <div className="space-y-3">
              {items.map((x) => (
                <article key={x.id} id={x.id} className="surface p-4 scroll-mt-24">
                  <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mb-1.5">
                    <h2 className="font-display font-bold text-[15px]">{text(x.term, lang)}</h2>
                    {x.unit && <Chip tone="neutral">{x.unit}</Chip>}
                    {x.aliases?.length ? (
                      <span className="text-xs muted">
                        {de ? "auch: " : "also: "}{x.aliases.join(", ")}
                      </span>
                    ) : null}
                  </header>

                  <p className="text-sm font-medium leading-relaxed mb-2">{text(x.short, lang)}</p>
                  <p className="text-sm muted leading-relaxed">{text(x.detail, lang)}</p>

                  {/* Der verbreitete Irrtum — hervorgehoben, weil sich genau daran die
                      Werkstoffwahl entscheidet. */}
                  {x.pitfall && (
                    <p className="text-sm leading-relaxed mt-2.5 pl-3 border-l-2 border-warn/60">
                      <strong className="text-warn">{de ? "Häufiger Irrtum. " : "Common misreading. "}</strong>
                      {text(x.pitfall, lang)}
                    </p>
                  )}

                  {x.seeAlso?.length ? (
                    <p className="text-xs muted mt-3">
                      {de ? "Siehe auch: " : "See also: "}
                      {x.seeAlso.map((s, i) => {
                        const o = termById(s);
                        return o ? (
                          <span key={s}>
                            {i > 0 && " · "}
                            <a href={`#/glossar#${s}`} onClick={() => setQ("")}
                              className="hl hover:underline">{text(o.term, lang)}</a>
                          </span>
                        ) : null;
                      })}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <p className={cx("text-sm muted max-w-3xl leading-relaxed", hits.length === 0 && "mt-0")}>
        {de
          ? "Fehlt ein Begriff oder ist eine Erklärung schief? Die Datei liegt als data/glossary.json offen im Repository — ein Issue oder Pull Request ist willkommen."
          : "A term missing or an explanation off? The file sits openly as data/glossary.json in the repository — an issue or pull request is welcome."}
      </p>
    </div>
  );
}
