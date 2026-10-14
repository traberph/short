import { useEffect, useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutList, Link2, Pencil, Plus, Trash2, Type } from "lucide-react";
import type { Block, Me, PageDetail, PageSummary } from "../../../shared/api-types.js";
import { api, useApi } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { Dialog, useConfirm } from "../../components/ui/dialog.js";
import { Field, Input, Select, Textarea } from "../../components/ui/form.js";
import { Link } from "../../components/ui/misc.js";
import { Card, CardHeader, EmptyState } from "../../components/ui/surface.js";
import { useAction } from "../../components/ui/toast.js";
import { cx } from "../../lib/cx.js";
import { stripMarkdown } from "../../lib/markdown.js";
import { LivePreview } from "./PhonePreview.js";

type Editing = { kind: "link"; block?: Block } | { kind: "text"; block?: Block } | null;

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
  const pages = useApi<PageSummary[]>(editing?.kind === "link" && !editing.block ? "/pages" : null);
  const { busy, run } = useAction();
  const [targetId, setTargetId] = useState("");
  const [label, setLabel] = useState("");
  const [markdown, setMarkdown] = useState("");

  useEffect(() => {
    setTargetId("");
    setLabel(editing?.block?.label ?? "");
    setMarkdown(editing?.block?.markdown ?? "");
  }, [editing]);

  if (!editing) return <Dialog open={false} onClose={onClose} title="" />;

  // Same rule as the server: own namespace only, unless admin.
  const targets = (pages.data ?? []).filter((p) => p.kind === "redirect" && (me.isAdmin || p.namespace === page.namespace));
  const isNew = !editing.block;

  const submit = () =>
    run(async () => {
      let blocks: Block[];
      if (editing.block) {
        blocks = await api<Block[]>("PATCH", `/blocks/${editing.block.id}`, editing.kind === "text" ? { markdown } : { label });
      } else if (editing.kind === "link") {
        blocks = await api<Block[]>("POST", `/pages/${page.id}/blocks`, { kind: "link", targetId: Number(targetId), label });
      } else {
        blocks = await api<Block[]>("POST", `/pages/${page.id}/blocks`, { kind: "text", markdown });
      }
      onSaved(blocks);
      onClose();
    }, isNew ? "Block added" : "Block updated");

  return (
    <Dialog
      open
      onClose={onClose}
      onSubmit={submit}
      title={editing.kind === "link" ? (isNew ? "Add link button" : "Edit link button") : isNew ? "Add text" : "Edit text"}
      description={editing.kind === "link" ? "Buttons point at one of your short links, so every click is counted." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={editing.kind === "link" ? !label.trim() || (isNew && !targetId) : !markdown.trim()}>
            {isNew ? "Add" : "Save"}
          </Button>
        </>
      }
    >
      {editing.kind === "link" ? (
        <>
          {isNew && (
            <Field
              label="Short link"
              hint={
                pages.data && !targets.length ? (
                  <>
                    You don't have any short links yet.{" "}
                    <Link to="/~/links" className="underline">
                      Create one first
                    </Link>
                    .
                  </>
                ) : undefined
              }
            >
              {(id) => (
                <Select id={id} required value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">Choose a short link…</option>
                  {targets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.path} → {p.dest}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}
          <Field label="Button label">
            {(id) => <Input id={id} required autoFocus={!isNew} placeholder="My GitHub" value={label} onChange={(e) => setLabel(e.target.value)} />}
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
