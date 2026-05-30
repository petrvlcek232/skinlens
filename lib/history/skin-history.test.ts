import { describe, it, expect } from "vitest";
import { appendCapped, type HistoryEntry } from "./skin-history";

const e = (t: number, score: number): HistoryEntry => ({ t, score });

describe("appendCapped", () => {
  it("appends to the end", () => {
    expect(appendCapped([e(1, 80)], e(2, 85))).toEqual([e(1, 80), e(2, 85)]);
  });

  it("keeps only the most recent `cap` entries", () => {
    const list = Array.from({ length: 12 }, (_, i) => e(i, 50 + i));
    const out = appendCapped(list, e(99, 95), 12);
    expect(out).toHaveLength(12);
    expect(out[0]).toEqual(e(1, 51)); // oldest dropped
    expect(out[out.length - 1]).toEqual(e(99, 95)); // newest kept
  });

  it("does not mutate the input", () => {
    const list = [e(1, 80)];
    appendCapped(list, e(2, 85));
    expect(list).toEqual([e(1, 80)]);
  });
});
