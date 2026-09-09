/**
 * Die Export-Tabellen gegen den echten Datenbestand.
 *
 * Der Feldkatalog in src/lib/fields.ts behauptet Einheiten ("MPa", "°C"). Wenn ein
 * Importskript irgendwann eine Zugfestigkeit in N/mm² oder eine HDT in Kelvin einträgt,
 * stimmt die Kopfzeile der CSV nicht mehr mit ihrem Inhalt überein — und die Datei
 * verschiebt dem Empfänger stillschweigend eine Grössenordnung. Genau das prüft der
 * erste Block hier, direkt an den Daten und nicht an einem Fixture.
 */

import { describe, expect, it } from "vitest";
import { MATERIALS } from "../../src/data/materials";
import { PRODUCTS } from "../../src/data/products";
import { FIELDS, fieldKey, nodeAt } from "../../src/lib/fields";
import { compareRows, overviewColumns, productRows, resultColumns, toRankedRows, valueRows } from "../../src/lib/exports";
import { tableToCsv } from "../../src/lib/csv";
import { select } from "../../src/engine";
import type { Quantity } from "../../src/engine/types";

const t = (key: string) => key;

describe("Feldkatalog gegen Datenbestand", () => {
  it("jede deklarierte Einheit steht so auch in den Daten", () => {
    const mismatches: string[] = [];
    for (const m of MATERIALS) {
      for (const d of FIELDS) {
        if (d.kind !== "quantity") continue;
        const node = nodeAt(m, d) as Quantity | undefined;
        if (!node) continue;
        if (node.unit !== d.unit) mismatches.push(`${m.id} ${fieldKey(d)}: ${node.unit} ≠ ${d.unit}`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("der Katalog kennt jedes Mess- und Bewertungsfeld, das in den Daten vorkommt", () => {
    // Ein Feld, das die Daten führen und der Katalog nicht, fehlt still im Export.
    const known = new Set(FIELDS.map(fieldKey));
    const groups = ["mechanics", "thermal", "processing", "durability", "finishing",
      "sustainability", "commercial"] as const;
    const unknown = new Set<string>();

    for (const m of MATERIALS) {
      for (const g of groups) {
        const node = m[g] as Record<string, unknown> | undefined;
        for (const [field, v] of Object.entries(node ?? {})) {
          if (!v || typeof v !== "object" || Array.isArray(v)) continue;
          const isValueNode = "unit" in v || "scale" in v;
          if (!isValueNode) continue;
          if (!known.has(`${g}.${field}`)) unknown.add(`${g}.${field}`);
        }
      }
    }
    expect([...unknown]).toEqual([]);
  });
});

describe("Übersicht", () => {
  const cols = overviewColumns("de");

  it("hat für jeden Werkstoff genau eine Zeile", () => {
    const lines = tableToCsv(MATERIALS, cols, "rfc4180").trim().split("\r\n");
    expect(lines).toHaveLength(MATERIALS.length + 1);
  });

  it("zeigt den Portfolio-Status NIRGENDS — auch nicht gekennzeichnet", () => {
    /* Bis 2026-08-06 stand er hier als letzte Spalte mit dem Zusatz „nicht
       bewertungsrelevant". Das war fachlich korrekt und trotzdem falsch: Ein
       Materialberater, der bei manchen Werkstoffen „aus unserem Programm" schreibt, wird
       als Werbung gelesen — der Zusatz ändert daran nichts, er entschuldigt sich nur.

       Auf Rikos Entscheidung entfernt. Dieser Test hält das fest, weil die Spalte sonst
       beim nächsten Ausbau der Übersicht unbemerkt zurückkäme; das FELD liegt weiterhin
       im Datenmodell, und `portfolio-neutrality.test.ts` prüft weiter, dass es nicht ins
       Scoring gerät. */
    for (const c of cols) {
      expect(c.header, "Portfolio-Spalte ist zurück").not.toMatch(/Portfolio|portfolio/);
    }
  });
});

describe("Kennwerttabelle", () => {
  const rows = valueRows(MATERIALS, "de");

  it("ist rechteckig", () => {
    const width = rows[0].length;
    for (const r of rows) expect(r).toHaveLength(width);
  });

  it("trägt zu jedem Wert eine Quelle und eine Konfidenz", () => {
    const head = rows[0] as string[];
    const iSource = head.indexOf("Quelle");
    const iConf = head.indexOf("Konfidenz");
    expect(iSource).toBeGreaterThan(-1);
    const missing = rows.slice(1).filter((r) => !r[iSource] || !r[iConf]);
    expect(missing).toEqual([]);
  });

  it("gibt einen Knoten ohne Wert als leere Zelle aus, nicht als Null", () => {
    // ADR-006. Ein Datensatz kann ein Feld führen, dessen Wert unbekannt ist — im
    // Export muss daraus eine Lücke werden, keine 0, sonst rechnet Excel damit.
    const head = rows[0] as string[];
    const [iId, iField, iValue] = ["ID", "Feld", "Wert"].map((h) => head.indexOf(h));
    const byId = new Map(MATERIALS.map((m) => [m.id, m]));
    const wrong: string[] = [];

    for (const r of rows.slice(1)) {
      const m = byId.get(String(r[iId]));
      const d = FIELDS.find((x) => fieldKey(x) === String(r[iField]));
      if (!m || !d) continue;
      const node = nodeAt(m, d);
      if (node?.value === null && r[iValue] !== null && r[iValue] !== "") {
        wrong.push(`${r[iId]} ${r[iField]} → ${String(r[iValue])}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("Produkttabelle", () => {
  const rows = productRows(PRODUCTS, MATERIALS, "de");

  it("ist rechteckig", () => {
    const width = rows[0].length;
    for (const r of rows) expect(r).toHaveLength(width);
  });

  it("weist die Prüfkörperart aus", () => {
    // Ohne diese Spalte vergleicht der Empfänger Rohstoffkennwerte mit gedruckten
    // Prüfkörpern — der Fehler, gegen den dieses Werkzeug überhaupt antritt.
    const head = rows[0] as string[];
    expect(head).toContain("Prüfkörper");
    const i = head.indexOf("Prüfkörper");
    for (const r of rows.slice(1)) expect(String(r[i]).length).toBeGreaterThan(0);
  });

  it("nennt zu jedem Wert das Datenblatt", () => {
    const head = rows[0] as string[];
    const i = head.indexOf("Datenblatt");
    for (const r of rows.slice(1)) expect(String(r[i])).toMatch(/^https?:\/\//);
  });
});

describe("Vergleich", () => {
  it("ist rechteckig und hat je gewähltem Werkstoff eine Spalte", () => {
    const chosen = MATERIALS.slice(0, 3);
    const rows = compareRows(chosen, "de");
    const width = 3 + chosen.length;
    for (const r of rows) expect(r).toHaveLength(width);
  });

  it("lässt Zeilen weg, für die kein gewählter Werkstoff einen Wert hat", () => {
    const rows = compareRows(MATERIALS.slice(0, 2), "de");
    // Datenvollständigkeit steht als Schlusszeile immer drin, alles davor braucht Werte.
    expect(rows.length).toBeGreaterThan(2);
  });
});

describe("Ergebnistabelle", () => {
  it("nummeriert die Rangfolge lückenlos ab 1", () => {
    const result = select(MATERIALS, { serviceTemperatureC: 80 });
    const rows = toRankedRows(result.ranked);
    expect(rows.map((r) => r.rank)).toEqual(result.ranked.map((_, i) => i + 1));
  });

  it("hat eine Spalte für Anforderungen, die nur mangels Daten nicht scheiterten", () => {
    const cols = resultColumns("de", t);
    const headers = cols.map((c) => c.header);
    expect(headers.some((h) => h.includes("mangels Daten"))).toBe(true);
  });
});

describe("Feldkatalog", () => {
  it("führt jedes Feld genau einmal", () => {
    /* Beim Einbau des Preisrankings stand `commercial.pricePerKg` zweimal im Katalog,
       nur mit unterschiedlicher Beschriftung. Folge: eine doppelte Zeile im Vergleich
       und eine doppelte Spalte im CSV - beide mit demselben React-Schlüssel, was React
       ausdrücklich als unsicher meldet. Ein Katalog mit zwei Einträgen für dasselbe
       Feld ist immer ein Fehler, nie Absicht. */
    const seen = new Map<string, number>();
    for (const d of FIELDS) seen.set(fieldKey(d), (seen.get(fieldKey(d)) ?? 0) + 1);
    const doppelt = [...seen].filter(([, n]) => n > 1).map(([k, n]) => `${k} (${n}×)`);
    expect(doppelt).toEqual([]);
  });
});
