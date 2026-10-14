import { and, eq, gt, lt } from "drizzle-orm";
import type { Db } from "../db/index.js";
import { apiTokens, sessions, users } from "../db/schema.js";
import { HttpError } from "../lib/errors.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { isValidUsername } from "../../shared/validation.js";
import type { Actor } from "../lib/permissions.js";
import type { OidcClaims } from "./oidc.js";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_PREFIX = "short_";

// Creates or updates the user for an OIDC login. The username is fixed at first login;
// only the admin flag follows the Authentik groups.
export function upsertUser(db: Db, claims: OidcClaims, adminGroup: string): Actor {
  const isAdmin = claims.groups.includes(adminGroup);
  const existing = db.select().from(users).where(eq(users.sub, claims.sub)).get();
  if (existing) {
    db.update(users).set({ isAdmin }).where(eq(users.id, existing.id)).run();
    return { id: existing.id, username: existing.username, isAdmin };
  }

  const username = claims.username;
  if (!username || !isValidUsername(username)) {
    throw new HttpError(403, "Your username can't be used in URLs. Ask an admin to change it in Authentik.");
  }
  if (db.select().from(users).where(eq(users.username, username)).get()) {
    throw new HttpError(409, "This username already belongs to another account.");
  }
  const row = db.insert(users).values({ sub: claims.sub, username, isAdmin }).returning().get();
  return { id: row.id, username: row.username, isAdmin: row.isAdmin };
}

export function createSession(db: Db, userId: number, now = new Date()): string {
  const token = randomToken();
  db.insert(sessions)
    .values({ id: sha256(token), userId, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) })
    .run();
  return token;
}

export function deleteSession(db: Db, token: string): void {
  db.delete(sessions).where(eq(sessions.id, sha256(token))).run();
}

export function actorFromSession(db: Db, token: string, now = new Date()): Actor | null {
  const row = db
    .select({ id: users.id, username: users.username, isAdmin: users.isAdmin })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, now)))
    .get();
  return row ?? null;
}

export function actorFromApiToken(db: Db, token: string, now = new Date()): Actor | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const row = db
    .select({ tokenId: apiTokens.id, id: users.id, username: users.username, isAdmin: users.isAdmin })
    .from(apiTokens)
    .innerJoin(users, eq(users.id, apiTokens.userId))
    .where(eq(apiTokens.tokenHash, sha256(token)))
    .get();
  if (!row) return null;
  db.update(apiTokens).set({ lastUsedAt: now }).where(eq(apiTokens.id, row.tokenId)).run();
  return { id: row.id, username: row.username, isAdmin: row.isAdmin };
}

export function createApiToken(db: Db, userId: number, name: string) {
  const token = TOKEN_PREFIX + randomToken();
  const row = db.insert(apiTokens).values({ userId, name, tokenHash: sha256(token) }).returning().get();
  return { row, token };
}

export function pruneSessions(db: Db, now = new Date()): number {
  return db.delete(sessions).where(lt(sessions.expiresAt, now)).run().changes;
}

// Ends all sessions and deletes all API tokens of a user, e.g. when they leave.
// They can sign in again only if Authentik still lets them.
export function revokeAccess(db: Db, username: string): { sessions: number; tokens: number } | null {
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user) return null;
  return db.transaction((tx) => ({
    sessions: tx.delete(sessions).where(eq(sessions.userId, user.id)).run().changes,
    tokens: tx.delete(apiTokens).where(eq(apiTokens.userId, user.id)).run().changes,
  }));
}
