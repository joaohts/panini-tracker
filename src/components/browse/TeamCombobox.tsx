"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { TEAMS, teamLabel } from "@/lib/stickers";
import { countrySearchTokens, norm } from "@/lib/countries";
import { cn } from "@/lib/utils";

/** Type-to-search team filter. Matches code + PT/EN names + aliases (accent-insensitive). */
export function TeamCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // "all" pinned first, then teams A–Z by PT label (matches the browse A–Z view).
  const sortedCodes = useMemo(
    () => [
      "all",
      ...[...TEAMS].sort((a, b) => teamLabel(a).localeCompare(teamLabel(b), "pt")),
    ],
    [],
  );

  const options = useMemo(() => {
    const codes = sortedCodes;
    const nq = norm(q);
    if (!nq) return codes;
    return codes.filter((code) => {
      const tokens =
        code === "all"
          ? ["all", "todas", "todos"]
          : [...countrySearchTokens(code), norm(teamLabel(code))];
      return tokens.some((t) => t.includes(nq));
    });
  }, [q, sortedCodes]);

  const label = value === "all" ? "Todas" : teamLabel(value);

  return (
    <div ref={ref} className="relative w-full sm:ml-auto sm:w-[200px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm"
      >
        <span className="truncate">{label}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute inset-x-0 z-30 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar time…"
            className="w-full border-b bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="max-h-72 overflow-y-auto p-1">
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Nada encontrado
              </div>
            )}
            {options.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  onChange(code);
                  setQ("");
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                  value === code && "font-semibold",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value === code ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">
                  {code === "all" ? "Todas" : teamLabel(code)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
