"use client";

import { useState } from "react";
import type { Sticker } from "@/lib/types";
import { imageSrc, teamLabel } from "@/lib/stickers";
import { cn } from "@/lib/utils";

/**
 * Three visual states:
 *  - missing      (count 0)                -> numbered "back" (empty-slot look)
 *  - owned + art  (count>=1 & image loads) -> the photo
 *  - owned, no art(count>=1 & no image)    -> distinct "owned, image unavailable" card
 * Landscape stickers (panoramic / team photos) render in a wide 3:2 frame.
 */
export function StickerCard({
  sticker,
  count,
}: {
  sticker: Sticker;
  count: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const owned = count >= 1;
  const showPhoto = owned && sticker.hasImage && !imgFailed;
  const ownedNoArt = owned && (!sticker.hasImage || imgFailed);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/10",
        owned ? "border-success/50" : "border-dashed border-border",
      )}
    >
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc(sticker)}
          alt={sticker.name}
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      )}

      {ownedNoArt && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-success/10 p-2 text-center">
          <span className="font-display text-3xl font-black tabular-nums text-success">
            {sticker.num.toUpperCase()}
          </span>
          <span className="line-clamp-2 text-xs font-medium text-foreground">
            {sticker.name}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-success/70">
            tenho · sem imagem
          </span>
        </div>
      )}

      {!owned && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/50 p-2 text-center">
          <span className="font-display text-3xl font-black tabular-nums text-missing/70">
            {sticker.num.toUpperCase()}
          </span>
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {sticker.name}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {teamLabel(sticker.team)}
          </span>
        </div>
      )}

      {count > 1 && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-gold px-2 py-0.5 text-xs font-extrabold text-black shadow">
          ×{count}
        </span>
      )}
      {owned && (
        <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-xs font-bold text-black shadow">
          ✓
        </span>
      )}
    </div>
  );
}
