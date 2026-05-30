# Limitations & roadmap

This document is deliberately candid. It records what SkinLens does **not** do
well yet, **why** each limitation exists, what the **current mitigation** is, and
**how it should be solved properly** in production. It also records the CV
evolution (what we tried, what worked, what didn't) and the engineering-process
decisions (e.g. branching).

A demo that hides its limits is worse than one that names them. Naming them — with
a credible path to fix each — is the point.

See also: [`VALIDATION.md`](./VALIDATION.md) (accuracy positioning + test
coverage), [`DECISIONS.md`](./DECISIONS.md) (ADRs), [`BUILD-JOURNAL.md`](./BUILD-JOURNAL.md)
(chronological narrative incl. dead ends).

---

## 1. Known limitations (and how we'd fix them)

### 1.1 Hair / eyebrows bleeding into sampling regions — NOT handled

**What.** The forehead and outer-eye regions can include strands of hair or the
edge of an eyebrow. Both are skin-toned-adjacent (brown hair is also `R ≥ G ≥ B`,
so it passes our skin gate), so they shift the measured colour and can inflate
the "texture / fine lines" and "tone evenness" scores.

**Why we don't handle it now.** Distinguishing hair/eyebrow from skin *reliably*
needs a **trained segmentation model** (per-pixel hair/skin/brow classes). That's
a model-training task with its own dataset and evaluation — out of scope for a
weekend, classical-CV demo, and pretending a heuristic does it would be the kind
of overclaim this project avoids (see ADR-006).

**Current mitigation.**
- Region geometry is placed to *minimise* overlap (forehead band raised above the
  brow; cheeks on the apples) — see BUILD-JOURNAL phase 3b / 6.5.
- The skin gate (ADR-018 / phase 9.5) removes obvious non-skin background
  (green/blue), which is the part a colour test *can* catch.
- The lighting gate flags inputs where this is most likely to matter.

**How to solve it properly (production).**
1. **Hair/skin segmentation.** MediaPipe ships an **Image Segmenter** with a
   hair category, and there are selfie-segmentation / face-parsing models
   (e.g. BiSeNet face-parsing) that output per-pixel skin vs hair vs brow vs
   background. Intersect each sampling disk with the **skin mask** and sample only
   skin pixels. This also kills the background-bleed problem completely (no colour
   heuristic needed).
2. **Eyebrow exclusion via landmarks.** MediaPipe already gives eyebrow contour
   landmarks; build a small exclusion polygon per brow and skip pixels inside it.
   Cheaper than a model, handles the brow case specifically.
3. Combine: landmark-based exclusion for brows + a segmentation mask for hair.

### 1.2 Side-lighting / uneven illumination

**What.** A face lit brighter on one side (or top) produces a real luminance
gradient across regions, which legitimately lowers "tone evenness." On the E2E
test photo this — plus hair overlap — is the main reason tone scored 45.

**Why we don't fully handle it.** Separating "uneven skin tone" from "uneven
*lighting* on even skin" from a single uncalibrated image is genuinely hard (it's
an open research problem — see VALIDATION.md).

**Current mitigation.** The **lighting gate** (ADR-012) detects exposure clipping
+ left/right-cheek uniformity and surfaces an honest confidence; it flags exactly
these inputs as "uneven" rather than silently scoring them.

**How to solve it properly.**
1. **Per-capture white-balance / exposure normalisation** against a reference
   (a greyscale card, or auto-WB from the scene) before measuring.
2. **Illumination estimation + correction** (retinex-style, or a learned
   relighting model) to flatten the lighting field before computing tone.
3. **Reject-and-reguide**: if uniformity is below threshold, don't score — ask the
   user to face a window, like Revieve/L'Oréal do.

### 1.3 Texture / fine lines is a heuristic, not wrinkle grading

**What.** "Texture & fine lines" combines Laplacian variance with horizontal-line
energy on the forehead. It responds to real texture, but it is resolution- and
lighting-sensitive and is **not** a clinical wrinkle grade.

**Why.** True wrinkle/acne grading needs a trained CNN on labelled dermatology
data (ADR-006). We deliberately don't claim it.

**How to solve it properly.** A model trained on graded wrinkle/acne datasets,
reported with agreement metrics vs dermatologist labels, per skin-tone group.

### 1.4 Single-frame upload has no temporal averaging

**What.** The camera scan averages ~100+ frames (robust). The **photo-upload**
path has one frame, so it's noisier and skips the multi-frame stability win.

**Why.** A still is a still — there's nothing to average.

**Mitigation / fix.** Accept multiple photos and average them; or apply mild
spatial denoising per region before the median. Today we just label the result
"from your photo" so the user knows it's single-frame.

### 1.5 No clinical validation / not a medical device

Covered fully in [`VALIDATION.md`](./VALIDATION.md). Short version: SkinLens is an
explainable relative heuristic, not a diagnostic instrument; real clinical claims
would need a labelled skin-tone-diverse dataset, a trained model, agreement
metrics and test-retest reliability.

### 1.6 Recommendations are evidence-mapped, not personalised medicine

The routine maps measured concerns → clinically-supported actives → real products
(ADR-017). It does **not** account for allergies, pregnancy, prescription
interactions, or a dermatologist's exam. The UI says so ("educational, not medical
advice"). Production would add a contraindication questionnaire and gating.

---

## 2. CV evolution — what we tried, what worked, what didn't

The full chronology is in [`BUILD-JOURNAL.md`](./BUILD-JOURNAL.md); this is the
condensed "lessons" view.

| Attempt | Outcome | Why |
|---|---|---|
| Hardcoded landmark polygons for regions | ✗ rejected | Brittle, ~40 indices I couldn't verify; replaced by geometric derivation from a few high-confidence anchors (ADR-005). |
| Cheeks at `0.1·d` outward | ✗ | Sat beside the nose, not on the cheek. |
| Cheeks at `0.4·d` / `0.82·d` down | ✗ | Dropped into the beard line on bearded faces. |
| Cheeks at `0.45·d` / `0.62·d` down | ✓ kept | On the apple, clear of beard for most faces. |
| Static "freeze + circles" capture | ✗ replaced | Flat UX, risked one bad frame. |
| Real-time multi-frame scan (temporal median) | ✓ kept | The scan animation *is* the accuracy mechanism (ADR-007). |
| Guided head-rotation | ✗ rejected | No landmark-accuracy gain for flat regions; jank risk. |
| Discrete region circles on result | ✗ replaced | Read as "blurred dots." |
| Soft blobs, unclipped | ✗ | Spilled outside the face (crow's feet onto temple/hair). |
| Heatmap clipped to FACE_OVAL polygon + baseline tint | ✓ kept | Continuous face heatmap, nothing outside the face. |
| 5th concern: shine/oiliness | ✗ dropped | Conflicts with glare rejection; window reflection ≈ oily skin without controlled light (ADR-011). |
| Absolute brightness gate for lighting/skin | ✗ rejected | Would penalise darker skin; used clipping + within-face deltas instead (ADR-008/012). |
| Skin gate `R ≥ G ≥ B` to drop background | ✓ kept (partial) | Removes green/blue bleed; does NOT remove hair (also R≥G≥B) — see 1.1. |

**Meta-lesson:** geometry and colour heuristics need a real face in the loop, and
several "obvious" ideas (absolute thresholds, head-turn, shine) are wrong on
closer inspection. Tests lock in the wins so they can't silently regress.

---

## 3. Engineering-process notes

### 3.1 Why a single `main` branch (trunk-based), no feature branches

**Decision.** Commit directly to `main`; no feature/PR branches for this project.

**Why.** It's a **solo, short-lived portfolio repo** with no other contributors
and no production users to protect. Feature branches exist to isolate parallel
work and gate it behind review — neither applies here. Trunk-based development
keeps the history a clean, readable, chronological story of how the project was
built (which is itself part of the portfolio value), and every commit is verified
(typecheck + tests + build) before push, with CI re-checking on `main`.

**When this would change.** The moment a second contributor joins, or there are
real users, switch to short-lived feature branches + PR review + a protected
`main` (CI required to merge). The CI workflow is already in place to enforce that.

### 3.2 Verify-then-proceed (lesson learned the hard way)

Early on I batched many state-changing actions (commit + deploy together) and
pushed a **red build** once, and on a couple of occasions stated things that
weren't true (a guessed deploy URL; a non-existent branch; an inaccurate "injected
output" note that was later removed from this very doc set). Root cause: acting on
assumed state instead of observed state.

**Rule adopted:** state-changing actions (commit, deploy, branch ops) are done one
at a time and verified from actual command output before the next; claims are made
only from output just seen; when unsure of state, read it rather than guess. The
docs were audited to remove anything not directly verifiable.

---

## 4. If this became a real Revieve-grade product

Priority order, highest-leverage first:

1. **Skin/hair/brow segmentation model** → sample only true skin pixels (fixes
   1.1 and 1.2's worst case in one move).
2. **Lighting normalisation** (white-balance + illumination correction, or
   reference card) → trustworthy tone/redness across environments.
3. **Trained concern models** (acne, wrinkle grade, pigmentation typing) with
   per-skin-tone agreement metrics → real clinical claims.
4. **Calibration + test-retest** harness across devices and lighting.
5. **Contraindication-aware recommendations** (allergy/pregnancy/Rx gating).
6. **Server-side option** for brands that want analytics — while keeping the
   on-device default for privacy.
