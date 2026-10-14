import { useEffect, useState } from "react";
import { ChevronRight, PinOff, TriangleAlert, Users } from "lucide-react";
import type { Conflict, Me, PageSummary } from "../../shared/api-types.js";
import { api, useApi } from "../api.js";
import { Button } from "../components/ui/button.js";
import { Select } from "../components/ui/form.js";
import { Link } from "../components/ui/misc.js";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton } from "../components/ui/surface.js";
import { useAction } from "../components/ui/toast.js";
import { adminUserPath, detailPath } from "../router.js";

function HomepageCard({ pages, reload }: { pages: PageSummary[]; reload: () => Promise<void> }) {
  const pinned = pages.find((p) => p.pinned);
  const [selected, setSelected] = useState(pinned ? String(pinned.id) : "");
  const { busy, run } = useAction();

  useEffect(() => setSelected(pinned ? String(pinned.id) : ""), [pinned]);

  const save = () =>
    run(async () => {
      if (selected) await api("PUT", "/pin", { pageId: Number(selected) });
      else await api("DELETE", "/pin");
      await reload();
    }, selected ? "Homepage updated" : "Homepage cleared");

  return (
    <Card>
      <CardHeader title="Homepage" description="Where visitors land when they open the bare domain." />
      <CardBody className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Select aria-label="Homepage" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Default landing page</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.path} — {p.kind === "redirect" ? p.dest : p.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          {pinned && (
            <Button variant="secondary" icon={<PinOff />} onClick={() => setSelected("")}>
              Clear
            </Button>
          )}
          <Button onClick={() => void save()} loading={busy} disabled={selected === (pinned ? String(pinned.id) : "")}>
            Save
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function UsersCard({ users, pages, me }: { users: string[] | undefined; pages: PageSummary[] | undefined; me: Me }) {
  const others = users?.filter((u) => u !== me.username);
  const stats = (u: string) => {
    const theirs = (pages ?? []).filter((p) => p.namespace === u);
    const links = theirs.filter((p) => p.kind === "redirect").length;
    const linkPages = theirs.length - links;
    const clicks = theirs.reduce((sum, p) => sum + p.totalClicks, 0);
    return `${links} ${links === 1 ? "link" : "links"} · ${linkPages} ${linkPages === 1 ? "page" : "pages"} · ${clicks.toLocaleString()} clicks`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Users"
        description="Open a user to manage their short links and link pages. Your own and root content is under Short links and Link pages."
        actions={others && <Badge>{others.length}</Badge>}
      />
      {!others ? (
        <Skeleton className="m-5 h-10" />
      ) : others.length ? (
        <ul className="divide-y divide-border">
          {others.map((u) => (
            <li key={u} className="group relative flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/60">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-fg uppercase">
                {u.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <Link to={adminUserPath(u)} className="font-medium after:absolute after:inset-0">
                  {u}
                </Link>
                <div className="truncate text-xs text-muted">{pages ? stats(u) : " "}</div>
              </div>
              <ChevronRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Users />} title="No other users yet" description="Users appear here after their first sign-in." />
      )}
    </Card>
  );
}

export function AdminScreen({ me }: { me: Me }) {
  const pages = useApi<PageSummary[]>("/pages");
  const users = useApi<string[]>("/users");
  const conflicts = useApi<Conflict[]>("/conflicts");

  return (
    <>
      <PageHeader title="Administration" description="Other users' content and settings that affect the whole instance." />

      <div className="flex flex-col gap-6">
        <UsersCard users={users.data} pages={pages.data} me={me} />

        {pages.data ? <HomepageCard pages={pages.data} reload={pages.reload} /> : <Skeleton className="h-36 rounded-xl" />}

        <Card>
          <CardHeader
            title="Username conflicts"
            description="Root links whose code matches a username. Users never get /username itself, but it's confusing."
          />
          {!conflicts.data ? (
            <Skeleton className="m-5 h-10" />
          ) : conflicts.data.length ? (
            <ul className="divide-y divide-border">
              {conflicts.data.map((c) => (
                <li key={c.pageId} className="flex items-center gap-3 px-5 py-3">
                  <TriangleAlert className="size-4 text-warning-soft-fg" />
                  <span className="flex-1 font-mono text-sm">/{c.username}</span>
                  <Link to={detailPath({ id: c.pageId, kind: "redirect", namespace: "" }, "settings")} className="text-sm text-accent hover:underline">
                    Open root link
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <CardBody className="text-sm text-muted">No conflicts.</CardBody>
          )}
        </Card>
      </div>
    </>
  );
}
