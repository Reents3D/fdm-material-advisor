/** Herstellerprodukte. Getrennt von den Werkstofftypen — siehe scripts/import/manufacturer-products.mjs. */

import type { I18nText, Quantity } from "../engine/types";

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
  governance: { lastReviewed: string; reviewedBy: string; sources: unknown[] };
}

const modules = import.meta.glob("../../data/products/*.json", { eager: true, import: "default" });

export const PRODUCTS: Product[] = (Object.values(modules) as Product[]).sort(
  (a, b) => a.materialId.localeCompare(b.materialId) || a.brand.localeCompare(b.brand),
);

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
