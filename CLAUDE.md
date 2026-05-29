@AGENTS.md

# CLAUDE.md — SkinLens

> Read before working in this repo. **The code is the source of truth.** If this
> file disagrees with the code, the code wins and this file must be fixed.
> The *why* behind every significant choice lives in
> [`docs/DECISIONS.md`](./docs/DECISIONS.md); the build narrative + gotchas live
> in [`docs/BUILD-JOURNAL.md`](./docs/BUILD-JOURNAL.md). Keep both current.

## What this is

An **on-device AI skin analysis widget** — a privacy-first, embeddable beauty
experience built as a portfolio demo for Revieve (B2B AI beauty computer vision).
A live camera scan reads six facial regions and produces a relative,
explainable skin assessment. **Everything runs in the browser; no image ever
leaves the device; no backend, no database, no API keys.**

The product flow: **capture (real-time scan) → analyze → score → routine →
products**, delivered as a drop-in widget — mirroring how Revieve ships to brands.

## Tech stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 (CSS-first, no config file) + hand-built shadcn-style primitives |
| Vision | `@mediapipe/tasks-vision` FaceLandmarker (478 landmarks), WASM from pinned CDN |
| Charts/motion | Recharts, framer-motion (result surfaces) |
| Tests | Vitest |
| Deploy | Vercel (planned) |

## Architecture

```
app/                      # Next App Router — page = host "brand demo", widget mounts here
components/
  scanner/                # FaceScanner (live scan), AnalysisResult, widget orchestrator
  ui/                     # hand-built Button, Card (cva + cn)
lib/
  vision/                 # FRAMEWORK-AGNOSTIC CV SDK layer (no React imports)
    landmarker.ts         #   cached FaceLandmarker (VIDEO + IMAGE)
    regions.ts            #   geometric region derivation from anchor landmarks
    color.ts              #   sRGB->CIELAB / HSL, stats
    sampling.ts           #   pixel sampling within a region disk
    scan.ts               #   multi-frame accumulator + robust per-frame color
    quality.ts            #   framing gate
    types.ts              #   shared types (Landmark, ScanResult, …)
  analysis/               # metrics over a ScanResult -> SkinAnalysis
    metrics.ts            #   relative-to-baseline concern deltas
    texture.ts            #   Laplacian-variance texture estimate
    analyze.ts            #   composite score + per-concern result
hooks/                    # useCamera (getUserMedia lifecycle)
scripts/setup-models.mjs  # downloads the MediaPipe model (predev/prebuild)
docs/                     # DECISIONS.md (ADRs) + BUILD-JOURNAL.md
```

## The pipeline (where each step lives)

1. **Capture** — `hooks/use-camera.ts` + `components/scanner/face-scanner.tsx`.
   A ~2s real-time scan: live mesh + sweep + filling region rings, accumulating
   robust region colors across ~100 frames (`lib/vision/scan.ts`).
2. **Analyze** — `lib/analysis/analyze.ts` turns a `ScanResult` into a
   `SkinAnalysis` (four concerns + composite score).
3. **Result** — `components/scanner/analysis-result.tsx` (gauge/radar/annotated
   face land in the result-UI phase).
4. **Recommend** — routine + product mapping (upcoming).

## Non-negotiable rules

1. **On-device only.** No image, frame, or landmark is uploaded. No server, DB,
   or third-party API receives user pixels. Privacy is the product.
2. **Metrics are RELATIVE to the person's own skin — never absolute thresholds.**
   This is the inclusivity guarantee across skin tones (ADR-008). Under-eye is a
   delta vs the person's cheek; redness is `a*` vs their own forehead; etc.
   This rule is **enforced by tests** (`lib/analysis/metrics.test.ts`,
   `analyze.test.ts`): a uniform dark face must score the same as a light one.
   Do not introduce an absolute cutoff calibrated on one skin tone.
3. **`lib/vision/` and `lib/analysis/` stay framework-agnostic** — no React, no
   Next imports. They read like an SDK a brand could lift.
4. **Region geometry is derived from anchor landmarks** (ADR-005), not hardcoded
   polygon index lists. Keep offsets proportional to inter-eye distance.
5. **Per-frame region color uses robust statistics** (median + luminance-outlier
   rejection) so beards/glare/shadow don't skew results.
6. **TypeScript strict, no `any`.** `npx tsc --noEmit` must pass.
7. **Be honest about the method.** Classical CV, explainable. Don't claim a
   trained model we don't have (no acne/wrinkle CNN). State MVP limits plainly.
8. **No `console.log` in component/render paths**; no `TODO`/placeholder code.

## Tailwind v4 gotcha

Utilities are generated from explicit `@source` globs in `app/globals.css`
(ADR-009) — auto-detection keyed off the build cwd and produced an unstyled page.
If you add a new top-level directory with class usage, add an `@source` for it.

## Commands

```bash
npm run setup       # download the MediaPipe model into public/models
npm run dev         # Next dev (predev runs setup)
npm run build       # production build (prebuild runs setup)
npm run typecheck   # tsc --noEmit
npm test            # Vitest (must pass before commit)
```

## Documentation discipline (required)

Any material change updates the docs in the **same commit**:

- New decision / reversal / trade-off → append an ADR to `docs/DECISIONS.md`.
- New phase, discovery, gotcha, or iteration → narrate it in
  `docs/BUILD-JOURNAL.md`.
- Changed pipeline / rule / structure → update this file.

A clean repo that hides its reasoning is worse than a documented one. When in
doubt, write it down.

## Git workflow

- Work on `main`; commit in small, logical, well-described commits.
- Commit + push to `origin` (https://github.com/petrvlcek232/skinlens) is the
  destination for this project.
- This project is **fully independent of GEO Tracker** — no shared code or remote.

## Communication

- Czech in conversation; code, comments, identifiers and docs in English.
- Explain the approach briefly, then the code. Surface trade-offs honestly.
