"use client";

import { useMemo, useState } from "react";
import { Check, Plus, ShoppingBag } from "lucide-react";
import { buildRoutine, type RoutineSlot } from "@/lib/recommendations/recommend";
import type { SkinAnalysis } from "@/lib/analysis/analyze";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLOT_LABEL: Record<RoutineSlot, string> = {
  cleanse: "Cleanse",
  treat: "Treat",
  eyes: "Eyes",
  moisturize: "Moisturize",
  protect: "Protect",
};

export function Recommendations({ analysis }: { analysis: SkinAnalysis }) {
  const routine = useMemo(() => buildRoutine(analysis), [analysis]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(routine.steps.map((s) => s.product.id)),
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const total = routine.steps
    .filter((s) => selected.has(s.product.id))
    .reduce((sum, s) => sum + s.product.priceUsd, 0);

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-ink">Your routine</h2>
        <span className="text-xs text-ink-soft">{routine.summary}</span>
      </div>

      <ul className="mt-3 space-y-2.5">
        {routine.steps.map((step) => {
          const isSelected = selected.has(step.product.id);
          return (
            <li
              key={step.product.id}
              className="rounded-xl border border-line bg-paper-raised p-3.5"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-paper px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft ring-1 ring-line">
                  {SLOT_LABEL[step.slot]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-ink">
                      {step.product.name}
                    </p>
                    <span className="shrink-0 text-sm font-medium text-ink">
                      ${step.product.priceUsd}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft">
                    {step.product.keyIngredient}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink">
                    {step.reason}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(step.product.id)}
                className={cn(
                  "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-sage-soft text-sage"
                    : "bg-paper text-ink-soft ring-1 ring-line hover:text-ink",
                )}
                aria-pressed={isSelected}
              >
                {isSelected ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> In your routine
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add to routine
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between rounded-[var(--radius-card)] bg-ink px-5 py-3.5 text-paper-raised">
        <div>
          <p className="text-xs text-paper-raised/70">
            {selected.size} {selected.size === 1 ? "product" : "products"}
          </p>
          <p className="text-lg font-semibold">${total}</p>
        </div>
        <Button size="md" disabled={selected.size === 0}>
          <ShoppingBag className="h-4 w-4" />
          Shop routine
        </Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-soft">
        Demo catalog — in production this is the brand&apos;s live product feed.
      </p>
    </div>
  );
}
