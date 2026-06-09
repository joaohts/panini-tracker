// POST /api/scan — reads a full album-page photo with a vision model and
// reports which sticker slots are filled. Contract: see CONTRACT.md.
//
// Two passes (see providers.ts): pass 1 classifies the page; pass 2 reads its
// EMPTY slots. The section is then known deterministically, so we derive
// "owned = that section's full set minus the empty slots". A placed sticker
// hides its number, so only empties are read; the confirm UI fixes mistakes.
// Server-side only; the API key never reaches the browser.

import type { ScanResponse, ScanStatus } from "@/lib/types";
import { authUser, rateLimit } from "@/server/http";
import { VALID_NUMS } from "@/lib/stickers";
import { runScan, ConfigError, VisionError, type VisionReading } from "./providers";
import { SECTION_MEMBERS, SECTION_OF, PAGE_TO_SECTION, resolveSection } from "./sections";

export const runtime = "nodejs";
export const maxDuration = 60;

// Map a normalized key (lowercase, alphanumerics only, no leading zeros) ->
// canonical manifest num, so "MEX 5" / "mex-05" / "mex5" all resolve to "mex5".
const NORMALIZED_TO_NUM: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const num of VALID_NUMS) m.set(normalize(num), num);
  return m;
})();

function normalize(s: string): string {
  const compact = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Drop leading zeros in a trailing number group so the album's printed
  // "MEX 01" / "FWC 09" match the manifest's "mex1" / "fwc9". "00" -> "0".
  return compact.replace(/0*(\d+)$/, "$1");
}

export async function POST(request: Request): Promise<Response> {
  // Scanning spends a paid vision call, so require login and throttle per user
  // — this endpoint must never be an open proxy to the AI provider.
  const user = await authUser(request);
  if (!user) return err(401, "Authentication required");
  if (!rateLimit(`scan:${user.id}`, 30, 60_000)) {
    return err(429, "Too many scans — slow down a moment");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err(400, "Request body must be JSON");
  }

  const parsed = parseInput(body);
  if ("error" in parsed) return err(400, parsed.error);

  let vision;
  try {
    vision = await runScan(parsed);
  } catch (e) {
    if (e instanceof ConfigError) return err(500, e.message);
    if (e instanceof VisionError) return err(502, e.message);
    return err(502, e instanceof Error ? e.message : "Vision call failed");
  }

  const { stickers, unmatched, warnings } = reconcile(vision.reading);

  const response: ScanResponse = {
    stickers,
    unmatched,
    model: vision.model,
    warnings: [...vision.warnings, ...warnings],
  };
  return Response.json(response);
}

/** Validate/normalize the request, accepting a bare base64 string or a data: URL. */
function parseInput(
  body: unknown,
): { image_base64: string; mime: string; hint?: string } | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Expected a JSON object" };
  }
  const b = body as Record<string, unknown>;

  let image_base64 = typeof b.image_base64 === "string" ? b.image_base64.trim() : "";
  let mime = typeof b.mime === "string" ? b.mime.trim() : "";
  const hint = typeof b.hint === "string" ? b.hint : undefined;

  if (!image_base64) return { error: "image_base64 is required" };

  // Tolerate a full data: URL even though the contract asks for raw base64.
  const dataUrl = image_base64.match(/^data:(.+?);base64,(.*)$/s);
  if (dataUrl) {
    mime = mime || dataUrl[1];
    image_base64 = dataUrl[2];
  }

  if (!mime) return { error: "mime is required (e.g. image/jpeg)" };
  if (!mime.startsWith("image/")) return { error: `Unsupported mime: ${mime}` };

  return { image_base64, mime, hint };
}

/**
 * Turn the two-pass reading into a validated ScanResponse. The section is fixed
 * by classification (special pages) or read from the page (team), so we simply
 * mark every slot of that section owned (filled) unless it was read EMPTY.
 * Codes outside the section, or unknown, are quarantined in `unmatched`.
 */
function reconcile(reading: VisionReading) {
  const unmatched: string[] = [];
  const warnings: string[] = [];

  const section = resolveScanSection(reading);
  if (!section || !SECTION_MEMBERS.has(section)) {
    return {
      stickers: [],
      unmatched: reading.missing,
      warnings: ["Could not identify the album page — try a sharper, straight-on full-page photo."],
    };
  }

  const members = SECTION_MEMBERS.get(section)!;
  const memberSet = new Set(members);
  const missingSet = new Set<string>();
  for (const raw of reading.missing) {
    const num = NORMALIZED_TO_NUM.get(normalize(raw));
    if (num && memberSet.has(num)) missingSet.add(num);
    else unmatched.push(raw); // misread or from a different page
  }

  const stickers = members.map((num) => {
    const empty = missingSet.has(num);
    return {
      number: num,
      // "empty" is directly read; "filled" is inferred from full-page coverage.
      status: (empty ? "empty" : "filled") as ScanStatus,
      confidence: empty ? 0.95 : 0.9,
    };
  });

  return { stickers, unmatched, warnings };
}

/** The album section a reading belongs to: classification for special pages,
 *  the read team code (or an empty's prefix) for team pages. */
function resolveScanSection(reading: VisionReading): string | null {
  if (reading.pageType !== "team") {
    return PAGE_TO_SECTION[reading.pageType] ?? null;
  }
  // Prefer the team implied by a read empty code; fall back to the read team code.
  for (const raw of reading.missing) {
    const num = NORMALIZED_TO_NUM.get(normalize(raw));
    const team = num && SECTION_OF.get(num);
    if (team) return team;
  }
  return resolveSection(reading.teamCode);
}

function err(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}
