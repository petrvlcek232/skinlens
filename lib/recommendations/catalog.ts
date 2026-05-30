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
  brand: string;
  name: string;
  category: ProductCategory;
  /** Active ingredients (lowercase keys, matched against clinical data). */
  keyActives: string[];
  /** Concerns this product addresses (subset of analysis ConcernId). */
  targets: ConcernId[];
  format: string;
  priceUsd: number;
  /** Original short factual description (our wording, not copied marketing). */
  blurb: string;
  sourceUrl: string;
}

/**
 * Real, widely-available skincare products. Only FACTUAL attributes are stored
 * (brand, name, actives, purpose, price, source) — descriptions are our own
 * concise paraphrases, never copied marketing. This stands in for the brand's
 * live product feed in production. Researched from public retailer/brand pages
 * (The Ordinary, CeraVe, La Roche-Posay, Paula's Choice, EltaMD, Avène, Eucerin,
 * The INKEY List, Neutrogena, Bioderma). Prices approximate, USD.
 *
 * `targets` uses the analysis ConcernId set (evenness, not "tone").
 */
export const CATALOG: Product[] = [
  // Cleansers
  { id: "cerave-hydrating-cleanser", brand: "CeraVe", name: "Hydrating Facial Cleanser", category: "cleanser", keyActives: ["ceramides", "hyaluronic acid"], targets: ["redness"], format: "473 ml lotion", priceUsd: 17, blurb: "Non-stripping cleanser that supports the ceramide barrier.", sourceUrl: "https://www.cerave.com/skincare/cleansers/hydrating-facial-cleanser" },
  { id: "cerave-foaming-cleanser", brand: "CeraVe", name: "Foaming Facial Cleanser", category: "cleanser", keyActives: ["ceramides", "niacinamide"], targets: [], format: "355 ml gel-to-foam", priceUsd: 17, blurb: "Gentle daily foam that clears excess oil without stripping.", sourceUrl: "https://www.cerave.com/skincare/cleansers/foaming-facial-cleanser" },
  { id: "bioderma-sensibio", brand: "Bioderma", name: "Sensibio H2O Micellar Water", category: "cleanser", keyActives: ["micelles"], targets: ["redness"], format: "500 ml micellar", priceUsd: 21, blurb: "No-rinse micellar cleanser that soothes sensitive skin.", sourceUrl: "https://www.bioderma.us/en/p/sensibio-h2o-micellar-water.html" },

  // Serums / treatments
  { id: "to-niacinamide", brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", category: "serum", keyActives: ["niacinamide", "zinc"], targets: ["redness", "evenness"], format: "30 ml serum", priceUsd: 6, blurb: "High-dose niacinamide that calms redness and balances oil.", sourceUrl: "https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html" },
  { id: "to-azelaic", brand: "The Ordinary", name: "Azelaic Acid Suspension 10%", category: "serum", keyActives: ["azelaic acid"], targets: ["redness", "evenness"], format: "30 ml suspension", priceUsd: 12, blurb: "Brightens uneven tone and calms blemish-prone redness.", sourceUrl: "https://theordinary.com/en-us/azelaic-acid-suspension-10-exfoliator-100407.html" },
  { id: "to-ha-b5", brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", category: "serum", keyActives: ["hyaluronic acid", "panthenol", "ceramides"], targets: ["redness", "texture"], format: "30 ml serum", priceUsd: 10, blurb: "Layered hydration that plumps and supports the barrier.", sourceUrl: "https://theordinary.com/en-us/hyaluronic-acid-2-b5-serum-with-ceramides-100637.html" },
  { id: "to-peptide", brand: "The Ordinary", name: "Multi-Peptide + HA Serum", category: "serum", keyActives: ["peptides", "hyaluronic acid"], targets: ["texture"], format: "30 ml serum", priceUsd: 20, blurb: "Peptide complex that firms and softens fine lines.", sourceUrl: "https://theordinary.com/en-us/multi-peptide-ha-serum-100613.html" },
  { id: "to-retinal", brand: "The Ordinary", name: "Retinal 0.2% Emulsion", category: "serum", keyActives: ["retinol"], targets: ["texture", "evenness"], format: "15 ml emulsion", priceUsd: 15, blurb: "Potent retinal that speeds turnover and smooths skin.", sourceUrl: "https://theordinary.com/en-us/retinal-02-emulsion-100646.html" },
  { id: "inkey-vitc", brand: "The INKEY List", name: "15% Vitamin C + EGF Serum", category: "serum", keyActives: ["vitamin c", "peptides"], targets: ["evenness"], format: "30 ml serum", priceUsd: 17, blurb: "Stable vitamin C for brighter, more even tone.", sourceUrl: "https://www.theinkeylist.com/products/15-vitamin-c-egf-serum" },
  { id: "pc-c15", brand: "Paula's Choice", name: "C15 Super Booster", category: "serum", keyActives: ["vitamin c"], targets: ["evenness", "texture"], format: "20 ml serum", priceUsd: 49, blurb: "Potent L-ascorbic acid that evens tone and fights oxidation.", sourceUrl: "https://www.paulaschoice.com/c15-super-booster/777.html" },
  { id: "neutrogena-retinol", brand: "Neutrogena", name: "Rapid Wrinkle Repair Retinol", category: "serum", keyActives: ["retinol", "hyaluronic acid"], targets: ["texture"], format: "30 ml serum", priceUsd: 22, blurb: "Accessible retinol serum that softens fine lines over time.", sourceUrl: "https://www.neutrogena.com/products/skincare/neutrogena-rapid-wrinkle-repair-retinol-renewal-serum/6807873" },

  // Exfoliants
  { id: "to-aha-bha", brand: "The Ordinary", name: "AHA 30% + BHA 2% Peeling Solution", category: "exfoliant", keyActives: ["aha", "bha"], targets: ["evenness", "texture"], format: "30 ml weekly peel", priceUsd: 10, blurb: "Ten-minute weekly peel that resurfaces and brightens.", sourceUrl: "https://theordinary.com/en-us/aha-30-bha-2-peeling-solution-exfoliator-100400.html" },
  { id: "pc-bha", brand: "Paula's Choice", name: "Skin Perfecting 2% BHA", category: "exfoliant", keyActives: ["bha"], targets: ["texture", "evenness"], format: "118 ml liquid", priceUsd: 36, blurb: "Leave-on salicylic acid that unclogs pores and smooths texture.", sourceUrl: "https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201-2010.html" },

  // Eye
  { id: "cerave-eye-repair", brand: "CeraVe", name: "Eye Repair Cream", category: "eye", keyActives: ["ceramides", "niacinamide"], targets: ["underEye", "redness"], format: "14 ml cream", priceUsd: 20, blurb: "Fragrance-free eye cream for dark circles and puffiness.", sourceUrl: "https://www.cerave.com/skincare/moisturizers/eye-repair-cream" },
  { id: "cerave-eye-renew", brand: "CeraVe", name: "Skin Renewing Eye Cream", category: "eye", keyActives: ["caffeine", "peptides", "niacinamide"], targets: ["underEye", "texture"], format: "14 ml cream", priceUsd: 25, blurb: "Caffeine and peptides to de-puff and soften crow's feet.", sourceUrl: "https://www.cerave.com/skincare/moisturizers/eye-creams" },
  { id: "inkey-retinol-eye", brand: "The INKEY List", name: "Retinol Eye Cream", category: "eye", keyActives: ["retinol"], targets: ["underEye", "texture"], format: "15 ml cream", priceUsd: 15, blurb: "Slow-release retinol that smooths lines without irritation.", sourceUrl: "https://www.theinkeylist.com/products/retinol-eye-cream" },

  // Moisturizers
  { id: "cerave-daily-lotion", brand: "CeraVe", name: "Daily Moisturizing Lotion", category: "moisturizer", keyActives: ["ceramides", "hyaluronic acid"], targets: [], format: "355 ml lotion", priceUsd: 16, blurb: "Lightweight daily hydration with the ceramide barrier complex.", sourceUrl: "https://www.cerave.com/skincare/moisturizers/daily-moisturizing-lotion" },
  { id: "cerave-moisturizing-cream", brand: "CeraVe", name: "Moisturizing Cream", category: "moisturizer", keyActives: ["ceramides", "hyaluronic acid"], targets: ["redness"], format: "453 g cream", priceUsd: 15, blurb: "Rich ceramide cream that repairs and hydrates the barrier.", sourceUrl: "https://www.cerave.com/skincare/moisturizers/moisturizing-cream" },
  { id: "neutrogena-hydroboost", brand: "Neutrogena", name: "Hydro Boost Water Gel", category: "moisturizer", keyActives: ["hyaluronic acid"], targets: ["texture", "redness"], format: "50 ml gel", priceUsd: 20, blurb: "Lightweight gel that plumps skin with hyaluronic acid.", sourceUrl: "https://www.neutrogena.com/products/skincare/neutrogena-hydro-boost-water-gel-with-hyaluronic-acid/6811047" },
  { id: "avene-cicalfate", brand: "Avène", name: "Cicalfate+ Restorative Cream", category: "moisturizer", keyActives: ["zinc", "copper"], targets: ["redness"], format: "40 ml cream", priceUsd: 26, blurb: "Barrier-restoring cream that soothes reactive, damaged skin.", sourceUrl: "https://www.aveneusa.com/cicalfate-restorative-protective-cream" },
  { id: "eucerin-q10", brand: "Eucerin", name: "Q10 Anti-Wrinkle Face Cream", category: "moisturizer", keyActives: ["coenzyme q10", "vitamin e"], targets: ["texture"], format: "48 g cream", priceUsd: 13, blurb: "Antioxidant day cream that softens lines on sensitive skin.", sourceUrl: "https://www.eucerinus.com/products/q10-active/eucerin-q10-anti-wrinkle-sensitive-skin-creme" },

  // SPF
  { id: "eltamd-uv-clear", brand: "EltaMD", name: "UV Clear Broad-Spectrum SPF 46", category: "spf", keyActives: ["zinc oxide", "niacinamide"], targets: ["redness", "evenness"], format: "48 g fluid", priceUsd: 45, blurb: "Mineral SPF with niacinamide; a dermatologist favorite.", sourceUrl: "https://eltamd.com/products/uv-clear-broad-spectrum-spf-46" },
  { id: "lrp-anthelios-mineral", brand: "La Roche-Posay", name: "Anthelios Mineral SPF 50", category: "spf", keyActives: ["zinc oxide", "titanium dioxide"], targets: ["redness"], format: "50 ml fluid", priceUsd: 40, blurb: "100% mineral SPF 50 that suits reactive, sensitive skin.", sourceUrl: "https://www.laroche-posay.us/our-products/sun/face-sunscreen/anthelios-mineral-zinc-oxide-sunscreen-spf-50-883140000907.html" },
  { id: "lrp-toleriane-spf", brand: "La Roche-Posay", name: "Toleriane Double Repair UV SPF 30", category: "spf", keyActives: ["ceramides", "niacinamide"], targets: ["redness", "evenness"], format: "100 ml lotion", priceUsd: 29, blurb: "Daily moisturizer-SPF with ceramides and niacinamide.", sourceUrl: "https://www.laroche-posay.us/our-products/face/face-moisturizer/toleriane-double-repair-face-moisturizer-uv-883140003922.html" },
];

export function productById(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}
