"use client";

import { useState } from "react";
import { RotateCcw, CheckCircle2 } from "lucide-react";
import { FaceScanner } from "./face-scanner";
import { CapturedPreview } from "./captured-preview";
import { Button } from "@/components/ui/button";
import type { ScanResult } from "@/lib/vision/types";

type Step = "scan" | "result";

/**
 * Orchestrates the analyzer flow. Today: real-time scan → result proof. The
 * metric + recommendation steps slot in here as the funnel grows.
 */
export function SkinAdvisorWidget() {
  const [step, setStep] = useState<Step>("scan");
  const [result, setResult] = useState<ScanResult | null>(null);

  if (step === "result" && result) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
          <CapturedPreview result={result} />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-sage/90 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {result.framesAccumulated} frames averaged
          </div>
        </div>
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-center text-sm text-ink-soft">
            {`${result.regionStats.length} skin regions measured on-device across ${result.framesAccumulated} frames.`}{" "}
            Scoring &amp; recommendations come next in the build.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setResult(null);
              setStep("scan");
            }}
            className="w-full max-w-xs"
          >
            <RotateCcw className="h-5 w-5" />
            Scan again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FaceScanner
      onScanComplete={(next) => {
        setResult(next);
        setStep("result");
      }}
    />
  );
}
