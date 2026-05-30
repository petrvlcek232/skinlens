"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, MessageCircleQuestion } from "lucide-react";
import { templateCoach } from "@/lib/coach/template-coach";
import type { CoachMessage } from "@/lib/coach/types";
import type { SkinAnalysis } from "@/lib/analysis/analyze";
import { buildRoutine } from "@/lib/recommendations/recommend";

/**
 * "AI skin coach" — a natural-language reading of the scan. The text is produced
 * on-device by the deterministic TemplateCoachProvider (no API, nothing leaves
 * the device). A real LLM would slot in behind the same CoachProvider interface;
 * the "On-device · rule-based" badge is shown for honesty (see AI-ARCHITECTURE.md).
 */
export function AICoachPanel({
  analysis,
  name,
}: {
  analysis: SkinAnalysis;
  name?: string;
}) {
  const [message, setMessage] = useState<CoachMessage | null>(null);
  const routine = useMemo(() => buildRoutine(analysis), [analysis]);

  useEffect(() => {
    let alive = true;
    templateCoach.generate({ analysis, routine, name }).then((m) => {
      if (alive) setMessage(m);
    });
    return () => {
      alive = false;
    };
  }, [analysis, routine, name]);

  if (!message) return null;

  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Sparkles className="h-4 w-4 text-accent" />
          AI skin coach
        </span>
        <span className="rounded-full bg-line/60 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
          On-device · rule-based
        </span>
      </div>

      <p className="mt-3 text-sm font-medium leading-snug text-ink">
        {message.headline}
      </p>

      <div className="mt-2 space-y-2">
        {message.paragraphs.map((p, i) => (
          <p key={i} className="text-xs leading-relaxed text-ink-soft">
            {p}
          </p>
        ))}
      </div>

      {message.followUps.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
            Ask a follow-up
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {message.followUps.map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-ink-soft"
                title="A real LLM coach would answer this in conversation (see AI-ARCHITECTURE.md)"
              >
                <MessageCircleQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent/70" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
