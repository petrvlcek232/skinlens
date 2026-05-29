import { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { Landmark, Point2D } from "./types";

/**
 * Builds the ordered face-oval polygon (in pixels) from the MediaPipe FACE_OVAL
 * connections. We collect the unique oval vertices and sort them by angle around
 * their centroid — the oval is convex, so this yields a clean ring without
 * needing a hardcoded vertex order. Used to clip the heatmap to the mesh so
 * nothing is painted outside the face.
 */
export function faceOvalPolygon(
  landmarks: Landmark[],
  width: number,
  height: number,
): Point2D[] {
  const indices = new Set<number>();
  for (const c of FaceLandmarker.FACE_LANDMARKS_FACE_OVAL) {
    indices.add(c.start);
    indices.add(c.end);
  }

  const pts: Point2D[] = [];
  for (const i of indices) {
    const lm = landmarks[i];
    if (lm) pts.push({ x: lm.x * width, y: lm.y * height });
  }
  if (pts.length < 3) return [];

  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return pts.sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );
}
