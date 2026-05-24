// Per-user collection storage + last-write-wins merge. Ported from A3's sticker-api.

import { getDb } from "./db";

export interface CollectionEntry {
  num: string;
  count: number;
  updatedAt: string;
}

const MAX_NUM_LEN = 16;

export function listCollection(userId: string): CollectionEntry[] {
  return getDb()
    .prepare(
      "SELECT num, count, updated_at AS updatedAt FROM collection WHERE user_id = ? ORDER BY num",
    )
    .all(userId) as CollectionEntry[];
}

/**
 * Merge incoming entries with last-write-wins (incoming wins iff its updatedAt
 * >= stored). Malformed rows are skipped, not fatal — a personal sync shouldn't
 * get stuck on one bad row.
 */
export function mergeEntries(userId: string, entries: unknown[]): void {
  const clean: CollectionEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const { num, count, updatedAt } = e as Record<string, unknown>;
    if (typeof num !== "string" || num.length === 0 || num.length > MAX_NUM_LEN) continue;
    if (typeof count !== "number" || !Number.isInteger(count) || count < 0) continue;
    if (typeof updatedAt !== "string" || Number.isNaN(Date.parse(updatedAt))) continue;
    clean.push({ num, count, updatedAt });
  }

  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO collection (user_id, num, count, updated_at)
    VALUES (@userId, @num, @count, @updatedAt)
    ON CONFLICT(user_id, num) DO UPDATE SET
      count = excluded.count,
      updated_at = excluded.updated_at
    WHERE excluded.updated_at >= collection.updated_at
  `);
  const apply = db.transaction((rows: CollectionEntry[]) => {
    for (const e of rows) {
      upsert.run({ userId, num: e.num, count: e.count, updatedAt: e.updatedAt });
    }
  });
  apply(clean);
}

export function clearCollection(userId: string): void {
  getDb().prepare("DELETE FROM collection WHERE user_id = ?").run(userId);
}
