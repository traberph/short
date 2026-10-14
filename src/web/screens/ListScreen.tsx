import { useMemo, useState } from "react";
import { ChevronRight, Link2, PanelsTopLeft, Pin, Plus, Search } from "lucide-react";
import type { Me, PageKind, PageSummary } from "../../shared/api-types.js";
import { useApi } from "../api.js";
import { CreatePageDialog } from "../components/CreatePageDialog.js";
import { Button } from "../components/ui/button.js";
import { Input, Select } from "../components/ui/form.js";
import { CopyButton, DomainIcon, Link, publicUrl } from "../components/ui/misc.js";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "../components/ui/surface.js";
import { useToast } from "../components/ui/toast.js";
import { detailPath, navigate } from "../router.js";

const COPY: Record<PageKind, { title: string; description: string; create: string; empty: string; emptyText: string }> = {
  redirect: {
    title: "Short links",
    description: "Short URLs that redirect to another address.",
    create: "New short link",
    empty: "No short links yet",
    emptyText: "Create your first short link to share long URLs and track clicks.",
  },
  linkpage: {
    title: "Link pages",
    description: "Pages that collect several links, like a link in bio.",
    create: "New link page",
    empty: "No link pages yet",
    emptyText: "Create a page with your avatar, link buttons and some text.",
  },
};

function Row({ page }: { page: PageSummary }) {
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

export function ListScreen({ kind, me }: { kind: PageKind; me: Me }) {
  const pages = useApi<PageSummary[]>("/pages");
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const copy = COPY[kind];

  const ofKind = useMemo(() => (pages.data ?? []).filter((p) => p.kind === kind), [pages.data, kind]);
  const namespaces = useMemo(() => [...new Set(ofKind.map((p) => p.namespace))].sort(), [ofKind]);
  const q = query.trim().toLowerCase();
  const visible = ofKind.filter(
    (p) =>
      (namespace === null || p.namespace === namespace) &&
      (!q || p.path.toLowerCase().includes(q) || (p.dest ?? p.title ?? "").toLowerCase().includes(q)),
  );

  const created = async (page: PageSummary) => {
    if (page.kind === "linkpage") return navigate(detailPath(page));
    await navigator.clipboard?.writeText(publicUrl(page.path)).catch(() => {});
    toast(`Created ${page.path} — copied to clipboard`);
    void pages.reload();
  };

  const createButton = (
    <Button icon={<Plus />} onClick={() => setCreating(true)}>
      {copy.create}
    </Button>
  );

  return (
    <>
      <PageHeader title={copy.title} description={copy.description} actions={createButton} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
          </div>
          {me.isAdmin && namespaces.length > 1 && (
            <div className="w-44">
              <Select
                aria-label="Namespace"
                value={namespace ?? "*"}
                onChange={(e) => setNamespace(e.target.value === "*" ? null : e.target.value)}
              >
                <option value="*">All namespaces</option>
                {namespaces.map((ns) => (
                  <option key={ns} value={ns}>
                    {ns ? `/${ns}/` : "Root /"}
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

        {!pages.data ? (
          <div className="flex flex-col gap-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : visible.length ? (
          <div className="divide-y divide-border">
            {visible.map((p) => (
              <Row key={p.id} page={p} />
            ))}
          </div>
        ) : ofKind.length ? (
          <EmptyState icon={<Search />} title="No matches" description="Try a different search or namespace." />
        ) : (
          <EmptyState icon={kind === "redirect" ? <Link2 /> : <PanelsTopLeft />} title={copy.empty} description={copy.emptyText} action={createButton} />
        )}
      </Card>

      <CreatePageDialog kind={kind} me={me} open={creating} onClose={() => setCreating(false)} onCreated={created} />
    </>
  );
}
