import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sub: text("sub").notNull().unique(),
  username: text("username").notNull().unique(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: createdAt(),
});

// Redirects and link pages share one table: both are addressed by (namespace, code).
// namespace "" is the root, otherwise it is the owner's username.
export const pages = sqliteTable(
  "pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    namespace: text("namespace").notNull(),
    code: text("code").notNull(),
    kind: text("kind", { enum: ["redirect", "linkpage"] }).notNull(),
    dest: text("dest"),
    title: text("title"),
    avatar: text("avatar"),
    theme: text("theme", { mode: "json" }),
    // Link pages only: show website logos from logo.dev (needs LOGO_DEV_TOKEN).
    showLogos: integer("show_logos", { mode: "boolean" }).notNull().default(true),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("pages_namespace_code").on(t.namespace, t.code)],
);

export const blocks = sqliteTable(
  "blocks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pageId: integer("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind", { enum: ["link", "text"] }).notNull(),
    label: text("label"),
    markdown: text("markdown"),
    targetId: integer("target_id").references(() => pages.id, { onDelete: "cascade" }),
  },
  (t) => [index("blocks_page").on(t.pageId, t.position), index("blocks_target").on(t.targetId)],
);

// Individual clicks, kept for the retention period only.
export const clicks = sqliteTable(
  "clicks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pageId: integer("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    at: integer("at", { mode: "timestamp" }).notNull(),
    day: text("day").notNull(),
    visitor: text("visitor").notNull(),
  },
  (t) => [index("clicks_page_day").on(t.pageId, t.day, t.visitor), index("clicks_at").on(t.at)],
);

// Daily totals, kept forever.
export const dailyStats = sqliteTable(
  "daily_stats",
  {
    pageId: integer("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    clicks: integer("clicks").notNull().default(0),
    uniques: integer("uniques").notNull().default(0),
    lastAt: integer("last_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.pageId, t.day] })],
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie value
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const apiTokens = sqliteTable("api_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: createdAt(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
