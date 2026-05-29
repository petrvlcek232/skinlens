import { describe, it, expect } from "vitest";
import { sampleDisk, type ImageLike } from "./sampling";

/** Build a solid-color RGBA image. */
function solidImage(width: number, height: number, rgb: [number, number, number]): ImageLike {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgb[0];
    data[i * 4 + 1] = rgb[1];
    data[i * 4 + 2] = rgb[2];
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

describe("sampleDisk", () => {
  it("captures the disk color from a solid image", () => {
    const image = solidImage(50, 50, [120, 80, 40]);
    const pixels = sampleDisk(image, { x: 25, y: 25 }, 10, 1);
    expect(pixels.length).toBeGreaterThan(0);
    for (const p of pixels) {
      expect(p).toEqual({ r: 120, g: 80, b: 40 });
    }
  });

  it("never samples outside image bounds", () => {
    const image = solidImage(20, 20, [10, 20, 30]);
    // Center near a corner with a radius that overruns the edges.
    const pixels = sampleDisk(image, { x: 1, y: 1 }, 15, 1);
    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.length).toBeLessThan(15 * 15 * 4);
  });

  it("respects the stride (subsamples)", () => {
    const image = solidImage(100, 100, [0, 0, 0]);
    const dense = sampleDisk(image, { x: 50, y: 50 }, 20, 1);
    const sparse = sampleDisk(image, { x: 50, y: 50 }, 20, 4);
    expect(sparse.length).toBeLessThan(dense.length);
  });
});
