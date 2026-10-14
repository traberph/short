import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Block, Conflict, PageDetail, PageSummary } from "../../shared/api-types.js";
import {
  DEFAULT_THEME,
  RESERVED_CODES,
  type CreateBlockInput,
  type CreatePageInput,
  type Theme,
  type UpdatePageInput,
} from "../../shared/validation.js";
import type { Db } from "../db/index.js";
import { blocks, dailyStats, pages, settings, users } from "../db/schema.js";
import { randomCode } from "./crypto.js";
import { forbidden, HttpError, notFound } from "./errors.js";
import { canLinkTo, canManagePage, canWriteNamespace, type Actor } from "./permissions.js";

type PageRow = typeof pages.$inferSelect;

const PINNED_KEY = "pinned_page_id";

export function pagePath(page: { namespace: string; code: string }): string {
  return page.namespace ? `/${page.namespace}/${page.code}` : `/${page.code}`;
}

export function avatarUrl(avatar: string | null): string | null {
  return avatar ? `/~/media/${avatar}` : null;
}

export function getPinnedPageId(db: Db): number | null {
  const row = db.select().from(settings).where(eq(settings.key, PINNED_KEY)).get();
  return row ? Number(row.value) : null;
}

export function findByPath(db: Db, namespace: string, code: string): PageRow | undefined {
  return db
    .select()
    .from(pages)
    .where(and(eq(pages.namespace, namespace), eq(pages.code, code)))
    .get();
}

function isUsername(db: Db, name: string): boolean {
  return !!db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${name})`)
    .get();
}

function codeTaken(db: Db, namespace: string, code: string): boolean {
  if (findByPath(db, namespace, code)) return true;
  return namespace === "" && (RESERVED_CODES.has(code.toLowerCase()) || isUsername(db, code));
}

function resolveNamespace(db: Db, actor: Actor, requested: string | undefined): string {
  const namespace = requested ?? actor.username;
  if (!canWriteNamespace(actor, namespace)) throw forbidden();
  if (namespace !== "" && !db.select().from(users).where(eq(users.username, namespace)).get()) {
    throw new HttpError(400, "Unknown namespace", { namespace: ["No user with this name"] });
  }
  return namespace;
}

function loadManagedPage(db: Db, actor: Actor, id: number): PageRow {
  const page = db.select().from(pages).where(eq(pages.id, id)).get();
  // Pages outside the actor's reach are reported as missing, so ids can't be probed.
  if (!page || !canManagePage(actor, page)) throw notFound();
  return page;
}

export function createPage(db: Db, actor: Actor, input: CreatePageInput): PageSummary {
  const namespace = resolveNamespace(db, actor, input.namespace);

  let code = input.code;
  if (code) {
    if (codeTaken(db, namespace, code)) {
      throw new HttpError(409, "Shortcode is not available", { code: ["Already in use or reserved"] });
    }
  } else {
    for (let attempt = 0; attempt < 20 && !code; attempt++) {
      const candidate = randomCode();
      if (!codeTaken(db, namespace, candidate)) code = candidate;
    }
    if (!code) throw new HttpError(409, "Could not generate a free shortcode");
  }

  const row = db
    .insert(pages)
    .values({
      namespace,
      code,
      kind: input.kind,
      dest: input.kind === "redirect" ? input.dest : null,
      title: input.kind === "linkpage" ? input.title : null,
      theme: input.kind === "linkpage" ? DEFAULT_THEME : null,
      createdBy: actor.id,
    })
    .returning()
    .get();
  return toSummary(row, 0, false);
}

export function updatePage(db: Db, actor: Actor, id: number, input: UpdatePageInput): PageDetail {
  const page = loadManagedPage(db, actor, id);
  if (input.dest !== undefined && page.kind !== "redirect") throw new HttpError(400, "Only redirects have a destination");
  if ((input.title !== undefined || input.theme !== undefined) && page.kind !== "linkpage") {
    throw new HttpError(400, "Only link pages have a title and theme");
  }
  db.update(pages)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(pages.id, id))
    .run();
  return getPageDetail(db, actor, id);
}

export function setAvatar(db: Db, actor: Actor, id: number, avatar: string | null): string | null {
  const page = loadManagedPage(db, actor, id);
  if (page.kind !== "linkpage") throw new HttpError(400, "Only link pages have an avatar");
  db.update(pages).set({ avatar, updatedAt: new Date() }).where(eq(pages.id, id)).run();
  return page.avatar;
}

// Returns the removed page's avatar file, if any, so the caller can delete it from disk.
export function deletePage(db: Db, actor: Actor, id: number): string | null {
  const page = loadManagedPage(db, actor, id);
  db.transaction((tx) => {
    // Blocks, clicks and stats go with the page via ON DELETE CASCADE.
    tx.delete(pages).where(eq(pages.id, id)).run();
    tx.delete(settings)
      .where(and(eq(settings.key, PINNED_KEY), eq(settings.value, String(id))))
      .run();
  });
  return page.avatar;
}

function totalClicks(db: Db, pageIds: number[]): Map<number, number> {
  if (pageIds.length === 0) return new Map();
  const rows = db
    .select({ pageId: dailyStats.pageId, total: sql<number>`sum(${dailyStats.clicks})` })
    .from(dailyStats)
    .where(inArray(dailyStats.pageId, pageIds))
    .groupBy(dailyStats.pageId)
    .all();
  return new Map(rows.map((r) => [r.pageId, r.total]));
}

function toSummary(row: PageRow, clicks: number, pinned: boolean): PageSummary {
  return {
    id: row.id,
    namespace: row.namespace,
    code: row.code,
    path: pagePath(row),
    kind: row.kind,
    dest: row.dest,
    title: row.title,
    totalClicks: clicks,
    pinned,
  };
}

export function listPages(db: Db, actor: Actor): PageSummary[] {
  const query = db.select().from(pages);
  const rows = (actor.isAdmin ? query : query.where(eq(pages.namespace, actor.username)))
    .orderBy(asc(pages.namespace), asc(pages.code))
    .all();
  const counts = totalClicks(
    db,
    rows.map((r) => r.id),
  );
  const pinned = getPinnedPageId(db);
  return rows.map((r) => toSummary(r, counts.get(r.id) ?? 0, r.id === pinned));
}

export function getBlocks(db: Db, pageId: number): Block[] {
  const rows = db.select().from(blocks).where(eq(blocks.pageId, pageId)).orderBy(asc(blocks.position)).all();
  const targetIds = rows.flatMap((b) => (b.targetId ? [b.targetId] : []));
  const targets = targetIds.length
    ? new Map(
        db
          .select()
          .from(pages)
          .where(inArray(pages.id, targetIds))
          .all()
          .map((t) => [t.id, t]),
      )
    : new Map<number, PageRow>();

  return rows.map((b) => {
    const target = b.targetId ? targets.get(b.targetId) : undefined;
    return {
      id: b.id,
      position: b.position,
      kind: b.kind,
      label: b.label,
      markdown: b.markdown,
      target: target ? { id: target.id, path: pagePath(target), dest: target.dest } : null,
    };
  });
}

export function getPageDetail(db: Db, actor: Actor, id: number): PageDetail {
  const page = loadManagedPage(db, actor, id);
  const clicks = totalClicks(db, [id]).get(id) ?? 0;
  return {
    ...toSummary(page, clicks, getPinnedPageId(db) === id),
    theme: (page.theme as Theme | null) ?? DEFAULT_THEME,
    avatarUrl: avatarUrl(page.avatar),
    blocks: page.kind === "linkpage" ? getBlocks(db, id) : [],
  };
}

export function assertCanManage(db: Db, actor: Actor, id: number): void {
  loadManagedPage(db, actor, id);
}

function loadLinkPage(db: Db, actor: Actor, id: number): PageRow {
  const page = loadManagedPage(db, actor, id);
  if (page.kind !== "linkpage") throw new HttpError(400, "Blocks can only be added to link pages");
  return page;
}

export function addBlock(db: Db, actor: Actor, pageId: number, input: CreateBlockInput): Block[] {
  const page = loadLinkPage(db, actor, pageId);
  let targetId: number | null = null;
  if (input.kind === "link") {
    const target = db.select().from(pages).where(eq(pages.id, input.targetId)).get();
    if (!target || !canLinkTo(actor, page, target)) {
      throw new HttpError(400, "Invalid link target", { targetId: ["Pick one of your redirect links"] });
    }
    targetId = target.id;
  }
  const max = db
    .select({ max: sql<number | null>`max(${blocks.position})` })
    .from(blocks)
    .where(eq(blocks.pageId, pageId))
    .get();
  db.insert(blocks)
    .values({
      pageId,
      position: (max?.max ?? -1) + 1,
      kind: input.kind,
      label: input.kind === "link" ? input.label : null,
      markdown: input.kind === "text" ? input.markdown : null,
      targetId,
    })
    .run();
  return getBlocks(db, pageId);
}

function loadManagedBlock(db: Db, actor: Actor, blockId: number) {
  const block = db.select().from(blocks).where(eq(blocks.id, blockId)).get();
  if (!block) throw notFound();
  loadManagedPage(db, actor, block.pageId);
  return block;
}

export function updateBlock(
  db: Db,
  actor: Actor,
  blockId: number,
  input: { label?: string; markdown?: string },
): Block[] {
  const block = loadManagedBlock(db, actor, blockId);
  if (block.kind === "link" && input.markdown !== undefined) throw new HttpError(400, "Link blocks have no text");
  if (block.kind === "text" && input.label !== undefined) throw new HttpError(400, "Text blocks have no label");
  db.update(blocks).set(input).where(eq(blocks.id, blockId)).run();
  return getBlocks(db, block.pageId);
}

export function deleteBlock(db: Db, actor: Actor, blockId: number): Block[] {
  const block = loadManagedBlock(db, actor, blockId);
  db.delete(blocks).where(eq(blocks.id, blockId)).run();
  return getBlocks(db, block.pageId);
}

export function reorderBlocks(db: Db, actor: Actor, pageId: number, ids: number[]): Block[] {
  loadLinkPage(db, actor, pageId);
  const current = db.select({ id: blocks.id }).from(blocks).where(eq(blocks.pageId, pageId)).all();
  const currentIds = new Set(current.map((b) => b.id));
  if (ids.length !== currentIds.size || new Set(ids).size !== ids.length || !ids.every((id) => currentIds.has(id))) {
    throw new HttpError(400, "ids must list every block of the page exactly once");
  }
  db.transaction((tx) => {
    ids.forEach((id, position) => tx.update(blocks).set({ position }).where(eq(blocks.id, id)).run());
  });
  return getBlocks(db, pageId);
}

export function pinPage(db: Db, actor: Actor, pageId: number | null): void {
  if (!actor.isAdmin) throw forbidden();
  if (pageId === null) {
    db.delete(settings).where(eq(settings.key, PINNED_KEY)).run();
    return;
  }
  if (!db.select().from(pages).where(eq(pages.id, pageId)).get()) throw notFound();
  db.insert(settings)
    .values({ key: PINNED_KEY, value: String(pageId) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(pageId) } })
    .run();
}

// Users whose name is also used as a root code (possible when the user logs in after the code was created).
export function listConflicts(db: Db): Conflict[] {
  return db
    .select({ username: users.username, pageId: pages.id })
    .from(users)
    .innerJoin(pages, and(eq(pages.namespace, ""), sql`lower(${pages.code}) = lower(${users.username})`))
    .all();
}

export function listUsernames(db: Db): string[] {
  return db
    .select({ username: users.username })
    .from(users)
    .orderBy(asc(users.username))
    .all()
    .map((u) => u.username);
}
