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

/** A frozen frame plus its detected landmarks, handed to the analysis stage. */
export interface SkinCapture {
  /** Pixels of the frozen frame (un-mirrored, native resolution). */
  imageData: ImageData;
  landmarks: Landmark[];
  width: number;
  height: number;
  /** Data URL for displaying the captured shot back to the user. */
  preview: string;
}
