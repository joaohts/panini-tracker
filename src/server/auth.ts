// Auth: scrypt password hashing (no native deps), opaque session tokens, and
// username/password validation. Ported from A3's sticker-api.

import crypto from "node:crypto";
import { getDb } from "./db";

// Stored format: "scrypt$<salthex>$<hashhex>"
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  let actual: Buffer;
  try {
    actual = crypto.scryptSync(password, salt, expected.length);
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

/** Normalise + validate a username. Returns null if invalid. */
export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const username = raw.trim().toLowerCase();
  return USERNAME_RE.test(username) ? username : null;
}

export function isValidPassword(raw: unknown): raw is string {
  return typeof raw === "string" && raw.length >= 8 && raw.length <= 256;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
}

const ttlDays = () => parseInt(process.env.SESSION_TTL_DAYS || "90", 10);

/** Create a session row for a user and return the opaque token. */
export function createSession(userId: string): string {
  const db = getDb();
  const token = generateToken();
  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays() * 24 * 60 * 60 * 1000);
  db.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(token, userId, now.toISOString(), expires.toISOString());
  return token;
}

/** Resolve a bearer token to a user, or null if missing/expired. Expired rows are pruned. */
export function userForToken(token: string): User | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.expires_at AS expiresAt, u.id, u.username, u.display_name AS displayName
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as
    | { expiresAt: string; id: string; username: string; displayName: string }
    | undefined;
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, username: row.username, displayName: row.displayName };
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
