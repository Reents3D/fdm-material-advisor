/**
 * Fehlende Angaben duerfen nirgends als 0 auftauchen — auch nicht in einer Begruendung.
 *
 * Gefunden beim Bau des PDF-Berichts: dort stand schwarz auf weiss
 * "konservative Dauereinsatzgrenze nur 40 °C (HDT-B 0 °C)" — fuer Werkstoffe, zu denen
 * schlicht keine HDT-B hinterlegt ist. Die Zahl war erfunden, und sie liess den
 * Werkstoff schlechter aussehen, als die Datenlage hergibt. Genau das verbietet ADR-006.
 * Ein Bericht, der beim Kunden in der Akte landet, macht so einen Fehler dauerhaft.
 */

import { describe, expect, it } from "vitest";
import { MATERIALS } from "../../src/data/materials";
import { whyNot } from "../../src/engine";
import { translate, LANGS } from "../../src/i18n";

describe("Keine erfundene Null in Begruendungen", () => {
  it("nennt HDT-B nur, wenn ein HDT-B-Wert existiert", () => {
    const offenders: string[] = [];

    for (const m of MATERIALS) {
      const hasHdtB = m.thermal?.hdtB?.value !== undefined && m.thermal?.hdtB?.value !== null;
      // Eine Temperaturanforderung, die jeder Werkstoff mal reissen kann.
      for (const v of whyNot(m, { serviceTemperatureC: 200 })) {
        for (const lang of LANGS) {
          const line = translate(lang, v.key, v.params);
          if (!hasHdtB && /HDT-B/.test(line)) offenders.push(`${m.id} [${lang}]: ${line}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("setzt in keiner Temperaturmeldung eine 0 fuer einen fehlenden Wert ein", () => {
    const offenders: string[] = [];

    for (const m of MATERIALS) {
      for (const v of whyNot(m, { serviceTemperatureC: 200 })) {
        if (v.constraintId !== "serviceTemperature") continue;
        for (const lang of LANGS) {
          const line = translate(lang, v.key, v.params);
          if (/\b0 °C/.test(line)) offenders.push(`${m.id} [${lang}]: ${line}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("laesst keinen Platzhalter unaufgeloest stehen", () => {
    // Ein fehlender Uebersetzungsschluessel faellt sonst erst im gedruckten PDF auf.
    const offenders: string[] = [];
    for (const m of MATERIALS) {
      for (const v of whyNot(m, { serviceTemperatureC: 200, outdoorYears: 5, maxEdgeMm: 2000 })) {
        for (const lang of LANGS) {
          const line = translate(lang, v.key, v.params);
          if (/\{[a-zA-Z]+\}/.test(line) || line === v.key) offenders.push(`${m.id} [${lang}]: ${line}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
