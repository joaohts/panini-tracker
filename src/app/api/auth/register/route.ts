import crypto from "node:crypto";
import { getDb } from "@/server/db";
import {
  hashPassword,
  normalizeUsername,
  isValidPassword,
  createSession,
  type User,
} from "@/server/auth";
import { clientIp, json, rateLimit, setSessionCookie } from "@/server/http";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  if (!rateLimit(`auth:${clientIp(req)}`, 10, 60_000)) {
    return json({ error: "Too many attempts, try again later" }, 429);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const requiredInvite = process.env.INVITE_CODE;
  if (requiredInvite && body.inviteCode !== requiredInvite) {
    return json({ error: "Invalid invite code" }, 403);
  }

  const username = normalizeUsername(body.username);
  if (!username) {
    return json(
      { error: "Username must be 3-32 chars: lowercase letters, digits, underscore" },
      400,
    );
  }
  const password = body.password;
  if (!isValidPassword(password)) {
    return json({ error: "Password must be at least 8 characters" }, 400);
  }
  const dn = body.displayName;
  const displayName =
    typeof dn === "string" && dn.trim() ? dn.trim().slice(0, 64) : username;

  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE username = ?").get(username)) {
    return json({ error: "Username taken" }, 409);
  }

  const user: User = { id: crypto.randomUUID(), username, displayName };
  db.prepare(
    "INSERT INTO users (id, username, display_name, pw_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(user.id, user.username, user.displayName, hashPassword(password), new Date().toISOString());

  await setSessionCookie(createSession(user.id));
  return json({ user });
}
