import type { ConcernId, SkinAnalysis } from "@/lib/analysis/analyze";
import { CONCERN_INFO, type EvidenceLevel } from "@/lib/clinical/dermatology";
import { CATALOG, type Product, type ProductCategory } from "./catalog";

export type RoutineSlot = "cleanse" | "treat" | "eyes" | "moisturize" | "protect";

export interface EvidenceNote {
  ingredient: string;
  action: string;
  evidence: EvidenceLevel;
}

export interface RoutineStep {
  slot: RoutineSlot;
  product: Product;
  /** Why this step is in the routine — references the user's own result. */
  reason: string;
  /** Clinical backing: a matching active for the targeted concern, if any. */
  evidence?: EvidenceNote;
}

/**
 * Find the best clinically-supported active that this product contains for the
 * given concern, so the recommendation can cite real evidence (best level first).
 */
function evidenceFor(
  product: Product,
  concern: ConcernId,
): EvidenceNote | undefined {
  const rank: Record<EvidenceLevel, number> = { high: 3, moderate: 2, limited: 1 };
  const candidates = CONCERN_INFO[concern].ingredients
    .filter((ing) =>
      product.keyActives.some((a) => {
        const an = a.toLowerCase();
        const inn = ing.name.toLowerCase();
        return inn.includes(an) || an.includes(inn.split(" ")[0]);
      }),
    )
    .sort((a, b) => rank[b.evidence] - rank[a.evidence]);
  const best = candidates[0];
  return best
    ? { ingredient: best.name, action: best.action, evidence: best.evidence }
    : undefined;
}

export interface Routine {
  steps: RoutineStep[];
  summary: string;
}

const SLOT_ORDER: RoutineSlot[] = [
  "cleanse",
  "treat",
  "eyes",
  "moisturize",
  "protect",
];

/**
 * Pick a product in a category. With a `preferTarget`, prefer one that addresses
 * that concern; otherwise prefer a neutral CORE product (no specific targets) so
 * the default routine isn't seeded with concern-specific items.
 */
function pick(
  category: ProductCategory,
  preferTarget?: ConcernId,
): Product | undefined {
  if (preferTarget) {
    const targeted = CATALOG.find(
      (p) => p.category === category && p.targets.includes(preferTarget),
    );
    if (targeted) return targeted;
  }
  const core = CATALOG.find(
    (p) => p.category === category && p.targets.length === 0,
  );
  return core ?? CATALOG.find((p) => p.category === category);
}

const CONCERN_LABEL: Record<ConcernId, string> = {
  blemishes: "spots & blemishes",
  redness: "redness",
  evenness: "uneven tone",
  underEye: "under-eye darkness",
  texture: "texture",
};

/**
 * Deterministically maps a SkinAnalysis to a skincare routine.
 *
 * Core steps (cleanse / moisturize / protect) are always present — the basics
 * everyone needs. Targeted treatments are added only for concerns the scan
 * actually flagged (severity ≠ "good"), worst first, capped at two serums so the
 * routine stays realistic. Every step carries a reason tied to the user's own
 * result, never a generic upsell.
 */
export function buildRoutine(analysis: SkinAnalysis): Routine {
  const flagged = analysis.concerns
    .filter((c) => c.severity !== "good")
    .sort((a, b) => a.score - b.score);
  const flaggedIds = new Set(flagged.map((c) => c.id));

  const steps: RoutineStep[] = [];

  // Cleanse — soothing if redness flagged.
  const cleanser = pick("cleanser", flaggedIds.has("redness") ? "redness" : undefined);
  if (cleanser) {
    steps.push({
      slot: "cleanse",
      product: cleanser,
      reason: flaggedIds.has("redness")
        ? "A non-stripping start, since your skin shows some redness."
        : "A gentle daily cleanse to start the routine.",
    });
  }

  // Treat — up to two serums for the worst flagged color/texture concerns.
  const treatConcerns = flagged
    .filter((c) => c.id !== "underEye")
    .slice(0, 2);
  const usedTreatIds = new Set<string>();
  for (const concern of treatConcerns) {
    const serum =
      pick("serum", concern.id) ?? pick("exfoliant", concern.id);
    if (serum && !usedTreatIds.has(serum.id)) {
      usedTreatIds.add(serum.id);
      steps.push({
        slot: "treat",
        product: serum,
        reason: `Targets the ${CONCERN_LABEL[concern.id]} we measured (scored ${concern.score}/100).`,
        evidence: evidenceFor(serum, concern.id),
      });
    }
  }

  // Eyes — only if under-eye flagged.
  if (flaggedIds.has("underEye")) {
    const eye = pick("eye", "underEye");
    if (eye) {
      const underEye = flagged.find((c) => c.id === "underEye");
      steps.push({
        slot: "eyes",
        product: eye,
        reason: `Your under-eye area scored ${underEye?.score ?? ""}/100 — this brightens and de-puffs.`,
        evidence: evidenceFor(eye, "underEye"),
      });
    }
  }

  // Moisturize — barrier-supporting if redness flagged.
  const moisturizer = pick(
    "moisturizer",
    flaggedIds.has("redness") ? "redness" : undefined,
  );
  if (moisturizer) {
    steps.push({
      slot: "moisturize",
      product: moisturizer,
      reason: flaggedIds.has("redness")
        ? "Supports a calmer barrier to reduce reactivity."
        : "Locks in hydration morning and night.",
    });
  }

  // Protect — SPF, always.
  const spf = pick("spf");
  if (spf) {
    steps.push({
      slot: "protect",
      product: spf,
      reason: "Daily SPF protects every result you just measured.",
    });
  }

  steps.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));

  const summary =
    flagged.length === 0
      ? `A simple ${steps.length}-step routine to maintain healthy skin.`
      : `A ${steps.length}-step routine targeting your ${flagged.length} flagged ${
          flagged.length === 1 ? "area" : "areas"
        }.`;

  return { steps, summary };
}
