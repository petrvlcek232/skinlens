"use client";

import type { HistoryEntry } from "@/lib/history/skin-history";
import { cn } from "@/lib/utils";

/** A small on-device trend of skin score across past scans (localStorage). */
export function SkinHistory({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length < 2) return null;

  const scores = entries.map((e) => e.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(1, max - min);
  const W = 240;
  const H = 48;
  const pad = 5;

  const coords = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - 2 * pad);
    const y = H - pad - ((s - min) / range) * (H - 2 * pad);
    return { x, y };
  });
  const points = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const last = coords[coords.length - 1];

  const first = scores[0];
  const latest = scores[scores.length - 1];
  const delta = latest - first;

  return (
    <div className="mt-3 rounded-xl border border-line bg-paper-raised p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-ink">Your skin over time</p>
        <span className="text-xs text-ink-soft">{entries.length} scans</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 h-12 w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={last.x} cy={last.y} r={3} fill="var(--color-accent)" />
      </svg>
      <p className="mt-1 text-xs text-ink-soft">
        First {first} → latest {latest}{" "}
        <span className={cn("font-medium", delta >= 0 ? "text-sage" : "text-accent")}>
          ({delta >= 0 ? "+" : ""}
          {delta})
        </span>
      </p>
    </div>
  );
}
