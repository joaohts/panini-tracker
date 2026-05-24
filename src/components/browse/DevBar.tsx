"use client";

import { STICKERS } from "@/lib/stickers";
import { useCollection } from "@/store/collection";
import { Button } from "@/components/ui/button";

/** Dev-only helpers for seeding mock collection data. */
export function DevBar() {
  const setMany = useCollection((s) => s.setMany);
  const reset = useCollection((s) => s.reset);

  const mockHalf = () => {
    const updates = STICKERS.map((s) => {
      if (Math.random() >= 0.5) return { num: s.num, count: 0 }; // ~half missing
      const r = Math.random();
      const count = r < 0.75 ? 1 : r < 0.93 ? 2 : 3; // some dupes
      return { num: s.num, count };
    });
    setMany(updates);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-card px-3 py-2 text-xs">
      <span className="font-mono uppercase tracking-wide text-muted-foreground">
        dev
      </span>
      <Button size="sm" onClick={mockHalf}>
        Simular ½ obtidas
      </Button>
      <Button size="sm" variant="secondary" onClick={() => reset()}>
        Limpar tudo
      </Button>
    </div>
  );
}
