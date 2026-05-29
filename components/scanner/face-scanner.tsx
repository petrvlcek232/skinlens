"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DrawingUtils,
  FaceLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { ShieldCheck, RotateCcw, CircleAlert, Loader2, ScanFace } from "lucide-react";
import { useCamera } from "@/hooks/use-camera";
import { getFaceLandmarker } from "@/lib/vision/landmarker";
import { assessFraming, type Framing } from "@/lib/vision/quality";
import { assessLighting, type LightingQuality } from "@/lib/vision/lighting";
import { deriveRegions, type RegionCircle } from "@/lib/vision/regions";
import { sampleRegions } from "@/lib/vision/sampling";
import {
  createAccumulator,
  accumulateFrame,
  finalizeScan,
} from "@/lib/vision/scan";
import type { Landmark, SampledRegion, ScanResult } from "@/lib/vision/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FaceScannerProps {
  onScanComplete: (result: ScanResult) => void;
}

const INITIAL_FRAMING: Framing = assessFraming(null);
const SCAN_DURATION_MS = 2200;
const MIN_SCAN_FRAMES = 18;
const LIGHTING_INTERVAL_MS = 250;
const DEFAULT_LIGHTING: LightingQuality = {
  ok: true,
  level: "good",
  hint: "Lighting looks good",
  score: 80,
};

export function FaceScanner({ onScanComplete }: FaceScannerProps) {
  const { videoRef, status, start } = useCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const latestLandmarks = useRef<Landmark[] | null>(null);
  const lightingRef = useRef<LightingQuality | null>(null);
  const onCompleteRef = useRef(onScanComplete);
  onCompleteRef.current = onScanComplete;

  const scanningRef = useRef(false);
  const scanStartRef = useRef(0);
  const accumulatorRef = useRef(createAccumulator());

  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [framing, setFraming] = useState<Framing>(INITIAL_FRAMING);
  const [lighting, setLighting] = useState<LightingQuality | null>(null);
  const [fps, setFps] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    void start();
  }, [start]);

  const finishScan = useCallback(() => {
    scanningRef.current = false;
    const video = videoRef.current;
    const sampleCanvas = sampleCanvasRef.current;
    const face = latestLandmarks.current;
    if (!video || !sampleCanvas || !face) {
      setScanning(false);
      setProgress(0);
      return;
    }
    const stats = finalizeScan(accumulatorRef.current);
    const imageData = sampleCanvas
      .getContext("2d", { willReadFrequently: true })!
      .getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
    const preview = sampleCanvas.toDataURL("image/jpeg", 0.92);

    setScanning(false);
    setProgress(100);
    onCompleteRef.current({
      regionStats: stats,
      framesAccumulated: accumulatorRef.current.frames,
      lighting: lightingRef.current ?? DEFAULT_LIGHTING,
      imageData,
      landmarks: face,
      width: sampleCanvas.width,
      height: sampleCanvas.height,
      preview,
    });
  }, [videoRef]);

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    let raf = 0;
    let lastVideoTime = -1;
    let drawing: DrawingUtils | null = null;
    let frameCount = 0;
    let fpsAnchor = performance.now();
    let lastHint = "";
    let lastProgress = -1;
    let notReadyStreak = 0;
    let lastLightingTs = 0;
    let lastLightingLevel = "";

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

      function sampleFrame(
        video: HTMLVideoElement,
        regions: RegionCircle[],
      ): SampledRegion[] | null {
        const sc = sampleCanvasRef.current;
        if (!sc) return null;
        if (sc.width !== video.videoWidth) {
          sc.width = video.videoWidth;
          sc.height = video.videoHeight;
        }
        const sctx = sc.getContext("2d", { willReadFrequently: true });
        if (!sctx) return null;
        sctx.drawImage(video, 0, 0, sc.width, sc.height);
        const frame = sctx.getImageData(0, 0, sc.width, sc.height);
        return sampleRegions(frame, regions);
      }

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
              const next = assessFraming(face);
              const regions =
                face && deriveRegions(face, canvas.width, canvas.height);

              if (face) {
                drawing.drawConnectors(
                  face,
                  FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                  {
                    color: scanningRef.current
                      ? "rgba(224,101,74,0.35)"
                      : "rgba(224,101,74,0.22)",
                    lineWidth: 0.7,
                  },
                );
              }
              latestLandmarks.current = face;

              // Sample the frame if we're scanning, or for a throttled lighting read.
              const lightingDue = !!regions && now - lastLightingTs > LIGHTING_INTERVAL_MS;
              const scanSampling = scanningRef.current && next.ready && !!regions;
              let sampled: SampledRegion[] | null = null;
              if (video && regions && (scanSampling || lightingDue)) {
                sampled = sampleFrame(video, regions);
              }

              if (lightingDue && sampled) {
                lastLightingTs = now;
                const lq = assessLighting(sampled);
                lightingRef.current = lq;
                if (lq.level !== lastLightingLevel) {
                  lastLightingLevel = lq.level;
                  setLighting(lq);
                }
              }

              // --- Scan tick ---
              if (!scanningRef.current) {
                notReadyStreak = 0;
              } else if (!next.ready || !regions) {
                notReadyStreak += 1;
                if (notReadyStreak > 8) {
                  scanningRef.current = false;
                  lastProgress = -1;
                  setScanning(false);
                  setProgress(0);
                }
              } else {
                notReadyStreak = 0;
                if (sampled) accumulateFrame(accumulatorRef.current, sampled);
                const p = Math.min(1, (now - scanStartRef.current) / SCAN_DURATION_MS);
                drawScanOverlay(ctx, regions, p);
                const pct = Math.round(p * 100);
                if (pct !== lastProgress) {
                  lastProgress = pct;
                  setProgress(pct);
                }
                if (p >= 1 && accumulatorRef.current.frames >= MIN_SCAN_FRAMES) {
                  finishScan();
                }
              }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, videoRef, finishScan]);

  const lightingBlocks = framing.ready && lighting !== null && !lighting.ok;

  const startScan = useCallback(() => {
    if (!framing.ready || !modelReady || scanningRef.current) return;
    if (lightingRef.current && !lightingRef.current.ok) return;
    accumulatorRef.current = createAccumulator();
    scanStartRef.current = performance.now();
    scanningRef.current = true;
    setProgress(0);
    setScanning(true);
  }, [framing.ready, modelReady]);

  const canScan =
    status === "ready" && modelReady && framing.ready && !lightingBlocks;

  const bottomHint = !modelReady
    ? "Loading analysis model…"
    : scanning
      ? `Scanning your skin… ${progress}%`
      : lightingBlocks && lighting
        ? lighting.hint
        : framing.hint;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
        <div className="absolute inset-0 [transform:scaleX(-1)]">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <canvas ref={sampleCanvasRef} className="hidden" />

        <CircularGuide active={framing.ready && !lightingBlocks} scanning={scanning} />

        {status === "ready" && modelReady && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-sage animate-pulse" />
            {fps} fps · on-device
          </div>
        )}

        {status === "ready" && modelReady && lighting && !scanning && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                lighting.ok ? "bg-sage" : "bg-amber",
              )}
            />
            Light {lighting.score}
          </div>
        )}

        {status === "ready" && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <span
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors",
                scanning
                  ? "bg-accent/90 text-white"
                  : lightingBlocks
                    ? "bg-amber/90 text-white"
                    : framing.ready
                      ? "bg-sage/90 text-white"
                      : "bg-ink/55 text-white/90",
              )}
            >
              {bottomHint}
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
        {scanning ? (
          <div className="w-full max-w-xs">
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-ink-soft">
              Hold still — averaging {MIN_SCAN_FRAMES}+ frames for accuracy
            </p>
          </div>
        ) : (
          <Button size="lg" onClick={startScan} disabled={!canScan} className="w-full max-w-xs">
            <ScanFace className="h-5 w-5" />
            Analyze my skin
          </Button>
        )}
        <p className="flex items-center gap-1.5 text-xs text-ink-soft">
          <ShieldCheck className="h-3.5 w-3.5 text-sage" />
          Your photo is processed on your device and never uploaded.
        </p>
      </div>
    </div>
  );
}

function drawScanOverlay(
  ctx: CanvasRenderingContext2D,
  regions: RegionCircle[],
  progress: number,
) {
  const { width, height } = ctx.canvas;

  const y = progress * height;
  const band = Math.max(8, height * 0.04);
  const grad = ctx.createLinearGradient(0, y - band, 0, y + band);
  grad.addColorStop(0, "rgba(224,101,74,0)");
  grad.addColorStop(0.5, "rgba(224,101,74,0.35)");
  grad.addColorStop(1, "rgba(224,101,74,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y - band, width, band * 2);
  ctx.strokeStyle = "rgba(224,101,74,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(width, y);
  ctx.stroke();

  for (const region of regions) {
    const { x, y: cy } = region.center;
    const r = region.radius;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(224,101,74,${0.1 + 0.2 * progress})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, cy, r + 3, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.strokeStyle = "rgba(224,101,74,0.95)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

function CircularGuide({ active, scanning }: { active: boolean; scanning: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className={cn(
          "h-[62%] w-[58%] rounded-[50%] border-2 transition-colors duration-300",
          scanning
            ? "border-accent/80 border-solid"
            : active
              ? "border-sage/80 border-dashed"
              : "border-white/35 border-dashed",
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
    (status === "idle" ||
      status === "requesting" ||
      (status === "ready" && !modelReady)) &&
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
          This browser doesn&apos;t support camera capture.
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
