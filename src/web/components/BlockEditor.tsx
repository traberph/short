import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block, PageSummary } from "../../shared/api-types.js";
import { api, useApi } from "../api.js";
import { useAction } from "./ui.js";

function SortableBlock({ block, onChange }: { block: Block; onChange: (blocks: Block[]) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(block.kind === "text" ? (block.markdown ?? "") : (block.label ?? ""));
  const { busy, run } = useAction();

  const save = () =>
    run(async () => {
      onChange(await api<Block[]>("PATCH", `/blocks/${block.id}`, block.kind === "text" ? { markdown: text } : { label: text }));
      setEditing(false);
    });
  const remove = () => run(async () => onChange(await api<Block[]>("DELETE", `/blocks/${block.id}`)));

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-3 rounded bg-gray-800 p-3 ${isDragging ? "relative z-10 opacity-80 shadow-lg" : ""}`}
    >
      <button className="cursor-grab touch-none px-1 text-gray-500" aria-label="Drag to reorder" {...attributes} {...listeners}>
        ⠿
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500 uppercase">{block.kind === "text" ? "Text" : `Link → ${block.target?.path}`}</div>
        {editing ? (
          block.kind === "text" ? (
            <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
          ) : (
            <input value={text} onChange={(e) => setText(e.target.value)} />
          )
        ) : (
          <div className="truncate whitespace-pre-wrap text-white">{block.kind === "text" ? block.markdown : block.label}</div>
        )}
      </div>
      <div className="flex gap-2">
        {editing ? (
          <button className="btn px-2 py-1 text-sm" onClick={save} disabled={busy}>
            Save
          </button>
        ) : (
          <button className="btn btn-secondary px-2 py-1 text-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        <button className="btn btn-danger px-2 py-1 text-sm" onClick={remove} disabled={busy}>
          ✕
        </button>
      </div>
    </div>
  );
}

export function BlockEditor({
  pageId,
  namespace,
  isAdmin,
  blocks,
  onChange,
}: {
  pageId: number;
  namespace: string;
  isAdmin: boolean;
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const pages = useApi<PageSummary[]>("/pages");
  const { busy, run } = useAction();
  const [targetId, setTargetId] = useState("");
  const [label, setLabel] = useState("");
  const [markdown, setMarkdown] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Same rule as the server: own namespace only, unless admin.
  const targets = (pages.data ?? []).filter((p) => p.kind === "redirect" && (isAdmin || p.namespace === namespace));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const reordered = arrayMove(
      blocks,
      blocks.findIndex((b) => b.id === active.id),
      blocks.findIndex((b) => b.id === over.id),
    );
    onChange(reordered);
    void run(async () => onChange(await api<Block[]>("PUT", `/pages/${pageId}/blocks/order`, { ids: reordered.map((b) => b.id) })));
  };

  const addLink = () =>
    run(async () => {
      onChange(await api<Block[]>("POST", `/pages/${pageId}/blocks`, { kind: "link", targetId: Number(targetId), label }));
      setTargetId("");
      setLabel("");
    });
  const addText = () =>
    run(async () => {
      onChange(await api<Block[]>("POST", `/pages/${pageId}/blocks`, { kind: "text", markdown }));
      setMarkdown("");
    });

  return (
    <section className="card">
      <h2 className="mb-4">Blocks</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {blocks.map((b) => (
              <SortableBlock key={b.id} block={b} onChange={onChange} />
            ))}
            {!blocks.length && <p className="text-gray-500">No blocks yet.</p>}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-semibold text-white">Add link button</h3>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="mb-2">
            <option value="">Choose a short link…</option>
            {targets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.path} → {p.dest}
              </option>
            ))}
          </select>
          <input className="mb-2" placeholder="Button label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button className="btn" onClick={addLink} disabled={busy || !targetId || !label.trim()}>
            Add link
          </button>
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-white">Add text</h3>
          <textarea
            className="mb-2"
            rows={3}
            placeholder="**Markdown** is supported: bold, italic, links, lists, headings"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
          />
          <button className="btn" onClick={addText} disabled={busy || !markdown.trim()}>
            Add text
          </button>
        </div>
      </div>
    </section>
  );
}
