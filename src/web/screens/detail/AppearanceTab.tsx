import { useRef, useState, type ReactNode } from "react";
import { Check, ExternalLink, ImageUp, Trash2 } from "lucide-react";
import type { Me, PageDetail } from "../../../shared/api-types.js";
import type { Theme } from "../../../shared/validation.js";
import { api } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { ColorInput, Field, Input, Segmented, Switch } from "../../components/ui/form.js";
import { Card, CardBody, CardFooter, CardHeader } from "../../components/ui/surface.js";
import { useAction } from "../../components/ui/toast.js";
import { cx } from "../../lib/cx.js";
import { stripMarkdown } from "../../lib/markdown.js";
import { parseCoolorsInput, themeFromPalette, TRENDING_PALETTES, type Variant } from "../../lib/palette.js";
import { PhoneFrame } from "./PhonePreview.js";

const PRESETS: { name: string; theme: Theme }[] = [
  { name: "Midnight", theme: { background: "#111827", text: "#e5e7eb", button: "#475569", buttonText: "#ffffff" } },
  { name: "Paper", theme: { background: "#fafaf9", text: "#1c1917", button: "#1c1917", buttonText: "#fafaf9" } },
];

const COLOR_FIELDS: [keyof Theme, string][] = [
  ["background", "Background"],
  ["text", "Text"],
  ["button", "Buttons"],
  ["buttonText", "Button text"],
];

const sameTheme = (a: Theme, b: Theme) => COLOR_FIELDS.every(([k]) => a[k].toLowerCase() === b[k].toLowerCase());

function OptionCard({ selected, onClick, swatch, label }: { selected: boolean; onClick: () => void; swatch: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "relative cursor-pointer overflow-hidden rounded-xl border text-left transition",
        selected ? "border-accent ring-3 ring-accent/20" : "border-border hover:border-border-strong",
      )}
    >
      {swatch}
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
        <span className="truncate">{label}</span>
        {selected && <Check className="size-4 shrink-0 text-accent" />}
      </div>
    </button>
  );
}

function PaletteStrip({ colors }: { colors: string[] }) {
  return (
    <div className="flex h-14">
      {colors.map((c, i) => (
        <div key={i} className="flex-1" style={{ background: c }} />
      ))}
    </div>
  );
}

function SectionLabel({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-medium">{children}</h3>
      {actions}
    </div>
  );
}

// Theme picker: basic presets, coolors.co palettes (trending or pasted link) and custom colors.
function ThemePicker({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const [variant, setVariant] = useState<Variant>("dark");
  // The palette the current theme was generated from, so switching dark/light can re-map it.
  const [source, setSource] = useState<string[] | null>(null);
  const [link, setLink] = useState("");
  const [imported, setImported] = useState<string[] | null>(null);
  const [linkError, setLinkError] = useState<string>();

  const applyPalette = (colors: string[], v = variant) => {
    setSource(colors);
    onChange(themeFromPalette(colors, v));
  };
  const changeVariant = (v: Variant) => {
    setVariant(v);
    if (source) onChange(themeFromPalette(source, v));
  };
  const importLink = () => {
    const colors = parseCoolorsInput(link);
    if (!colors) {
      setLinkError("That doesn't look like a coolors.co palette link.");
      return;
    }
    setLinkError(undefined);
    setImported(colors);
    applyPalette(colors);
  };

  const isSelected = (colors: string[]) => source === colors && sameTheme(themeFromPalette(colors, variant), theme);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <SectionLabel>Basic</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {PRESETS.map((preset) => (
            <OptionCard
              key={preset.name}
              label={preset.name}
              selected={sameTheme(preset.theme, theme)}
              onClick={() => {
                setSource(null);
                onChange(preset.theme);
              }}
              swatch={
                <div className="flex h-14 flex-col items-center justify-center gap-1.5 px-6" style={{ background: preset.theme.background }}>
                  <div className="h-2.5 w-full rounded-full" style={{ background: preset.theme.button }} />
                  <div className="h-2.5 w-full rounded-full" style={{ background: preset.theme.button }} />
                </div>
              }
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel
          actions={
            <Segmented
              ariaLabel="Background for palettes"
              value={variant}
              onChange={changeVariant}
              options={[
                { value: "dark", label: "Dark background" },
                { value: "light", label: "Light background" },
              ]}
            />
          }
        >
          Trending on{" "}
          <a href="https://coolors.co/palettes/trending" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            coolors.co
          </a>
        </SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {TRENDING_PALETTES.map((p) => (
            <OptionCard
              key={p.name}
              label={p.name}
              selected={isSelected(p.colors)}
              onClick={() => applyPalette(p.colors)}
              swatch={<PaletteStrip colors={p.colors} />}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Import from coolors.co</SectionLabel>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            importLink();
          }}
        >
          <Input
            aria-label="coolors.co link"
            placeholder="https://coolors.co/palette/264653-2a9d8f-e9c46a-f4a261-e76f51"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setLinkError(undefined);
            }}
          />
          <Button type="submit" variant="secondary" disabled={!link.trim()}>
            Apply
          </Button>
        </form>
        {linkError ? (
          <p className="mt-1.5 text-xs text-danger">{linkError}</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            Create or pick a palette on{" "}
            <a href="https://coolors.co/generate" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
              coolors.co <ExternalLink className="size-3" />
            </a>{" "}
            and paste its URL here.
          </p>
        )}
        {imported && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <OptionCard label="Imported palette" selected={isSelected(imported)} onClick={() => applyPalette(imported)} swatch={<PaletteStrip colors={imported} />} />
          </div>
        )}
      </div>

      <div>
        <SectionLabel>Custom colors</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COLOR_FIELDS.map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">{label}</span>
              <ColorInput
                label={label}
                value={theme[key]}
                onChange={(v) => {
                  setSource(null);
                  onChange({ ...theme, [key]: v });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
