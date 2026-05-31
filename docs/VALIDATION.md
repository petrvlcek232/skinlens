# Validation & honest positioning

The most important question about any skin-analysis tool is *"can I trust the
numbers?"* This document answers that honestly for SkinLens.

## What SkinLens is — and isn't

SkinLens is an **explainable, relative, classical-CV heuristic engine**. It is
**not** a clinical or diagnostic instrument, and it does not use a trained skin
model. Every score is a transparent function of measurable image quantities
(CIELAB channels, luminance statistics, gradient energy) — see
[`DECISIONS.md`](./DECISIONS.md) ADR-006.

Concretely, "accuracy" here does **not** mean "matches a dermatologist's grade."
It means three things we *can* stand behind:

1. **It measures something real** — each concern maps to a defined image quantity.
2. **It is relative to the individual** — scores compare regions of the same face,
   never against an absolute threshold, so they behave the same across skin tones.
3. **It responds correctly and stably** — the right score moves when the
   underlying condition changes, and repeat scans in the same conditions agree.

## How to validate it yourself (no ground-truth dataset needed)

You don't need a second person or a labeled dataset to sanity-check it:

- **Responsiveness.** Scan, then deliberately change one thing — warm/redden a
  cheek, or light one side of your face more — and scan again. The relevant score
  (redness, evenness) should move in the expected direction. The result screen
  shows the scan-to-scan **delta** so you can see it react.
- **Stability.** Scan twice in the same conditions. Because each scan averages
  100+ frames with per-frame outlier rejection, the scores should be within a few
  points. Large random swings would mean the measurement is noise; small deltas
  mean it's stable.
- **Lighting honesty.** Dim the room or light one side — the scan should warn
  ("Too dark" / "Lighting is uneven") and the result's lighting confidence drops.

## What's covered by automated tests

The pure logic is unit-tested (Vitest) so the guarantees can't silently regress:

| Property | Test |
|---|---|
| Color-space math (LAB / HSL / luminance) | `lib/vision/color.test.ts` |
| Region geometry: placement, symmetry, tilt, scale | `lib/vision/regions.test.ts` |
| Robust sampling rejects glare/beard outliers | `lib/vision/scan.test.ts` |
| Multi-frame temporal median | `lib/vision/scan.test.ts` |
| **Tone-robustness** — dark skin scores like light when uniform | `lib/analysis/metrics.test.ts`, `analyze.test.ts` |
| Metrics respond to real concerns (redness, dark under-eye, uneven tone) | `lib/analysis/metrics.test.ts` |
| Fine-lines directionality (horizontal vs vertical) | `lib/analysis/texture.test.ts` |
| Spot/blemish density + tone-robust spot detection | `lib/analysis/blemishes.test.ts` |
| Skin tone: ITA formula, ITA→Monk bins, light/medium/dark tiers | `lib/vision/skin-tone.test.ts` |
| Data-driven calibration loads + tier thresholds valid | `lib/analysis/calibration.test.ts` |
| Lighting gate: dim / bright / uneven; dark-but-even passes | `lib/vision/lighting.test.ts` |
| Recommendations: core always, targeted only when flagged, deterministic | `lib/recommendations/recommend.test.ts` |
| AI coach: deterministic, honest framing, follow-ups | `lib/coach/template-coach.test.ts` |

Total: **119 tests**, all green, run in CI on every push.

## What real, production-grade validation would require

To make defensible *clinical* claims, you'd need:

1. A **labeled, skin-tone-diverse dataset** (ground-truth dermatologist grades),
   captured under controlled or well-characterized lighting.
2. A **trained model** (CNN/ViT) for concerns that classical CV can't do honestly
   — acne, true wrinkle grading, pigmentation typing.
3. **Agreement metrics** vs the labels (per skin-tone group, to prove fairness)
   and **test-retest reliability** across devices and lighting.
4. Calibration against a **physical reference** (e.g. a color/greyscale card) to
   normalize white balance and exposure per capture.

None of that fits a weekend demo, and pretending otherwise would be the opposite
of the honesty this project is built on. SkinLens demonstrates the *pipeline and
the product* — real on-device CV, a relative and inclusive metric design, and the
full capture → analyze → recommend funnel — to the standard a brand could build
on, not a medical device.

## Note on cross-person comparison

The running app intentionally does **not** store scans or compare you against
other users — there is no database; everything is on-device. The score is
therefore meaningful **intra-person, over time** (the trend sparkline), **not as a
ranking between people** — see [`LIMITATIONS-AND-ROADMAP.md`](./LIMITATIONS-AND-ROADMAP.md)
§1.6 (the "family test") and [`DECISIONS.md`](./DECISIONS.md) ADR-022. A true
cross-person "skin age" score needs a trained model benchmarked against an age/
tone-matched reference population — documented as a production step, not faked
here.

The thresholds *are* data-driven, but via **offline calibration** against a
licensed dataset (Roboflow "Face Skin Problems", 1,008 faces) — only the derived
anonymous thresholds ship; no faces are committed or collected. See
[`CALIBRATION.md`](./CALIBRATION.md).
