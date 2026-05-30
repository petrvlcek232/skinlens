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

---

## Phase 5 — Result UI

Turned the functional result into the payoff screen:

- **`ScoreGauge`** — animated radial SVG arc (draws in via `stroke-dashoffset`),
  severity-colored, with a `NumberTicker` count-up. New reduced-motion-safe
  motion primitive at `components/shared/motion/number-ticker.tsx`.
- **`ConcernRadar`** — Recharts radar of the four concern scores.
- **Annotated face heatmap** — `CapturedPreview` now colors each region by its
  concern's severity (green/amber/coral), so the visual ties straight back to the
  numbers (Revieve LiveAR-style). Region→concern map: forehead→texture,
  cheeks+nose→redness, under-eye→under-eye.

Analysis is computed once in the widget (`useMemo`) and shared by the heatmap and
the score surface — no double compute.

**Gotcha (again, harmless).** Renaming `AnalysisResult`'s prop from `result` to
`analysis` tripped another Fast Refresh stale-state error
(`undefined is not an object (analysis.overallScore)`). The render path is guarded
(`step === "result" && result && analysis`); a full reload clears it. HMR
artifact, not a bug — same class as the Phase 3 one.

---

## Phase 5.5 — Lighting quality gate

Prompted by a sharp question: *how do we know there's enough (and even) light
for a valid scan?* Lighting is the biggest confounder in selfie skin analysis, so
this had to land before recommendations.

Researched the field (ISO/IEC 29794-5 face image quality, the OFIQ/NIST work, and
an arxiv paper tying illumination quality to beauty-rec accuracy; plus consumer
guidance from L'Oréal Skin Genius / La Roche-Posay). Built `lib/vision/lighting.ts`
([ADR-012](./DECISIONS.md#adr-012--lighting-quality-gate-tone-robust)) reading the
already-sampled regions (zero extra cost):

- **Exposure clipping** — crushed (≈0) / blown (≈255) pixel fractions.
- **Brightness band** with a conservative darkness floor.
- **Left/right-cheek uniformity** — the ISO-29794-5 side-light detector.

Wired live into the scanner: a throttled (4×/s) lighting read drives a top-right
"Light NN" badge, gates the scan button (with a hint — "Too dark", "Lighting is
uneven", "Too bright"), and is stored on the `ScanResult` as a confidence shown on
the result.

**Tone-robust by design.** The decisive signals (clipping, left/right uniformity)
don't depend on skin tone; we avoid an absolute brightness gate that would punish
darker skin. A test asserts a dark-but-evenly-lit face passes as "good," not
"dim." Honest caveat documented: separating dark-skin-in-good-light from
light-skin-in-dim-light from one frame is an open problem — so we gate on the
robust signals and show a confidence rather than feigning certainty. 50 tests
green.

---

## Phase 6 — Recommendation funnel

Completed the business story: analysis → routine → products. A small fictional
catalog (`lib/recommendations/catalog.ts`, generic names — no real brands or
clinical claims) and a deterministic mapping (`recommend.ts`)
([ADR-013](./DECISIONS.md#adr-013--deterministic-reason-tied-recommendations-over-a-generic-catalog)):

- Core steps (cleanse / moisturize / protect) always present.
- Targeted serums added only for flagged concerns, worst-first, capped at two.
- Under-eye adds an eye step; redness biases toward soothing cleanser + barrier
  moisturizer.
- Every step carries a reason tied to the user's own score, never a blind upsell.

`Recommendations` renders the routine as step cards with an add/remove toggle and
a running total — the conversion surface, minus a real cart (a demo). 57 tests
green.

---

## Phase 6.5 — Forehead band + heatmap (pre-embed polish)

Two requests after the full funnel worked: involve the forehead more (where lines
form), and swap the discrete circles for a face heatmap
([ADR-014](./DECISIONS.md#adr-014--forehead-band--heatmap-visualization)).

- **Forehead band** — added `foreheadLeft`/`foreheadRight` regions, so the brow
  is sampled across centre + sides. The texture concern became **"Texture & fine
  lines"**, combining Laplacian variance with **horizontal-line energy** (vertical
  gradient → responds to horizontal forehead lines). Kept explicitly heuristic and
  low-weighted; a directionality test proves horizontal stripes score higher than
  vertical. Not clinical wrinkle grading — held the ADR-006 line.
- **Heatmap** — `lib/vision/heatmap.ts` draws overlapping soft radial blobs.
  Result: severity-colored over a faint mesh (a true face-mesh heatmap). Live
  scan: accent blobs that fade in with progress, replacing the circles. Reads like
  LiveAR and maps the visual straight to the scores.

63 tests green.

**Iteration — design for the ICP, not the tester.** First heatmap landed the
forehead band on the *eyebrows* (too low), and the coverage was generic. Reframed
around the real ICP — predominantly mature-skin women — and redesigned the region
set (8 → 14): forehead band **raised above the brow**, plus the line-prone zones
that actually matter to that persona: **crow's feet** (outer eye corners),
**nasolabial folds**, **perioral** (under-nose) and **chin**. The fine-lines
concern now reads forehead horizontal-line energy *plus* crow's-feet and
nasolabial texture.

**Iteration — a real face heatmap, clipped to the mesh.** Soft blobs still read
as "blurred circles," and the crow's-feet blobs spilled *outside* the face. Fixed
both: `lib/vision/face-oval.ts` builds the face-oval polygon from the MediaPipe
FACE_OVAL connections (unique vertices sorted by angle around the centroid), and
`drawHeatmap` now **clips to that polygon**, lays a baseline tint over the whole
face, and uses larger overlapping blobs that merge into one continuous map. So
the whole mesh surface reads as a heatmap and nothing paints outside the face.
Crow's-feet regions were also pulled inward to stay on-skin.

**Iteration — "how do I know it's accurate?"** With only one face and no ground
truth, that's a fair worry. Two responses: (1) the result now keeps the **previous
scan** and shows per-concern **deltas**, so the app itself is the comparison —
change one thing and re-scan to see the right score move (responsiveness), or
re-scan unchanged to see it hold (stability). (2) A new
[`docs/VALIDATION.md`](./VALIDATION.md) states the honest positioning (relative
heuristic, not a clinical instrument), the self-check recipe, the full
test-coverage table, and what real clinical validation would require (labeled
diverse dataset + trained model + agreement metrics). An in-result "How accurate
is this?" disclosure links it.

---

## Phase 7 — Embeddable widget framing

Made the "I understand your delivery model" point concrete — all one Next app /
one Vercel deploy, three routes:

- **`/`** — the SkinLens landing (hero + widget) with a footer (Brand demo /
  Embed / GitHub) and a "See it embedded in a storefront →" CTA.
- **`/embed`** — the bare, chrome-free widget on a neutral surface; what a brand
  iframes. `noindex`.
- **`/demo`** — a *fictional* brand storefront ("Aurélie Skin", distinct identity
  + plum palette) that embeds `/embed` via `<iframe allow="camera">`, so the
  embedding reads as cross-site even though it's same-origin. Includes a
  paste-ready embed snippet (`EmbedSnippet`, copies the live-origin iframe code)
  and a "no backend, on-device, white-label" pitch.

The iframe genuinely runs the widget in isolation, proving it's self-contained;
`allow="camera"` is required for getUserMedia inside the frame. All three routes
serve 200; 63 tests still green.

**Iteration — make the demo real, and stop the camera ambush.** Three fixes
([ADR-015](./DECISIONS.md#adr-015--camera-on-explicit-gesture-quiet-mediapipe-cross-browser)):

1. **MediaPipe console noise** (XNNPACK / GL / feedback-manager lines tripping the
   dev overlay) → `lib/vision/silence-mediapipe.ts`, a surgical console filter
   installed at landmarker init.
2. **Camera-on-mount → launch screen.** The widget no longer calls `getUserMedia`
   on mount; it shows a "Start skin analysis" panel and requests the camera only
   on tap. So entering `/demo` shows the shop, not a permission prompt — and the
   widget sits in a dedicated "Free skin analysis" section below the fold.
3. **`/demo` rebuilt as a believable storefront** — announcement bar, sticky
   nav, hero, a 6-product best-sellers grid (gradient art), the analysis section,
   the embed pitch, and a multi-column footer. Fully responsive (grid collapses,
   nav hides on mobile), and cross-browser (playsInline + muted video, standard
   getUserMedia, `allow="camera"` on the iframe).

**Iteration — design lift for "wow."** The demo felt too plain. Without rights to
stock product photos, built **original SVG product art**
(`components/marketing/product-art.tsx` — frosted-glass jar/dropper/pump/tube
silhouettes, tinted per category) and used it across the storefront cards *and*
the in-widget recommendation cards, so products read as products. Added a premium
serif display face (Fraunces) for the brand wordmark + headings, hover-lift
micro-interactions on cards/CTAs, a fade-up hero entrance, and **globally hidden
scrollbars** (scrolling intact). The result and storefront now look intentional,
not scaffolded.

---

## Phase 8 — From demo to product (upload, history, AR, CI, README)

A round of "what could realistically make this land" — four additions, each
small but compounding:

- **Photo-upload fallback** — the launch screen and every camera-error state now
  offer "upload a photo," running the IMAGE-mode landmarker on a still (single
  frame, same metrics). Reviewers without a camera (or on a locked-down laptop)
  still get a full result.
- **On-device history** — `lib/history/skin-history.ts` keeps a capped, safe-
  parsed log of scores in localStorage; the result shows a sparkline trend +
  first→latest delta. The beauty "track your skin over time" hook, no backend.
- **AR lipstick try-on** (`/try-on`) — a *second* product on the same mesh: lip
  contours filled with an even-odd rule (mouth opening stays clear), multiply
  blend for a natural stain, 5 shades, launch-on-gesture. "One mesh, two
  products."
- **CI + README** — GitHub Actions runs typecheck + tests + build on every push;
  the README is rebuilt as the portfolio entry point (what it is, honest
  positioning, architecture, run steps, docs index, production roadmap, and a
  "built with Claude Code" note pointing at this very journal + the ADRs).

Net: the project reads as a usable product backed by honest engineering, not a
one-screen tech toy.

---

## Phase 8.5 — Per-person profiles (no DB, no biometrics)

Testing on two people (a user + their partner) exposed a real bug: the
localStorage history is per-device, so it blended both peoples scores into one
trend. Solved with explicit profiles
([ADR-016](./DECISIONS.md#adr-016--per-person-history-via-explicit-profiles-not-face-recognition)):
a "Whos scanning?" switcher (Me / + Add person) in `lib/history/profiles.ts`,
per-profile history, legacy flat history migrated into a "Me" profile. The active
person is shown on the scan screen ("Scanning as …"), on the result ("Results
for …") and on the trend ("Names skin over time").

Deliberately **did not** add face recognition to tell people apart — biometric
identification clashes with the privacy-first promise, our coarse relative
metrics cant identify a person reliably, and it would feel creepy. The explicit
picker is honest, testable, and solves the real problem. +9 pure tests (75 total).

---

## Phase 9 — Evidence-backed recommendations (clinical data + real products)

Turned the funnel from a fictional stub into something genuinely useful: a scan
now maps to clinically-supported actives and real, buyable products
([ADR-017](./DECISIONS.md#adr-017--evidence-backed-recommendations-clinical-data--real-products)).

Used **two parallel sub-agents** (sonnet, to save tokens) under supervision — one
compiling an evidence-based dermatology reference (per-concern actives with
honest high/moderate/limited evidence levels + cautions, Fitzpatrick/Baumann,
AAD/DermNet/PubMed sources), one researching ~24 real products from public
retailer pages (The Ordinary, CeraVe, La Roche-Posay, etc.) with factual
attributes only. I integrated both by hand: reconciled the agents` "tone" with
the codebase`s "evenness", wired `evidenceFor()` to cross-reference a product`s
actives against the concern`s clinical ingredients, and surfaced an evidence
badge + source link on each recommendation. The `/demo` storefront now sells
real-active-based products with honest descriptions.

**Copyright-clean:** only facts stored; blurbs are original ≤16-word paraphrases
(enforced by a test); explicit "educational, not affiliated, not medical advice"
disclaimer in the UI.

**Gotcha worth recording:** integrating the new catalog surfaced a real bug —
it had no neutral-core moisturizer (every moisturizer carried a concern target),
so the default all-good routine would have picked a concern-specific cream. Found
it by checking the catalog directly against the recommend tests; fixed by adding a
neutral "Daily Moisturizing Lotion" plus a `catalog.test.ts` integrity check that
asserts a neutral core product exists. Also reconciled a renamed cleanser in the
recommend test. 84 tests green.

---

## Phase 9.5 — Background-bleed skin gate (from an E2E finding)

Ran a real E2E: uploaded a synthetic (StyleGAN, non-real) face via the photo
path and watched the live pipeline. It worked end-to-end (upload → IMAGE-mode
detection → mesh heatmap → score → evidence-backed routine, no console errors),
and surfaced a real accuracy issue: green background bled into the edge sampling
regions and dragged "tone evenness" down.

Fix: a **tone-robust skin gate** in `robustRegionColor` (`lib/vision/scan.ts`).
Human skin is R ≥ G ≥ B across light AND dark tones, so we drop pixels where red
isn't the dominant channel (within a small tolerance) before the median — which
removes green foliage / blue sky bleed without any brightness threshold that
would penalize darker skin. Falls back to all pixels if the gate over-thins.
+4 tests (88 total): rejects green and blue bleed, keeps dark skin, falls back.

**Honest limit (recorded, not hidden):** on the test photo, re-running after the
fix left tone evenness unchanged (45) — because that score there is mostly
*legitimate*: the forehead is brightly lit while the cheeks are side-shadowed,
and brown hair (also R ≥ G ≥ B) overlaps the forehead regions, neither of which
the skin gate targets. The lighting gate correctly flags this input as "uneven."
Filtering hair out of in-face regions needs real hair segmentation (a model) —
out of scope, noted in the production roadmap. Did NOT keep tuning thresholds on
a single photo (that's how you overfit to one face). Decision recorded as
[ADR-018](./DECISIONS.md#adr-018--tone-robust-skin-gate-for-background-bleed-and-what-it-cant-fix);
full limitation analysis in [`LIMITATIONS-AND-ROADMAP.md`](./LIMITATIONS-AND-ROADMAP.md) §1.1–1.2.

---

## Phase 10 — Documentation audit + LIMITATIONS-AND-ROADMAP

A deliberate honesty pass over the docs, prompted by two real problems in the
preceding sessions:

1. **Doc drift.** The journal and other docs referenced **ADR-016 and ADR-017**,
   but `DECISIONS.md` only contained ADR-001–015 — earlier edits meant to add
   those two ADRs had silently failed to land (an Edit no-match during a tool
   outage that I didn't re-verify). Found by listing ADR headings and comparing
   to the references. Fixed by writing the missing **ADR-016** (profiles),
   **ADR-017** (evidence recommendations) and **ADR-018** (skin gate) so every
   cross-reference resolves. 18 ADRs total now.

2. **Fabrications removed.** Across earlier turns I had stated things that weren't
   true — a guessed deploy URL, a non-existent `next` branch, and an "injected
   stdout" note — caused by acting on assumed state instead of observed state, and
   by batching too many actions per turn. These were removed/corrected; the
   pattern and the rule adopted to prevent it are documented in
   [`LIMITATIONS-AND-ROADMAP.md`](./LIMITATIONS-AND-ROADMAP.md) §3.2.

Added **[`LIMITATIONS-AND-ROADMAP.md`](./LIMITATIONS-AND-ROADMAP.md)** as the
single place that records, candidly: every known limitation with its cause +
current mitigation + how to fix it properly (hair/eyebrow bleed, side-lighting,
heuristic texture, single-frame upload, no clinical validation, non-personalised
recommendations); the full CV evolution table (what we tried / kept / rejected and
why); and the engineering-process notes (why a single `main` branch / trunk-based,
and the verify-then-proceed rule). Temp files left by an interrupted editor write
were cleaned up.

---

## Phase 11 — Mobile overflow fix

Tested every route at mobile widths by measuring `documentElement.scrollWidth`
vs `clientWidth` and listing every element whose right edge crossed the viewport.

**At 375px (the common small phone): all routes clean** — landing, `/demo`,
`/try-on`, `/embed` and the **result state** all had `scrollWidth === clientWidth`,
no horizontal scroll.

The result state's overflow (seen while diagnosing) traced to the **Recharts**
`ConcernRadar`: a `ResponsiveContainer` inside a flex child overshoots because
flex items default to `min-width: auto` (they won't shrink below content size), so
the chart measured wider than its column. Fix: `min-w-0` on both flex children of
the score/radar row + `overflow-hidden` on the radar wrapper
(`components/scanner/analysis-result.tsx`). After this, 375px is fully clean.

**At 320px (old iPhone SE / very narrow): a residual ~15px overflow remained** on
the result state (`scrollWidth 335 > 320`) — handled in Phase 11b. 88 tests green;
build clean.

---

## Phase 11b — 320px residual overflow (global safety net)

The 320px overflow couldn't be cleanly pinned to one fixed-width element — the
narrowest overflowing node reported by `getBoundingClientRect` was an inline
`<span>` whose union rect spanned wrapped lines (a measurement artifact), while
its parent `<li>` was within bounds. But `documentElement.scrollWidth` was
genuinely 335 > 320, so the ~15px scroll was real, just diffuse (typical of
sub-360px layouts where padding + gaps + intrinsic content nudge a grid track a
few px over).

Rather than chase a brittle per-element tweak for a ~0.2%-traffic width, added a
**global safety net**: `overflow-x: clip` on **`html`** (the actual scroll
container) plus `body`, in `app/globals.css`. First attempt put it only on `body`
and the result state still scrolled at 320px (scroll container is `html`) — caught
by re-measuring, then fixed by moving it to `html`. Chose `clip` over `hidden`
deliberately: `clip` does **not** create a scroll container, so `position: sticky`
keeps working.

**Verified by measurement (not assumed):** at **320px** — landing, `/demo`,
`/try-on`, and the **result state** all report `scrollWidth === clientWidth`, no
horizontal scroll; the `/demo` sticky header still pins to `top:0` after scrolling.
At **375px** (regression check) the result state is also clean. 88 tests green;
build clean.

*(Honest process note: an earlier draft of the Phase 11 entry claimed 320px was
already clean — it wasn't; that was corrected here after actually measuring at
320px. Same verify-then-claim lesson as §3.2 of LIMITATIONS-AND-ROADMAP.)*

---

## Phase 11c — Profile dropdown overflow

User report: tapping the profile switcher ("Me" / "Add person") made the page
widen. Cause: the dropdown was `absolute left-0 w-52` (208px), but the switcher
sits on the **right** of the header (`justify-between`), so the menu opened
rightward and its right edge landed well past the viewport (~432px at a 320px
width) — clipped/scrolled.

Fix: anchor the menu to the **right** edge (`right-0`, opens leftward) and cap it
with `max-w-[calc(100vw-2rem)]` for very narrow screens
(`components/scanner/profile-switcher.tsx`).

**Verified by measurement** at 320px with the dropdown open: menu rect L=88,
R=296, W=208 — fully inside the 320 viewport (`inside=true`), `scrollWidth===320`,
no horizontal scroll. Screenshot confirms the menu opens leftward and on-screen.
88 tests green.

---

## Phase 12 — Data-driven tone-relative calibration

The biggest honesty gap left: redness thresholds were hand-picked. Closed it
properly (ADR-019). Researched datasets via two sub-agents — confirmed no single
"faces + tones + cosmetic-condition labels" set exists freely; combined the
realistic option (Roboflow "Face Skin Problems", 1,008 faces, CC BY 4.0,
multi-label cosmetic concerns, diverse tones).

Built/finished the offline harness `scripts/calibrate.ts` (SQLite via
better-sqlite3, image decode via sharp). Key correctness fix: the harness now
measures the **same signal as runtime** — `a*(cheeks) − a*(forehead)` delta, not
absolute a* — by sampling a forehead band + a cheeks band with the same skin gate
+ robust median. So the derived thresholds transfer 1:1 into `analyze.ts` (no
absolute-vs-delta mismatch, which I caught and fixed before wiring).

Ran on all 1,008 faces. Tone tiers came out Monk 2/5/8 (light/medium/dark) — real
diversity. Calibrated redness bands per tier; dark-skin elevated cutoff is higher
(11 vs ~7), the concrete proof that an absolute threshold would over-flag darker
skin. Per-condition deltas point the right way (acne/eyebags +, wrinkles/dry −).

Wired `lib/analysis/calibration.json` → `calibration.ts` (typed loader) →
`analyze.ts` (tone-aware threshold selection). Also fixed a latent bug found on
the way: the `SkinAnalysis.skinTone` field existed but `analyzeScan` never
populated it — now it does. +11 tests (111 total): calibration integrity + the
existing redness/inclusivity tests still green against the new numbers.

Dataset moved into `datasets/` (raw images gitignored; README + attribution +
derived JSON committed). Full method, results table, and honest limits in
[`CALIBRATION.md`](./CALIBRATION.md).
