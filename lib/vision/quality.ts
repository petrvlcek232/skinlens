import type { Landmark } from "./types";

/** Live framing assessment used to gate capture and guide the user. */
export interface Framing {
  faceDetected: boolean;
  centered: boolean;
  sizeOk: boolean;
  /** True when the face is well-positioned enough to capture. */
  ready: boolean;
  /** Short human hint shown over the camera. */
  hint: string;
}

const NOT_DETECTED: Framing = {
  faceDetected: false,
  centered: false,
  sizeOk: false,
  ready: false,
  hint: "Position your face in the frame",
};

/**
 * Pure framing check from normalized landmarks. Computes the face bounding box
 * and decides whether it's centered and a sensible size. No pixels needed —
 * landmarks are already normalized to the frame.
 */
export function assessFraming(landmarks: Landmark[] | null): Framing {
  if (!landmarks || landmarks.length === 0) return NOT_DETECTED;

  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const w = maxX - minX;
  const h = maxY - minY;

  const centered = cx > 0.3 && cx < 0.7 && cy > 0.22 && cy < 0.78;
  const tooSmall = w < 0.18 || h < 0.24;
  const tooBig = w > 0.92 || h > 0.96;
  const sizeOk = !tooSmall && !tooBig;
  const ready = centered && sizeOk;

  let hint = "Hold still…";
  if (!centered) hint = "Center your face in the frame";
  else if (tooSmall) hint = "Move a little closer";
  else if (tooBig) hint = "Move back a little";
  else if (ready) hint = "Perfect — hold still";

  return { faceDetected: true, centered, sizeOk, ready, hint };
}
