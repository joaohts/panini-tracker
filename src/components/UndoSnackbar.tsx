"use client";

import { useEffect, useRef, useState } from "react";
import { useCollection } from "@/store/collection";

const VISIBLE_MS = 4000;

/**
 * One-level undo for single-sticker edits. Slides up after each toggle and
 * auto-hides; "Desfazer" reverts the last change. Driven entirely by
 * `lastChange` in the collection store (set by setCount, cleared by undo and by
 * any bulk/server update), so it's safe to mount once in the root layout.
 */
export function UndoSnackbar() {
  const lastChange = useCollection((s) => s.lastChange);
  const undo = useCollection((s) => s.undo);

  const [shown, setShown] = useState<{ label: string } | null>(null);
  const [entered, setEntered] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastChange) {
      setEntered(false);
      return;
    }
    const { num, prevCount } = lastChange;
    const cur = useCollection.getState().entries[num]?.count ?? 0;
    const id = num.toUpperCase();
    const label =
      cur >= 1 && prevCount === 0
        ? `${id} adicionada`
        : cur === 0 && prevCount >= 1
          ? `${id} removida`
          : `${id} atualizada`;

    setShown({ label });
    const raf = requestAnimationFrame(() => setEntered(true)); // enter next frame
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setEntered(false), VISIBLE_MS);
    // Any tap/click OR scroll/drag anywhere dismisses it (non-blocking — the
    // gesture still does its own thing). The effect runs after the edit's click
    // has already fired, so this never catches the click that opened it.
    const dismiss = () => setEntered(false);
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("wheel", dismiss, { passive: true });
    window.addEventListener("touchmove", dismiss, { passive: true });
    window.addEventListener("scroll", dismiss, true); // capture: scroll doesn't bubble
    return () => {
      cancelAnimationFrame(raf);
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchmove", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
    // Re-run on each new edit (seq changes) and when the change is cleared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastChange?.seq]);

  if (!shown) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-200 ${
        entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
      onTransitionEnd={() => {
        if (!entered) setShown(null);
      }}
    >
      <div className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">
        <span className="text-foreground">{shown.label}</span>
        <button
          type="button"
          onClick={() => {
            undo();
            setEntered(false);
          }}
          className="font-semibold uppercase tracking-wide text-brand transition hover:opacity-80"
        >
          Desfazer
        </button>
      </div>
    </div>
  );
}
