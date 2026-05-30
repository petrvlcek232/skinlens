/**
 * MediaPipe FaceMesh lip contours (canonical indices). The outer and inner
 * loops let us fill the lip *band* (between them) with an even-odd rule, so the
 * mouth opening stays clear — the basis of the lipstick try-on.
 */
export const OUTER_LIP = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37,
  39, 40, 185,
] as const;

export const INNER_LIP = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82,
  81, 80, 191,
] as const;

export interface LipShade {
  name: string;
  /** Hex color of the lipstick. */
  color: string;
}

export const LIP_SHADES: LipShade[] = [
  { name: "Classic Red", color: "#c0392b" },
  { name: "Coral", color: "#e8654a" },
  { name: "Berry", color: "#8e2a52" },
  { name: "Plum", color: "#5e2750" },
  { name: "Nude Rose", color: "#b9726b" },
];

/** Highest lip landmark index used — for a quick "enough landmarks" guard. */
export const MAX_LIP_INDEX = 415;
