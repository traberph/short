// Response shapes of the JSON API, shared by server and admin UI.
import type { Theme } from "./validation.js";

export type PageKind = "redirect" | "linkpage";

export interface Me {
  username: string;
  isAdmin: boolean;
  /** Whether the server has a logo.dev token, i.e. link pages can show website logos. */
  logoDev: boolean;
}

export interface PageSummary {
  id: number;
  namespace: string;
  code: string;
  path: string;
  kind: PageKind;
  dest: string | null;
  title: string | null;
  totalClicks: number;
  pinned: boolean;
}

export interface Block {
  id: number;
  position: number;
  kind: "link" | "text";
  label: string | null;
  markdown: string | null;
  target: { id: number; path: string; dest: string | null } | null;
}

export interface PageDetail extends PageSummary {
  theme: Theme;
  showLogos: boolean;
  avatarUrl: string | null;
  blocks: Block[];
}

export interface StatsDay {
  day: string;
  clicks: number;
  uniques: number;
}

export interface PageStats {
  total: number;
  today: number;
  uniquesToday: number;
  lastVisit: string | null;
  series: StatsDay[];
}

export interface ApiToken {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreatedToken extends ApiToken {
  token: string;
}

export interface Conflict {
  username: string;
  pageId: number;
}

export interface ApiError {
  error: string;
  issues?: Record<string, string[]>;
}
