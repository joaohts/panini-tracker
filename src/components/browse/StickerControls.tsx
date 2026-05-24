"use client";

import Link from "next/link";
import { useCollection } from "@/store/collection";
import { useAuth } from "@/store/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StickerControls({ num }: { num: string }) {
  const status = useAuth((s) => s.status);
  const count = useCollection((s) => s.entries[num]?.count ?? 0);
  const setCount = useCollection((s) => s.setCount);
  const toggleOwned = useCollection((s) => s.toggleOwned);

  // Logged out = read-only: browse freely, but ownership editing needs login.
  if (status !== "in") {
    return (
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Entre para marcar
      </Link>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        onClick={() => toggleOwned(num)}
        variant={count >= 1 ? "default" : "secondary"}
        className={cn(count >= 1 && "bg-success text-black hover:bg-success/90")}
      >
        {count >= 1 ? "Tenho ✓" : "Marcar que tenho"}
      </Button>

      <div className="flex items-center gap-1 rounded-lg border bg-card px-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCount(num, count - 1)}
          disabled={count <= 0}
        >
          –
        </Button>
        <span className="w-10 text-center text-sm font-medium tabular-nums">
          {count > 1 ? `×${count}` : count}
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCount(num, count + 1)}
        >
          +
        </Button>
      </div>
    </div>
  );
}
