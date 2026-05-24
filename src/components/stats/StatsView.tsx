"use client";

import { useMemo } from "react";
import { STICKERS, BASE_COUNT, TEAMS, teamLabel } from "@/lib/stickers";
import { useCollection } from "@/store/collection";
import { Progress } from "@/components/ui/progress";

export function StatsView() {
  const entries = useCollection((s) => s.entries);

  const stats = useMemo(() => {
    let ownedBase = 0;
    let baseCopies = 0; // total physical base stickers incl. dupes = R$ spent
    let dupeStickers = 0;
    let extraCopies = 0; // surplus copies across all stickers (tradeable)
    const perTeam = new Map<string, { owned: number; total: number }>();
    for (const s of STICKERS) {
      const c = entries[s.num]?.count ?? 0;
      if (s.isBase) {
        if (c >= 1) ownedBase++;
        baseCopies += c;
      }
      if (c > 1) {
        dupeStickers++;
        extraCopies += c - 1;
      }
      // Fold the lone Panini logo (_logo) into the intro group (fwc).
      const teamKey = s.team === "_logo" ? "fwc" : s.team;
      const t = perTeam.get(teamKey) ?? { owned: 0, total: 0 };
      t.total++;
      if (c >= 1) t.owned++;
      perTeam.set(teamKey, t);
    }
    return { ownedBase, baseCopies, dupeStickers, extraCopies, perTeam };
  }, [entries]);

  const pct = Math.round((stats.ownedBase / BASE_COUNT) * 100);

  const tiles = [
    {
      label: "Faltam",
      value: BASE_COUNT - stats.ownedBase,
      sub: `tenho ${stats.ownedBase}/${BASE_COUNT}`,
      color: "text-foreground",
    },
    {
      label: "Repetidas",
      value: stats.dupeStickers,
      sub: `${stats.extraCopies} cópias extras`,
      color: "text-gold",
    },
  ];

  // Price stats — R$1 por figurinha, pacote com 7 (R$7), álbum base.
  const missing = BASE_COUNT - stats.ownedBase;
  const spent = stats.baseCopies;
  const pkgsNoTrade = Math.ceil(missing / 7);
  const priceTiles = [
    {
      label: "Já gasto",
      value: `R$ ${spent}`,
      sub: `≈ ${Math.round(spent / 7)} pacotes`,
      color: "text-gold",
    },
    {
      label: "Falta",
      value: `R$ ${missing}`,
      sub: `${pkgsNoTrade} pacotes`,
      color: "text-brand",
    },
  ];

  return (
    <main className="mx-auto flex max-w-[1800px] flex-col gap-6 px-4 py-7 sm:px-10 lg:px-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl uppercase">Stats</h1>
        <div className="flex items-center gap-3">
          <Progress
            value={(stats.ownedBase / BASE_COUNT) * 100}
            className="min-w-0 flex-1"
          />
          <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
            {stats.ownedBase} / {BASE_COUNT} · {pct}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.label}
            </div>
            <div className={`mt-1 font-display text-3xl ${t.color}`}>
              {t.value}
            </div>
            <div className="text-xs text-muted-foreground">{t.sub}</div>
          </div>
        ))}
      </div>

      {/* price stats */}
      <section>
        <h2 className="font-display text-xl uppercase">Custos</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          R$1 por figurinha · pacote com 7 (R$7) · álbum base de {BASE_COUNT}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] sm:gap-4">
          {priceTiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.label}
              </div>
              <div className={`mt-1 font-display text-3xl ${t.color}`}>
                {t.value}
              </div>
              <div className="text-xs text-muted-foreground">{t.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl uppercase">
          Progresso por time
        </h2>
        <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
          {TEAMS.map((t) => {
            const ps = stats.perTeam.get(t);
            if (!ps) return null;
            return (
              <div key={t} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-sm sm:w-40">
                  {teamLabel(t)}
                </span>
                <Progress
                  value={(ps.owned / ps.total) * 100}
                  className="min-w-0 flex-1"
                />
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:w-16">
                  {ps.owned}/{ps.total}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
