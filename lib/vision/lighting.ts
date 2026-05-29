import type { RGB, SampledRegion } from "./types";

/**
 * Lighting quality gate for skin analysis.
 *
 * Lighting is the single biggest confounder in selfie skin analysis, so we
 * gate on it before a scan and surface a confidence on the result. Following
 * ISO/IEC 29794-5 (face image quality), we assess from the face-region pixels
 * we already sample — zero extra cost:
 *
 *   • Exposure  — fraction of crushed (≈0) and blown (≈255) pixels.
 *   • Uniformity — left-cheek vs right-cheek luminance delta (detects harsh
 *                  side lighting / one-sided shadow).
 *
 * INCLUSIVITY: exposure-clipping and left/right uniformity are tone-robust
 * (clipping is bad regardless of tone; uniformity is a within-face delta). We
 * deliberately avoid an absolute brightness threshold as the primary gate,
 * because that would penalize darker skin whose face luminance is legitimately
 * lower. A conservative darkness floor only catches genuine near-darkness.
 */

export type LightingLevel = "good" | "dim" | "bright" | "uneven";

export interface LightingQuality {
  ok: boolean;
  level: LightingLevel;
  hint: string;
  /** 0–100 confidence in the lighting conditions. */
  score: number;
}

const MIN_PIXELS = 30;
const CLIP_LOW = 12;
const CLIP_HIGH = 245;

function luma({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function meanLuma(pixels: RGB[]): number {
  if (pixels.length === 0) return 0;
  return pixels.reduce((sum, p) => sum + luma(p), 0) / pixels.length;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

const HINTS: Record<LightingLevel, string> = {
  good: "Lighting looks good",
  dim: "Too dark — find more light",
  bright: "Too bright — avoid direct light",
  uneven: "Lighting is uneven — face a window or even light",
};

export function assessLighting(regions: SampledRegion[]): LightingQuality {
  const all = regions.flatMap((r) => r.pixels);
  if (all.length < MIN_PIXELS) {
    return { ok: false, level: "dim", hint: HINTS.dim, score: 0 };
  }

  const lumas = all.map(luma);
  const mean = lumas.reduce((s, v) => s + v, 0) / lumas.length;
  const clipLow = lumas.filter((l) => l < CLIP_LOW).length / lumas.length;
  const clipHigh = lumas.filter((l) => l > CLIP_HIGH).length / lumas.length;

  const left = regions.find((r) => r.id === "leftCheek")?.pixels;
  const right = regions.find((r) => r.id === "rightCheek")?.pixels;
  const uniformity =
    left && right && left.length && right.length
      ? Math.abs(meanLuma(left) - meanLuma(right))
      : 0;

  let level: LightingLevel;
  if (clipHigh > 0.2 || mean > 225) level = "bright";
  else if (clipLow > 0.45 || mean < 35) level = "dim";
  else if (uniformity > 45) level = "uneven";
  else level = "good";

  const score = clamp(
    100 -
      clipHigh * 130 -
      clipLow * 70 -
      Math.max(0, uniformity - 15) * 1.6 -
      Math.max(0, 50 - mean) * 1.1 -
      Math.max(0, mean - 215) * 1.4,
    0,
    100,
  );

  return { ok: level === "good", level, hint: HINTS[level], score: Math.round(score) };
}
