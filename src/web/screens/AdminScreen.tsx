import { useEffect, useState } from "react";
import { PinOff, TriangleAlert, Users } from "lucide-react";
import type { Conflict, PageSummary } from "../../shared/api-types.js";
import { api, useApi } from "../api.js";
import { Button } from "../components/ui/button.js";
import { Select } from "../components/ui/form.js";
import { Link } from "../components/ui/misc.js";
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, Skeleton } from "../components/ui/surface.js";
import { useAction } from "../components/ui/toast.js";
import { detailPath } from "../router.js";

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

export function AdminScreen() {
  const pages = useApi<PageSummary[]>("/pages");
  const users = useApi<string[]>("/users");
  const conflicts = useApi<Conflict[]>("/conflicts");

  const countByUser = new Map<string, number>();
  for (const p of pages.data ?? []) countByUser.set(p.namespace, (countByUser.get(p.namespace) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Administration" description="Settings that affect the whole instance." />

      <div className="flex flex-col gap-6">
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
                  <Link to={detailPath({ id: c.pageId, kind: "redirect" }, "settings")} className="text-sm text-accent hover:underline">
                    Open root link
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <CardBody className="text-sm text-muted">No conflicts.</CardBody>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Users"
            description="Everyone who has signed in. Admin rights and usernames are managed in Authentik."
            actions={users.data && <Badge>{users.data.length}</Badge>}
          />
          {!users.data ? (
            <Skeleton className="m-5 h-10" />
          ) : users.data.length ? (
            <ul className="divide-y divide-border">
              {users.data.map((u) => (
                <li key={u} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-fg uppercase">
                    {u.charAt(0)}
                  </span>
                  <span className="flex-1 font-mono text-sm">/{u}/</span>
                  <span className="text-sm text-muted">
                    {countByUser.get(u) ?? 0} {(countByUser.get(u) ?? 0) === 1 ? "page" : "pages"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Users />} title="No users yet" />
          )}
        </Card>

      </div>
    </>
  );
}
