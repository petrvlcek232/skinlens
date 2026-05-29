"use client";

import { useEffect, useState } from "react";
import { NumberTicker } from "@/components/shared/motion/number-ticker";
import type { Severity } from "@/lib/analysis/analyze";

const STROKE: Record<Severity, string> = {
  good: "var(--color-sage)",
  moderate: "var(--color-amber)",
  attention: "var(--color-accent)",
};

/** Animated radial score gauge (0–100), colored by severity. */
export function ScoreGauge({
  score,
  severity,
}: {
  score: number;
  severity: Severity;
}) {
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  // Start fully empty, then animate the arc in after mount.
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setOffset(circumference * (1 - score / 100)),
    );
    return () => cancelAnimationFrame(id);
  }, [score, circumference]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={STROKE[severity]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <NumberTicker
          value={score}
          className="text-4xl font-semibold leading-none text-ink"
        />
        <span className="mt-1 text-[10px] uppercase tracking-wider text-ink-soft">
          Skin Score
        </span>
      </div>
    </div>
  );
}
