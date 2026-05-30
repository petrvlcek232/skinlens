import type { RGB, RegionId, SampledRegion, RegionSampleStats } from "./types";
import { luminanceL } from "./color";

/**
 * Multi-frame scan aggregation.
 *
 * Each scan frame contributes one robust color per region (median over the
 * region's skin pixels, after rejecting luminance outliers — beard hairs,
 * specular glare, stray shadow). Across frames we take the component-wise
 * median, which is resistant to a few bad frames (motion blur, a blink, a
 * lighting flicker). This temporal robustness is the accuracy guarantee that
 * makes the downstream metrics safe.
 */

const MIN_REGION_PIXELS = 12;
const OUTLIER_MAD_FACTOR = 2.5;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function medianRGB(colors: RGB[]): RGB {
  return {
    r: median(colors.map((c) => c.r)),
    g: median(colors.map((c) => c.g)),
    b: median(colors.map((c) => c.b)),
  };
}

/**
 * Skin-plausibility test, tone-robust. Human skin reflects more red than green
 * or blue (R ≥ G ≥ B holds across light AND dark skin), so we keep pixels where
 * red is at least the dominant channel within a small tolerance. This rejects
 * background bleed — green foliage (G ≫ R), blue sky/clothing (B ≫ R) — that
 * leaks into edge regions, without using any absolute brightness threshold that
 * would penalize darker skin. Neutral greys pass (within tolerance) so we never
 * over-reject. (E2E surfaced green background degrading the tone metric.)
 */
const SKIN_TOL = 6;
function isSkinLike({ r, g, b }: RGB): boolean {
  return r >= g - SKIN_TOL && r >= b - SKIN_TOL;
}

/**
 * Robust representative color for one region's pixels: (1) drop non-skin pixels
 * (background bleed) via a tone-robust skin test, (2) drop pixels whose luminance
 * is far (> 2.5·MAD) from the region median, then take the component-wise median
 * of what remains. Returns null if too few skin pixels to start.
 */
export function robustRegionColor(pixels: RGB[]): RGB | null {
  if (pixels.length < MIN_REGION_PIXELS) return null;

  // 1. Skin gate — remove obvious background; fall back if it leaves too few.
  const skin = pixels.filter(isSkinLike);
  const base = skin.length >= MIN_REGION_PIXELS ? skin : pixels;

  // 2. Luminance-outlier rejection on the skin set.
  const lums = base.map(luminanceL);
  const medL = median(lums);
  const mad = median(lums.map((l) => Math.abs(l - medL))) || 1;
  const kept = base.filter(
    (_, i) => Math.abs(lums[i] - medL) <= OUTLIER_MAD_FACTOR * mad,
  );

  const usable = kept.length >= MIN_REGION_PIXELS ? kept : base;
  return medianRGB(usable);
}

export interface ScanAccumulator {
  perRegion: Map<RegionId, RGB[]>;
  perRegionPixelCounts: Map<RegionId, number[]>;
  frames: number;
}

export function createAccumulator(): ScanAccumulator {
  return { perRegion: new Map(), perRegionPixelCounts: new Map(), frames: 0 };
}

/** Fold one frame's sampled regions into the accumulator. */
export function accumulateFrame(
  acc: ScanAccumulator,
  regions: SampledRegion[],
): void {
  let contributed = false;
  for (const region of regions) {
    const color = robustRegionColor(region.pixels);
    if (!color) continue;
    contributed = true;
    const colors = acc.perRegion.get(region.id) ?? [];
    colors.push(color);
    acc.perRegion.set(region.id, colors);
    const counts = acc.perRegionPixelCounts.get(region.id) ?? [];
    counts.push(region.pixels.length);
    acc.perRegionPixelCounts.set(region.id, counts);
  }
  if (contributed) acc.frames += 1;
}

/** Collapse the accumulator into one robust color per region. */
export function finalizeScan(acc: ScanAccumulator): RegionSampleStats[] {
  const stats: RegionSampleStats[] = [];
  for (const [id, colors] of acc.perRegion.entries()) {
    if (colors.length === 0) continue;
    const counts = acc.perRegionPixelCounts.get(id) ?? [];
    stats.push({
      id,
      color: medianRGB(colors),
      avgPixelCount:
        counts.reduce((sum, n) => sum + n, 0) / Math.max(1, counts.length),
      frameCount: colors.length,
    });
  }
  return stats;
}
