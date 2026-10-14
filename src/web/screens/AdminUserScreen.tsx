import { useState } from "react";
import { ChevronRight, Link2, MousePointerClick, PanelsTopLeft, Plus, UserX } from "lucide-react";
import type { Me, PageKind, PageSummary } from "../../shared/api-types.js";
import { useApi } from "../api.js";
import { CreatePageDialog } from "../components/CreatePageDialog.js";
import { PageTable } from "../components/PageTable.js";
import { Button, buttonClass } from "../components/ui/button.js";
import { Link, Stat } from "../components/ui/misc.js";
import { EmptyState, Skeleton } from "../components/ui/surface.js";
import { useToast } from "../components/ui/toast.js";
import { detailPath, navigate } from "../router.js";

// Everything one user owns, for admins. Kept apart from the admin's own and root content.
export function AdminUserScreen({ username, me }: { username: string; me: Me }) {
  const users = useApi<string[]>("/users");
  const pages = useApi<PageSummary[]>("/pages");
  const toast = useToast();
  const [creating, setCreating] = useState<PageKind | null>(null);

  if (users.data && !users.data.includes(username)) {
    return (
      <EmptyState
        icon={<UserX />}
        title="User not found"
        description={`Nobody called "${username}" has signed in yet.`}
        action={
          <Link to="/~/admin" className={buttonClass("secondary")}>
            Back to Administration
          </Link>
        }
      />
    );
  }

  const theirs = pages.data?.filter((p) => p.namespace === username);
  const count = (kind: PageKind) => theirs?.filter((p) => p.kind === kind).length ?? 0;
  const clicks = theirs?.reduce((sum, p) => sum + p.totalClicks, 0) ?? 0;

  return (
    <>
      <nav className="mb-3 flex items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/~/admin" className="hover:text-fg">
          Administration
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-fg">{username}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-center gap-4 lg:mb-8">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-lg font-semibold text-accent-soft-fg uppercase">
          {username.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{username}</h1>
          <p className="mt-0.5 text-sm text-muted">
            Manage the links and pages under <span className="font-mono">/{username}/</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<PanelsTopLeft />} onClick={() => setCreating("linkpage")}>
            New link page
          </Button>
          <Button icon={<Plus />} onClick={() => setCreating("redirect")}>
            New short link
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {theirs ? (
            <>
              <Stat label="Short links" value={count("redirect")} icon={<Link2 />} />
              <Stat label="Link pages" value={count("linkpage")} icon={<PanelsTopLeft />} />
              <Stat label="Total clicks" value={clicks.toLocaleString()} icon={<MousePointerClick />} />
            </>
          ) : (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          )}
        </div>

        <section>
          <h2 className="mb-3 text-base font-semibold">Link pages</h2>
          <PageTable kind="linkpage" pages={theirs} empty={{ title: "No link pages", description: `${username} hasn't created any link pages.` }} />
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold">Short links</h2>
          <PageTable kind="redirect" pages={theirs} empty={{ title: "No short links", description: `${username} hasn't created any short links.` }} />
        </section>
      </div>

      {creating && (
        <CreatePageDialog
          kind={creating}
          me={me}
          open
          fixedNamespace={username}
          onClose={() => setCreating(null)}
          onCreated={(page) => {
            if (page.kind === "linkpage") return navigate(detailPath(page));
            toast(`Created ${page.path}`);
            void pages.reload();
          }}
        />
      )}
    </>
  );
}
