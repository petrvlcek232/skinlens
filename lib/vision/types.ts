/** A single normalized face landmark (x/y in [0,1], z relative depth). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LAB {
  l: number;
  a: number;
  b: number;
}

export interface HSL {
  /** Hue in degrees [0,360). */
  h: number;
  /** Saturation [0,1]. */
  s: number;
  /** Lightness [0,1]. */
  l: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export type RegionId =
  | "forehead"
  | "leftCheek"
  | "rightCheek"
  | "underEyeLeft"
  | "underEyeRight"
  | "noseTzone";

/** A circular sampling region in pixel space, with the pixels it captured. */
export interface SampledRegion {
  id: RegionId;
  center: Point2D;
  radius: number;
  pixels: RGB[];
}

/** Robust per-region color aggregated across all good scan frames. */
export interface RegionSampleStats {
  id: RegionId;
  /** Component-wise median color across frames (outlier-rejected per frame). */
  color: RGB;
  /** Average number of skin pixels sampled per frame. */
  avgPixelCount: number;
  /** How many frames contributed to this region. */
  frameCount: number;
}

/**
 * Output of a multi-frame scan. Color metrics are read from the temporally
 * averaged `regionStats` (stable, flicker-resistant); texture is read from the
 * single sharpest `imageData` frame, re-deriving regions from `landmarks`.
 */
export interface ScanResult {
  regionStats: RegionSampleStats[];
  framesAccumulated: number;
  /** Lighting conditions during the scan — drives a confidence note. */
  lighting: import("./lighting").LightingQuality;
  /** Final frame, native resolution, un-mirrored — for texture + rendering. */
  imageData: ImageData;
  landmarks: Landmark[];
  width: number;
  height: number;
  /** Data URL of the final frame, for displaying the shot back to the user. */
  preview: string;
}
