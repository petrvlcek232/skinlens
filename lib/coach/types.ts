import type { SkinAnalysis } from "@/lib/analysis/analyze";
import type { Routine } from "@/lib/recommendations/recommend";

/**
 * The "AI skin coach" layer — a natural-language interpretation of a scan, the
 * kind of conversational summary Revieve's AI Beauty Advisor produces over
 * structured skin data.
 *
 * It's behind a provider interface ON PURPOSE: the demo ships a deterministic,
 * on-device implementation (no API key, no data leaving the device, reproducible
 * and free), but the seam is exactly where a real LLM provider would plug in.
 * See docs/AI-ARCHITECTURE.md.
 */

export interface CoachInput {
  analysis: SkinAnalysis;
  routine: Routine;
  /** The person this scan is for (profile name), if known. */
  name?: string;
}

export interface CoachMessage {
  /** One-line headline summarising the scan in plain language. */
  headline: string;
  /** 2–4 short paragraphs: what we saw, why it matters, what to do. */
  paragraphs: string[];
  /** A few suggested follow-up questions a real chat LLM could answer next. */
  followUps: string[];
  /** How this text was produced — surfaced in the UI for honesty. */
  source: "rule-based" | "llm";
}

export interface CoachProvider {
  readonly id: string;
  generate(input: CoachInput): Promise<CoachMessage>;
}
