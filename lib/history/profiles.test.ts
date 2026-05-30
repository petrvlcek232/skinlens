import { describe, it, expect } from "vitest";
import {
  getActive,
  addProfile,
  setActive,
  appendEntry,
  migrateFlatHistory,
  type Profile,
  type ProfileStore,
} from "./profiles";
import type { HistoryEntry } from "./skin-history";

const entry = (t: number, score: number): HistoryEntry => ({ t, score });
const profile = (id: string, name: string, history: HistoryEntry[] = []): Profile => ({
  id,
  name,
  history,
});

function base(): ProfileStore {
  return { profiles: [profile("me", "Me")], activeId: "me" };
}

describe("getActive", () => {
  it("returns the active profile", () => {
    expect(getActive(base())?.name).toBe("Me");
  });
  it("returns undefined when active id is missing", () => {
    expect(getActive({ profiles: [], activeId: "x" })).toBeUndefined();
  });
});

describe("addProfile", () => {
  it("adds a profile and makes it active", () => {
    const next = addProfile(base(), profile("p2", "Partner"));
    expect(next.profiles).toHaveLength(2);
    expect(next.activeId).toBe("p2");
    expect(getActive(next)?.name).toBe("Partner");
  });
  it("does not mutate the input", () => {
    const store = base();
    addProfile(store, profile("p2", "Partner"));
    expect(store.profiles).toHaveLength(1);
  });
});

describe("setActive", () => {
  it("switches the active profile", () => {
    const two = addProfile(base(), profile("p2", "Partner"));
    expect(setActive(two, "me").activeId).toBe("me");
  });
  it("ignores an unknown id", () => {
    expect(setActive(base(), "nope").activeId).toBe("me");
  });
});

describe("appendEntry", () => {
  it("appends a score to the right profile only", () => {
    const two = addProfile(base(), profile("p2", "Partner"));
    const next = appendEntry(two, "me", entry(1, 80));
    expect(getActive(setActive(next, "me"))?.history).toEqual([entry(1, 80)]);
    expect(next.profiles.find((p) => p.id === "p2")?.history).toEqual([]);
  });

  it("caps a profile's history", () => {
    let store = base();
    for (let i = 0; i < 15; i++) store = appendEntry(store, "me", entry(i, 50 + i), 12);
    const h = store.profiles[0].history;
    expect(h).toHaveLength(12);
    expect(h[h.length - 1]).toEqual(entry(14, 64));
  });

  it("keeps each person's trend separate (the core requirement)", () => {
    let store = addProfile(base(), profile("p2", "Partner"));
    store = appendEntry(store, "me", entry(1, 90));
    store = appendEntry(store, "p2", entry(2, 60));
    expect(store.profiles.find((p) => p.id === "me")?.history).toEqual([entry(1, 90)]);
    expect(store.profiles.find((p) => p.id === "p2")?.history).toEqual([entry(2, 60)]);
  });
});

describe("migrateFlatHistory", () => {
  it("wraps a legacy flat history into a 'Me' profile", () => {
    const store = migrateFlatHistory([entry(1, 70), entry(2, 75)], "me");
    expect(store.profiles).toHaveLength(1);
    expect(store.activeId).toBe("me");
    expect(getActive(store)?.name).toBe("Me");
    expect(getActive(store)?.history).toHaveLength(2);
  });
});
