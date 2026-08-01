/**
 * CSV-Serialisierung ohne Abhängigkeit.
 *
 * Zwei Dialekte, weil die beiden Empfänger tatsächlich verschieden sind:
 *
 *   excel-de  Semikolon, Dezimalkomma, UTF-8-BOM. Was ein deutscher Entscheider
 *             doppelklickt, muss in Excel sofort in Spalten stehen — mit Umlauten.
 *   rfc4180   Komma, Dezimalpunkt, kein BOM. So erwarten es pandas, R und jedes
 *             Werkzeug, das den offenen Datensatz weiterverarbeitet.
 *
 * Diese Datei wird auch von Node ohne Buildschritt geladen (Type Stripping, Node ≥ 22.6),
 * damit der Datensatz im Browser und in der CI aus derselben Quelle entsteht. Deshalb hier
 * ausschliesslich löschbare Typsyntax: keine enums, keine namespaces, keine
 * Parameter-Properties, Typimporte immer als `import type`. Und kein DOM-Zugriff — der
 * liegt in download.ts.
 */

export type CsvCell = string | number | null | undefined;
export type CsvRow = readonly CsvCell[];
export type CsvDialect = "excel-de" | "rfc4180";

export interface Column<T> {
  header: string;
  cell: (row: T) => CsvCell;
}

interface DialectSpec {
  delimiter: string;
  decimal: string;
  bom: boolean;
}

const DIALECTS: Record<CsvDialect, DialectSpec> = {
  "excel-de": { delimiter: ";", decimal: ",", bom: true },
  rfc4180: { delimiter: ",", decimal: ".", bom: false },
};

/** RFC 4180 schreibt CRLF vor. Excel und pandas lesen beides, Altsysteme nicht. */
const EOL = "\r\n";

/**
 * Zellen, die mit = + - @ oder einem Steuerzeichen beginnen, führt Excel als Formel aus.
 * Das ist der klassische CSV-Injection-Pfad — und diese Dateien werden verteilt.
 *
 * Der Schutz greift bewusst nicht bei echten Zahlen: "-0,4" ist ein Messwert und darf
 * nicht zu Text werden. Zahlenwerte laufen ohnehin über `formatNumber` und kommen hier
 * schon als Ziffernfolge an.
 */
const CONTROL_START = /^[=@\t\r]/;
const SIGN_START = /^[+-]/;
const LOOKS_NUMERIC = /^[+-]?\d+(?:[.,]\d+)?$/;

function defuse(s: string): string {
  if (CONTROL_START.test(s)) return `'${s}`;
  if (SIGN_START.test(s) && !LOOKS_NUMERIC.test(s)) return `'${s}`;
  return s;
}

function formatNumber(n: number, d: DialectSpec): string {
  // Ein fehlender Wert ist keine Null (ADR-006). NaN und Infinity entstehen nur aus
  // Rechenfehlern und werden als Lücke ausgegeben, nicht als Zahl behauptet.
  if (!Number.isFinite(n)) return "";
  return String(n).replace(".", d.decimal);
}

function serialiseCell(v: CsvCell, d: DialectSpec): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" ? formatNumber(v, d) : defuse(String(v));
  const needsQuotes =
    s.includes(d.delimiter) || s.includes('"') || s.includes("\n") || s.includes("\r") || s !== s.trim();
  return needsQuotes ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Zeilen zu CSV. Die Kopfzeile ist einfach die erste Zeile. */
export function toCsv(rows: readonly CsvRow[], dialect: CsvDialect = "excel-de"): string {
  const d = DIALECTS[dialect];
  const body = rows.map((r) => r.map((c) => serialiseCell(c, d)).join(d.delimiter)).join(EOL);
  return `${d.bom ? "﻿" : ""}${body}${rows.length ? EOL : ""}`;
}

/**
 * Tabelle aus Spaltendefinitionen. Der Umweg über `Column` statt roher Zeilen sorgt
 * dafür, dass Kopfzeile und Zellen nicht auseinanderlaufen können — genau der Fehler,
 * der beim Nachpflegen einer Spalte sonst passiert.
 */
export function tableToCsv<T>(
  items: readonly T[],
  columns: readonly Column<T>[],
  dialect: CsvDialect = "excel-de",
): string {
  const rows: CsvRow[] = [columns.map((c) => c.header), ...items.map((it) => columns.map((c) => c.cell(it)))];
  return toCsv(rows, dialect);
}
