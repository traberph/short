import { useRef, useState } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import type { Me, PageDetail } from "../../../shared/api-types.js";
import type { Theme } from "../../../shared/validation.js";
import { api } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { Field, Input, Switch } from "../../components/ui/form.js";
import { Card, CardBody, CardFooter, CardHeader } from "../../components/ui/surface.js";
import { useAction } from "../../components/ui/toast.js";
import { stripMarkdown } from "../../lib/markdown.js";
import { PhoneFrame } from "./PhonePreview.js";
import { sameTheme, ThemePicker } from "./ThemePicker.js";

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

export function AppearanceTab({ page, me, onChange }: { page: PageDetail; me: Me; onChange: (page: PageDetail) => void }) {
  const [title, setTitle] = useState(page.title ?? "");
  const [theme, setTheme] = useState(page.theme);
  const [showLogos, setShowLogos] = useState(page.showLogos);
  const { busy, run } = useAction();
  const upload = useAction();
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = title !== (page.title ?? "") || !sameTheme(theme, page.theme) || showLogos !== page.showLogos;

  const save = () => run(async () => onChange(await api<PageDetail>("PATCH", `/pages/${page.id}`, { title, theme, showLogos })), "Appearance saved");

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
          <CardHeader title="Theme" description="Pick a preset, use a palette from coolors.co or set your own colors." />
          <CardBody className="flex flex-col gap-7">
            <ThemePicker theme={theme} onChange={setTheme} />
            <div className="border-t border-border pt-6">
              <Switch
                label="Website logos"
                checked={me.logoDev && showLogos}
                onChange={setShowLogos}
                disabled={!me.logoDev}
                description={
                  me.logoDev ? (
                    <>
                      Show the logo of each link's website on its button, provided by{" "}
                      <a href="https://logo.dev" target="_blank" rel="noreferrer" className="underline">
                        logo.dev
                      </a>
                      . When off, buttons show the first letter instead and the logo.dev credit is hidden.
                    </>
                  ) : (
                    "Not available on this server. An admin can enable it by setting LOGO_DEV_TOKEN."
                  )
                }
              />
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
                setShowLogos(page.showLogos);
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
