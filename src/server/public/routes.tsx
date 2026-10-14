import { Hono, type Context } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import { eq } from "drizzle-orm";
import type { AppEnv, Deps } from "../app.js";
import { pages as pagesTable } from "../db/schema.js";
import { avatarUrl, findByPath, getBlocks, getPinnedPageId, pagePath } from "../lib/pages.js";
import { recordClick } from "../lib/stats.js";
import { DEFAULT_THEME, type Theme } from "../../shared/validation.js";
import { LinkPage, MessagePage } from "./views.js";

export function publicRoutes({ db, config }: Deps) {
  const clientIp = (c: Context<AppEnv>): string => {
    if (config.trustProxy) {
      const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
      if (forwarded) return forwarded;
    }
    try {
      return getConnInfo(c).remote.address ?? "unknown";
    } catch {
      return "unknown";
    }
  };

  // Stats are written after the response has been handed off, so they never delay the visitor.
  const track = (c: Context<AppEnv>, pageId: number) => {
    const ip = clientIp(c);
    const userAgent = c.req.header("user-agent") ?? "unknown";
    setImmediate(() => {
      try {
        recordClick(db, config.timezone, pageId, ip, userAgent);
      } catch (err) {
        console.error("Failed to record click", err);
      }
    });
  };

  const notFoundPage = (c: Context<AppEnv>) =>
    c.html(<MessagePage title="Not found" message="This link doesn't exist." />, 404);

  const serve = (c: Context<AppEnv>, namespace: string, code: string) => {
    const page = findByPath(db, namespace, code);
    if (!page) return notFoundPage(c);
    // The dashboard preview shouldn't inflate the stats.
    if (c.req.query("preview") === undefined) track(c, page.id);
    c.header("Cache-Control", "private, no-store");

    if (page.kind === "redirect" && page.dest) return c.redirect(page.dest, 302);

    return c.html(
      <LinkPage
        title={page.title ?? page.code}
        avatarUrl={avatarUrl(page.avatar)}
        theme={(page.theme as Theme | null) ?? DEFAULT_THEME}
        blocks={getBlocks(db, page.id)}
        // Logos and their attribution only appear when the page owner enabled them.
        logoDevToken={page.showLogos ? config.logoDevToken : undefined}
        showAttribution={!config.disableAttribution}
      />,
    );
  };

  return new Hono<AppEnv>()
    .get("/", (c) => {
      const pinnedId = getPinnedPageId(db);
      const pinned = pinnedId ? db.select().from(pagesTable).where(eq(pagesTable.id, pinnedId)).get() : undefined;
      if (pinned) return c.redirect(pagePath(pinned), 302);
      return c.html(
        <MessagePage
          title="short"
          message="Nothing is pinned to this page yet."
          link={{ href: "/~/", label: "Open the dashboard" }}
        />,
      );
    })
    .get("/:code", (c) => serve(c, "", c.req.param("code")))
    .get("/:namespace/:code", (c) => serve(c, c.req.param("namespace"), c.req.param("code")));
}
