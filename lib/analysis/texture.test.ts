import { describe, it, expect } from "vitest";
import { laplacianVariance, horizontalLineEnergy } from "./texture";
import type { ImageLike } from "@/lib/vision/sampling";

function build(
  w: number,
  h: number,
  valueAt: (x: number, y: number) => number,
): ImageLike {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = valueAt(x, y);
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

const W = 60;
const H = 60;
const center = { x: 30, y: 30 };
const half = 20;

describe("laplacianVariance", () => {
  it("is ~0 for a flat patch", () => {
    const flat = build(W, H, () => 128);
    expect(laplacianVariance(flat, center, half)).toBeLessThan(0.001);
  });
  it("is high for a busy patch", () => {
    const busy = build(W, H, (x, y) => ((x + y) % 2 === 0 ? 40 : 210));
    expect(laplacianVariance(busy, center, half)).toBeGreaterThan(0.01);
  });
});

describe("horizontalLineEnergy", () => {
  it("is ~0 for a flat patch", () => {
    const flat = build(W, H, () => 128);
    expect(horizontalLineEnergy(flat, center, half)).toBeLessThan(0.001);
  });

  it("is high for horizontal stripes (forehead-line orientation)", () => {
    const horizontal = build(W, H, (_x, y) => (y % 4 < 2 ? 70 : 200));
    expect(horizontalLineEnergy(horizontal, center, half)).toBeGreaterThan(0.1);
  });

  it("stays low for vertical stripes (not the line orientation we target)", () => {
    const vertical = build(W, H, (x) => (x % 4 < 2 ? 70 : 200));
    const horizontalEnergy = horizontalLineEnergy(vertical, center, half);
    const horizontalStripes = build(W, H, (_x, y) => (y % 4 < 2 ? 70 : 200));
    // Vertical stripes produce far less horizontal-line energy than horizontal ones.
    expect(horizontalEnergy).toBeLessThan(
      horizontalLineEnergy(horizontalStripes, center, half) / 2,
    );
  });
});
