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
import { translate } from "../../src/i18n";
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

  it("wenn Witterung dominiert, stehen die witterungsfestesten Werkstoffe vorn", () => {
    /* Hier stand bis 2026-08-06 die Forderung, die ersten drei Plaetze muessten alle mit
       "asa" beginnen. Am 2026-08-06 belegte PMMA den ersten Platz, und der Test wurde rot.
       Nachgesehen: PMMA traegt UV 5 und Witterungsbestaendigkeit 5, genau wie die
       ASA-Familie - fuer Aussenverglasung ist Acrylglas der Standardwerkstoff. Es gewann
       ueber einen Gleichstand, nachdem die erweiterte Preiserhebung ihm einen erhobenen
       statt eines geschaetzten Preises gab.

       Damit war die Namensliste falsch, nicht das Ergebnis - derselbe Fehler wie im Test
       daruber, wo eine feste Liste schon einmal durch die Regel ersetzt werden musste,
       und aus genau demselben Anlass. Eine Rangfolge nach Namen zu pruefen heisst, den
       Datenstand einzufrieren; geprueft wird deshalb die EIGENSCHAFT, um die es geht. */
    const r = select(MATERIALS, {
      outdoorYears: 2,
      weights: { outdoor: 5, temperature: 1, price: 1, printability: 1 },
    });
    for (const top of r.ranked.slice(0, 3)) {
      const w = (top.material.durability as { weatherResistance?: { value?: number } })
        ?.weatherResistance?.value;
      expect(w ?? 0, `${top.material.id} steht vorn, ist aber nicht witterungsfest`).toBe(5);
    }
    /* Und die ASA-Familie muss weiterhin dabei sein - sonst hat die Gewichtung nicht
       gegriffen, sondern etwas anderes entschieden. */
    expect(ids(r.ranked).slice(0, 3).some((id) => id.startsWith("asa"))).toBe(true);
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
       Dauergebrauchstemperatur. Gemessen sind bei PLA aber 55 °C HDT-B.
       Fuer ein unbelastetes Messemodell traegt das. Seither gilt: Nur ein belegter
       Wert darf ausschliessen, die Schaetzung warnt.

       Die Zahlen sind am 2026-08-07 gewandert (HDT-B 57 -> 55, Schaetzung 40 -> 35), weil
       der Werkstoffwert seither der Median von 43 Blaettern ist statt Bambus Einzelwert
       (ADR-042) und die konservative Empfehlung auf dem NIEDRIGSTEN Blatt steht. Der Fall,
       den dieser Test haelt, ist derselbe geblieben: 50 °C liegt zwischen beiden Zahlen. */
    const pla = byId("pla")!;
    expect(pla.thermal!.recommendedMaxServiceTemperature!.confidence).toBe("estimated");
    expect(pla.thermal!.hdtB!.confidence).not.toBe("estimated");

    // 50 °C: Schaetzung (35) reisst, Datenblatt (55) traegt -> drin, mit Warnung.
    const tight = evaluateConstraints(pla, { serviceTemperatureC: 50 })
      .find((c) => c.constraintId === "serviceTemperature")!;
    expect(tight.passed).toBe(true);
    expect(tight.key).toBe("constraint.temperature.tight");
    expect(tight.params.documented).toBe(55);

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

describe("Die Temperaturgrenze folgt der Last, nicht dem Polymer", () => {
  /* Der Befund aus der Werkstatt, wörtlich: "Ich verstehe immer noch nicht, warum wir bei
     PETG eine Dauereinsatzgrenze von 55 Grad festlegen. Muss da die Grenze rein, weil wenn
     es temperaturabhängig wird, würden wir ja die Wandstärke / Infill auch nach oben fahren
     um länger standzuhalten."

     Der Einwand ist physikalisch richtig. Was einen Thermoplast unterhalb des Glasübergangs
     begrenzt, ist Kriechen unter DAUERNDER Spannung — und die Spannung senkt man mit
     Querschnitt. Die 55 °C sind Tg minus 12 K und damit eine Zahl für ein belastetes
     Bauteil; in den Daten standen sie trotzdem als "unbelastet". Seither fragt der
     Assistent nach der Last, und die Antwort entscheidet, welche Zahl das Urteil trägt. */
  const petg = () => byId("petg")!;
  const tempVerdict = (m: Parameters<typeof evaluateConstraints>[0], req: Parameters<typeof evaluateConstraints>[1]) =>
    evaluateConstraints(m, req).find((c) => c.constraintId === "serviceTemperature")!;

  it("unbelastet trägt der gemessene Wert — ohne Vorbehalt", () => {
    const v = tempVerdict(petg(), { serviceTemperatureC: 60, thermalLoad: "none" });
    expect(v.passed).toBe(true);
    expect(v.key).toBe("constraint.temperature.passUnloaded");
    expect(v.params.documented).toBe(69.5); // HDT-B, Median aus 12 Blaettern (ADR-042)
  });

  it("unter Dauerlast bleibt der Vorbehalt — und nennt den konstruktiven Ausweg", () => {
    const v = tempVerdict(petg(), { serviceTemperatureC: 60, thermalLoad: "sustained" });
    expect(v.passed).toBe(true); // eine Schätzung stuft ab, sie schliesst nicht aus (ADR-018)
    expect(v.key).toBe("constraint.temperature.tightLoaded");
    for (const lang of ["de", "en"] as const) {
      expect(translate(lang, v.key, v.params)).toMatch(/Wand|wall/i);
    }
  });

  it("ohne Angabe zur Last bleibt es beim vorsichtigen Verhalten von vorher", () => {
    const v = tempVerdict(petg(), { serviceTemperatureC: 60 });
    expect(v.key).toBe("constraint.temperature.tight");
  });

  it("„unbelastet\" hebt keine Grenze auf, die auch gemessen nicht trägt", () => {
    const v = tempVerdict(petg(), { serviceTemperatureC: 90, thermalLoad: "none" });
    expect(v.passed).toBe(false);
  });

  it("eine zusätzliche Angabe darf nie ein Ergebnis verschlechtern", () => {
    /* PC führt HDT-A und HDT-B vertauscht: belegt sind nur 112 °C, die konservative
       Empfehlung liegt bei 135 °C. Ohne Schutz hätte ausgerechnet die Angabe
       "unbelastet" den Werkstoff bei 120 °C ausgeschlossen, den "keine Angabe"
       durchgelassen hat. Wer mehr sagt, darf nicht schlechter dastehen. */
    for (const m of MATERIALS) {
      for (const temp of [40, 55, 60, 70, 90, 120, 150]) {
        const vague = tempVerdict(m, { serviceTemperatureC: temp });
        const unloaded = tempVerdict(m, { serviceTemperatureC: temp, thermalLoad: "none" });
        if (vague.passed) expect(unloaded.passed, `${m.id} @ ${temp} °C`).toBe(true);
      }
    }
  });

  it("die Frage nach der Last ändert wirklich etwas — sonst wäre sie Zierde", () => {
    /* Wenn keine Antwort je ein Urteil verschöbe, hätten wir dem Assistenten einen
       Schritt hinzugefügt, der nichts tut. Gezählt wird, bei wie vielen Werkstoffen
       der Vorbehalt bei 60 °C durch die Angabe "unbelastet" verschwindet. */
    const lifted = MATERIALS.filter((m) => {
      const vague = tempVerdict(m, { serviceTemperatureC: 60 });
      const unloaded = tempVerdict(m, { serviceTemperatureC: 60, thermalLoad: "none" });
      return vague.key === "constraint.temperature.tight"
        && unloaded.key === "constraint.temperature.passUnloaded";
    });
    expect(lifted.map((m) => m.id)).toContain("petg");
    expect(lifted.length).toBeGreaterThanOrEqual(3);
  });

  it("kein Werkstoff kommt über eine unbelegte Lastannahme in die Liste", () => {
    // "unbelastet" darf nur den GEMESSENEN Wert freigeben, nie einen erfundenen.
    for (const m of MATERIALS) {
      const v = tempVerdict(m, { serviceTemperatureC: 60, thermalLoad: "none" });
      if (v.key !== "constraint.temperature.passUnloaded") continue;
      const documented = v.params.documented as number;
      const measured = [m.thermal?.hdtB?.value, m.thermal?.hdtA?.value,
        m.thermal?.vicatB50?.value, m.thermal?.recommendedMaxServiceTemperature?.value];
      expect(measured, m.id).toContain(documented);
    }
  });
});

describe("Wissenslücken dürfen nicht belohnen", () => {
  /* Der Befund: Bei der Chemiewanne (Chemie 5, Steifigkeit 3) gewann OBC mit 68 gegen
     PP mit 61. PP hat 1400 MPa E-Modul und bekam dafuer 6 von 100 Punkten. OBC hatte gar
     keinen E-Modul hinterlegt - obwohl es mit 244 MPa Biegemodul noch WEICHER ist. Der
     gewichtete Mittelwert lief nur ueber Kriterien MIT Daten, die fehlende Zahl war
     damit ein Freifahrtschein. */
  /* Der Preis stand hier urspruenglich mit Gewicht 3 dabei und hat den Test am
     2026-08-06 zu Fall gebracht - aber aus einem Grund, der mit dem geprueften Prinzip
     nichts zu tun hat: PP bekam durch die erweiterte Preiserhebung einen ECHTEN Preis
     (73,32 €/kg, aus einem einzigen 0,6-kg-Angebot bei Fillamentum), waehrend OBC
     weiterhin auf einer SCHAETZUNG von 67,50 sitzt. Der geschaetzte Preis schlaegt den
     erhobenen, PP faellt hinter OBC, und die Behauptung "PP muss vor OBC liegen" stimmt
     nicht mehr.

     Die Behauptung war aber nie das Prinzip, sondern eine Folge davon unter einem
     bestimmten Datenstand. Geprueft werden soll, dass eine LUECKE bei der Steifigkeit
     kein Vorteil ist - und dazu gehoert der Preis nicht in die Gewichtung. Er ist hier
     herausgenommen, damit der Test misst, was in seiner Ueberschrift steht.

     Der Befund dahinter ist am 2026-08-06 nachgemessen worden (ADR-040) - und die Haelfte
     davon war falsch. Von 35 ersetzten Schaetzpreisen waren 24 zu TEUER; Schaetzungen
     verschaffen hier keinen Vorteil. Zu guenstig ist systematisch der EINZELFUND: 15
     Werkstoffe, die von einem auf mehrere Haendler wuchsen, wurden im Mittel 6,6
     Rangpunkte teurer. PPs 73,32 € aus einem 0,6-kg-Angebot ist also die schwaechere
     Zahl, nicht OBCs Schaetzung - eine Regel "Erhebung schlaegt Schaetzung" haette
     genau das Falsche bevorzugt. Die Gewichtung ohne Preis bleibt deshalb bestehen.

     Die Gewichtung OHNE Preis gilt nur fuer den Prinzipientest; der Abdeckungstest
     darunter misst etwas anderes und behaelt die urspruengliche. */
  const req = { chemicals: ["chem_dilute_alkali"], serviceTemperatureC: 60,
    weights: { chemical: 5, stiffness: 3, price: 3, printability: 3 } };
  const reqOhnePreis = { ...req, weights: { chemical: 5, stiffness: 3, printability: 3 } };

  it("ein Werkstoff ohne Daten zum gewichteten Kriterium schlägt keinen mit schlechten Daten", () => {
    const r = select(MATERIALS, reqOhnePreis);
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
    /* Geprueft wird die REGEL, nicht eine Namensliste.
       Die erste Fassung klebte an "Sieger pps-cf, pragmatisch petg, Preisverhaeltnis
       unter 0,3". Alle drei Zahlen stammten aus der Zeit, als die Preise GESCHAETZT
       waren - PPS-CF stand mit 180 statt der erhobenen 157 €/kg da. Als die Erhebung
       kam und vier Werkstofftypen dazu, wanderte der Sieger zu PAHT-CF und der
       pragmatische Ausweg zu PLA-Tough. Der Test ging rot, obwohl die Engine besser
       geworden war - ein Test, der bei besseren Daten bricht, prueft die Daten und
       nicht das Verhalten. */
    const r = select(MATERIALS, messmittel);
    const p = r.pragmatic;
    expect(p).not.toBeNull();

    // 1. Deutlich guenstiger als der Sieger - das ist der ganze Punkt.
    expect(p!.priceRatio).not.toBeNull();
    expect(p!.priceRatio!).toBeLessThan(0.7);

    // 2. Und deutlich SCHWAECHER als der Sieger. Waere er das nicht, haette ihn schon
    //    die Kompromissansicht gefunden und dieser Slot waere ueberfluessig.
    expect(p!.relativeScore).toBeLessThan(0.8);

    // 3. Er steht nicht selbst an der Spitze.
    expect(p!.material.id).not.toBe(r.ranked[0].material.id);
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
       damit NICHT freigegeben, und die Begruendung muss das Produkt nennen.

       Seit dem FormFutura-Import (2026-08-04) kommen asa und paht dazu: ApolloX Flame
       Retardant und LUVOCOM 3F PAHT KK 50056 BK FR. Dass `asa` hier nicht mehr in der
       Ausschlussliste steht, ist keine gelockerte Erwartung, sondern eine geaenderte
       Tatsache - fuer ASA ist jetzt eine V-0-Type belegt, vorher war keine erfasst.
       Die Mechanik prueft die Schleife darunter unveraendert: Wer nur ueber ein Produkt
       durchkommt, MUSS es benennen. */
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
    // asa fehlt hier bewusst: fuer ASA ist seit 2026-08-04 eine V-0-Type belegt.
    for (const id of ["pc", "petg-cf", "abs", "pla"]) expect(surviving).not.toContain(id);
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
    /* Stand bis 2026-08-07 auf `tpu-95a`. Der bekam beim Abgleich gegen die Produktblaetter
       eine HDT-B aus drei Blaettern (ADR-042) und taugt seither nicht mehr als Beispiel fuer
       eine Luecke - der Test wurde gruen, weil die Daten besser wurden, nicht weil die Regel
       noch geprueft wurde. `tpu-98a` fuehrt weiterhin keinen einzigen Temperaturkennwert;
       kein Hersteller veroeffentlicht fuer ein Shore-98A-Elastomer eine Formbestaendigkeit. */
    const tpu = byId("tpu-98a")!;
    expect(tpu.thermal?.hdtA?.value ?? tpu.thermal?.hdtB?.value ?? null).toBeNull();
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
