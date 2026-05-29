import { describe, it, expect } from "vitest";
import { assessLighting } from "./lighting";
import type { RGB, RegionId, SampledRegion } from "./types";

function grayPixels(luma: number, n: number): RGB[] {
  return Array.from({ length: n }, () => ({ r: luma, g: luma, b: luma }));
}

function region(id: RegionId, luma: number, n = 80): SampledRegion {
  return { id, center: { x: 0, y: 0 }, radius: 1, pixels: grayPixels(luma, n) };
}

/** All six regions at one luminance level. */
function evenFace(luma: number): SampledRegion[] {
  return [
    region("forehead", luma),
    region("leftCheek", luma),
    region("rightCheek", luma),
    region("underEyeLeft", luma),
    region("underEyeRight", luma),
    region("noseTzone", luma),
  ];
}

describe("assessLighting", () => {
  it("passes even, well-lit mid-tone lighting", () => {
    const q = assessLighting(evenFace(130));
    expect(q.level).toBe("good");
    expect(q.ok).toBe(true);
    expect(q.score).toBeGreaterThan(80);
  });

  it("flags too-dark scenes", () => {
    const q = assessLighting(evenFace(8));
    expect(q.level).toBe("dim");
    expect(q.ok).toBe(false);
  });

  it("flags blown-out / too-bright scenes", () => {
    const q = assessLighting(evenFace(252));
    expect(q.level).toBe("bright");
    expect(q.ok).toBe(false);
  });

  it("flags uneven side lighting from left/right cheek delta", () => {
    const regions = evenFace(130);
    // Brighten one cheek, darken the other → strong side light.
    const left = regions.find((r) => r.id === "leftCheek")!;
    const right = regions.find((r) => r.id === "rightCheek")!;
    left.pixels = grayPixels(190, 80);
    right.pixels = grayPixels(90, 80);
    const q = assessLighting(regions);
    expect(q.level).toBe("uneven");
    expect(q.ok).toBe(false);
  });

  it("INCLUSIVITY: dark skin in adequate, even light passes (not flagged dim)", () => {
    // Darker but well-exposed and even — no clipping. Should be 'good', not 'dim'.
    const q = assessLighting(evenFace(62));
    expect(q.level).toBe("good");
    expect(q.ok).toBe(true);
  });

  it("returns a not-ok result when there are too few pixels", () => {
    const q = assessLighting([region("forehead", 130, 5)]);
    expect(q.ok).toBe(false);
  });
});
