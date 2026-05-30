import type { ConcernId } from "@/lib/analysis/analyze";

/**
 * Evidence-based dermatology reference, baked in as data (no DB). Compiled from
 * authoritative sources (AAD, DermNet NZ, PubMed/PMC, NCBI) — see `SOURCES`.
 * Every string is an original concise paraphrase, not copied text.
 *
 * This is reference knowledge for an explainable demo, NOT medical advice and
 * NOT a diagnostic device (see docs/VALIDATION.md).
 *
 * Concern ids match the analysis engine: redness | evenness | underEye | texture.
 */

export type EvidenceLevel = "high" | "moderate" | "limited";

export interface ConcernIngredient {
  name: string;
  action: string;
  evidence: EvidenceLevel;
  caution: string;
}

export interface ConcernInfo {
  id: ConcernId;
  label: string;
  summary: string;
  causes: string[];
  /** Clinically-supported actives, best-first. */
  ingredients: ConcernIngredient[];
  habits: string[];
}

export interface IngredientInfo {
  name: string;
  aka: string[];
  targets: ConcernId[];
  caution: string;
  avoidWith: string[];
  sourceUrl: string;
}

export interface Source {
  title: string;
  url: string;
  note: string;
}

export const CONCERN_INFO: Record<ConcernId, ConcernInfo> = {
  blemishes: {
    id: "blemishes",
    label: "Spots & blemishes",
    summary:
      "Visible spots — acne papules/pustules, clogged pores, or post-inflammatory marks.",
    causes: [
      "Excess sebum plus dead-cell buildup clogging follicles",
      "C. acnes overgrowth driving inflammatory lesions",
      "Hormonal shifts increasing oil production",
      "Comedogenic products or friction aggravating pores",
    ],
    ingredients: [
      { name: "Salicylic acid (BHA)", action: "Oil-soluble; exfoliates inside the pore to clear clogs", evidence: "high", caution: "Can dry/irritate; build up slowly" },
      { name: "Azelaic acid", action: "Antimicrobial + anti-inflammatory; fades post-acne marks", evidence: "high", caution: "Mild tingling at first" },
      { name: "Benzoyl peroxide", action: "Kills C. acnes; gold standard for inflammatory acne", evidence: "high", caution: "Bleaches fabric; can dry skin" },
      { name: "Niacinamide", action: "Calms inflammation and regulates sebum", evidence: "moderate", caution: "" },
      { name: "Retinoids", action: "Normalize cell turnover, preventing clogged pores", evidence: "high", caution: "Avoid in pregnancy; introduce slowly" },
    ],
    habits: [
      "Don't pick — it drives scarring and dark marks",
      "Use non-comedogenic, oil-free products",
      "Introduce one active at a time to avoid over-irritation",
    ],
  },
  redness: {
    id: "redness",
    label: "Redness & sensitivity",
    summary:
      "Persistent facial redness from vascular dilation, barrier disruption, or inflammation.",
    causes: [
      "Rosacea — immune dysregulation and vascular hyper-reactivity",
      "Impaired barrier letting irritants in and triggering inflammation",
      "UV-triggered capillary dilation and cutaneous inflammation",
      "Contact or seborrheic dermatitis causing localized erythema",
    ],
    ingredients: [
      { name: "Niacinamide", action: "Calms inflammation; strengthens the ceramide barrier", evidence: "high", caution: "" },
      { name: "Azelaic acid", action: "Reduces erythema comparably to topical metronidazole", evidence: "high", caution: "Can sting at first; may lighten darker skin" },
      { name: "Centella asiatica", action: "Triterpenes calm neurogenic inflammation", evidence: "moderate", caution: "" },
      { name: "Panthenol", action: "Repairs barrier; lowers water loss and redness", evidence: "moderate", caution: "" },
      { name: "Mineral SPF (zinc oxide)", action: "Blocks the UV that drives redness flares", evidence: "high", caution: "" },
    ],
    habits: [
      "Identify and avoid personal triggers — heat, alcohol, spice",
      "Use fragrance-free, gentle, low-ingredient cleansers",
      "Apply mineral SPF 30+ daily to prevent UV flares",
    ],
  },
  evenness: {
    id: "evenness",
    label: "Uneven tone",
    summary:
      "Irregular melanin causing dark spots, melasma, or post-inflammatory marks.",
    causes: [
      "Chronic UV exposure raising melanin via tyrosinase",
      "Post-inflammatory pigment after acne, eczema, or trauma",
      "Melasma driven by hormones plus UV",
      "Sun damage accumulating as scattered surface pigment",
    ],
    ingredients: [
      { name: "Vitamin C (L-ascorbic acid)", action: "Antioxidant that brightens and inhibits tyrosinase", evidence: "high", caution: "Oxidizes fast; needs airtight opaque packaging" },
      { name: "Niacinamide", action: "Blocks pigment transfer to skin cells", evidence: "high", caution: "" },
      { name: "Azelaic acid", action: "Targets overactive pigment-producing cells", evidence: "high", caution: "Possible transient lightening on darker skin" },
      { name: "Alpha arbutin", action: "Gently inhibits tyrosinase without cytotoxicity", evidence: "moderate", caution: "" },
      { name: "Retinol", action: "Speeds turnover, dispersing surface pigment", evidence: "high", caution: "Avoid in pregnancy; introduce slowly" },
    ],
    habits: [
      "Daily broad-spectrum SPF 30+ — UV perpetuates pigment",
      "Don't pick at spots — it causes lasting marks",
      "Introduce actives gradually to avoid irritation marks",
    ],
  },
  underEye: {
    id: "underEye",
    label: "Under-eye area",
    summary:
      "Periorbital darkness from vascular, pigmentary, or structural causes; fluid causes puffiness.",
    causes: [
      "Thin translucent skin revealing underlying vessels",
      "Localized pigment from UV or post-inflammatory marks",
      "Tear-trough shadow from volume loss",
      "Fluid retention from poor sleep, allergies, or salt",
    ],
    ingredients: [
      { name: "Caffeine", action: "Constricts vessels and aids drainage to de-puff", evidence: "moderate", caution: "" },
      { name: "Peptides", action: "Support collagen, thickening thin under-eye skin", evidence: "moderate", caution: "" },
      { name: "Niacinamide", action: "Reduces pigment transfer; supports the barrier", evidence: "moderate", caution: "" },
      { name: "Hyaluronic acid", action: "Plumps to soften tear-trough shadow", evidence: "moderate", caution: "" },
      { name: "Vitamin K", action: "May reduce hemoglobin-derived discoloration", evidence: "limited", caution: "" },
    ],
    habits: [
      "Sleep 7–9 hours, head slightly elevated",
      "Brief cool compress to constrict vessels",
      "Lower dietary salt to reduce fluid retention",
    ],
  },
  texture: {
    id: "texture",
    label: "Texture & fine lines",
    summary:
      "Collagen loss causing fine lines; slow turnover leaving rough, uneven surface.",
    causes: [
      "Intrinsic aging — collagen decline and dermal thinning",
      "Photoaging — UV fragments collagen into coarse wrinkles",
      "Slow cell turnover leaving dead cells at the surface",
      "Chronic dehydration reducing plumpness",
    ],
    ingredients: [
      { name: "Retinol", action: "Boosts collagen and turnover; the gold-standard active", evidence: "high", caution: "Avoid in pregnancy; photosensitizing — use at night" },
      { name: "AHA (glycolic/lactic)", action: "Exfoliates surface; stimulates renewal", evidence: "high", caution: "Increases sun sensitivity — pair with SPF" },
      { name: "Vitamin C (L-ascorbic acid)", action: "Cofactor for collagen; antioxidant protection", evidence: "high", caution: "Unstable in light or high pH" },
      { name: "Peptides", action: "Signal fibroblasts to make more collagen", evidence: "moderate", caution: "" },
      { name: "PHA (gluconolactone)", action: "Gentle exfoliation with humectant effect", evidence: "moderate", caution: "" },
    ],
    habits: [
      "SPF 30+ daily — photoaging is the top modifiable cause",
      "Keep skin hydrated with ceramide/HA moisturizer",
      "Start retinol low and slow (1–2 nights/week)",
    ],
  },
};

export const INGREDIENTS: IngredientInfo[] = [
  { name: "Niacinamide", aka: ["Nicotinamide", "Vitamin B3"], targets: ["redness", "evenness", "underEye"], caution: "Generally very well tolerated", avoidWith: [], sourceUrl: "https://dermnetnz.org/topics/nicotinamide" },
  { name: "Azelaic acid", aka: ["Nonanedioic acid"], targets: ["redness", "evenness"], caution: "May sting; possible lightening on dark skin", avoidWith: [], sourceUrl: "https://dermnetnz.org/topics/azelaic-acid" },
  { name: "Retinol", aka: ["Vitamin A", "Retinoid"], targets: ["texture", "evenness"], caution: "Avoid in pregnancy; can irritate", avoidWith: ["benzoyl peroxide"], sourceUrl: "https://www.aad.org/public/everyday-care/skin-care-secrets/anti-aging/retinoid-retinol" },
  { name: "Vitamin C (L-ascorbic acid)", aka: ["Ascorbic acid"], targets: ["evenness", "texture"], caution: "Oxidizes fast; needs airtight opaque packaging", avoidWith: [], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3673383/" },
  { name: "Hyaluronic acid", aka: ["HA", "Sodium hyaluronate"], targets: ["texture", "underEye"], caution: "", avoidWith: [], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9293121/" },
  { name: "Ceramides", aka: ["Ceramide NP"], targets: ["redness", "texture"], caution: "", avoidWith: [], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9293121/" },
  { name: "Centella asiatica", aka: ["Cica", "Madecassoside"], targets: ["redness"], caution: "Rare contact allergy", avoidWith: [], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8627341/" },
  { name: "Zinc oxide (SPF)", aka: ["Mineral sunscreen"], targets: ["redness", "evenness", "texture"], caution: "", avoidWith: [], sourceUrl: "https://www.ncbi.nlm.nih.gov/books/NBK537164/" },
  { name: "Alpha arbutin", aka: ["Alpha-arbutin"], targets: ["evenness"], caution: "Use ≤2% in face products", avoidWith: [], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8301119/" },
  { name: "Caffeine", aka: ["Trimethylxanthine"], targets: ["underEye"], caution: "", avoidWith: [], sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/25625116/" },
  { name: "Vitamin K", aka: ["Phytonadione"], targets: ["underEye"], caution: "", avoidWith: [], sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/25625116/" },
  { name: "AHA (glycolic/lactic acid)", aka: ["Alpha-hydroxy acid"], targets: ["texture", "evenness"], caution: "Increases sun sensitivity — use SPF", avoidWith: ["retinol"], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6017965/" },
  { name: "BHA (salicylic acid)", aka: ["Beta-hydroxy acid"], targets: ["texture"], caution: "Limit high doses in pregnancy", avoidWith: [], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12274963/" },
  { name: "PHA (gluconolactone)", aka: ["Polyhydroxy acid"], targets: ["texture"], caution: "", avoidWith: [], sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/15002657/" },
  { name: "Peptides", aka: ["Signal peptides", "Matrixyl"], targets: ["texture", "underEye"], caution: "", avoidWith: [], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6981886/" },
  { name: "Panthenol", aka: ["Provitamin B5"], targets: ["redness"], caution: "", avoidWith: [], sourceUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10772476/" },
];

export interface FitzpatrickType {
  type: string;
  desc: string;
}

export const FITZPATRICK: FitzpatrickType[] = [
  { type: "I", desc: "Very fair; always burns, never tans; highest sun-care need" },
  { type: "II", desc: "Fair; burns easily, tans minimally" },
  { type: "III", desc: "Light-medium; burns moderately, tans gradually" },
  { type: "IV", desc: "Medium-brown; burns minimally, tans well" },
  { type: "V", desc: "Dark brown; rarely burns, tans easily" },
  { type: "VI", desc: "Deeply pigmented; never burns" },
];

export const BAUMANN_SUMMARY =
  "The Baumann system combines four axes — oily vs dry, sensitive vs resistant, pigmented vs not, and wrinkle-prone vs tight — into 16 skin types that guide product choice.";

export const SOURCES: Source[] = [
  { title: "Nicotinamide — DermNet NZ", url: "https://dermnetnz.org/topics/nicotinamide", note: "Mechanism, uses, safety" },
  { title: "Azelaic acid — DermNet NZ", url: "https://dermnetnz.org/topics/azelaic-acid", note: "Rosacea & pigmentation" },
  { title: "Vitamin C in dermatology — PMC 3673383", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3673383/", note: "Collagen, stability, safety" },
  { title: "Alpha-arbutin review — PMC 8301119", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8301119/", note: "Tyrosinase inhibition" },
  { title: "AHAs dual effects — PMC 6017965", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6017965/", note: "Exfoliation & photosensitivity" },
  { title: "Ceramides & barrier — PMC 9293121", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9293121/", note: "Barrier repair evidence" },
  { title: "Centella asiatica — PMC 8627341", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8627341/", note: "Anti-inflammatory pathways" },
  { title: "Sunscreens — NCBI NBK537164", url: "https://www.ncbi.nlm.nih.gov/books/NBK537164/", note: "Zinc oxide mechanism" },
  { title: "Caffeine + vitamin K eye study — PubMed 25625116", url: "https://pubmed.ncbi.nlm.nih.gov/25625116/", note: "Dark-circle reduction" },
  { title: "Fitzpatrick scale — NCBI NBK557626", url: "https://www.ncbi.nlm.nih.gov/books/NBK557626/", note: "Skin-type classification" },
];
