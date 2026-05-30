"use client";

import { useState } from "react";
import { UserRound, Check, Plus, ChevronDown } from "lucide-react";
import type { Profile, ProfileStore } from "@/lib/history/profiles";
import { cn } from "@/lib/utils";

interface ProfileSwitcherProps {
  store: ProfileStore;
  active: Profile | undefined;
  onSwitch: (id: string) => void;
  onAdd: (name: string) => void;
  /** Visual theme — light chip (on dark camera) or dark chip (on light result). */
  tone?: "onDark" | "onLight";
}

/**
 * Lets the user say WHO this scan is for, with no database and no biometrics —
 * an explicit person picker (Me / Partner / + Add person). Keeps each person's
 * history separate. Used both before a scan (on the camera) and on the result.
 */
export function ProfileSwitcher({
  store,
  active,
  onSwitch,
  onAdd,
  tone = "onLight",
}: ProfileSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const onDark = tone === "onDark";

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
    setAdding(false);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
          onDark
            ? "bg-white/15 text-white hover:bg-white/25 backdrop-blur"
            : "border border-line bg-paper-raised text-ink hover:border-ink-soft/40",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserRound className="h-3.5 w-3.5" />
        {active?.name ?? "Me"}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => {
              setOpen(false);
              setAdding(false);
            }}
          />
          {/* Anchored to the right edge — the switcher sits on the right of the
              header, so opening leftward keeps the menu inside the viewport on
              mobile. max-width caps it on very narrow screens. */}
          <div className="absolute right-0 z-40 mt-2 w-52 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-paper-raised p-1 shadow-lg">
            <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-soft">
              Who&apos;s scanning?
            </p>
            {store.profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSwitch(p.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-line/50"
              >
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-ink-soft" />
                  {p.name}
                </span>
                {p.id === active?.id && <Check className="h-4 w-4 text-sage" />}
              </button>
            ))}

            {adding ? (
              <div className="flex items-center gap-1.5 p-1.5">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                    if (e.key === "Escape") setAdding(false);
                  }}
                  placeholder="Name"
                  maxLength={24}
                  className="h-8 w-full rounded-md border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={submit}
                  className="h-8 shrink-0 rounded-md bg-accent px-2.5 text-xs font-medium text-white"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-line/50"
              >
                <Plus className="h-4 w-4" />
                Add person
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
