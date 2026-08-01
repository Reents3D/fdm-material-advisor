/**
 * Kopf- und Fussbereich im Corporate Design der Reents Technologies GmbH.
 *
 * Aufbau wie auf der Unternehmenswebsite: dunkle Petrol-Kontaktleiste, darunter eine
 * helle Kopfzeile mit Wortmarke, Navigation und Versalien-CTA. Das Logo liegt als
 * lokales SVG in /public/brand — kein Hotlink auf die Website (DSGVO, Offline-Betrieb).
 */

import { SITE, trackedUrl } from "../config/site";
import { LANGS, type Lang } from "../i18n";
import { cx } from "./ui";

const logoUrl = `${import.meta.env.BASE_URL}brand/reents-logo-horizontal-color.svg`;

type T = (k: string, p?: Record<string, string | number>) => string;

const NAV = [
  { path: "usecases", key: "ui.usecases", match: "usecases" },
  { path: "wizard/1", key: "ui.start.wizard", match: "wizard" },
  { path: "matrix", key: "ui.allMaterials", match: "matrix" },
  { path: "brands", key: "ui.brands", match: "brands" },
  { path: "compliance", key: "ui.compliance", match: "compliance" },
  { path: "compare", key: "ui.start.compare", match: "compare" },
  { path: "explorer", key: "ui.start.explorer", match: "explorer" },
  { path: "glossar", key: "ui.glossary", match: "glossary" },
];

export function Header({ lang, onLang, t, view }: {
  lang: Lang; onLang: (l: Lang) => void; t: T; view: string;
}) {
  return (
    <header className="no-print">
      {/* Kopfzeile */}
      <div className="bg-white border-b border-hairline sticky top-0 z-30 dark:bg-[#0B121F] dark:border-[#1E2B3D]" data-app-header>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
          <a href="#/" className="shrink-0" aria-label={`${SITE.brand} — Start`}>
            <img src={logoUrl} alt={SITE.legalEntity}
              className="h-9 w-auto dark:brightness-0 dark:invert" width={200} height={36} />
          </a>

          <div className="flex items-center gap-3 ml-auto">
            {/* shrink-0: Diese Box wurde vom Flex-Container von 67 auf 49 px
                zusammengedrueckt, sobald es in der Kopfzeile eng wurde - und weil sie
                overflow-hidden traegt, blieb vom "EN" nur das "E" stehen. Eine Sprachwahl
                aus zwei Kuerzeln ist zu klein, um sie schrumpfen zu lassen. */}
            <div className="flex shrink-0 items-center rounded-lg overflow-hidden border border-hairline dark:border-[#1E2B3D]">
              {LANGS.map((l) => (
                <button key={l} onClick={() => onLang(l)} aria-pressed={lang === l}
                  className={cx("shrink-0 px-2 py-1 text-xs font-semibold uppercase transition-colors",
                    lang === l
                      ? "bg-petrol-700 text-white dark:bg-petrol-300 dark:text-ink"
                      : "hover:bg-petrol-50 dark:hover:bg-white/5")}>
                  {l}
                </button>
              ))}
            </div>
            <a href={trackedUrl(SITE.urls.contact)} target="_blank" rel="noopener"
              className="hidden sm:inline-flex items-center gap-2 bg-petrol-700 text-canvas rounded-xl font-bold text-[13px] uppercase px-5 py-2.5 hover:bg-petrol-600 transition-colors dark:bg-petrol-300 dark:text-ink dark:hover:bg-petrol-200">
              {lang === "de" ? "Projekt anfragen" : "Request a project"}
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Die Navigation steht IMMER in einer eigenen Zeile.
            Gemessen: die acht Eintraege brauchen ohne Umbruch 1128 px, die Kopfzeile ist
            auf 1152 px begrenzt (max-w-6xl wie der uebrige Inhalt). Neben Logo, Sprachwahl
            und CTA passt das in keiner Fensterbreite - der frueher ab 1536 px eingeblendete
            einzeilige Zweig brach deshalb JEDEN Eintrag auf zwei Zeilen um. Eine eigene
            Zeile, die scrollt, ist ehrlicher und bei jeder Breite dieselbe. */}
        <nav className="border-t border-hairline dark:border-[#1E2B3D] overflow-x-auto"
          aria-label="Hauptnavigation">
          <div className="flex gap-1 px-4 py-2 text-sm min-w-max">
            {NAV.map((n) => (
              <a key={n.path} href={`#/${n.path}`}
                className={cx("px-3 py-1.5 rounded-lg whitespace-nowrap font-medium",
                  view === n.match
                    ? "text-petrol-700 dark:text-petrol-300 bg-petrol-50 dark:bg-white/5"
                    : "muted")}>
                {t(n.key)}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

/**
 * Briefkopf und Fussleiste fuer den Ausdruck.
 *
 * Am Bildschirm unsichtbar, im Druck auf jeder Ansicht: ein ausgedruckter Vergleich
 * oder ein Datenblatt sollte nicht als anonymes Blatt Papier auf einem Schreibtisch
 * liegen. Der Bericht bringt seinen eigenen Kopf mit und blendet diesen hier aus.
 */
export function PrintLetterhead({ lang }: { lang: Lang }) {
  return (
    <div className="print-only print-letterhead" aria-hidden="true">
      <img src={logoUrl} alt={SITE.legalEntity} width={200} height={36} />
      <div className="claim">
        {SITE.toolName[lang]}<br />
        {SITE.urls.live}
      </div>
    </div>
  );
}

export function PrintFooter({ lang }: { lang: Lang }) {
  const de = lang === "de";
  return (
    <div className="print-only print-footer" aria-hidden="true">
      {SITE.legalEntity} · {SITE.contact.street} · {SITE.contact.zip} {SITE.contact.city} ·{" "}
      {SITE.contact.phone} · {SITE.contact.email}
      <br />
      {de
        ? "Richtwerte aus Herstellerangaben und Erfahrung. Sie ersetzen keine Bauteilqualifizierung. Daten CC BY 4.0."
        : "Reference values from manufacturer data and experience. They do not replace part qualification. Data CC BY 4.0."}
    </div>
  );
}

export function Footer({ t, lang }: { t: T; lang: Lang }) {
  const F = SITE.facts;
  return (
    // no-print: im Ausdruck uebernimmt PrintFooter. Der Seitenfuss der Anwendung
    // brachte auf Papier vier Leistungslinks samt ausgeschriebener UTM-Adressen mit -
    // eine halbe Seite Rauschen unter jedem Dokument.
    <footer className="mt-16 bg-petrol-700 text-petrol-100 no-print">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <img src={`${import.meta.env.BASE_URL}brand/reents-logo-horizontal-color.svg`}
            alt={SITE.legalEntity} className="h-9 w-auto brightness-0 invert mb-4"
            width={200} height={36} />
          <p className="leading-relaxed opacity-90">
            {SITE.contact.street}<br />
            {SITE.contact.zip} {SITE.contact.city}
          </p>
          <p className="mt-2">
            <a href={`tel:${SITE.contact.phone.replace(/[^+\d]/g, "")}`} className="hover:text-white">
              {SITE.contact.phone}
            </a><br />
            <a href={`mailto:${SITE.contact.email}`} className="hover:text-white">{SITE.contact.email}</a>
          </p>
        </div>

        <div>
          <h2 className="font-display font-bold uppercase tracking-wider text-xs text-petrol-300 mb-3">
            {lang === "de" ? "Fertigung" : "Production"}
          </h2>
          <ul className="space-y-1.5 opacity-90">
            {[F.machines, F.maxPart, F.finishing, F.location, F.confidentiality].map((f) => (
              <li key={f} className="flex gap-2">
                <span aria-hidden="true" className="text-petrol-300">·</span>{f}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display font-bold uppercase tracking-wider text-xs text-petrol-300 mb-3">
            {lang === "de" ? "Zu diesem Werkzeug" : "About this tool"}
          </h2>
          <p className="opacity-90 leading-relaxed mb-3">{t("ui.disclaimerShort")}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[
              [SITE.urls.imprint, lang === "de" ? "Impressum" : "Imprint"],
              [SITE.urls.privacy, lang === "de" ? "Datenschutz" : "Privacy"],
              [`${SITE.urls.repo}/blob/main/DISCLAIMER.md`, lang === "de" ? "Haftungsausschluss" : "Disclaimer"],
              [SITE.urls.repo, "GitHub"],
            ].map(([href, label]) => (
              <a key={label} href={href} target="_blank" rel="noopener"
                className="hover:text-white underline underline-offset-2 decoration-petrol-400">
                {label}
              </a>
            ))}
          </div>
          <p className="mt-4 text-xs opacity-70 leading-relaxed">
            {lang === "de"
              ? "Code MIT · Daten CC BY 4.0. Kein Tracking, keine Cookies, keine externen Ressourcen. Marken Dritter gehören ihren Inhabern."
              : "Code MIT · Data CC BY 4.0. No tracking, no cookies, no external resources. Third-party trademarks belong to their owners."}
          </p>
        </div>
      </div>

      {/* Leistungen in einer Reihe, direkt vor den Credits. */}
      <div className="border-t border-white/10">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-x-7 gap-y-2 text-sm"
          aria-label={lang === "de" ? "Leistungen" : "Services"}>
          {([
            [SITE.urls.xxl, lang === "de" ? "XXL-3D-Druck" : "XXL 3D printing"],
            [SITE.urls.cad, lang === "de" ? "CAD-Konstruktion" : "CAD engineering"],
            [SITE.urls.fdm, lang === "de" ? "FDM-Druckservice" : "FDM printing service"],
            [SITE.urls.primary, "reents3d.de"],
          ] as const).map(([href, label]) => (
            <a key={label} href={trackedUrl(href)} target="_blank" rel="noopener"
              className="font-semibold text-petrol-300 hover:text-white transition-colors">
              {label} →
            </a>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs opacity-70">
          © {SITE.legalEntity} · {SITE.claim[lang]}
        </div>
      </div>
    </footer>
  );
}
