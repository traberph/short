import { useRef, useState } from "react";
import { Check, ImageUp, Trash2 } from "lucide-react";
import type { PageDetail } from "../../../shared/api-types.js";
import type { Theme } from "../../../shared/validation.js";
import { api } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { ColorInput, Field, Input } from "../../components/ui/form.js";
import { Card, CardBody, CardFooter, CardHeader } from "../../components/ui/surface.js";
import { useAction } from "../../components/ui/toast.js";
import { cx } from "../../lib/cx.js";
import { stripMarkdown } from "../../lib/markdown.js";
import { PhoneFrame } from "./PhonePreview.js";

const PRESETS: { name: string; theme: Theme }[] = [
  { name: "Midnight", theme: { background: "#111827", text: "#e5e7eb", button: "#475569", buttonText: "#ffffff" } },
  { name: "Paper", theme: { background: "#fafaf9", text: "#1c1917", button: "#1c1917", buttonText: "#fafaf9" } },
  { name: "Violet", theme: { background: "#2e1065", text: "#ede9fe", button: "#7c3aed", buttonText: "#ffffff" } },
  { name: "Forest", theme: { background: "#052e16", text: "#dcfce7", button: "#15803d", buttonText: "#ffffff" } },
  { name: "Sunset", theme: { background: "#431407", text: "#ffedd5", button: "#ea580c", buttonText: "#ffffff" } },
  { name: "Ocean", theme: { background: "#082f49", text: "#e0f2fe", button: "#0284c7", buttonText: "#ffffff" } },
];

const COLOR_FIELDS: [keyof Theme, string][] = [
  ["background", "Background"],
  ["text", "Text"],
  ["button", "Buttons"],
  ["buttonText", "Button text"],
];

const sameTheme = (a: Theme, b: Theme) => COLOR_FIELDS.every(([k]) => a[k].toLowerCase() === b[k].toLowerCase());

// Renders the page with unsaved settings so changes are visible while editing.
function MockPreview({ title, avatarUrl, theme, page }: { title: string; avatarUrl: string | null; theme: Theme; page: PageDetail }) {
  return (
    <PhoneFrame caption="Preview of unsaved changes">
      <div className="absolute inset-0 overflow-y-auto px-5 py-10 text-center" style={{ background: theme.background, color: theme.text }}>
        {avatarUrl && <img src={avatarUrl} alt="" className="mx-auto size-20 rounded-full object-cover" />}
        <div className="mt-4 mb-6 text-xl font-bold">{title || "Untitled"}</div>
        <div className="flex flex-col gap-2.5">
          {page.blocks.map((b) =>
            b.kind === "link" ? (
              <div key={b.id} className="rounded-lg px-3 py-2.5 text-sm font-semibold" style={{ background: theme.button, color: theme.buttonText }}>
                {b.label}
              </div>
            ) : (
              <p key={b.id} className="line-clamp-3 text-sm opacity-90">
                {stripMarkdown(b.markdown ?? "")}
              </p>
            ),
          )}
          {!page.blocks.length &&
            [0, 1, 2].map((i) => <div key={i} className="h-10 rounded-lg opacity-60" style={{ background: theme.button }} />)}
        </div>
      </div>
    </PhoneFrame>
  );
}

export function AppearanceTab({ page, onChange }: { page: PageDetail; onChange: (page: PageDetail) => void }) {
  const [title, setTitle] = useState(page.title ?? "");
  const [theme, setTheme] = useState(page.theme);
  const { busy, run } = useAction();
  const upload = useAction();
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = title !== (page.title ?? "") || !sameTheme(theme, page.theme);

  const save = () => run(async () => onChange(await api<PageDetail>("PATCH", `/pages/${page.id}`, { title, theme })), "Appearance saved");

  const uploadAvatar = (file: File | undefined) => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    void upload.run(async () => {
      const { avatarUrl } = await api<{ avatarUrl: string }>("PUT", `/pages/${page.id}/avatar`, form);
      onChange({ ...page, avatarUrl });
    }, "Avatar updated");
  };
  const removeAvatar = () =>
    upload.run(async () => {
      await api("DELETE", `/pages/${page.id}/avatar`);
      onChange({ ...page, avatarUrl: null });
    }, "Avatar removed");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Profile" description="Shown at the top of the page." />
          <CardBody className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              {page.avatarUrl ? (
                <img src={page.avatarUrl} alt="" className="size-16 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-full border border-dashed border-border-strong text-muted">
                  <ImageUp className="size-5" />
                </span>
              )}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" loading={upload.busy} icon={<ImageUp />} onClick={() => fileInput.current?.click()}>
                    {page.avatarUrl ? "Replace" : "Upload avatar"}
                  </Button>
                  {page.avatarUrl && (
                    <Button variant="ghost" size="sm" icon={<Trash2 />} onClick={() => void removeAvatar()}>
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted">PNG, JPEG or WebP, up to 2 MB. Square images work best.</p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  uploadAvatar(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <Field label="Title">{(id) => <Input id={id} required value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Theme" description="Pick a preset or set your own colors." />
          <CardBody className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PRESETS.map((preset) => {
                const selected = sameTheme(preset.theme, theme);
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setTheme(preset.theme)}
                    className={cx(
                      "relative cursor-pointer overflow-hidden rounded-xl border text-left transition",
                      selected ? "border-accent ring-3 ring-accent/20" : "border-border hover:border-border-strong",
                    )}
                  >
                    <div className="flex h-16 flex-col items-center justify-center gap-1.5 px-6" style={{ background: preset.theme.background }}>
                      <div className="h-2.5 w-full rounded-full" style={{ background: preset.theme.button }} />
                      <div className="h-2.5 w-full rounded-full" style={{ background: preset.theme.button }} />
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 text-sm font-medium">
                      {preset.name}
                      {selected && <Check className="size-4 text-accent" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {COLOR_FIELDS.map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">{label}</span>
                  <ColorInput label={label} value={theme[key]} onChange={(v) => setTheme({ ...theme, [key]: v })} />
                </div>
              ))}
            </div>
          </CardBody>
          <CardFooter>
            {dirty && <span className="mr-auto text-sm text-muted">Unsaved changes</span>}
            <Button
              variant="secondary"
              disabled={!dirty}
              onClick={() => {
                setTitle(page.title ?? "");
                setTheme(page.theme);
              }}
            >
              Discard
            </Button>
            <Button onClick={() => void save()} loading={busy} disabled={!dirty || !title.trim()}>
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="hidden lg:block">
        <MockPreview title={title} avatarUrl={page.avatarUrl} theme={theme} page={page} />
      </div>
    </div>
  );
}
