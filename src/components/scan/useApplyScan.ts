"use client";

// The single point where scan results touch Session 1's collection store.
// Keeping the coupling here means any future store-API change is a one-file fix.

import { useCollection } from "@/store/collection";

export function useApplyScan() {
  const applyOwned = useCollection((s) => s.applyOwned);
  const setCount = useCollection((s) => s.setCount);

  /**
   * Commit a reviewed scan:
   *  - `filled`  -> marked owned (count>=1, existing duplicates preserved).
   *  - `clear`   -> count set to 0; ONLY for rows the user explicitly cleared
   *                 (scan said missing on a sticker they currently own). Never
   *                 auto-cleared — see COMMUNICATION.txt with S1.
   */
  return function commit(filled: string[], clear: string[] = []): void {
    if (filled.length) applyOwned(filled);
    for (const num of clear) setCount(num, 0);
  };
}
