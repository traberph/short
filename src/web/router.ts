import { useSyncExternalStore, type MouseEvent } from "react";
import type { PageKind } from "../shared/api-types.js";

// A tiny history-based router; the app only has a handful of screens under /~/.
const listeners = new Set<() => void>();

export function navigate(to: string) {
  history.pushState(null, "", to);
  window.scrollTo({ top: 0 });
  listeners.forEach((l) => l());
}

window.addEventListener("popstate", () => listeners.forEach((l) => l()));

export function usePath(): string {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => location.pathname,
  );
}

export function linkHandler(to: string) {
  return (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
}

export type Route =
  | { name: "overview" }
  | { name: "list"; kind: PageKind }
  /** `owner` is set when an admin opens another user's page via Administration. */
  | { name: "detail"; kind: PageKind; id: number; tab: string | undefined; owner?: string }
  | { name: "tokens" }
  | { name: "admin" }
  | { name: "adminUser"; username: string }
  | { name: "notFound" };

const KIND_SEGMENT: Record<string, PageKind> = { links: "redirect", pages: "linkpage" };

// The signed-in user. Pages of other users are addressed through Administration,
// so the admin's own and root content stays separate from managing everyone else's.
let viewer: string | null = null;
export function setViewer(username: string) {
  viewer = username;
}

const isOtherUsers = (namespace: string | undefined) => namespace !== undefined && namespace !== "" && namespace !== viewer;

export function listPath(kind: PageKind): string {
  return kind === "redirect" ? "/~/links" : "/~/pages";
}

export function adminUserPath(username: string): string {
  return `/~/admin/users/${encodeURIComponent(username)}`;
}

export function detailPath(page: { id: number; kind: PageKind; namespace?: string }, tab?: string): string {
  const segment = page.kind === "redirect" ? "links" : "pages";
  const base = isOtherUsers(page.namespace) ? `${adminUserPath(page.namespace!)}/${segment}` : `/~/${segment}`;
  return `${base}/${page.id}${tab ? `/${tab}` : ""}`;
}

// Where "back" leads from a page: its owner's admin view for other users' pages, otherwise the list.
export function backPath(page: { kind: PageKind; namespace: string }): string {
  return isOtherUsers(page.namespace) ? adminUserPath(page.namespace) : listPath(page.kind);
}

// Replaces the current URL (no new history entry), e.g. to correct a link to the canonical address.
export function replacePath(to: string) {
  history.replaceState(null, "", to);
  listeners.forEach((l) => l());
}

export function parseRoute(path: string): Route {
  const p = path.replace(/\/+$/, "") || "/~";
  if (p === "/~") return { name: "overview" };
  if (p === "/~/tokens") return { name: "tokens" };
  if (p === "/~/admin") return { name: "admin" };

  const user = p.match(/^\/~\/admin\/users\/([^/]+)(?:\/(links|pages)\/(\d+)(?:\/([a-z]+))?)?$/);
  if (user) {
    const username = decodeURIComponent(user[1]!);
    if (!user[2]) return { name: "adminUser", username };
    return { name: "detail", kind: KIND_SEGMENT[user[2]]!, id: Number(user[3]), tab: user[4], owner: username };
  }

  const m = p.match(/^\/~\/(links|pages)(?:\/(\d+)(?:\/([a-z]+))?)?$/);
  if (m) {
    const kind = KIND_SEGMENT[m[1]!]!;
    if (!m[2]) return { name: "list", kind };
    return { name: "detail", kind, id: Number(m[2]), tab: m[3] };
  }
  return { name: "notFound" };
}
