"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { STICKERS, BASE_COUNT, teamLabel } from "@/lib/stickers";
import { SECTION_OF, sectionLabel } from "@/app/api/scan/sections";
import { useCollection } from "@/store/collection";
import { useAuth } from "@/store/auth";
import { useCountsLoading } from "@/lib/useCountsLoading";
import { useSectionScrollSpy } from "@/lib/useSectionScrollSpy";
import { StickerCard } from "./StickerCard";
import { StickerGridCell } from "./StickerGridCell";
import { StickerControls } from "./StickerControls";
import { TeamCombobox } from "./TeamCombobox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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

// Sort modes for the browse view + the missing-list export (they share state):
//   album = manifest / "sticking" order (default); alpha = countries A–Z with
//   the opening pages pinned first and the promos pinned last.
type Sort = "album" | "alpha";
const PINNED_FIRST = [
  "fwc-opening",
  "fwc-cities",
  "fwc-history-1930",
  "fwc-history-1978",
];
const PINNED_LAST = ["_legend", "cc-lam", "_other"];

function sortSections(ids: string[], mode: Sort): string[] {
  if (mode === "album") return ids;
  const first = PINNED_FIRST.filter((id) => ids.includes(id));
  const last = PINNED_LAST.filter((id) => ids.includes(id));
  const countries = ids
    .filter((id) => !PINNED_FIRST.includes(id) && !PINNED_LAST.includes(id))
    .sort((a, b) => sectionTitle(a).localeCompare(sectionTitle(b), "pt"));
  return [...first, ...countries, ...last];
}

// Whole-album want-list, grouped by section in the active sort order; within a
// section, sticking (manifest) order. IDs uppercased. Ignores filter/team.
function buildMissingList(
  entries: Record<string, { count: number } | undefined>,
  mode: Sort,
): string {
  const bySection = new Map<string, string[]>();
  for (const s of STICKERS) {
    if ((entries[s.num]?.count ?? 0) !== 0) continue;
    const id = sectionOf(s.num);
    const arr = bySection.get(id) ?? [];
    arr.push(s.num.toUpperCase());
    bySection.set(id, arr);
  }
  return sortSections([...bySection.keys()], mode)
    .map((id) => `${sectionTitle(id)}: ${bySection.get(id)!.join(", ")}`)
    .join("\n");
}

// Valid country codes, for sanitizing the ?team= URL param.
const TEAMS = new Set(STICKERS.map((s) => s.team));

export function BrowseView() {
  const entries = useCollection((s) => s.entries);
  const setCount = useCollection((s) => s.setCount);
  const loggedIn = useAuth((s) => s.status) === "in";
  const [filter, setFilter] = useState<Filter>("all");
  const [team, setTeam] = useState<string>("all");
  const [mode, setMode] = useState<"grid" | "swipe">("grid");
  const [sort, setSort] = useState<Sort>("album");
  const [copied, setCopied] = useState(false);
  const [swipeIndex, setSwipeIndex] = useState(0);
  // Gates URL writes until we've restored from the URL on mount (below).
  const [urlReady, setUrlReady] = useState(false);

  // Until counts are trustworthy, show loaders for the progress/percentage and
  // per-section counters instead of a 0% flash.
  const loading = useCountsLoading();

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

  // Sections in scope of the current team filter, in the active sort order. We
  // group over these (not just the sections present in `list`) so a country with
  // 0 matches under a filter still renders its header — but team=bra shows only
  // Brasil, never a wall of empty country rows.
  const candidateSections = useMemo(() => {
    const ids = new Set<string>();
    for (const s of STICKERS) {
      if (team !== "all" && s.team !== team) continue;
      ids.add(sectionOf(s.num));
    }
    return sortSections(
      SECTIONS.filter((id) => ids.has(id)),
      sort,
    );
  }, [team, sort]);

  // group the filtered list by section; candidate rows may be empty (kept visible)
  const groups = useMemo(() => {
    const bySection = new Map<string, typeof list>();
    for (const s of list) {
      const id = sectionOf(s.num);
      const arr = bySection.get(id) ?? [];
      arr.push(s);
      bySection.set(id, arr);
    }
    return candidateSections.map((id) => ({
      section: id,
      stickers: bySection.get(id) ?? [],
    }));
  }, [list, candidateSections]);

  const safeIndex = Math.min(swipeIndex, Math.max(0, list.length - 1));
  const current = list[safeIndex];

  const goNext = () => setSwipeIndex((i) => Math.min(list.length - 1, i + 1));
  const goPrev = () => setSwipeIndex((i) => Math.max(0, i - 1));
  // Set when leaving swipe via "Voltar": the grid then scrolls to the section of
  // the sticker we stopped on (see effect below).
  const returnToGrid = useRef(false);
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

  // ---- URL state: ?team= (country), ?fig= (swipe sticker), #sec- (scroll) ----
  // mode is derived, not stored: ?fig= present ⇒ swipe, absent ⇒ grid.

  // Restore from the URL once on mount, before we start writing it back. SSR
  // can't read window, so a lazy useState initializer isn't an option — this
  // mount effect is the intended place to sync from the URL (external system).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("team");
    const teamVal = t && t !== "all" && TEAMS.has(t) ? t : "all";
    const fig = params.get("fig");
    // filter is always "all" on load, so the swipe list is just team-filtered
    const figIndex = fig
      ? STICKERS.filter((s) => teamVal === "all" || s.team === teamVal).findIndex(
          (s) => s.num === fig,
        )
      : -1;

    /* eslint-disable react-hooks/set-state-in-effect -- syncing from the URL on mount */
    if (teamVal !== "all") setTeam(teamVal);
    if (params.get("sort") === "alpha") setSort("alpha");
    if (figIndex >= 0) {
      setMode("swipe");
      setSwipeIndex(figIndex);
    }
    setUrlReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Reflect team + swipe sticker into the URL (replaceState: shareable,
  // reload-stable, no history spam). The section #hash is owned by the
  // scrollspy below, so we only keep it while that's active (grid + no country).
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams(window.location.search);
    if (team === "all") params.delete("team");
    else params.set("team", team);
    if (sort === "alpha") params.set("sort", "alpha");
    else params.delete("sort");
    if (mode === "swipe" && current) params.set("fig", current.num);
    else params.delete("fig");
    const qs = params.toString();
    const hash = mode === "grid" && team === "all" ? window.location.hash : "";
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + hash,
    );
  }, [urlReady, team, sort, mode, current]);

  // Markdown-style scroll memory for the full grid (no country, grid mode).
  useSectionScrollSpy(urlReady && mode === "grid" && team === "all");

  // Returning from swipe to grid: scroll to the section/country of the sticker we
  // stopped on (the grid unmounts in swipe mode, so we'd otherwise land at top).
  useEffect(() => {
    if (mode !== "grid" || !returnToGrid.current) return;
    returnToGrid.current = false;
    if (!current) return;
    const id = `sec-${sectionOf(current.num)}`;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      }),
    );
  }, [mode, current]);

  return (
    <main className="mx-auto flex max-w-[1800px] flex-col gap-4 px-4 py-7 sm:px-10 lg:px-16">
        {mode === "grid" ? (
          /* one row on desktop: progress (far left) · pills (left) · country (right) */
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-3">
              <ProgressStat
                loading={loading}
                value={(ownedBase / BASE_COUNT) * 100}
                pct={pct}
              />
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
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant={sort === "album" ? "default" : "outline"}
                onClick={() => setSort("album")}
              >
                Álbum
              </Button>
              <Button
                size="sm"
                variant={sort === "alpha" ? "default" : "outline"}
                onClick={() => setSort("alpha")}
              >
                A–Z
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pct === 100}
              onClick={async () => {
                const text = buildMissingList(entries, sort);
                if (!text) return;
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copiado ✓" : "Copiar faltantes"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                returnToGrid.current = true;
                setMode("grid");
              }}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <ProgressStat
              loading={loading}
              value={(ownedBase / BASE_COUNT) * 100}
              pct={pct}
            />
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
                <section
                  key={g.section}
                  id={`sec-${g.section}`}
                  data-section={g.section}
                  // offset for the sticky header so scroll lands on the country
                  // name, not the first sticker (matches scrollspy TOP = 96).
                  className="scroll-mt-24"
                >
                  {/* section banner */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-7 w-1.5 rounded-full bg-brand" />
                    <h2 className="font-display text-xl uppercase text-foreground">
                      {sectionTitle(g.section)}
                    </h2>
                    {loading ? (
                      <Skeleton className="h-5 w-12 rounded-full" />
                    ) : stats ? (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                        {stats.owned}/{stats.total}
                      </span>
                    ) : null}
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  {/* fixed-height row: landscape cards are portrait cards rotated 90° */}
                  {g.stickers.length > 0 ? (
                    <div className="flex flex-wrap gap-3 sm:gap-5">
                      {g.stickers.map((s) => (
                        <StickerGridCell
                          key={s.num}
                          sticker={s}
                          count={entries[s.num]?.count ?? 0}
                          loggedIn={loggedIn}
                          onOpen={() => {
                            setMode("swipe");
                            setSwipeIndex(list.indexOf(s));
                          }}
                          onSetCount={(n) => setCount(s.num, n)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {filter === "missing" && stats && stats.owned === stats.total
                        ? "✓ Completo"
                        : "Nada aqui"}
                    </p>
                  )}
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

/** Progress bar + percentage. While counts load, the bar sits empty and the
 *  percentage is replaced by a spinner. */
function ProgressStat({
  loading,
  value,
  pct,
}: {
  loading: boolean;
  value: number;
  pct: number;
}) {
  return (
    <>
      <Progress
        value={loading ? 0 : value}
        className="min-w-0 flex-1 sm:w-40 sm:flex-none"
      />
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {pct}%
        </span>
      )}
    </>
  );
}
