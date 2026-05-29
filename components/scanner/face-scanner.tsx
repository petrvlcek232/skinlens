"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrawingUtils,
  FaceLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { Camera, ShieldCheck, RotateCcw, CircleAlert, Loader2 } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { getFaceLandmarker } from "@/lib/vision/landmarker";
import { assessFraming, type Framing } from "@/lib/vision/quality";
import type { Landmark, SkinCapture } from "@/lib/vision/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FaceScannerProps {
  onCapture: (capture: SkinCapture) => void;
}

const INITIAL_FRAMING: Framing = assessFraming(null);

export function FaceScanner({ onCapture }: FaceScannerProps) {
  const { videoRef, status, start } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestLandmarks = useRef<Landmark[] | null>(null);

  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [framing, setFraming] = useState<Framing>(INITIAL_FRAMING);
  const [fps, setFps] = useState(0);

  // Auto-request the camera on mount.
  useEffect(() => {
    void start();
  }, [start]);

  // Detection + draw loop, active once the camera stream is ready.
  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    let raf = 0;
    let lastVideoTime = -1;
    let drawing: DrawingUtils | null = null;
    let frameCount = 0;
    let fpsAnchor = performance.now();
    let lastHint = "";

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
          if (ctx) {
            if (!drawing) drawing = new DrawingUtils(ctx);
            const now = performance.now();

            if (video.currentTime !== lastVideoTime) {
              lastVideoTime = video.currentTime;
              let face: NormalizedLandmark[] | null = null;
              try {
                const result = landmarker.detectForVideo(video, now);
                face = result.faceLandmarks[0] ?? null;
              } catch {
                /* transient frame error — skip this tick */
              }

              ctx.clearRect(0, 0, canvas.width, canvas.height);
              if (face) {
                drawing.drawConnectors(
                  face,
                  FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                  { color: "rgba(224,101,74,0.22)", lineWidth: 0.7 },
                );
                drawing.drawConnectors(
                  face,
                  FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                  { color: "rgba(224,101,74,0.85)", lineWidth: 2 },
                );
              }
              latestLandmarks.current = face;

              const next = assessFraming(face);
              if (next.hint !== lastHint || next.ready !== framing.ready) {
                lastHint = next.hint;
                setFraming(next);
              }

              frameCount++;
              if (now - fpsAnchor >= 500) {
                setFps(Math.round((frameCount * 1000) / (now - fpsAnchor)));
                frameCount = 0;
                fpsAnchor = now;
              }
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
    // framing.ready is read inside but we intentionally bind the loop once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, videoRef]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const face = latestLandmarks.current;
    if (!video || !face || video.videoWidth === 0) return;

    const off = document.createElement("canvas");
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    const octx = off.getContext("2d");
    if (!octx) return;
    octx.drawImage(video, 0, 0, off.width, off.height);
    const imageData = octx.getImageData(0, 0, off.width, off.height);
    const preview = off.toDataURL("image/jpeg", 0.92);

    onCapture({
      imageData,
      landmarks: face,
      width: off.width,
      height: off.height,
      preview,
    });
  }, [onCapture, videoRef]);

  const canCapture = status === "ready" && modelReady && framing.ready;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
        {/* Mirrored stage: video + landmark overlay share the same flip. */}
        <div className="absolute inset-0 [transform:scaleX(-1)]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        {/* Non-mirrored overlays. */}
        <CircularGuide active={framing.ready} />

        {status === "ready" && modelReady && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sage animate-pulse" />
            {fps} fps · on-device
          </div>
        )}

        {status === "ready" && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors",
                framing.ready
                  ? "bg-sage/90 text-white"
                  : "bg-ink/55 text-white/90",
              )}
            >
              {modelReady ? framing.hint : "Loading analysis model…"}
            </span>
          </div>
        )}

        <ScannerStateOverlay
          status={status}
          modelReady={modelReady}
          modelError={modelError}
          onRetry={() => void start()}
        />
      </div>

      <div className="mt-5 flex flex-col items-center gap-3">
        <Button
          size="lg"
          onClick={handleCapture}
          disabled={!canCapture}
          className="w-full max-w-xs"
        >
          <Camera className="h-5 w-5" />
          Analyze my skin
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-ink-soft">
          <ShieldCheck className="h-3.5 w-3.5 text-sage" />
          Your photo is processed on your device and never uploaded.
        </p>
      </div>
    </div>
  );
}

function CircularGuide({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className={cn(
          "h-[62%] w-[58%] rounded-[50%] border-2 border-dashed transition-colors duration-300",
          active ? "border-sage/80" : "border-white/35",
        )}
      />
    </div>
  );
}

function ScannerStateOverlay({
  status,
  modelReady,
  modelError,
  onRetry,
}: {
  status: ReturnType<typeof useCamera>["status"];
  modelReady: boolean;
  modelError: boolean;
  onRetry: () => void;
}) {
  const showLoader =
    (status === "idle" || status === "requesting" || (status === "ready" && !modelReady)) &&
    !modelError;

  if (showLoader) {
    return (
      <Overlay>
        <Loader2 className="h-7 w-7 animate-spin text-white/80" />
        <p className="text-sm text-white/80">
          {status === "requesting" || status === "idle"
            ? "Requesting camera…"
            : "Warming up the model…"}
        </p>
      </Overlay>
    );
  }

  if (modelError) {
    return (
      <Overlay>
        <CircleAlert className="h-7 w-7 text-accent-soft" />
        <p className="max-w-[16rem] text-center text-sm text-white/85">
          Couldn&apos;t load the analysis model. Check your connection and try again.
        </p>
        <RetryButton onRetry={onRetry} />
      </Overlay>
    );
  }

  if (status === "denied") {
    return (
      <Overlay>
        <CircleAlert className="h-7 w-7 text-accent-soft" />
        <p className="max-w-[16rem] text-center text-sm text-white/85">
          Camera access was blocked. Enable it in your browser, then retry.
        </p>
        <RetryButton onRetry={onRetry} />
      </Overlay>
    );
  }

  if (status === "unsupported") {
    return (
      <Overlay>
        <CircleAlert className="h-7 w-7 text-accent-soft" />
        <p className="max-w-[16rem] text-center text-sm text-white/85">
          This browser doesn&apos;t support camera capture. Try the photo-upload
          option instead.
        </p>
      </Overlay>
    );
  }

  if (status === "error") {
    return (
      <Overlay>
        <CircleAlert className="h-7 w-7 text-accent-soft" />
        <p className="max-w-[16rem] text-center text-sm text-white/85">
          We couldn&apos;t reach a camera. Make sure one is connected, then retry.
        </p>
        <RetryButton onRetry={onRetry} />
      </Overlay>
    );
  }

  return null;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-ink/70 p-6 backdrop-blur-sm">
      {children}
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onRetry}>
      <RotateCcw className="h-4 w-4" />
      Retry
    </Button>
  );
}
