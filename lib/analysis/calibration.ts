import calibrationData from "./calibration.json";
import type { SkinTone } from "@/lib/vision/skin-tone";

/**
 * Typed access to the data-driven calibration produced by `scripts/calibrate.ts`
 * over a labeled face dataset (see datasets/README.md + docs/CALIBRATION.md).
 *
 * The thresholds here REPLACE the previously hand-picked redness cutoffs in
 * analyze.ts. They are **tone-relative**: each skin-tone tier (light/medium/dark,
 * derived from ITA) gets its own redness-delta band, because the calibration
 * showed the natural redness-delta distribution differs by tone — the whole
 * reason an absolute threshold is wrong (and would penalize darker skin).
 *
 * `goodAt` = the tier's median redness delta (a typical, unflagged face).
 * `badAt`  = the tier's 85th percentile (genuinely elevated for that tone).
 */
interface TierThreshold {
  goodAt: number;
  badAt: number;
}

interface Calibration {
  generatedFrom: string;
  sampleCount: number;
  metric: string;
  skinTone: Record<string, { n: number; itaMedian: number; monkMedian: number }>;
  rednessThresholds: Record<string, TierThreshold>;
}

export const CALIBRATION = calibrationData as Calibration;

/** Per-tier redness-delta threshold, falling back to the light tier. */
export function rednessThresholdFor(tier: SkinTone["tier"]): TierThreshold {
  return (
    CALIBRATION.rednessThresholds[tier] ??
    CALIBRATION.rednessThresholds.light ?? { goodAt: 2, badAt: 14 }
  );
}

/** Whether a real calibration (non-empty sample) backs these numbers. */
export const IS_CALIBRATED = CALIBRATION.sampleCount > 0;
export const CALIBRATION_SAMPLE_COUNT = CALIBRATION.sampleCount;
