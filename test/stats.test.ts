import { describe, expect, it } from "vitest";
import { openDb } from "../src/server/db/index.js";
import { pages } from "../src/server/db/schema.js";
import { anonymizeIp, dayOf, getStats, pruneClicks, recordClick } from "../src/server/lib/stats.js";

describe("stats", () => {
  it("anonymizes IPv4 and IPv6 addresses", () => {
    expect(anonymizeIp("1.2.3.4")).toBe("1.2.3.0");
    expect(anonymizeIp("::ffff:1.2.3.4")).toBe("1.2.3.0");
    expect(anonymizeIp("2001:db8:abcd:12::1")).toBe("2001:db8:abcd::");
  });

  it("uses the configured timezone for days", () => {
    const lateEvening = new Date("2026-03-01T23:30:00Z");
    expect(dayOf(lateEvening, "UTC")).toBe("2026-03-01");
    expect(dayOf(lateEvening, "Europe/Berlin")).toBe("2026-03-02");
  });

  it("counts the same visitor again on a new day and keeps totals after pruning", () => {
    const db = openDb(":memory:");
    const page = db.insert(pages).values({ namespace: "", code: "x", kind: "redirect", dest: "https://x.test" }).returning().get();

    const day1 = new Date("2026-01-01T10:00:00Z");
    const day2 = new Date("2026-01-02T10:00:00Z");
    recordClick(db, "UTC", page.id, "1.2.3.4", "ua", day1);
    recordClick(db, "UTC", page.id, "1.2.3.4", "ua", day1);
    recordClick(db, "UTC", page.id, "1.2.3.4", "ua", day2);

    const stats = getStats(db, "UTC", page.id, 7, day2);
    expect(stats.total).toBe(3);
    expect(stats.series.slice(-2)).toEqual([
      { day: "2026-01-01", clicks: 2, uniques: 1 },
      { day: "2026-01-02", clicks: 1, uniques: 1 },
    ]);

    const later = new Date("2026-06-01T00:00:00Z");
    expect(pruneClicks(db, 90, later)).toBe(3);
    expect(getStats(db, "UTC", page.id, 7, later).total).toBe(3);
  });
});
