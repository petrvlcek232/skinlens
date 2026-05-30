/**
 * Calibration harness (dev-time tooling — NOT shipped in the app).
 *
 * Runs the same colorimetric pipeline the widget uses, offline over a folder of
 * face photos, stores every measurement in a SQLite database, and derives
 * tone-relative thresholds + skin-tone-bin statistics into a `calibration.json`
 * the app can import instead of hand-picked thresholds.
 *
 * Honest scope: MediaPipe FaceLandmarker is browser-only, so this Node script
 * cannot reproduce the landmark-derived face regions 1:1. It samples a central
 * face ellipse, applies the runtime skin gate + robust median, and computes the
 * colorimetric signals (ITA to Monk tone, mean Lab, an a-channel redness proxy).
 * That is enough to (a) validate tone bins across a diverse set and (b) derive
 * tone-relative colour thresholds — see docs/SKIN-TONE-METHODOLOGY.md.
 *
 * Usage:
 *   npx tsx scripts/calibrate.ts <images-dir> [labels.csv] [--max N] [--out path]
 *   labels.csv (optional) header: file,ethnicity,condition
 *
 * NOTHING here runs in the shipped app; it is dev-time tooling only.
 */
import { readdirSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, extname, dirname, basename } from "node:path";
import sharp from "sharp";
import Database from "better-sqlite3";
import { rgbToLab } from "../lib/vision/color";
import { computeITA, itaToMonk, itaToTier } from "../lib/vision/skin-tone";

interface Args {
  imagesDir: string;
  labelsCsv?: string;
  max: number;
  out: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let max = Number.POSITIVE_INFINITY;
  let out = "lib/analysis/calibration.json";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--max") max = Number(argv[++i]);
    else if (a === "--out") out = argv[++i];
    else positional.push(a);
  }
  if (positional.length === 0) {
    console.error(
      "Usage: npx tsx scripts/calibrate.ts <images-dir> [labels.csv] [--max N] [--out path]",
    );
    process.exit(1);
  }
  return { imagesDir: positional[0], labelsCsv: positional[1], max, out };
}

function listImages(dir: string, max: number): string[] {
  const exts = new Set([".jpg", ".jpeg", ".png", ".webp"]);
  const files = readdirSync(dir)
    .filter((f) => exts.has(extname(f).toLowerCase()))
    .sort();
  return files.slice(0, Number.isFinite(max) ? max : files.length).map((f) => join(dir, f));
}

/** Tone-robust skin test (same rule as the runtime: red is the dominant channel). */
function isSkinLike({ r, g, b }: RGB): boolean {
  const TOL = 6;
  return r >= g - TOL && r >= b - TOL;
}

function luminance({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function medianRGB(px: RGB[]): RGB {
  return {
    r: median(px.map((p) => p.r)),
    g: median(px.map((p) => p.g)),
    b: median(px.map((p) => p.b)),
  };
}

/** Robust representative RGB for a band of pixels: skin gate + luminance-MAD. */
function robustColor(px: RGB[], minN = 25): RGB | null {
  if (px.length < minN) return null;
  const skin = px.filter(isSkinLike);
  const base = skin.length >= minN ? skin : px;
  const lums = base.map(luminance);
  const medL = median(lums);
  const mad = median(lums.map((l) => Math.abs(l - medL))) || 1;
  const kept = base.filter((_, i) => Math.abs(lums[i] - medL) <= 2.5 * mad);
  return medianRGB(kept.length >= minN ? kept : base);
}

/** Collect pixels inside a normalized rectangle [x0,x1]×[y0,y1] of the image. */
function band(
  data: Buffer | Uint8Array,
  W: number,
  H: number,
  ch: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): RGB[] {
  const px: RGB[] = [];
  for (let y = Math.floor(y0 * H); y < y1 * H; y += 2) {
    for (let x = Math.floor(x0 * W); x < x1 * W; x += 2) {
      const idx = (y * W + x) * ch;
      px.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
    }
  }
  return px;
}

export interface FaceSample {
  /** Overall representative skin RGB (whole central face). */
  skin: RGB;
  /** Cheek band RGB, or null if not enough skin. */
  cheeks: RGB | null;
  /** Forehead band RGB, or null if not enough skin. */
  forehead: RGB;
}

/**
 * Sample the SAME regions the runtime engine uses (approximated without
 * MediaPipe landmarks, since those are browser-only): an overall central-face
 * skin colour, plus a forehead band and a cheeks band so we can compute the
 * runtime's redness signal — `a*(cheeks) − a*(forehead)` — not just absolute a*.
 * These dataset crops are roughly face-filling and centred, so fixed normalized
 * bands are a reasonable proxy. Returns null if no usable skin (not a face).
 */
async function sampleFace(path: string): Promise<FaceSample | null> {
  const { data, info } = await sharp(path).rotate().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: ch } = info;
  if (W < 64 || H < 64) return null;

  // Overall central ellipse (for tone/ITA) — reuse a central rectangle band.
  const overall = robustColor(band(data, W, H, ch, 0.3, 0.7, 0.28, 0.66), 40);
  if (!overall) return null;

  // Forehead: upper-central band. Cheeks: two lateral mid bands.
  const forehead = robustColor(band(data, W, H, ch, 0.36, 0.64, 0.16, 0.30));
  const cheekL = band(data, W, H, ch, 0.18, 0.36, 0.50, 0.70);
  const cheekR = band(data, W, H, ch, 0.64, 0.82, 0.50, 0.70);
  const cheeks = robustColor([...cheekL, ...cheekR]);

  return { skin: overall, cheeks, forehead: forehead ?? overall };
}

/**
 * Loads per-image labels. Supports TWO formats, auto-detected from the header:
 *  - simple:   `file,ethnicity,condition`
 *  - Roboflow: `filename, <classA>, <classB>, …` with 0/1 multi-label columns
 *    (e.g. acne, redness, wrinkles, normal skin). We collapse the positive
 *    columns into one primary `condition`: the first positive non-"normal"
 *    class, else "normal".
 */
function loadLabels(csv?: string): Map<string, { ethnicity: string; condition: string }> {
  const map = new Map<string, { ethnicity: string; condition: string }>();
  if (!csv || !existsSync(csv)) return map;
  const lines = readFileSync(csv, "utf8").trim().split(/\r?\n/);
  if (lines.length < 2) return map;

  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const isRoboflow =
    header[0] === "filename" && !header.includes("condition");

  if (isRoboflow) {
    const classCols = header.slice(1); // condition class names, one per column
    for (const line of lines.slice(1)) {
      const cols = line.split(",").map((s) => s.trim());
      const file = cols[0];
      if (!file) continue;
      const positives = classCols.filter((_, i) => cols[i + 1] === "1");
      const primary =
        positives.find((c) => !c.includes("normal")) ?? positives[0] ?? "normal";
      map.set(file, { ethnicity: "", condition: primary });
    }
  } else {
    for (const line of lines.slice(1)) {
      const [file, ethnicity = "", condition = ""] = line.split(",").map((s) => s.trim());
      if (file) map.set(file, { ethnicity, condition });
    }
  }
  return map;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.imagesDir)) {
    console.error(`Images dir not found: ${args.imagesDir}`);
    process.exit(1);
  }
  const labels = loadLabels(args.labelsCsv);
  const images = listImages(args.imagesDir, args.max);
  console.log(`Found ${images.length} image(s) in ${args.imagesDir}`);

  const db = new Database(":memory:");
  db.exec(`CREATE TABLE samples (
    file TEXT, ethnicity TEXT, condition TEXT,
    r REAL, g REAL, b REAL, l REAL, a REAL, bb REAL,
    ita REAL, monk INTEGER, tier TEXT, redness REAL
  );`);
  const insert = db.prepare(`INSERT INTO samples VALUES
    (@file,@ethnicity,@condition,@r,@g,@b,@l,@a,@bb,@ita,@monk,@tier,@redness)`);

  let ok = 0;
  let skipped = 0;
  for (const path of images) {
    const sample = await sampleFace(path).catch(() => null);
    const name = path.split("/").pop() ?? path;
    if (!sample) {
      skipped++;
      continue;
    }
    const lab = rgbToLab(sample.skin);
    const ita = computeITA(lab);
    const label = labels.get(name) ?? { ethnicity: "", condition: "" };
    // RUNTIME-MATCHING redness signal: a*(cheeks) − a*(forehead). Same quantity
    // analyze.ts computes (rednessDelta), so the thresholds transfer 1:1.
    const cheekLab = sample.cheeks ? rgbToLab(sample.cheeks) : null;
    const foreLab = rgbToLab(sample.forehead);
    const rednessDelta = cheekLab ? cheekLab.a - foreLab.a : 0;
    insert.run({
      file: name,
      ethnicity: label.ethnicity,
      condition: label.condition,
      r: sample.skin.r, g: sample.skin.g, b: sample.skin.b,
      l: lab.l, a: lab.a, bb: lab.b,
      ita, monk: itaToMonk(ita), tier: itaToTier(ita), redness: rednessDelta,
    });
    ok++;
  }

  console.log(`Measured ${ok}, skipped ${skipped} (no face / too few skin pixels)\n`);

  const tiers = ["light", "medium", "dark"] as const;
  const calibration: Record<string, unknown> = {
    generatedFrom: basename(args.imagesDir),
    sampleCount: ok,
    metric: "rednessDelta = a*(cheeks) - a*(forehead); same signal as runtime analyze.ts",
    skinTone: {},
    rednessThresholds: {},
  };

  console.log("Tier      n   ITA(med)  Monk  redΔ(med)  good(p50)  bad(p85)");
  for (const tier of tiers) {
    const rows = db.prepare(`SELECT ita, monk, redness FROM samples WHERE tier = ?`).all(tier) as {
      ita: number; monk: number; redness: number;
    }[];
    if (rows.length === 0) continue;
    const itas = rows.map((r) => r.ita).sort((a, b) => a - b);
    const reds = rows.map((r) => r.redness).sort((a, b) => a - b);
    const monks = rows.map((r) => r.monk).sort((a, b) => a - b);
    // "good" = median redness delta of this population (typical, not flagged);
    // "bad" = 85th percentile (genuinely elevated for this tone).
    const goodAt = Math.round(percentile(reds, 50) * 10) / 10;
    const badAt = Math.round(percentile(reds, 85) * 10) / 10;
    (calibration.skinTone as Record<string, unknown>)[tier] = {
      n: rows.length,
      itaMedian: Math.round(median(itas) * 10) / 10,
      monkMedian: median(monks),
    };
    (calibration.rednessThresholds as Record<string, unknown>)[tier] = { goodAt, badAt };
    console.log(
      `${tier.padEnd(8)} ${String(rows.length).padStart(3)}  ${median(itas).toFixed(1).padStart(7)}  ${String(median(monks)).padStart(4)}  ${median(reds).toFixed(1).padStart(8)}  ${goodAt.toFixed(1).padStart(8)}  ${badAt.toFixed(1).padStart(7)}`,
    );
  }

  // Condition separation (labels): does the redness delta differ by condition?
  if (labels.size > 0) {
    const byCond = db.prepare(
      `SELECT condition, COUNT(*) n, ROUND(AVG(redness),2) avgDelta, ROUND(AVG(l),1) avgL
       FROM samples WHERE condition != '' GROUP BY condition ORDER BY avgDelta DESC`,
    ).all() as { condition: string; n: number; avgDelta: number; avgL: number }[];
    if (byCond.length) {
      console.log("\nBy condition:  condition        n   redΔ(avg)  L*(avg)");
      for (const c of byCond) {
        console.log(`               ${c.condition.padEnd(15)} ${String(c.n).padStart(3)}  ${String(c.avgDelta).padStart(8)}  ${String(c.avgL).padStart(6)}`);
      }
    }
  }

  if (ok > 0) {
    const outPath = args.out.startsWith("/") ? args.out : join(process.cwd(), args.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(calibration, null, 2) + "\n");
    console.log(`\nWrote ${args.out}`);
  } else {
    console.log("\nNo usable samples — no calibration file written.");
  }
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
