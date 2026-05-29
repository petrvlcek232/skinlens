import type { ConcernId } from "@/lib/analysis/analyze";

export type ProductCategory =
  | "cleanser"
  | "serum"
  | "exfoliant"
  | "eye"
  | "moisturizer"
  | "spf";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  keyIngredient: string;
  /** Concerns this product is suited to (empty = core/always-suitable). */
  targets: ConcernId[];
  priceUsd: number;
  blurb: string;
}

/**
 * A small, fictional catalog. Names are generic and descriptive on purpose —
 * no real brands, no clinical claims — because this is a routing demo, not a
 * storefront. In production this slot is the brand's real product feed.
 */
export const CATALOG: Product[] = [
  {
    id: "calm-gel-cleanser",
    name: "Calm Gel Cleanser",
    category: "cleanser",
    keyIngredient: "Centella + glycerin",
    targets: ["redness"],
    priceUsd: 16,
    blurb: "A fragrance-free gel cleanser that won't strip a sensitive barrier.",
  },
  {
    id: "daily-foaming-cleanser",
    name: "Daily Foaming Cleanser",
    category: "cleanser",
    keyIngredient: "Amino-acid surfactants",
    targets: [],
    priceUsd: 14,
    blurb: "A gentle everyday cleanser for balanced skin.",
  },
  {
    id: "niacinamide-serum",
    name: "Niacinamide 10% Serum",
    category: "serum",
    keyIngredient: "Niacinamide",
    targets: ["redness", "evenness"],
    priceUsd: 20,
    blurb: "Calms visible redness and helps even out tone over time.",
  },
  {
    id: "vitc-serum",
    name: "Vitamin C Brightening Serum",
    category: "serum",
    keyIngredient: "15% L-ascorbic acid",
    targets: ["evenness"],
    priceUsd: 28,
    blurb: "Targets uneven tone and dullness for a brighter, more uniform look.",
  },
  {
    id: "centella-serum",
    name: "Centella Soothing Serum",
    category: "serum",
    keyIngredient: "Centella asiatica",
    targets: ["redness"],
    priceUsd: 22,
    blurb: "A soothing serum for skin that flushes or reacts easily.",
  },
  {
    id: "retinal-serum",
    name: "Encapsulated Retinal 0.1%",
    category: "serum",
    keyIngredient: "Retinaldehyde",
    targets: ["texture"],
    priceUsd: 34,
    blurb: "Smooths visible texture; introduce slowly, two evenings a week.",
  },
  {
    id: "pha-exfoliant",
    name: "PHA Gentle Exfoliant",
    category: "exfoliant",
    keyIngredient: "Gluconolactone",
    targets: ["texture", "evenness"],
    priceUsd: 24,
    blurb: "A mild leave-on exfoliant that refines texture without stinging.",
  },
  {
    id: "caffeine-eye",
    name: "Caffeine Eye Renew",
    category: "eye",
    keyIngredient: "Caffeine + peptides",
    targets: ["underEye"],
    priceUsd: 26,
    blurb: "Brightens and de-puffs the under-eye area.",
  },
  {
    id: "barrier-moisturizer",
    name: "Barrier Repair Moisturizer",
    category: "moisturizer",
    keyIngredient: "Ceramides + panthenol",
    targets: ["redness"],
    priceUsd: 25,
    blurb: "Rebuilds a calm, resilient barrier for reactive skin.",
  },
  {
    id: "daily-moisturizer",
    name: "Daily Hydrating Gel",
    category: "moisturizer",
    keyIngredient: "Hyaluronic acid",
    targets: [],
    priceUsd: 18,
    blurb: "Lightweight daily hydration for all skin types.",
  },
  {
    id: "mineral-spf",
    name: "Mineral SPF 50 Fluid",
    category: "spf",
    keyIngredient: "Zinc oxide",
    targets: [],
    priceUsd: 22,
    blurb: "Broad-spectrum daily protection — the foundation of any routine.",
  },
];

export function productById(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}
