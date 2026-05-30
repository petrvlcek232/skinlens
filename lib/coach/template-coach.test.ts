import { describe, it, expect } from "vitest";
import { templateCoach } from "./template-coach";
import type { SkinAnalysis, ConcernResult, ConcernId, Severity } from "@/lib/analysis/analyze";
import type { Routine } from "@/lib/recommendations/recommend";
import type { SkinTone } from "@/lib/vision/skin-tone";

function sev(score: number): Severity {
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "attention";
}

const ALL: ConcernId[] = ["blemishes", "redness", "evenness", "underEye", "texture"];

function analysis(scores: Partial<Record<ConcernId, number>>, tone?: SkinTone): SkinAnalysis {
  const concerns: ConcernResult[] = ALL.map((id) => {
    const score = scores[id] ?? 90;
    return { id, label: id, score, severity: sev(score), detail: "" };
  });
  const overall = Math.round(concerns.reduce((s, c) => s + c.score, 0) / concerns.length);
  return { overallScore: overall, concerns, skinTone: tone ?? null };
}

const emptyRoutine: Routine = { steps: [], summary: "A simple routine." };

describe("templateCoach", () => {
  it("produces a healthy-skin message when nothing is flagged", async () => {
    const msg = await templateCoach.generate({ analysis: analysis({}), routine: emptyRoutine });
    expect(msg.source).toBe("rule-based");
    expect(msg.headline.toLowerCase()).toContain("healthy");
    expect(msg.paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  it("names the worst concern in the headline when something is flagged", async () => {
    const msg = await templateCoach.generate({
      analysis: analysis({ blemishes: 40 }),
      routine: emptyRoutine,
    });
    expect(msg.headline.toLowerCase()).toContain("blemishes");
  });

  it("mentions skin tone when present and stays honest (not medical advice)", async () => {
    const tone: SkinTone = { ita: 30, monk: 5, tier: "medium", label: "Monk 5 · Medium" };
    const msg = await templateCoach.generate({
      analysis: analysis({ redness: 45 }, tone),
      routine: emptyRoutine,
    });
    const text = msg.paragraphs.join(" ").toLowerCase();
    expect(text).toContain("monk");
    expect(text).toContain("not medical advice");
  });

  it("offers follow-up questions a chat LLM could answer", async () => {
    const msg = await templateCoach.generate({
      analysis: analysis({ blemishes: 40 }),
      routine: emptyRoutine,
    });
    expect(msg.followUps.length).toBeGreaterThan(0);
    expect(msg.followUps.length).toBeLessThanOrEqual(3);
  });

  it("is deterministic — same input, same output", async () => {
    const a = analysis({ redness: 50, evenness: 45 });
    const m1 = await templateCoach.generate({ analysis: a, routine: emptyRoutine });
    const m2 = await templateCoach.generate({ analysis: a, routine: emptyRoutine });
    expect(m1).toEqual(m2);
  });
});
