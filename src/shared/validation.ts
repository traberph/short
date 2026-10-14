import { z } from "zod";

// Shortcodes: letters, digits, "-" and "_". Everything else in the URL space is reserved by construction
// (the admin UI and API live under "/~").
export const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

// Root codes that would be confusing or are kept free for future use.
export const RESERVED_CODES = new Set(["api", "auth", "assets", "static", "admin", "login", "logout", "health", "media"]);

// Authentik usernames used as namespaces must be URL-safe.
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username) && username !== "." && username !== "..";
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #112233");

export const themeSchema = z.object({
  background: hexColor,
  text: hexColor,
  button: hexColor,
  buttonText: hexColor,
});
export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = {
  background: "#111827",
  text: "#e5e7eb",
  button: "#475569",
  buttonText: "#ffffff",
};

const destSchema = z.string().trim().max(2048).refine(isHttpUrl, "Must be an http(s) URL");
const codeSchema = z.string().trim().regex(CODE_PATTERN, "Use 1–64 letters, digits, - or _");
const titleSchema = z.string().trim().min(1).max(100);

export const createPageSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("redirect"),
    // "" = root (admins only); omitted = the caller's own namespace
    namespace: z.string().optional(),
    code: codeSchema.optional(),
    dest: destSchema,
  }),
  z.object({
    kind: z.literal("linkpage"),
    namespace: z.string().optional(),
    code: codeSchema.optional(),
    title: titleSchema,
  }),
]);
export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageSchema = z.object({
  // Renaming breaks the old URL; the admin UI asks for confirmation first.
  code: codeSchema.optional(),
  dest: destSchema.optional(),
  title: titleSchema.optional(),
  theme: themeSchema.optional(),
  showLogos: z.boolean().optional(),
});
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

// A link button points at an existing short link (targetId) or creates a new one in the page's namespace (newLink).
export const createBlockSchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("link"),
      label: titleSchema,
      targetId: z.number().int().positive().optional(),
      newLink: z.object({ dest: destSchema, code: codeSchema.optional() }).optional(),
    }),
    z.object({ kind: z.literal("text"), markdown: z.string().max(5000) }),
  ])
  .refine((b) => b.kind !== "link" || (b.targetId === undefined) !== (b.newLink === undefined), {
    message: "Pick an existing link or create a new one",
    path: ["targetId"],
  });
export type CreateBlockInput = z.infer<typeof createBlockSchema>;

export const updateBlockSchema = z.object({
  label: titleSchema.optional(),
  markdown: z.string().max(5000).optional(),
});

export const reorderBlocksSchema = z.object({
  ids: z.array(z.number().int().positive()).max(500),
});

export const statsRangeSchema = z.object({
  days: z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).default(7),
});

export const pinSchema = z.object({ pageId: z.number().int().positive() });

export const createTokenSchema = z.object({ name: z.string().trim().min(1).max(100) });
