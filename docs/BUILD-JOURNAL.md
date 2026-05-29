# Build journal

A chronological narrative of how SkinLens was built — including the things we
discovered mid-build, the dead ends, and *why* we iterated. Decisions are
cross-referenced to [`DECISIONS.md`](./DECISIONS.md).

This is deliberately candid: a clean repo can hide the messy reasoning that
produced it. This file keeps the reasoning.

---

## Phase 0 — Strategy & product choice

Evaluated all four Revieve advisor products (skincare / makeup / haircare /
hair-color) against four axes: first-open wow, can-the-CV-be-honest-without-a-
backend, business-story strength, and polish risk. Chose the **Skincare
Analyzer** ([ADR-001](./DECISIONS.md#adr-001--hero-product-ai-skincare-analyzer))
framed as an **embeddable widget** ([ADR-002](./DECISIONS.md#adr-002--framing-an-embeddable-brand-widget)).

---

## Phase 1 — Foundation

Scaffolded with `create-next-app`. **Discovery:** `@latest` now ships **Next.js
16.2.6 + React 19**, not Next 15 as assumed — fine, App Router is stable, but
noted so nothing downstream assumes 15-only behavior. Tailwind **v4** (CSS-first,
no `tailwind.config.js`).

Set up the design tokens (warm paper / ink / coral / sage), `cn()` helper,
hand-built `Button` + `Card`
([ADR-010](./DECISIONS.md#adr-010--hand-built-ui-primitives-instead-of-the-shadcn-cli)),
Vitest, and the MediaPipe asset strategy
([ADR-004](./DECISIONS.md#adr-004--wasm-from-a-pinned-cdn-model-self-hosted-via-a-setup-script)):
WASM from a pinned CDN, model downloaded by `scripts/setup-models.mjs`.

---

## Phase 2 — Vision engine (`lib/vision/`)

Built the framework-agnostic CV layer: a cached FaceLandmarker loader (VIDEO +
IMAGE modes), color-space conversions (sRGB→CIELAB, sRGB→HSL), pixel sampling,
and framing assessment.

**Key call:** regions are derived **geometrically** from anchor landmarks rather
than hardcoded polygons
([ADR-005](./DECISIONS.md#adr-005--geometric-region-derivation-not-hardcoded-landmark-polygons)) —
more robust and unit-testable without a camera.

**Gotcha:** the JSDoc comment `a*/b*` silently closed a block comment early (the
`*/` sequence), breaking the parser. Reworded to `a* and b*`. Small, but the kind
of thing that eats ten minutes if you don't read the parse error carefully.

18 unit tests green (color math, sampling, framing).

---

## Phase 3 — Live tracking → real-time scan

### 3a. Live face-mesh tracking
Built the camera hook (precise permission/error states), a `requestAnimationFrame`
detection loop drawing the 478-point mesh via MediaPipe `DrawingUtils`, an FPS
counter, framing gating, and a first single-frame capture that overlaid the
sampled regions as proof the pipeline lined up.

**Gotcha — Tailwind v4 rendered nothing.** First preview came up completely
unstyled. Inspected the generated CSS: theme variables present, but **zero
utility classes** (only 28 rules total). Root cause: Tailwind v4 auto-detects
source files from the build cwd, and the dev server was launched from a different
directory. Fix: explicit `@source` globs in `globals.css`
([ADR-009](./DECISIONS.md#adr-009--tailwind-v4-explicit-source-globs)). After the
fix, utilities generated (17.6 KB) and the page rendered correctly.

Verified live on a real webcam: **60fps**, clean mesh, framing gate flips to
"Perfect — hold still" when centered.

### 3b. Region placement — three iterations
Sampling regions only matter if they sit on actual skin. Tuned against real
faces:
1. **v1:** cheeks were too central — they sat beside the nose, not on the cheek.
   `outward` offset was only `0.1·d`.
2. **v2:** pushed cheeks outward (`0.4·d`) but `0.82·d` down — on a bearded face
   they dropped **into the beard line**.
3. **v3 (kept):** cheeks at `0.45·d` outward, `0.62·d` down — the upper cheek
   "apple," outward and clear of the beard for most faces. Under-eye lowered to
   `0.36·d`, forehead pulled to mid-forehead.

Lesson: geometry tuning needs a real face in the loop; added deterministic
placement/symmetry/tilt tests so it can't silently regress.

### 3c. Pivot — from static capture to a real-time scan
Reviewing the static "freeze + circles" screen, it felt flat and risked sampling
one bad frame. Researched how Revieve, Perfect Corp, and the open-source
`skin-scan` project actually do it, then made a deliberate call
([ADR-007](./DECISIONS.md#adr-007--real-time-multi-frame-guided-scan-rejected-guided-head-turn)):

- **Rejected** head-rotation — for flat skin regions it adds no landmark accuracy
  and risks jank.
- **Adopted** a ~2s **multi-frame scan**: live mesh + scan-line sweep + filling
  region rings over the real face. Each frame contributes one robust region color
  (median + luminance-outlier rejection — beard/glare); across frames we take the
  temporal median. The scan animation *is* the accuracy mechanism.

Also hardened it: brief tracking blips no longer abort the scan (8-frame
tolerance), and the loop is bound once with all scan state in refs to avoid stale
closures.

**Gotcha — Fast Refresh runtime error.** Renaming the capture state shape during
HMR threw `undefined is not an object (result.width)` from stale state; a full
reload clears it. The render path is guarded (`step === "result" && result`), so
it's an HMR artifact, not a real bug.

Verified live: scan runs at 60fps, averaged **133 frames** in one ~2s pass,
regions land correctly on cheeks/under-eye/forehead/nose. 30 tests green.

Inclusivity requirement captured as a hard rule for Phase 4
([ADR-008](./DECISIONS.md#adr-008--inclusivity-by-design-relative-to-baseline-metrics--robust-sampling)).

---

## Phase 4 — Analysis metrics & scoring

Built the analysis engine in `lib/analysis/` over the `ScanResult`. Every concern
is computed **relative to the person's own skin**
([ADR-008](./DECISIONS.md#adr-008--inclusivity-by-design-relative-to-baseline-metrics--robust-sampling)):

- **Redness** — central-face (cheeks + nose) `a*` minus forehead `a*`.
- **Under-eye** — cheek `L*` minus under-eye `L*`.
- **Tone evenness** — std dev of `L*` across all regions.
- **Texture** — variance of the Laplacian on the forehead patch (final frame),
  luminance-normalized.

Each delta maps through `scoreFromDelta()` to a 0–100 health score; the composite
is a documented weighted average (redness .30 / evenness .25 / under-eye .25 /
texture .20). Severity buckets: ≥75 good, 50–74 moderate, <50 attention.

**Discovery → dropped a concern.** Planned five concerns, but shine/oiliness
collided with the design: our robust sampler *rejects* the bright specular pixels
that shine is made of, and a window reflection is indistinguishable from oily
skin without controlled lighting. Cut it rather than ship something undefendable
([ADR-011](./DECISIONS.md#adr-011--four-honest-concerns-dropped-shineoiliness)).

**Inclusivity is enforced by tests, not just intent.** `metrics.test.ts` asserts
that a *uniform dark face* scores a perfect under-eye (delta = 0 → 100), and that
an equal relative under-eye contrast flags the same on dark and light skin.
`analyze.test.ts` checks that a uniform dark face gets the same high overall score
as a light one. If someone later swaps a relative metric for an absolute
threshold, these tests fail.

Wired a first result surface (`AnalysisResult`): composite score + four concern
rows with severity, bars and plain-language detail. Phase 5 upgrades this to a
gauge + radar + annotated face. 44 tests green.
