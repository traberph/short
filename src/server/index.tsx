import { mkdirSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createOidcProvider } from "./auth/oidc.js";
import { pruneSessions } from "./auth/sessions.js";
import { loadConfig } from "./config.js";
import { openDb } from "./db/index.js";
import { pruneClicks } from "./lib/stats.js";

const config = loadConfig();
mkdirSync(config.dataDir, { recursive: true });
const db = openDb(path.join(config.dataDir, "short.db"));

const app = createApp({
  db,
  config,
  oidc: createOidcProvider(config),
  webDir: path.resolve("dist/web"),
});

// Retention: drop individual clicks after the retention period and expired sessions, daily.
const housekeeping = () => {
  try {
    const clicks = pruneClicks(db, config.retentionDays);
    const sessions = pruneSessions(db);
    if (clicks || sessions) console.log(`Housekeeping: removed ${clicks} old clicks, ${sessions} expired sessions`);
  } catch (err) {
    console.error("Housekeeping failed", err);
  }
};
housekeeping();
setInterval(housekeeping, 24 * 60 * 60 * 1000).unref();

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`short listening on http://localhost:${info.port} (public URL ${config.baseUrl})`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close();
    process.exit(0);
  });
}
