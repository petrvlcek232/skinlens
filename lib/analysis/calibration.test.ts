import { describe, it, expect } from "vitest";
import {
  CALIBRATION,
  rednessThresholdFor,
  IS_CALIBRATED,
} from "./calibration";

describe("calibration data", () => {
  it("is backed by a real dataset run (non-empty sample)", () => {
    expect(IS_CALIBRATED).toBe(true);
    expect(CALIBRATION.sampleCount).toBeGreaterThan(100);
  });

  it("documents the metric as the runtime redness delta", () => {
    expect(CALIBRATION.metric.toLowerCase()).toContain("cheeks");
    expect(CALIBRATION.metric.toLowerCase()).toContain("forehead");
  });

  it("has a tone tier for light / medium / dark", () => {
    for (const tier of ["light", "medium", "dark"]) {
      expect(CALIBRATION.skinTone[tier]).toBeDefined();
      expect(CALIBRATION.rednessThresholds[tier]).toBeDefined();
    }
  });

  it("tier Monk medians increase from light to dark (sanity of tone binning)", () => {
    expect(CALIBRATION.skinTone.light.monkMedian).toBeLessThan(
      CALIBRATION.skinTone.dark.monkMedian,
    );
  });
});

describe("rednessThresholdFor", () => {
  it("returns each tier's calibrated band", () => {
    for (const tier of ["light", "medium", "dark"] as const) {
      const t = rednessThresholdFor(tier);
      expect(t.goodAt).toBeLessThan(t.badAt); // good < bad always
    }
  });

  it("falls back to a sane default for an unknown tier", () => {
    // @ts-expect-error intentionally invalid tier
    const t = rednessThresholdFor("unknown");
    expect(t.goodAt).toBeLessThan(t.badAt);
  });
});
