"use client";

import { useEffect, useRef } from "react";
import { deriveRegions } from "@/lib/vision/regions";
import type { ScanResult } from "@/lib/vision/types";

interface CapturedPreviewProps {
  result: Pick<ScanResult, "imageData" | "landmarks" | "width" | "height">;
}

/**
 * Renders the final scan frame with the sampled regions overlaid — a visual
 * proof that landmarks → region geometry → sampling all line up on the
 * forehead, cheeks, under-eye and T-zone.
 */
export function CapturedPreview({ result }: CapturedPreviewProps) {
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

    for (const region of regions) {
      ctx.beginPath();
      ctx.arc(region.center.x, region.center.y, region.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(224,101,74,0.95)";
      ctx.lineWidth = Math.max(2, result.width / 320);
      ctx.stroke();
      ctx.fillStyle = "rgba(224,101,74,0.12)";
      ctx.fill();
    }
  }, [result]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full object-cover [transform:scaleX(-1)]"
      aria-label="Captured photo with skin-analysis regions highlighted"
    />
  );
}
