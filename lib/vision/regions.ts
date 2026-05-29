import type { Landmark, Point2D, RegionId } from "./types";

/**
 * Derives the skin-sampling regions from a small set of high-confidence
 * FaceMesh anchor landmarks, rather than hardcoding dozens of brittle polygon
 * indices. We build a tilt-robust local coordinate frame from the eye axis and
 * the eye→chin axis, then place each region as an offset (in units of the
 * inter-eye distance `d`) along that frame. This degrades gracefully under head
 * tilt and is easy to reason about.
 *
 * Anchor indices are the canonical, stable MediaPipe FaceMesh points:
 *   33/133  → subject-right eye corners      362/263 → subject-left eye corners
 *   4       → nose tip                        10      → forehead top
 *   152     → chin
 */
const ANCHOR = {
  rightEyeOuter: 33,
  rightEyeInner: 133,
  leftEyeInner: 362,
  leftEyeOuter: 263,
  noseTip: 4,
  foreheadTop: 10,
  chin: 152,
} as const;

export interface RegionCircle {
  id: RegionId;
  center: Point2D;
  radius: number;
}

function toPixel(lm: Landmark, width: number, height: number): Point2D {
  return { x: lm.x * width, y: lm.y * height };
}

function mid(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function lerp(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function sub(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

function len(v: Point2D): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Point2D): Point2D {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
}

function dot(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

function offset(base: Point2D, right: Point2D, down: Point2D, ru: number, du: number, d: number): Point2D {
  return {
    x: base.x + right.x * ru * d + down.x * du * d,
    y: base.y + right.y * ru * d + down.y * du * d,
  };
}

/**
 * Returns the six sampling regions in pixel coordinates, or null if the face
 * is too small / landmarks are degenerate to sample meaningfully.
 */
export function deriveRegions(
  landmarks: Landmark[],
  width: number,
  height: number,
): RegionCircle[] | null {
  if (landmarks.length <= ANCHOR.leftEyeOuter) return null;

  const px = (i: number) => toPixel(landmarks[i], width, height);

  const eyeR = mid(px(ANCHOR.rightEyeOuter), px(ANCHOR.rightEyeInner));
  const eyeL = mid(px(ANCHOR.leftEyeInner), px(ANCHOR.leftEyeOuter));
  const eyeMid = mid(eyeR, eyeL);
  const chin = px(ANCHOR.chin);
  const noseTip = px(ANCHOR.noseTip);
  const foreheadTop = px(ANCHOR.foreheadTop);

  const d = len(sub(eyeL, eyeR));
  if (d < 24) return null; // face too small for reliable sampling

  // Local frame: `right` along the eye axis, `down` perpendicular toward chin.
  const right = normalize(sub(eyeL, eyeR));
  let down = { x: -right.y, y: right.x };
  if (dot(down, sub(chin, eyeMid)) < 0) down = { x: -down.x, y: -down.y };

  // All offsets are in units of the inter-eye distance `d`, so the regions
  // scale with face size and ride the tilt-robust local frame. Cheeks sit
  // outward on the "apples" (clear of nose, lips and beard line); under-eye
  // sits directly below each eye; the forehead is sampled as a band (centre +
  // both sides) — that's where horizontal lines form, so it earns more coverage.
  const foreheadMid = lerp(eyeMid, foreheadTop, 0.48);
  const regions: RegionCircle[] = [
    { id: "forehead", center: foreheadMid, radius: 0.17 * d },
    { id: "foreheadLeft", center: offset(foreheadMid, right, down, 0.5, 0, d), radius: 0.14 * d },
    { id: "foreheadRight", center: offset(foreheadMid, right, down, -0.5, 0, d), radius: 0.14 * d },
    { id: "rightCheek", center: offset(eyeR, right, down, -0.45, 0.62, d), radius: 0.15 * d },
    { id: "leftCheek", center: offset(eyeL, right, down, 0.45, 0.62, d), radius: 0.15 * d },
    { id: "underEyeRight", center: offset(eyeR, right, down, -0.05, 0.36, d), radius: 0.1 * d },
    { id: "underEyeLeft", center: offset(eyeL, right, down, 0.05, 0.36, d), radius: 0.1 * d },
    { id: "noseTzone", center: lerp(eyeMid, noseTip, 0.5), radius: 0.11 * d },
  ];

  return regions;
}

export const REGION_ANCHORS = ANCHOR;
