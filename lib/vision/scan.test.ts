import { describe, it, expect } from "vitest";
import {
  robustRegionColor,
  createAccumulator,
  accumulateFrame,
  finalizeScan,
} from "./scan";
import type { RGB, SampledRegion } from "./types";

function fill(rgb: [number, number, number], n: number): RGB[] {
  return Array.from({ length: n }, () => ({ r: rgb[0], g: rgb[1], b: rgb[2] }));
}

function region(id: SampledRegion["id"], pixels: RGB[]): SampledRegion {
  return { id, center: { x: 0, y: 0 }, radius: 1, pixels };
}

describe("robustRegionColor", () => {
  it("returns null for too few pixels", () => {
    expect(robustRegionColor(fill([100, 80, 70], 3))).toBeNull();
  });

  it("returns the skin color from a clean region", () => {
    const color = robustRegionColor(fill([120, 90, 80], 200));
    expect(color).toEqual({ r: 120, g: 90, b: 80 });
  });

  it("rejects bright glare outliers and keeps the skin median", () => {
    // 200 skin pixels + 20 blown-out highlight pixels.
    const pixels = [...fill([120, 90, 80], 200), ...fill([255, 255, 255], 20)];
    const color = robustRegionColor(pixels)!;
    expect(color.r).toBe(120);
    expect(color.g).toBe(90);
    expect(color.b).toBe(80);
  });

  it("rejects dark beard/shadow outliers", () => {
    const pixels = [...fill([150, 110, 95], 200), ...fill([12, 10, 9], 25)];
    const color = robustRegionColor(pixels)!;
    expect(color).toEqual({ r: 150, g: 110, b: 95 });
  });

  it("rejects green background bleed (G > R) and keeps the skin median", () => {
    // 200 skin pixels + 80 grass-green background pixels leaking into the region.
    const pixels = [...fill([150, 110, 95], 200), ...fill([60, 150, 70], 80)];
    const color = robustRegionColor(pixels)!;
    expect(color).toEqual({ r: 150, g: 110, b: 95 });
  });

  it("rejects blue background bleed (B > R)", () => {
    const pixels = [...fill([150, 110, 95], 200), ...fill([60, 90, 200], 80)];
    const color = robustRegionColor(pixels)!;
    expect(color).toEqual({ r: 150, g: 110, b: 95 });
  });

  it("keeps dark skin (tone-robust skin gate, no brightness floor)", () => {
    // Dark but valid skin (R ≥ G ≥ B) must survive the skin gate untouched.
    expect(robustRegionColor(fill([74, 52, 42], 200))).toEqual({ r: 74, g: 52, b: 42 });
  });

  it("falls back to all pixels if the skin gate leaves too few", () => {
    // Mostly green (unusual), so the gate would over-thin — don't return null.
    const pixels = [...fill([60, 150, 70], 200), ...fill([150, 110, 95], 5)];
    expect(robustRegionColor(pixels)).not.toBeNull();
  });
});

describe("scan accumulation", () => {
  it("averages a region across frames via median and counts frames", () => {
    const acc = createAccumulator();
    // Three frames, slightly varying skin color (simulating flicker).
    accumulateFrame(acc, [region("leftCheek", fill([118, 88, 78], 100))]);
    accumulateFrame(acc, [region("leftCheek", fill([122, 92, 82], 100))]);
    accumulateFrame(acc, [region("leftCheek", fill([120, 90, 80], 100))]);

    expect(acc.frames).toBe(3);
    const stats = finalizeScan(acc);
    expect(stats).toHaveLength(1);
    expect(stats[0].id).toBe("leftCheek");
    expect(stats[0].frameCount).toBe(3);
    // Median of the three frames.
    expect(stats[0].color).toEqual({ r: 120, g: 90, b: 80 });
    expect(stats[0].avgPixelCount).toBe(100);
  });

  it("ignores frames where a region had too few pixels", () => {
    const acc = createAccumulator();
    accumulateFrame(acc, [region("forehead", fill([100, 80, 70], 2))]);
    expect(acc.frames).toBe(0);
    expect(finalizeScan(acc)).toHaveLength(0);
  });
});
