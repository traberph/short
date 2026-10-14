import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { secureHeaders } from "hono/secure-headers";
import { sql } from "drizzle-orm";
import { apiRoutes } from "./api.js";
import { authRoutes } from "./auth/routes.js";
import type { OidcProvider } from "./auth/oidc.js";
import type { Config } from "./config.js";
import type { Db } from "./db/index.js";
import { HttpError } from "./lib/errors.js";
import { readMedia } from "./lib/media.js";
import type { Actor } from "./lib/permissions.js";
import { publicRoutes } from "./public/routes.js";
import { MessagePage } from "./public/views.js";

export interface Deps {
  db: Db;
  config: Config;
  oidc: OidcProvider;
  /** Directory with the built admin UI; the UI isn't served when missing (e.g. in dev, Vite serves it). */
  webDir?: string;
}

export type AppEnv = { Variables: { actor: Actor } };

export function createApp(deps: Deps) {
  const { db, config } = deps;
  const app = new Hono<AppEnv>();

  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https://img.logo.dev"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        // The admin UI previews link pages in an iframe.
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
      },
      referrerPolicy: "strict-origin-when-cross-origin",
    }),
  );

  app.onError((err, c) => {
    const isApi = c.req.path.startsWith("/~/api/");
    // Two requests claiming the same unique value at once (e.g. a shortcode): the database rejects the second.
    if ((err as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      err = new HttpError(409, "This already exists. Please try again with a different value.");
    }
    if (err instanceof HttpError) {
      if (isApi) return c.json({ error: err.message, issues: err.issues }, err.status);
      return c.html(<MessagePage title="Something went wrong" message={err.message} link={{ href: "/~/", label: "Back" }} />, err.status);
    }
    console.error(err);
    if (isApi) return c.json({ error: "Internal server error" }, 500);
    return c.html(<MessagePage title="Something went wrong" message="Please try again later." />, 500);
  });

  app.get("/~/health", (c) => {
    db.run(sql`select 1`);
    return c.json({ ok: true });
  });

  app.route("/~/auth", authRoutes(deps));
  app.route("/~/api", apiRoutes(deps));
  app.all("/~/api/*", (c) => c.json({ error: "Not found" }, 404));

  app.get("/~/media/:file", (c) => {
    const media = readMedia(config.dataDir, c.req.param("file"));
    if (!media) return c.notFound();
    return c.body(new Uint8Array(media.bytes), 200, {
      "Content-Type": media.type,
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  });

  // Admin UI (single-page app). Hashed assets are cached forever, index.html never.
  const webDir = deps.webDir;
  if (webDir && existsSync(path.join(webDir, "index.html"))) {
    const indexHtml = readFileSync(path.join(webDir, "index.html"), "utf8");
    const files = serveStatic({ root: path.relative(process.cwd(), webDir), rewriteRequestPath: (p) => p.replace(/^\/~/, "") });
    app.use("/~/*", async (c, next) => {
      // index.html always goes through the SPA fallback below.
      if (c.req.path.endsWith("/") || c.req.path.endsWith("/index.html")) return next();
      const res = await files(c, next);
      if (res && c.req.path.startsWith("/~/assets/")) res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return res;
    });
    app.get("/~/*", (c) => {
      c.header("Cache-Control", "no-cache");
      return c.html(indexHtml);
    });
  }
  app.get("/~", (c) => c.redirect("/~/"));

  app.route("/", publicRoutes(deps));
  app.notFound((c) => c.html(<MessagePage title="Not found" message="This link doesn't exist." />, 404));

  return app;
}
