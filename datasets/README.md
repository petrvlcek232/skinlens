# Calibration datasets

The raw face images are **deliberately not committed** to this repo:

- **Privacy** — committing 1,000+ real faces would contradict the whole premise
  of SkinLens (on-device, nothing-leaves-your-device). The derived, anonymous
  statistics (`lib/analysis/calibration.json`) are committed instead.
- **Size** — keeps the portfolio repo lean to clone.

Only this README and the derived calibration artifact are version-controlled.
The image folders (`train/`, `valid/`, `test/`) are gitignored.

---

## Dataset used: "Face Skin Problems"

- **Source:** Roboflow Universe — <https://universe.roboflow.com/dental-caries-mlx7r/face-skin-problems>
- **License:** CC BY 4.0 (attribution required — provided here).
- **Contents:** 1,130 frontal-face images (1,008 train / 61 valid / 61 test),
  multi-label annotated across 10 cosmetic concerns: Acne, Blackheads,
  Dark-Spots, Dry-Skin, Enlarged-Pores, Eyebags, Oily-Skin, Skin-Redness,
  Whiteheads, Wrinkles. Diverse skin tones.
- **Label format:** `_classes.csv` per split — `filename` + one 0/1 column per
  concern (Roboflow multi-label export).

### How to fetch
1. Open the Roboflow URL above → **Download Dataset**.
2. Format: **Multi-Label Classification** → **Download zip to computer**.
3. Unzip so the folders land at:
   ```
   datasets/face-skin-problems/{train,valid,test}/
   ```

---

## How calibration uses it

`scripts/calibrate.ts` runs the **same colorimetric primitives the app uses at
runtime** over every image, stores per-image measurements in SQLite, and derives
the **tone-relative thresholds** in `lib/analysis/calibration.json`. The app
imports that JSON instead of hand-picked numbers.

```bash
npx tsx scripts/calibrate.ts \
  "datasets/face-skin-problems/train" \
  "datasets/face-skin-problems/train/_classes.csv" \
  --out lib/analysis/calibration.json
```

What it computes (per image): central-face skin sample → CIELAB → **ITA → Monk
skin-tone tier** → redness proxy. Aggregated per tone tier into percentile
thresholds, plus a per-condition colour summary.

Full method + the science behind ITA/Monk: [`docs/SKIN-TONE-METHODOLOGY.md`](../docs/SKIN-TONE-METHODOLOGY.md).
Honest scope + limits: [`docs/CALIBRATION.md`](../docs/CALIBRATION.md).
