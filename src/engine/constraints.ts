/**
 * Stage 1 — hard constraints.
 *
 * Every material is evaluated against every active constraint, and the full verdict
 * list is kept even for materials that pass. That list is what powers "Warum ist PLA
 * nicht dabei?" — the feature that makes the recommendation auditable instead of magic.
 *
 * MISSING DATA IS NOT A PASS, AND NOT ALWAYS A FAIL.
 * Two deliberately different policies:
 *
 *   permissive — absence of data means "we do not know". The material stays in the
 *     running but is flagged (dataMissing) and earns a risk explanation. Used for
 *     engineering properties, where excluding sparse records would punish honest
 *     data collection.
 *
 *   strict — absence of a declaration IS a failure. Used for regulated properties
 *     (food contact, flame class, ESD). You cannot put an undeclared material in
 *     contact with food because nobody wrote down that you cannot.
 *
 * EINE SCHAETZUNG DARF ABSTUFEN, NIE AUSSCHLIESSEN.
 * Dieselbe Regel wie in ADR-016, dort fuer die Brandschutzklasse: Ein Wert mit
 * `confidence: "estimated"` schliesst keinen Werkstoff aus. Er warnt.
 *
 * Der Anlass war ein Fehler, den erst die Werkstatt gesehen hat. Der Anwendungsfall
 * "Messebau-Grossteil" empfahl ASA Aero - ein schaeumendes Leichtbaufilament - fuer ein
 * zwei Meter grosses Messemodell. Nicht weil es passte, sondern weil es als EINZIGES
 * uebrig blieb: PLA fiel an einer geschaetzten Dauergebrauchstemperatur, PETG, ABS, ASA
 * und PETG-CF an einer geschaetzten Kantenlaenge. Fuenf Ausschluesse, kein einziger
 * davon durch eine Messung gedeckt.
 *
 * Deshalb gilt jetzt: Ein Constraint prueft zuerst den belegten Wert. Nur wenn AUCH der
 * belegte Wert reisst, faellt der Werkstoff raus. Reisst nur die konservative Schaetzung,
 * bleibt er drin und traegt eine Warnung. Beide Zahlen tun damit das, wofuer sie taugen:
 * die Schaetzung warnt, das Datenblatt entscheidet.
 */

import type { ChemicalResistance, ConstraintVerdict, Flag, Choice, Material, Quantity, Rating, Requirements } from "./types";

const num = (n: unknown): number | null =>
  n && typeof n === "object" && "value" in n ? ((n as Quantity).value as number | null) : null;
const str = (n: unknown): string | null =>
  n && typeof n === "object" && "value" in n ? ((n as Choice).value as string | null) : null;
const bool = (n: unknown): boolean | null =>
  n && typeof n === "object" && "value" in n ? ((n as Flag).value as boolean | null) : null;

const UL94_ORDER = ["HB", "V-2", "V-1", "V-0", "5VB", "5VA"];

/** true, wenn der Knoten ausdruecklich als Schaetzung gekennzeichnet ist. */
const isEstimated = (n: unknown): boolean =>
  !!n && typeof n === "object" && (n as { confidence?: string }).confidence === "estimated";

/** Effective continuous service ceiling: our conservative figure if we have one. */
export function serviceCeiling(m: Material): { value: number | null; basis: "recommended" | "hdtB" | "hdtA" | null } {
  const rec = num(m.thermal?.recommendedMaxServiceTemperature);
  if (rec !== null) return { value: rec, basis: "recommended" };
  const b = num(m.thermal?.hdtB);
  if (b !== null) return { value: b, basis: "hdtB" };
  const a = num(m.thermal?.hdtA);
  if (a !== null) return { value: a, basis: "hdtA" };
  return { value: null, basis: null };
}

/**
 * Die BELEGTE Temperaturgrenze - die, auf die ein Ausschluss sich stuetzen darf.
 *
 * `recommendedMaxServiceTemperature` ist bei jedem Werkstoff eine eigene konservative
 * Schaetzung mit Sicherheitsabstand. Sie taugt als Warnung, nicht als Urteil. Wo sie
 * geschaetzt ist, entscheidet stattdessen der gemessene Datenblattwert (HDT-B, sonst
 * HDT-A). Gibt es auch den nicht, gibt es keine Grundlage fuer einen Ausschluss.
 */
function documentedCeiling(m: Material): number | null {
  const rec = m.thermal?.recommendedMaxServiceTemperature;
  if (rec && !isEstimated(rec)) return num(rec);
  const b = m.thermal?.hdtB;
  if (b && !isEstimated(b)) return num(b);
  const a = m.thermal?.hdtA;
  if (a && !isEstimated(a)) return num(a);
  // Vicat steht bewusst am Ende der Kette: Die Eindringpruefung belastet die Probe
  // schwaecher als der HDT-Versuch und faellt deshalb hoeher aus. Als einziger
  // vorhandener Messwert taugt sie trotzdem - sie hebt einen Werkstoff nur von
  // "ausgeschlossen" auf "mit Warnung dabei", nie auf "bedenkenlos empfohlen".
  // PLA Tough ist genau dieser Fall: Vicat 65 °C belegt, HDT nirgends genannt.
  const v = m.thermal?.vicatB50;
  if (v && !isEstimated(v)) return num(v);
  return null;
}

export function evaluateConstraints(m: Material, req: Requirements): ConstraintVerdict[] {
  const out: ConstraintVerdict[] = [];
  const pass = (constraintId: string, key: string, params: Record<string, string | number> = {}, evidence?: string) =>
    out.push({ constraintId, passed: true, key, params, evidence });
  const fail = (constraintId: string, key: string, params: Record<string, string | number> = {}, evidence?: string) =>
    out.push({ constraintId, passed: false, key, params, evidence });
  const unknown = (constraintId: string, key: string, params: Record<string, string | number> = {}, evidence?: string) =>
    out.push({ constraintId, passed: true, key, params, evidence, dataMissing: true });

  /* --- temperature ------------------------------------------------------- */
  if (req.serviceTemperatureC != null) {
    const { value, basis } = serviceCeiling(m);
    const hdtB = num(m.thermal?.hdtB);
    // Fehlende Werte gehen NICHT als 0 in die Meldung (ADR-006). Vorher stand in der
    // Begruendung "(HDT-B 0 °C)", wo schlicht keine HDT-B hinterlegt war - eine Zahl,
    // die es nicht gibt, und noch dazu eine, die den Werkstoff schlechter aussehen
    // laesst als er ist. Der Zusatz erscheint jetzt nur, wenn es den Wert wirklich gibt.
    const p: Record<string, string | number> = { required: req.serviceTemperatureC };
    if (value !== null) p.actual = value;
    if (hdtB !== null) p.hdtB = hdtB;
    const documented = documentedCeiling(m);
    if (value === null) unknown("serviceTemperature", "constraint.temperature.unknown", p, "thermal.hdtB");
    else if (value >= req.serviceTemperatureC)
      pass("serviceTemperature", basis === "recommended" ? "constraint.temperature.pass" : "constraint.temperature.passHdt", p, "thermal.hdtB");
    else if (documented !== null && documented >= req.serviceTemperatureC) {
      // Nur die konservative Schaetzung reisst, der Datenblattwert traegt noch. Das ist
      // eine Warnung, kein Ausschluss: PLA bei 50 °C ist genau dieser Fall - 40 °C
      // geschaetzt, HDT-B 57 °C gemessen. Fuer ein unbelastetes Messemodell traegt es,
      // fuer eine belastete Konsole nicht.
      p.documented = documented;
      pass("serviceTemperature", "constraint.temperature.tight", p, "thermal.hdtB");
    }
    else fail("serviceTemperature",
      hdtB === null ? "constraint.temperature.failNoHdt" : "constraint.temperature.fail", p, "thermal.hdtB");
  }

  /* --- chamber ----------------------------------------------------------- */
  if (req.chamberAvailable === false) {
    const need = str(m.processing?.chamberRequirement);
    if (need === null) unknown("chamber", "constraint.chamber.unknown", {}, "processing.chamberRequirement");
    else if (need === "mandatory") fail("chamber", "constraint.chamber.fail", {}, "processing.chamberRequirement");
    else if (need === "recommended") pass("chamber", "constraint.chamber.warn", {}, "processing.chamberRequirement");
    else pass("chamber", "constraint.chamber.pass", {}, "processing.chamberRequirement");
  }

  /* --- hardened nozzle --------------------------------------------------- */
  if (req.hardenedNozzleAvailable === false) {
    const needs = bool(m.processing?.hardenedNozzleRequired);
    const abras = (m.processing?.abrasiveness as Rating | undefined)?.value ?? null;
    if (needs === true || (abras !== null && abras >= 4))
      fail("hardenedNozzle", "constraint.nozzle.fail", {}, "processing.hardenedNozzleRequired");
    else pass("hardenedNozzle", "constraint.nozzle.pass", {}, "processing.hardenedNozzleRequired");
  }

  /* --- annealing oven ------------------------------------------------------ */
  if (req.annealingOvenAvailable === false) {
    const ann = (m.thermal as { annealing?: { requiredForDatasheetValues?: Flag } } | undefined)?.annealing;
    const needed = ann?.requiredForDatasheetValues?.value;
    if (needed === true) fail("annealingOven", "constraint.annealing.fail", {}, "thermal.annealing");
    else pass("annealingOven", "constraint.annealing.pass", {}, "thermal.annealing");
  }

  /* --- outdoor ----------------------------------------------------------- */
  if (req.outdoorYears != null) {
    const life = num(m.durability?.outdoorServiceLife);
    const uv = (m.durability?.uvResistance as Rating | undefined)?.value ?? null;
    const p = { required: req.outdoorYears, actual: life ?? 0, uv: uv ?? 0 };
    if (life !== null) {
      if (life >= req.outdoorYears) pass("outdoor", "constraint.outdoor.pass", p, "durability.outdoorServiceLife");
      else fail("outdoor", "constraint.outdoor.fail", p, "durability.outdoorServiceLife");
    } else if (uv !== null) {
      // The UV rating needed rises with the demanded service life. A middling rating (3)
      // is fine for a season and wrong for five years — PETG outdoors is exactly that case.
      const needed = req.outdoorYears >= 5 ? 4 : req.outdoorYears >= 2 ? 3 : 2;
      if (uv < needed) fail("outdoor", "constraint.outdoor.failUv", { ...p, needed }, "durability.uvResistance");
      else pass("outdoor", "constraint.outdoor.passUv", { ...p, needed }, "durability.uvResistance");
    } else unknown("outdoor", "constraint.outdoor.unknown", p, "durability.uvResistance");
  }

  /* --- food contact (strict) --------------------------------------------- */
  if (req.foodContact) {
    const status = str((m.compliance as { foodContact?: { status?: Choice } } | undefined)?.foodContact?.status);
    const declared = status?.startsWith("declared") ?? false;
    if (declared) pass("foodContact", "constraint.food.pass", {}, "compliance.foodContact.status");
    else fail("foodContact", "constraint.food.fail", { status: status ?? "unbekannt" }, "compliance.foodContact.status");
  }

  /* --- flame class (strict) ----------------------------------------------
     A flame class is a regulatory statement, not a material property one may infer.
     A rating that carries `estimated` therefore fails even when its value would pass:
     "rigid PVC is inherently flame retardant" is textbook knowledge, and textbook
     knowledge does not go into a fire safety case. Only a rating whose source is a
     document counts. Same asymmetry as ADR-006 — a wrong clearance costs a part in
     the field, an over-cautious one costs a place in the ranking. */
  if (req.flameClass) {
    const fr = (m.compliance as {
      flameRetardancy?: {
        ul94?: Choice;
        ul94ViaProduct?: { value?: string; products?: { name?: string; brand?: string }[] };
      };
    } | undefined)?.flameRetardancy;
    const node = fr?.ul94;
    const ul = str(node);
    const estimated = (node as { confidence?: string } | undefined)?.confidence === "estimated";
    const have = ul ? UL94_ORDER.indexOf(ul) : -1;
    const want = UL94_ORDER.indexOf(req.flameClass);
    const p: Record<string, string | number> = { required: req.flameClass, actual: ul ?? "nicht klassifiziert" };

    /* Der Werkstofftyp selbst traegt die Klasse belegt - der Normalfall. */
    if (have >= 0 && have >= want && !estimated) {
      pass("flameClass", "constraint.flame.pass", p, "compliance.flameRetardancy.ul94");
    } else {
      /* Kein Typwert, aber ein belegtes PRODUKT dieser Familie schafft die Klasse.
         Das gibt die Familie NICHT frei: PETG ist nicht V-0, nur die flammgeschuetzte
         Type ist es - und die ist ein anderer Werkstoff als die Standardtype. Der
         Werkstoff bleibt deshalb in der Liste, die Begruendung nennt aber Marke und
         Produktnamen, damit niemand "irgendein PETG" bestellt. */
      const via = fr?.ul94ViaProduct;
      const viaRank = via?.value ? UL94_ORDER.indexOf(via.value) : -1;
      if (viaRank >= 0 && viaRank >= want && via?.products?.length) {
        p.actual = via.value as string;
        p.product = via.products
          .map((x) => [x.brand, x.name?.replace(new RegExp(`^${x.brand}\\s*`), "")].filter(Boolean).join(" "))
          .join(", ");
        pass("flameClass", "constraint.flame.passViaProduct", p, "compliance.flameRetardancy.ul94ViaProduct");
      } else {
        fail("flameClass",
          have >= 0 && have >= want ? "constraint.flame.failEstimated" : "constraint.flame.fail",
          p, "compliance.flameRetardancy.ul94");
      }
    }
  }

  /* --- ESD (strict) ------------------------------------------------------- */
  if (req.esd) {
    const cls = str((m.compliance as { esd?: { classification?: Choice } } | undefined)?.esd?.classification);
    if (cls === "dissipative" || cls === "conductive") pass("esd", "constraint.esd.pass", { actual: cls }, "compliance.esd.classification");
    else fail("esd", "constraint.esd.fail", { actual: cls ?? "nicht deklariert" }, "compliance.esd.classification");
  }

  /* --- part size -----------------------------------------------------------
     KEIN AUSSCHLUSSKRITERIUM MEHR. Die Kantenlaenge, ab der ein Werkstoff aufwendig
     wird, ist keine Werkstoffeigenschaft: Begrenzt wird die Groesse vom Bauraum und
     vom Verfahren, nicht vom Polymer. Mit beheizter Kammer und Segmentierung laesst
     sich praktisch jeder dieser Werkstoffe auf zwei Meter und darueber fertigen - das
     ist Werkstattpraxis, nicht Theorie.

     Der hinterlegte Wert sagt jetzt: ab hier wird es aufwendig (Kammer, Brim,
     Segmentierung). Er stuft ab und warnt, er streicht nicht. Alle 38 Werte sind
     ausserdem Schaetzungen - damit greift ohnehin die Regel von oben.

     Ausdruecklich NICHT hinterlegt ist der Bauraum irgendeiner konkreten Maschine.
     Dieses Werkzeug ist herstellerneutral (ADR-004); der Maschinenpark seines
     Herausgebers ist kein Massstab fuer die Werkstoffwahl anderer. */
  if (req.maxEdgeMm != null) {
    const xxl = (m.commercial as { xxl?: { maxSensibleEdgeMm?: Quantity } } | undefined)?.xxl?.maxSensibleEdgeMm;
    const v = xxl?.value ?? null;
    const p = { required: req.maxEdgeMm, actual: v ?? 0 };
    if (v === null) unknown("partSize", "constraint.size.unknown", p, "commercial.xxl.maxSensibleEdgeMm");
    else if (v >= req.maxEdgeMm) pass("partSize", "constraint.size.pass", p, "commercial.xxl.maxSensibleEdgeMm");
    else pass("partSize", "constraint.size.effort", p, "commercial.xxl.maxSensibleEdgeMm");
  }

  /* --- flexible / rigid ---------------------------------------------------- */
  if (req.flexible != null) {
    const elast = m.identity.polymerClass === "elastomer";
    if (req.flexible && !elast) fail("flexible", "constraint.flexible.fail", {}, "identity.polymerClass");
    else if (!req.flexible && elast) fail("flexible", "constraint.rigid.fail", {}, "identity.polymerClass");
    else pass("flexible", "constraint.flexible.pass", {}, "identity.polymerClass");
  }

  /* --- minimum strength ---------------------------------------------------- */
  if (req.minTensileStrengthMPa != null) {
    const v = num(m.mechanics?.tensileStrengthXy);
    const p = { required: req.minTensileStrengthMPa, actual: v ?? 0 };
    if (v === null) unknown("minStrength", "constraint.strength.unknown", p, "mechanics.tensileStrengthXy");
    else if (v >= req.minTensileStrengthMPa) pass("minStrength", "constraint.strength.pass", p, "mechanics.tensileStrengthXy");
    else fail("minStrength", "constraint.strength.fail", p, "mechanics.tensileStrengthXy");
  }

  /* --- chemical exposure ---------------------------------------------------- */
  for (const chemId of req.chemicals ?? []) {
    const list = (m.durability?.chemicalResistance as ChemicalResistance[] | undefined) ?? [];
    const hit = list.find((c) => c.chemicalId === chemId);
    const p = { chemical: chemId };
    const cid = `chemical:${chemId}`;
    if (!hit || hit.rating === "unknown") unknown(cid, "constraint.chemical.unknown", p, "durability.chemicalResistance");
    else if (hit.rating === "not-resistant") fail(cid, "constraint.chemical.fail", p, "durability.chemicalResistance");
    else if (hit.rating === "limited") pass(cid, "constraint.chemical.limited", p, "durability.chemicalResistance");
    else pass(cid, "constraint.chemical.pass", p, "durability.chemicalResistance");
  }

  return out;
}

/**
 * Reserve left on a numeric constraint, 0..1. Used to warn about tight passes.
 * Returns null when the datum is missing — there is no reserve to compute on a value
 * we do not have, and pretending otherwise produced a "-100 % reserve" warning.
 */
export function constraintReserve(v: ConstraintVerdict): number | null {
  if (v.dataMissing || !v.passed) return null;
  const { required, actual, documented } = v.params as
    { required?: number; actual?: number; documented?: number };
  if (typeof required !== "number" || required <= 0) return null;

  /* Ein BESTANDENER Constraint, dessen konservativer Wert unter der Anforderung liegt,
     hat die Pruefung ueber einen anderen Beleg bestanden - ueber den gemessenen
     Datenblattwert (`documented`) oder, bei der Bauteilgroesse, weil die Schwelle
     ueberhaupt nicht ausschliesst. Die Reserve gegen den konservativen Wert waere dann
     negativ, und eine negative Reserve auf einem bestandenen Constraint ist keine
     Information, sondern ein Widerspruch. Denselben Fehler gab es schon einmal, als die
     Reserve auf FEHLENDEN Daten gerechnet wurde ("nur -100 % Reserve"). */
  const base = typeof documented === "number" ? documented : actual;
  if (typeof base !== "number" || base < required) return null;
  return (base - required) / required;
}
