"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { FaceScanner } from "./face-scanner";
import { CapturedPreview } from "./captured-preview";
import { Button } from "@/components/ui/button";
import type { SkinCapture } from "@/lib/vision/types";

type Step = "scan" | "captured";

/**
 * Orchestrates the analyzer flow. Today: scan → captured proof. The analysis
 * and recommendation steps slot in here as the funnel grows.
 */
export function SkinAdvisorWidget() {
  const [step, setStep] = useState<Step>("scan");
  const [capture, setCapture] = useState<SkinCapture | null>(null);

  if (step === "captured" && capture) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
          <CapturedPreview capture={capture} />
        </div>
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-center text-sm text-ink-soft">
            Six skin regions sampled on-device. Analysis &amp; recommendations
            come next in the build.
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setCapture(null);
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
      onCapture={(next) => {
        setCapture(next);
        setStep("captured");
      }}
    />
  );
}
