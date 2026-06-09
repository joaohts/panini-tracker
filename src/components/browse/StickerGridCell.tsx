"use client";

import { useRef } from "react";
import { Check, X } from "lucide-react";
import type { Sticker } from "@/lib/types";
import { StickerCard } from "./StickerCard";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE = 10; // px of finger drift that cancels a long-press

/**
 * One grid cell: tap/click opens the swipe view; on desktop a hover pill quick-
 * toggles ownership; on mobile a long-press does the same. The open target and
 * the quick-toggle are sibling buttons (not nested) to keep the HTML valid.
 */
export function StickerGridCell({
  sticker,
  count,
  loggedIn,
  onOpen,
  onSetCount,
}: {
  sticker: Sticker;
  count: number;
  loggedIn: boolean;
  onOpen: () => void;
  onSetCount: (count: number) => void;
}) {
  const owned = count >= 1;

  // Long-press (mobile): hold to toggle ownership, then swallow the click that
  // would otherwise open the swipe view.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!loggedIn) return;
    longPressed.current = false;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
    clearTimer();
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onSetCount(owned ? 0 : 1);
      navigator.vibrate?.(30);
    }, LONG_PRESS_MS);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return;
    const t = e.touches[0];
    if (
      Math.abs(t.clientX - start.current.x) > MOVE_TOLERANCE ||
      Math.abs(t.clientY - start.current.y) > MOVE_TOLERANCE
    ) {
      clearTimer(); // it's a scroll, not a press
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressed.current) {
      e.preventDefault();
      longPressed.current = false;
      return;
    }
    onOpen();
  };

  const pill =
    "pointer-events-auto flex translate-y-1 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 shadow-lg backdrop-blur-sm transition-all duration-150 focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100";

  return (
    <div
      className={cn(
        "group relative h-44 shrink-0 sm:h-56 lg:h-64",
        sticker.landscape ? "aspect-[4/3]" : "aspect-[3/4]",
      )}
    >
      <button
        className="block h-full w-full select-none [-webkit-touch-callout:none]"
        aria-label={`Abrir figurinha ${sticker.num.toUpperCase()}`}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={clearTimer}
        onTouchCancel={clearTimer}
        onContextMenu={(e) => e.preventDefault()}
      >
        <StickerCard sticker={sticker} count={count} />
      </button>

      {/* desktop hover: quick toggle ownership — sits in the lower half, in the
          gap between the country label and the bottom of the card */}
      {loggedIn && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 hidden items-center justify-center p-2 sm:flex">
          {owned ? (
            <button
              onClick={() => onSetCount(0)}
              className={cn(pill, "bg-white/90 text-zinc-900 hover:bg-white")}
            >
              <X className="h-3.5 w-3.5" />
              Não tenho
            </button>
          ) : (
            <button
              onClick={() => onSetCount(1)}
              className={cn(
                pill,
                "bg-success/80 text-white hover:bg-success/95",
              )}
            >
              <Check className="h-3.5 w-3.5" />
              Tenho
            </button>
          )}
        </div>
      )}
    </div>
  );
}
