# SkinLens — the story behind the build

This is the narrative companion to the rest of the docs. The other files are
*reference* (every decision as an ADR, every phase in the build journal, the
honest limits, the calibration, the AI architecture). This one is the *story*:
why I built it, what I learned, where I drew the line, and how I'd take it to
production. It's written to be read top to bottom.

> **TL;DR for the impatient.** I'm applying for a Claude Code engineer role at
> Revieve. After our Friday call I wanted to *show* rather than *tell*, so over
> two evenings I built a working, on-device AI skin analyzer — their flagship
> product, as an embeddable widget — using real computer vision I'd never written
> before. The interesting part isn't that it works; it's everything I discovered
> about *why skin analysis is hard*, what I chose to measure honestly, and what I
> deliberately left as a documented "here's how I'd do it for real."
>
> Live: https://skin-advisor-demo-xi.vercel.app · Code: https://github.com/petrvlcek232/skinlens

---

## 1. Why this exists

I had a call with Revieve on Friday. I felt my English let me down on the call,
and I'd already sent my GitHub and information about GEO Tracker AI (the product
I build day to day). But the more I read about Revieve afterwards, the more their
work genuinely pulled me in — both **technically** (real-time on-device computer
vision for beauty) and as a **product** (an embeddable widget brands drop into
their storefront, turning a selfie into a personalized routine and a sale). That
combination is rare and it's the kind of thing I'd actually enjoy working on.

So I decided to answer the language gap the only way I'm truly fluent: by
building. This demo is me saying *"I understand your product and I can build it"*
in the language I'm best at — working software, with the reasoning written down.

I'll be explicit about one thing throughout: **I built this in close
collaboration with Claude (Anthropic's coding agent)**, because the role is a
*Claude Code* engineer role. The skill on display is precisely that — directing
an AI agent to build something real, catching its mistakes, making the senior
judgment calls, and keeping the whole thing honest. Where the collaboration
helped and where it tripped (it did, and I caught it) is part of the story below.

---

## 2. The first idea — picking one product, well

Revieve ships four advisor products: skincare, makeup, haircare, hair-color. A
two-evening demo can do exactly one thing excellently or four things badly. I
evaluated them on four axes — first-open "wow", whether the CV can be done
*honestly* without a backend, how much of the business story it tells, and polish
risk — and chose the **AI Skincare Analyzer**.

Why skincare: it tells the *whole funnel* (scan → score → concerns → routine →
products), which is where Revieve's B2B value actually lives — the CV is the means,
the conversion is the point. It can be done honestly with classical computer
vision (no faked model). Makeup/hair try-on have higher visceral wow but tell less
of a business story and carry more real-time-rendering risk. (Full reasoning:
[`DECISIONS.md`](./DECISIONS.md) ADR-001. I did still build a small AR lipstick
try-on at `/try-on` as a "second product on the same mesh" flourish.)

And I framed it the way Revieve actually sells: not an app, an **embeddable
widget**. The vision engine (`lib/vision/`) is deliberately free of React so it
reads like an SDK a brand could lift; there's a chrome-free `/embed` route and a
fictional brand storefront at `/demo` that embeds it via one `<iframe>` (ADR-002).

---

## 3. Researching the CV options — and the senior cut

Before writing pixels I looked at how this is actually done: Revieve, Perfect
Corp, L'Oréal's Skin Genius, and the open-source `skin-scan` project. The
landscape splits roughly into:

- **Server-side trained models** (Perfect Corp's "70,000 medical-grade images",
  a CNN behind an API) — most accurate, but needs the model, the data, the
  backend, and the user's face leaving the device.
- **On-device classical CV** — facial landmarks + colour-space math + classical
  signal processing, running entirely in the browser. Less powerful, but private,
  free, instant, and *honest* about what it measures.
- **Hybrid** — landmarks on-device, heavy analysis in the cloud.

I deliberately chose **on-device classical CV** (ADR-003) — MediaPipe
FaceLandmarker (478 points) via WASM, no server, no database, no API keys, the
photo never leaves the device. This wasn't just a shortcut for a weekend; it's
the **right** choice for a privacy-sensitive beauty tool, and it happens to be
Revieve's own marketed differentiator. The trade-off (no trained-model power) I
chose to handle by **honesty**, not by faking a CNN (ADR-006). More on that below.

### The deliberate "what I did NOT build"

A real product has a database, billing, auth, accounts, analytics. **I built none
of them — on purpose.** For a prototype whose job is to prove *"I can build the
hard CV/product core"*, those are solved, boring, and would have eaten the two
evenings I had. Choosing *not* to build them — and being able to say exactly why,
and what they'd look like in production — is itself the senior signal. The demo is
deliberately the 20% that's hard and interesting, not the 80% that's plumbing.

---

## 4. The moment it got hard (and the honest path)

By the second evening I'd realised something that doesn't show until you try it:
**skin analysis is genuinely difficult**, and most of the difficulty is *not* the
code — it's that skin, light, hair, freckles, age and skin tone all confound each
other. Every test photo broke a new assumption. That realisation shaped every
decision after it: rather than chase an accuracy I couldn't honestly reach in two
evenings, I built a pipeline that **measures what classical CV genuinely can,
labels it correctly, and documents the rest as a model-and-data problem.** The
rest of this story is that loop — *test → find the new limit → measure what's
honest → write the rest down* — playing out over and over.

---

## 5. What I actually built, in the order the problems appeared

### 5.1 Real-time scan, not a single photo
A single freeze-frame risks one bad frame. So the capture is a ~2s **scan** that
averages 100+ frames, each contributing a robust median colour per region (outlier
rejection drops glare and stray hairs). The scan animation *is* the accuracy
mechanism. I considered guided head-turning (look left/right) and **rejected** it:
for flat skin regions a frontal pose is optimal and MediaPipe already has all 478
points from one frame (ADR-007).

### 5.2 Lighting — the biggest confounder
The single thing that wrecks selfie skin analysis is light. So before any scan
there's a **lighting gate** (ADR-012, following the ISO/IEC 29794-5 face-image
standard): it checks exposure clipping, brightness, and **left-vs-right cheek
uniformity** (the side-light detector), shows a live "Light NN" score, and blocks
the scan with guidance ("Too dark", "Lighting is uneven") rather than silently
scoring a bad input. Crucially it's **tone-robust** — it uses clipping and
within-face deltas, never an absolute brightness threshold that would punish
darker skin.

### 5.3 The metrics — and why they're all *relative*
Five concerns: **spots & blemishes, redness, tone evenness, under-eye, texture &
fine lines.** Every one is measured **relative to the person's own face** —
redness is cheek-vs-forehead `a*` delta, under-eye is a delta vs their own cheek,
blemishes are deviations from their own clear-skin baseline. This is the
inclusivity guarantee (ADR-008): a delta within one face cancels out skin tone, so
the metrics behave the same on light and dark skin. It's enforced by tests (a
uniform dark face must score the same as a uniform light one). Tuning these is an
*empirical* process — you can't do it at a desk, you need a real face in the loop;
the region geometry alone took three iterations (cheeks kept landing on the nose,
then in the beard) before it sat on the cheek "apples" (Phase 3b).

I also **dropped a concern**: shine/oiliness. Our robust sampler deliberately
*rejects* the bright specular pixels that shine is made of, and a window
reflection is indistinguishable from oily skin without controlled light. Four
honest concerns beat five with a fake one (ADR-011) — though "blemishes" later
became the fifth, for a real reason (§5.6).

### 5.4 Skin tone, done inclusively (ITA → Monk)
Tone is computed with the **Individual Typology Angle** (ITA, the standard
dermatology colorimetric measure) from CIELAB, then reported on the **Monk Skin
Tone scale (1–10)** — not Fitzpatrick. That's deliberate: Fitzpatrick measures UV
photo-response (you can't derive it from one image — recent studies show ~0–20%
accuracy), while Monk is a constitutive-pigmentation scale built for inclusivity
(6 of its 10 steps cover darker tones vs Fitzpatrick's 2) and maps far better to
colorimetry (~89–92%). Full method + sources in
[`SKIN-TONE-METHODOLOGY.md`](./SKIN-TONE-METHODOLOGY.md).

### 5.5 The dataset — and the clinical-vs-cosmetic decision
The hand-picked thresholds (e.g. "redness is bad above 14") were my weakest point
— *how do I know 14 is right?* The honest answer was "I didn't, yet." So I made
them **data-driven**.

First, a real research question: **clinical dataset or "common-phenomena"
dataset?** Clinical skin-disease datasets (e.g. Google's SCIN) are about
*diseases* — and I checked: SCIN's faces are **redacted** for de-identification,
so it's unusable for frontal-face analysis, and its labels are dermatologist
disease grades, which would imply a medical claim I'm not making. Revieve's own
product is explicitly **cosmetic, not a medical device** — so the right data is
*common cosmetic phenomena*: acne, blackheads, oily skin, wrinkles, dark spots.

I used **Roboflow's "Face Skin Problems"** dataset (1,008 training faces, CC BY
4.0, multi-label across exactly those cosmetic concerns, diverse skin tones). How
I used it: an **offline SQLite calibration harness** (`scripts/calibrate.ts`) runs
the *same colour signal the app uses at runtime* (the cheek-vs-forehead `a*`
delta, not absolute `a*`, so the thresholds transfer 1:1) over every image, stores
each measurement in SQLite, and derives **per-skin-tone-tier** thresholds into
`lib/analysis/calibration.json`, which the app imports. The result confirmed the
inclusivity thesis with data: the "elevated redness" cutoff is **higher for dark
skin (11) than light (7)** — proof that an absolute threshold would over-flag
darker skin. (Full method + results: [`CALIBRATION.md`](./CALIBRATION.md), ADR-019.)

**Why no DB, and what that means for the data.** This is a key honesty point. The
calibration is *offline* — it produces a small JSON of population thresholds that
ships in the code. The running app has **no database**: it does **not** store your
scan, and it does **not** compare you against other users. The raw 1,008 face
images are **not committed** to the repo (privacy + size); only the derived,
anonymous `calibration.json` and the attribution are. So "we used a dataset" means
*we calibrated our thresholds against it once, offline* — not *we run a backend
that benchmarks you against a population*. That second thing (a "skin age" cohort
score) is real and valuable, and I document exactly how I'd build it (§7).

### 5.6 Where every test photo broke something
This is the most honest part, and the most valuable. Each new face exposed a new
limit:

- **Background bleed.** A synthetic test face with green foliage behind it dragged
  "tone evenness" down — the background leaked into edge regions. Fixed with a
  tone-robust skin gate (keep pixels where red is the dominant channel — true of
  skin across all tones, false of green/blue background). ADR-018, Phase 9.5.
- **Hair in the face.** The skin gate can't remove **hair or eyebrows** — brown
  hair is also "red-dominant", so it passes. Strands over the forehead inflate
  texture/tone. I *minimised* it with region placement, but the real fix is a
  **hair-segmentation model** — out of scope, documented (LIMITATIONS §1.1).
- **Heavy acne under-scored.** A face with visible acne scored a too-kind 67,
  because the engine measured redness/tone/texture but **never spots themselves**.
  So I added a **spot/blemish density** signal — one detection pass that flags
  pixels deviating from the face's own clear-skin baseline. That same pass does
  double duty: the clear-skin pixels it *keeps* are used to compute a
  **freckle-robust skin tone** (ADR-020, Phase 13).
- **The family test — the sharpest finding.** I scanned my whole family. My
  6-year-old son (clear skin) scored ~66, I (40) scored ~90, my wife (some
  breakouts) ~79. That ranking looks *wrong* — and explaining *why it isn't a bug*
  is the heart of this project. Because every metric is relative to the same face,
  the score is only meaningful **intra-person, over time — never as a leaderboard
  between people.** Two concrete effects: my son's **freckles** read like spots
  (the density heuristic genuinely can't tell a freckle from a pimple), and
  diffuse acne shifts its own per-face baseline. I did **not** fake a comparable
  score. Instead I reframed the UI ("measured relative to your own skin — track it
  over time, not as a ranking between people") and lean on the **per-person trend**
  (which *is* a valid comparison), and documented the real fix: a model-based
  "skin age" cohort benchmark (ADR-022, LIMITATIONS §1.6, Phase 15).

That freckle-vs-pimple limit is the cleanest example of the whole project's
thesis: **classical CV can measure "something deviates here", but it cannot
classify *what* — that needs a trained model, which we deliberately don't have,
and document instead of fake.**

### 5.7 The result UI, and what testing taught it
The result is a payoff screen: an animated score gauge, a concern radar, and a
**continuous heatmap painted over the face** (clipped to the face-oval mesh so
nothing spills onto hair/background — that took iterations too: discrete circles
read as "blurred dots", unclipped blobs spilled off the face). Plus an honest
"How accurate is this?" disclosure, per-person profiles (so a household sharing a
device doesn't mix scores — and explicitly **not** face recognition, for privacy
reasons, ADR-016), and an on-device trend. Mobile testing surfaced real
horizontal-scroll bugs at 320px that I chased down and fixed (Phase 11/11b/11c).

### 5.8 The AI coach — simulated now, real-LLM-ready
Revieve uses LLMs (their AI Beauty Advisor) to *explain* skin data
conversationally. I built that layer as **real architecture with a simulated
brain**: a `CoachProvider` interface, a deterministic on-device provider that
composes a natural-language reading from the structured analysis (reproducible,
free, private), and an inert stub showing exactly where a real LLM slots in behind
the same interface. The UI shows an honest "On-device · rule-based" badge so the
simulation is never passed off as a model. The full production design —
RAG over a vector store of dermatology references, prompting with *numbers not the
image* for privacy, fine-tuning trade-offs, Vercel AI Gateway — is in
[`AI-ARCHITECTURE.md`](./AI-ARCHITECTURE.md) and §7 below.

### 5.9 Recommendations grounded in evidence
The routine maps measured concerns → clinically-supported actives → real products
(The Ordinary, CeraVe, La Roche-Posay…), each with an **evidence level** (high /
moderate / limited) drawn from a baked-in dermatology reference (AAD, DermNet,
PubMed). Today it's deterministic over a small catalog; in production it's the
brand's live feed retrieved via RAG (§7). Honest framing in the UI: "educational,
not medical advice."

### 5.10 Embedding — the actual delivery model
A brand adds the whole analyzer to their site with **one `<iframe>`** — no
backend to run, no API key to manage, the analysis happens in the shopper's
browser. The `/demo` page proves it by embedding the chrome-free `/embed` widget
inside a fictional storefront. For Revieve's B2B model, "drop in one tag" is the
whole point.

---

## 6. Process notes (the honest "built with AI" part)

- **Built with Claude, deliberately.** This is a Claude Code role, so the demo is
  also a demonstration of *working with the agent*: I directed the build, made the
  architecture and honesty calls, and caught the agent's mistakes — including a
  red build that got pushed once, some doc-drift from an interrupted edit, and a
  couple of times the agent stated things that weren't literally true and I had it
  correct them. That review loop is the job. (Captured in LIMITATIONS §3.2.)
- **Why no MCP servers.** The Claude Code workflow can use MCP servers to reach
  external tools (databases, SaaS APIs, browsers). I deliberately **didn't** use
  any for this prototype: the whole system is self-contained — an in-browser CV
  pipeline plus an offline calibration script — with no external service to
  integrate. Sub-agents *were* used (for the CV-options research and the dataset
  research), which is the part of the agent workflow that actually fit the work.
  In production, MCP would earn its place — wiring the agent to the brand's
  product catalog, an analytics warehouse, or the vector store — and I'd add it
  then, not for its own sake.
- **Single `main` branch, trunk-based.** Solo, short-lived repo, no other
  contributors — feature branches would be ceremony. Every commit is verified
  (typecheck + tests + build) before push, CI re-checks on `main`. The moment a
  second person joins, this switches to short-lived branches + PR review
  (LIMITATIONS §3.1).
- **119 tests, typecheck-clean, CI green.** The pure logic (colour math, region
  geometry, robust sampling, every metric, lighting, calibration, recommendations,
  the coach) is unit-tested so the honesty guarantees can't silently regress.

---

## 7. Roadmap — from this prototype to a production product

This is where I'd take it, concretely. Each item names *what's missing*, *why it's
this way now*, and *how I'd build it*.

### 7.1 Accuracy & fairness (the model layer)
- **Trained concern models.** Replace the classical-CV heuristics for the things
  they genuinely can't do — acne grading, true wrinkle scoring, pigmentation
  typing — with CNNs/ViTs trained on labelled, skin-tone-diverse data, reported
  with **agreement metrics per Monk tone group** to prove fairness. *Why not now:*
  needs the labelled dataset + training pipeline; out of scope for two evenings.
- **Hair / skin / brow segmentation.** A per-pixel face-parsing model (e.g.
  BiSeNet) so sampling only ever touches skin — kills the hair-in-face and
  freckle confounds at the source. Intersect each sampling region with the skin
  mask.
- **Illumination normalisation.** Per-capture white-balance + relighting (retinex
  or a learned model), or a physical greyscale-card reference, so tone/redness are
  trustworthy across lighting — separating "uneven skin" from "uneven light."
- **Cross-person "skin age" benchmark.** What Revieve/Perfect Corp ship: a model
  benchmarked against an **age- and tone-matched reference population** to produce
  a number that *is* comparable between people. Needs the trained model + a global
  reference distribution + a backend to serve it.

### 7.2 The AI / LLM layer (production)
- **Real LLM coach** behind the existing `CoachProvider` interface, via the
  **Vercel AI Gateway** (provider fallback, observability, zero-retention).
- **RAG over a vector store.** Embed the dermatology reference corpus (the AAD /
  DermNet / PubMed material already cited in the code) into a vector DB
  (pgvector / Pinecone); retrieve evidence for the flagged concerns and ground the
  model in it instead of its parametric memory — the standard fix for hallucinated
  skincare advice.
- **Prompt with numbers, never the image.** Privacy stays intact — the model gets
  the structured scores + retrieved evidence, not the face. A fully-local option
  (WebLLM / WebGPU) keeps even that on-device.
- **Fine-tuning vs RAG.** RAG first (cheaper, updatable, grounded). Fine-tuning
  only later, for brand voice / response shape consistency, not for facts.
- **Conversational follow-ups.** The coach already proposes follow-up questions; a
  real provider answers them with the same grounding, keeping chat state.

### 7.3 Recommendations & commerce
- **Brand product feed in a DB**, vector-embedded by active ingredient + concern,
  retrieved by scan result and synthesized into a routine by the LLM (RAG). Today
  it's a static catalog; production is the brand's live feed.
- **Contraindication gating** — an allergy/pregnancy/prescription questionnaire
  before recommending actives (retinoids in pregnancy, etc.).
- **Real cart / checkout** integration with the brand's commerce stack.

### 7.4 Platform & product
- **Accounts + database** for opt-in scan history sync across devices (today it's
  on-device localStorage only) — with the same privacy posture (store numbers, not
  faces, unless the user explicitly opts in).
- **Multi-language** advisor (the LLM layer makes this nearly free).
- **Analytics + A/B** on conversion, behind the brand's consent.
- **MCP integration** wiring the agent to the catalog / warehouse / vector store
  for ongoing maintenance and content generation.
- **Auth, billing, multi-tenant** brand configuration — the standard SaaS layer
  deliberately skipped in the prototype.

### 7.5 Where the line is today (current state, honestly)
**Works now:** on-device real-time scan, lighting gate, 5 relative + inclusive
concern metrics, ITA→Monk tone, data-calibrated redness thresholds, severity
heatmap, evidence-backed recommendations, simulated AI coach, per-person on-device
trend, embeddable widget, AR lipstick try-on. **Deliberately not built:** trained
models, real LLM/RAG, cross-person scoring, DB/auth/billing, hair segmentation,
illumination normalisation. **Every one of those is documented** with the reason
and the build plan above — that's the point: I know exactly where the prototype
ends and the product begins.

---

## 8. Reading guide

- [`DECISIONS.md`](./DECISIONS.md) — 22 ADRs, every choice + why + what was rejected.
- [`BUILD-JOURNAL.md`](./BUILD-JOURNAL.md) — chronological, including the dead ends.
- [`LIMITATIONS-AND-ROADMAP.md`](./LIMITATIONS-AND-ROADMAP.md) — what doesn't work yet, why, how to fix.
- [`VALIDATION.md`](./VALIDATION.md) — how to trust the numbers; what real validation needs.
- [`CALIBRATION.md`](./CALIBRATION.md) — the data-driven threshold calibration.
- [`SKIN-TONE-METHODOLOGY.md`](./SKIN-TONE-METHODOLOGY.md) — the ITA / Monk science.
- [`AI-ARCHITECTURE.md`](./AI-ARCHITECTURE.md) — the simulated-now, real-later AI layer.
- [`../datasets/README.md`](../datasets/README.md) — the dataset, attribution, how to fetch.
