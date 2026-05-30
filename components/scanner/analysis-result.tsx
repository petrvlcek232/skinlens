"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { ScoreGauge } from "./score-gauge";
import { ConcernRadar } from "./concern-radar";
import type {
  ConcernId,
  Severity,
  SkinAnalysis,
} from "@/lib/analysis/analyze";
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

/** A small ▲/▼ change badge vs the previous scan. */
function Delta({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-ink-soft">
        <Minus className="h-3 w-3" /> 0
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium",
        up ? "text-sage" : "text-accent",
      )}
    >
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value)}
    </span>
  );
}

export function AnalysisResult({
  analysis,
  previous,
}: {
  analysis: SkinAnalysis;
  previous?: SkinAnalysis | null;
}) {
  const sev = overallSeverity(analysis.overallScore);
  const prevById = new Map<ConcernId, number>(
    (previous?.concerns ?? []).map((c) => [c.id, c.score]),
  );
  const overallDelta = previous
    ? analysis.overallScore - previous.overallScore
    : null;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex min-w-0 flex-col items-center sm:w-1/2">
          <ScoreGauge score={analysis.overallScore} severity={sev} />
          <span
            className={cn(
              "mt-2 rounded-full px-3 py-1 text-xs font-medium",
              SEVERITY[sev].chip,
            )}
          >
            {SEVERITY[sev].label}
          </span>
          {overallDelta !== null && (
            <span className="mt-1 flex items-center gap-1 text-[11px] text-ink-soft">
              vs last scan <Delta value={overallDelta} />
            </span>
          )}
          {analysis.skinTone && (
            <span
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-soft ring-1 ring-line"
              title={`Individual Typology Angle ${analysis.skinTone.ita}° → Monk Skin Tone scale (approximate)`}
            >
              Skin tone: {analysis.skinTone.label}
            </span>
          )}
        </div>
        {/* min-w-0 lets this flex child shrink below the chart's intrinsic size;
            overflow-hidden contains any Recharts ResponsiveContainer overshoot. */}
        <div className="w-full min-w-0 overflow-hidden sm:w-1/2">
          <ConcernRadar concerns={analysis.concerns} />
        </div>
      </div>

      <ul className="mt-3 space-y-2.5">
        {analysis.concerns.map((c) => {
          const prev = prevById.get(c.id);
          return (
            <li
              key={c.id}
              className="rounded-xl border border-line bg-paper-raised p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span className={cn("h-2 w-2 rounded-full", SEVERITY[c.severity].dot)} />
                  {c.label}
                </span>
                <span className="flex items-center gap-2">
                  {prev !== undefined && <Delta value={c.score - prev} />}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      SEVERITY[c.severity].chip,
                    )}
                  >
                    {c.score}
                  </span>
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
          );
        })}
      </ul>

      <details className="mt-3 rounded-xl border border-line bg-paper-raised p-3.5">
        <summary className="cursor-pointer text-xs font-medium text-ink-soft">
          How accurate is this?
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          SkinLens is an explainable, relative heuristic — not a clinical
          instrument. Every score is measured against your own skin (so it works
          across skin tones) and averaged over 100+ frames for stability. To
          sanity-check it yourself: change one thing (warm a cheek, shift the
          light) and re-scan — the relevant score should move. Re-scanning in the
          same conditions should give nearly the same result. See VALIDATION.md
          in the repo for the full positioning and test coverage.
        </p>
      </details>
    </div>
  );
}
