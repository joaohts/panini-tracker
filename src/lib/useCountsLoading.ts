"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { useCollection } from "@/store/collection";

/**
 * True while the sticker counts can't be trusted yet: the localStorage cache
 * hasn't hydrated, or the auth bootstrap (api.me on refresh) is still in flight.
 * Count-derived UI shows loaders/skeletons until this turns false.
 */
export function useCountsLoading(): boolean {
  const authStatus = useAuth((s) => s.status);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(useCollection.persist.hasHydrated());
    return useCollection.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return !hydrated || authStatus === "loading";
}
