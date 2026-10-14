import { useEffect } from "react";
import { ChartNoAxesColumn, ChevronRight, ExternalLink, LayoutList, Palette, Pin, QrCode, Settings } from "lucide-react";
import type { Me, PageDetail, PageKind } from "../../../shared/api-types.js";
import { useApi } from "../../api.js";
import { buttonClass } from "../../components/ui/button.js";
import { CopyButton, DomainIcon, Link, publicUrl, Tabs } from "../../components/ui/misc.js";
import { Badge, EmptyState, Skeleton } from "../../components/ui/surface.js";
import { backPath, detailPath, listPath, replacePath } from "../../router.js";
import { AnalyticsTab } from "./AnalyticsTab.js";
import { AppearanceTab } from "./AppearanceTab.js";
import { ContentTab } from "./ContentTab.js";
import { QrTab } from "./QrTab.js";
import { SettingsTab } from "./SettingsTab.js";

const TABS = {
  content: { label: "Content", icon: <LayoutList /> },
  appearance: { label: "Appearance", icon: <Palette /> },
  analytics: { label: "Analytics", icon: <ChartNoAxesColumn /> },
  qr: { label: "QR code", icon: <QrCode /> },
  settings: { label: "Settings", icon: <Settings /> },
} as const;
type TabId = keyof typeof TABS;

const TABS_BY_KIND: Record<PageKind, TabId[]> = {
  redirect: ["analytics", "qr", "settings"],
  linkpage: ["content", "appearance", "analytics", "qr", "settings"],
};

export function DetailScreen({ id, kind, tab, me }: { id: number; kind: PageKind; tab: string | undefined; me: Me }) {
  const page = useApi<PageDetail>(`/pages/${id}`);
  const p = page.data;

  // Correct the URL to the canonical one, e.g. /~/links/<id of a link page>, or another user's
  // page opened outside Administration.
  useEffect(() => {
    if (!p) return;
    const canonical = detailPath(p, tab);
    if (location.pathname.replace(/\/+$/, "") !== canonical) replacePath(canonical);
  }, [p, tab]);

  if (page.error) {
    return (
      <EmptyState
        icon={<LayoutList />}
        title={page.error.status === 404 ? "Not found" : "Couldn't load this page"}
        description={page.error.status === 404 ? "It may have been deleted, or it belongs to someone else." : page.error.message}
        action={
          <Link to={listPath(kind)} className={buttonClass("secondary")}>
            Back to list
          </Link>
        }
      />
    );
  }

  if (!p) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-6 h-64 rounded-xl" />
      </div>
    );
  }

  const tabs = TABS_BY_KIND[p.kind];
  const active: TabId = tabs.includes(tab as TabId) ? (tab as TabId) : tabs[0]!;
  const url = publicUrl(p.path);

  return (
    <>
      <nav className="mb-3 flex items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
        {backPath(p) === listPath(p.kind) ? (
          <Link to={listPath(p.kind)} className="hover:text-fg">
            {p.kind === "redirect" ? "Short links" : "Link pages"}
          </Link>
        ) : (
          <>
            <Link to="/~/admin" className="hover:text-fg">
              Administration
            </Link>
            <ChevronRight className="size-3.5" />
            <Link to={backPath(p)} className="hover:text-fg">
              {p.namespace}
            </Link>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="truncate text-fg">{p.path}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-center gap-4">
        {p.kind === "redirect" ? (
          <DomainIcon url={p.dest} className="size-12 rounded-xl text-base" />
        ) : p.avatarUrl ? (
          <img src={p.avatarUrl} alt="" className="size-12 rounded-full object-cover" />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-lg font-semibold text-accent-soft-fg">
            {(p.title ?? p.code).charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-mono text-xl font-semibold tracking-tight sm:text-2xl">{p.path}</h1>
            {p.pinned && (
              <Badge tone="accent" icon={<Pin />}>
                Homepage
              </Badge>
            )}
            {p.namespace === "" && <Badge>Root</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">{p.kind === "redirect" ? `→ ${p.dest}` : p.title}</p>
        </div>
        <div className="flex basis-full gap-2 sm:basis-auto">
          <CopyButton value={url} label="Copy" />
          <a href={p.path} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
            <ExternalLink />
            Open
          </a>
        </div>
      </header>

      <Tabs active={active} tabs={tabs.map((t) => ({ id: t, ...TABS[t], to: detailPath(p, t === tabs[0] ? undefined : t) }))} />

      <div className="animate-fade-in" key={active}>
        {active === "content" && <ContentTab page={p} me={me} onChange={page.set} />}
        {active === "appearance" && <AppearanceTab page={p} me={me} onChange={page.set} />}
        {active === "analytics" && <AnalyticsTab pageId={p.id} />}
        {active === "qr" && <QrTab url={url} name={p.code} />}
        {active === "settings" && <SettingsTab page={p} me={me} onChange={page.set} reload={page.reload} />}
      </div>
    </>
  );
}
