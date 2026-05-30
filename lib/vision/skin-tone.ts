import type { LAB } from "./types";

/**
 * Skin-tone classification from CIELAB, using the Individual Typology Angle (ITA)
 * — the standard colorimetric measure in dermatology (Chardon et al. 1991,
 * extended by Del Bino et al. 2013).
 *
 *   ITA° = arctan((L* − 50) / b*) × 180/π
 *
 * Higher ITA = lighter skin; lower (incl. negative) = darker. We report the
 * result on the **Monk Skin Tone (MST) 1–10** scale rather than Fitzpatrick,
 * deliberately: Fitzpatrick measures UV photo-response (not derivable from one
 * image — AI accuracy ~0–20% in recent studies), while MST is a constitutive-
 * pigmentation scale designed for inclusivity (6 of its 10 steps cover darker
 * tones vs Fitzpatrick's 2) and maps far better to colorimetry (~89–92%).
 *
 * IMPORTANT: this is an *approximate, indicative* tone estimate from a single
 * uncalibrated image — surfaced as guidance, never as a clinical/phototype claim.
 *
 * Sources: Chardon 1991; Del Bino 2013; Monk Skin Tone Scale (Monk/Google 2023);
 * ITA→MST bins per Nature npj Digital Medicine 2025. See docs/SKIN-TONE-METHODOLOGY.md.
 */

export interface SkinTone {
  /** Individual Typology Angle in degrees. */
  ita: number;
  /** Monk Skin Tone bin, 1 (lightest) … 10 (darkest). */
  monk: number;
  /** Coarse tier used for tone-relative calibration. */
  tier: "light" | "medium" | "dark";
  /** Human label for the result UI. */
  label: string;
}

/** ITA from a mean-skin LAB sample. b* is clamped away from 0 to avoid blow-ups. */
export function computeITA({ l, b }: LAB): number {
  const denom = Math.abs(b) < 1e-6 ? 1e-6 * Math.sign(b || 1) : b;
  return (Math.atan((l - 50) / denom) * 180) / Math.PI;
}

/**
 * ITA → Monk 1–10. Boundaries follow the published ITA-to-MST correspondence
 * (npj Digital Medicine 2025): MST steps span ~20° of ITA from ~+90° (MST 1)
 * down to ~−90° (MST 10). Monotonic and clamped to [1,10].
 */
export function itaToMonk(ita: number): number {
  // Upper edge of each Monk bin's ITA range, lightest → darkest.
  const edges = [70, 55, 41, 28, 18, 10, -10, -30, -50];
  let monk = 10;
  for (let i = 0; i < edges.length; i++) {
    if (ita > edges[i]) {
      monk = i + 1;
      break;
    }
  }
  return Math.min(10, Math.max(1, monk));
}

/** Coarse 3-tier band (light/medium/dark) for tone-relative thresholds. */
export function itaToTier(ita: number): SkinTone["tier"] {
  if (ita > 41) return "light";
  if (ita > 10) return "medium";
  return "dark";
}

const MONK_LABEL: Record<number, string> = {
  1: "Very light",
  2: "Light",
  3: "Light",
  4: "Light–medium",
  5: "Medium",
  6: "Medium",
  7: "Medium–deep",
  8: "Deep",
  9: "Deep",
  10: "Very deep",
};

/** Full classification from a mean-skin LAB sample. */
export function classifySkinTone(lab: LAB): SkinTone {
  const ita = computeITA(lab);
  const monk = itaToMonk(ita);
  return {
    ita: Math.round(ita * 10) / 10,
    monk,
    tier: itaToTier(ita),
    label: `Monk ${monk} · ${MONK_LABEL[monk]}`,
  };
}
