/**
 * CSV-Serialisierung.
 *
 * Der Grund für eigene Tests: eine CSV-Datei verlässt das Werkzeug und wird woanders
 * geöffnet — in Excel, in pandas, in einem ERP. Ein falsch gesetztes Anführungszeichen
 * fällt hier nicht auf, sondern beim Empfänger, und dann ist die Zahl still verschoben.
 */

import { describe, expect, test } from "vitest";
import { toCsv, tableToCsv, type Column } from "../../src/lib/csv.ts";

describe("toCsv — Dialekte", () => {
  const rows = [["Material", "Zug"], ["PLA", 31.5]];

  test("excel-de trennt mit Semikolon und schreibt Dezimalkomma", () => {
    const out = toCsv(rows, "excel-de");
    expect(out).toContain("Material;Zug");
    expect(out).toContain("PLA;31,5");
  });

  test("rfc4180 trennt mit Komma und schreibt Dezimalpunkt", () => {
    const out = toCsv(rows, "rfc4180");
    expect(out).toContain("Material,Zug");
    expect(out).toContain("PLA,31.5");
  });

  test("excel-de stellt ein BOM voran, rfc4180 nicht", () => {
    // Ohne BOM zeigt Excel unter Windows aus "Prüfkörper" ein "PrÃ¼fkÃ¶rper".
    expect(toCsv(rows, "excel-de").charCodeAt(0)).toBe(0xfeff);
    expect(toCsv(rows, "rfc4180").charCodeAt(0)).not.toBe(0xfeff);
  });

  test("Zeilen enden CRLF", () => {
    expect(toCsv(rows, "rfc4180")).toBe("Material,Zug\r\nPLA,31.5\r\n");
  });
});

describe("toCsv — Maskierung", () => {
  test("maskiert Trennzeichen, Anführungszeichen und Zeilenumbrüche", () => {
    const out = toCsv([["a;b", 'sagt "hallo"', "Zeile1\nZeile2"]], "excel-de");
    expect(out).toContain('"a;b"');
    expect(out).toContain('"sagt ""hallo"""');
    expect(out).toContain('"Zeile1\nZeile2"');
  });

  test("erhält führende und schließende Leerzeichen durch Quoting", () => {
    expect(toCsv([[" links"]], "rfc4180")).toBe('" links"\r\n');
  });

  test("null und undefined werden zur leeren Zelle, nicht zu 0", () => {
    // ADR-006: eine fehlende Angabe ist keine Null. Das muss auch im Export gelten.
    expect(toCsv([[null, undefined, 0]], "rfc4180")).toBe(",,0\r\n");
  });

  test("nicht endliche Zahlen werden zur leeren Zelle", () => {
    expect(toCsv([[NaN, Infinity]], "rfc4180")).toBe(",\r\n");
  });
});

describe("toCsv — Formel-Injektion", () => {
  // Eine Zelle, die mit = + - @ beginnt, führt Excel als Formel aus. Das ist der
  // klassische CSV-Injection-Pfad und trifft hier eine Datei, die wir verteilen.
  test("entschärft Formeln", () => {
    expect(toCsv([["=SUM(A1:A9)"]], "rfc4180")).toBe("'=SUM(A1:A9)\r\n");
    expect(toCsv([["@import"]], "rfc4180")).toBe("'@import\r\n");
  });

  test("entschärft Telefonnummern, die mit Pluszeichen beginnen", () => {
    expect(toCsv([["+49 4103 928272-0"]], "rfc4180")).toBe("'+49 4103 928272-0\r\n");
  });

  test("lässt echte negative Zahlen unangetastet", () => {
    expect(toCsv([[-5, "-5", "-0.4"]], "rfc4180")).toBe("-5,-5,-0.4\r\n");
    expect(toCsv([[-0.4]], "excel-de")).toBe("﻿-0,4\r\n");
  });

  test("lässt den Gedankenstrich als Platzhalter unangetastet", () => {
    expect(toCsv([["–"]], "rfc4180")).toBe("–\r\n");
  });
});

describe("tableToCsv", () => {
  interface Row { name: string; mpa: number | null }
  const cols: Column<Row>[] = [
    { header: "Material", cell: (r) => r.name },
    { header: "Zug", cell: (r) => r.mpa },
  ];

  test("schreibt die Kopfzeile aus den Spalten", () => {
    expect(tableToCsv([], cols, "rfc4180")).toBe("Material,Zug\r\n");
  });

  test("jede Zeile hat so viele Zellen wie es Spalten gibt", () => {
    const out = tableToCsv([{ name: "PLA", mpa: null }], cols, "rfc4180");
    const lines = out.trim().split("\r\n");
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(line.split(",")).toHaveLength(cols.length);
  });
});
