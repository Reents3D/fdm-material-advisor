/**
 * Die Belastbarkeitsstufe entscheidet, mit welchen Zahlen dieses Werkzeug arbeitet.
 *
 * Eine Schwelle, die nur in der Oberflaeche existiert, verschiebt sich mit dem naechsten
 * Umbau der Oberflaeche. Sie steht deshalb als reine Funktion da, und hier steht, was sie
 * bedeutet - einschliesslich der Faelle, in denen sie bewusst NICHT greift.
 */

import { describe, expect, it } from "vitest";
import { evidenceGrade, isRobust, tally, verdict } from "../../src/lib/evidence";

describe("Belastbarkeit eines Wertes", () => {
  it("nimmt einen Wert mit Norm und belegter Quelle an", () => {
    expect(evidenceGrade({ confidence: "medium", testStandard: "ISO 527" })).toBe("verified");
    expect(evidenceGrade({ confidence: "high", testStandard: "ISO 178" })).toBe("verified");
  });

  it("weist einen Wert ohne Pruefnorm ab, auch wenn die Quelle belegt ist", () => {
    /* Der Kern der Schwelle: `medium` sagt etwas ueber die QUELLE, nicht darueber, ob
       jemand weiss, wonach gemessen wurde. Ohne Norm ist eine Zahl nicht nachpruefbar. */
    expect(evidenceGrade({ confidence: "medium" })).toBe("weak");
    expect(isRobust(evidenceGrade({ confidence: "medium" }))).toBe(false);
  });

  it("nimmt einen abgeleiteten Wert ohne eigene Norm an", () => {
    /* Der Anisotropiefaktor ist Z-Festigkeit geteilt durch XY-Festigkeit. Die Normen
       stehen an den Operanden, nicht am Quotienten - eine eigene Norm kann er nicht
       haben. Die erste Fassung stufte ihn dauerhaft als `weak` ein und traf damit
       ausgerechnet die Zahl, die dieses Projekt als Alleinstellungsmerkmal fuehrt. */
    expect(evidenceGrade({
      confidence: "medium",
      derivedFrom: ["mechanics.tensileStrengthZ", "mechanics.tensileStrengthXy"],
    })).toBe("verified");
    /* Die Ableitung rettet aber keine zweifelhafte Quelle. */
    expect(evidenceGrade({ confidence: "low", derivedFrom: ["a", "b"] })).toBe("weak");
    /* Und ein leeres derivedFrom ist keine Ableitung. */
    expect(evidenceGrade({ confidence: "medium", derivedFrom: [] })).toBe("weak");
  });

  it("verlangt keine Norm, wo keine moeglich ist", () => {
    /* Ein Preis kann keine ISO-Nummer tragen. Seine Provenienz ist die Haendlerliste mit
       Abrufdatum. Die erste Fassung verlangte trotzdem eine Norm und stufte damit JEDEN
       Preis als `weak` ein - 33 von 41, obwohl die Erhebung ueber drei bis vier Haendler
       laeuft und jedes Einzelangebot in der Quellennotiz steht. Dasselbe Muster wie beim
       abgeleiteten Wert: Die Regel verlangte ein Laborattribut von etwas, das keine
       Laborpruefung ist. */
    expect(evidenceGrade({ confidence: "medium" }, { labMeasurement: false })).toBe("verified");
    /* Die Ausnahme gilt nur fuer die Norm, nicht fuer die Quelle. */
    expect(evidenceGrade({ confidence: "low" }, { labMeasurement: false })).toBe("weak");
    expect(evidenceGrade({ confidence: "estimated" }, { labMeasurement: false })).toBe("editorial");
    /* Und sie ist nicht der Normalfall: ohne Angabe bleibt es bei der Laborpruefung. */
    expect(evidenceGrade({ confidence: "medium" })).toBe("weak");
  });

  it("weist `low` ab, auch mit Norm", () => {
    /* `low` traegt im Bestand die umgerechneten Einheiten, die kopierten Tabellen und
       die widerspruechlichen Normangaben - alles Faelle, in denen die Zahl dasteht,
       aber niemand fuer sie geradestehen kann. */
    expect(evidenceGrade({ confidence: "low", testStandard: "ASTM D638" })).toBe("weak");
  });

  it("fuehrt Schaetzungen als eigene Kategorie, nicht als schwache Messung", () => {
    /* Die Fuenferskalen sind konstruktionsbedingt keine Messungen. Sie mit den
       schwachen Messwerten in einen Topf zu werfen, wuerde beide Aussagen unkenntlich
       machen: Eine fehlende Norm ist ein Maengel, eine Bewertungsskala nicht. */
    expect(evidenceGrade({ confidence: "estimated" })).toBe("editorial");
    expect(evidenceGrade({ confidence: "estimated", testStandard: "ISO 527" })).toBe("editorial");
  });

  it("liefert null, wo gar nichts steht", () => {
    expect(evidenceGrade(null)).toBeNull();
    expect(evidenceGrade(undefined)).toBeNull();
    expect(evidenceGrade({})).toBeNull();
  });

  it("rechnet den Anteil ueber die MESSWERTE, nicht ueber alles", () => {
    /* Der Nenner ist verified + weak. Die Schaetzung zaehlt mit in `total`, aber NICHT
       im Anteil - sonst kaeme jeder Werkstoff auf 10 bis 20 %, weil die Fuenferskalen
       auf der Werkstoffebene die Mehrheit stellen, und die Zahl unterschiede nichts
       mehr. Genau dieser Fehler ist am 2026-08-05 erst am fertig gerenderten Datenblatt
       aufgefallen: "7 von 14 Messwerten (12 %)". */
    const t = tally([
      { confidence: "high", testStandard: "ISO 527" },
      { confidence: "medium", testStandard: "ISO 178" },
      { confidence: "low", testStandard: "ISO 75" },
      { confidence: "estimated" },
      null,
    ]);
    expect(t).toMatchObject({ verified: 2, weak: 1, editorial: 1, total: 4 });
    expect(t.robustShare).toBe(67);
  });

  it("gibt keinen Anteil aus, wo keine Messwerte stehen", () => {
    /* 0 von 0 ist nicht 0 % - ein Datensatz ohne Messwerte ist keine schlechte
       Datenlage, sondern gar keine. Die Oberflaeche muss das unterscheiden koennen. */
    expect(tally([]).robustShare).toBeNull();
    expect(verdict(tally([]))).toBeNull();
    /* Auch ein Datensatz aus lauter Schaetzungen hat keinen Messwert-Anteil. */
    const onlyRatings = tally([{ confidence: "estimated" }, { confidence: "estimated" }]);
    expect(onlyRatings.editorial).toBe(2);
    expect(onlyRatings.robustShare).toBeNull();
  });

  it("stuft die Datengrundlage eines Datensatzes ein", () => {
    const mk = (v: number, w: number) => tally([
      ...Array(v).fill({ confidence: "medium", testStandard: "ISO 527" }),
      ...Array(w).fill({ confidence: "low" }),
    ]);
    expect(verdict(mk(7, 3))).toBe("solid");
    expect(verdict(mk(5, 5))).toBe("mixed");
    expect(verdict(mk(2, 8))).toBe("thin");
  });
});
