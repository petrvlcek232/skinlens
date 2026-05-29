import type { ImageLike } from "@/lib/vision/sampling";
import type { Point2D } from "@/lib/vision/types";

/**
 * Texture / smoothness via the variance of the discrete Laplacian over a square
 * patch — the classic "is this region detailed or smooth" measure. Smooth skin
 * → low Laplacian energy; rough/visible texture → high.
 *
 * Normalized by mean luminance² to reduce exposure dependence. This is a
 * heuristic estimate, not a pore count: it is resolution- and lighting-sensitive
 * and can be inflated by stubble in the patch, which is why texture carries the
 * lowest weight and is read from the (beard-free) forehead. Production would use
 * a trained model — see docs/DECISIONS.md ADR-006 / ADR-011.
 */

function gray(img: ImageLike, x: number, y: number): number {
  const i = (y * img.width + x) * 4;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
}

export function laplacianVariance(
  img: ImageLike,
  center: Point2D,
  half: number,
): number {
  const cx = Math.round(center.x);
  const cy = Math.round(center.y);
  const xs = Math.max(1, cx - half);
  const xe = Math.min(img.width - 2, cx + half);
  const ys = Math.max(1, cy - half);
  const ye = Math.min(img.height - 2, cy + half);

  const laplacians: number[] = [];
  let sumL = 0;
  let count = 0;

  for (let y = ys; y <= ye; y++) {
    for (let x = xs; x <= xe; x++) {
      const l = gray(img, x, y);
      sumL += l;
      count++;
      const lap =
        gray(img, x - 1, y) +
        gray(img, x + 1, y) +
        gray(img, x, y - 1) +
        gray(img, x, y + 1) -
        4 * l;
      laplacians.push(lap);
    }
  }

  if (count === 0 || laplacians.length === 0) return 0;
  const meanL = sumL / count || 1;
  const m = laplacians.reduce((a, b) => a + b, 0) / laplacians.length;
  const variance =
    laplacians.reduce((a, b) => a + (b - m) ** 2, 0) / laplacians.length;
  return variance / (meanL * meanL);
}
