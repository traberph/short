import { useState } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import type { Me, PageDetail } from "../../../shared/api-types.js";
import { api } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { useConfirm } from "../../components/ui/dialog.js";
import { Field, Input } from "../../components/ui/form.js";
import { CopyButton, publicUrl } from "../../components/ui/misc.js";
import { Card, CardBody, CardFooter, CardHeader } from "../../components/ui/surface.js";
import { useAction } from "../../components/ui/toast.js";
import { listPath, navigate } from "../../router.js";

function DestinationCard({ page, onChange }: { page: PageDetail; onChange: (page: PageDetail) => void }) {
  const [dest, setDest] = useState(page.dest ?? "");
  const { busy, run } = useAction();
  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => onChange(await api<PageDetail>("PATCH", `/pages/${page.id}`, { dest })), "Destination updated");
        }}
      >
        <CardHeader title="Destination" description="Where visitors are sent. Changes apply immediately, existing QR codes keep working." />
        <CardBody>
          <Field label="URL">{(id) => <Input id={id} type="url" required value={dest} onChange={(e) => setDest(e.target.value)} />}</Field>
        </CardBody>
        <CardFooter>
          <Button type="submit" loading={busy} disabled={dest === page.dest}>
            Save
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function SettingsTab({
  page,
  me,
  onChange,
  reload,
}: {
  page: PageDetail;
  me: Me;
  onChange: (page: PageDetail) => void;
  reload: () => Promise<void>;
}) {
  const { busy, run } = useAction();
  const confirm = useConfirm();

  const togglePin = () =>
    run(async () => {
      if (page.pinned) await api("DELETE", "/pin");
      else await api("PUT", "/pin", { pageId: page.id });
      await reload();
    }, page.pinned ? "Removed from homepage" : "Set as homepage");

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${page.path}?`,
      description: "Its stats and any link buttons pointing to it are deleted too. The URL stops working immediately.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    void run(async () => {
      await api("DELETE", `/pages/${page.id}`);
      navigate(listPath(page.kind));
    }, `Deleted ${page.path}`);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {page.kind === "redirect" && <DestinationCard page={page} onChange={onChange} />}

      <Card>
        <CardHeader title="Address" description="Shortcodes can't be changed. Create a new one if you need a different address." />
        <CardBody className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-surface-2 px-3 py-2 font-mono text-sm">{publicUrl(page.path)}</code>
          <CopyButton value={publicUrl(page.path)} label="Copy" />
        </CardBody>
      </Card>

      {me.isAdmin && (
        <Card>
          <CardHeader
            title="Homepage"
            description={
              page.pinned
                ? "Visitors opening the bare domain are sent to this page."
                : "Send visitors who open the bare domain to this page instead of the default landing page."
            }
            actions={
              <Button variant="secondary" size="sm" icon={page.pinned ? <PinOff /> : <Pin />} onClick={() => void togglePin()} loading={busy}>
                {page.pinned ? "Unpin" : "Set as homepage"}
              </Button>
            }
          />
        </Card>
      )}

      <Card className="border-danger/30">
        <CardHeader
          title={<span className="text-danger">Delete {page.kind === "redirect" ? "short link" : "link page"}</span>}
          description="Permanently removes it together with its stats."
          actions={
            <Button variant="danger" size="sm" icon={<Trash2 />} onClick={() => void remove()}>
              Delete
            </Button>
          }
        />
      </Card>
    </div>
  );
}
