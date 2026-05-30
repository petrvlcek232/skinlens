import { rgbToLab } from "@/lib/vision/color";
import type { RGB } from "@/lib/vision/types";

/**
 * Spot / blemish density — a heuristic proxy, NOT clinical acne grading.
 *
 * A real acne grade needs a trained CNN over lesion datasets (out of scope —
 * see docs/LIMITATIONS-AND-ROADMAP.md §1.3). This is a defensible classical-CV
 * stand-in: within a skin region, a *spot* (papule, pustule, freckle, dark mark)
 * is a pixel that deviates strongly from the region's own clear-skin baseline —
 * markedly redder (higher CIELAB a*) and/or darker (lower L*). We measure the
 * fraction of such pixels = "spot density".
 *
 * Crucially this same pass produces a **spot mask**, which we reuse to compute a
 * freckle-robust skin tone (exclude spots → ITA reflects clear skin, not
 * freckle-darkened median). One detection, two uses.
 *
 * All relative to the region's own robust baseline, so it's tone-independent
 * (consistent with ADR-008): a "spot" is defined against the same face, never an
 * absolute colour.
 */

export interface SpotResult {
  /** Fraction of region pixels flagged as spots, 0–1. */
  density: number;
  /** Pixels NOT flagged as spots (clear skin) — for tone estimation. */
  clearSkin: RGB[];
  /** Count of pixels examined. */
  total: number;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Robust spread (MAD) of a series, scaled to ~std-dev units. */
function mad(xs: number[], med: number): number {
  return (median(xs.map((x) => Math.abs(x - med))) || 1) * 1.4826;
}

/**
 * Detect spots in a set of skin-region pixels.
 *
 * `aK` / `lK` are how many robust-deviations above-red / below-light a pixel must
 * be to count as a spot. Defaults are tuned to flag visible blemishes/freckles
 * while ignoring normal skin variation.
 */
export function detectSpots(pixels: RGB[], aK = 1.8, lK = 1.8): SpotResult {
  if (pixels.length < 30) {
    return { density: 0, clearSkin: pixels, total: pixels.length };
  }
  const labs = pixels.map(rgbToLab);
  const aVals = labs.map((c) => c.a);
  const lVals = labs.map((c) => c.l);
  const aMed = median(aVals);
  const lMed = median(lVals);
  const aSpread = mad(aVals, aMed);
  const lSpread = mad(lVals, lMed);

  const clearSkin: RGB[] = [];
  let spots = 0;
  for (let i = 0; i < pixels.length; i++) {
    const redder = aVals[i] - aMed > aK * aSpread;
    const darker = lMed - lVals[i] > lK * lSpread;
    if (redder || darker) {
      spots++;
    } else {
      clearSkin.push(pixels[i]);
    }
  }
  return { density: spots / pixels.length, clearSkin, total: pixels.length };
}

/**
 * Map spot density to a 0–100 health score (higher = clearer skin). Clear skin
 * always has a few outlier pixels, so `cleanAt` (~3%) still scores 100; dense
 * blemishes (≥ `severeAt`) bottom out.
 */
export function spotDensityToScore(density: number, cleanAt = 0.03, severeAt = 0.25): number {
  if (density <= cleanAt) return 100;
  if (density >= severeAt) return 30;
  const t = (density - cleanAt) / (severeAt - cleanAt);
  return Math.round(100 - t * 70);
}
