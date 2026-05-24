import manifestJson from "@/data/manifest.json";
import availableImages from "@/data/available-images.json";
import landscapeImages from "@/data/landscape-images.json";
import { countryName } from "./countries";
import type { Sticker, StickerKind } from "./types";

interface RawSticker {
  num: string;
  name: string;
  file: string;
  url: string;
}
interface RawManifest {
  slug: string;
  collect_id: string;
  count: number;
  stickers: RawSticker[];
}

const manifest = manifestJson as RawManifest;
const available = new Set(availableImages as string[]);
const landscape = new Set(landscapeImages as string[]);

/** Excluded from the collection: all Coca-Cola sets except LATAM (cc-lam). */
function isExcluded(num: string): boolean {
  const n = num.toLowerCase();
  return n.startsWith("cc-") && !n.startsWith("cc-lam");
}

function classify(num: string): {
  team: string;
  kind: StickerKind;
  isBase: boolean;
} {
  const n = num.toLowerCase();
  if (n === "00") return { team: "_logo", kind: "base-logo", isBase: true };
  if (/^fwc\d+$/.test(n)) return { team: "fwc", kind: "base-fwc", isBase: true };
  if (n.startsWith("cc-")) {
    // cc-lam1 -> group "cc-lam"
    const group = n.replace(/\d+$/, "");
    return { team: group, kind: "promo-coke", isBase: false };
  }
  if (/^[a-z]{1,4}$/.test(n)) {
    return { team: "_legend", kind: "promo-legend", isBase: false };
  }
  const m = n.match(/^([a-z]+)(\d+)$/);
  if (m) return { team: m[1], kind: "base-team", isBase: true };
  // fallback: treat unknown as promo
  return { team: "_other", kind: "promo-legend", isBase: false };
}

/** All stickers in manifest order, enriched. Excludes non-LATAM Coca-Cola sets. */
export const STICKERS: Sticker[] = manifest.stickers
  .filter((s) => !isExcluded(s.num))
  .map((s) => {
  const { team, kind, isBase } = classify(s.num);
  return {
    num: s.num,
    name: s.name,
    file: s.file,
    url: s.url,
    team,
    kind,
    isBase,
    hasImage: available.has(s.num),
    landscape: landscape.has(s.num),
  };
});

export const BY_NUM: Map<string, Sticker> = new Map(
  STICKERS.map((s) => [s.num, s]),
);

/** Denominator for progress: the base 980 set. */
export const BASE_STICKERS = STICKERS.filter((s) => s.isBase);
export const BASE_COUNT = BASE_STICKERS.length;

/** Set of valid nums — used by the scan route to validate model output. */
export const VALID_NUMS: Set<string> = new Set(STICKERS.map((s) => s.num));

export function imageSrc(sticker: Sticker): string {
  return `/stickers/${sticker.num}.jpg`;
}

/** Ordered list of team/group codes in first-appearance order. */
export const TEAMS: string[] = (() => {
  const seen: string[] = [];
  const set = new Set<string>();
  for (const s of STICKERS) {
    if (!set.has(s.team)) {
      set.add(s.team);
      seen.push(s.team);
    }
  }
  return seen;
})();

/** Human label for a team/group code. */
export function teamLabel(team: string): string {
  if (team === "_logo") return "Panini";
  if (team === "fwc") return "Início / FWC";
  if (team === "_legend") return "Craques";
  if (team === "_other") return "Outras";
  if (team.startsWith("cc-")) return `Coca-Cola (${team.slice(3).toUpperCase()})`;
  return countryName(team);
}
