import type { RGB, LAB, HSL } from "./types";

/**
 * Color-space conversions used by the skin-analysis metrics.
 *
 * All inputs are 8-bit sRGB channels (0–255). These are pure, deterministic
 * functions — the analysis pipeline leans on them, so they are unit-tested.
 */

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// D65 reference white.
const Xn = 0.95047;
const Yn = 1.0;
const Zn = 1.08883;

function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** Convert sRGB to CIELAB (L* 0-100; a* and b* roughly -128..127). */
export function rgbToLab({ r, g, b }: RGB): LAB {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / Xn;
  const y = (lr * 0.2126 + lg * 0.7152 + lb * 0.0722) / Yn;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / Zn;

  const fx = labF(x);
  const fy = labF(y);
  const fz = labF(z);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** Convert sRGB to HSL. */
export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));

  let h: number;
  if (max === rn) {
    h = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    h = (bn - rn) / delta + 2;
  } else {
    h = (rn - gn) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

/** Perceptual lightness L* (0–100) — convenience wrapper over rgbToLab. */
export function luminanceL({ r, g, b }: RGB): number {
  return rgbToLab({ r, g, b }).l;
}

/** Population standard deviation of a numeric series. */
export function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Arithmetic mean, 0 for an empty series. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
