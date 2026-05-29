import type { Point2D } from "./types";

export interface HeatPoint {
  center: Point2D;
  radius: number;
  /** Blob color as an [r, g, b] triple. */
  rgb: [number, number, number];
}

export interface HeatmapOptions {
  /** 0–1 opacity scale, used to fade the map in as a scan fills. */
  intensity?: number;
  /** Face-oval polygon (pixels). When given, the heatmap is clipped to it and a
   *  baseline tint fills the whole face — so the entire mesh reads as a heatmap,
   *  and nothing spills outside the face. */
  clip?: Point2D[];
}

function avgRgb(points: HeatPoint[]): [number, number, number] {
  if (points.length === 0) return [224, 101, 74];
  const sum = points.reduce(
    (acc, p) => [acc[0] + p.rgb[0], acc[1] + p.rgb[1], acc[2] + p.rgb[2]],
    [0, 0, 0],
  );
  return [
    Math.round(sum[0] / points.length),
    Math.round(sum[1] / points.length),
    Math.round(sum[2] / points.length),
  ];
}

/**
 * Renders a continuous face heatmap: a baseline tint over the whole face plus
 * larger overlapping radial blobs at each measured region, blended into one map
 * and clipped to the face oval. Each blob is colored by its region's result (or
 * a single accent during a live scan).
 */
export function drawHeatmap(
  ctx: CanvasRenderingContext2D,
  points: HeatPoint[],
  options: HeatmapOptions = {},
): void {
  const intensity = options.intensity ?? 1;
  const clip = options.clip;
  const hasClip = !!clip && clip.length > 2;

  ctx.save();

  if (hasClip) {
    ctx.beginPath();
    ctx.moveTo(clip[0].x, clip[0].y);
    for (let i = 1; i < clip.length; i++) ctx.lineTo(clip[i].x, clip[i].y);
    ctx.closePath();
    ctx.clip();

    // Baseline tint so the whole face surface reads as a heatmap.
    const [br, bg, bb] = avgRgb(points);
    ctx.fillStyle = `rgba(${br},${bg},${bb},${0.16 * intensity})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // Larger blobs when clipped so they merge into a continuous map within the face.
  const spread = hasClip ? 2.6 : 1.75;
  for (const { center, radius, rgb } of points) {
    const r = radius * spread;
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
