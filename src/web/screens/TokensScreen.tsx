import { useState, type FormEvent } from "react";
import type { ApiToken, CreatedToken } from "../../shared/api-types.js";
import { api, useApi } from "../api.js";
import { Field, useAction, useToast } from "../components/ui.js";

export function TokensScreen() {
  const tokens = useApi<ApiToken[]>("/tokens");
  const { busy, run } = useAction();
  const toast = useToast();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedToken | null>(null);

  const create = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      setCreated(await api<CreatedToken>("POST", "/tokens", { name }));
      setName("");
      await tokens.reload();
    });
  };
  const revoke = (t: ApiToken) => {
    if (!confirm(`Revoke "${t.name}"? Scripts using it stop working.`)) return;
    void run(async () => {
      await api("DELETE", `/tokens/${t.id}`);
      await tokens.reload();
    }, "Token revoked");
  };

  const example = `curl -X POST ${location.origin}/~/api/pages \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"redirect","dest":"https://example.com"}'`;

  return (
    <div className="flex flex-col gap-6">
      <h1>API tokens</h1>
      <p className="text-sm text-gray-400">Tokens act with your permissions. Use them for scripts or iOS Shortcuts.</p>

      <form className="card" onSubmit={create}>
        <Field label="Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPhone Shortcut" />
        </Field>
        <button className="btn" disabled={busy}>
          Create token
        </button>
        {created && (
          <div className="mt-4 rounded border border-green-700 bg-green-900/30 p-3">
            <p className="mb-2 text-sm">Copy this token now. It won't be shown again.</p>
            <div className="flex gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-gray-900 px-2 py-1">{created.token}</code>
              <button
                type="button"
                className="btn btn-secondary py-1"
                onClick={() => navigator.clipboard.writeText(created.token).then(() => toast("Copied"))}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </form>

      <section className="card">
        <h2 className="mb-3">Your tokens</h2>
        {tokens.data?.length ? (
          tokens.data.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 border-b border-gray-700 py-2 last:border-0">
              <div>
                <div className="font-semibold text-white">{t.name}</div>
                <div className="text-xs text-gray-400">
                  created {new Date(t.createdAt).toLocaleDateString()} · last used{" "}
                  {t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleString() : "never"}
                </div>
              </div>
              <button className="btn btn-danger py-1" onClick={() => revoke(t)} disabled={busy}>
                Revoke
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No tokens yet.</p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3">Example</h2>
        <pre className="overflow-x-auto rounded bg-gray-900 p-3 text-sm">{example}</pre>
      </section>
    </div>
  );
}
