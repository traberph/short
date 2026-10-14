import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Link2, PanelsTopLeft, Pin, Search } from "lucide-react";
import type { PageKind, PageSummary } from "../../shared/api-types.js";
import { detailPath } from "../router.js";
import { Input, Select } from "./ui/form.js";
import { CopyButton, DomainIcon, Link, publicUrl } from "./ui/misc.js";
import { Badge, Card, EmptyState, Skeleton } from "./ui/surface.js";

function Row({ page, showNamespace }: { page: PageSummary; showNamespace: boolean }) {
  const isLink = page.kind === "redirect";
  return (
    <div className="group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 transition-colors hover:bg-surface-2/60 md:grid-cols-[auto_minmax(0,2fr)_minmax(0,3fr)_5rem_auto] md:px-5">
      {isLink ? (
        <DomainIcon url={page.dest} />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-fg">
          <PanelsTopLeft className="size-4" />
        </span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {/* The link stretches over the whole row; the copy button sits above it. */}
          <Link to={detailPath(page)} className="truncate font-mono text-sm font-medium text-fg after:absolute after:inset-0">
            {page.path}
          </Link>
          {showNamespace && page.namespace === "" && <Badge>Root</Badge>}
          {page.pinned && (
            <Badge tone="accent" icon={<Pin />}>
              Home
            </Badge>
          )}
        </div>
        <div className="truncate text-sm text-muted md:hidden">{isLink ? page.dest : page.title}</div>
      </div>
      <div className="hidden truncate text-sm text-muted md:block">{isLink ? page.dest : page.title}</div>
      <div className="hidden text-right text-sm text-muted tabular-nums md:block">{page.totalClicks.toLocaleString()}</div>
      <div className="flex items-center gap-1">
        <div className="relative z-10">
          <CopyButton value={publicUrl(page.path)} />
        </div>
        <ChevronRight className="hidden size-4 text-muted transition-transform group-hover:translate-x-0.5 md:block" />
      </div>
    </div>
  );
}

export interface NamespaceOption {
  label: string;
  match: (namespace: string) => boolean;
}

// Searchable list of short links or link pages. The toolbar is the same everywhere it's used;
// `namespaces` adds a namespace filter (e.g. "Mine" / "Root" for admins).
export function PageTable({
  kind,
  pages,
  namespaces,
  empty,
}: {
  kind: PageKind;
  pages: PageSummary[] | undefined;
  namespaces?: NamespaceOption[];
  empty: { title: string; description: string; action?: ReactNode };
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(0);

  const ofKind = useMemo(() => (pages ?? []).filter((p) => p.kind === kind), [pages, kind]);
  const q = query.trim().toLowerCase();
  const option = namespaces?.[filter];
  const visible = ofKind.filter(
    (p) =>
      (!option || option.match(p.namespace)) &&
      (!q || p.path.toLowerCase().includes(q) || (p.dest ?? p.title ?? "").toLowerCase().includes(q)),
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input className="pl-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
        </div>
        {namespaces && (
          <div className="w-36">
            <Select aria-label="Namespace" value={filter} onChange={(e) => setFilter(Number(e.target.value))}>
              {namespaces.map((n, i) => (
                <option key={n.label} value={i}>
                  {n.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="hidden grid-cols-[2rem_minmax(0,2fr)_minmax(0,3fr)_5rem_4.25rem] gap-x-3 border-b border-border bg-surface-2/40 px-5 py-2 text-xs font-medium text-muted uppercase md:grid">
        <span />
        <span>{kind === "redirect" ? "Short link" : "Page"}</span>
        <span>{kind === "redirect" ? "Destination" : "Title"}</span>
        <span className="text-right">Clicks</span>
        <span />
      </div>

      {!pages ? (
        <div className="flex flex-col gap-3 p-5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="divide-y divide-border">
          {visible.map((p) => (
            <Row key={p.id} page={p} showNamespace={!!namespaces} />
          ))}
        </div>
      ) : ofKind.length ? (
        <EmptyState icon={<Search />} title="No matches" description={namespaces ? "Try a different search or filter." : "Try a different search."} />
      ) : (
        <EmptyState icon={kind === "redirect" ? <Link2 /> : <PanelsTopLeft />} title={empty.title} description={empty.description} action={empty.action} />
      )}
    </Card>
  );
}
