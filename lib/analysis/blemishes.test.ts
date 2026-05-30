import { describe, it, expect } from "vitest";
import { detectSpots, spotDensityToScore } from "./blemishes";
import type { RGB } from "@/lib/vision/types";

function fill(rgb: [number, number, number], n: number): RGB[] {
  return Array.from({ length: n }, () => ({ r: rgb[0], g: rgb[1], b: rgb[2] }));
}

const CLEAR: [number, number, number] = [200, 160, 145]; // even skin
const RED_SPOT: [number, number, number] = [205, 110, 100]; // pimple (high a*)
const DARK_SPOT: [number, number, number] = [120, 85, 72]; // freckle (low L*)

describe("detectSpots", () => {
  it("returns near-zero density for clean, even skin", () => {
    const res = detectSpots(fill(CLEAR, 300));
    expect(res.density).toBeLessThan(0.05);
    expect(res.clearSkin.length).toBeGreaterThan(250);
  });

  it("flags red blemish pixels as spots", () => {
    const px = [...fill(CLEAR, 270), ...fill(RED_SPOT, 30)];
    const res = detectSpots(px);
    expect(res.density).toBeGreaterThan(0.05);
  });

  it("flags dark freckle pixels as spots and excludes them from clear skin", () => {
    const px = [...fill(CLEAR, 250), ...fill(DARK_SPOT, 50)];
    const res = detectSpots(px);
    expect(res.density).toBeGreaterThan(0.1);
    // clear skin should be mostly the even pixels, freckles removed
    expect(res.clearSkin.length).toBeLessThan(px.length);
    expect(res.clearSkin.length).toBeGreaterThan(200);
  });

  it("is tone-independent: same relative spotting on dark skin flags too", () => {
    const darkClear: [number, number, number] = [95, 65, 52];
    const darkSpot: [number, number, number] = [110, 45, 38]; // redder vs base
    const px = [...fill(darkClear, 270), ...fill(darkSpot, 30)];
    expect(detectSpots(px).density).toBeGreaterThan(0.05);
  });

  it("returns safe defaults for too few pixels", () => {
    const res = detectSpots(fill(CLEAR, 10));
    expect(res.density).toBe(0);
    expect(res.clearSkin.length).toBe(10);
  });
});

describe("spotDensityToScore", () => {
  it("scores clean skin 100", () => {
    expect(spotDensityToScore(0.0)).toBe(100);
    expect(spotDensityToScore(0.03)).toBe(100);
  });
  it("bottoms out for severe density", () => {
    expect(spotDensityToScore(0.25)).toBe(30);
    expect(spotDensityToScore(0.6)).toBe(30);
  });
  it("is monotonic decreasing in between", () => {
    expect(spotDensityToScore(0.08)).toBeGreaterThan(spotDensityToScore(0.18));
  });
});
