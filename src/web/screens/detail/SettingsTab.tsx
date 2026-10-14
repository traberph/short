import { useState } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import type { Me, PageDetail } from "../../../shared/api-types.js";
import { api, ApiRequestError, errorMessage } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { useConfirm } from "../../components/ui/dialog.js";
import { Field, Input, PrefixInput } from "../../components/ui/form.js";
import { CopyButton, publicUrl } from "../../components/ui/misc.js";
import { Alert, Card, CardBody, CardFooter, CardHeader } from "../../components/ui/surface.js";
import { useAction, useToast } from "../../components/ui/toast.js";
import { backPath, navigate } from "../../router.js";

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

function AddressCard({ page, onChange }: { page: PageDetail; onChange: (page: PageDetail) => void }) {
  const [code, setCode] = useState(page.code);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const prefix = page.namespace ? `/${page.namespace}/` : "/";
  const newPath = `${prefix}${code.trim()}`;
  const changed = code.trim() !== page.code;

  const rename = async () => {
    const ok = await confirm({
      title: "Change the address?",
      description: (
        <span className="flex flex-col gap-3">
          <span>
            <span className="font-mono">{page.path}</span> stops working immediately. Shared links, bookmarks and printed QR codes
            that use it will show a "not found" page.
          </span>
          <span>
            New address: <span className="font-mono text-fg">{newPath}</span>
          </span>
        </span>
      ),
      confirmLabel: "Change address",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    setError(undefined);
    try {
      onChange(await api<PageDetail>("PATCH", `/pages/${page.id}`, { code: code.trim() }));
      toast(`Address changed to ${newPath}`);
    } catch (err) {
      setError(err instanceof ApiRequestError && err.issues?.code ? err.issues.code.join(", ") : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void rename();
        }}
      >
        <CardHeader title="Address" description="The public URL of this page." actions={<CopyButton value={publicUrl(page.path)} label="Copy" />} />
        <CardBody className="flex flex-col gap-4">
          <Field label="Shortcode" error={error}>
            {(id) => (
              <PrefixInput
                id={id}
                prefix={prefix}
                required
                pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,63}"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(undefined);
                }}
              />
            )}
          </Field>
          {changed && (
            <Alert title="Changing the shortcode breaks the current URL">
              <span className="font-mono">{page.path}</span> will stop working, including QR codes you've already shared or printed.
            </Alert>
          )}
        </CardBody>
        <CardFooter>
          {changed && (
            <Button variant="secondary" onClick={() => setCode(page.code)}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant={changed ? "danger" : "primary"} loading={busy} disabled={!changed || !code.trim()}>
            Change address
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
      navigate(backPath(page));
    }, `Deleted ${page.path}`);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {page.kind === "redirect" && <DestinationCard page={page} onChange={onChange} />}

      <AddressCard key={page.code} page={page} onChange={onChange} />

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
