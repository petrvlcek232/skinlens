"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, UserRound } from "lucide-react";
import { FaceScanner } from "./face-scanner";
import { CapturedPreview } from "./captured-preview";
import { AnalysisResult } from "./analysis-result";
import { SkinHistory } from "./skin-history";
import { Recommendations } from "./recommendations";
import { ProfileSwitcher } from "./profile-switcher";
import { Button } from "@/components/ui/button";
import { analyzeScan, type SkinAnalysis } from "@/lib/analysis/analyze";
import {
  loadProfiles,
  saveProfiles,
  getActive,
  addProfile,
  setActive,
  appendEntry,
  createProfile,
  type ProfileStore,
} from "@/lib/history/profiles";
import type { ScanResult } from "@/lib/vision/types";

type Step = "scan" | "result";

const EMPTY_STORE: ProfileStore = {
  profiles: [{ id: "me", name: "Me", history: [] }],
  activeId: "me",
};

/**
 * Orchestrates the analyzer flow: pick who's scanning → real-time scan (or photo
 * upload) → analysis → recommendations. History is per-person (profiles in
 * localStorage, no DB, no biometrics), and the active person is shown on the
 * scan screen and the result so it's always clear whose scan this is.
 */
export function SkinAdvisorWidget() {
  const [step, setStep] = useState<Step>("scan");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [analysis, setAnalysis] = useState<SkinAnalysis | null>(null);
  const [previous, setPrevious] = useState<SkinAnalysis | null>(null);
  const [store, setStore] = useState<ProfileStore>(EMPTY_STORE);
  /** Name the result was saved under (frozen at scan time). */
  const [scanFor, setScanFor] = useState<string>("Me");

  useEffect(() => {
    setStore(loadProfiles());
  }, []);

  const active = useMemo(() => getActive(store), [store]);

  const persist = (next: ProfileStore) => {
    setStore(next);
    saveProfiles(next);
  };

  const switchProfile = (id: string) => persist(setActive(store, id));
  const addPerson = (name: string) => persist(addProfile(store, createProfile(name)));

  if (step === "result" && result && analysis) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <UserRound className="h-4 w-4" />
            Results for <span className="font-medium text-ink">{scanFor}</span>
          </span>
          <ProfileSwitcher
            store={store}
            active={active}
            onSwitch={switchProfile}
            onAdd={addPerson}
          />
        </div>

        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] bg-ink/95 shadow-lg ring-1 ring-line">
          <CapturedPreview result={result} analysis={analysis} />
        </div>

        <div className="mt-4">
          <AnalysisResult analysis={analysis} previous={previous} />
        </div>

        <SkinHistory entries={active?.history ?? []} name={scanFor} />

        <Recommendations analysis={analysis} />

        <div className="mt-5 flex flex-col items-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setResult(null);
              setStep("scan");
            }}
            className="w-full max-w-xs"
          >
            <RotateCcw className="h-5 w-5" />
            Scan again
          </Button>
          <p className="text-center text-xs text-ink-soft">
            {`Lighting: ${result.lighting?.level ?? "—"} · ${result.framesAccumulated === 1 ? "from your photo" : `${result.framesAccumulated} frames averaged on-device`}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm text-ink-soft">Scanning as</span>
        <ProfileSwitcher
          store={store}
          active={active}
          onSwitch={switchProfile}
          onAdd={addPerson}
        />
      </div>
      <FaceScanner
        onScanComplete={(next) => {
          const nextAnalysis = analyzeScan(next);
          const who = active?.name ?? "Me";
          const id = active?.id ?? store.activeId;
          persist(appendEntry(store, id, { t: Date.now(), score: nextAnalysis.overallScore }));
          setScanFor(who);
          setPrevious(analysis);
          setResult(next);
          setAnalysis(nextAnalysis);
          setStep("result");
        }}
      />
    </div>
  );
}
