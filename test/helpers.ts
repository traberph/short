import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createApp } from "../src/server/app.js";
import type { OidcClaims, OidcProvider } from "../src/server/auth/oidc.js";
import { createApiToken, createSession, upsertUser } from "../src/server/auth/sessions.js";
import type { Config } from "../src/server/config.js";
import { openDb } from "../src/server/db/index.js";

export const BASE_URL = "https://short.test";

export function setup(overrides: Partial<Config> = {}) {
  const config: Config = {
    baseUrl: BASE_URL,
    oidc: { issuer: "https://auth.test/", clientId: "id", clientSecret: "secret" },
    adminGroup: "short-admins",
    sessionSecret: "x".repeat(32),
    dataDir: mkdtempSync(path.join(tmpdir(), "short-test-")),
    timezone: "Europe/Berlin",
    trustProxy: true,
    logoDevToken: undefined,
    disableAttribution: false,
    retentionDays: 90,
    port: 0,
    ...overrides,
  };
  const db = openDb(":memory:");

  // The fake provider returns whatever claims the test queued for the next login.
  let nextClaims: OidcClaims = { sub: "sub-x", username: "x", groups: [] };
  const oidc: OidcProvider = {
    authorizationUrl: async ({ state }) => new URL(`https://auth.test/authorize?state=${state}`),
    exchange: async () => nextClaims,
  };

  const app = createApp({ db, config, oidc });

  const user = (username: string, isAdmin = false) => {
    const actor = upsertUser(db, { sub: `sub-${username}`, username, groups: isAdmin ? ["short-admins"] : [] }, "short-admins");
    const token = createApiToken(db, actor.id, "test").token;
    const session = createSession(db, actor.id);
    const api = (method: string, url: string, body?: unknown) =>
      app.request(`/~/api${url}`, {
        method,
        headers: { authorization: `Bearer ${token}`, ...(body !== undefined && { "content-type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    return { actor, token, session, api };
  };

  return {
    app,
    db,
    config,
    user,
    setNextLogin: (claims: OidcClaims) => {
      nextClaims = claims;
    },
  };
}

// Lets setImmediate callbacks (click tracking) run.
export const flush = () => new Promise((resolve) => setImmediate(resolve));
