# SkinLens — on-device AI skin analysis

A privacy-first **AI skin analysis widget**: a live camera scan reads six-plus
facial zones and produces an explainable, inclusive skin assessment — then a
personalized routine. **Everything runs in the browser.** No backend, no
database, no API keys; the photo never leaves the device.

Built as a portfolio demo for a beauty computer-vision platform (Revieve-style),
to the standard a brand could embed — not a clinical instrument (see
[honest positioning](#honesty)).

> **Live demo:** https://skin-advisor-demo-xi.vercel.app ·
> **Bonus AR:** [`/try-on`](https://skin-advisor-demo-xi.vercel.app/try-on) ·
> **Embedded in a fake storefront:** [`/demo`](https://skin-advisor-demo-xi.vercel.app/demo)

<!-- Add a short screen recording of the live mesh heatmap scan here:
![SkinLens scan](docs/media/demo.gif) -->

---

## What it does

- **Real-time face-mesh scan** — MediaPipe FaceLandmarker (478 landmarks) at
  ~60fps, with a live, continuous **heatmap over the face** clipped to the mesh.
- **Multi-frame, robust capture** — averages ~100+ frames with per-frame
  outlier rejection (drops glare/beard/shadow) for a stable result.
- **Explainable, inclusive metrics** — redness, tone evenness, under-eye,
  texture & fine lines — each measured **relative to your own skin**, so they
  behave the same across skin tones (enforced by tests).
- **Lighting quality gate** — exposure + uniformity checks (ISO/IEC 29794-5
  style) before a scan, with a confidence on the result.
- **Personalized routine** — concerns → a deterministic, reason-tied product
  routine over a (fictional) catalog.
- **Scan-to-scan deltas + on-device history** — see responsiveness and a trend
  over time (localStorage, no account).
- **Photo-upload fallback** — analyze a still if there's no camera.
- **Embeddable** — `/embed` is a chrome-free widget; `/demo` is a fictional
  storefront that embeds it via one `<iframe>`.
- **Bonus: AR lipstick try-on** (`/try-on`) — the same mesh, a second product.

## Honesty

SkinLens is an **explainable, relative, classical-CV heuristic** — *not* a
clinical or diagnostic tool, and it does not use a trained skin model. "Accuracy"
here means it measures real quantities, is relative-to-the-individual, and
responds correctly and stably. Full positioning, a self-check recipe, the test
coverage, and what real clinical validation would require are in
[`docs/VALIDATION.md`](./docs/VALIDATION.md).

## Architecture

```
app/            # routes: / (analyzer) · /embed · /demo · /try-on
components/
  scanner/      # FaceScanner (scan/upload), result UI, recommendations, history
  tryon/        # AR lipstick try-on
  marketing/    # product art, embed snippet
  ui/           # hand-built Button/Card (cva + cn)
lib/
  vision/       # framework-agnostic CV SDK: landmarker, regions, color,
                #   sampling, scan accumulator, quality, lighting, heatmap, lips
  analysis/     # relative-to-baseline metrics + composite score
  recommendations/  # deterministic concerns → routine
  history/      # on-device score trend
hooks/          # useCamera
docs/           # DECISIONS (ADRs) · BUILD-JOURNAL · VALIDATION
```

The pipeline: **capture → analyze → score → routine → products**. `lib/vision`
and `lib/analysis` are React-free, so they read like an SDK a brand could lift.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 ·
`@mediapipe/tasks-vision` (WASM, on-device) · Recharts · Vitest.

## Run locally

```bash
npm install
npm run dev          # predev downloads the MediaPipe model into public/models
```

Open http://localhost:3000 and allow the camera (or upload a photo).

```bash
npm run typecheck    # tsc --noEmit
npm test             # Vitest (66 tests)
npm run build        # production build
```

> The MediaPipe WASM loads from a version-pinned CDN; the ~3.6 MB model is
> fetched by `scripts/setup-models.mjs` (predev/prebuild) and gitignored to keep
> the repo lean.

## Documentation

- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Architecture Decision Records: the
  *why* behind every significant choice and trade-off.
- [`docs/BUILD-JOURNAL.md`](./docs/BUILD-JOURNAL.md) — the build narrative,
  including the dead ends and why each iteration happened.
- [`docs/VALIDATION.md`](./docs/VALIDATION.md) — accuracy positioning + test
  coverage.
- [`docs/LIMITATIONS-AND-ROADMAP.md`](./docs/LIMITATIONS-AND-ROADMAP.md) — candid
  list of what doesn't work yet (hair/lighting), why, and how to fix it properly;
  the CV evolution table; and engineering-process notes (branching strategy).
- [`docs/SKIN-TONE-METHODOLOGY.md`](./docs/SKIN-TONE-METHODOLOGY.md) — how skin
  tone is estimated (ITA → Monk scale), why Monk not Fitzpatrick, and the
  data-driven threshold-calibration plan.

## Production roadmap (what "for real" would need)

This demo proves the pipeline and the product. To make defensible clinical
claims you'd add: a labeled, skin-tone-diverse dataset; a trained model for
concerns classical CV can't do honestly (acne, true wrinkle grading,
pigmentation); agreement metrics per skin-tone group + test-retest reliability;
and per-capture white-balance/exposure calibration. Details in `VALIDATION.md`.

## Built with Claude Code

This project was built in a tight, AI-assisted loop. The commit history,
[decision log](./docs/DECISIONS.md) and [build journal](./docs/BUILD-JOURNAL.md)
are the audit trail of that process — kept current as part of the workflow.

---

_Privacy: no image, frame, or landmark is uploaded anywhere. All analysis runs
on-device in the browser._
