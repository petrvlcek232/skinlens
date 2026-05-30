import type { CoachProvider, CoachInput, CoachMessage } from "./types";

/**
 * REFERENCE STUB — not wired in, not shipped. This is the exact seam where a real
 * LLM coach would replace the deterministic `TemplateCoachProvider`, behind the
 * same `CoachProvider` interface. It is intentionally inert (throws) so nothing
 * ever calls a network/model by accident in this privacy-first demo.
 *
 * Why it's only a stub here: shipping a real LLM would mean an API key in a
 * portfolio repo, the user's scan leaving the device, and a vector DB for RAG —
 * all of which contradict the on-device promise. The architecture, prompt shape
 * and RAG design are documented in docs/AI-ARCHITECTURE.md.
 *
 * Sketch of a real implementation (pseudocode, deliberately not runnable):
 *
 *   import OpenAI from "openai"; // or the Vercel AI SDK / AI Gateway
 *
 *   export class OpenAICoachProvider implements CoachProvider {
 *     readonly id = "openai-gpt";
 *     constructor(private client: OpenAI, private kb: IngredientVectorStore) {}
 *
 *     async generate(input: CoachInput): Promise<CoachMessage> {
 *       // 1. RAG: retrieve evidence snippets for the flagged concerns'
 *       //    actives from a vector store of dermatology references.
 *       const flagged = input.analysis.concerns.filter(c => c.severity !== "good");
 *       const context = await this.kb.search(flagged.map(c => c.id), { k: 6 });
 *
 *       // 2. Prompt the model with ONLY structured numbers + retrieved evidence
 *       //    (never the raw image — privacy), constrained to a JSON schema.
 *       const res = await this.client.responses.create({
 *         model: "gpt-...",
 *         input: buildPrompt(input.analysis, input.routine, context),
 *         // structured output → same CoachMessage shape the UI already renders
 *       });
 *       return { ...parse(res), source: "llm" };
 *     }
 *   }
 */
export class OpenAICoachProvider implements CoachProvider {
  readonly id = "openai-gpt";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generate(_input: CoachInput): Promise<CoachMessage> {
    throw new Error(
      "OpenAICoachProvider is a reference stub. The demo uses TemplateCoachProvider " +
        "(on-device, no API). See docs/AI-ARCHITECTURE.md.",
    );
  }
}
