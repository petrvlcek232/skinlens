"use client";

import { useEffect, useRef } from "react";
import {
  DrawingUtils,
  FaceLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { deriveRegions } from "@/lib/vision/regions";
import { drawHeatmap, type HeatPoint } from "@/lib/vision/heatmap";
import type { RegionId, ScanResult } from "@/lib/vision/types";
import type { ConcernId, Severity, SkinAnalysis } from "@/lib/analysis/analyze";

/** Which concern's severity colors each region in the heatmap. */
const REGION_CONCERN: Record<RegionId, ConcernId> = {
  forehead: "texture",
  foreheadLeft: "texture",
  foreheadRight: "texture",
  outerEyeLeft: "texture",
  outerEyeRight: "texture",
  nasolabialLeft: "texture",
  nasolabialRight: "texture",
  upperLip: "texture",
  chin: "texture",
  noseTzone: "redness",
  leftCheek: "redness",
  rightCheek: "redness",
  underEyeLeft: "underEye",
  underEyeRight: "underEye",
};

const SEVERITY_RGB: Record<Severity, [number, number, number]> = {
  good: [91, 138, 114],
  moderate: [201, 138, 43],
  attention: [224, 101, 74],
};

const NEUTRAL: [number, number, number] = [224, 101, 74];

interface CapturedPreviewProps {
  result: Pick<ScanResult, "imageData" | "landmarks" | "width" | "height">;
  analysis?: SkinAnalysis | null;
}

/**
 * The final scan frame as a face-mesh heatmap: a faint tesselation overlay plus
 * soft severity-colored blobs over the measured regions — green good, amber
 * watch, coral attention (Revieve LiveAR-style), tying the visual to the scores.
 */
export function CapturedPreview({ result, analysis }: CapturedPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(result.imageData, 0, 0);

    // Faint mesh under the heatmap for the "AI surface" read.
    const drawing = new DrawingUtils(ctx);
    drawing.drawConnectors(
      result.landmarks as unknown as NormalizedLandmark[],
      FaceLandmarker.FACE_LANDMARKS_TESSELATION,
      { color: "rgba(255,255,255,0.12)", lineWidth: 0.5 },
    );

    const regions = deriveRegions(result.landmarks, result.width, result.height);
    if (!regions) return;

    const rgbFor = (id: RegionId): [number, number, number] => {
      if (!analysis) return NEUTRAL;
      const concern = analysis.concerns.find((c) => c.id === REGION_CONCERN[id]);
      return concern ? SEVERITY_RGB[concern.severity] : NEUTRAL;
    };

    const points: HeatPoint[] = regions.map((r) => ({
      center: r.center,
      radius: r.radius,
      rgb: rgbFor(r.id),
    }));
    drawHeatmap(ctx, points, 1);
  }, [result, analysis]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full object-cover [transform:scaleX(-1)]"
      aria-label="Face heatmap of the skin analysis by region severity"
    />
  );
}
