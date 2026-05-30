import { appendCapped, loadHistory, type HistoryEntry } from "./skin-history";

/**
 * Per-person scan history WITHOUT a database and WITHOUT biometrics.
 *
 * Multiple people share one device (you, your partner), so a single flat
 * localStorage history mixes their scores into a meaningless trend. We solve it
 * with explicit, user-chosen profiles ("Me", "Partner", …) — Netflix-style —
 * rather than face recognition. That is a deliberate choice: silently
 * fingerprinting faces would be a privacy/GDPR problem and contradict the whole
 * on-device, privacy-first positioning, and our coarse relative metrics aren't
 * discriminative enough to identify a person reliably anyway. See ADR-016.
 *
 * Everything stays on the device. The pure helpers below are unit-tested; the
 * load/save wrappers touch localStorage and migrate any old flat history.
 */
export interface Profile {
  id: string;
  name: string;
  history: HistoryEntry[];
}

export interface ProfileStore {
  profiles: Profile[];
  activeId: string;
}

const KEY = "skinlens_profiles_v1";
const CAP = 12;

// ---- pure helpers (unit-tested) -------------------------------------------

export function getActive(store: ProfileStore): Profile | undefined {
  return store.profiles.find((p) => p.id === store.activeId);
}

export function addProfile(store: ProfileStore, profile: Profile): ProfileStore {
  return {
    profiles: [...store.profiles, profile],
    activeId: profile.id,
  };
}

export function setActive(store: ProfileStore, id: string): ProfileStore {
  if (!store.profiles.some((p) => p.id === id)) return store;
  return { ...store, activeId: id };
}

/** Append a score to a profile's history (capped), returning a new store. */
export function appendEntry(
  store: ProfileStore,
  id: string,
  entry: HistoryEntry,
  cap = CAP,
): ProfileStore {
  return {
    ...store,
    profiles: store.profiles.map((p) =>
      p.id === id ? { ...p, history: appendCapped(p.history, entry, cap) } : p,
    ),
  };
}

/** Build a store from a legacy flat history list assigned to a "Me" profile. */
export function migrateFlatHistory(
  flat: HistoryEntry[],
  id: string,
  name = "Me",
): ProfileStore {
  return { profiles: [{ id, name, history: flat }], activeId: id };
}

// ---- browser persistence --------------------------------------------------

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export function createProfile(name: string): Profile {
  return { id: newId(), name: name.trim() || "Me", history: [] };
}

function isStore(v: unknown): v is ProfileStore {
  return (
    !!v &&
    Array.isArray((v as ProfileStore).profiles) &&
    typeof (v as ProfileStore).activeId === "string"
  );
}

/** Load the profile store, migrating a legacy flat history and ensuring a default. */
export function loadProfiles(): ProfileStore {
  const fallback = (): ProfileStore => {
    const flat = loadHistory();
    const me = { id: newId(), name: "Me", history: flat };
    return { profiles: [me], activeId: me.id };
  };

  if (typeof window === "undefined") {
    return { profiles: [{ id: "me", name: "Me", history: [] }], activeId: "me" };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const migrated = fallback();
      saveProfiles(migrated);
      return migrated;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isStore(parsed) || parsed.profiles.length === 0) return fallback();
    return parsed;
  } catch {
    return fallback();
  }
}

export function saveProfiles(store: ProfileStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage may be unavailable (private mode) — best-effort */
  }
}
