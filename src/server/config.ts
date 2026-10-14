import path from "node:path";

export interface Config {
  baseUrl: string;
  oidc: { issuer: string; clientId: string; clientSecret: string };
  adminGroup: string;
  sessionSecret: string;
  dataDir: string;
  timezone: string;
  trustProxy: boolean;
  logoDevToken: string | undefined;
  disableAttribution: boolean;
  retentionDays: number;
  port: number;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const timezone = env.TIMEZONE || "UTC";
  // Throws a RangeError early for unknown timezones.
  new Intl.DateTimeFormat("en-CA", { timeZone: timezone });

  const sessionSecret = required(env, "SESSION_SECRET");
  if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");

  return {
    baseUrl: required(env, "BASE_URL").replace(/\/+$/, ""),
    oidc: {
      issuer: required(env, "OIDC_ISSUER"),
      clientId: required(env, "OIDC_CLIENT_ID"),
      clientSecret: required(env, "OIDC_CLIENT_SECRET"),
    },
    adminGroup: env.ADMIN_GROUP || "short-admins",
    sessionSecret,
    dataDir: path.resolve(env.DATA_DIR || "./data"),
    timezone,
    trustProxy: env.TRUST_PROXY === "true",
    logoDevToken: env.LOGO_DEV_TOKEN || undefined,
    disableAttribution: env.DISABLE_ATTRIBUTION === "true",
    retentionDays: 90,
    port: Number(env.PORT || 3000),
  };
}
