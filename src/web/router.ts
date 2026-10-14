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
  | { name: "detail"; kind: PageKind; id: number; tab: string | undefined }
  | { name: "tokens" }
  | { name: "admin" }
  | { name: "notFound" };

const KIND_SEGMENT: Record<string, PageKind> = { links: "redirect", pages: "linkpage" };

export function listPath(kind: PageKind): string {
  return kind === "redirect" ? "/~/links" : "/~/pages";
}

export function detailPath(page: { id: number; kind: PageKind }, tab?: string): string {
  return `${listPath(page.kind)}/${page.id}${tab ? `/${tab}` : ""}`;
}

export function parseRoute(path: string): Route {
  const p = path.replace(/\/+$/, "") || "/~";
  if (p === "/~") return { name: "overview" };
  if (p === "/~/tokens") return { name: "tokens" };
  if (p === "/~/admin") return { name: "admin" };
  const m = p.match(/^\/~\/(links|pages)(?:\/(\d+)(?:\/([a-z]+))?)?$/);
  if (m) {
    const kind = KIND_SEGMENT[m[1]!]!;
    if (!m[2]) return { name: "list", kind };
    return { name: "detail", kind, id: Number(m[2]), tab: m[3] };
  }
  return { name: "notFound" };
}
