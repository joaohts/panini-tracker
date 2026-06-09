import { getDb } from "@/server/db";
import { verifyPassword, normalizeUsername, createSession } from "@/server/auth";
import { clientIp, json, rateLimit, setSessionCookie } from "@/server/http";

export const runtime = "nodejs";

const GENERIC_AUTH_ERROR = "Invalid credentials";

export async function POST(req: Request): Promise<Response> {
  if (!rateLimit(`auth:${clientIp(req)}`, 10, 60_000)) {
    return json({ error: "Too many attempts, try again later" }, 429);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const username = normalizeUsername(body.username);
  const password = body.password;
  if (!username || typeof password !== "string") {
    return json({ error: GENERIC_AUTH_ERROR }, 401);
  }

  const row = getDb()
    .prepare(
      "SELECT id, username, display_name AS displayName, pw_hash AS pwHash FROM users WHERE username = ?",
    )
    .get(username) as
    | { id: string; username: string; displayName: string; pwHash: string }
    | undefined;

  if (!row || !verifyPassword(password, row.pwHash)) {
    return json({ error: GENERIC_AUTH_ERROR }, 401);
  }

  // Set the httpOnly cookie (web) and also return the token in the body so
  // native clients (mobile app) can store it and send it as a Bearer header.
  const token = createSession(row.id);
  await setSessionCookie(token);
  return json({
    user: { id: row.id, username: row.username, displayName: row.displayName },
    token,
  });
}
