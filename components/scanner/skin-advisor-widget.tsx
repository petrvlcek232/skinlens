"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { FaceScanner } from "./face-scanner";
import { CapturedPreview } from "./captured-preview";
import { AnalysisResult } from "./analysis-result";
import { Button } from "@/components/ui/button";
import { analyzeScan } from "@/lib/analysis/analyze";
import type { ScanResult } from "@/lib/vision/types";

type Step = "scan" | "result";

/**
 * Orchestrates the analyzer flow: real-time scan → analysis result. The
 * recommendation step slots in here next. Analysis is computed once and shared
 * by the annotated-face heatmap and the score/radar surface.
 */
export function SkinAdvisorWidget() {
  const [step, setStep] = useState<Step>("scan");
  const [result, setResult] = useState<ScanResult | null>(null);

  const analysis = useMemo(
    () => (result ? analyzeScan(result) : null),
    [result],
  );

  if (step === "result" && result && analysis) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
          <CapturedPreview result={result} analysis={analysis} />
        </div>

        <div className="mt-4">
          <AnalysisResult analysis={analysis} />
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
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
          <p className="text-center text-xs text-ink-soft">
            {`Measured on-device across ${result.framesAccumulated} frames · personalized routine next.`}
          </p>
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
