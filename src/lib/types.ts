// Shared types. Session 1 owns this file; Session 2 imports from it.
// Keep in sync with CONTRACT.md.

export type StickerKind =
  | "base-team" // <team><n>, e.g. mex5
  | "base-fwc" // fwc1..fwc20 intro foils
  | "base-logo" // "00"
  | "promo-coke" // cc-*
  | "promo-legend"; // bare letter codes, e.g. hs, ly

/** A sticker as known from the manifest, enriched with derived fields. */
export interface Sticker {
  num: string; // canonical id: "00", "fwc6", "mex1", "cc-lam3", "hs"
  name: string;
  file: string; // "<num>.jpg"
  url: string; // original source URL (laststicker)
  team: string; // derived group code: "mex", "fwc", "cc-lam", "_legend", "_logo"
  kind: StickerKind;
  isBase: boolean; // counts toward the 980 denominator
  hasImage: boolean; // whether an image file exists locally
  landscape: boolean; // image is wider than tall (panoramic / team photo)
}

/** Per-device collection state. count 0 = missing, 1 = owned, >1 = duplicates. */
export interface CollectionEntry {
  num: string;
  count: number;
  updatedAt: string; // ISO
}

// ---- /api/scan contract (see CONTRACT.md) ----

export interface ScanRequest {
  image_base64: string; // no "data:" prefix
  mime: string; // e.g. "image/jpeg"
  hint?: string; // optional team name / page hint
}

export type ScanStatus = "filled" | "empty";

export interface ScanStickerResult {
  number: string; // must be a valid Sticker.num (else echoed in `unmatched`)
  status: ScanStatus; // filled -> owned, empty -> missing
  confidence: number; // 0..1
}

export interface ScanResponse {
  stickers: ScanStickerResult[];
  unmatched: string[]; // numbers read but not in manifest (review)
  model: string;
  warnings: string[];
}

export interface ScanError {
  error: string;
}
