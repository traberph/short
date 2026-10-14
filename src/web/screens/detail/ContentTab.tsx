import { useEffect, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutList, Link2, Pencil, Plus, Trash2, Type } from "lucide-react";
import type { Block, Me, PageDetail, PageSummary } from "../../../shared/api-types.js";
import { api, ApiRequestError, errorMessage, useApi } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { Dialog, useConfirm } from "../../components/ui/dialog.js";
import { Field, Input, PrefixInput, Segmented, Select, Textarea } from "../../components/ui/form.js";
import { Card, CardHeader, EmptyState } from "../../components/ui/surface.js";
import { useAction, useToast } from "../../components/ui/toast.js";
import { cx } from "../../lib/cx.js";
import { stripMarkdown } from "../../lib/markdown.js";
import { LivePreview } from "./PhonePreview.js";

type Editing = { kind: "link"; block?: Block } | { kind: "text"; block?: Block } | null;
type LinkSource = "existing" | "new";

// Suggests a button label from a URL, e.g. "https://www.github.com/x" → "github.com".
function hostnameOf(url: string | null | undefined): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

// Groups links by namespace, with the page's own namespace first (admins can link across namespaces).
function groupByNamespace(links: PageSummary[], first: string): [string, PageSummary[]][] {
  const groups = new Map<string, PageSummary[]>([[first, []]]);
  for (const link of links) groups.set(link.namespace, [...(groups.get(link.namespace) ?? []), link]);
  return [...groups].filter(([, l]) => l.length > 0);
}

function BlockDialog({
  editing,
  page,
  me,
  onClose,
  onSaved,
}: {
  editing: Editing;
  page: PageDetail;
  me: Me;
  onClose: () => void;
  onSaved: (blocks: Block[]) => void;
}) {
  const isNewLink = editing?.kind === "link" && !editing.block;
  const pages = useApi<PageSummary[]>(isNewLink ? "/pages" : null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [source, setSource] = useState<LinkSource>("existing");
  const [targetId, setTargetId] = useState("");
  const [dest, setDest] = useState("");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [labelTouched, setLabelTouched] = useState(false);
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    setErrors({});
    setSource("existing");
    setTargetId("");
    setDest("");
    setCode("");
    setLabel(editing?.block?.label ?? "");
    setLabelTouched(!!editing?.block);
    setMarkdown(editing?.block?.markdown ?? "");
  }, [editing]);

  // Same rule as the server: own namespace only, unless admin.
  const targets = (pages.data ?? []).filter((p) => p.kind === "redirect" && (me.isAdmin || p.namespace === page.namespace));
  const noTargets = !!pages.data && targets.length === 0;

  // Without existing links, creating one is the only option.
  useEffect(() => {
    if (noTargets) setSource("new");
  }, [noTargets]);

  if (!editing) return <Dialog open={false} onClose={onClose} title="" />;

  const isNew = !editing.block;
  const suggestLabel = (url: string | null | undefined) => {
    if (!labelTouched) setLabel(hostnameOf(url));
  };

  const body = (): unknown => {
    if (editing.kind === "text") return { kind: "text", markdown };
    if (source === "new") return { kind: "link", label, newLink: { dest: dest.trim(), ...(code.trim() && { code: code.trim() }) } };
    return { kind: "link", label, targetId: Number(targetId) };
  };

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const blocks = editing.block
        ? await api<Block[]>("PATCH", `/blocks/${editing.block.id}`, editing.kind === "text" ? { markdown } : { label })
        : await api<Block[]>("POST", `/pages/${page.id}/blocks`, body());
      onSaved(blocks);
      onClose();
      const created = isNewLink && source === "new" ? blocks[blocks.length - 1]?.target?.path : undefined;
      toast(created ? `Created ${created} and added it` : isNew ? "Block added" : "Block updated");
    } catch (err) {
      // Show validation problems next to the field they belong to.
      const issues = err instanceof ApiRequestError ? err.issues : undefined;
      if (!issues) {
        toast(errorMessage(err), true);
        return;
      }
      const field = (key: string) => (key.startsWith("newLink.") ? key.slice(8) : key);
      setErrors(Object.fromEntries(Object.entries(issues).map(([k, v]) => [field(k), v.join(", ")])));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    editing.kind === "text"
      ? !!markdown.trim()
      : !!label.trim() && (!isNew || (source === "existing" ? !!targetId : !!dest.trim()));

  const prefix = page.namespace ? `/${page.namespace}/` : "/";

  return (
    <Dialog
      open
      onClose={onClose}
      onSubmit={() => void submit()}
      title={editing.kind === "link" ? (isNew ? "Add link button" : "Edit link button") : isNew ? "Add text" : "Edit text"}
      description={editing.kind === "link" && isNew ? "Buttons point at a short link, so every click is counted." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!canSubmit}>
            {isNew ? (source === "new" && editing.kind === "link" ? "Create and add" : "Add") : "Save"}
          </Button>
        </>
      }
    >
      {editing.kind === "link" ? (
        <>
          {isNew && (
            <Segmented
              ariaLabel="Link"
              value={source}
              onChange={(v) => {
                setSource(v);
                setErrors({});
              }}
              options={[
                { value: "existing", label: "Existing link" },
                { value: "new", label: "New link" },
              ]}
            />
          )}

          {isNew && source === "existing" && (
            <Field label="Short link" error={errors.targetId} hint={noTargets ? "You don't have any short links yet. Create a new one instead." : undefined}>
              {(id) => (
                <Select
                  id={id}
                  required
                  value={targetId}
                  disabled={noTargets}
                  onChange={(e) => {
                    setTargetId(e.target.value);
                    suggestLabel(targets.find((t) => String(t.id) === e.target.value)?.dest);
                  }}
                >
                  <option value="">Choose a short link…</option>
                  {groupByNamespace(targets, page.namespace).map(([ns, links]) => (
                    <optgroup key={ns} label={ns ? `/${ns}/` : "Root /"}>
                      {links.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.path} → {p.dest}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {isNew && source === "new" && (
            <>
              <Field label="Destination URL" error={errors.dest}>
                {(id) => (
                  <Input
                    id={id}
                    type="url"
                    required
                    autoFocus
                    placeholder="https://example.com"
                    value={dest}
                    onChange={(e) => {
                      setDest(e.target.value);
                      suggestLabel(e.target.value);
                    }}
                  />
                )}
              </Field>
              <Field label="Shortcode" hint="Optional. Leave empty for a random 5-character code." error={errors.code}>
                {(id) => (
                  <PrefixInput
                    id={id}
                    prefix={prefix}
                    placeholder="random"
                    pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,63}"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                )}
              </Field>
            </>
          )}

          <Field label="Button label" error={errors.label}>
            {(id) => (
              <Input
                id={id}
                required
                autoFocus={!isNew}
                placeholder="My GitHub"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setLabelTouched(true);
                }}
              />
            )}
          </Field>
        </>
      ) : (
        <Field label="Text" hint="Markdown: **bold**, *italic*, [link](https://…), lists and # headings.">
          {(id) => <Textarea id={id} required autoFocus rows={6} value={markdown} onChange={(e) => setMarkdown(e.target.value)} />}
        </Field>
      )}
    </Dialog>
  );
}

function SortableBlock({ block, onEdit, onDelete }: { block: Block; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const isLink = block.kind === "link";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        "flex items-center gap-2 rounded-xl border border-border bg-surface p-2 pr-3",
        isDragging ? "relative z-10 shadow-xl ring-2 ring-accent/30" : "shadow-xs",
      )}
    >
      <button
        className="flex h-9 w-7 cursor-grab touch-none items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span
        className={cx(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          isLink ? "bg-accent-soft text-accent-soft-fg" : "bg-surface-2 text-muted",
        )}
      >
        {isLink ? <Link2 className="size-4" /> : <Type className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{isLink ? block.label : stripMarkdown(block.markdown ?? "")}</div>
        <div className="truncate font-mono text-xs text-muted">{isLink ? block.target?.path : "Text"}</div>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Edit">
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete" className="hover:text-danger">
        <Trash2 />
      </Button>
    </li>
  );
}

export function ContentTab({ page, me, onChange }: { page: PageDetail; me: Me; onChange: (page: PageDetail) => void }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [version, setVersion] = useState(0);
  const { run } = useAction();
  const confirm = useConfirm();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setBlocks = (blocks: Block[]) => {
    onChange({ ...page, blocks });
    setVersion((v) => v + 1);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = page.blocks.map((b) => b.id);
    const reordered = arrayMove(page.blocks, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id)));
    onChange({ ...page, blocks: reordered });
    void run(async () => setBlocks(await api<Block[]>("PUT", `/pages/${page.id}/blocks/order`, { ids: reordered.map((b) => b.id) })));
  };

  const remove = async (block: Block) => {
    const ok = await confirm({
      title: "Remove this block?",
      description: block.kind === "link" ? "The short link itself is kept." : undefined,
      confirmLabel: "Remove",
      danger: true,
    });
    if (ok) void run(async () => setBlocks(await api<Block[]>("DELETE", `/blocks/${block.id}`)), "Block removed");
  };

  const addButtons = (
    <>
      <Button variant="secondary" size="sm" icon={<Type />} onClick={() => setEditing({ kind: "text" })}>
        Text
      </Button>
      <Button size="sm" icon={<Plus />} onClick={() => setEditing({ kind: "link" })}>
        Link button
      </Button>
    </>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card>
        <CardHeader title="Blocks" description="Drag to reorder. Changes are saved immediately." actions={addButtons} />
        {page.blocks.length ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={page.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2 p-4">
                {page.blocks.map((b) => (
                  <SortableBlock key={b.id} block={b} onEdit={() => setEditing({ kind: b.kind, block: b })} onDelete={() => void remove(b)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <EmptyState
            icon={<LayoutList />}
            title="This page is empty"
            description="Add link buttons that point at your short links, or some text."
            action={<div className="flex gap-2">{addButtons}</div>}
          />
        )}
      </Card>

      <div className="hidden lg:block">
        <LivePreview path={page.path} version={version} />
      </div>

      <BlockDialog editing={editing} page={page} me={me} onClose={() => setEditing(null)} onSaved={setBlocks} />
    </div>
  );
}
