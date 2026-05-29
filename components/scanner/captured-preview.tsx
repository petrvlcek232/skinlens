"use client";

import { useEffect, useRef } from "react";
import { deriveRegions } from "@/lib/vision/regions";
import type { SkinCapture } from "@/lib/vision/types";

interface CapturedPreviewProps {
  capture: SkinCapture;
}

/**
 * Renders the frozen capture with the derived sampling regions overlaid — a
 * direct visual proof that landmarks → region geometry → sampling all line up
 * on the forehead, cheeks, under-eye and T-zone.
 */
export function CapturedPreview({ capture }: CapturedPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = capture.width;
    canvas.height = capture.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(capture.imageData, 0, 0);

    const regions = deriveRegions(capture.landmarks, capture.width, capture.height);
    if (!regions) return;

    for (const region of regions) {
      ctx.beginPath();
      ctx.arc(region.center.x, region.center.y, region.radius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(224,101,74,0.95)";
      ctx.lineWidth = Math.max(2, capture.width / 320);
      ctx.stroke();
      ctx.fillStyle = "rgba(224,101,74,0.12)";
      ctx.fill();
    }
  }, [capture]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full object-cover [transform:scaleX(-1)]"
      aria-label="Captured photo with skin-analysis regions highlighted"
    />
  );
}
