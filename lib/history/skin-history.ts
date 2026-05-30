/**
 * On-device scan history. Persists a small rolling log of skin scores to
 * localStorage so the widget can show progress over time — the beauty
 * re-engagement hook ("track your skin") — without any backend or account.
 * Stays on the device, consistent with the privacy model.
 */
export interface HistoryEntry {
  /** Epoch ms of the scan. */
  t: number;
  /** Overall skin score 0–100. */
  score: number;
}

const KEY = "skinlens_history_v1";
const CAP = 12;

/** Append an entry and keep only the most recent `cap`. Pure — unit-tested. */
export function appendCapped(
  list: HistoryEntry[],
  entry: HistoryEntry,
  cap = CAP,
): HistoryEntry[] {
  return [...list, entry].slice(-cap);
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is HistoryEntry =>
        !!e &&
        typeof (e as HistoryEntry).t === "number" &&
        typeof (e as HistoryEntry).score === "number",
    );
  } catch {
    return [];
  }
}

export function addHistory(score: number): HistoryEntry[] {
  const next = appendCapped(loadHistory(), { t: Date.now(), score });
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable (private mode) — history is best-effort */
  }
  return next;
}
