"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Album, BarChart3, ScanLine, User as UserIcon } from "lucide-react";
import { useAuth } from "@/store/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Figurinhas", exact: true, Icon: Album },
  { href: "/stats", label: "Stats", exact: false, Icon: BarChart3 },
  { href: "/scan", label: "Scan", exact: false, Icon: ScanLine },
];

export function Header() {
  const path = usePathname();
  const authStatus = useAuth((s) => s.status);
  const authUser = useAuth((s) => s.user);
  return (
    <header className="sticky top-0 z-20 border-b-2 border-gold bg-gradient-to-r from-brand-dark to-brand text-white shadow">
      <div className="mx-auto flex max-w-[1800px] items-center gap-2 px-4 py-2 sm:gap-4 sm:px-6 lg:px-8">
        {/* brand on the left: emblem + title + subtitle */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 justify-self-start"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/emblem.svg"
            alt="World Cup 26"
            className="h-12 w-auto object-contain drop-shadow"
          />
          <span className="hidden whitespace-nowrap leading-none sm:block">
            <span className="block font-display text-xl font-black uppercase">
              World Cup 26
            </span>
            <span className="mt-0.5 block font-display text-xs text-white/80">
              Tracker de Figurinhas
            </span>
          </span>
        </Link>

        {/* centered page nav with icons */}
        <nav className="ml-auto flex items-center gap-1">
          {NAV.map(({ href, label, exact, Icon }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold transition sm:px-2.5",
                  active ? "text-white" : "text-white/60 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}

          {/* account */}
          <Link
            href="/login"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold transition sm:px-2.5",
              path.startsWith("/login")
                ? "text-white"
                : "text-white/60 hover:text-white",
            )}
          >
            <UserIcon className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">
              {authStatus === "in" && authUser ? authUser.displayName : "Entrar"}
            </span>
          </Link>
        </nav>

        {/* Panini logo, top-right */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/panini-logo.png"
          alt="Panini"
          className="h-5 w-auto shrink-0 object-contain drop-shadow sm:h-7"
        />
      </div>
    </header>
  );
}
