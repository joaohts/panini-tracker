"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CollectionEntry } from "@/lib/types";

interface CollectionState {
  entries: Record<string, CollectionEntry>;
  /** Bumped by USER edits only (never by adopt) so the sync layer can tell a
   *  local change from a server-driven update and avoid push loops. */
  rev: number;
  /** count for a sticker (0 if untracked / missing). */
  getCount: (num: string) => number;
  isOwned: (num: string) => boolean;
  setCount: (num: string, count: number) => void;
  inc: (num: string) => void;
  dec: (num: string) => void;
  /** 0 -> 1, >=1 -> 0 */
  toggleOwned: (num: string) => void;
  /** Bulk-apply confirmed scan results: owned nums -> count>=1, others optional. */
  applyOwned: (ownedNums: string[]) => void;
  /** Bulk set many counts in one update (used for dev seeding). */
  setMany: (updates: { num: string; count: number }[]) => void;
  /** Replace local state with the server's authoritative entries (no rev bump). */
  adopt: (entries: CollectionEntry[]) => void;
  reset: () => void;
}

const now = () => new Date().toISOString();

export const useCollection = create<CollectionState>()(
  persist(
    (set, get) => ({
      entries: {},
      rev: 0,

      getCount: (num) => get().entries[num]?.count ?? 0,
      isOwned: (num) => (get().entries[num]?.count ?? 0) >= 1,

      // Keep count-0 entries (with a timestamp) so an "un-own" syncs to the
      // server via last-write-wins instead of silently vanishing locally.
      setCount: (num, count) =>
        set((state) => ({
          entries: {
            ...state.entries,
            [num]: { num, count: Math.max(0, Math.floor(count)), updatedAt: now() },
          },
          rev: state.rev + 1,
        })),

      inc: (num) => get().setCount(num, get().getCount(num) + 1),
      dec: (num) => get().setCount(num, get().getCount(num) - 1),
      toggleOwned: (num) =>
        get().setCount(num, get().getCount(num) >= 1 ? 0 : 1),

      applyOwned: (ownedNums) =>
        set((state) => {
          const ts = now();
          const entries = { ...state.entries };
          for (const num of ownedNums) {
            const cur = entries[num]?.count ?? 0;
            entries[num] = { num, count: Math.max(1, cur), updatedAt: ts };
          }
          return { entries, rev: state.rev + 1 };
        }),

      setMany: (updates) =>
        set((state) => {
          const ts = now();
          const entries = { ...state.entries };
          for (const { num, count } of updates) {
            entries[num] = { num, count: Math.max(0, Math.floor(count)), updatedAt: ts };
          }
          return { entries, rev: state.rev + 1 };
        }),

      adopt: (list) =>
        set(() => ({
          entries: Object.fromEntries(list.map((e) => [e.num, e])),
        })),

      reset: () => set((state) => ({ entries: {}, rev: state.rev + 1 })),
    }),
    { name: "panini-wc2026-collection" },
  ),
);
