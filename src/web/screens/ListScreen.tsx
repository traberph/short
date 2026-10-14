import { useState } from "react";
import { Plus } from "lucide-react";
import type { Me, PageKind, PageSummary } from "../../shared/api-types.js";
import { useApi } from "../api.js";
import { CreatePageDialog } from "../components/CreatePageDialog.js";
import { PageTable } from "../components/PageTable.js";
import { Button } from "../components/ui/button.js";
import { publicUrl } from "../components/ui/misc.js";
import { PageHeader } from "../components/ui/surface.js";
import { useToast } from "../components/ui/toast.js";
import { isMine, myNamespaceOptions } from "../lib/scope.js";
import { detailPath, navigate } from "../router.js";

const COPY: Record<PageKind, { title: string; description: string; adminDescription: string; create: string; empty: string; emptyText: string }> = {
  redirect: {
    title: "Short links",
    description: "Short URLs that redirect to another address.",
    adminDescription: "Your short links and root links. Other users' links are under Administration.",
    create: "New short link",
    empty: "No short links yet",
    emptyText: "Create your first short link to share long URLs and track clicks.",
  },
  linkpage: {
    title: "Link pages",
    description: "Pages that collect several links, like a link in bio.",
    adminDescription: "Your link pages and root pages. Other users' pages are under Administration.",
    create: "New link page",
    empty: "No link pages yet",
    emptyText: "Create a page with your avatar, link buttons and some text.",
  },
};

export function ListScreen({ kind, me }: { kind: PageKind; me: Me }) {
  const pages = useApi<PageSummary[]>("/pages");
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const copy = COPY[kind];

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
      <PageHeader title={copy.title} description={me.isAdmin ? copy.adminDescription : copy.description} actions={createButton} />
      <PageTable
        kind={kind}
        pages={pages.data?.filter((p) => isMine(p, me))}
        namespaces={myNamespaceOptions(me)}
        empty={{ title: copy.empty, description: copy.emptyText, action: createButton }}
      />
      <CreatePageDialog kind={kind} me={me} open={creating} onClose={() => setCreating(false)} onCreated={created} />
    </>
  );
}
