import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { desc, eq, and } from "drizzle-orm";
import type { z } from "zod";
import type { ApiToken, CreatedToken, Me } from "../shared/api-types.js";
import {
  createBlockSchema,
  createPaletteSchema,
  createPageSchema,
  createTokenSchema,
  pinSchema,
  reorderBlocksSchema,
  statsRangeSchema,
  updateBlockSchema,
  updatePageSchema,
} from "../shared/validation.js";
import type { AppEnv, Deps } from "./app.js";
import { requireActor } from "./auth/middleware.js";
import { createApiToken } from "./auth/sessions.js";
import { apiTokens } from "./db/schema.js";
import { forbidden, HttpError, notFound } from "./lib/errors.js";
import { removeMedia, saveAvatar } from "./lib/media.js";
import { deletePalette, listPalettes, savePalette } from "./lib/palettes.js";
import * as pages from "./lib/pages.js";
import { getStats, resetStats } from "./lib/stats.js";

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const issues: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    (issues[key] ??= []).push(issue.message);
  }
  throw new HttpError(400, "Invalid input", issues);
}

async function jsonBody(c: { req: { json(): Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
}

function idParam(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw notFound();
  return id;
}

function toApiToken(row: typeof apiTokens.$inferSelect): ApiToken {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  };
}

export function apiRoutes(deps: Deps) {
  const { db, config } = deps;

  return (
    new Hono<AppEnv>()
      .use(requireActor(deps))

      .get("/me", (c) => {
        const { username, isAdmin } = c.var.actor;
        return c.json({ username, isAdmin, logoDev: !!config.logoDevToken, logoDevToken: config.logoDevToken ?? null } satisfies Me);
      })

      // Pages (redirects and link pages)
      .get("/pages", (c) => c.json(pages.listPages(db, c.var.actor)))
      .post("/pages", async (c) => {
        const input = parse(createPageSchema, await jsonBody(c));
        return c.json(pages.createPage(db, c.var.actor, input), 201);
      })
      .get("/pages/:id", (c) => c.json(pages.getPageDetail(db, c.var.actor, idParam(c.req.param("id")))))
      .patch("/pages/:id", async (c) => {
        const input = parse(updatePageSchema, await jsonBody(c));
        return c.json(pages.updatePage(db, c.var.actor, idParam(c.req.param("id")), input));
      })
      .delete("/pages/:id", (c) => {
        const avatar = pages.deletePage(db, c.var.actor, idParam(c.req.param("id")));
        if (avatar) removeMedia(config.dataDir, avatar);
        return c.body(null, 204);
      })

      .put("/pages/:id/avatar", bodyLimit({ maxSize: 3 * 1024 * 1024 }), async (c) => {
        const id = idParam(c.req.param("id"));
        if (pages.getPageDetail(db, c.var.actor, id).kind !== "linkpage") {
          throw new HttpError(400, "Only link pages have an avatar");
        }
        const body = await c.req.parseBody();
        const file = body.file;
        if (!(file instanceof File)) throw new HttpError(400, "Expected an image in the 'file' field");
        const name = await saveAvatar(config.dataDir, file);
        const previous = pages.setAvatar(db, c.var.actor, id, name);
        if (previous) removeMedia(config.dataDir, previous);
        return c.json({ avatarUrl: pages.avatarUrl(name) });
      })
      .delete("/pages/:id/avatar", (c) => {
        const previous = pages.setAvatar(db, c.var.actor, idParam(c.req.param("id")), null);
        if (previous) removeMedia(config.dataDir, previous);
        return c.body(null, 204);
      })

      // Blocks on link pages
      .post("/pages/:id/blocks", async (c) => {
        const input = parse(createBlockSchema, await jsonBody(c));
        return c.json(pages.addBlock(db, c.var.actor, idParam(c.req.param("id")), input), 201);
      })
      .put("/pages/:id/blocks/order", async (c) => {
        const { ids } = parse(reorderBlocksSchema, await jsonBody(c));
        return c.json(pages.reorderBlocks(db, c.var.actor, idParam(c.req.param("id")), ids));
      })
      .patch("/blocks/:id", async (c) => {
        const input = parse(updateBlockSchema, await jsonBody(c));
        return c.json(pages.updateBlock(db, c.var.actor, idParam(c.req.param("id")), input));
      })
      .delete("/blocks/:id", (c) => c.json(pages.deleteBlock(db, c.var.actor, idParam(c.req.param("id")))))

      // Stats
      .get("/pages/:id/stats", (c) => {
        const id = idParam(c.req.param("id"));
        pages.assertCanManage(db, c.var.actor, id);
        const { days } = parse(statsRangeSchema, c.req.query());
        return c.json(getStats(db, config.timezone, id, days));
      })
      .delete("/pages/:id/stats", (c) => {
        const id = idParam(c.req.param("id"));
        pages.assertCanManage(db, c.var.actor, id);
        resetStats(db, id);
        return c.body(null, 204);
      })

      // Saved color palettes (always the caller's own)
      .get("/palettes", (c) => c.json(listPalettes(db, c.var.actor.id)))
      .post("/palettes", async (c) => {
        const { colors } = parse(createPaletteSchema, await jsonBody(c));
        const { palette, created } = savePalette(db, c.var.actor.id, colors);
        return c.json(palette, created ? 201 : 200);
      })
      .delete("/palettes/:id", (c) => {
        deletePalette(db, c.var.actor.id, idParam(c.req.param("id")));
        return c.body(null, 204);
      })

      // Personal access tokens (always the caller's own)
      .get("/tokens", (c) => {
        const rows = db
          .select()
          .from(apiTokens)
          .where(eq(apiTokens.userId, c.var.actor.id))
          .orderBy(desc(apiTokens.createdAt))
          .all();
        return c.json(rows.map(toApiToken));
      })
      .post("/tokens", async (c) => {
        const { name } = parse(createTokenSchema, await jsonBody(c));
        const { row, token } = createApiToken(db, c.var.actor.id, name);
        return c.json({ ...toApiToken(row), token } satisfies CreatedToken, 201);
      })
      .delete("/tokens/:id", (c) => {
        const id = idParam(c.req.param("id"));
        const { changes } = db
          .delete(apiTokens)
          .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, c.var.actor.id)))
          .run();
        if (!changes) throw notFound();
        return c.body(null, 204);
      })

      // Admin only
      .put("/pin", async (c) => {
        const { pageId } = parse(pinSchema, await jsonBody(c));
        pages.pinPage(db, c.var.actor, pageId);
        return c.body(null, 204);
      })
      .delete("/pin", (c) => {
        pages.pinPage(db, c.var.actor, null);
        return c.body(null, 204);
      })
      .get("/users", (c) => {
        if (!c.var.actor.isAdmin) throw forbidden();
        return c.json(pages.listUsernames(db));
      })
      .get("/conflicts", (c) => {
        if (!c.var.actor.isAdmin) throw forbidden();
        return c.json(pages.listConflicts(db));
      })
  );
}
