import { useState } from "react";
import { ArrowRight, Link2, MousePointerClick, PanelsTopLeft, Plus, TrendingUp } from "lucide-react";
import type { Conflict, Me, PageKind, PageSummary } from "../../shared/api-types.js";
import { useApi } from "../api.js";
import { CreatePageDialog } from "../components/CreatePageDialog.js";
import { Button, buttonClass } from "../components/ui/button.js";
import { DomainIcon, Link, Stat } from "../components/ui/misc.js";
import { Alert, Card, CardHeader, EmptyState, PageHeader, Skeleton } from "../components/ui/surface.js";
import { detailPath, navigate } from "../router.js";

function TopPages({ pages }: { pages: PageSummary[] }) {
  const top = pages.filter((p) => p.totalClicks > 0).sort((a, b) => b.totalClicks - a.totalClicks).slice(0, 6);
  const max = Math.max(1, ...top.map((p) => p.totalClicks));

  if (!top.length) {
    return <EmptyState icon={<TrendingUp />} title="No clicks yet" description="Once people open your links, the most visited ones show up here." />;
  }

  return (
    <ul className="divide-y divide-border">
      {top.map((p) => (
        <li key={p.id}>
          <Link to={detailPath(p, "analytics")} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
            {p.kind === "redirect" ? (
              <DomainIcon url={p.dest} />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-fg">
                <PanelsTopLeft className="size-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-sm font-medium">{p.path}</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(p.totalClicks / max) * 100}%` }} />
              </div>
            </div>
            <span className="w-14 text-right text-sm text-muted tabular-nums">{p.totalClicks.toLocaleString()}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function OverviewScreen({ me }: { me: Me }) {
  const pages = useApi<PageSummary[]>("/pages");
  const conflicts = useApi<Conflict[]>(me.isAdmin ? "/conflicts" : null);
  const [creating, setCreating] = useState<PageKind | null>(null);

  const all = pages.data ?? [];
  const links = all.filter((p) => p.kind === "redirect");
  const linkPages = all.filter((p) => p.kind === "linkpage");
  const clicks = all.reduce((sum, p) => sum + p.totalClicks, 0);
  const scope = me.isAdmin ? "across all namespaces" : `in /${me.username}/`;

  return (
    <>
      <PageHeader
        title={`Hi, ${me.username}`}
        description="Here's how your links are doing."
        actions={
          <>
            <Button variant="secondary" icon={<PanelsTopLeft />} onClick={() => setCreating("linkpage")}>
              New link page
            </Button>
            <Button icon={<Plus />} onClick={() => setCreating("redirect")}>
              New short link
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6">
        {!!conflicts.data?.length && (
          <Alert title="Username conflicts">
            {conflicts.data.map((c, i) => (
              <span key={c.pageId}>
                {i > 0 && ", "}
                <Link to={detailPath({ id: c.pageId, kind: "redirect" }, "settings")} className="font-mono underline">
                  /{c.username}
                </Link>
              </span>
            ))}{" "}
            {conflicts.data.length === 1 ? "is" : "are"} both a root link and a username. Consider deleting or recreating the root link under another code.
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {pages.data ? (
            <>
              <Stat label="Short links" value={links.length} icon={<Link2 />} hint={scope} />
              <Stat label="Link pages" value={linkPages.length} icon={<PanelsTopLeft />} hint={scope} />
              <Stat label="Total clicks" value={clicks.toLocaleString()} icon={<MousePointerClick />} hint="all time" />
            </>
          ) : (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          )}
        </div>

        <Card>
          <CardHeader
            title="Most visited"
            description="All-time clicks"
            actions={
              <Link to="/~/links" className={buttonClass("ghost", "sm")}>
                All links <ArrowRight />
              </Link>
            }
          />
          {pages.data ? <TopPages pages={all} /> : <Skeleton className="m-5 h-40" />}
        </Card>
      </div>

      {creating && (
        <CreatePageDialog
          kind={creating}
          me={me}
          open
          onClose={() => setCreating(null)}
          onCreated={(page) => navigate(detailPath(page))}
        />
      )}
    </>
  );
}
