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
import { join, extname, dirname } from "node:path";
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

/**
 * Sample a central face ellipse, drop non-skin (skin gate) + luminance outliers,
 * return the representative skin RGB. Null if too few skin pixels (not a face).
 */
async function sampleFaceSkin(path: string): Promise<RGB | null> {
  const img = sharp(path).rotate();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels } = info;
  if (W < 64 || H < 64) return null;

  const cx = W / 2;
  const cy = H * 0.45; // face sits slightly above centre in a headshot
  const rx = W * 0.22;
  const ry = H * 0.28;

  const px: RGB[] = [];
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const idx = (y * W + x) * channels;
      px.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
    }
  }
  if (px.length < 40) return null;

  const skin = px.filter(isSkinLike);
  const base = skin.length >= 40 ? skin : px;

  // Luminance-MAD outlier rejection (drops hair/shadow/glare in the ellipse).
  const lums = base.map(luminance);
  const medL = median(lums);
  const mad = median(lums.map((l) => Math.abs(l - medL))) || 1;
  const kept = base.filter((_, i) => Math.abs(lums[i] - medL) <= 2.5 * mad);
  const usable = kept.length >= 40 ? kept : base;

  return medianRGB(usable);
}

function loadLabels(csv?: string): Map<string, { ethnicity: string; condition: string }> {
  const map = new Map<string, { ethnicity: string; condition: string }>();
  if (!csv || !existsSync(csv)) return map;
  const lines = readFileSync(csv, "utf8").trim().split(/\r?\n/);
  for (const line of lines.slice(1)) {
    const [file, ethnicity = "", condition = ""] = line.split(",").map((s) => s.trim());
    if (file) map.set(file, { ethnicity, condition });
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
    const rgb = await sampleFaceSkin(path).catch(() => null);
    const name = path.split("/").pop() ?? path;
    if (!rgb) {
      skipped++;
      continue;
    }
    const lab = rgbToLab(rgb);
    const ita = computeITA(lab);
    const label = labels.get(name) ?? { ethnicity: "", condition: "" };
    // Redness proxy: CIELAB a* relative to a neutral skin a* of ~13 (tone-robust-ish).
    const redness = lab.a;
    insert.run({
      file: name,
      ethnicity: label.ethnicity,
      condition: label.condition,
      r: rgb.r, g: rgb.g, b: rgb.b,
      l: lab.l, a: lab.a, bb: lab.b,
      ita, monk: itaToMonk(ita), tier: itaToTier(ita), redness,
    });
    ok++;
  }

  console.log(`Measured ${ok}, skipped ${skipped} (no face / too few skin pixels)\n`);

  // Per-tier summary + redness percentiles (the data-driven thresholds).
  const tiers = ["light", "medium", "dark"] as const;
  const calibration: Record<string, unknown> = {
    generatedFrom: args.imagesDir,
    sampleCount: ok,
    skinTone: {},
    rednessThresholds: {},
  };

  console.log("Tier    n   ITA(med)  Monk(med)  a*(med)  a*p33  a*p66");
  for (const tier of tiers) {
    const rows = db.prepare(`SELECT ita, monk, redness FROM samples WHERE tier = ?`).all(tier) as {
      ita: number; monk: number; redness: number;
    }[];
    if (rows.length === 0) continue;
    const itas = rows.map((r) => r.ita).sort((a, b) => a - b);
    const reds = rows.map((r) => r.redness).sort((a, b) => a - b);
    const monks = rows.map((r) => r.monk).sort((a, b) => a - b);
    const p33 = percentile(reds, 33);
    const p66 = percentile(reds, 66);
    (calibration.skinTone as Record<string, unknown>)[tier] = {
      n: rows.length,
      itaMedian: Math.round(median(itas) * 10) / 10,
      monkMedian: median(monks),
    };
    (calibration.rednessThresholds as Record<string, unknown>)[tier] = {
      goodAt: Math.round(p33 * 10) / 10,
      badAt: Math.round(p66 * 10) / 10,
    };
    console.log(
      `${tier.padEnd(7)} ${String(rows.length).padStart(2)}  ${median(itas).toFixed(1).padStart(7)}  ${String(median(monks)).padStart(7)}   ${median(reds).toFixed(1).padStart(6)}  ${p33.toFixed(1).padStart(5)}  ${p66.toFixed(1).padStart(5)}`,
    );
  }

  // Condition separation check (if labels provided): does a* differ by condition?
  if (labels.size > 0) {
    const byCond = db.prepare(
      `SELECT condition, COUNT(*) n, ROUND(AVG(redness),1) avgA, ROUND(AVG(l),1) avgL FROM samples WHERE condition != '' GROUP BY condition`,
    ).all() as { condition: string; n: number; avgA: number; avgL: number }[];
    if (byCond.length) {
      console.log("\nBy condition:  condition  n   a*(avg)  L*(avg)");
      for (const c of byCond) {
        console.log(`               ${c.condition.padEnd(9)} ${String(c.n).padStart(2)}  ${String(c.avgA).padStart(6)}  ${String(c.avgL).padStart(6)}`);
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
