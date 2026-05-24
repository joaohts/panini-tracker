// Section taxonomy for scan classification, shared by the route (auto-complete)
// and the confirm UI (grouping). Pure data + functions, safe to import on the
// client. A "section" is one physical album page's worth of slots.
//
// Most sections map 1:1 to a team (mex = mex1..mex20). The exceptions are the
// album's four opening foil pages, where the FWC foils + the Panini logo are
// physically split — so we model each opening page as its own section to keep
// auto-complete ("owned = section - missing") from over-filling unseen slots.

import { STICKERS, VALID_NUMS, teamLabel } from "@/lib/stickers";

// The four opening pages (physical-album knowledge, not in the manifest).
const FWC_PAGES: Record<string, string[]> = {
  "fwc-opening": ["00", "fwc1", "fwc2", "fwc3", "fwc4"],
  "fwc-cities": ["fwc5", "fwc6", "fwc7", "fwc8"],
  "fwc-history-1930": ["fwc9", "fwc10", "fwc11", "fwc12", "fwc13"],
  "fwc-history-1978": ["fwc14", "fwc15", "fwc16", "fwc17", "fwc18", "fwc19"],
};

/** section id -> the manifest nums that live on that page. */
export const SECTION_MEMBERS: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const s of STICKERS) {
    // fwc + logo are handled by FWC_PAGES below, not by their team field.
    if (s.team === "fwc" || s.team === "_logo") continue;
    const arr = m.get(s.team) ?? [];
    arr.push(s.num);
    m.set(s.team, arr);
  }
  for (const [id, nums] of Object.entries(FWC_PAGES)) {
    const present = nums.filter((n) => VALID_NUMS.has(n));
    if (present.length) m.set(id, present);
  }
  return m;
})();

/**
 * The four opening-foil pages are mutually exclusive — a single photo shows at
 * most one of them (groups / cities / the two history pages never share a page).
 */
export const FWC_OPENING_PAGES = new Set([
  "fwc-opening",
  "fwc-cities",
  "fwc-history-1930",
  "fwc-history-1978",
]);

/** Page types the classification pass (pass 1) chooses from. */
export type PageType =
  | "team"
  | "opening"
  | "cities"
  | "history-early"
  | "history-recent"
  | "cc-lam";

/** Special page types map straight to a section id; "team" is resolved from the read. */
export const PAGE_TO_SECTION: Record<Exclude<PageType, "team">, string> = {
  opening: "fwc-opening",
  cities: "fwc-cities",
  "history-early": "fwc-history-1930",
  "history-recent": "fwc-history-1978",
  "cc-lam": "cc-lam",
};

/** num -> its section id. */
export const SECTION_OF: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [id, nums] of SECTION_MEMBERS) for (const n of nums) m.set(n, id);
  return m;
})();

// Tokens the model might emit -> canonical section id.
const ALIASES: Record<string, string> = {
  legend: "_legend",
  legends: "_legend",
  craques: "_legend",
  cclam: "cc-lam",
  lam: "cc-lam",
  cocacola: "cc-lam",
  coke: "cc-lam",
  // opening foil pages
  fwcopening: "fwc-opening",
  opening: "fwc-opening",
  abertura: "fwc-opening",
  groups: "fwc-opening",
  grupos: "fwc-opening",
  logo: "fwc-opening",
  panini: "fwc-opening",
  fwccities: "fwc-cities",
  cities: "fwc-cities",
  cidades: "fwc-cities",
  fwchistory1930: "fwc-history-1930",
  history19301974: "fwc-history-1930",
  trophy: "fwc-history-1930",
  fwchistory1978: "fwc-history-1978",
  history19782022: "fwc-history-1978",
};

const BY_NORM: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const id of SECTION_MEMBERS.keys()) m.set(normToken(id), id);
  for (const [k, v] of Object.entries(ALIASES)) m.set(k, v);
  return m;
})();

function normToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Resolve a model-reported section name to a section id, or null if unknown. */
export function resolveSection(s: string): string | null {
  return BY_NORM.get(normToken(s)) ?? null;
}

/** Compact label for a section id (fits a thumbnail badge). */
export function shortSectionLabel(id: string): string {
  switch (id) {
    case "fwc-opening":
      return "Abertura";
    case "fwc-cities":
      return "Cidades";
    case "fwc-history-1930":
      return "História 30–74";
    case "fwc-history-1978":
      return "História 78–22";
    case "_legend":
      return "Craques";
    case "cc-lam":
      return "Coca-Cola";
    default:
      return teamLabel(id); // team code, e.g. "MEX"
  }
}

/** Human label for a section id (confirm-screen headers). */
export function sectionLabel(id: string): string {
  switch (id) {
    case "fwc-opening":
      return "Abertura (00, FWC 1–4)";
    case "fwc-cities":
      return "Intro · Cidades (FWC 5–8)";
    case "fwc-history-1930":
      return "História 1930–1974 (FWC 9–13)";
    case "fwc-history-1978":
      return "História 1978–2022 (FWC 14–19)";
    default:
      return teamLabel(id);
  }
}
