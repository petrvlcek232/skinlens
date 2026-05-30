# AI / LLM architecture

The widget ships an **"AI skin coach"** — a natural-language reading of each scan.
In the demo it is produced **on-device by a deterministic provider**, not a real
LLM. This document explains where Revieve actually uses LLMs, how a real model
would plug into this exact codebase, and **why the demo simulates it**.

The honest one-liner: *the AI layer is real architecture with a simulated brain —
the seam is built, a real LLM drops in behind one interface.*

---

## 1. Where an LLM belongs in this product

The computer-vision pipeline produces **structured numbers** (per-concern scores,
skin tone, a routine). That's the hard, deterministic part. An LLM sits **on top**
of those numbers to do what models are genuinely good at — language, not vision:

- **Interpretation** — turn "redness 54, tone 47, Monk 5" into a paragraph a
  person actually understands.
- **Conversation** — answer follow-ups ("can I use these together?", "how do I
  start retinol without irritation?").
- **Grounded recommendation** — explain *why* an active suits this result, using
  retrieved dermatology evidence (RAG), not the model's own memory.

This mirrors Revieve's **AI Beauty Advisor**: the vision engine measures, the LLM
advises. We deliberately keep the measuring deterministic and put the LLM only
where its strengths are — and where mistakes are recoverable (wording, not a
medical score).

## 2. The seam (already in the code)

```
lib/coach/
  types.ts          CoachProvider interface + CoachInput / CoachMessage
  template-coach.ts  TemplateCoachProvider — deterministic, on-device (SHIPPED)
  openai-coach.ts    OpenAICoachProvider — reference stub (NOT wired)
```

Everything speaks one interface:

```ts
interface CoachProvider {
  generate(input: CoachInput): Promise<CoachMessage>;
}
```

`AICoachPanel` calls `templateCoach.generate(...)`. Swapping in a real LLM is a
**one-line provider change** — the UI, the input, and the output shape don't
move. The result carries `source: "rule-based" | "llm"`, surfaced in the UI as an
"On-device · rule-based" badge so the simulation is never passed off as a model.

## 3. What the deterministic provider does today

`TemplateCoachProvider` composes the message from the structured analysis:
ranks concerns worst-first, pulls the top concern's best clinically-supported
active from `lib/clinical/dermatology.ts`, folds in the routine, appends an
honest disclaimer, and proposes follow-up questions. Every sentence is traceable
to a measured value — it reads like an LLM summary but is reproducible, free, and
private. It's unit-tested for determinism.

## 4. How we'd wire a real LLM (production)

Behind the same interface, `OpenAICoachProvider` (sketched in `openai-coach.ts`)
would:

1. **Retrieve (RAG).** Embed the flagged concerns + their actives and query a
   **vector store** of dermatology references (e.g. the AAD/DermNet/PubMed
   snippets already cited in `dermatology.ts`, chunked + embedded). This grounds
   the model in real evidence instead of its parametric memory — the standard fix
   for hallucinated skincare advice.
   - *Tooling:* a managed vector DB (Pinecone / pgvector / Vercel-integrated
     store) holding ingredient + condition knowledge; an embeddings model for
     query + chunks.
2. **Prompt with numbers, never the image.** The model receives the **structured
   scores + skin tone + retrieved evidence** as JSON — *not* the photo. The face
   never leaves the device for the analysis; only anonymous numbers would go to
   the model. (A fully on-device path could use a small local model via WebLLM /
   WebGPU to keep even that local — noted as the privacy-max option.)
3. **Constrain the output.** Use structured output / a JSON schema matching
   `CoachMessage`, so the UI renders the LLM exactly like the template today.
   Route via the **Vercel AI Gateway** for provider fallback, observability and
   zero-retention.
4. **Make it conversational.** The `followUps` already model the next turn; a real
   provider would keep chat state and answer them, with the same RAG grounding.

## 5. Why the demo simulates it (not a shortcut — a decision)

| Real LLM in this demo would require | Why that's wrong here |
|---|---|
| An API key in a public portfolio repo | Leaks a secret; not shippable |
| The scan/numbers sent to a cloud model | Contradicts the on-device, "nothing leaves your device" promise (ADR-003) |
| A hosted vector DB for RAG | Infra + cost + accounts for a weekend demo |
| Per-call spend | Unbounded cost on a public link |

Simulating it keeps the demo **free, private, reproducible, and instantly
runnable** — while still proving the architecture. The point a reviewer should
take: *this person understands where the LLM goes, how to ground it (RAG), how to
keep it private, and how to make it swappable — and chose simulation deliberately,
labelling it honestly, rather than bolting on an API to look impressive.*

## 6. What real AI would add (the pitch)

- **Conversational depth** — real follow-up answers, not just suggested questions.
- **Adaptive routines** — "I already use a vitamin C, what do I add?" → re-planned
  routine.
- **Multilingual** — the same numbers, explained in the shopper's language.
- **Tone & brand voice** — a brand could set the advisor's persona.
- **Trend narration** — over multiple scans, the LLM narrates progress from the
  on-device history.

All of that rides on the structured pipeline we already built — which is the
durable, defensible part. The LLM is the interface, not the intelligence about
the skin.

See also: [`DECISIONS.md`](./DECISIONS.md) ADR-021 · [`VALIDATION.md`](./VALIDATION.md)
(honesty/positioning) · [`LIMITATIONS-AND-ROADMAP.md`](./LIMITATIONS-AND-ROADMAP.md).
