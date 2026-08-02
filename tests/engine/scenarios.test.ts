/**
 * Fachliche Szenario-Tests.
 *
 * These are not unit tests of arithmetic — they assert that the engine gives the answer
 * a competent applications engineer would give. If a scenario here goes red, either the
 * engine is wrong or the data is wrong. Both matter.
 */

import { describe, expect, it } from "vitest";
import { MATERIALS, byId } from "../../src/data/materials";
import { select, whyNot, dataCompleteness, confidenceProfile, serviceCeiling, evaluateConstraints, constraintReserve } from "../../src/engine";
import { buildNormalisation, percentileRank, scoreMaterial } from "../../src/engine/scoring";
import { DEFAULT_WEIGHTS } from "../../src/engine/criteria";
import { compare, dominated } from "../../src/engine/tradeoffs";

const W = DEFAULT_WEIGHTS;
const ids = (list: { material: { id: string } }[]) => list.map((r) => r.material.id);

describe("Datenbasis", () => {
  it("lädt alle Materialdatensätze", () => {
    expect(MATERIALS.length).toBeGreaterThanOrEqual(11);
  });

  it("jeder Datensatz hat Quellen und eine Kurzbeschreibung in beiden Sprachen", () => {
    for (const m of MATERIALS) {
      expect(m.governance.sources.length, m.id).toBeGreaterThan(0);
      expect(m.identity.abstract.de.length, m.id).toBeGreaterThan(40);
      expect(m.identity.abstract.en.length, m.id).toBeGreaterThan(40);
    }
  });

  it("IDs sind eindeutig", () => {
    expect(new Set(MATERIALS.map((m) => m.id)).size).toBe(MATERIALS.length);
  });
});

describe("Szenario: Aussenbauteil, 5 Jahre, UV", () => {
  const req = { outdoorYears: 5, weights: { ...W, outdoor: 5, temperature: 2 } };

  it("schliesst PLA aus", () => {
    const r = select(MATERIALS, req);
    expect(ids(r.ranked)).not.toContain("pla");
    expect(ids(r.rejected)).toContain("pla");
  });

  it("über fünf Jahre überleben nur ausdrücklich witterungsfeste Werkstoffe", () => {
    const r = select(MATERIALS, req);
    const surviving = ids(r.ranked);
    expect(surviving.length).toBeGreaterThan(0);
    /* Geprueft wird die REGEL, nicht eine Namensliste: Wer fuenf Jahre draussen bestehen
       soll, muss eine belegte Witterungsbestaendigkeit von mindestens 4 tragen. Eine feste
       Liste wuerde bei jedem neuen witterungsfesten Werkstoff falsch werden - so geschehen,
       als PMMA dazukam, das fuer Aussenverglasung der Standardwerkstoff ist. */
    for (const m of r.ranked) {
      const w = (m.material.durability as { weatherResistance?: { value?: number } })?.weatherResistance?.value;
      expect(w ?? 0, `${m.material.id} hat keine ausreichende Witterungsbeständigkeit`).toBeGreaterThanOrEqual(4);
    }
    for (const id of ["pla", "abs", "pc", "petg"]) expect(surviving).not.toContain(id);
  });

  it("PETG fällt bei fünf Jahren durch, ist bei einer Saison aber zulässig", () => {
    // UV-Bewertung 3 trägt eine Saison, keine fünf Jahre. Die Schwelle steigt mit der Standzeit.
    expect(ids(select(MATERIALS, { outdoorYears: 5 }).ranked)).not.toContain("petg");
    expect(ids(select(MATERIALS, { outdoorYears: 1 }).ranked)).toContain("petg");
  });

  it("wenn Witterung dominiert, belegt die ASA-Familie die ersten Plätze", () => {
    const r = select(MATERIALS, {
      outdoorYears: 2,
      weights: { outdoor: 5, temperature: 1, price: 1, printability: 1 },
    });
    for (const top of ids(r.ranked).slice(0, 3)) expect(top).toMatch(/^asa/);
  });

  it("bei ausgewogener Gewichtung führt weiterhin die ASA-Familie", () => {
    const r = select(MATERIALS, { outdoorYears: 2, weights: { ...W, outdoor: 5 } });
    expect(ids(r.ranked)[0]).toMatch(/^asa/);
  });

  it("verrechnet Witterung gegen Pragmatik, statt ASA blind zu bevorzugen", () => {
    // Bei nur zwei Jahren Standzeit und ausgewogener Gewichtung schiebt sich PETG vor
    // reines ASA - es gewinnt bei Druckbarkeit, Preis und Verfügbarkeit. Das ist gewollt:
    // ein Berater, der immer ASA sagt, sobald "aussen" fällt, ist kein Berater.
    const r = select(MATERIALS, { outdoorYears: 2, weights: { ...W, outdoor: 5 } });
    const petg = r.ranked.find((x) => x.material.id === "petg")!;
    const asa = r.ranked.find((x) => x.material.id === "asa")!;
    expect(petg.criteria.find((c) => c.criterionId === "printability")!.score!)
      .toBeGreaterThan(asa.criteria.find((c) => c.criterionId === "printability")!.score!);
    expect(asa.criteria.find((c) => c.criterionId === "outdoor")!.score!)
      .toBeGreaterThan(petg.criteria.find((c) => c.criterionId === "outdoor")!.score!);
  });

  it("begründet den PLA-Ausschluss nachvollziehbar", () => {
    const failed = select(MATERIALS, req).rejected.find((x) => x.material.id === "pla")!.failed;
    expect(failed.some((f) => f.constraintId === "outdoor")).toBe(true);
    expect(failed[0].evidence).toBeTruthy();
  });
});

describe("Szenario: 90 °C Dauertemperatur", () => {
  const req = { serviceTemperatureC: 90, weights: { ...W, temperature: 5 } };

  it("schliesst alle PLA-, PETG- und ABS-Typen aus", () => {
    const surviving = ids(select(MATERIALS, req).ranked);
    for (const id of ["pla", "petg", "petg-cf", "abs"]) expect(surviving, id).not.toContain(id);
  });

  it("lässt die Hochtemperaturwerkstoffe übrig", () => {
    const surviving = ids(select(MATERIALS, req).ranked);
    expect(surviving).toContain("pa6-cf");
    expect(surviving).toContain("pet-cf");
  });

  it("nutzt die konservative Dauereinsatzempfehlung, nicht die HDT", () => {
    const petg = byId("petg")!;
    const { basis, value } = serviceCeiling(petg);
    expect(basis).toBe("recommended");
    expect(value!).toBeLessThan(petg.thermal!.hdtB!.value as number);
  });

  it("die konservative Schätzung warnt, der Datenblattwert entscheidet", () => {
    /* Der Befund aus der Werkstatt: Der Anwendungsfall "Messebau-Grossteil" fordert
       50 °C und schloss damit PLA aus - auf Basis einer GESCHAETZTEN
       Dauergebrauchstemperatur von 40 °C. Gemessen sind bei PLA aber HDT-B 57 °C.
       Fuer ein unbelastetes Messemodell traegt das. Seither gilt: Nur ein belegter
       Wert darf ausschliessen, die Schaetzung warnt. */
    const pla = byId("pla")!;
    expect(pla.thermal!.recommendedMaxServiceTemperature!.confidence).toBe("estimated");
    expect(pla.thermal!.hdtB!.confidence).not.toBe("estimated");

    // 50 °C: Schaetzung (40) reisst, Datenblatt (57) traegt -> drin, mit Warnung.
    const tight = evaluateConstraints(pla, { serviceTemperatureC: 50 })
      .find((c) => c.constraintId === "serviceTemperature")!;
    expect(tight.passed).toBe(true);
    expect(tight.key).toBe("constraint.temperature.tight");
    expect(tight.params.documented).toBe(57);

    // 90 °C: auch das Datenblatt reisst -> weiterhin Ausschluss.
    const hard = evaluateConstraints(pla, { serviceTemperatureC: 90 })
      .find((c) => c.constraintId === "serviceTemperature")!;
    expect(hard.passed).toBe(false);
  });

  it("ein knapp bestandener Constraint hat nie eine negative Reserve", () => {
    // Die Warnstufe rechnet die Reserve gegen den BELEGTEN Wert. Vorher entstand hier
    // "-6 % Reserve" auf einem bestandenen Constraint - derselbe Widerspruch wie
    // seinerzeit die "-100 % Reserve" auf fehlenden Daten.
    for (const m of MATERIALS) {
      for (const v of evaluateConstraints(m, { serviceTemperatureC: 50, maxEdgeMm: 1800 })) {
        const reserve = constraintReserve(v);
        if (reserve !== null) expect(reserve, `${m.id}/${v.constraintId}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("Wissenslücken dürfen nicht belohnen", () => {
  /* Der Befund: Bei der Chemiewanne (Chemie 5, Steifigkeit 3) gewann OBC mit 68 gegen
     PP mit 61. PP hat 1400 MPa E-Modul und bekam dafuer 6 von 100 Punkten. OBC hatte gar
     keinen E-Modul hinterlegt - obwohl es mit 244 MPa Biegemodul noch WEICHER ist. Der
     gewichtete Mittelwert lief nur ueber Kriterien MIT Daten, die fehlende Zahl war
     damit ein Freifahrtschein. */
  const req = { chemicals: ["chem_dilute_alkali"], serviceTemperatureC: 60,
    weights: { chemical: 5, stiffness: 3, price: 3, printability: 3 } };

  it("ein Werkstoff ohne Daten zum gewichteten Kriterium schlägt keinen mit schlechten Daten", () => {
    const r = select(MATERIALS, req);
    const obc = r.ranked.find((x) => x.material.id === "obc")!;
    const pp = r.ranked.find((x) => x.material.id === "pp")!;

    // Die Ausgangslage, die den Fehler ueberhaupt erst moeglich machte:
    expect(obc.dataGaps).toContain("stiffness");
    expect(pp.dataGaps).not.toContain("stiffness");

    expect(pp.score, "PP muss vor OBC liegen").toBeGreaterThan(obc.score);
  });

  it("die Abdeckung ist der Anteil der Gewichtung, zu dem Daten vorliegen", () => {
    const r = select(MATERIALS, req);
    const pp = r.ranked.find((x) => x.material.id === "pp")!;
    expect(pp.coverage).toBe(1);

    const obc = r.ranked.find((x) => x.material.id === "obc")!;
    // Steifigkeit wiegt 3 von 14 -> 11/14
    expect(obc.coverage).toBeCloseTo(11 / 14, 3);
  });

  it("eine Lücke senkt den Score, macht ihn aber nicht zu null (ADR-006)", () => {
    const r = select(MATERIALS, req);
    const obc = r.ranked.find((x) => x.material.id === "obc")!;
    expect(obc.score).toBeGreaterThan(0);
    expect(obc.score).toBeLessThan(1);
    // Und der Nutzer erfaehrt es.
    expect(obc.explanations.some((e) => e.key === "risk.coverage")).toBe(true);
  });

  it("ohne Lücke bleibt der Score unverändert", () => {
    const r = select(MATERIALS, req);
    for (const rec of r.ranked) {
      if (rec.dataGaps.length === 0) expect(rec.coverage, rec.material.id).toBe(1);
    }
  });
});

describe("Reicht auch etwas Einfacheres?", () => {
  /* Aus der Werkstatt: "PETG ist ein Allrounder, der kann fast ueberall eingesetzt
     werden, und ich finde es nahezu nirgendwo in den Top-Auswahlen." Die
     Kompromissansicht kann das nicht beantworten - sie zeigt nur Kandidaten ab 80 %
     des Siegerscores, und ein Allrounder liegt bei Perzentilbewertung strukturell
     darunter. Deshalb ein eigener Slot. */
  const messmittel = { serviceTemperatureC: 50, minTensileStrengthMPa: 45,
    weights: { stiffness: 5, chemical: 4, price: 1 } };

  it("nennt den günstigeren Werkstoff, der die Anforderungen trotzdem erfüllt", () => {
    const r = select(MATERIALS, messmittel);
    expect(r.ranked[0].material.id).toBe("pps-cf");
    expect(r.pragmatic).not.toBeNull();
    expect(r.pragmatic!.material.id).toBe("petg");
    // PETG kostet einen Bruchteil des Siegers - das ist der ganze Punkt.
    expect(r.pragmatic!.priceRatio!).toBeLessThan(0.3);
  });

  it("der Vorschlag muss die harten Anforderungen selbst erfüllen", () => {
    const r = select(MATERIALS, messmittel);
    expect(ids(r.ranked)).toContain(r.pragmatic!.material.id);
    expect(ids(r.rejected)).not.toContain(r.pragmatic!.material.id);
  });

  it("nennt, was der Verzicht kostet", () => {
    const r = select(MATERIALS, messmittel);
    expect(r.pragmatic!.losses.length).toBeGreaterThan(0);
  });

  it("empfiehlt nichts, was nur über fehlende Daten durchgekommen ist", () => {
    // Vor der Untergrenze schlug die Funktion fuer die Hochtemperaturvorrichtung
    // TPU 95A vor - ein weiches Elastomer bei 14 % des Siegerscores.
    for (const req of [messmittel, { serviceTemperatureC: 120, weights: { temperature: 5, strength: 4 } }]) {
      const r = select(MATERIALS, req);
      if (!r.pragmatic) continue;
      const rec = r.ranked.find((x) => x.material.id === r.pragmatic!.material.id)!;
      expect(rec.unverifiedConstraints, r.pragmatic.material.id).toHaveLength(0);
      expect(r.pragmatic.relativeScore).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("schlägt nichts vor, wenn der Sieger selbst schon der pragmatische ist", () => {
    // "Funktionsprototyp, schnell und guenstig" wird von PLA angefuehrt - guenstiger
    // und einfacher geht nicht mehr.
    const r = select(MATERIALS, { weights: { price: 5, printability: 5 } });
    expect(r.ranked[0].material.id).toBe("pla");
    expect(r.pragmatic).toBeNull();
  });
});

describe("Szenario: keine beheizte Kammer verfügbar", () => {
  const req = { chamberAvailable: false, weights: W };

  it("schliesst kammerpflichtige Werkstoffe aus", () => {
    const surviving = ids(select(MATERIALS, req).ranked);
    for (const id of ["pc", "pa6-cf", "pet-cf"]) expect(surviving, id).not.toContain(id);
  });

  it("lässt PLA, PETG und PETG-CF zu", () => {
    const surviving = ids(select(MATERIALS, req).ranked);
    for (const id of ["pla", "petg", "petg-cf"]) expect(surviving, id).toContain(id);
  });

  it("warnt bei 'empfohlen', schliesst aber nicht aus", () => {
    const r = select(MATERIALS, req);
    expect(ids(r.ranked)).toContain("asa");
    const asa = r.ranked.find((x) => x.material.id === "asa")!;
    expect(asa.explanations.some((e) => e.key === "risk.chamberRecommended")).toBe(true);
  });
});

describe("Szenario: sehr grosses Bauteil (1.800 mm Kante)", () => {
  /* Diese beiden Tests haben bis 2026-08-02 das Gegenteil geprueft: dass eine zu kleine
     hinterlegte Kantenlaenge einen Werkstoff AUSSCHLIESST. Die Werkstatt hat das
     widerlegt - PETG laeuft dort einteilig ueber zwei Meter, ABS auf 2,4 m Betten. Die
     Kantenlaenge ist keine Werkstoffeigenschaft: Begrenzt wird die Groesse vom Bauraum
     und vom Verfahren. Alle 38 hinterlegten Werte waren ausserdem Schaetzungen ohne eine
     einzige Messung dahinter. Sie stufen jetzt ab und warnen, sie streichen nicht. */

  it("die Bauteilgrösse schliesst niemanden mehr aus", () => {
    const r = select(MATERIALS, { maxEdgeMm: 1800, weights: { ...W, xxl: 5 } });
    expect(r.ranked.length).toBeGreaterThan(0);
    for (const rej of r.rejected) {
      expect(rej.failed.map((f) => f.constraintId), rej.material.id).not.toContain("partSize");
    }
  });

  it("wer unter der Schwelle liegt, bekommt den Aufwandshinweis statt eines Ausschlusses", () => {
    const r = select(MATERIALS, { maxEdgeMm: 1800 });
    const surviving = ids(r.ranked);
    // PC lag mit 400 mm weit unter der Anforderung und flog frueher raus.
    expect(surviving).toContain("pla");
    expect(surviving).toContain("pc");

    const sizeVerdict = (id: string) =>
      evaluateConstraints(byId(id)!, { maxEdgeMm: 1800 }).find((c) => c.constraintId === "partSize")!;

    const pc = sizeVerdict("pc");
    expect(pc.passed).toBe(true);
    expect(pc.key).toBe("constraint.size.effort");

    // PLA liegt mit 2400 mm darueber und bekommt keinen Hinweis.
    expect(sizeVerdict("pla").key).toBe("constraint.size.pass");
  });

  it("die Grösse wirkt weiter über die Gewichtung, nicht über den Filter", () => {
    // Wenn XXL-Eignung hoch gewichtet wird, muss ein Werkstoff mit grosser Schwelle
    // vor einem mit kleiner liegen - sonst waere die Information ganz verloren.
    const r = select(MATERIALS, { maxEdgeMm: 1800, weights: { xxl: 5 } });
    const rank = (id: string) => ids(r.ranked).indexOf(id);
    expect(rank("pla")).toBeLessThan(rank("pc"));
  });
});

describe("Szenario: Lebensmittelkontakt", () => {
  const req = { foodContact: true, weights: W };

  it("kein Material ist deklariert - alle fallen durch", () => {
    expect(select(MATERIALS, req).ranked).toHaveLength(0);
  });

  it("gibt einen Verfahrenshinweis statt einer leeren Seite", () => {
    const hints = select(MATERIALS, req).processHints;
    expect(hints.some((h) => h.key === "process.foodContact")).toBe(true);
  });

  it("fehlende Deklaration gilt als Durchfall, nicht als 'unbekannt'", () => {
    const v = whyNot(byId("petg")!, req).find((x) => x.constraintId === "foodContact")!;
    expect(v.passed).toBe(false);
    expect(v.dataMissing).toBeFalsy();
  });
});

describe("Szenario: flexibles Bauteil", () => {
  it("nur Elastomere bleiben übrig", () => {
    const surviving = ids(select(MATERIALS, { flexible: true }).ranked);
    expect(surviving.length).toBeGreaterThan(0);
    for (const id of surviving) {
      expect(byId(id)!.identity.polymerClass, id).toBe("elastomer");
    }
    expect(surviving).toContain("tpu-95a");
  });

  it("umgekehrt fliegt der Elastomer bei starrem Bedarf raus", () => {
    expect(ids(select(MATERIALS, { flexible: false }).ranked)).not.toContain("tpu-95a");
  });
});

describe("Szenario: keine gehärtete Düse", () => {
  it("schliesst faserverstärkte Materialien aus", () => {
    const surviving = ids(select(MATERIALS, { hardenedNozzleAvailable: false }).ranked);
    for (const id of ["petg-cf", "pa6-cf", "pet-cf", "asa-cf"]) expect(surviving, id).not.toContain(id);
    expect(surviving).toContain("petg");
  });
});

describe("Szenario: Brandschutz und ESD", () => {
  it("UL94 V-0 erfüllt nur ein ausdrücklich flammgeschützter Werkstoff", () => {
    /* Die Regel gilt unveraendert - nur die Belegform ist seit 2026-08-02 breiter:
       Neben pc-fr, das die Klasse selbst traegt, ueberleben petg und abs-pc ueber eine
       belegte flammgeschuetzte TYPE ihrer Familie (add:north PETG V0, Spectrum PC/ABS
       FR V0). Beides sind ausdruecklich flammgeschuetzte Werkstoffe; die Familie ist
       damit NICHT freigegeben, und die Begruendung muss das Produkt nennen. */
    const r = select(MATERIALS, { flameClass: "V-0" });
    const surviving = ids(r.ranked);

    for (const m of r.ranked) {
      const v = evaluateConstraints(m.material, { flameClass: "V-0" })
        .find((c) => c.constraintId === "flameClass")!;
      expect(["constraint.flame.pass", "constraint.flame.passViaProduct"], m.material.id).toContain(v.key);
      // Wer nur ueber ein Produkt durchkommt, MUSS es benennen.
      if (v.key === "constraint.flame.passViaProduct") {
        expect(String(v.params.product), m.material.id).toMatch(/\S/);
      }
    }

    expect(surviving).toContain("pc-fr");
    // Standardwerkstoffe tragen keine Einstufung - auch nicht die "selbstverlöschenden".
    for (const id of ["pc", "petg-cf", "abs", "asa"]) expect(surviving).not.toContain(id);
  });

  it("der Produktverweis steht auf der Ergebniskarte, nicht nur im Verdict", () => {
    /* Zweimal an einem Tag ist genau das schiefgegangen: Die Engine berechnet einen
       Vorbehalt, die Karte zeigt ihn nicht. Bei "nur diese eine Type erfuellt V-0" waere
       das die gefaehrlichste Verkuerzung, die dieses Werkzeug produzieren kann. */
    const r = select(MATERIALS, { flameClass: "V-0" });
    const viaProduct = r.ranked.filter((x) =>
      evaluateConstraints(x.material, { flameClass: "V-0" })
        .some((c) => c.key === "constraint.flame.passViaProduct"));
    expect(viaProduct.length, "es muss mindestens einen solchen Fall geben").toBeGreaterThan(0);

    for (const rec of viaProduct) {
      const e = rec.explanations.find((x) => x.key === "risk.flameViaProduct");
      expect(e, `${rec.material.id} nennt die Type nicht auf der Karte`).toBeDefined();
      expect(String(e!.params.product)).toMatch(/\S/);
    }
  });

  it("der Produktverweis gibt die Familie nicht frei", () => {
    // PETG als Typ ist nicht V-0 - nur die flammgeschuetzte Type. Wuerde hier eine
    // Klasse am Typ stehen, waere das eine gefaehrliche Falschaussage.
    const petg = byId("petg")!;
    const fr = (petg.compliance as {
      flameRetardancy?: { ul94?: { value?: string }; ul94ViaProduct?: { value?: string; products?: unknown[] } };
    }).flameRetardancy!;
    expect(fr.ul94?.value ?? "not-classified").not.toBe("V-0");
    expect(fr.ul94ViaProduct?.value).toBe("V-0");
    expect(fr.ul94ViaProduct?.products?.length).toBeGreaterThan(0);
  });

  it("eine nur GESCHÄTZTE Brandschutzklasse erfüllt die Anforderung nicht", () => {
    // Regression zu einem Befund aus dem Fillamentum-Import: Hart-PVC gilt in der
    // Literatur als von Haus aus schwer entflammbar, und ein aus der Polymerklasse
    // abgeleitetes "V-0" haette den Filter passiert. Eine Brandschutzklasse ist aber
    // eine Aussage ueber ein geprueftes Bauteil bestimmter Dicke - sie darf nicht aus
    // Lehrbuchwissen entstehen. Der Constraint prueft deshalb die Konfidenz mit.
    const withEstimatedClass = {
      ...MATERIALS[0],
      id: "test-geschaetzt-v0",
      compliance: {
        ...(MATERIALS[0].compliance ?? {}),
        flameRetardancy: {
          ul94: { value: "V-0", source: "estimate_reasoning", confidence: "estimated" },
        },
      },
    } as (typeof MATERIALS)[number];

    const r = select([withEstimatedClass], { flameClass: "V-0" });
    expect(ids(r.ranked)).toEqual([]);

    const why = r.rejected[0]!.failed.find((f) => f.constraintId === "flameClass")!;
    expect(why.key).toBe("constraint.flame.failEstimated");
  });

  it("ESD erfüllt nur ein deklariertes ESD-Compound - Kohlenstofffaser allein zählt nicht", () => {
    const r = select(MATERIALS, { esd: true });
    // Jeder Treffer muss eine deklarierte Einstufung tragen - nicht bloss Kohlenstoff enthalten.
    for (const m of r.ranked) {
      const cls = (m.material.compliance as { esd?: { classification?: { value?: string } } })?.esd?.classification?.value;
      expect(["dissipative", "conductive"], `${m.material.id} ohne ESD-Einstufung`).toContain(cls);
    }
    // Steife ESD-Werkstoffe sind seit Material4Print vorhanden - vorher gab es nur ein Elastomer.
    expect(ids(r.ranked)).toContain("esd-abs");
    expect(ids(r.ranked)).toContain("tpu-esd");
    // PETG-CF enthaelt Kohlenstofffaser, aber keine gemessene Einstufung - bleibt draussen.
    const cf = r.rejected.find((x) => x.material.id === "petg-cf")!;
    expect(cf.failed.some((f) => f.constraintId === "esd")).toBe(true);
  });
});

describe("Szenario: Chemikalienkontakt", () => {
  it("Lauge schliesst Polyester und PC aus, ABS und ASA nicht", () => {
    const surviving = ids(select(MATERIALS, { chemicals: ["chem_dilute_alkali"] }).ranked);
    expect(surviving).not.toContain("petg");
    expect(surviving).not.toContain("pc");
    expect(surviving).toContain("abs");
    expect(surviving).toContain("asa");
  });

  it("Kühlschmierstoff schliesst PETG aus - trotz seiner Beliebtheit als Vorrichtungswerkstoff", () => {
    const surviving = ids(select(MATERIALS, { chemicals: ["chem_coolant_mwf"] }).ranked);
    expect(surviving).not.toContain("petg");
  });

  it("unbekannte Beständigkeit schliesst nicht aus, wird aber als Risiko gemeldet", () => {
    /* Bewusst an ein Medium gehaengt, das in KEINEM Datensatz vorkommt, statt an eine
       Luecke im Bestand. Der frueher benutzte Bremsfluessigkeits-Fall ist weggefallen,
       nachdem die Bestaendigkeit fuer alle Werkstoffe abgeleitet wurde — der Test haette
       also die Datenlage geprueft statt das Verhalten der Engine. */
    const r = select(MATERIALS, { chemicals: ["chem_not_in_any_dataset"], weights: W });
    const any = r.ranked[0];
    expect(any).toBeDefined();
    expect(any.explanations.some((e) => e.key === "risk.constraintUnknown")).toBe(true);
  });

  it("Bremsflüssigkeit trennt jetzt sauber: Polyamide halten, Polyester nicht", () => {
    const surviving = ids(select(MATERIALS, { chemicals: ["chem_brake_fluid"] }).ranked);
    // Glykolether greift Ester an, laesst Polyamide aber unbehelligt.
    for (const id of ["pa6-cf", "pa12", "paht"]) expect(surviving).toContain(id);
    for (const id of ["petg", "pla", "pc"]) expect(surviving).not.toContain(id);
  });
});

describe("Erklärungen", () => {
  it("warnt bei starker Anisotropie", () => {
    const r = select(MATERIALS, { weights: { ...W, strength: 5 } });
    const pa6 = r.ranked.find((x) => x.material.id === "pa6-cf");
    if (pa6) expect(pa6.explanations.some((e) => e.key === "risk.anisotropy")).toBe(true);
  });

  it("weist auf gehärtete Düse und Trocknung hin", () => {
    const r = select(MATERIALS, { weights: W });
    const cf = r.ranked.find((x) => x.material.id === "petg-cf")!;
    expect(cf.explanations.some((e) => e.key === "hint.hardenedNozzle")).toBe(true);
  });

  it("jede Erklärung ist parametrisiert, nie freier Text", () => {
    for (const rec of select(MATERIALS, { weights: W }).ranked) {
      for (const e of rec.explanations) {
        expect(typeof e.key).toBe("string");
        expect(e.key).toMatch(/^[a-z]/);
        expect(e.params).toBeTypeOf("object");
      }
    }
  });

  it("meldet einen hohen Schätzanteil offen", () => {
    const r = select(MATERIALS, { weights: { ...W, paintability: 5, sustainability: 5 } });
    expect(r.ranked.some((x) => x.explanations.some((e) => e.key === "risk.estimatedShare"))).toBe(true);
  });
});

describe("Scoring", () => {
  const table = buildNormalisation(MATERIALS);

  it("Perzentilrang liegt immer zwischen 0 und 1", () => {
    for (const [, vs] of Object.entries(table.values)) {
      for (const v of vs) {
        const p = percentileRank(v, vs);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  it("fehlende Daten werden NICHT als 0 gewertet", () => {
    const tpu = byId("tpu-95a")!;
    const s = scoreMaterial(tpu, { weights: { temperature: 5 } }, table);
    expect(s.criteria.find((c) => c.criterionId === "temperature")!.score).toBeNull();
    expect(s.dataGaps).toContain("temperature");
    expect(s.score).toBe(0); // kein Beitrag, kein erfundener Wert
  });

  it("Gewicht 0 bedeutet kein Einfluss", () => {
    const m = byId("petg")!;
    const a = scoreMaterial(m, { weights: { strength: 3 } }, table).score;
    const b = scoreMaterial(m, { weights: { strength: 3, sustainability: 0 } }, table).score;
    expect(a).toBe(b);
  });

  it("ist deterministisch", () => {
    const a = JSON.stringify(ids(select(MATERIALS, { weights: W }).ranked));
    const b = JSON.stringify(ids(select(MATERIALS, { weights: W }).ranked));
    expect(a).toBe(b);
  });
});

describe("Trade-offs", () => {
  it("jeder Kompromiss nennt mindestens einen Gewinn", () => {
    const r = select(MATERIALS, { weights: { ...W, price: 5, printability: 4 } });
    for (const t of r.tradeOffs) expect(t.gains.length, t.material.id).toBeGreaterThan(0);
  });

  it("Gewinne und Verluste tragen Rohwerte, nicht nur Prozente", () => {
    const r = select(MATERIALS, { weights: { ...W, temperature: 5, price: 4 } });
    const withRaw = r.tradeOffs.flatMap((t) => [...t.gains, ...t.losses]).filter((d) => d.rawTo !== null);
    expect(withRaw.length).toBeGreaterThan(0);
  });

  it("Vergleich zweier Materialien liefert Deltas", () => {
    const r = select(MATERIALS, { weights: W });
    const rows = compare(r.ranked[0], r.ranked[1]);
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.some((x) => x.deltaPct !== null)).toBe(true);
  });

  it("erkennt dominierte Kandidaten", () => {
    const r = select(MATERIALS, { weights: W });
    expect(dominated(r.ranked)).toBeInstanceOf(Set);
  });
});

describe("Verfahrensweiche", () => {
  it("dünne Wand verweist auf SLA/SLS", () => {
    const h = select(MATERIALS, { minWallThicknessMm: 0.5 }).processHints;
    expect(h.find((x) => x.key === "process.thinWall")!.suggestedProcesses).toContain("SLA");
  });

  it("hohe Stückzahl verweist auf Spritzguss", () => {
    const h = select(MATERIALS, { quantity: 5000 }).processHints;
    expect(h.find((x) => x.key === "process.series")!.suggestedProcesses).toContain("Spritzguss");
  });

  it("Dichtheit und Isotropie sind FDM-fremd", () => {
    const h = select(MATERIALS, { requiresWatertight: true, requiresIsotropic: true }).processHints;
    expect(h.map((x) => x.key)).toEqual(expect.arrayContaining(["process.watertight", "process.isotropic"]));
  });

  it("über 200 °C ist Schluss", () => {
    const h = select(MATERIALS, { serviceTemperatureC: 250 }).processHints;
    expect(h.some((x) => x.key === "process.temperature")).toBe(true);
  });
});

describe("Warum nicht X?", () => {
  it("liefert für jedes Material eine vollständige Auswertung", () => {
    const req = { serviceTemperatureC: 90, chamberAvailable: false };
    for (const m of MATERIALS) {
      const v = whyNot(m, req);
      expect(v.length, m.id).toBeGreaterThanOrEqual(2);
      for (const x of v) expect(x.key).toMatch(/^constraint\./);
    }
  });

  it("funktioniert auch für Materialien, die bestanden haben", () => {
    const v = whyNot(byId("pla")!, { serviceTemperatureC: 30 });
    expect(v.every((x) => x.passed)).toBe(true);
  });
});

describe("Datenqualität", () => {
  it("dataCompleteness liegt zwischen 0 und 100", () => {
    for (const m of MATERIALS) {
      const c = dataCompleteness(m);
      expect(c, m.id).toBeGreaterThanOrEqual(0);
      expect(c, m.id).toBeLessThanOrEqual(100);
    }
  });

  it("der Referenzdatensatz PETG-CF ist der vollständigste", () => {
    expect(dataCompleteness(byId("petg-cf")!)).toBeGreaterThanOrEqual(85);
  });

  it("Konfidenzprofil zählt alle vier Stufen", () => {
    const p = confidenceProfile(byId("petg-cf")!);
    expect(p.high + p.medium + p.low + p.estimated).toBeGreaterThan(50);
    expect(p.estimated).toBeGreaterThan(0);
  });
});

describe("Sensitivität", () => {
  it("nennt höchstens drei Wechselkandidaten", () => {
    const r = select(MATERIALS, { weights: W });
    expect(r.sensitivity.length).toBeLessThanOrEqual(3);
    for (const s of r.sensitivity) expect(s.wouldWin).not.toBe(r.ranked[0].material.id);
  });
});

describe("Leeres Anforderungsprofil", () => {
  it("schliesst niemanden aus", () => {
    const r = select(MATERIALS, {});
    expect(r.ranked.length).toBe(MATERIALS.length);
    expect(r.rejected).toHaveLength(0);
  });
});

describe("Unbelegte Constraints ranken nicht nach oben", () => {
  it("TPU ohne Temperaturdaten wird bei 90 °C als 'nicht belegt' geführt", () => {
    const r = select(MATERIALS, { serviceTemperatureC: 90, weights: W });
    const tpu = r.ranked.find((x) => x.material.id === "tpu-95a");
    if (tpu) expect(tpu.unverifiedConstraints).toContain("serviceTemperature");
  });

  it("belegte Kandidaten stehen immer vor unbelegten", () => {
    const r = select(MATERIALS, { serviceTemperatureC: 90, chamberAvailable: true, weights: W });
    const firstUnverified = r.ranked.findIndex((x) => x.unverifiedConstraints.length > 0);
    if (firstUnverified >= 0) {
      for (const rec of r.ranked.slice(firstUnverified)) {
        expect(rec.unverifiedConstraints.length, rec.material.id).toBeGreaterThan(0);
      }
    }
  });

  it("keine negative Reserve-Warnung auf fehlenden Daten", () => {
    for (const rec of select(MATERIALS, { serviceTemperatureC: 90, weights: W }).ranked) {
      for (const e of rec.explanations.filter((x) => x.key === "risk.tightConstraint")) {
        expect(Number(e.params.reserve), rec.material.id).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
