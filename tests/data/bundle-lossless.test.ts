/**
 * Die erzeugten Bündel müssen den kanonischen Bestand vollständig enthalten.
 *
 * WARUM DAS EIN EIGENER TEST IST
 * `src/data/generated/*.json` entsteht aus `data/materials/*.json` und
 * `data/products/*.json` in zwei Schritten, die beide Daten anfassen: der Trennung in
 * Kern und Notizen (ADR-039) und der Textabelle (ADR-041). Beide sind reine
 * Umformungen — aber genau bei reinen Umformungen fällt ein Verlust nicht auf. Die
 * Dateien bleiben schemakonform, die Zahlen stimmen, nur ein Zweig fehlt.
 *
 * Der Bestandsuntergrenzen-Test zählt die KANONISCHEN Dateien und merkt davon nichts.
 * Dieser hier vergleicht, was ausgeliefert wird, mit dem, was dasteht.
 *
 * VERGLICHEN WIRD SCHLÜSSELUNABHÄNGIG
 * Die Reihenfolge der Schlüssel ändert sich bei der Trennung zwangsläufig: `note` wird
 * herausgezogen und beim Zusammenführen hinten wieder angehängt. Ein Vergleich der
 * JSON-Zeichenketten wäre deshalb rot, ohne dass etwas fehlt.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expand, type I18nBlock } from "../../src/data/intern";

const ROOT = path.resolve(__dirname, "../..");

const load = (dir: string) =>
  readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(".json"))
    .flatMap((f) => {
      const r = JSON.parse(readFileSync(path.join(ROOT, dir, f), "utf8"));
      return Array.isArray(r) ? r : [r];
    });

const generated = (name: string) =>
  JSON.parse(readFileSync(path.join(ROOT, "src/data/generated", name), "utf8")) as
    { t: I18nBlock[]; d: unknown };

/** Schlüssel rekursiv sortieren, damit die Reihenfolge nicht mitverglichen wird. */
function sortKeys(n: unknown): unknown {
  if (n === null || typeof n !== "object") return n;
  if (Array.isArray(n)) return n.map(sortKeys);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(n as Record<string, unknown>).sort()) {
    out[k] = sortKeys((n as Record<string, unknown>)[k]);
  }
  return out;
}

/** Kern und Notizen wieder zusammenführen — dieselbe Regel wie `material-notes.ts`. */
function merge(core: unknown, notes: unknown): unknown {
  if (notes === null || notes === undefined) return core;
  if (Array.isArray(core)) {
    const n = notes as unknown[];
    return core.map((v, i) => merge(v, n?.[i]));
  }
  if (core === null || typeof core !== "object") return core;
  const out: Record<string, unknown> = { ...(core as Record<string, unknown>) };
  for (const [k, v] of Object.entries(notes as Record<string, unknown>)) {
    out[k] = k === "note" || k === "question" ? v : merge(out[k], v);
  }
  return out;
}

describe("Die Bündel verlieren nichts", () => {
  it("Werkstoffe: Kern plus Notizen ergibt den kanonischen Bestand", () => {
    const canonical = load("data/materials").sort((a, b) => a.id.localeCompare(b.id));
    const core = expand<Record<string, unknown>[]>(generated("materials.json"))
      .slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const notes = expand<Record<string, unknown>>(generated("material-notes.json"));

    expect(core.length).toBe(canonical.length);
    for (const [i, want] of canonical.entries()) {
      const got = merge(core[i], notes[want.id as string]);
      expect(sortKeys(got), `${want.id} weicht ab`).toEqual(sortKeys(want));
    }
  });

  it("Produkte: das Bündel ist der kanonische Bestand", () => {
    const canonical = load("data/products").sort((a, b) => a.id.localeCompare(b.id));
    const bundled = expand<Record<string, unknown>[]>(generated("products.json"))
      .slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));

    expect(bundled.length).toBe(canonical.length);
    for (const [i, want] of canonical.entries()) {
      expect(sortKeys(bundled[i]), `${want.id} weicht ab`).toEqual(sortKeys(want));
    }
  });

  it("die Textabelle wird tatsächlich genutzt — sonst wäre sie nur Aufwand", () => {
    /* Gegenprobe: Wenn `interner()` einmal nichts mehr erkennt (etwa weil das Schema
       `I18nText` um ein Feld erweitert wird und die Bedingung `Object.keys().length <= 3`
       nicht mehr greift), bliebe alles korrekt — nur die Ersparnis wäre still weg. */
    for (const name of ["materials.json", "material-notes.json", "products.json"]) {
      const b = generated(name);
      expect(b.t.length, `${name} hat keine Texte in der Tabelle`).toBeGreaterThan(50);
      const refs = JSON.stringify(b.d).match(/\{"\$":\d+\}/g)?.length ?? 0;
      expect(refs, `${name} nutzt die Tabelle nicht`).toBeGreaterThan(b.t.length);
    }
  });
});
