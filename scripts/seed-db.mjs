// Local test setup: create the SQLite collection DB and a fake account so you
// can run the app end-to-end (login + synced collection) without registering.
//
//   npm run seed       # creates ./data/stickers.db with user "tester"
//   npm run dev        # then log in at /login
//
// Idempotent: re-running wipes and re-seeds the tester account only. The .db
// itself is gitignored (user data) — this script is the committed setup.
//
// Fake credentials:  username "tester"  /  password "panini123"

import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.resolve(
  process.env.STICKER_DB_PATH || path.join(root, "data/stickers.db"),
);

const USERNAME = "tester";
const PASSWORD = "panini123";
const DISPLAY_NAME = "Tester";

// --- scrypt hashing, identical to src/server/auth.ts ("scrypt$salt$hash") ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

// --- schema, identical to src/server/db.ts migrate() ---
function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      username     TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      pw_hash      TEXT NOT NULL,
      created_at   TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS collection (
      user_id    TEXT NOT NULL REFERENCES users(id),
      num        TEXT NOT NULL,
      count      INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, num)
    );
  `);
}

// --- sample collection: own a random ~half of all stickers, with some dupes ---
function sampleEntries() {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "src/data/manifest.json"), "utf8"),
  );
  // mirror src/lib/stickers.ts isExcluded: drop non-LATAM Coca-Cola sets
  const isExcluded = (num) => {
    const n = num.toLowerCase();
    return n.startsWith("cc-") && !n.startsWith("cc-lam");
  };
  const nums = manifest.stickers
    .map((s) => s.num)
    .filter((n) => !isExcluded(n));
  // Each sticker has a 50% chance of being owned (re-randomized every seed);
  // ~15% of owned ones are duplicates (count 2-3) to populate the dupes filter.
  const entries = [];
  for (const num of nums) {
    if (Math.random() < 0.5) continue;
    const count = Math.random() < 0.15 ? 2 + Math.round(Math.random()) : 1;
    entries.push({ num, count });
  }
  return entries;
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
migrate(db);

const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(USERNAME);
if (existing) {
  db.prepare("DELETE FROM collection WHERE user_id = ?").run(existing.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(existing.id);
}

const userId = crypto.randomUUID();
const now = new Date().toISOString();
const entries = sampleEntries();

db.transaction(() => {
  db.prepare(
    "INSERT INTO users (id, username, display_name, pw_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(userId, USERNAME, DISPLAY_NAME, hashPassword(PASSWORD), now);

  const ins = db.prepare(
    "INSERT INTO collection (user_id, num, count, updated_at) VALUES (?, ?, ?, ?)",
  );
  for (const { num, count } of entries) ins.run(userId, num, count, now);
})();

console.log(`✓ Seeded ${DB_PATH}`);
console.log(`  user: ${USERNAME} / ${PASSWORD}  (${entries.length} stickers owned)`);
