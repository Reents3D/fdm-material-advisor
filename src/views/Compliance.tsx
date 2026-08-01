/**
 * Übersicht Brandschutz, Zertifizierung und Regulatorik.
 *
 * Diese Seite ist bewusst auch dann nützlich, wenn fast alles leer ist — denn genau
 * das ist der Befund: Standard-Filamente tragen praktisch keine Prüfzeugnisse. Wer
 * UL94 V-0, EN 45545 oder Lebensmittelkontakt braucht, kommt mit Standardware nicht
 * weiter und muss auf ausdrücklich zertifizierte Compounds ausweichen.
 *
 * Eine leere Spalte ist hier eine Information, kein Mangel der Darstellung.
 */

import { MATERIALS } from "../data/materials";
import type { Choice, Flag, I18nText, Material, Quantity } from "../engine/types";
import { Card, Chip, Disclosure, cx, text } from "../components/ui";
import type { Lang } from "../i18n";

type T = (k: string, p?: Record<string, string | number>) => string;

const val = (n: unknown): string | null =>
  n && typeof n === "object" && "value" in (n as object)
    ? ((n as Choice).value as string | null) : null;
const flag = (n: unknown): boolean | null =>
  n && typeof n === "object" && "value" in (n as object)
    ? ((n as Flag).value as boolean | null) : null;
const note = (n: unknown): I18nText | undefined =>
  n && typeof n === "object" && "note" in (n as object) ? (n as Quantity).note : undefined;

interface Row {
  m: Material;
  ul94: string | null;
  en45545: string | null;
  food: string | null;
  esd: string | null;
  emissions: string | null;
  extraction: boolean | null;
  ul94Note?: I18nText;
}

function read(m: Material): Row {
  const c = m.compliance as Record<string, Record<string, unknown>> | undefined;
  return {
    m,
    ul94: val(c?.flameRetardancy?.ul94),
    en45545: val(c?.flameRetardancy?.en45545),
    food: val(c?.foodContact?.status),
    esd: val(c?.esd?.classification),
    emissions: val(c?.printEmissions?.concernLevel),
    extraction: flag(c?.printEmissions?.extractionRecommended),
    ul94Note: note(c?.flameRetardancy?.ul94),
  };
}

export function Compliance({ lang, navigate }: { t: T; lang: Lang; navigate: (p: string) => void }) {
  const rows = MATERIALS.map(read).sort((a, b) => a.m.identity.name.localeCompare(b.m.identity.name));

  const classified = rows.filter((r) => r.ul94 && r.ul94 !== "not-classified").length;
  const foodDeclared = rows.filter((r) => r.food?.startsWith("declared")).length;
  const esdCapable = rows.filter((r) => r.esd === "dissipative" || r.esd === "conductive").length;

  const de = lang === "de";

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-1">
        {de ? "Brandschutz und Zertifizierung" : "Fire performance and certification"}
      </h1>
      <p className="text-sm muted mb-6 max-w-3xl leading-relaxed">
        {de
          ? "Welche Werkstoffe tragen ein Prüfzeugnis — und welche nur eine Herstellerformulierung, die wie eines klingt."
          : "Which materials carry a test certificate — and which only carry manufacturer wording that sounds like one."}
      </p>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {([
          [classified, rows.length, de ? "mit UL94-Einstufung" : "with a UL94 rating"],
          [foodDeclared, rows.length, de ? "lebensmittelkonform deklariert" : "food contact declared"],
          [esdCapable, rows.length, de ? "ESD-tauglich" : "ESD capable"],
        ] as const).map(([n, total, label]) => (
          <Card key={label}>
            <div className="font-display text-3xl font-bold tabular-nums">
              <span className={n === 0 ? "text-bad" : "hl"}>{n}</span>
              <span className="muted text-lg"> / {total}</span>
            </div>
            <div className="text-sm muted mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-6 border-ok/50 bg-ok/5">
        <h2 className="font-display font-bold text-[15px] mb-2">
          {de ? "Der Befund: fast nichts ist geprüft" : "The finding: almost nothing is certified"}
        </h2>
        {/* Aus den Daten abgeleitet, nicht hartkodiert: eine feste Behauptung wie
            "kein Werkstoff trägt eine Einstufung" wird mit dem ersten zertifizierten
            Datensatz falsch — genau der Fehler, den dieses Werkzeug vermeiden soll. */}
        <p className="text-sm leading-relaxed max-w-3xl mb-2">
          {classified === 0
            ? (de
              ? `Kein Werkstoff dieser Datenbank trägt eine UL94-Einstufung. Das liegt nicht an lückenhafter Erfassung, sondern daran, dass Standard-Filamente schlicht nicht geprüft werden — eine Zertifizierung kostet Geld und lohnt sich nur bei Industriecompounds.`
              : `No material in this database carries a UL94 rating. That is not a gap in our data collection: standard filaments are simply not tested — certification costs money and only pays off for industrial compounds.`)
            : (de
              ? `Von ${rows.length} Werkstoffen tragen genau ${classified} eine UL94-Einstufung: ${rows.filter((r) => r.ul94 && r.ul94 !== "not-classified").map((r) => `${r.m.identity.name} (${r.ul94})`).join(", ")}. Alle übrigen sind ungeprüft — nicht wegen lückenhafter Erfassung, sondern weil Standard-Filamente schlicht nicht geprüft werden. Eine Zertifizierung kostet Geld und lohnt sich nur bei Industriecompounds.`
              : `Of ${rows.length} materials, exactly ${classified} carry a UL94 rating: ${rows.filter((r) => r.ul94 && r.ul94 !== "not-classified").map((r) => `${r.m.identity.name} (${r.ul94})`).join(", ")}. All others are untested — not through gaps in our data collection, but because standard filaments simply are not tested. Certification costs money and only pays off for industrial compounds.`)}
        </p>
        <Disclosure tone="warn" className="mt-3 bg-canvas/40 dark:bg-transparent"
          summary={de
            ? "Achtung bei Herstellerformulierungen — was nach Brandschutz klingt, ist meist keiner"
            : "Beware of manufacturer wording — what sounds like fire performance usually is not"}>
          <p className="leading-relaxed max-w-3xl">
            {de
              ? "Aussagen wie „flammable and self-extinguishing in the air“ (so bei Bambu PC und PETG-CF) klingen nach Brandschutz, sind aber KEINE Einstufung nach UL94. Wer V-0 braucht, braucht ein Prüfzeugnis eines ausdrücklich flammgeschützten Compounds — etwa PC-FR, ABS-FR, PEI oder Bahnqualitäten nach EN 45545."
              : "Statements like “flammable and self-extinguishing in the air” (as with Bambu PC and PETG-CF) sound like fire performance but are NOT a UL94 classification. If you need V-0 you need a test certificate for an explicitly flame-retardant compound — for example PC-FR, ABS-FR, PEI or rail grades to EN 45545."}
          </p>
        </Disclosure>
      </Card>

      <div className="overflow-x-auto overscroll-x-contain surface p-0 mb-6">
        <table className="w-full text-sm min-w-max">
          <thead className="border-b border-hairline dark:border-[#1E2B3D]">
            <tr>
              {[
                de ? "Material" : "Material", "UL94", "EN 45545",
                de ? "Lebensmittel" : "Food contact", "ESD",
                de ? "Druck-Emissionen" : "Print emissions",
              ].map((h) => (
                <th key={h} className="text-left font-semibold py-2.5 px-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.m.id}
                className="border-b border-hairline/70 dark:border-[#172233] hover:bg-petrol-50/50 dark:hover:bg-white/[0.02]">
                <td className="py-2 px-3 font-medium whitespace-nowrap">
                  <a href={`#/material/${r.m.id}`} className="hl hover:underline">{r.m.identity.name}</a>
                </td>
                <td className="py-2 px-3">
                  {r.ul94 === "not-classified" || !r.ul94
                    ? <Chip tone="bad">{de ? "nicht klassifiziert" : "not classified"}</Chip>
                    : <Chip tone="good">{r.ul94}</Chip>}
                </td>
                <td className="py-2 px-3 muted">
                  {r.en45545 && r.en45545 !== "not-classified" ? <Chip tone="good">{r.en45545}</Chip> : "–"}
                </td>
                <td className="py-2 px-3">
                  {r.food?.startsWith("declared")
                    ? <Chip tone="good">{de ? "deklariert" : "declared"}</Chip>
                    : <Chip tone="bad">{de ? "nicht deklariert" : "not declared"}</Chip>}
                </td>
                <td className="py-2 px-3">
                  {r.esd === "dissipative" || r.esd === "conductive"
                    ? <Chip tone="good">{r.esd}</Chip>
                    : r.esd === "insulating"
                      ? <Chip tone="bad">{de ? "isolierend" : "insulating"}</Chip>
                      : <span className="muted">–</span>}
                </td>
                <td className="py-2 px-3">
                  {r.emissions
                    ? <Chip tone={r.emissions === "high" ? "bad" : r.emissions === "moderate" ? "ok" : "good"}>
                        {r.emissions === "high" ? (de ? "hoch" : "high")
                          : r.emissions === "moderate" ? (de ? "mittel" : "moderate")
                          : (de ? "gering" : "low")}
                      </Chip>
                    : <span className="muted">–</span>}
                  {r.extraction && (
                    <span className="block text-[11px] muted mt-0.5">
                      {de ? "Absaugung nötig" : "extraction required"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mb-8">
        <p className="eyebrow mb-2">{de ? "Was die Einstufungen bedeuten" : "What the classifications mean"}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { h: "UL94", p: de
              ? "Brandverhalten von Kunststoffen. Von HB (langsam brennend, schwächste Stufe) über V-2, V-1 bis V-0 (selbstverlöschend binnen 10 s, kein brennendes Abtropfen). Immer mit Prüfdicke angeben — V-0 bei 3 mm ist nicht V-0 bei 1 mm."
              : "Flammability of plastics. From HB (slow burning, weakest) through V-2, V-1 to V-0 (self-extinguishing within 10 s, no flaming drips). Always quote the test thickness — V-0 at 3 mm is not V-0 at 1 mm." },
            { h: "EN 45545-2", p: de
              ? "Brandschutz im Schienenfahrzeugbau, Gefährdungsstufen HL1 bis HL3. Ohne diese Einstufung ist ein Bauteil im Bahnbereich nicht einsetzbar, unabhängig von UL94."
              : "Fire protection for rail vehicles, hazard levels HL1 to HL3. Without this classification a part cannot be used in rail applications, regardless of UL94." },
            { h: de ? "Lebensmittelkontakt" : "Food contact", p: de
              ? "EU 10/2011 oder FDA beziehen sich auf das MATERIAL. Das gedruckte BAUTEIL ist damit nicht freigegeben: Schichtfugen bilden Kapillaren und Keimnischen, die sich nicht sicher reinigen lassen."
              : "EU 10/2011 or FDA refer to the MATERIAL. The printed PART is not thereby approved: layer seams form capillaries and bacterial niches that cannot be reliably cleaned." },
            { h: "ESD", p: de
              ? "Verbreiteter Irrtum: Kohlenstofffaser bedeutet nicht leitfähig. Bei den üblichen 5–20 % Kurzfaseranteil entsteht kein durchgängiges Netzwerk — das Bauteil bleibt isolierend. ESD braucht ein deklariertes Compound mit angegebenem Oberflächenwiderstand."
              : "Common misconception: carbon fibre does not mean conductive. At the usual 5–20 % chopped fibre loading no continuous network forms — the part stays insulating. ESD requires a declared compound with a stated surface resistivity." },
          ].map((c) => (
            <Card key={c.h}>
              <h3 className="font-display font-bold text-[15px] mb-1.5">{c.h}</h3>
              <p className="text-sm muted leading-relaxed">{c.p}</p>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-sm muted">
        <button className={cx("hl hover:underline")} onClick={() => navigate("matrix")}>
          {de ? "Zur vollständigen Materialübersicht" : "To the full material overview"} →
        </button>
      </p>

      {rows.filter((r) => r.ul94Note).slice(0, 2).map((r) => (
        <p key={r.m.id} className="text-xs muted mt-4 leading-relaxed max-w-3xl">
          <strong className="text-ink dark:text-[#E8EDF2]">{r.m.identity.name}:</strong>{" "}
          {text(r.ul94Note, lang)}
        </p>
      ))}
    </div>
  );
}
