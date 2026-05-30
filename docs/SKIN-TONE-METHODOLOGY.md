# Skin-tone methodology

How SkinLens estimates skin tone, why it uses the choices it does, and what is
deliberately *not* claimed. This is the science behind `lib/vision/skin-tone.ts`.

## TL;DR

Skin tone is estimated with the **Individual Typology Angle (ITA)** — the
standard colorimetric measure in dermatology — computed from the CIELAB values we
already sample, then mapped to the **Monk Skin Tone (MST) 1–10** scale. It is
surfaced as an **approximate, indicative** estimate, never a clinical or
phototype claim.

## The formula

```
ITA° = arctan((L* − 50) / b*) × 180 / π
```

(Chardon et al. 1991; darker-tone extension by Del Bino et al. 2013.) `L*` is
lightness, `b*` the blue–yellow axis, both from CIELAB. We compute it from a
**baseline-skin sample** — the mean LAB of the cheeks + forehead-centre regions,
which are the least confounded by shadow (under-eye), glare (nose) or hair/brow.
Higher ITA → lighter; lower (incl. negative) → darker.

## Why Monk, not Fitzpatrick

We report MST, not Fitzpatrick, on purpose:

- **Fitzpatrick measures UV photo-response** (how skin burns/tans) — that is a
  *behavioural/anamnestic* property and **cannot be reliably derived from a single
  image**. A 2025 *npj Digital Medicine* study found AI Fitzpatrick classification
  from images was only ~0–20% accurate, vs ~89–92% for Monk.
- **Monk is a constitutive-pigmentation scale** designed for inclusivity:
  Fitzpatrick gives darker skin only 2 of its 6 steps, while Monk gives it 6 of
  10 — so it has the resolution to represent (and to *measure bias across*) the
  full tone range. This is also why Google adopted Monk for ML fairness work.

`itaToMonk()` maps the continuous ITA to MST 1–10 using the published
ITA→MST correspondence; `itaToTier()` gives a coarse light/medium/dark band used
for tone-relative thresholds.

## What this is NOT

- **Not Fitzpatrick / phototype.** We don't claim how skin reacts to sun.
- **Not clinical.** It's a colorimetric appearance estimate from one uncalibrated
  image; lighting and white balance affect it. The UI labels it "approximate."
- **Not diagnosis.** Consistent with the project's cosmetic-only positioning
  (see VALIDATION.md): Revieve itself is a cosmetic/wellness product, not a
  medical device, and so is this demo.

## Honest limitations

- A single image under uncontrolled lighting shifts L*/b*; the lighting gate
  (ADR-012) flags poor inputs, but tone is still an estimate.
- ITA↔Fitzpatrick is an approximation with wide within-category variance,
  especially mid-range — which is exactly why we surface MST instead.
- True calibration would normalize per capture (white-balance/reference card) and
  validate tone bins on a labeled, tone-diverse set — see
  [`LIMITATIONS-AND-ROADMAP.md`](./LIMITATIONS-AND-ROADMAP.md) and the calibration
  notes below.

## How skin tone feeds the rest of the pipeline

The coarse tier (light/medium/dark) is the basis for **tone-relative severity
thresholds**: a redness or evenness delta should be judged against the person's
own tone group, not an absolute cutoff (the inclusivity rule, ADR-008). Today the
concern thresholds are still heuristic; the data-driven calibration that uses
these tiers is described next.

## Calibration (data-driven thresholds) — status

The concern→score thresholds in `analyzeScan` (e.g. redness `scoreFromDelta(Δ, 2,
14)`) are currently **heuristic estimates**, honestly flagged as such. The planned
upgrade replaces them with **percentile thresholds computed per tone tier** from a
sample of frontal faces:

1. Run the vision pipeline over a set of diverse frontal faces.
2. For each face: compute ITA → tone tier, and the concern deltas.
3. Store measurements (no images) in a local **SQLite** dataset.
4. Within each tier, set severity by **percentile rank** of each delta
   (e.g. 0–33 mild / 33–66 moderate / 66–100 elevated) → emit a
   `calibration.json` the app imports.

**Data note:** the Google **SCIN** dataset (eFST/eMST labels) was evaluated and
**rejected** for this — its faces are redacted and ~89% are body-area condition
photos, not frontal selfies. A diverse frontal-face set (e.g. an FFHQ subset, or
self-supplied consented photos) is the practical source; ITA itself is the
label-free tone classifier, so no manual tone labels are needed. See
`LIMITATIONS-AND-ROADMAP.md` §4.

## Sources

- Chardon A. et al. (1991) — Individual Typology Angle.
- Del Bino S. et al. (2013) — ITA darker-tone extension / categories.
- Monk E. / Google (2023) — Monk Skin Tone Scale.
- *npj Digital Medicine* (2025) — skin-tone scale comparison for AI fairness
  (ITA→MST correspondence; Fitzpatrick-from-image accuracy).
- Google/Stanford SCIN dataset — github.com/google-research-datasets/scin.
