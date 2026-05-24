"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/store/auth";
import { useCollection } from "@/store/collection";
import { pullCollection, syncNow } from "@/lib/sync";

/**
 * Headless sync controller (rendered once in the layout).
 * - Bootstraps auth from the session cookie on load.
 * - When logged in: pulls the server collection on login & focus, and
 *   debounce-pushes the full local collection after user edits (rev changes;
 *   adopt() never bumps rev, so no push loops). Flushes on reconnect.
 */
export function SyncManager() {
  const bootstrap = useAuth((s) => s.bootstrap);
  const status = useAuth((s) => s.status);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== "in") return;

    pullCollection();

    let lastRev = useCollection.getState().rev;
    const unsub = useCollection.subscribe((state) => {
      if (state.rev === lastRev) return;
      lastRev = state.rev;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => void syncNow(), 800);
    });

    const onFocus = () => void pullCollection();
    const onOnline = () => void syncNow();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      unsub();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [status]);

  return null;
}
