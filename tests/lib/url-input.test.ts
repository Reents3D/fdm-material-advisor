/**
 * Die URL ist die einzige Eingabe von aussen — und damit die einzige Angriffsflaeche.
 *
 * Es gibt kein Backend, keine Anmeldung und keinen gespeicherten Zustand, den jemand
 * stehlen koennte. Es gibt aber einen Browser-Tab, den ein geteilter Link zum Stehen
 * bringen kann, und geteilte Links sind ein beworbenes Merkmal dieses Werkzeugs.
 *
 * Gefunden bei einer Sicherheitsdurchsicht am 2026-08-02: Die Schaltflaechen kappten
 * laengst (die Vergleichsauswahl bei fuenf), nur der Parser tat es nicht. Ein
 * `?cmp=pla,pla,pla,...` mit zweitausend Wiederholungen erzeugte in der
 * Vergleichsansicht zweitausend Spalten mal rund sechzig Kennwertzeilen.
 *
 * Diese Datei prueft die Grenze selbst, nicht die Oberflaeche dahinter. Eine Grenze
 * ohne Test ist eine Grenze auf Zuruf.
 */

import { describe, expect, it } from "vitest";
import { stateFromParams } from "../../src/App";
import { CRITERIA } from "../../src/engine/criteria";
import { CHEMICALS } from "../../src/data/chemicals";

const parse = (query: string) => stateFromParams(new URLSearchParams(query));

describe("Eingaben aus der URL", () => {
  it("kappt die Vergleichsliste bei fuenf, egal wie lang der Link ist", () => {
    const angriff = "cmp=" + Array(2000).fill("pla").join(",");
    expect(parse(angriff).compare.length).toBeLessThanOrEqual(5);
  });

  it("entfernt Wiederholungen, bevor es kappt", () => {
    /* Ohne Deduplizierung waere `pla,pla,pla,pla,pla,petg` nach dem Kappen fuenfmal
       PLA und kein PETG - der Nutzer haette also seine Auswahl verloren, nicht nur
       den Angriff. */
    const s = parse("cmp=pla,pla,pla,pla,pla,petg");
    expect(s.compare).toEqual(["pla", "petg"]);
  });

  it("kappt die Medienliste auf die Zahl der bekannten Medien", () => {
    const angriff = "chem=" + Array(5000).fill("aceton").join(",");
    expect(parse(angriff).chemicals.length).toBeLessThanOrEqual(CHEMICALS.length);
  });

  it("uebernimmt nur Gewichte zu bekannten Kriterien", () => {
    const s = parse("wexact=1&w.strength=5&w.gibtEsNicht=5&w.__proto__=5&w.constructor=5");
    expect(Object.keys(s.req.weights ?? {})).toEqual(["strength"]);
  });

  it("laesst Object.prototype unangetastet", () => {
    parse("wexact=1&w.__proto__=5&w.constructor=5&w.prototype=5");
    expect(({} as Record<string, unknown>).strength).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("5");
  });

  it("klemmt Gewichte auf den Reglerbereich 0 bis 5", () => {
    const s = parse("wexact=1&w.strength=99&w.price=-99&w.temperature=2.5");
    expect(s.req.weights!.strength).toBe(5);
    expect(s.req.weights!.price).toBe(0);
    expect(s.req.weights!.temperature).toBe(2.5);
  });

  it("laesst Infinity und NaN nicht als Gewicht durch", () => {
    /* `Number("Infinity")` ist gueltiges JavaScript. Im Scoring wurde daraus
       Infinity/Infinity = NaN, und auf der Ergebniskarte, im Bericht und in der CSV
       stand danach "NaN %". */
    const s = parse("wexact=1&w.strength=Infinity&w.stiffness=-Infinity&w.price=abc");
    for (const id of ["strength", "stiffness", "price"]) {
      expect(Number.isFinite(s.req.weights![id]), id).toBe(true);
    }
  });

  it("kein Gewicht faellt jemals ausserhalb von 0 bis 5", () => {
    const alle = CRITERIA.map((c) => `w.${c.id}=Infinity`).join("&");
    const s = parse(`wexact=1&${alle}`);
    for (const [id, v] of Object.entries(s.req.weights ?? {})) {
      expect(v, id).toBeGreaterThanOrEqual(0);
      expect(v, id).toBeLessThanOrEqual(5);
    }
  });

  it("nimmt eine unbekannte Sprache nicht an", () => {
    expect(parse("lang=%3Cscript%3E").lang).toBe("de");
  });

  it("nimmt die Lastannahme nur in ihren beiden gueltigen Formen an", () => {
    expect(parse("temp=60&load=none").req.thermalLoad).toBe("none");
    expect(parse("temp=60&load=sustained").req.thermalLoad).toBe("sustained");
    expect(parse("temp=60&load=irgendwas").req.thermalLoad).toBeUndefined();
  });
});

describe("Sicherheitsprüfung 2026-08-02", () => {
  /* Drei Befunde einer Prüfung des gesamten Quelltextes. Alle drei haben denselben
     Ursprung: Die Adresszeile ist die einzige Eingabe, die von aussen kommt, und ein
     BÖSARTIGER geteilter Link ist damit der einzige realistische Angriffsweg. */

  it("nimmt nur die vier echten Brandschutzklassen an", () => {
    /* DER ERNSTESTE DER DREI. Vorher stand ein blanker Typ-Cast da. Ein unbekannter
       Wert liefert in der Engine `UL94_ORDER.indexOf(...) === -1`, und die Bedingung
       `have >= want` wird damit für JEDES Material wahr, das irgendeine Klasse trägt —
       auch für ein nur HB-eingestuftes. Ein Link mit `flame=V0` (ohne Bindestrich, auf
       den ersten Blick unauffällig) hätte "erfüllt V0" unter Werkstoffe geschrieben,
       die es nicht erfüllen. In einem Werkzeug für die Brandschutzauswahl ist das der
       gefährlichste denkbare Fehler. */
    for (const gut of ["V-0", "V-1", "V-2", "HB"]) {
      expect(stateFromParams(new URLSearchParams(`flame=${gut}`)).req.flameClass).toBe(gut);
    }
    for (const boese of ["V0", "v-0", "A-1", "__proto__", "", "5VA"]) {
      expect(stateFromParams(new URLSearchParams(`flame=${boese}`)).req.flameClass,
        boese).toBeUndefined();
    }
  });

  it("lässt kein NaN und kein Infinity in die Anforderungen", () => {
    // `Number("Infinity")` ist gültiges JavaScript und stand vorher in Meldungen.
    for (const feld of ["temp", "years", "edge", "qty", "minStrength", "wall", "ra"]) {
      for (const boese of ["Infinity", "-Infinity", "abc", "NaN"]) {
        const req = stateFromParams(new URLSearchParams(`${feld}=${boese}`)).req as
          Record<string, number | undefined>;
        const v = Object.values(req).find((x) => typeof x === "number");
        expect(v === undefined || Number.isFinite(v), `${feld}=${boese}`).toBe(true);
      }
    }
    // Negative Anforderungen gibt es fachlich nicht.
    expect(stateFromParams(new URLSearchParams("temp=-40")).req.serviceTemperatureC).toBe(0);
  });

  it("nimmt nur Medien an, die es im Katalog gibt", () => {
    const echt = CHEMICALS[0].id;
    expect(stateFromParams(new URLSearchParams(`chem=${echt}`)).chemicals).toEqual([echt]);
    // Ein erfundener Name landete vorher unverändert in einer Begründungszeile.
    expect(stateFromParams(new URLSearchParams("chem=frei-erfunden,__proto__")).chemicals)
      .toEqual([]);
  });
});
