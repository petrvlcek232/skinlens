"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { ConcernResult } from "@/lib/analysis/analyze";

/** Radar of the four concern scores (0–100, higher = healthier). */
export function ConcernRadar({ concerns }: { concerns: ConcernResult[] }) {
  const data = concerns.map((c) => ({
    label: c.label.split(" ")[0],
    score: c.score,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} outerRadius="68%">
        <PolarGrid stroke="var(--color-line)" />
        <PolarAngleAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="score"
          stroke="var(--color-accent)"
          fill="var(--color-accent)"
          fillOpacity={0.22}
          isAnimationActive
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
