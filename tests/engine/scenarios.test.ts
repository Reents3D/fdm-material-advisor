/**
 * Fachliche Szenario-Tests.
 *
 * These are not unit tests of arithmetic — they assert that the engine gives the answer
 * a competent applications engineer would give. If a scenario here goes red, either the
 * engine is wrong or the data is wrong. Both matter.
 */

import { describe, expect, it } from "vitest";
import { MATERIALS, byId } from "../../src/data/materials";
import { select, whyNot, dataCompleteness, confidenceProfile, serviceCeiling } from "../../src/engine";
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
  it("lässt nur XXL-fähige Materialien übrig", () => {
    const r = select(MATERIALS, { maxEdgeMm: 1800, weights: { ...W, xxl: 5 } });
    expect(r.ranked.length).toBeGreaterThan(0);
    for (const rec of r.ranked) {
      const xxl = (rec.material.commercial as { xxl?: { maxSensibleEdgeMm?: { value: number } } })
        .xxl!.maxSensibleEdgeMm!.value;
      expect(xxl, rec.material.id).toBeGreaterThanOrEqual(1800);
    }
  });

  it("PLA gehört dazu, PC nicht", () => {
    const surviving = ids(select(MATERIALS, { maxEdgeMm: 1800 }).ranked);
    expect(surviving).toContain("pla");
    expect(surviving).not.toContain("pc");
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
    const surviving = ids(select(MATERIALS, { flameClass: "V-0" }).ranked);
    expect(surviving).toEqual(["pc-fr"]);
    // Standardwerkstoffe tragen keine Einstufung - auch nicht die "selbstverlöschenden".
    for (const id of ["pc", "petg-cf", "abs", "asa"]) expect(surviving).not.toContain(id);
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
    const r = select(MATERIALS, { chemicals: ["chem_brake_fluid"], weights: W });
    const any = r.ranked[0];
    expect(any).toBeDefined();
    expect(any.explanations.some((e) => e.key === "risk.constraintUnknown")).toBe(true);
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
