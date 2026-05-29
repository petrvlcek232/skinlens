import { describe, it, expect } from "vitest";
import { buildRoutine } from "./recommend";
import type {
  ConcernId,
  ConcernResult,
  Severity,
  SkinAnalysis,
} from "@/lib/analysis/analyze";

function severityOf(score: number): Severity {
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "attention";
}

const ALL: ConcernId[] = ["redness", "evenness", "underEye", "texture"];

function analysis(scores: Partial<Record<ConcernId, number>>): SkinAnalysis {
  const concerns: ConcernResult[] = ALL.map((id) => {
    const score = scores[id] ?? 90;
    return { id, label: id, score, severity: severityOf(score), detail: "" };
  });
  const overall = Math.round(
    concerns.reduce((s, c) => s + c.score, 0) / concerns.length,
  );
  return { overallScore: overall, concerns };
}

function slots(routine: ReturnType<typeof buildRoutine>) {
  return routine.steps.map((s) => s.slot);
}

describe("buildRoutine", () => {
  it("returns only the core routine for an all-good face", () => {
    const r = buildRoutine(analysis({}));
    expect(slots(r)).toEqual(["cleanse", "moisturize", "protect"]);
    expect(r.summary).toMatch(/maintain/i);
  });

  it("always includes SPF", () => {
    const r = buildRoutine(analysis({ redness: 30, underEye: 20 }));
    expect(r.steps.some((s) => s.product.category === "spf")).toBe(true);
  });

  it("uses a soothing cleanser and a redness serum when redness is flagged", () => {
    const r = buildRoutine(analysis({ redness: 40 }));
    const cleanse = r.steps.find((s) => s.slot === "cleanse")!;
    expect(cleanse.product.id).toBe("calm-gel-cleanser");
    const treat = r.steps.find((s) => s.slot === "treat");
    expect(treat?.product.targets).toContain("redness");
  });

  it("adds an eye step only when under-eye is flagged", () => {
    expect(slots(buildRoutine(analysis({})))).not.toContain("eyes");
    const r = buildRoutine(analysis({ underEye: 35 }));
    expect(slots(r)).toContain("eyes");
    expect(r.steps.find((s) => s.slot === "eyes")!.product.category).toBe("eye");
  });

  it("caps targeted serums at two even when many concerns are flagged", () => {
    const r = buildRoutine(
      analysis({ redness: 30, evenness: 35, texture: 40 }),
    );
    expect(r.steps.filter((s) => s.slot === "treat").length).toBeLessThanOrEqual(2);
  });

  it("is deterministic", () => {
    const input = analysis({ evenness: 45, texture: 55 });
    expect(buildRoutine(input)).toEqual(buildRoutine(input));
  });

  it("keeps steps in canonical order", () => {
    const r = buildRoutine(analysis({ redness: 30, underEye: 30 }));
    const order = ["cleanse", "treat", "eyes", "moisturize", "protect"];
    const idx = r.steps.map((s) => order.indexOf(s.slot));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
});
