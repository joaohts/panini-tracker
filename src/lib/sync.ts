// Shared sync helpers between SyncManager (background) and callers that need an
// explicit flush (e.g. the scan "Salvo!" screen). Same-origin, cookie auth.
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useCollection } from "@/store/collection";

/** Pull the server collection and adopt it (server = source of truth). No-op logged out. */
export async function pullCollection(): Promise<void> {
  if (useAuth.getState().status !== "in") return;
  try {
    const { entries } = await api.getCollection();
    useCollection.getState().adopt(entries);
  } catch {
    /* offline / transient — keep the local cache */
  }
}

// Pushes are serialized so a forced syncNow() never races the debounced push;
// each link reads the latest entries at run time, so the newest state wins.
let chain: Promise<void> = Promise.resolve();

async function pushOnce(): Promise<void> {
  try {
    const entries = Object.values(useCollection.getState().entries);
    const res = await api.patchCollection(entries);
    useCollection.getState().adopt(res.entries);
  } catch {
    /* offline — retried on reconnect / focus / next edit */
  }
}

/**
 * Push the full local collection now; resolves when done. Safe to `await`
 * (never rejects). No-op when logged out. Use it to guarantee a bulk commit
 * (e.g. a scan) is flushed before navigating away.
 */
export function syncNow(): Promise<void> {
  if (useAuth.getState().status !== "in") return Promise.resolve();
  chain = chain.then(pushOnce, pushOnce);
  return chain;
}
