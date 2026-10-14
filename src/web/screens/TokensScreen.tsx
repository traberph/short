import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import type { ApiToken, CreatedToken } from "../../shared/api-types.js";
import { api, useApi } from "../api.js";
import { Button } from "../components/ui/button.js";
import { Dialog, useConfirm } from "../components/ui/dialog.js";
import { Field, Input } from "../components/ui/form.js";
import { CopyButton } from "../components/ui/misc.js";
import { Alert, Card, CardHeader, EmptyState, PageHeader, Skeleton } from "../components/ui/surface.js";
import { useAction } from "../components/ui/toast.js";

function relative(date: string): string {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const fmt = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return fmt.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

function CreateTokenDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const { busy, run } = useAction();

  const close = () => {
    setName("");
    setCreated(null);
    onClose();
  };

  if (created) {
    return (
      <Dialog
        open={open}
        onClose={close}
        title="Token created"
        description={`"${created.name}" is ready to use.`}
        footer={<Button onClick={close}>Done</Button>}
      >
        <Alert title="Copy it now">You won't be able to see this token again.</Alert>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 font-mono text-sm whitespace-nowrap">{created.token}</code>
          <CopyButton value={created.token} label="Copy" />
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New API token"
      description="The token can do everything you can do in this dashboard."
      onSubmit={() =>
        void run(async () => {
          setCreated(await api<CreatedToken>("POST", "/tokens", { name }));
          onCreated();
        })
      }
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!name.trim()}>
            Create token
          </Button>
        </>
      }
    >
      <Field label="Name" hint="Something to recognize it by, e.g. where it's used.">
        {(id) => <Input id={id} required autoFocus placeholder="iPhone Shortcut" value={name} onChange={(e) => setName(e.target.value)} />}
      </Field>
    </Dialog>
  );
}

export function TokensScreen() {
  const tokens = useApi<ApiToken[]>("/tokens");
  const [creating, setCreating] = useState(false);
  const { run } = useAction();
  const confirm = useConfirm();

  const revoke = async (t: ApiToken) => {
    const ok = await confirm({
      title: `Revoke "${t.name}"?`,
      description: "Scripts using this token stop working immediately.",
      confirmLabel: "Revoke",
      danger: true,
    });
    if (ok)
      void run(async () => {
        await api("DELETE", `/tokens/${t.id}`);
        await tokens.reload();
      }, "Token revoked");
  };

  const example = `curl -X POST ${location.origin}/~/api/pages \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"redirect","dest":"https://example.com"}'`;

  const createButton = (
    <Button icon={<Plus />} onClick={() => setCreating(true)}>
      New token
    </Button>
  );

  return (
    <>
      <PageHeader title="API tokens" description="Create links from scripts, automations or iOS Shortcuts." actions={createButton} />

      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden">
          {!tokens.data ? (
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : tokens.data.length ? (
            <ul className="divide-y divide-border">
              {tokens.data.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                    <KeyRound className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted">
                      Created {relative(t.createdAt)} · {t.lastUsedAt ? `last used ${relative(t.lastUsedAt)}` : "never used"}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={() => void revoke(t)} className="hover:text-danger">
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<KeyRound />} title="No tokens yet" description="Tokens let scripts use the API on your behalf." action={createButton} />
          )}
        </Card>

        <Card>
          <CardHeader title="Example" description="Create a short link with a random code." actions={<CopyButton value={example} />} />
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-muted">{example}</pre>
        </Card>
      </div>

      <CreateTokenDialog open={creating} onClose={() => setCreating(false)} onCreated={() => void tokens.reload()} />
    </>
  );
}
