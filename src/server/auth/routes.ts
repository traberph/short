import { Hono } from "hono";
import { deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import type { AppEnv, Deps } from "../app.js";
import { calculatePKCECodeChallenge, randomPKCECodeVerifier, randomState } from "./oidc.js";
import { createSession, deleteSession, SESSION_TTL_MS, upsertUser } from "./sessions.js";

export const SESSION_COOKIE = "short_session";
const LOGIN_COOKIE = "short_login";

export function authRoutes({ db, config, oidc }: Deps) {
  const secure = config.baseUrl.startsWith("https://");
  const redirectUri = `${config.baseUrl}/~/auth/callback`;

  return new Hono<AppEnv>()
    .get("/login", async (c) => {
      const state = randomState();
      const codeVerifier = randomPKCECodeVerifier();
      const url = await oidc.authorizationUrl({
        state,
        codeChallenge: await calculatePKCECodeChallenge(codeVerifier),
        redirectUri,
      });
      await setSignedCookie(c, LOGIN_COOKIE, JSON.stringify({ state, codeVerifier }), config.sessionSecret, {
        path: "/~/auth",
        httpOnly: true,
        secure,
        sameSite: "Lax",
        maxAge: 600,
      });
      return c.redirect(url.href);
    })
    .get("/callback", async (c) => {
      const raw = await getSignedCookie(c, config.sessionSecret, LOGIN_COOKIE);
      deleteCookie(c, LOGIN_COOKIE, { path: "/~/auth" });
      if (!raw) return c.redirect("/~/auth/login");
      const { state, codeVerifier } = JSON.parse(raw) as { state: string; codeVerifier: string };

      // Behind a reverse proxy the request URL may be internal, so rebuild it from BASE_URL.
      const requestUrl = new URL(c.req.url);
      const currentUrl = new URL(`${redirectUri}${requestUrl.search}`);
      const claims = await oidc.exchange({ currentUrl, state, codeVerifier });
      const actor = upsertUser(db, claims, config.adminGroup);

      setCookie(c, SESSION_COOKIE, createSession(db, actor.id), {
        path: "/",
        httpOnly: true,
        secure,
        sameSite: "Lax",
        maxAge: SESSION_TTL_MS / 1000,
      });
      return c.redirect("/~/");
    })
    .post("/logout", (c) => {
      const token = getCookie(c, SESSION_COOKIE);
      if (token) deleteSession(db, token);
      deleteCookie(c, SESSION_COOKIE, { path: "/" });
      return c.body(null, 204);
    });
}
