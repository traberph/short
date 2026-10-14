import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { AppEnv, Deps } from "../app.js";
import { HttpError } from "../lib/errors.js";
import { SESSION_COOKIE } from "./routes.js";
import { actorFromApiToken, actorFromSession } from "./sessions.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Guards the whole API: every request needs a bearer token or a session cookie.
// Cookie-authenticated writes must come from our own origin (CSRF protection).
export function requireActor({ db, config }: Deps) {
  const ownOrigin = new URL(config.baseUrl).origin;

  return createMiddleware<AppEnv>(async (c, next) => {
    const authorization = c.req.header("authorization");
    if (authorization) {
      const [scheme, token] = authorization.split(" ");
      const actor = scheme?.toLowerCase() === "bearer" && token ? actorFromApiToken(db, token) : null;
      if (!actor) throw new HttpError(401, "Invalid API token");
      c.set("actor", actor);
      return next();
    }

    const session = getCookie(c, SESSION_COOKIE);
    const actor = session ? actorFromSession(db, session) : null;
    if (!actor) throw new HttpError(401, "Not logged in");

    if (!SAFE_METHODS.has(c.req.method)) {
      const origin = c.req.header("origin");
      const site = c.req.header("sec-fetch-site");
      if (origin !== ownOrigin && site !== "same-origin") throw new HttpError(403, "Cross-site request blocked");
    }

    c.set("actor", actor);
    return next();
  });
}
