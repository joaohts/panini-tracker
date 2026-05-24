// Helpers shared by the auth/collection route handlers: httpOnly-cookie session
// auth (with a Bearer fallback for direct API use), client IP, JSON responses,
// and an in-memory rate limiter.

import { cookies } from "next/headers";
import { userForToken, type User } from "./auth";

export const SESSION_COOKIE = "session";

function bearer(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/** Session token from the httpOnly cookie, falling back to a Bearer header. */
export async function sessionToken(req: Request): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? bearer(req);
}

/** Resolve the request to a user, or null. */
export async function authUser(req: Request): Promise<User | null> {
  const token = await sessionToken(req);
  return token ? userForToken(token) : null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: parseInt(process.env.SESSION_TTL_DAYS || "90", 10) * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Real client IP (behind cloudflared / a proxy that sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

// Fixed-window in-memory rate limiter (best-effort; one process).
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}
