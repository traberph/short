import { and, desc, eq, sql } from "drizzle-orm";
import type { SavedPalette } from "../../shared/api-types.js";
import { MAX_PALETTES } from "../../shared/validation.js";
import type { Db } from "../db/index.js";
import { palettes } from "../db/schema.js";
import { HttpError, notFound } from "./errors.js";

type PaletteRow = typeof palettes.$inferSelect;

function toApi(row: PaletteRow): SavedPalette {
  return {
    id: row.id,
    colors: row.colors.split("-").map((c) => `#${c}`),
    createdAt: row.createdAt.toISOString(),
  };
}

export function listPalettes(db: Db, userId: number): SavedPalette[] {
  return db.select().from(palettes).where(eq(palettes.userId, userId)).orderBy(desc(palettes.id)).all().map(toApi);
}

// Saving the same palette twice returns the existing entry instead of a duplicate.
export function savePalette(db: Db, userId: number, colors: string[]): { palette: SavedPalette; created: boolean } {
  const key = colors.map((c) => c.slice(1).toLowerCase()).join("-");
  const existing = db
    .select()
    .from(palettes)
    .where(and(eq(palettes.userId, userId), eq(palettes.colors, key)))
    .get();
  if (existing) return { palette: toApi(existing), created: false };

  const count = db
    .select({ n: sql<number>`count(*)` })
    .from(palettes)
    .where(eq(palettes.userId, userId))
    .get();
  if ((count?.n ?? 0) >= MAX_PALETTES) {
    throw new HttpError(409, `You can save up to ${MAX_PALETTES} palettes. Remove one first.`);
  }
  const row = db.insert(palettes).values({ userId, colors: key }).returning().get();
  return { palette: toApi(row), created: true };
}

export function deletePalette(db: Db, userId: number, id: number): void {
  const { changes } = db
    .delete(palettes)
    .where(and(eq(palettes.id, id), eq(palettes.userId, userId)))
    .run();
  if (!changes) throw notFound();
}
