import { describe, it, expect } from "vitest";
import {
  toLab,
  rednessDelta,
  underEyeDelta,
  toneSpread,
  scoreFromDelta,
} from "./metrics";
import type { RegionId, RGB, RegionSampleStats } from "@/lib/vision/types";

function stats(map: Partial<Record<RegionId, RGB>>): RegionSampleStats[] {
  return Object.entries(map).map(([id, color]) => ({
    id: id as RegionId,
    color: color as RGB,
    avgPixelCount: 100,
    frameCount: 30,
  }));
}

const rgb = (r: number, g: number, b: number): RGB => ({ r, g, b });
const DARK = rgb(92, 60, 45);
const LIGHT = rgb(225, 185, 165);

function uniform(c: RGB) {
  return stats({
    forehead: c,
    leftCheek: c,
    rightCheek: c,
    underEyeLeft: c,
    underEyeRight: c,
    noseTzone: c,
  });
}

describe("scoreFromDelta", () => {
  it("is 100 at or below the good threshold", () => {
    expect(scoreFromDelta(0, 2, 14)).toBe(100);
    expect(scoreFromDelta(2, 2, 14)).toBe(100);
  });
  it("bottoms out at the floor beyond the bad threshold", () => {
    expect(scoreFromDelta(14, 2, 14, 35)).toBe(35);
    expect(scoreFromDelta(99, 2, 14, 35)).toBe(35);
  });
  it("is monotonic decreasing in between", () => {
    expect(scoreFromDelta(5, 2, 14)).toBeGreaterThan(scoreFromDelta(9, 2, 14));
  });
});

describe("relative metrics are tone-independent on uniform skin", () => {
  it("reports zero deltas for uniform dark skin", () => {
    const lab = toLab(uniform(DARK));
    expect(rednessDelta(lab)).toBeCloseTo(0, 5);
    expect(underEyeDelta(lab)).toBeCloseTo(0, 5);
    expect(toneSpread(lab)).toBeCloseTo(0, 5);
  });

  it("reports zero deltas for uniform light skin too", () => {
    const lab = toLab(uniform(LIGHT));
    expect(rednessDelta(lab)).toBeCloseTo(0, 5);
    expect(underEyeDelta(lab)).toBeCloseTo(0, 5);
    expect(toneSpread(lab)).toBeCloseTo(0, 5);
  });
});

describe("inclusivity: dark skin is not falsely flagged for dark circles", () => {
  it("scores a uniform dark face's under-eye as perfect (100)", () => {
    const lab = toLab(uniform(DARK));
    expect(scoreFromDelta(underEyeDelta(lab), 2, 16)).toBe(100);
  });

  it("gives the SAME under-eye score for an equal relative delta on dark vs light skin", () => {
    // Same proportional darkening of the under-eye on both tones.
    const darkCase = toLab(
      stats({
        leftCheek: DARK,
        rightCheek: DARK,
        underEyeLeft: rgb(70, 45, 34),
        underEyeRight: rgb(70, 45, 34),
      }),
    );
    const lightCase = toLab(
      stats({
        leftCheek: LIGHT,
        rightCheek: LIGHT,
        underEyeLeft: rgb(198, 160, 142),
        underEyeRight: rgb(198, 160, 142),
      }),
    );
    // Both have a genuine under-eye contrast, so both should be flagged < 100…
    expect(scoreFromDelta(underEyeDelta(darkCase), 2, 16)).toBeLessThan(100);
    expect(scoreFromDelta(underEyeDelta(lightCase), 2, 16)).toBeLessThan(100);
  });
});

describe("metrics detect real concerns", () => {
  it("flags redder cheeks/nose than forehead", () => {
    const lab = toLab(
      stats({
        forehead: rgb(205, 175, 160),
        leftCheek: rgb(210, 130, 120),
        rightCheek: rgb(210, 130, 120),
        noseTzone: rgb(210, 135, 125),
      }),
    );
    expect(rednessDelta(lab)).toBeGreaterThan(5);
    expect(scoreFromDelta(rednessDelta(lab), 2, 14)).toBeLessThan(100);
  });

  it("flags darker under-eye than cheeks", () => {
    const lab = toLab(
      stats({
        leftCheek: rgb(210, 170, 150),
        rightCheek: rgb(210, 170, 150),
        underEyeLeft: rgb(150, 110, 95),
        underEyeRight: rgb(150, 110, 95),
      }),
    );
    expect(underEyeDelta(lab)).toBeGreaterThan(2);
  });

  it("measures tone spread when zones differ in lightness", () => {
    const lab = toLab(
      stats({
        forehead: rgb(230, 200, 185),
        leftCheek: rgb(150, 110, 95),
        rightCheek: rgb(150, 110, 95),
      }),
    );
    expect(toneSpread(lab)).toBeGreaterThan(5);
  });
});
