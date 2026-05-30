"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { Sparkles, ShieldCheck, RotateCcw, CircleAlert, Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { getFaceLandmarker } from "@/lib/vision/landmarker";
import { OUTER_LIP, INNER_LIP, LIP_SHADES, type LipShade } from "@/lib/vision/lips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function drawLips(
  ctx: CanvasRenderingContext2D,
  face: NormalizedLandmark[],
  w: number,
  h: number,
  color: string,
) {
  const trace = (loop: readonly number[]) => {
    loop.forEach((idx, i) => {
      const p = face[idx];
      if (!p) return;
      const x = p.x * w;
      const y = p.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };

  ctx.save();
  ctx.beginPath();
  trace(OUTER_LIP);
  trace(INNER_LIP);
  ctx.globalAlpha = 0.55;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = color;
  ctx.fill("evenodd");
  ctx.restore();
}

export function LipTryOn() {
  const { videoRef, status, start } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [started, setStarted] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [shade, setShade] = useState<LipShade>(LIP_SHADES[0]);
  const shadeRef = useRef(shade.color);
  shadeRef.current = shade.color;

  const begin = useCallback(() => {
    setStarted(true);
    void start();
  }, [start]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    let raf = 0;
    let lastVideoTime = -1;

    (async () => {
      let landmarker: FaceLandmarker;
      try {
        landmarker = await getFaceLandmarker("VIDEO");
      } catch {
        if (!cancelled) setModelError(true);
        return;
      }
      if (cancelled) return;
      setModelReady(true);

      const loop = () => {
        if (cancelled) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          const ctx = canvas.getContext("2d");
          if (ctx && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            try {
              const result = landmarker.detectForVideo(video, performance.now());
              const face = result.faceLandmarks[0];
              if (face) drawLips(ctx, face, canvas.width, canvas.height, shadeRef.current);
            } catch {
              /* transient frame error */
            }
          }
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [status, videoRef]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
        <div className="absolute inset-0 [transform:scaleX(-1)]">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
        </div>

        {!started && !modelError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ink/80 p-6 text-center backdrop-blur-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                Virtual lipstick try-on
              </p>
              <p className="mt-1 max-w-[18rem] text-sm text-white/70">
                Real-time AR. Your camera turns on only when you tap start, and
                nothing is uploaded.
              </p>
            </div>
            <Button size="lg" onClick={begin} className="w-full max-w-[15rem]">
              <Sparkles className="h-5 w-5" /> Start try-on
            </Button>
            <p className="flex items-center gap-1.5 text-xs text-white/60">
              <ShieldCheck className="h-3.5 w-3.5 text-sage" />
              On-device only.
            </p>
          </div>
        )}

        {started && (status === "idle" || status === "requesting" || (status === "ready" && !modelReady)) && !modelError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink/70 p-6 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-white/80" />
            <p className="text-sm text-white/80">Starting try-on…</p>
          </div>
        )}

        {started && (status === "denied" || status === "error" || modelError) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink/70 p-6 text-center backdrop-blur-sm">
            <CircleAlert className="h-7 w-7 text-accent-soft" />
            <p className="max-w-[16rem] text-sm text-white/85">
              {modelError
                ? "Couldn't load the model. Check your connection and retry."
                : "Camera access is needed for the try-on. Enable it and retry."}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void start()}>
              <RotateCcw className="h-4 w-4" /> Retry
            </Button>
          </div>
        )}
      </div>

      {/* Shade picker */}
      <div className="mt-5">
        <div className="flex items-center justify-center gap-3">
          {LIP_SHADES.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setShade(s)}
              aria-label={s.name}
              aria-pressed={shade.name === s.name}
              className={cn(
                "h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-paper transition-transform hover:scale-110",
                shade.name === s.name ? "ring-ink" : "ring-transparent",
              )}
              style={{ backgroundColor: s.color }}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-sm font-medium text-ink">{shade.name}</p>
      </div>
    </div>
  );
}
