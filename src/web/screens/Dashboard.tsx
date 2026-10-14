import { useState, type FormEvent } from "react";
import type { Conflict, Me, PageKind, PageSummary } from "../../shared/api-types.js";
import { api, useApi } from "../api.js";
import { Field, Link, publicUrl, useAction, useToast } from "../components/ui.js";
import { navigate } from "../router.js";

function CreateForm({ me, onCreated }: { me: Me; onCreated: () => void }) {
  const users = useApi<string[]>(me.isAdmin ? "/users" : null);
  const { busy, run } = useAction();
  const [kind, setKind] = useState<PageKind>("redirect");
  const [namespace, setNamespace] = useState(me.username);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const body = {
        kind,
        namespace,
        ...(code.trim() && { code: code.trim() }),
        ...(kind === "redirect" ? { dest: value.trim() } : { title: value.trim() }),
      };
      const page = await api<PageSummary>("POST", "/pages", body);
      setCode("");
      setValue("");
      if (page.kind === "linkpage") navigate(`/~/pages/${page.id}`);
      else {
        await navigator.clipboard?.writeText(publicUrl(page.path)).catch(() => {});
        onCreated();
      }
    }, kind === "redirect" ? "Link created and copied" : "Link page created");
  };

  const prefix = namespace ? `/${namespace}/` : "/";

  return (
    <form onSubmit={submit} className="card mb-10">
      <div className="mb-4 flex gap-2">
        {(["redirect", "linkpage"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`btn py-1 ${kind === k ? "" : "btn-secondary"}`}
            onClick={() => setKind(k)}
          >
            {k === "redirect" ? "Short link" : "Link page"}
          </button>
        ))}
      </div>
      <div className="grid gap-x-4 sm:grid-cols-[auto_1fr]">
        {me.isAdmin && (
          <Field label="Namespace">
            <select value={namespace} onChange={(e) => setNamespace(e.target.value)}>
              <option value="">/ (root)</option>
              {(users.data ?? [me.username]).map((u) => (
                <option key={u} value={u}>
                  /{u}/
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Shortcode" hint={`${prefix}${code || "…"} — leave empty for a random code`}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="random" pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,63}" />
        </Field>
      </div>
      <Field label={kind === "redirect" ? "Destination URL" : "Title"}>
        <input
          required
          type={kind === "redirect" ? "url" : "text"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={kind === "redirect" ? "https://…" : "My links"}
        />
      </Field>
      <button className="btn mt-2" disabled={busy}>
        Create
      </button>
    </form>
  );
}

function PageRow({ page }: { page: PageSummary }) {
  const toast = useToast();
  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl(page.path));
    toast("Copied");
  };
  return (
    <div className="flex items-center gap-3 rounded px-3 py-3 odd:bg-gray-800/60">
      <Link to={`/~/pages/${page.id}`} className="min-w-0 flex-1">
        <div className="truncate font-semibold text-white">
          {page.path}
          {page.pinned && <span className="ml-2 rounded bg-yellow-700 px-1.5 text-xs">pinned to /</span>}
        </div>
        <div className="truncate text-sm text-gray-400">{page.kind === "redirect" ? page.dest : page.title}</div>
      </Link>
      <span className="text-sm whitespace-nowrap text-gray-400">{page.totalClicks} clicks</span>
      <button className="btn btn-secondary px-2 py-1 text-sm" onClick={copy} title="Copy URL">
        Copy
      </button>
    </div>
  );
}

export function Dashboard({ me }: { me: Me }) {
  const pages = useApi<PageSummary[]>("/pages");
  const conflicts = useApi<Conflict[]>(me.isAdmin ? "/conflicts" : null);
  const [filter, setFilter] = useState("");

  const visible = (pages.data ?? []).filter(
    (p) => !filter || p.path.toLowerCase().includes(filter.toLowerCase()) || (p.dest ?? p.title ?? "").toLowerCase().includes(filter.toLowerCase()),
  );
  const links = visible.filter((p) => p.kind === "redirect");
  const linkPages = visible.filter((p) => p.kind === "linkpage");

  return (
    <>
      {!!conflicts.data?.length && (
        <div className="mb-6 rounded border border-yellow-700 bg-yellow-900/30 p-4 text-sm">
          <strong>Username conflicts:</strong>{" "}
          {conflicts.data.map((c, i) => (
            <span key={c.pageId}>
              {i > 0 && ", "}
              <Link to={`/~/pages/${c.pageId}`} className="underline">
                /{c.username}
              </Link>
            </span>
          ))}{" "}
          {conflicts.data.length === 1 ? "is" : "are"} both a root link and a username. Consider renaming the root link.
        </div>
      )}

      <h2 className="mb-3">Create</h2>
      <CreateForm me={me} onCreated={() => void pages.reload()} />

      <div className="mb-3 flex items-center justify-between gap-4">
        <h2>Pages</h2>
        <input className="max-w-xs" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      {pages.error && <p className="text-red-400">{pages.error.message}</p>}

      <h3 className="mt-6 mb-2 text-sm font-bold text-gray-400 uppercase">Link pages</h3>
      {linkPages.length ? linkPages.map((p) => <PageRow key={p.id} page={p} />) : <p className="text-gray-500">None yet.</p>}

      <h3 className="mt-6 mb-2 text-sm font-bold text-gray-400 uppercase">Short links</h3>
      {links.length ? links.map((p) => <PageRow key={p.id} page={p} />) : <p className="text-gray-500">None yet.</p>}
    </>
  );
}
