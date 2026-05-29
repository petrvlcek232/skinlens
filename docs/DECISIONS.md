# Decision log

Architecture Decision Records for SkinLens. Each entry captures the **context**
(what forced a choice), the **decision**, and the **rationale** (why this over
the alternatives). Newest decisions are appended at the bottom.

The point of this log is honesty about trade-offs: a reviewer should be able to
see not just *what* was built, but *why*, and what was deliberately left out.

---

## ADR-001 — Hero product: AI Skincare Analyzer

**Context.** Revieve ships four advisor products (skincare, makeup, haircare,
hair-color). A weekend demo can only do one thing excellently.

**Decision.** Build the **AI Skincare Analyzer** as the hero, not the makeup or
hair-color virtual try-on.

**Rationale.** Skincare is Revieve's flagship and tells the *whole* business
funnel (capture → analyze → score → routine → products), which demonstrates that
I understand their B2B value — the CV is a means, the conversion is the point.
It can also be done **honestly** with classical computer vision (no faked model),
and its result screen is screenshot-friendly. Makeup/hair try-on have higher
"first-open wow" but tell less of a business story and carry more real-time
rendering polish risk. Trade-off accepted: slightly less visceral than live AR.

---

## ADR-002 — Framing: an embeddable brand widget

**Context.** Revieve does not sell an app; it sells a widget that beauty brands
embed on their own storefronts.

**Decision.** Structure the project as a **drop-in widget** with a clean,
framework-agnostic vision engine (`lib/vision/`) separated from the React UI,
plus a host "brand demo" page and an embed surface.

**Rationale.** Mirroring their actual delivery model signals "I understand how
you ship," not just "I can code CV." The `lib/vision/` layer is deliberately
free of React so it reads like an SDK a brand could adopt.

---

## ADR-003 — On-device computer vision, no backend

**Context.** Skin analysis means sending someone's face somewhere. That is a
privacy-sensitive act, and Revieve markets privacy-conscious, on-device options.

**Decision.** Run everything **in the browser** via MediaPipe Tasks Vision
(`@mediapipe/tasks-vision`, FaceLandmarker). No image ever leaves the device; no
server, no database, no API keys.

**Rationale.** Privacy is a genuine selling point in beauty ("your photo never
leaves your device"), it removes cost and infra from a weekend build, and it is
honest — the demo really is local. WASM + WebGL gives real-time performance
(~60fps observed). Trade-off: bound by on-device model quality, but for landmark
detection MediaPipe is excellent and diverse-trained.

---

## ADR-004 — WASM from a pinned CDN, model self-hosted via a setup script

**Context.** The MediaPipe WASM bundles are ~33 MB across three variants; the
FaceLandmarker model is ~3.6 MB. Committing all of it bloats a portfolio repo a
reviewer will clone.

**Decision.** Load WASM from a **version-pinned jsDelivr CDN**
(`@mediapipe/tasks-vision@<exact>/wasm`); download the **model** into
`public/models` via `scripts/setup-models.mjs`, wired into `predev`/`prebuild`
and gitignored.

**Rationale.** Keeps the repo lean and reproducible. Pinning the WASM version to
the installed package avoids silent CDN drift. Self-hosting the model removes a
runtime dependency on Google's storage host (faster, more reliable) while keeping
it out of git. The setup script is itself a small infra signal.

---

## ADR-005 — Geometric region derivation, not hardcoded landmark polygons

**Context.** Skin metrics are sampled from facial regions (forehead, cheeks,
under-eye, T-zone). The naive approach is to hardcode dozens of FaceMesh polygon
indices per region.

**Decision.** Derive each region **geometrically** from a small set of
high-confidence anchor landmarks (eye corners 33/133/362/263, nose tip 4,
forehead 10, chin 152): build a tilt-robust local frame from the eye axis and
eye→chin axis, then place each region as an offset in units of the inter-eye
distance.

**Rationale.** Hardcoding ~40 polygon indices I'm not 100% sure of is brittle and
error-prone. Deriving from a few anchors I *am* sure of is explainable, scales
with face size, survives head tilt, and degrades gracefully. It is also unit-
testable without a camera (synthetic faces, including rotated and scaled). This
robustness is what lets the demo claim it works across face shapes and sizes.

---

## ADR-006 — Honest classical-CV metrics, not a faked CNN

**Context.** "AI skin analysis" invites faking a deep model that emits
plausible-looking scores. Reviewers at a CV company will see through that.

**Decision.** Compute concern signals with **explainable classical CV** —
CIELAB `a*` for redness, Laplacian variance for texture, luminance statistics for
evenness and under-eye darkness — and say so plainly. Do **not** claim acne or
wrinkle detection (those need a trained CNN we don't have).

**Rationale.** Honesty about the method, plus knowing exactly where the MVP line
is and how I'd productionize it (a real model), is a stronger signal than a
black box that invents numbers. Restraint is the senior move.

---

## ADR-007 — Real-time multi-frame guided scan; rejected guided head-turn

**Context.** A single-frame "freeze + draw circles" capture felt static and
risked sampling one bad frame. Question raised: should the user rotate their head
(left/right/up/down), and would that improve accuracy?

**Decision.** Use a **~2s frontal multi-frame scan** with a live scan-line sweep
and filling region rings over the real face. **Rejected** guided head-rotation.

**Rationale (from research on Revieve, Perfect Corp, and the open-source
`skin-scan` project).** MediaPipe already detects all 478 landmarks accurately
from one frontal frame — rotation does not add points, and for *flat* skin
regions a frontal pose is optimal (rotation foreshortens/occludes them). The real
accuracy levers the industry uses are (1) real-time quality gating, (2)
**multi-frame temporal averaging**, (3) robust statistics, (4) relative-to-
baseline metrics. So the "scan" is both the UX and the accuracy win: averaging
~100+ frames kills single-frame noise. Head-turn adds liveness/peripheral
coverage but only marginal benefit for our flat-region metrics, at real jank
risk — parked as a v2 talking point.

---

## ADR-008 — Inclusivity by design: relative-to-baseline metrics + robust sampling

**Context.** Naive skin tools fail on darker skin tones because they use absolute
thresholds calibrated on light skin (e.g. always flagging "dark circles").
Working across all skin tones and face types was a hard requirement.

**Decision.** Two structural rules. (1) Every metric is computed **relative to the
person's own skin baseline**, never an absolute threshold — under-eye darkness is
a *delta* vs the person's own cheek, redness is `a*` vs their own facial baseline,
etc. (2) Per-frame region color uses a **robust estimator**: median after
rejecting luminance outliers (> 2.5·MAD), which drops beard hairs, specular glare
and stray shadow regardless of skin tone.

**Rationale.** Region geometry is already tone-agnostic (landmark-based). The
inclusivity risk lives entirely in the *metrics*, so the defense must live there:
self-relative measures generalize across tones, and robust statistics generalize
across face types (beards, glasses). Honest caveat: true cross-population
validation needs testing on many faces — the architecture is built for it, but
it is a principle, not a proof.

---

## ADR-009 — Tailwind v4 explicit `@source` globs

**Context.** During first preview, Tailwind v4 generated zero utility classes
(only the theme variables) — the page rendered unstyled.

**Decision.** Declare explicit `@source` globs in `app/globals.css` for `app/`,
`components/`, `hooks/`.

**Rationale.** Tailwind v4 auto-detects source files from the build's working
directory, which is brittle when the dev server is launched from a different cwd
(as it was here). `@source` paths resolve relative to the stylesheet, making
utility generation deterministic regardless of how the server is started.

---

## ADR-010 — Hand-built UI primitives instead of the shadcn CLI

**Context.** shadcn/ui is the obvious component source, but its CLI init can be
brittle on a brand-new Tailwind v4 + Next 16 setup.

**Decision.** Hand-write the few needed primitives (`Button`, `Card`) in the
shadcn style using `cva` + a `cn()` helper.

**Rationale.** We need two or three primitives, not a registry. Hand-writing them
avoids CLI friction, keeps full control of styling tokens, and is faster than
debugging an init on a bleeding-edge stack.

---

## ADR-011 — Four honest concerns; dropped "shine/oiliness"

**Context.** The original plan listed five concerns including shine/oiliness in
the T-zone. Building the metrics surfaced a direct conflict.

**Decision.** Ship **four** concerns — redness, tone evenness, under-eye,
texture — and **drop shine/oiliness**. Texture is included but explicitly
labelled heuristic and given the lowest weight (0.2).

**Rationale.** Shine *is* specular highlight — but our robust per-frame sampler
deliberately **rejects** bright outliers (glare) so beards/glasses don't skew
color metrics ([ADR-008](#adr-008--inclusivity-by-design-relative-to-baseline-metrics--robust-sampling)).
Measuring shine would require keeping exactly what we throw away, and worse, a
window reflection is indistinguishable from oily skin without controlled
lighting. Rather than ship a metric we can't defend, we cut it. Texture (variance
of Laplacian on the beard-free forehead) is kept but normalized by luminance and
flagged as lighting/resolution-sensitive — an estimate, not a pore count.
Four metrics we can stand behind beat five with a shaky one.

---

## ADR-012 — Lighting quality gate (tone-robust)

**Context.** Lighting is the single biggest confounder in selfie skin analysis —
a dim or side-lit scene can swing every metric. A scan taken in bad light gives
confident-looking but wrong results, which would poison the whole funnel.

**Decision.** Add a real-time **lighting gate** (`lib/vision/lighting.ts`) that
runs on the already-sampled face regions (zero extra cost). It assesses three
things, following ISO/IEC 29794-5 face-image-quality practice: **exposure
clipping** (fraction of crushed ≈0 and blown ≈255 pixels), **brightness band**,
and **left/right-cheek uniformity** (harsh side-light detector). The scan is
gated on it (the button disables with a hint like "Too dark — find more light"),
and the result carries a lighting **confidence** (level + 0–100 score).

**Rationale.** Industry tools (Revieve, L'Oréal Skin Genius) explicitly guide on
lighting before capture, and research ties illumination quality directly to
beauty-recommendation accuracy. Crucially, the gate is **tone-robust**: the
primary signals are exposure clipping and left/right uniformity — clipping is bad
regardless of skin tone, and uniformity is a within-face delta. We deliberately
avoid an absolute brightness threshold as the main gate (it would penalize darker
skin, whose face luminance is legitimately lower); only a conservative darkness
floor catches genuine near-darkness. Honest limitation: perfectly separating
"dark skin in good light" from "light skin in dim light" from one image is an
open problem (the illumination-dataset diversity gap is documented) — so we gate
on the tone-robust signals and surface a confidence rather than pretending
certainty. Enforced by a test asserting dark-but-evenly-lit skin passes as
"good," not "dim."

---

## ADR-013 — Deterministic, reason-tied recommendations over a generic catalog

**Context.** The funnel needs to turn the analysis into product recommendations —
the step that actually drives conversion for a brand. Two temptations: (a) use
real brand names, (b) make recommendations feel "smart" by being opaque.

**Decision.** A small **fictional, generically-named** catalog (`lib/recommendations/catalog.ts`)
and a **deterministic** mapping (`recommend.ts`): core steps (cleanse / moisturize
/ protect) always present; targeted serums added only for concerns the scan
flagged, worst-first, capped at two; every step carries a **reason tied to the
user's own score**.

**Rationale.** Generic names avoid trademark and unverifiable clinical claims —
honest for a demo, and in production this slot is simply the brand's real product
feed (documented in the UI). Deterministic + reason-tied means the logic is
testable, explainable, and never a blind upsell — recommendations a user (and a
reviewer) can trust. The cap keeps the routine realistic rather than selling the
whole catalog.

---

## ADR-014 — Forehead band + heatmap visualization

**Context.** Two requests after seeing the result: (1) involve the forehead more
(it's where expression lines form), (2) replace the discrete region circles with
a face heatmap.

**Decision.** (a) Sample the **forehead as a band** — centre + left + right
(`foreheadLeft`/`foreheadRight` added to `RegionId`) — and enhance the texture
concern into **"Texture & fine lines"**: combine isotropic Laplacian variance
with **horizontal-line energy** (mean absolute *vertical* gradient, which
responds to horizontal edges — the orientation of forehead lines). (b) Render the
live scan and the result as a **soft heatmap** (`lib/vision/heatmap.ts`):
overlapping radial-gradient blobs over the measured regions, severity-colored on
the result, fading in with progress during the scan, over a faint mesh.

**Rationale.** The forehead band gives the heatmap a continuous brow region and
improves tone-evenness coverage, and a *directional* line measure is a more honest
"fine lines" signal than isotropic texture. It stays an explicit **heuristic** —
luminance-normalized, lighting-sensitive, low-weighted, and labelled as an
estimate, **not** clinical wrinkle grading (consistent with ADR-006). Tested for
directionality: horizontal stripes score far higher than vertical ones. The
heatmap reads like Revieve/Perfect Corp LiveAR and ties the visual directly to
per-region severity, which discrete circles didn't convey.

---

## ADR-015 — Camera on explicit gesture; quiet MediaPipe; cross-browser

**Context.** The widget auto-started the camera on mount, so embedding it in a
storefront (`/demo` iframe) fired a permission prompt the instant the page
loaded — wrong for a real shop. Separately, MediaPipe's WASM prints info/warn
lines that tripped the Next dev error overlay.

**Decision.** (1) **Never request the camera on mount** — the widget shows a
launch screen and calls `getUserMedia` only when the user taps "Start skin
analysis." (2) A tiny `silenceMediaPipeLogs()` console filter drops only
MediaPipe's known-noisy lines (XNNPACK, GL error-checking, feedback-manager).
(3) Treat Chrome/Safari/Edge/Firefox + mobile as first-class: `playsInline` +
muted video, standard `getUserMedia`, responsive layouts, and the embed iframe
carries `allow="camera"`.

**Rationale.** A camera prompt on page load is a trust-killer in a storefront and
the fastest way to get the widget removed; gating on a gesture is both better UX
and required for a believable embed demo. The log filter is surgical (specific
strings only) so real errors still surface. Cross-browser + responsive is
non-negotiable for a beauty audience that is overwhelmingly on mobile.
