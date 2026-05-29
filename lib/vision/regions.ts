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
  mouthRight: 61,
  mouthLeft: 291,
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
  if (landmarks.length <= ANCHOR.mouthLeft) return null;

  const px = (i: number) => toPixel(landmarks[i], width, height);

  const eyeR = mid(px(ANCHOR.rightEyeOuter), px(ANCHOR.rightEyeInner));
  const eyeL = mid(px(ANCHOR.leftEyeInner), px(ANCHOR.leftEyeOuter));
  const eyeMid = mid(eyeR, eyeL);
  const chin = px(ANCHOR.chin);
  const noseTip = px(ANCHOR.noseTip);
  const foreheadTop = px(ANCHOR.foreheadTop);
  const mouthR = px(ANCHOR.mouthRight);
  const mouthL = px(ANCHOR.mouthLeft);
  const mouthMid = mid(mouthR, mouthL);

  const d = len(sub(eyeL, eyeR));
  if (d < 24) return null; // face too small for reliable sampling

  // Local frame: `right` along the eye axis (toward the subject's left eye),
  // `down` perpendicular toward the chin. All offsets are in units of the
  // inter-eye distance `d`, so regions scale with face size and ride head tilt.
  const right = normalize(sub(eyeL, eyeR));
  let down = { x: -right.y, y: right.x };
  if (dot(down, sub(chin, eyeMid)) < 0) down = { x: -down.x, y: -down.y };

  // Coverage tuned for the core ICP (often mature skin): the forehead band sits
  // high (above the brow, where horizontal lines form), plus the line-prone
  // zones that matter most — crow's feet, nasolabial folds, perioral, chin.
  const foreheadMid = lerp(eyeMid, foreheadTop, 0.66);
  const regions: RegionCircle[] = [
    // Forehead band (raised above the brow).
    { id: "forehead", center: foreheadMid, radius: 0.16 * d },
    { id: "foreheadLeft", center: offset(foreheadMid, right, down, 0.5, 0, d), radius: 0.13 * d },
    { id: "foreheadRight", center: offset(foreheadMid, right, down, -0.5, 0, d), radius: 0.13 * d },
    // Crow's feet, just lateral to the outer eye corners — kept inside the face.
    { id: "outerEyeRight", center: offset(eyeR, right, down, -0.4, 0.12, d), radius: 0.09 * d },
    { id: "outerEyeLeft", center: offset(eyeL, right, down, 0.4, 0.12, d), radius: 0.09 * d },
    // Under-eye.
    { id: "underEyeRight", center: offset(eyeR, right, down, -0.05, 0.36, d), radius: 0.1 * d },
    { id: "underEyeLeft", center: offset(eyeL, right, down, 0.05, 0.36, d), radius: 0.1 * d },
    // Cheek apples.
    { id: "rightCheek", center: offset(eyeR, right, down, -0.45, 0.62, d), radius: 0.14 * d },
    { id: "leftCheek", center: offset(eyeL, right, down, 0.45, 0.62, d), radius: 0.14 * d },
    // Nose / T-zone.
    { id: "noseTzone", center: lerp(eyeMid, noseTip, 0.5), radius: 0.1 * d },
    // Nasolabial folds (nose-to-mouth), just above and lateral to mouth corners.
    { id: "nasolabialRight", center: offset(mouthR, right, down, -0.06, -0.28, d), radius: 0.1 * d },
    { id: "nasolabialLeft", center: offset(mouthL, right, down, 0.06, -0.28, d), radius: 0.1 * d },
    // Perioral: under the nose (philtrum) and the chin.
    { id: "upperLip", center: lerp(mouthMid, noseTip, 0.45), radius: 0.08 * d },
    { id: "chin", center: lerp(mouthMid, chin, 0.62), radius: 0.12 * d },
  ];

  return regions;
}

export const REGION_ANCHORS = ANCHOR;
