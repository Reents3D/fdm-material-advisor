/** Herstellerprodukte. Getrennt von den Werkstofftypen — siehe scripts/import/manufacturer-products.mjs. */

import type { Confidence, I18nText, Quantity } from "../engine/types";

export interface Product {
  schemaVersion: string;
  id: string;
  materialId: string;
  brand: string;
  manufacturer: string;
  productName: string;
  origin?: string;
  /** printed = an gedruckten Prüfkörpern gemessen; moulded = Rohstoffkennwert. */
  specimenType: "printed" | "moulded" | "undeclared";
  specimenNote?: I18nText;
  features?: I18nText;
  datasheet: { title: string; url: string; version?: string; retrievedAt: string };
  productUrl?: string;
  properties: Record<string, Quantity | undefined>;
  /** Bestaendigkeitsangaben AUS DEM PRODUKTDATENBLATT - nicht die abgeleitete Familienmatrix. */
  chemicalResistance?: {
    chemicalId: string;
    rating: "resistant" | "limited" | "not-resistant" | "unknown";
    conditions?: string;
    source: string;
    confidence: Confidence;
    note?: I18nText;
  }[];
  compliance?: {
    ul94?: {
      value: string | null; thicknessMm?: number; testStandard?: string;
      source: string; confidence: Confidence; note?: I18nText;
    };
  };
  governance: { lastReviewed: string; reviewedBy: string; sources: unknown[] };
}

/* Bis 2026-08-06 zog Vite die 250 Einzeldateien hier per `import.meta.glob` ins Buendel.
   Das funktionierte, liess aber keine Textabelle zu (ADR-041) - und die Produktdaten sind
   mit 1.103 kB roh der groesste Brocken im Auslieferungsumfang. Gelesen wird jetzt das von
   `scripts/build-data-chunks.mjs` erzeugte Buendel; kanonisch bleibt `data/products/*.json`. */
import { expand, type I18nBlock } from "./intern";
import bundle from "./generated/products.json";

export const PRODUCTS: Product[] = expand<Product[]>(bundle as unknown as { t: I18nBlock[]; d: unknown })
  .slice()
  .sort((a, b) => a.materialId.localeCompare(b.materialId) || a.brand.localeCompare(b.brand));

/** materialId → Produkte, gedruckte Prüfkörper zuerst. */
export function productsByMaterial(): Map<string, Product[]> {
  const rank = { printed: 0, undeclared: 1, moulded: 2 };
  const map = new Map<string, Product[]>();
  for (const p of PRODUCTS) {
    const list = map.get(p.materialId) ?? [];
    list.push(p);
    map.set(p.materialId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => rank[a.specimenType] - rank[b.specimenType] || a.brand.localeCompare(b.brand));
  }
  return map;
}

export const BRANDS = [...new Set(PRODUCTS.map((p) => p.brand))].sort();
