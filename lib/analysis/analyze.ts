import { deriveRegions } from "@/lib/vision/regions";
import type { ScanResult } from "@/lib/vision/types";
import {
  toLab,
  rednessDelta,
  underEyeDelta,
  toneSpread,
  scoreFromDelta,
} from "./metrics";
import { laplacianVariance, horizontalLineEnergy } from "./texture";

export type ConcernId = "redness" | "evenness" | "underEye" | "texture";
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
}

/** Concern weights for the composite. Documented in docs/DECISIONS.md. */
const WEIGHTS: Record<ConcernId, number> = {
  redness: 0.3,
  evenness: 0.25,
  underEye: 0.25,
  texture: 0.2,
};

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

/**
 * Turn a multi-frame scan into a per-concern + composite skin assessment.
 * Color concerns read the temporally averaged region colors; texture reads the
 * single sharpest final frame. All concern logic is relative-to-baseline.
 */
export function analyzeScan(result: ScanResult): SkinAnalysis {
  const lab = toLab(result.regionStats);

  const redDelta = rednessDelta(lab);
  const redness = scoreFromDelta(redDelta, 2, 14);

  const ueDelta = underEyeDelta(lab);
  const underEye = scoreFromDelta(ueDelta, 2, 16);

  const spread = toneSpread(lab);
  const evenness = scoreFromDelta(spread, 3, 14, 45);

  // Texture & fine lines: read the forehead band (centre + both sides). Combine
  // isotropic texture (Laplacian variance) with horizontal-line energy, since
  // forehead expression lines run horizontally.
  const regions = deriveRegions(
    result.landmarks,
    result.width,
    result.height,
  );
  const foreheadPatches = (regions ?? []).filter(
    (r) =>
      r.id === "forehead" ||
      r.id === "foreheadLeft" ||
      r.id === "foreheadRight",
  );
  let texture = 100;
  if (foreheadPatches.length > 0) {
    let lapSum = 0;
    let lineSum = 0;
    for (const patch of foreheadPatches) {
      const half = Math.max(4, Math.round(patch.radius * 0.8));
      lapSum += laplacianVariance(result.imageData, patch.center, half);
      lineSum += horizontalLineEnergy(result.imageData, patch.center, half);
    }
    const lapScore = scoreFromDelta(lapSum / foreheadPatches.length, 0.002, 0.02, 40);
    const lineScore = scoreFromDelta(lineSum / foreheadPatches.length, 0.04, 0.12, 40);
    texture = Math.round(0.5 * lapScore + 0.5 * lineScore);
  }

  const concerns: ConcernResult[] = [
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

  return { overallScore, concerns };
}
