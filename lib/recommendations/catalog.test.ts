import { describe, it, expect } from "vitest";
import { CATALOG, productById } from "./catalog";
import type { ConcernId } from "@/lib/analysis/analyze";

const CONCERNS: ConcernId[] = ["redness", "evenness", "underEye", "texture"];
const CATEGORIES = ["cleanser", "serum", "exfoliant", "eye", "moisturizer", "spf"];

describe("product catalog integrity", () => {
  it("has unique ids", () => {
    const ids = CATALOG.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every product has the required real-data fields", () => {
    for (const p of CATALOG) {
      expect(p.brand.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.keyActives.length).toBeGreaterThan(0);
      expect(p.priceUsd).toBeGreaterThan(0);
      expect(p.blurb.length).toBeGreaterThan(0);
      expect(p.sourceUrl).toMatch(/^https:\/\//);
      expect(CATEGORIES).toContain(p.category);
    }
  });

  it("targets only use valid concern ids", () => {
    for (const p of CATALOG) {
      for (const t of p.targets) expect(CONCERNS).toContain(t);
    }
  });

  it("covers every concern with at least one product", () => {
    for (const c of CONCERNS) {
      expect(CATALOG.some((p) => p.targets.includes(c))).toBe(true);
    }
  });

  it("has a neutral core product in each core category (cleanser/moisturizer/spf path)", () => {
    // The default routine needs a non-concern-specific cleanser and moisturizer.
    expect(CATALOG.some((p) => p.category === "cleanser" && p.targets.length === 0)).toBe(true);
    expect(CATALOG.some((p) => p.category === "moisturizer" && p.targets.length === 0)).toBe(true);
  });

  it("keeps blurbs short (paraphrase, not copied marketing)", () => {
    for (const p of CATALOG) {
      expect(p.blurb.split(/\s+/).length).toBeLessThanOrEqual(16);
    }
  });

  it("productById resolves a known id and rejects unknown", () => {
    expect(productById(CATALOG[0].id)?.id).toBe(CATALOG[0].id);
    expect(productById("nope")).toBeUndefined();
  });
});
