"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { STICKERS, BASE_COUNT, teamLabel } from "@/lib/stickers";
import { SECTION_OF, sectionLabel } from "@/app/api/scan/sections";
import { useCollection } from "@/store/collection";
import { StickerCard } from "./StickerCard";
import { StickerControls } from "./StickerControls";
import { DevBar } from "./DevBar";
import { TeamCombobox } from "./TeamCombobox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Filter = "all" | "owned" | "missing" | "dupes";
const FILTERS: Filter[] = ["all", "owned", "missing", "dupes"];
const FILTER_LABELS: Record<Filter, string> = {
  all: "Todas",
  owned: "Já tenho",
  missing: "Faltam",
  dupes: "Repetidas",
};

const sectionOf = (num: string) => SECTION_OF.get(num) ?? "_other";
// Browse header: keep the semantic label, drop the "(00, FWC 1–4)" range hint.
const sectionTitle = (id: string) =>
  sectionLabel(id).replace(/\s*\([^)]*FWC[^)]*\)$/i, "");
// Section ids in manifest first-appearance order (the 4 opening foil pages first,
// then teams, then promos) — see src/app/api/scan/sections.ts.
const SECTIONS: string[] = (() => {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const s of STICKERS) {
    const id = sectionOf(s.num);
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  return order;
})();

export function BrowseView() {
  const entries = useCollection((s) => s.entries);
  const [filter, setFilter] = useState<Filter>("all");
  const [team, setTeam] = useState<string>("all");
  const [mode, setMode] = useState<"grid" | "swipe">("grid");
  const [swipeIndex, setSwipeIndex] = useState(0);

  const ownedBase = useMemo(
    () =>
      STICKERS.filter((s) => s.isBase && (entries[s.num]?.count ?? 0) >= 1)
        .length,
    [entries],
  );
  const pct = Math.round((ownedBase / BASE_COUNT) * 100);

  const list = useMemo(() => {
    return STICKERS.filter((s) => {
      if (team !== "all" && s.team !== team) return false;
      const c = entries[s.num]?.count ?? 0;
      if (filter === "owned") return c >= 1;
      if (filter === "missing") return c === 0;
      if (filter === "dupes") return c > 1;
      return true;
    });
  }, [entries, filter, team]);

  // owned/total per section (full section, regardless of active filter) for banners
  const sectionStats = useMemo(() => {
    const stats = new Map<string, { total: number; owned: number }>();
    for (const s of STICKERS) {
      const id = sectionOf(s.num);
      const cur = stats.get(id) ?? { total: 0, owned: 0 };
      cur.total++;
      if ((entries[s.num]?.count ?? 0) >= 1) cur.owned++;
      stats.set(id, cur);
    }
    return stats;
  }, [entries]);

  // group the filtered list by section, preserving manifest (SECTIONS) order
  const groups = useMemo(() => {
    const bySection = new Map<string, typeof list>();
    for (const s of list) {
      const id = sectionOf(s.num);
      const arr = bySection.get(id) ?? [];
      arr.push(s);
      bySection.set(id, arr);
    }
    return SECTIONS.filter((id) => bySection.has(id)).map((id) => ({
      section: id,
      stickers: bySection.get(id)!,
    }));
  }, [list]);

  const safeIndex = Math.min(swipeIndex, Math.max(0, list.length - 1));
  const current = list[safeIndex];

  const goNext = () => setSwipeIndex((i) => Math.min(list.length - 1, i + 1));
  const goPrev = () => setSwipeIndex((i) => Math.max(0, i - 1));
  // touch swipe (mobile): left = next, right = prev
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  return (
    <main className="mx-auto flex max-w-[1800px] flex-col gap-4 px-4 py-7 sm:px-10 lg:px-16">
        <DevBar />

        {mode === "grid" ? (
          /* one row on desktop: progress (far left) · pills (left) · country (right) */
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-3">
              <Progress
                value={(ownedBase / BASE_COUNT) * 100}
                className="min-w-0 flex-1 sm:w-40 sm:flex-none"
              />
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {pct}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => {
                    setFilter(f);
                    setSwipeIndex(0);
                  }}
                >
                  {FILTER_LABELS[f]}
                </Button>
              ))}
            </div>
            <TeamCombobox
              value={team}
              onChange={(v) => {
                setTeam(v);
                setSwipeIndex(0);
              }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMode("grid")}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <Progress
              value={(ownedBase / BASE_COUNT) * 100}
              className="min-w-0 flex-1 sm:w-40 sm:flex-none"
            />
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {pct}%
            </span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {list.length} figurinhas
        </p>

        {/* body */}
        {mode === "grid" ? (
          <div className="flex flex-col gap-7">
            {groups.map((g) => {
              const stats = sectionStats.get(g.section);
              return (
                <section key={g.section}>
                  {/* section banner */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-7 w-1.5 rounded-full bg-brand" />
                    <h2 className="font-display text-xl uppercase text-foreground">
                      {sectionTitle(g.section)}
                    </h2>
                    {stats && (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                        {stats.owned}/{stats.total}
                      </span>
                    )}
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {/* fixed-height row: landscape cards are portrait cards rotated 90° */}
                  <div className="flex flex-wrap gap-3 sm:gap-5">
                    {g.stickers.map((s) => (
                      <button
                        key={s.num}
                        className={cn(
                          "h-44 shrink-0 sm:h-56 lg:h-64",
                          s.landscape ? "aspect-[4/3]" : "aspect-[3/4]",
                        )}
                        onClick={() => {
                          setMode("swipe");
                          setSwipeIndex(list.indexOf(s));
                        }}
                      >
                        <StickerCard
                          sticker={s}
                          count={entries[s.num]?.count ?? 0}
                        />
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : current ? (
          <div
            className="flex touch-pan-y select-none flex-col items-center gap-4 py-2"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              className={cn(
                "w-full max-w-[20rem]",
                current.landscape ? "aspect-[4/3]" : "aspect-[3/4]",
              )}
            >
              <StickerCard
                sticker={current}
                count={entries[current.num]?.count ?? 0}
              />
            </div>
            <div className="text-center">
              <div className="font-semibold text-foreground">
                {current.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {current.num.toUpperCase()} · {teamLabel(current.team)}
              </div>
            </div>
            <StickerControls num={current.num} />
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSwipeIndex((i) => Math.max(0, i - 1))}
                disabled={safeIndex <= 0}
              >
                ← Anterior
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">
                {safeIndex + 1} / {list.length}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setSwipeIndex((i) => Math.min(list.length - 1, i + 1))
                }
                disabled={safeIndex >= list.length - 1}
              >
                Próxima →
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Nenhuma figurinha corresponde a este filtro.
          </p>
        )}
      </main>
  );
}
