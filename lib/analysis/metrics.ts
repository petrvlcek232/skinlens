import { rgbToLab } from "@/lib/vision/color";
import type { LAB, RegionId, RegionSampleStats } from "@/lib/vision/types";

/**
 * Skin-concern metrics — all computed RELATIVE to the person's own skin, never
 * against absolute thresholds. This is the inclusivity guarantee: a delta
 * between two regions of the *same* face cancels out the person's baseline skin
 * tone, so the metrics behave the same across light and dark skin (see
 * docs/DECISIONS.md ADR-008).
 */

export type LabByRegion = Partial<Record<RegionId, LAB>>;

export function toLab(stats: RegionSampleStats[]): LabByRegion {
  const out: LabByRegion = {};
  for (const s of stats) out[s.id] = rgbToLab(s.color);
  return out;
}

/**
 * Mean "baseline skin" LAB from the least-confounded regions (cheeks + forehead
 * centre) — used for the ITA skin-tone estimate. Excludes under-eye (shadow),
 * nose T-zone (glare) and lip/brow-adjacent zones. Returns null if none present.
 */
export function baselineSkinLab(lab: LabByRegion): LAB | null {
  const ids: RegionId[] = ["leftCheek", "rightCheek", "forehead"];
  const present = ids.map((id) => lab[id]).filter((v): v is LAB => !!v);
  if (present.length === 0) return null;
  const n = present.length;
  return {
    l: present.reduce((s, v) => s + v.l, 0) / n,
    a: present.reduce((s, v) => s + v.a, 0) / n,
    b: present.reduce((s, v) => s + v.b, 0) / n,
  };
}

function mean(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}

function stdev(ns: number[]): number {
  if (ns.length < 2) return 0;
  const m = mean(ns);
  return Math.sqrt(mean(ns.map((n) => (n - m) ** 2)));
}

function present(values: (LAB | undefined)[]): LAB[] {
  return values.filter((v): v is LAB => v !== undefined);
}

/**
 * Map a relative delta to a 0–100 health score (higher = healthier). At or
 * below `goodAt` the score is 100; at or above `badAt` it bottoms out at
 * `floor`; linear in between. Bands are heuristic and documented as such — this
 * is a demo, not a clinical instrument.
 */
export function scoreFromDelta(
  value: number,
  goodAt: number,
  badAt: number,
  floor = 35,
): number {
  if (value <= goodAt) return 100;
  if (value >= badAt) return floor;
  const t = (value - goodAt) / (badAt - goodAt);
  return Math.round(100 - t * (100 - floor));
}

/**
 * Redness / sensitivity: how much more red (CIELAB a*) the central face
 * (cheeks + nose) is than the forehead. Relative, so skin tone cancels;
 * isolates erythema/flushing rather than baseline complexion.
 */
export function rednessDelta(lab: LabByRegion): number {
  const central = present([lab.leftCheek, lab.rightCheek, lab.noseTzone]);
  const forehead = lab.forehead;
  if (central.length === 0 || !forehead) return 0;
  return mean(central.map((c) => c.a)) - forehead.a;
}

/**
 * Under-eye darkness: how much darker (lower L*) the under-eye area is than the
 * person's own cheeks. A delta, so it does NOT flag dark skin as "dark
 * circles" — only a within-face contrast does.
 */
export function underEyeDelta(lab: LabByRegion): number {
  const cheeks = present([lab.leftCheek, lab.rightCheek]);
  const underEye = present([lab.underEyeLeft, lab.underEyeRight]);
  if (cheeks.length === 0 || underEye.length === 0) return 0;
  return mean(cheeks.map((c) => c.l)) - mean(underEye.map((u) => u.l));
}

/**
 * Tone evenness: spread (std dev) of lightness across all sampled regions.
 * Purely intra-individual, so tone-independent.
 */
export function toneSpread(lab: LabByRegion): number {
  const ls = present(Object.values(lab)).map((v) => v.l);
  return stdev(ls);
}
