"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Eye, RotateCcw, Save } from "lucide-react";
import type { ScanStatus } from "@/lib/types";
import { BY_NUM, imageSrc } from "@/lib/stickers";
import { sectionLabel } from "@/app/api/scan/sections";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useApplyScan } from "./useApplyScan";

export interface ReviewRow {
  num: string;
  section: string;
  scanStatus: ScanStatus; // what the scan concluded (after cross-page resolution)
  ownedCount: number; // collection count at scan time
  conflictA: boolean; // two photos disagreed on this sticker
}

/** Default intended state: keep owned stickers the scan missed (Type B). */
const initialStatus = (r: ReviewRow): ScanStatus =>
  r.scanStatus === "filled" || r.ownedCount >= 1 ? "filled" : "empty";
const isTypeB = (r: ReviewRow) => r.scanStatus === "empty" && r.ownedCount >= 1;

export function ScanReview({
  rows,
  unmatched,
  dupSections,
  model,
  onRescan,
  onDone,
}: {
  rows: ReviewRow[];
  unmatched: string[];
  dupSections: string[];
  model: string;
  onRescan: () => void;
  onDone: (added: number, cleared: number) => void;
}) {
  const commit = useApplyScan();
  const [intended, setIntended] = useState<Record<string, ScanStatus>>(() =>
    Object.fromEntries(rows.map((r) => [r.num, initialStatus(r)])),
  );

  const groups = useMemo(() => {
    const out: { section: string; rows: ReviewRow[] }[] = [];
    const idx = new Map<string, number>();
    for (const r of rows) {
      if (!idx.has(r.section)) {
        idx.set(r.section, out.length);
        out.push({ section: r.section, rows: [] });
      }
      out[idx.get(r.section)!].rows.push(r);
    }
    return out;
  }, [rows]);

  const toggle = (num: string) =>
    setIntended((p) => ({ ...p, [num]: p[num] === "filled" ? "empty" : "filled" }));

  const filledNums = rows.filter((r) => intended[r.num] === "filled").map((r) => r.num);
  const newCount = rows.filter((r) => intended[r.num] === "filled" && r.ownedCount === 0).length;

  function handleSave() {
    const filled = filledNums;
    const clear = rows
      .filter((r) => intended[r.num] === "empty" && r.ownedCount >= 1)
      .map((r) => r.num);
    commit(filled, clear);
    onDone(newCount, clear.length);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-black uppercase">Conferir</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Toque numa figurinha pra alternar <span className="font-medium text-success">tenho</span> ↔{" "}
          <span className="font-medium">falta</span>. Só as marcadas como “tenho” são salvas.
        </p>
      </div>

      {dupSections.length > 0 && (
        <Banner>
          Duas fotos parecem ser a mesma página ({dupSections.map(sectionLabel).join(", ")}). Confira
          se não fotografou a mesma página duas vezes.
        </Banner>
      )}
      {unmatched.length > 0 && (
        <Banner>
          {unmatched.length} código(s) não reconhecido(s): {unmatched.join(", ")}
        </Banner>
      )}

      {groups.map(({ section, rows: groupRows }) => {
        const have = groupRows.filter((r) => intended[r.num] === "filled").length;
        return (
          <section key={section} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1.5 rounded-full bg-brand" />
              <h3 className="font-display text-lg uppercase">{sectionLabel(section)}</h3>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                {have}/{groupRows.length}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {groupRows.map((r) => (
                <Row
                  key={r.num}
                  row={r}
                  status={intended[r.num]}
                  onToggle={() => toggle(r.num)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-3 z-10 mt-2 flex gap-2 rounded-xl border bg-background/90 p-3 shadow-lg backdrop-blur">
        <Button type="button" variant="outline" size="lg" onClick={onRescan}>
          <RotateCcw /> Escanear de novo
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={handleSave}
          disabled={filledNums.length === 0}
          className="ml-auto bg-success text-black hover:bg-success/85"
        >
          <Save /> Salvar {newCount > 0 ? `(${newCount} nova${newCount === 1 ? "" : "s"})` : ""}
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground/70">lido por {model}</p>
    </div>
  );
}

function Row({
  row,
  status,
  onToggle,
}: {
  row: ReviewRow;
  status: ScanStatus;
  onToggle: () => void;
}) {
  const sticker = BY_NUM.get(row.num);
  const owned = status === "filled";
  const showArt = owned && sticker?.hasImage;
  const typeB = isTypeB(row);
  // Crest (slot 1) and the wide squad photo (slot 13) are the scanner's weakest
  // reads — a quiet visual nudge to eyeball them. No extra interaction.
  const reviewSlot =
    /^[a-z]{3}$/.test(row.section) && ["1", "13"].includes(row.num.match(/\d+$/)?.[0] ?? "");

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-2 text-left transition",
        owned ? "border-success/50 bg-success/10" : "border-dashed border-border bg-muted/40",
        reviewSlot && "ring-1 ring-brand/40",
      )}
    >
      <div className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-card">
        {showArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(sticker!)} alt={row.num} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-xs font-black tabular-nums text-muted-foreground">
            {row.num.toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-display text-sm font-bold">
          {row.num.toUpperCase()}
          {row.ownedCount > 1 && (
            <span className="rounded-full bg-gold px-1.5 py-px text-[10px] font-extrabold text-black">
              ×{row.ownedCount}
            </span>
          )}
          {reviewSlot && (
            <Eye className="h-3.5 w-3.5 shrink-0 text-brand/70" aria-label="confira esta figurinha" />
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{sticker?.name ?? "—"}</p>
        {typeB && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-gold">
            <AlertTriangle className="h-3 w-3" /> você já tem — a Scan não viu
          </p>
        )}
        {row.conflictA && !typeB && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">lida diferente em duas fotos</p>
        )}
      </div>

      <span
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
          owned ? "bg-success text-black" : "bg-muted text-muted-foreground",
        )}
      >
        {owned && <Check className="h-3 w-3" />}
        {owned ? "Tenho" : "Falta"}
      </span>
    </button>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-xs text-foreground">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <span>{children}</span>
    </div>
  );
}
