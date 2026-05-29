"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { FaceScanner } from "./face-scanner";
import { CapturedPreview } from "./captured-preview";
import { AnalysisResult } from "./analysis-result";
import { Recommendations } from "./recommendations";
import { Button } from "@/components/ui/button";
import { analyzeScan, type SkinAnalysis } from "@/lib/analysis/analyze";
import type { ScanResult } from "@/lib/vision/types";

type Step = "scan" | "result";

/**
 * Orchestrates the analyzer flow: real-time scan → analysis → recommendations.
 * Keeps the previous analysis so the result can show scan-to-scan deltas — a
 * built-in way to sanity-check responsiveness and stability without a second
 * reference subject.
 */
export function SkinAdvisorWidget() {
  const [step, setStep] = useState<Step>("scan");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [previous, setPrevious] = useState<SkinAnalysis | null>(null);

  if (step === "result" && result && analysis) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
          <CapturedPreview result={result} analysis={analysis} />
        </div>

        <div className="mt-4">
          <AnalysisResult analysis={analysis} previous={previous} />
        </div>

        <Recommendations analysis={analysis} />

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
            {`Lighting: ${result.lighting?.level ?? "—"} · ${result.framesAccumulated} frames averaged on-device`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <FaceScanner
      onScanComplete={(next) => {
        setPrevious(analysis);
        setResult(next);
        setAnalysis(analyzeScan(next));
        setStep("result");
      }}
    />
  );
}
