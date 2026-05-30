import { describe, it, expect } from "vitest";
import {
  computeITA,
  itaToMonk,
  itaToTier,
  classifySkinTone,
} from "./skin-tone";

describe("computeITA", () => {
  it("gives a high positive angle for light skin (high L*, low b*)", () => {
    // Very light skin: L*≈75, b*≈15 → ITA well above 55°.
    const ita = computeITA({ l: 75, a: 10, b: 15 });
    expect(ita).toBeGreaterThan(55);
  });

  it("gives a low/negative angle for dark skin (low L*, moderate b*)", () => {
    // Deep skin: L*≈30, b*≈18 → L*-50 negative → ITA negative.
    const ita = computeITA({ l: 30, a: 12, b: 18 });
    expect(ita).toBeLessThan(0);
  });

  it("matches the textbook formula for a known point", () => {
    // L*=60, b*=10 → arctan(10/10)=45°.
    expect(computeITA({ l: 60, a: 0, b: 10 })).toBeCloseTo(45, 1);
  });

  it("does not blow up when b* is ~0", () => {
    const ita = computeITA({ l: 70, a: 0, b: 0 });
    expect(Number.isFinite(ita)).toBe(true);
  });
});

describe("itaToMonk", () => {
  it("maps very high ITA to Monk 1 (lightest)", () => {
    expect(itaToMonk(80)).toBe(1);
  });

  it("maps very low ITA to Monk 10 (darkest)", () => {
    expect(itaToMonk(-70)).toBe(10);
  });

  it("is monotonic non-increasing as ITA decreases", () => {
    const samples = [80, 60, 45, 30, 15, 5, -20, -40, -60];
    const monks = samples.map(itaToMonk);
    for (let i = 1; i < monks.length; i++) {
      expect(monks[i]).toBeGreaterThanOrEqual(monks[i - 1]);
    }
  });

  it("clamps to the 1–10 range", () => {
    expect(itaToMonk(999)).toBe(1);
    expect(itaToMonk(-999)).toBe(10);
  });
});

describe("itaToTier", () => {
  it("classifies light / medium / dark by ITA bands", () => {
    expect(itaToTier(50)).toBe("light");
    expect(itaToTier(25)).toBe("medium");
    expect(itaToTier(0)).toBe("dark");
  });
});

describe("classifySkinTone", () => {
  it("returns a coherent classification for a light tone", () => {
    const t = classifySkinTone({ l: 72, a: 12, b: 16 });
    expect(t.tier).toBe("light");
    expect(t.monk).toBeLessThanOrEqual(3);
    expect(t.label).toContain("Monk");
  });

  it("returns a coherent classification for a deep tone", () => {
    const t = classifySkinTone({ l: 32, a: 12, b: 18 });
    expect(t.tier).toBe("dark");
    expect(t.monk).toBeGreaterThanOrEqual(7);
  });

  it("rounds ITA to one decimal", () => {
    const t = classifySkinTone({ l: 60, a: 0, b: 10 });
    expect(t.ita).toBeCloseTo(45, 1);
  });
});
