import { useEffect, useState, type FormEvent } from "react";
import type { Me, PageDetail } from "../../shared/api-types.js";
import type { Theme } from "../../shared/validation.js";
import { api, useApi } from "../api.js";
import { BlockEditor } from "../components/BlockEditor.js";
import { QrPanel } from "../components/QrPanel.js";
import { StatsPanel } from "../components/StatsPanel.js";
import { Field, Link, publicUrl, useAction, useToast } from "../components/ui.js";
import { navigate } from "../router.js";

const THEME_FIELDS: [keyof Theme, string][] = [
  ["background", "Background"],
  ["text", "Text"],
  ["button", "Button"],
  ["buttonText", "Button text"],
];

function RedirectSettings({ page, onSaved }: { page: PageDetail; onSaved: (p: PageDetail) => void }) {
  const [dest, setDest] = useState(page.dest ?? "");
  const { busy, run } = useAction();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => onSaved(await api<PageDetail>("PATCH", `/pages/${page.id}`, { dest })), "Saved");
  };
  return (
    <form className="card" onSubmit={submit}>
      <Field label="Destination URL">
        <input type="url" required value={dest} onChange={(e) => setDest(e.target.value)} />
      </Field>
      <button className="btn" disabled={busy || dest === page.dest}>
        Save
      </button>
    </form>
  );
}

function LinkPageSettings({ page, onSaved }: { page: PageDetail; onSaved: (p: PageDetail) => void }) {
  const [title, setTitle] = useState(page.title ?? "");
  const [theme, setTheme] = useState(page.theme);
  const { busy, run } = useAction();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => onSaved(await api<PageDetail>("PATCH", `/pages/${page.id}`, { title, theme })), "Saved");
  };

  const upload = (file: File | undefined) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    void run(async () => {
      const { avatarUrl } = await api<{ avatarUrl: string }>("PUT", `/pages/${page.id}/avatar`, form);
      onSaved({ ...page, avatarUrl });
    }, "Avatar updated");
  };
  const removeAvatar = () =>
    run(async () => {
      await api("DELETE", `/pages/${page.id}/avatar`);
      onSaved({ ...page, avatarUrl: null });
    });

  return (
    <form className="card" onSubmit={submit}>
      <div className="mb-4 flex items-center gap-4">
        {page.avatarUrl ? (
          <img src={page.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-700" />
        )}
        <label className="btn btn-secondary mb-0 cursor-pointer py-1 text-base font-medium tracking-normal normal-case">
          Upload avatar
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {page.avatarUrl && (
          <button type="button" className="btn btn-secondary py-1" onClick={removeAvatar}>
            Remove
          </button>
        )}
      </div>
      <Field label="Title">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="mb-4 flex flex-wrap gap-6">
        {THEME_FIELDS.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 normal-case">
            <input type="color" value={theme[key]} onChange={(e) => setTheme({ ...theme, [key]: e.target.value })} />
            {label}
          </label>
        ))}
      </div>
      <button className="btn" disabled={busy}>
        Save
      </button>
    </form>
  );
}

export function PageScreen({ id, me }: { id: number; me: Me }) {
  const page = useApi<PageDetail>(`/pages/${id}`);
  const toast = useToast();
  const { busy, run } = useAction();
  const [previewKey, setPreviewKey] = useState(0);

  // Reload the preview whenever the page changes.
  useEffect(() => setPreviewKey((k) => k + 1), [page.data]);

  if (page.error) {
    return (
      <p>
        {page.error.status === 404 ? "Page not found." : page.error.message}{" "}
        <Link to="/~/" className="underline">
          Back
        </Link>
      </p>
    );
  }
  const p = page.data;
  if (!p) return null;
  const url = publicUrl(p.path);

  const remove = () => {
    if (!confirm(`Delete ${p.path}? Its stats and any buttons pointing to it are removed too.`)) return;
    void run(async () => {
      await api("DELETE", `/pages/${p.id}`);
      navigate("/~/");
    }, "Deleted");
  };
  const togglePin = () =>
    run(async () => {
      if (p.pinned) await api("DELETE", "/pin");
      else await api("PUT", "/pin", { pageId: p.id });
      await page.reload();
    }, p.pinned ? "Unpinned" : "Pinned to /");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link to="/~/" className="text-sm text-gray-400 hover:underline">
            ← All pages
          </Link>
          <h1 className="truncate">{p.path}</h1>
          <p className="text-sm text-gray-400">{p.kind === "redirect" ? "Short link" : "Link page"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-secondary" href={p.path} target="_blank" rel="noreferrer">
            Open
          </a>
          <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(url).then(() => toast("Copied"))}>
            Copy URL
          </button>
          {me.isAdmin && (
            <button className="btn btn-secondary" onClick={togglePin} disabled={busy}>
              {p.pinned ? "Unpin from /" : "Pin to /"}
            </button>
          )}
          <button className="btn btn-danger" onClick={remove} disabled={busy}>
            Delete
          </button>
        </div>
      </div>

      {p.kind === "redirect" ? (
        <RedirectSettings page={p} onSaved={page.set} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <LinkPageSettings key={p.id} page={p} onSaved={page.set} />
            <BlockEditor
              pageId={p.id}
              namespace={p.namespace}
              isAdmin={me.isAdmin}
              blocks={p.blocks}
              onChange={(blocks) => page.set({ ...p, blocks })}
            />
          </div>
          <div className="hidden lg:block">
            <h2 className="mb-2">Preview</h2>
            <iframe key={previewKey} src={`${p.path}?preview`} title="Preview" className="h-[640px] w-full rounded-lg border border-gray-700" />
          </div>
        </div>
      )}

      <QrPanel url={url} name={p.code} />
      <StatsPanel pageId={p.id} />
    </div>
  );
}
