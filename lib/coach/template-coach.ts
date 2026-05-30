import type { CoachInput, CoachMessage, CoachProvider } from "./types";
import type { ConcernResult } from "@/lib/analysis/analyze";
import { CONCERN_INFO } from "@/lib/clinical/dermatology";

/**
 * Deterministic, on-device "AI skin coach". Composes a natural-language reading
 * of a scan from the structured analysis + routine — no API, no network, fully
 * reproducible. It deliberately reads like an LLM summary, but every sentence is
 * traceable to a measured value. A real LLM provider would slot in behind the
 * same CoachProvider interface (see docs/AI-ARCHITECTURE.md + ./openai-coach.ts).
 */

function worstFirst(concerns: ConcernResult[]): ConcernResult[] {
  return [...concerns].sort((a, b) => a.score - b.score);
}

function band(score: number): string {
  if (score >= 75) return "in good shape";
  if (score >= 50) return "worth keeping an eye on";
  return "the area to focus on";
}

function joinNatural(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export class TemplateCoachProvider implements CoachProvider {
  readonly id = "template-v1";

  async generate(input: CoachInput): Promise<CoachMessage> {
    const { analysis, routine, name } = input;
    const who = name && name !== "Me" ? name : "your";
    const possessive = who === "your" ? "your" : `${who}'s`;

    const sorted = worstFirst(analysis.concerns);
    const flagged = sorted.filter((c) => c.severity !== "good");
    const top = sorted[0];
    const strong = [...analysis.concerns].sort((a, b) => b.score - a.score)[0];

    // Headline
    const headline =
      flagged.length === 0
        ? `${capitalize(possessive)} skin is looking healthy overall — score ${analysis.overallScore}.`
        : `${capitalize(possessive)} skin scores ${analysis.overallScore}; ${top.label.toLowerCase()} is ${band(top.score)}.`;

    const paragraphs: string[] = [];

    // 1. What we saw, grounded in tone + the standout concerns.
    const toneBit = analysis.skinTone
      ? ` Your skin tone reads around ${analysis.skinTone.label}, so the thresholds below are calibrated relative to that — not an absolute scale.`
      : "";
    paragraphs.push(
      flagged.length === 0
        ? `Across the regions we measured, everything came back even and clear. ${strong.label} was the strongest at ${strong.score}/100.${toneBit}`
        : `We measured ${analysis.concerns.length} areas. ${capitalize(top.label)} stood out most (${top.score}/100), while ${strong.label.toLowerCase()} was your strongest at ${strong.score}/100.${toneBit}`,
    );

    // 2. Why the top concern matters + the clinically-supported active.
    if (flagged.length > 0) {
      const info = CONCERN_INFO[top.id];
      const bestActive = info.ingredients[0];
      paragraphs.push(
        `${capitalize(top.label)}: ${info.summary} The most evidence-backed thing you can do is ${bestActive.name.toLowerCase()} — ${bestActive.action.toLowerCase()} (${bestActive.evidence} evidence).`,
      );
    }

    // 3. The routine, in one sentence.
    if (routine.steps.length > 0) {
      const steps = routine.steps.map((s) => s.product.name);
      paragraphs.push(
        `Based on this, a ${routine.steps.length}-step routine fits: ${joinNatural(steps)}. ${routine.summary}`,
      );
    }

    // 4. Honest framing.
    paragraphs.push(
      "This is a cosmetic, on-device estimate — not medical advice. If anything concerns you, a dermatologist is the right call.",
    );

    // Follow-ups a real chat LLM could answer next.
    const followUps: string[] = [];
    if (flagged.length > 0) {
      followUps.push(`How should I introduce ${CONCERN_INFO[top.id].ingredients[0].name} without irritation?`);
      followUps.push(`Can I use these products together, and in what order?`);
    }
    followUps.push("What lifestyle habits help the most here?");
    if (analysis.skinTone) {
      followUps.push("Why does skin tone change how you score redness?");
    }

    return {
      headline,
      paragraphs,
      followUps: followUps.slice(0, 3),
      source: "rule-based",
    };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const templateCoach = new TemplateCoachProvider();
