"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { FaceScanner } from "./face-scanner";
import { CapturedPreview } from "./captured-preview";
import { AnalysisResult } from "./analysis-result";
import { SkinHistory } from "./skin-history";
import { Recommendations } from "./recommendations";
import { Button } from "@/components/ui/button";
import { analyzeScan, type SkinAnalysis } from "@/lib/analysis/analyze";
import {
  loadHistory,
  addHistory,
  type HistoryEntry,
} from "@/lib/history/skin-history";
import type { ScanResult } from "@/lib/vision/types";

type Step = "scan" | "result";

/**
 * Orchestrates the analyzer flow: real-time scan (or photo upload) → analysis →
 * recommendations. Keeps the previous analysis for scan-to-scan deltas and an
 * on-device history (localStorage) for a longer trend.
 */
export function SkinAdvisorWidget() {
  const [step, setStep] = useState<Step>("scan");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [previous, setPrevious] = useState<SkinAnalysis | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  if (step === "result" && result && analysis) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
          <CapturedPreview result={result} analysis={analysis} />
        </div>

        <div className="mt-4">
          <AnalysisResult analysis={analysis} previous={previous} />
        </div>

        <SkinHistory entries={history} />

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
            {`Lighting: ${result.lighting?.level ?? "—"} · ${result.framesAccumulated === 1 ? "from your photo" : `${result.framesAccumulated} frames averaged on-device`}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <FaceScanner
      onScanComplete={(next) => {
        const nextAnalysis = analyzeScan(next);
        setPrevious(analysis);
        setResult(next);
        setAnalysis(nextAnalysis);
        setHistory(addHistory(nextAnalysis.overallScore));
        setStep("result");
      }}
    />
  );
}
