import { describe, it, expect } from "vitest";
import { rgbToLab, rgbToHsl, luminanceL, stdDev, mean } from "./color";

describe("rgbToLab", () => {
  it("maps white to L*≈100, a*≈0, b*≈0", () => {
    const lab = rgbToLab({ r: 255, g: 255, b: 255 });
    expect(lab.l).toBeCloseTo(100, 0);
    expect(Math.abs(lab.a)).toBeLessThan(1);
    expect(Math.abs(lab.b)).toBeLessThan(1);
  });

  it("maps black to L*=0", () => {
    const lab = rgbToLab({ r: 0, g: 0, b: 0 });
    expect(lab.l).toBeCloseTo(0, 1);
  });

  it("gives pure red a strongly positive a* (redness axis)", () => {
    const lab = rgbToLab({ r: 255, g: 0, b: 0 });
    expect(lab.a).toBeGreaterThan(70);
  });

  it("gives green a negative a*", () => {
    const lab = rgbToLab({ r: 0, g: 255, b: 0 });
    expect(lab.a).toBeLessThan(0);
  });
});

describe("rgbToHsl", () => {
  it("maps pure red to h=0, s=1, l=0.5", () => {
    const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBeCloseTo(0, 1);
    expect(hsl.s).toBeCloseTo(1, 2);
    expect(hsl.l).toBeCloseTo(0.5, 2);
  });

  it("maps gray to zero saturation", () => {
    const hsl = rgbToHsl({ r: 128, g: 128, b: 128 });
    expect(hsl.s).toBeCloseTo(0, 5);
  });

  it("places green hue near 120°", () => {
    const hsl = rgbToHsl({ r: 0, g: 255, b: 0 });
    expect(hsl.h).toBeCloseTo(120, 1);
  });
});

describe("luminanceL", () => {
  it("ranks lighter pixels above darker ones", () => {
    expect(luminanceL({ r: 200, g: 200, b: 200 })).toBeGreaterThan(
      luminanceL({ r: 60, g: 60, b: 60 }),
    );
  });
});

describe("stdDev / mean", () => {
  it("returns 0 for empty input", () => {
    expect(stdDev([])).toBe(0);
    expect(mean([])).toBe(0);
  });

  it("computes population std dev", () => {
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5);
  });

  it("computes the mean", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });
});
