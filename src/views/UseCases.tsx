/**
 * Anwendungsfälle — der Einstieg für alle, die den Assistenten nicht beantworten können.
 *
 * Der Assistent fragt nach Dauergebrauchstemperatur, Bruchdehnung und Brandklasse. Wer
 * die Antworten kennt, braucht das Werkzeug nur halb. Hier erkennt man stattdessen seine
 * SITUATION wieder und bekommt das Profil geschenkt.
 *
 * Dabei bleibt die Regel dieses Projekts gewahrt: Jeder vorbelegte Wert zeigt aufgeklappt
 * seine Begründung. Ein Profil, das seine Annahmen verschweigt, wäre eine Blackbox — und
 * damit genau das, wogegen dieses Werkzeug gebaut ist.
 */

import { USECASES, USECASE_GROUPS, useCaseParams, type UseCase } from "../data/usecases";
import { Chip, Disclosure, cx, text } from "../components/ui";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

/** Anforderungsfeld -> kurze, lesbare Zusammenfassung für die Chips. */
function summarise(u: UseCase, de: boolean): { key: string; label: string }[] {
  const r = u.requirements;
  const out: { key: string; label: string }[] = [];
  const add = (key: string, label: string) => out.push({ key, label });

  if (r.serviceTemperatureC != null) add("serviceTemperatureC", `${r.serviceTemperatureC} °C ${de ? "dauerhaft" : "continuous"}`);
  if (r.outdoorYears != null) add("outdoorYears", `${r.outdoorYears} ${de ? "Jahre draußen" : "years outdoors"}`);
  if (r.minTensileStrengthMPa != null) add("minTensileStrengthMPa", `≥ ${r.minTensileStrengthMPa} MPa`);
  if (r.flameClass) add("flameClass", `UL94 ${r.flameClass}`);
  if (r.esd) add("esd", de ? "ESD-tauglich" : "ESD capable");
  if (r.foodContact) add("foodContact", de ? "lebensmittelkonform" : "food contact");
  if (r.flexible) add("flexible", de ? "flexibel" : "flexible");
  if (r.chamberAvailable === false) add("chamberAvailable", de ? "ohne Kammer" : "no enclosure");
  if (r.chamberAvailable === true) add("chamberAvailable", de ? "Kammer vorhanden" : "chamber available");
  if (r.hardenedNozzleAvailable === false) add("hardenedNozzleAvailable", de ? "ohne gehärtete Düse" : "no hardened nozzle");
  if (r.hardenedNozzleAvailable === true) add("hardenedNozzleAvailable", de ? "gehärtete Düse" : "hardened nozzle");
  if (r.chemicals?.length) add("chemicals", de ? "Medienkontakt" : "chemical exposure");
  return out;
}

export function UseCases({ lang }: { t: T; lang: Lang }) {
  const de = lang === "de";

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">
        {de ? "Anwendungsfälle" : "Use cases"}
      </h1>
      <p className="text-sm muted mb-6 max-w-3xl leading-relaxed">
        {de
          ? "Der Assistent fragt nach Dauergebrauchstemperatur und Brandklasse. Wer diese Antworten kennt, braucht das Werkzeug nur halb. Suchen Sie stattdessen Ihre Situation — das Anforderungsprofil kommt mit, jeder Wert mit Begründung."
          : "The wizard asks for continuous service temperature and flame class. Anyone who knows those answers only half needs this tool. Find your situation instead — the requirement profile comes with it, every value with its reasoning."}
      </p>

      {USECASE_GROUPS.map((g) => {
        const items = USECASES.filter((u) => u.group === g.id);
        if (!items.length) return null;
        return (
          <section key={g.id} className="mb-8">
            <p className="eyebrow mb-3">{de ? g.de : g.en}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((u) => {
                const chips = summarise(u, de);
                const href = `#/results?${useCaseParams(u, lang)}`;
                return (
                  <div key={u.id} className="surface p-4 flex flex-col">
                    <h2 className="font-display font-bold text-[15px] mb-1.5">{text(u.title, lang)}</h2>
                    <p className="text-sm muted leading-relaxed mb-3">{text(u.context, lang)}</p>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {chips.map((c) => <Chip key={c.key} tone="brand">{c.label}</Chip>)}
                    </div>

                    {/* Die Begruendung je Wert — zugeklappt, damit die Karte lesbar bleibt. */}
                    <Disclosure className="mb-3"
                      summary={<span className="text-[13px]">{de ? "Warum diese Werte?" : "Why these values?"}</span>}>
                      <dl className="space-y-2.5">
                        {chips.map((c) => u.rationale[c.key] && (
                          <div key={c.key}>
                            <dt className="font-semibold text-[13px]">{c.label}</dt>
                            <dd className="text-[13px] muted leading-relaxed">{text(u.rationale[c.key], lang)}</dd>
                          </div>
                        ))}
                        {u.requirements.weights && (
                          <div>
                            <dt className="font-semibold text-[13px]">{de ? "Gewichtung" : "Weighting"}</dt>
                            <dd className="text-[13px] muted leading-relaxed">
                              {Object.entries(u.requirements.weights)
                                .sort((a, b) => b[1] - a[1])
                                .map(([k, v]) => `${k} ${v}`).join(" · ")}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </Disclosure>

                    {u.caveat && (
                      <p className="text-xs mb-3 leading-relaxed text-warn">
                        <strong>{de ? "Wichtig: " : "Important: "}</strong>{text(u.caveat, lang)}
                      </p>
                    )}

                    <a href={href}
                      className={cx("mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5",
                        "bg-petrol-700 text-canvas font-semibold text-sm hover:bg-petrol-600 transition-colors",
                        "dark:bg-petrol-300 dark:text-ink dark:hover:bg-petrol-200")}>
                      {de ? "Empfehlung ansehen" : "See the recommendation"}
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor"
                        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-sm muted max-w-3xl leading-relaxed">
        {de
          ? "Die Profile sind Startpunkte, keine Vorschriften. Jeder Wert lässt sich im Assistenten ändern — die Empfehlung rechnet sich sofort neu, und die Adresszeile hält das Ergebnis fest, sodass Sie es weitergeben können."
          : "The profiles are starting points, not prescriptions. Every value can be changed in the wizard — the recommendation recalculates immediately, and the address bar holds the result so you can pass it on."}
      </p>
    </div>
  );
}
