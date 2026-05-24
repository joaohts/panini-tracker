"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, Loader2, LogIn } from "lucide-react";
import type { ScanError, ScanResponse, ScanStatus } from "@/lib/types";
import { useCollection } from "@/store/collection";
import { useAuth } from "@/store/auth";
import { SECTION_MEMBERS, SECTION_OF, shortSectionLabel } from "@/app/api/scan/sections";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fileToEncodedImage } from "./imageToBase64";
import { ScanTray } from "./ScanTray";
import { ScanReview, type ReviewRow } from "./ScanReview";

export interface StagedImage {
  id: string;
  previewUrl: string;
  base64: string;
  mime: string;
}

interface ImgResult {
  status: "pending" | "done" | "error";
  response?: ScanResponse;
  section?: string;
  missingCount?: number;
}

type Stage =
  | { name: "stage" }
  | { name: "scanning" }
  | { name: "review"; rows: ReviewRow[]; unmatched: string[]; dupSections: string[]; model: string }
  | { name: "done"; added: number; cleared: number }
  | { name: "error"; message: string };

const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10";

export function ScanFlow() {
  const [images, setImages] = useState<StagedImage[]>([]);
  const [results, setResults] = useState<Record<string, ImgResult>>({});
  const [stage, setStage] = useState<Stage>({ name: "stage" });
  const getCount = useCollection((s) => s.getCount);
  const authStatus = useAuth((s) => s.status);

  async function addFiles(files: FileList) {
    // Decode each file independently: one undecodable image (e.g. an unsupported
    // HEIC) must never drop the whole batch or wipe the tray.
    const encoded = await Promise.all(
      Array.from(files).map(async (f): Promise<StagedImage | null> => {
        try {
          const e = await fileToEncodedImage(f);
          return { id: newId(), previewUrl: e.previewUrl, base64: e.base64, mime: e.mime };
        } catch {
          return null;
        }
      }),
    );
    const ok = encoded.filter((x): x is StagedImage => x !== null);
    if (ok.length) setImages((prev) => [...prev, ...ok]);
  }

  async function scanAll() {
    const imgs = images;
    setResults(Object.fromEntries(imgs.map((i) => [i.id, { status: "pending" as const }])));
    setStage({ name: "scanning" });

    // Each photo scans independently and lights up its tile as it returns.
    await Promise.all(
      imgs.map(async (img) => {
        try {
          const res = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_base64: img.base64, mime: img.mime }),
          });
          if (!res.ok) {
            await res.json().catch((): ScanError | null => null);
            setResults((p) => ({ ...p, [img.id]: { status: "error" } }));
            return;
          }
          const data = (await res.json()) as ScanResponse;
          const firstNum = data.stickers[0]?.number;
          setResults((p) => ({
            ...p,
            [img.id]: {
              status: "done",
              response: data,
              section: firstNum ? SECTION_OF.get(firstNum) : undefined,
              missingCount: data.stickers.filter((s) => s.status === "empty").length,
            },
          }));
        } catch {
          setResults((p) => ({ ...p, [img.id]: { status: "error" } }));
        }
      }),
    );
  }

  function goReview() {
    const ok = images.map((i) => results[i.id]?.response).filter((r): r is ScanResponse => !!r);
    if (!ok.length) {
      reset();
      return;
    }
    setStage({ name: "review", ...mergeResults(ok, getCount) });
  }

  function reset() {
    setImages([]);
    setResults({});
    setStage({ name: "stage" });
  }

  // Scanning writes straight to your collection (synced to the DB), so it needs login.
  if (authStatus === "loading") {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }
  if (authStatus === "out") {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <LogIn className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-display text-xl font-black uppercase">Entre pra escanear</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            A Scan salva direto na sua coleção — faça login pra começar.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-success text-black hover:bg-success/85"
          render={<Link href="/login">Fazer login</Link>}
        />
      </div>
    );
  }

  if (stage.name === "scanning") {
    const states = images.map((i) => results[i.id]);
    const total = images.length;
    const settled = states.filter((r) => r && r.status !== "pending").length;
    const okCount = states.filter((r) => r?.status === "done").length;
    const failed = states.filter((r) => r?.status === "error").length;
    const allSettled = settled === total;
    const pct = total ? Math.round((settled / total) * 100) : 0;

    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          {!allSettled && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand" />}
          <p className="text-sm font-medium">
            {allSettled
              ? `${okCount} de ${total} ${total === 1 ? "página lida" : "páginas lidas"}${failed ? ` · ${failed} falharam` : ""}`
              : `Lendo ${settled} de ${total}…`}
          </p>
          <Progress value={pct} className="ml-auto w-40 max-w-[40%]" />
        </div>

        <div className={GRID}>
          {images.map((img, i) => {
            const r = results[img.id];
            const done = r?.status === "done";
            return (
              <div key={img.id} className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-card shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={`Página ${i + 1}`}
                  className={cn("h-full w-full object-cover transition", !done && "opacity-55")}
                />
                {r?.status === "pending" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-brand" />
                  </div>
                )}
                {r?.status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/15 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-[10px] font-semibold">erro</span>
                  </div>
                )}
                {done && (
                  <>
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-black shadow">
                      <Check className="h-3 w-3" />
                    </span>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-5 text-white">
                      <p className="truncate font-display text-xs font-bold uppercase leading-tight">
                        {r.section ? shortSectionLabel(r.section) : "—"}
                      </p>
                      <p className="text-[10px] text-white/85 tabular-nums">
                        {r.missingCount} falta{r.missingCount === 1 ? "" : "m"}
                      </p>
                    </div>
                  </>
                )}
                <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 font-display text-xs text-white tabular-nums">
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-3 z-10 flex gap-2 rounded-xl border bg-background/90 p-3 shadow-lg backdrop-blur">
          <Button type="button" size="lg" variant="outline" onClick={reset}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="lg"
            className="ml-auto bg-success text-black hover:bg-success/85"
            disabled={!allSettled || okCount === 0}
            onClick={goReview}
          >
            {allSettled ? `Conferir ${okCount} ${okCount === 1 ? "página" : "páginas"}` : "Lendo…"}
          </Button>
        </div>
      </div>
    );
  }

  if (stage.name === "review") {
    return (
      <ScanReview
        rows={stage.rows}
        unmatched={stage.unmatched}
        dupSections={stage.dupSections}
        model={stage.model}
        onRescan={reset}
        onDone={(added, cleared) => setStage({ name: "done", added, cleared })}
      />
    );
  }

  if (stage.name === "done") {
    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <CheckCircle2 className="h-14 w-14 text-success" />
        <div>
          <p className="font-display text-2xl font-black uppercase">Salvo!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {stage.added} figurinha{stage.added === 1 ? "" : "s"} marcada{stage.added === 1 ? "" : "s"} como “tenho”
            {stage.cleared > 0 && ` · ${stage.cleared} removida${stage.cleared === 1 ? "" : "s"}`}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={reset} className="bg-success text-black hover:bg-success/85">
            Escanear mais
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/">Ver álbum</Link>} />
        </div>
      </div>
    );
  }

  if (stage.name === "error") {
    return (
      <div className="flex flex-col items-center gap-5 py-12 text-center">
        <p className="max-w-sm text-sm text-destructive">{stage.message}</p>
        <Button size="lg" variant="outline" onClick={() => setStage({ name: "stage" })}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <ScanTray
      images={images}
      busy={false}
      onAdd={addFiles}
      onRemove={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
      onScan={scanAll}
    />
  );
}

/** Unique id, with a fallback for non-secure contexts (crypto.randomUUID undefined). */
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Merge per-image scan responses into one section-grouped, conflict-aware row list. */
function mergeResults(responses: ScanResponse[], getCount: (num: string) => number) {
  const seen = new Map<string, Set<ScanStatus>>();
  const unmatched = new Set<string>();
  const imageSections: string[] = [];

  for (const r of responses) {
    for (const u of r.unmatched) unmatched.add(u);
    const firstNum = r.stickers[0]?.number;
    const sec = firstNum ? SECTION_OF.get(firstNum) : undefined;
    if (sec) imageSections.push(sec);
    for (const s of r.stickers) {
      const set = seen.get(s.number) ?? new Set<ScanStatus>();
      set.add(s.status);
      seen.set(s.number, set);
    }
  }

  const rows: ReviewRow[] = [];
  for (const [num, statuses] of seen) {
    const conflictA = statuses.has("filled") && statuses.has("empty");
    // Cross-page disagreement -> observed "empty" wins (protects against false-owned).
    const scanStatus: ScanStatus = !conflictA && statuses.has("filled") ? "filled" : "empty";
    rows.push({
      num,
      section: SECTION_OF.get(num) ?? "_other",
      scanStatus,
      ownedCount: getCount(num),
      conflictA,
    });
  }

  // Order: sections by first appearance, then manifest order within each section.
  const sectionOrder = [...new Set([...imageSections, ...rows.map((r) => r.section)])];
  const memberIndex = (num: string) =>
    (SECTION_MEMBERS.get(SECTION_OF.get(num) ?? "") ?? []).indexOf(num);
  rows.sort((a, b) => {
    const d = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
    return d !== 0 ? d : memberIndex(a.num) - memberIndex(b.num);
  });

  const sectionCounts = new Map<string, number>();
  for (const s of imageSections) sectionCounts.set(s, (sectionCounts.get(s) ?? 0) + 1);
  const dupSections = [...sectionCounts].filter(([, n]) => n > 1).map(([s]) => s);

  return { rows, unmatched: [...unmatched], dupSections, model: responses[0]?.model ?? "" };
}
