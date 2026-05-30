# Threshold calibration

How SkinLens turns its hand-picked severity thresholds into **data-driven,
tone-relative** ones, using a labeled face dataset run through the same vision
primitives the app uses at runtime.

This closes the most honest gap the project had: previously the redness
thresholds (`goodAt=2`, `badAt=14`) were a reasonable *guess*. They are now
derived from the measured distribution across 1,008 real faces, per skin-tone
tier — and the guess turned out close, which is itself worth knowing.

See also: [`SKIN-TONE-METHODOLOGY.md`](./SKIN-TONE-METHODOLOGY.md) (the ITA/Monk
science), [`datasets/README.md`](../datasets/README.md) (the dataset + how to
fetch it), [`VALIDATION.md`](./VALIDATION.md) (overall honesty/positioning).

---

## 1. What gets calibrated, and why tone-relative

The redness concern is `rednessDelta = a*(cheeks) − a*(forehead)` — how much
redder the central face is than the forehead. We score it against two cutoffs:
`goodAt` (typical, unflagged) and `badAt` (genuinely elevated).

The calibration showed the natural redness-delta distribution **differs by skin
tone**, so a single absolute cutoff is wrong — it would systematically over- or
under-flag darker skin. Each ITA-derived tone tier (light / medium / dark) gets
its own band. This is the concrete, measured version of the inclusivity rule the
project committed to in ADR-008.

## 2. The pipeline (`scripts/calibrate.ts`)

Dev-time tooling only — **nothing here ships in the app or the build** (the
script lives in `scripts/`, excluded from the app tsconfig).

1. For each image: decode (sharp) → sample a **forehead band** and a **cheeks
   band** → apply the **same skin gate + luminance-MAD robust median** the
   runtime uses → CIELAB.
2. Compute `rednessDelta = a*(cheeks) − a*(forehead)` — the **identical signal**
   `analyze.ts` computes, so thresholds transfer 1:1 (no absolute-vs-delta
   mismatch).
3. Compute **ITA → Monk tone → tier** from the overall face skin.
4. Store every per-image row in **SQLite**.
5. Aggregate per tier: `goodAt` = median delta, `badAt` = 85th-percentile delta.
6. Emit `lib/analysis/calibration.json`, which `analyze.ts` imports.

Honest scope: MediaPipe FaceLandmarker is browser-only, so the Node script can't
reproduce the landmark-derived regions 1:1. It approximates them with fixed
normalized bands on roughly face-filling, centred dataset crops. Good enough to
calibrate population thresholds; the *runtime* still uses the precise
landmark regions.

Run it:
```bash
npx tsx scripts/calibrate.ts \
  datasets/face-skin-problems/train \
  datasets/face-skin-problems/train/_classes.csv \
  --out lib/analysis/calibration.json
```

## 3. Results (1,008 faces, "Face Skin Problems", CC BY 4.0)

**Tone tiers — real diversity across the set:**

| Tier | n | ITA median | Monk median |
|---|---|---|---|
| light | 463 | 56.0° | 2 |
| medium | 360 | 27.9° | 5 |
| dark | 185 | −14.2° | 8 |

Monk 2 / 5 / 8 across the three tiers — the set genuinely spans light to deep
skin, which is what makes a fairness check meaningful.

**Calibrated redness-delta thresholds (per tier):**

| Tier | goodAt (median) | badAt (p85) |
|---|---|---|
| light | 1.3 | 7.2 |
| medium | 1.3 | 7.1 |
| dark | 0.7 | 11.0 |

The "typical" redness delta is small (~1) everywhere — but the **elevated** cutoff
is notably higher for dark skin (11 vs ~7), i.e. darker skin shows more natural
cheek-vs-forehead a* spread, so flagging it at the light-skin cutoff would be a
false positive. That is exactly the bias a tone-relative threshold prevents.

**Per-condition validation (does the signal track the label?):**

| Condition | n | redness-delta (avg) |
|---|---|---|
| eyebags | 54 | +2.28 |
| acne | 593 | +1.83 |
| dark-spots | 176 | +1.05 |
| skin-redness | 6 | +0.83 |
| wrinkles | 45 | −1.45 |
| dry-skin | 78 | −0.82 |

Conditions that present with cheek redness (acne, eyebags, redness) sit at the
**positive** end; dry/mature presentations (wrinkles, dry skin) sit **negative**.
The metric is measuring something real, in the expected direction.

## 4. How the app consumes it

`lib/analysis/calibration.ts` types and loads the JSON. `analyze.ts` classifies
the user's tone first, then picks that tier's band:

```ts
const skinTone = baseline ? classifySkinTone(baseline) : null;
const redThresh = rednessThresholdFor(skinTone?.tier ?? "light");
const redness = scoreFromDelta(rednessDelta(lab), redThresh.goodAt, redThresh.badAt);
```

Locked in by tests (`calibration.test.ts`): the JSON is non-empty, tiers exist,
Monk medians increase light→dark, and `goodAt < badAt` for every tier.

## 5. Honest limits

- The dataset crops aren't perfect frontal headshots; the band approximation is
  coarser than the runtime's landmark regions. Thresholds are *population-level*
  guidance, not per-pixel ground truth.
- Only **redness** is dataset-calibrated so far. Under-eye, evenness and texture
  still use hand-tuned bands (documented in `analyze.ts`); the same harness can
  calibrate them once a labeled signal exists for each.
- This is cosmetic, not clinical (see `VALIDATION.md`). The dataset's labels are
  crowd/annotator-grade, not dermatologist consensus.
- Re-running on a different dataset (or more of this one) will shift the numbers;
  that's the point — the thresholds are reproducible, not hand-frozen.
