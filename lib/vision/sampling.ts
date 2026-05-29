import type { Point2D, RGB, SampledRegion } from "./types";
import type { RegionCircle } from "./regions";

/** Minimal shape of a canvas ImageData — kept structural so it's testable. */
export interface ImageLike {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

/**
 * Collects RGB pixels inside a disk. Uses a stride to subsample (a region of a
 * few thousand pixels is plenty for stable statistics, and skipping keeps live
 * analysis fast). Out-of-bounds and fully transparent pixels are skipped.
 */
export function sampleDisk(
  image: ImageLike,
  center: Point2D,
  radius: number,
  stride = 2,
): RGB[] {
  const pixels: RGB[] = [];
  const r = Math.max(1, Math.round(radius));
  const cx = Math.round(center.x);
  const cy = Math.round(center.y);
  const r2 = r * r;
  const step = Math.max(1, Math.round(stride));

  for (let dy = -r; dy <= r; dy += step) {
    const y = cy + dy;
    if (y < 0 || y >= image.height) continue;
    for (let dx = -r; dx <= r; dx += step) {
      if (dx * dx + dy * dy > r2) continue;
      const x = cx + dx;
      if (x < 0 || x >= image.width) continue;
      const idx = (y * image.width + x) * 4;
      if (image.data[idx + 3] === 0) continue;
      pixels.push({
        r: image.data[idx],
        g: image.data[idx + 1],
        b: image.data[idx + 2],
      });
    }
  }
  return pixels;
}

/** Sample every region against one frame of image data. */
export function sampleRegions(
  image: ImageLike,
  regions: RegionCircle[],
  stride = 2,
): SampledRegion[] {
  return regions.map((region) => ({
    ...region,
    pixels: sampleDisk(image, region.center, region.radius, stride),
  }));
}
