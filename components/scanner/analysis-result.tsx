"use client";

import { ScoreGauge } from "./score-gauge";
import { ConcernRadar } from "./concern-radar";
import type { Severity, SkinAnalysis } from "@/lib/analysis/analyze";
import { cn } from "@/lib/utils";

const SEVERITY: Record<
  Severity,
  { dot: string; bar: string; chip: string; label: string }
> = {
  good: { dot: "bg-sage", bar: "bg-sage", chip: "bg-sage-soft text-sage", label: "Looking good" },
  moderate: { dot: "bg-amber", bar: "bg-amber", chip: "bg-amber-soft text-amber", label: "Worth watching" },
  attention: { dot: "bg-accent", bar: "bg-accent", chip: "bg-accent-soft text-accent-ink", label: "Needs attention" },
};

function overallSeverity(score: number): Severity {
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "attention";
}

export function AnalysisResult({ analysis }: { analysis: SkinAnalysis }) {
  const sev = overallSeverity(analysis.overallScore);

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex flex-col items-center sm:w-1/2">
          <ScoreGauge score={analysis.overallScore} severity={sev} />
          <span
            className={cn(
              "mt-2 rounded-full px-3 py-1 text-xs font-medium",
              SEVERITY[sev].chip,
            )}
          >
            {SEVERITY[sev].label}
          </span>
        </div>
        <div className="w-full sm:w-1/2">
          <ConcernRadar concerns={analysis.concerns} />
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
