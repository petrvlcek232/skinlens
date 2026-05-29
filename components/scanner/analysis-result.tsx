"use client";

import { useMemo } from "react";
import { analyzeScan, type Severity } from "@/lib/analysis/analyze";
import type { ScanResult } from "@/lib/vision/types";
import { cn } from "@/lib/utils";

const SEVERITY: Record<
  Severity,
  { dot: string; bar: string; chip: string; label: string }
> = {
  good: {
    dot: "bg-sage",
    bar: "bg-sage",
    chip: "bg-sage-soft text-sage",
    label: "Looking good",
  },
  moderate: {
    dot: "bg-amber",
    bar: "bg-amber",
    chip: "bg-amber-soft text-amber",
    label: "Worth watching",
  },
  attention: {
    dot: "bg-accent",
    bar: "bg-accent",
    chip: "bg-accent-soft text-accent-ink",
    label: "Needs attention",
  },
};

function overallSeverity(score: number): Severity {
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "attention";
}

export function AnalysisResult({ result }: { result: ScanResult }) {
  const analysis = useMemo(() => analyzeScan(result), [result]);
  const sev = overallSeverity(analysis.overallScore);

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full ring-2 ring-line">
          <span className="text-2xl font-semibold leading-none text-ink">
            {analysis.overallScore}
          </span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-soft">
            / 100
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-ink-soft">Skin Score</p>
          <p className="text-lg font-semibold text-ink">
            {SEVERITY[sev].label}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Weighted across {analysis.concerns.length} concerns · relative to
            your own skin
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2.5">
        {analysis.concerns.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-line bg-paper-raised p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <span className={cn("h-2 w-2 rounded-full", SEVERITY[c.severity].dot)} />
                {c.label}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  SEVERITY[c.severity].chip,
                )}
              >
                {c.score}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={cn("h-full rounded-full", SEVERITY[c.severity].bar)}
                style={{ width: `${c.score}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {c.detail}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
