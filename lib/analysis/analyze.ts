import { deriveRegions } from "@/lib/vision/regions";
import type { ScanResult } from "@/lib/vision/types";
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
  /** Approximate skin tone (ITA → Monk), null if no baseline skin sampled. */
  skinTone: SkinTone | null;
}

/** Concern weights for the composite. Documented in docs/DECISIONS.md. */
const WEIGHTS: Record<ConcernId, number> = {
  redness: 0.3,
  evenness: 0.25,
  underEye: 0.25,
  texture: 0.2,
};

function avg(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
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

/**
 * Turn a multi-frame scan into a per-concern + composite skin assessment.
 * Color concerns read the temporally averaged region colors; texture reads the
 * single sharpest final frame. All concern logic is relative-to-baseline.
 */
export function analyzeScan(result: ScanResult): SkinAnalysis {
  const lab = toLab(result.regionStats);

  // Skin tone first — redness thresholds are tone-relative (data-driven).
  const baseline = baselineSkinLab(lab);
  const skinTone = baseline ? classifySkinTone(baseline) : null;

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
  const regions = deriveRegions(
    result.landmarks,
    result.width,
    result.height,
  );
  const half = (r: { radius: number }) => Math.max(4, Math.round(r.radius * 0.8));
  const byIds = (ids: string[]) =>
    (regions ?? []).filter((r) => ids.includes(r.id));

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

  const baseline = baselineSkinLab(lab);
  const skinTone = baseline ? classifySkinTone(baseline) : null;

  return { overallScore, concerns, skinTone };
}
