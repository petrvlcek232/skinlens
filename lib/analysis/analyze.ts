import { deriveRegions } from "@/lib/vision/regions";
import { sampleDisk } from "@/lib/vision/sampling";
import { rgbToLab } from "@/lib/vision/color";
import type { LAB, RGB, ScanResult } from "@/lib/vision/types";
import {
  toLab,
  baselineSkinLab,
  rednessDelta,
  underEyeDelta,
  toneSpread,
  scoreFromDelta,
} from "./metrics";
import { laplacianVariance, horizontalLineEnergy } from "./texture";
import { classifySkinTone, type SkinTone } from "@/lib/vision/skin-tone";
import { rednessThresholdFor } from "./calibration";
import { detectSpots, spotDensityToScore } from "./blemishes";

export type ConcernId =
  | "redness"
  | "evenness"
  | "underEye"
  | "texture"
  | "blemishes";
export type Severity = "good" | "moderate" | "attention";

export interface ConcernResult {
  id: ConcernId;
  label: string;
  /** 0–100 health score (higher = healthier). */
  score: number;
  severity: Severity;
  detail: string;
}

export interface SkinAnalysis {
  /** 0–100 weighted composite (higher = healthier). */
  overallScore: number;
  concerns: ConcernResult[];
  /** Approximate skin tone (ITA → Monk), null if no baseline skin sampled. */
  skinTone: SkinTone | null;
}

/** Concern weights for the composite. Documented in docs/DECISIONS.md. */
// Rebalanced to make room for blemishes (the most visually salient concern on
// problem skin — a test photo with heavy acne scoring "Worth watching" exposed
// that omitting it over-scored such faces; see BUILD-JOURNAL phase 13 / ADR-020).
const WEIGHTS: Record<ConcernId, number> = {
  blemishes: 0.3,
  redness: 0.25,
  evenness: 0.2,
  underEye: 0.15,
  texture: 0.1,
};

function avg(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}

/** Mean CIELAB over a set of RGB pixels. */
function meanLab(pixels: RGB[]): LAB {
  const labs = pixels.map(rgbToLab);
  return {
    l: avg(labs.map((c) => c.l)),
    a: avg(labs.map((c) => c.a)),
    b: avg(labs.map((c) => c.b)),
  };
}

function severityOf(score: number): Severity {
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "attention";
}

function rednessDetail(delta: number): string {
  if (delta <= 2) return "Even redness across your face — no notable flushing.";
  if (delta <= 8) return "Slightly more redness through the cheeks and nose.";
  return "Noticeably more redness in the central face — possible sensitivity.";
}

function evennessDetail(spread: number): string {
  if (spread <= 3) return "Very even tone from forehead to cheeks.";
  if (spread <= 9) return "Mostly even tone with mild variation between zones.";
  return "Uneven tone across zones — some areas markedly lighter or darker.";
}

function underEyeDetail(delta: number): string {
  if (delta <= 2) return "Under-eye area matches your cheeks — bright and even.";
  if (delta <= 9) return "Under-eye area is a little darker than your cheeks.";
  return "Under-eye area is notably darker than your cheeks.";
}

function textureDetail(score: number): string {
  if (score >= 75) return "Forehead reads smooth — little visible texture or lines.";
  if (score >= 50) return "Some texture and fine lines across the forehead.";
  return "Pronounced lines/texture on the forehead — heuristic estimate, lighting-sensitive.";
}

function blemishDetail(score: number): string {
  if (score >= 75) return "Few spots detected — skin reads mostly clear.";
  if (score >= 50) return "Some spots/blemishes across the cheeks and forehead.";
  return "Many spots detected — heuristic density, not a clinical acne grade.";
}

/**
 * Turn a multi-frame scan into a per-concern + composite skin assessment.
 * Color concerns read the temporally averaged region colors; texture reads the
 * single sharpest final frame. All concern logic is relative-to-baseline.
 */
export function analyzeScan(result: ScanResult): SkinAnalysis {
  const lab = toLab(result.regionStats);

  const regions = deriveRegions(
    result.landmarks,
    result.width,
    result.height,
  );
  const half = (r: { radius: number }) => Math.max(4, Math.round(r.radius * 0.8));
  const byIds = (ids: string[]) =>
    (regions ?? []).filter((r) => ids.includes(r.id));

  // Spot/blemish detection over cheeks + forehead + nose pixels. One pass yields
  // both the blemish-density concern AND a clear-skin pixel set used for a
  // freckle-robust tone estimate (excluding spots so freckles don't darken ITA).
  const skinZones = byIds([
    "leftCheek",
    "rightCheek",
    "forehead",
    "foreheadLeft",
    "foreheadRight",
    "noseTzone",
  ]);
  const skinPixels: RGB[] = skinZones.flatMap((r) =>
    sampleDisk(result.imageData, r.center, r.radius, 2),
  );
  const spots = detectSpots(skinPixels);
  const blemishes = spotDensityToScore(spots.density);

  // Skin tone — prefer the freckle-robust clear-skin mean; fall back to the
  // region-median baseline if too few clear pixels.
  const clearLab: LAB | null =
    spots.clearSkin.length >= 50 ? meanLab(spots.clearSkin) : baselineSkinLab(lab);
  const skinTone = clearLab ? classifySkinTone(clearLab) : null;

  // Redness uses calibrated, tone-aware thresholds from the labeled-dataset
  // calibration (lib/analysis/calibration.json) instead of hand-picked numbers.
  const redDelta = rednessDelta(lab);
  const redThresh = rednessThresholdFor(skinTone?.tier ?? "light");
  const redness = scoreFromDelta(redDelta, redThresh.goodAt, redThresh.badAt);

  const ueDelta = underEyeDelta(lab);
  const underEye = scoreFromDelta(ueDelta, 2, 16);

  const spread = toneSpread(lab);
  const evenness = scoreFromDelta(spread, 3, 14, 45);

  // Texture & fine lines: the forehead band gives horizontal-line energy (brow
  // lines run horizontally); crow's feet and nasolabial folds add isotropic
  // texture from the other line-prone zones that matter most for mature skin.

  const forehead = byIds(["forehead", "foreheadLeft", "foreheadRight"]);
  const lineZones = byIds([
    "outerEyeLeft",
    "outerEyeRight",
    "nasolabialLeft",
    "nasolabialRight",
  ]);

  let texture = 100;
  if (forehead.length > 0) {
    const foreheadLine = avg(
      forehead.map((p) =>
        horizontalLineEnergy(result.imageData, p.center, half(p)),
      ),
    );
    const allTexture = avg(
      [...forehead, ...lineZones].map((p) =>
        laplacianVariance(result.imageData, p.center, half(p)),
      ),
    );
    const lineScore = scoreFromDelta(foreheadLine, 0.04, 0.12, 40);
    const texScore = scoreFromDelta(allTexture, 0.002, 0.02, 40);
    texture = Math.round(0.5 * lineScore + 0.5 * texScore);
  }

  const concerns: ConcernResult[] = [
    {
      id: "blemishes",
      label: "Spots & blemishes",
      score: blemishes,
      severity: severityOf(blemishes),
      detail: blemishDetail(blemishes),
    },
    {
      id: "redness",
      label: "Redness & sensitivity",
      score: redness,
      severity: severityOf(redness),
      detail: rednessDetail(redDelta),
    },
    {
      id: "evenness",
      label: "Tone evenness",
      score: evenness,
      severity: severityOf(evenness),
      detail: evennessDetail(spread),
    },
    {
      id: "underEye",
      label: "Under-eye area",
      score: underEye,
      severity: severityOf(underEye),
      detail: underEyeDetail(ueDelta),
    },
    {
      id: "texture",
      label: "Texture & fine lines",
      score: texture,
      severity: severityOf(texture),
      detail: textureDetail(texture),
    },
  ];

  const overallScore = Math.round(
    concerns.reduce((sum, c) => sum + c.score * WEIGHTS[c.id], 0),
  );

  return { overallScore, concerns, skinTone };
}
