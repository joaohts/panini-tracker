@AGENTS.md

# Panini WC 2026 Sticker Tracker

Track which Panini World Cup 2026 stickers you own by photographing album pages and
having Claude vision read which slots are filled. Browse all stickers; owned show their
art, missing show a numbered "back". Tracks duplicate counts for swaps.

**Read `CONTRACT.md` first** — it is the single source of truth for the data, the
collection model, the `/api/scan` contract, and the UI decisions. Do not duplicate it here.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind. Single repo. The AI proxy is a
route handler at `src/app/api/scan/route.ts` (server-side; `ANTHROPIC_API_KEY` in `.env.local`).
Installable PWA. Per-device collection state in `localStorage` (zustand + persist).

> Next 16 / React 19 differ from older training data — check `node_modules/next/dist/docs/`
> before using App-Router APIs you're unsure about.

## Two-window split (stay in your lane)

- **Session 1 — browse/core:** scaffold, `src/data`, `src/lib/types.ts`, `src/store`, `src/components/browse`, browse pages.
- **Session 2 — scan:** `src/app/api/scan/`, `src/components/scan`, scan page. Imports types + store from Session 1; does not edit Session 1 dirs.
- Shared: `package.json` (coordinate dep adds), `src/lib/types.ts` (Session 1 owns).

## Source data (do not regenerate)

- Manifest: `/Users/joaohts/personal/panini-stickers/panini_world_cup_2026_manifest.json`
- Images:   `/Users/joaohts/personal/panini-stickers/panini_world_cup_2026/<num>.jpg`
- In-app: manifest → `src/data/manifest.json`; images symlinked to `public/stickers/`.

## Design note

Full design rationale lives in the Obsidian vault: `~/notes/jonathan/projects/sticker-tracker.md`.
