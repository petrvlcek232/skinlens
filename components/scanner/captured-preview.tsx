"use client";

import { useEffect, useRef } from "react";
import { deriveRegions } from "@/lib/vision/regions";
import type { RegionId, ScanResult } from "@/lib/vision/types";
import type { ConcernId, Severity, SkinAnalysis } from "@/lib/analysis/analyze";

/** Which concern's severity colors each region in the annotated heatmap. */
const REGION_CONCERN: Record<RegionId, ConcernId> = {
  forehead: "texture",
  noseTzone: "redness",
  leftCheek: "redness",
  rightCheek: "redness",
  underEyeLeft: "underEye",
  underEyeRight: "underEye",
};

const SEVERITY_HEX: Record<Severity, string> = {
  good: "#5b8a72",
  moderate: "#c98a2b",
  attention: "#e0654a",
};

interface CapturedPreviewProps {
  result: Pick<ScanResult, "imageData" | "landmarks" | "width" | "height">;
  /** When provided, each region is colored by its concern's severity. */
  analysis?: SkinAnalysis | null;
}

/**
 * Renders the final scan frame with the sampled regions overlaid. With an
 * analysis, regions become a severity heatmap (Revieve LiveAR-style) — green
 * good, amber watch, coral attention — tying the visual back to the scores.
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

    const regions = deriveRegions(result.landmarks, result.width, result.height);
    if (!regions) return;

    const severityFor = (id: RegionId): string => {
      if (!analysis) return "#e0654a";
      const concern = analysis.concerns.find(
        (c) => c.id === REGION_CONCERN[id],
      );
      return concern ? SEVERITY_HEX[concern.severity] : "#e0654a";
    };

    for (const region of regions) {
      const color = severityFor(region.id);
      ctx.beginPath();
      ctx.arc(region.center.x, region.center.y, region.radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, result.width / 320);
      ctx.stroke();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }, [result, analysis]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full object-cover [transform:scaleX(-1)]"
      aria-label="Captured photo with skin-analysis regions highlighted by severity"
    />
  );
}
