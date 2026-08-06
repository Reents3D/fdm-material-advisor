/**
 * Die Notiztexte der Werkstoffe — nachgeladen, nicht im Erstaufruf.
 *
 * WARUM GETRENNT
 * `note` und `question` machen 48 % der Werkstoffrohdaten aus und kosten 105 kB gzip im
 * Erstaufruf-Bündel. Die Engine liest keine davon; sie rechnet mit Zahlen. Gelesen werden
 * sie von der Datenblattansicht, der Brandschutzansicht, der Chemikalienmatrix und dem
 * CSV-Export — alles Ziele, die der Besucher ansteuert, keine, die er beim Start sieht.
 *
 * WARUM DIESELBE VERSCHACHTELUNG UND KEINE PFADLISTE
 * `material-notes.json` spiegelt den Baum des Werkstoffs und trägt an jeder Stelle NUR die
 * Notiz. Das Zusammenführen ist deshalb ein simples Tiefen-Merge und kein Geflecht aus
 * Pfadzeichenketten, das bei jeder Schemaänderung nachgezogen werden müsste. Die Ansichten
 * lesen danach wieder `v.note` wie vorher — sie merken von der Trennung nichts.
 *
 * WARUM ZUSAMMENFUEHREN UND NICHT MUTIEREN
 * Naheliegend wäre, die Notizen nach dem Laden in die vorhandenen Objekte zu schreiben.
 * Das wäre billiger und verstößt gegen die Immutabilitätsregel des Projekts: Ein geteiltes
 * Objekt, das sich später ändert, macht jeden `useMemo` über den Werkstoffen unzuverlässig.
 * Stattdessen entsteht eine Kopie, und React rendert sie neu, wenn sie da ist.
 *
 * WAS PASSIERT, SOLANGE NICHTS DA IST
 * Die Ansicht rendert ohne Notizen. Das ist kein Fehlerzustand, sondern ein kurzer: Werte,
 * Normen und Konfidenzen stehen sofort, die Erläuterung kommt Sekundenbruchteile später
 * nach. Ein Ladebalken dafür wäre unruhiger als das Nachwachsen des Textes.
 */

import { useEffect, useState } from "react";
import type { Material } from "../engine/types";

/** Spiegelt den Werkstoffbaum, trägt aber nur `note` und `question`. */
export type NoteTree = Record<string, unknown>;

let cache: NoteTree | null = null;
let pending: Promise<NoteTree> | null = null;

/** Lädt die Notizen einmal und merkt sie sich. Mehrfachaufrufe teilen dieselbe Zusage. */
export function loadMaterialNotes(): Promise<NoteTree> {
  if (cache) return Promise.resolve(cache);
  pending ??= import("./generated/material-notes.json").then((mod) => {
    cache = mod.default as NoteTree;
    return cache;
  });
  return pending;
}

/** Für Aufrufer, die synchron sind und nur nutzen wollen, was schon da ist. */
export const notesIfLoaded = (): NoteTree | null => cache;

const isNoteKey = (k: string) => k === "note" || k === "question";

/**
 * Tiefen-Merge: `core` bleibt unberührt, das Ergebnis ist eine neue Struktur.
 *
 * Arrays werden nach Position zusammengeführt — `chemicalResistance[7].note` muss auf
 * denselben Eintrag treffen. Positionen ohne Notiz stehen im Notizbaum als `null`.
 */
function mergeNotes<T>(core: T, notes: unknown): T {
  if (notes === null || notes === undefined) return core;
  if (Array.isArray(core)) {
    const src = Array.isArray(notes) ? notes : [];
    return core.map((item, i) => mergeNotes(item, src[i])) as unknown as T;
  }
  if (core && typeof core === "object") {
    const out: Record<string, unknown> = { ...(core as Record<string, unknown>) };
    for (const [k, v] of Object.entries(notes as Record<string, unknown>)) {
      out[k] = isNoteKey(k) ? v : mergeNotes((core as Record<string, unknown>)[k], v);
    }
    return out as T;
  }
  return core;
}

/** Ein Werkstoff mit seinen Notizen. Ohne geladene Notizen unverändert zurück. */
export function withNotes(m: Material, tree: NoteTree | null): Material {
  if (!tree) return m;
  return mergeNotes(m, tree[m.id]);
}

/**
 * Stösst das Nachladen an und liefert den Baum, sobald er da ist.
 *
 * Der Abbruchschalter ist kein Zierrat: Wer die Datenblattansicht schneller wieder
 * verlässt, als das Bündel geladen ist, bekäme sonst ein `setState` auf einer abgeräumten
 * Komponente.
 */
export function useMaterialNotes(): NoteTree | null {
  const [tree, setTree] = useState<NoteTree | null>(cache);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    void loadMaterialNotes().then((t) => { if (alive) setTree(t); });
    return () => { alive = false; };
  }, []);
  return tree;
}
