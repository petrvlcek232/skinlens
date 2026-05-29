import type { Point2D } from "./types";

export interface HeatPoint {
  center: Point2D;
  radius: number;
  /** Blob color as an [r, g, b] triple. */
  rgb: [number, number, number];
}

/**
 * Draws soft, overlapping radial-gradient blobs that read as a thermal heatmap
 * over the face. Each blob is centered on a measured region and colored by its
 * result (or a single accent during a live scan). Overlap blends adjacent
 * regions into a continuous map rather than discrete dots.
 *
 * `intensity` (0–1) scales opacity — used to fade the map in as a scan fills.
 */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  points: HeatPoint[],
  intensity = 1,
): void {
  ctx.save();
  for (const { center, radius, rgb } of points) {
    const r = radius * 1.75;
    const grad = ctx.createRadialGradient(
      center.x,
      center.y,
      0,
      center.x,
      center.y,
      r,
    );
    const [cr, cg, cb] = rgb;
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},${0.5 * intensity})`);
    grad.addColorStop(0.6, `rgba(${cr},${cg},${cb},${0.22 * intensity})`);
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
