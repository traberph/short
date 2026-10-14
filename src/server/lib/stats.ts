import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { PageStats } from "../../shared/api-types.js";
import type { Db, Tx } from "../db/index.js";
import { clicks, dailyStats, settings } from "../db/schema.js";
import { randomToken, sha256 } from "./crypto.js";

// Calendar day (YYYY-MM-DD) in the configured timezone.
export function dayOf(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// The visitor salt is random, stored only for the current day and replaced on the next one,
// so visitor hashes can't be linked across days or reversed after the fact.
function dailySalt(db: Db | Tx, day: string): string {
  const row = db.select().from(settings).where(eq(settings.key, "visitor_salt")).get();
  if (row) {
    const stored = JSON.parse(row.value) as { day: string; salt: string };
    if (stored.day === day) return stored.salt;
  }
  const salt = randomToken();
  const value = JSON.stringify({ day, salt });
  db.insert(settings)
    .values({ key: "visitor_salt", value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
  return salt;
}

// Normalizes an IP so that the last part is dropped (IPv4 /24, IPv6 /48) before hashing.
export function anonymizeIp(ip: string): string {
  const v4 = ip.match(/^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.\d+$/);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0`;
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + "::";
  return "unknown";
}

export function recordClick(
  db: Db,
  timezone: string,
  pageId: number,
  ip: string,
  userAgent: string,
  now = new Date(),
): void {
  const day = dayOf(now, timezone);
  db.transaction((tx) => {
    const visitor = sha256(`${dailySalt(tx, day)}|${anonymizeIp(ip)}|${userAgent}`);
    const seen = tx
      .select({ id: clicks.id })
      .from(clicks)
      .where(and(eq(clicks.pageId, pageId), eq(clicks.day, day), eq(clicks.visitor, visitor)))
      .limit(1)
      .get();
    tx.insert(clicks).values({ pageId, at: now, day, visitor }).run();
    tx.insert(dailyStats)
      .values({ pageId, day, clicks: 1, uniques: seen ? 0 : 1, lastAt: now })
      .onConflictDoUpdate({
        target: [dailyStats.pageId, dailyStats.day],
        set: {
          clicks: sql`${dailyStats.clicks} + 1`,
          uniques: sql`${dailyStats.uniques} + ${seen ? 0 : 1}`,
          lastAt: now,
        },
      })
      .run();
  });
}

export function getStats(db: Db, timezone: string, pageId: number, days: number, now = new Date()): PageStats {
  const today = dayOf(now, timezone);
  const from = addDays(today, -(days - 1));

  const rows = db
    .select()
    .from(dailyStats)
    .where(and(eq(dailyStats.pageId, pageId), gte(dailyStats.day, from)))
    .all();
  const byDay = new Map(rows.map((r) => [r.day, r]));

  const series = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(from, i);
    const row = byDay.get(day);
    series.push({ day, clicks: row?.clicks ?? 0, uniques: row?.uniques ?? 0 });
  }

  const totals = db
    .select({ total: sql<number>`coalesce(sum(${dailyStats.clicks}), 0)` })
    .from(dailyStats)
    .where(eq(dailyStats.pageId, pageId))
    .get();
  const last = db
    .select({ lastAt: dailyStats.lastAt })
    .from(dailyStats)
    .where(eq(dailyStats.pageId, pageId))
    .orderBy(desc(dailyStats.day))
    .limit(1)
    .get();
  const todayRow = byDay.get(today);

  return {
    total: totals?.total ?? 0,
    today: todayRow?.clicks ?? 0,
    uniquesToday: todayRow?.uniques ?? 0,
    lastVisit: last?.lastAt.toISOString() ?? null,
    series,
  };
}

export function resetStats(db: Db, pageId: number): void {
  db.transaction((tx) => {
    tx.delete(clicks).where(eq(clicks.pageId, pageId)).run();
    tx.delete(dailyStats).where(eq(dailyStats.pageId, pageId)).run();
  });
}

// Deletes individual clicks older than the retention period. Daily totals are kept.
export function pruneClicks(db: Db, retentionDays: number, now = new Date()): number {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return db.delete(clicks).where(lt(clicks.at, cutoff)).run().changes;
}
