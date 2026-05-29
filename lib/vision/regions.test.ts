import { describe, it, expect } from "vitest";
import { deriveRegions, REGION_ANCHORS, type RegionCircle } from "./regions";
import type { Landmark, RegionId } from "./types";

/**
 * Build a 478-landmark array with the anchor points placed for a frontal face,
 * optionally rotated by `deg` around the image center to test tilt-robustness.
 * Only the anchor indices matter to deriveRegions; the rest stay at origin.
 */
function syntheticFace(deg = 0): Landmark[] {
  const base: Record<number, [number, number]> = {
    [REGION_ANCHORS.rightEyeOuter]: [0.4, 0.42],
    [REGION_ANCHORS.rightEyeInner]: [0.46, 0.42],
    [REGION_ANCHORS.leftEyeInner]: [0.54, 0.42],
    [REGION_ANCHORS.leftEyeOuter]: [0.6, 0.42],
    [REGION_ANCHORS.noseTip]: [0.5, 0.55],
    [REGION_ANCHORS.foreheadTop]: [0.5, 0.28],
    [REGION_ANCHORS.chin]: [0.5, 0.78],
  };

  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = ([x, y]: [number, number]): [number, number] => {
    const dx = x - 0.5;
    const dy = y - 0.5;
    return [0.5 + dx * cos - dy * sin, 0.5 + dx * sin + dy * cos];
  };

  const landmarks: Landmark[] = Array.from({ length: 478 }, () => ({
    x: 0,
    y: 0,
    z: 0,
  }));
  for (const [idx, pt] of Object.entries(base)) {
    const [x, y] = rotate(pt);
    landmarks[Number(idx)] = { x, y, z: 0 };
  }
  return landmarks;
}

function byId(regions: RegionCircle[]): Record<RegionId, RegionCircle> {
  return Object.fromEntries(regions.map((r) => [r.id, r])) as Record<
    RegionId,
    RegionCircle
  >;
}

const W = 1000;
const H = 1000;

describe("deriveRegions", () => {
  it("returns null when the face is too small / landmarks degenerate", () => {
    const tiny = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    expect(deriveRegions(tiny, W, H)).toBeNull();
  });

  it("returns null when there aren't enough landmarks", () => {
    const few = Array.from({ length: 100 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    expect(deriveRegions(few, W, H)).toBeNull();
  });

  it("produces all six regions with positive radii inside the frame", () => {
    const regions = deriveRegions(syntheticFace(), W, H);
    expect(regions).not.toBeNull();
    expect(regions!).toHaveLength(6);
    for (const r of regions!) {
      expect(r.radius).toBeGreaterThan(0);
      expect(r.center.x).toBeGreaterThan(0);
      expect(r.center.x).toBeLessThan(W);
      expect(r.center.y).toBeGreaterThan(0);
      expect(r.center.y).toBeLessThan(H);
    }
  });

  it("places regions anatomically: forehead high, cheeks low & outward, under-eye between", () => {
    const r = byId(deriveRegions(syntheticFace(), W, H)!);
    const eyeLine = 0.42 * H;
    const center = 0.5 * W;

    // Forehead above the eye line; cheeks and nose below it.
    expect(r.forehead.center.y).toBeLessThan(eyeLine);
    expect(r.leftCheek.center.y).toBeGreaterThan(eyeLine);
    expect(r.rightCheek.center.y).toBeGreaterThan(eyeLine);

    // Cheeks sit outward of the face center; under-eye stays near center.
    expect(r.rightCheek.center.x).toBeLessThan(r.underEyeRight.center.x);
    expect(r.underEyeRight.center.x).toBeLessThan(center);
    expect(r.leftCheek.center.x).toBeGreaterThan(r.underEyeLeft.center.x);
    expect(r.underEyeLeft.center.x).toBeGreaterThan(center);

    // Cheeks are lower than the under-eye patches.
    expect(r.rightCheek.center.y).toBeGreaterThan(r.underEyeRight.center.y);
    expect(r.leftCheek.center.y).toBeGreaterThan(r.underEyeLeft.center.y);

    // Left/right symmetry about the face center for a frontal face.
    expect(Math.abs(center - r.rightCheek.center.x)).toBeCloseTo(
      Math.abs(r.leftCheek.center.x - center),
      5,
    );
  });

  it("is tilt-robust: a 20° head tilt keeps every region in-frame and sized", () => {
    const regions = deriveRegions(syntheticFace(20), W, H);
    expect(regions).not.toBeNull();
    expect(regions!).toHaveLength(6);
    for (const r of regions!) {
      expect(r.radius).toBeGreaterThan(0);
      expect(r.center.x).toBeGreaterThan(0);
      expect(r.center.x).toBeLessThan(W);
      expect(r.center.y).toBeGreaterThan(0);
      expect(r.center.y).toBeLessThan(H);
    }
  });

  it("scales region radius with face size (proportional to inter-eye distance)", () => {
    const normal = byId(deriveRegions(syntheticFace(), W, H)!);
    // A face half the size: squeeze anchors toward center.
    const small = syntheticFace().map((p) => ({
      x: 0.5 + (p.x - 0.5) * 0.5,
      y: 0.5 + (p.y - 0.5) * 0.5,
      z: 0,
    }));
    const smaller = byId(deriveRegions(small, W, H)!);
    expect(smaller.forehead.radius).toBeLessThan(normal.forehead.radius);
  });
});
