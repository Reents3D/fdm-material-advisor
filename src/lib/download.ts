/**
 * Datei-Download im Browser. Getrennt von csv.ts, weil csv.ts auch in Node läuft und
 * dort weder Blob noch document existieren.
 *
 * Bewusst ohne Server: die Datei entsteht im Browser aus Daten, die ohnehin schon
 * geladen sind. Damit funktioniert der Export offline und es verlässt nichts das Gerät —
 * dieselbe Zusage wie beim Rest des Werkzeugs (kein Tracking, keine externen Aufrufe).
 */

/** ISO-Datum für Dateinamen: sortiert sich im Downloadordner von selbst richtig. */
export function today(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "vergleich" → "reents3d-materialberater-vergleich-2026-08-01.csv" */
export const exportFilename = (slug: string, ext = "csv"): string =>
  `reents3d-materialberater-${slug}-${today()}.${ext}`;

export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Ohne revoke bleibt der Blob bis zum Neuladen im Speicher. Der Timeout gibt Safari
  // Zeit, den Download tatsächlich zu starten, bevor die URL ungültig wird.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
