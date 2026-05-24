"use client";

import { useRef } from "react";
import { Camera, ImagePlus, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StagedImage } from "./ScanFlow";

export function ScanTray({
  images,
  busy,
  onAdd,
  onRemove,
  onScan,
}: {
  images: StagedImage[];
  busy: boolean;
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
  onScan: () => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) onAdd(e.target.files);
    e.target.value = ""; // allow re-picking the same file
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Fotografe páginas inteiras do álbum, uma de cada vez e bem de frente. A
        Scan lê quais figurinhas faltam em cada página.
      </p>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" multiple onChange={pick} className="hidden" />

      {/* tray */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
        {images.map((img, i) => (
          <div key={img.id} className="relative aspect-[3/4] overflow-hidden rounded-lg border bg-card shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.previewUrl} alt={`Página ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(img.id)}
              disabled={busy}
              aria-label="Remover"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 font-display text-xs text-white tabular-nums">
              {i + 1}
            </span>
          </div>
        ))}

        {/* add tile */}
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={busy}
          className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition hover:border-brand hover:text-brand disabled:opacity-50"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-xs font-medium">Adicionar</span>
        </button>
      </div>

      {/* actions */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="lg" disabled={busy} onClick={() => cameraRef.current?.click()}>
          <Camera /> Tirar foto
        </Button>
        <Button type="button" variant="outline" size="lg" disabled={busy} onClick={() => galleryRef.current?.click()}>
          <ImagePlus /> Enviar
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={busy || images.length === 0}
          onClick={onScan}
          className="ml-auto bg-success text-black hover:bg-success/85"
        >
          <ScanLine />
          {busy ? "Lendo…" : `Escanear ${images.length || ""} ${images.length === 1 ? "página" : "páginas"}`.trim()}
        </Button>
      </div>
    </div>
  );
}
