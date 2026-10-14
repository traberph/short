import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import type { SavedPalette } from "../../../shared/api-types.js";
import type { Theme } from "../../../shared/validation.js";
import { api, errorMessage, useApi } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { useConfirm } from "../../components/ui/dialog.js";
import { ColorInput, Input } from "../../components/ui/form.js";
import { useToast } from "../../components/ui/toast.js";
import { cx } from "../../lib/cx.js";
import { parseCoolorsInput, themeFromPalette, TRENDING_PALETTES, type Variant } from "../../lib/palette.js";

export const COLOR_FIELDS: [keyof Theme, string][] = [
  ["background", "Background"],
  ["text", "Text"],
  ["button", "Buttons"],
  ["buttonText", "Button text"],
];

export const sameTheme = (a: Theme, b: Theme) => COLOR_FIELDS.every(([k]) => a[k].toLowerCase() === b[k].toLowerCase());

const PRESETS: { name: string; theme: Theme }[] = [
  { name: "Midnight", theme: { background: "#111827", text: "#e5e7eb", button: "#475569", buttonText: "#ffffff" } },
  { name: "Paper", theme: { background: "#fafaf9", text: "#1c1917", button: "#1c1917", buttonText: "#fafaf9" } },
];

const paletteKey = (colors: string[]) => colors.join("-").toLowerCase();

const cardClass = (selected: boolean) =>
  cx(
    "relative overflow-hidden rounded-xl border transition",
    selected ? "border-accent ring-3 ring-accent/20" : "border-border hover:border-border-strong",
  );

function SectionLabel({ children, actions, hint }: { children: ReactNode; actions?: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h3 className="text-sm font-medium">{children}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {actions}
    </div>
  );
}

function PresetCard({ name, theme, selected, onClick }: { name: string; theme: Theme; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cx(cardClass(selected), "cursor-pointer text-left")}>
      <div className="flex h-14 flex-col items-center justify-center gap-1.5 px-6" style={{ background: theme.background }}>
        <div className="h-2.5 w-full rounded-full" style={{ background: theme.button }} />
        <div className="h-2.5 w-full rounded-full" style={{ background: theme.button }} />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
        <span className="truncate">{name}</span>
        {selected && <Check className="size-4 shrink-0 text-accent" />}
      </div>
    </button>
  );
}

// Miniature of a link page (background, a text line and a button) that applies one version of a palette.
function VariantThumb({ theme, label, selected, onClick }: { theme: Theme; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cx(
        "flex h-8 w-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border px-1.5 transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        selected ? "border-accent ring-2 ring-accent/40" : "border-border hover:scale-105 hover:border-border-strong",
      )}
      style={{ background: theme.background }}
    >
      <span className="h-1 w-3/5 rounded-full" style={{ background: theme.text }} />
      <span className="h-2 w-full rounded-sm" style={{ background: theme.button }} />
    </button>
  );
}

// A palette: each color opens the role menu, the two thumbnails apply a dark or light version of it.
function PaletteCard({
  colors,
  label,
  selected,
  onApply,
  onPickColor,
  onRemove,
}: {
  colors: string[];
  label: string;
  selected: Variant | null;
  onApply: (variant: Variant) => void;
  onPickColor: (color: string, anchor: HTMLElement) => void;
  onRemove?: () => void;
}) {
  return (
    <div className={cardClass(selected !== null)}>
      <div className="flex h-12">
        {colors.map((c, i) => (
          <button
            key={i}
            type="button"
            aria-haspopup="menu"
            aria-label={`${c.toUpperCase()}: use for one color`}
            title={c.toUpperCase()}
            onClick={(e) => onPickColor(c, e.currentTarget)}
            className="flex-1 cursor-pointer transition-[flex-grow] duration-150 hover:grow-[1.8] focus-visible:grow-[1.8] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 py-2 pr-2 pl-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
        {(["dark", "light"] as const).map((v) => (
          <VariantThumb
            key={v}
            theme={themeFromPalette(colors, v)}
            label={`Use ${label} with a ${v} background`}
            selected={selected === v}
            onClick={() => onApply(v)}
          />
        ))}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            title="Remove palette"
            className="ml-0.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Small menu next to a clicked color: "use as background / text / buttons / button text".
function ColorRoleMenu({
  color,
  anchor,
  theme,
  onPick,
  onClose,
}: {
  color: string;
  anchor: HTMLElement;
  theme: Theme;
  onPick: (role: keyof Theme) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Place below the color (or above when there's no room), kept inside the viewport.
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const a = anchor.getBoundingClientRect();
    const { width, height } = menu.getBoundingClientRect();
    const below = a.bottom + 6;
    const top = below + height > innerHeight - 8 ? Math.max(8, a.top - height - 6) : below;
    const left = Math.min(Math.max(8, a.left + a.width / 2 - width / 2), innerWidth - width - 8);
    setPosition({ top, left });
  }, [anchor]);

  // Focus the first item once the menu is visible (hidden elements can't take focus).
  useEffect(() => {
    if (position) ref.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus({ preventScroll: true });
  }, [position]);

  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && e.target !== anchor) onClose();
    };
    const dismiss = () => onClose();
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      onClose();
      anchor.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [anchor, onClose]);

  const onKeyDown = (e: KeyboardEvent) => {
    const items = [...(ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Use ${color.toUpperCase()} for`}
      onKeyDown={onKeyDown}
      className="fixed z-50 w-56 animate-pop-in rounded-xl border border-border bg-surface p-1 shadow-xl"
      style={position ?? { visibility: "hidden", top: 0, left: 0 }}
    >
      <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-2 text-xs text-muted">
        <span className="size-4 rounded border border-border" style={{ background: color }} />
        <span className="font-mono uppercase">{color}</span>
        <span>use for…</span>
      </div>
      {COLOR_FIELDS.map(([key, label]) => {
        const current = theme[key].toLowerCase() === color.toLowerCase();
        return (
          <button
            key={key}
            type="button"
            role="menuitem"
            onClick={() => onPick(key)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
          >
            <span className="size-4 rounded border border-border" style={{ background: theme[key] }} title={`Current: ${theme[key]}`} />
            <span className="flex-1">{label}</span>
            {current && <Check className="size-4 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}

// Theme picker: basic presets, trending and saved coolors.co palettes, and custom colors.
export function ThemePicker({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const saved = useApi<SavedPalette[]>("/palettes");
  const toast = useToast();
  const confirm = useConfirm();
  // The palette version the current theme was generated from, to mark it as selected.
  const [source, setSource] = useState<{ colors: string[]; variant: Variant } | null>(null);
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string>();
  const [importing, setImporting] = useState(false);
  const [menu, setMenu] = useState<{ color: string; anchor: HTMLElement } | null>(null);

  const toggleMenu = (color: string, anchor: HTMLElement) => setMenu((m) => (m?.anchor === anchor ? null : { color, anchor }));

  const applyPalette = (colors: string[], variant: Variant) => {
    setSource({ colors, variant });
    onChange(themeFromPalette(colors, variant));
  };
  const setColor = (role: keyof Theme, color: string) => {
    setSource(null);
    onChange({ ...theme, [role]: color });
  };

  // Which version of this palette is in use, if any (editing a single color deselects it).
  const selectedVariant = (colors: string[]): Variant | null =>
    source && paletteKey(source.colors) === paletteKey(colors) && sameTheme(themeFromPalette(colors, source.variant), theme)
      ? source.variant
      : null;

  const importLink = async () => {
    const colors = parseCoolorsInput(link);
    if (!colors) {
      setLinkError("That doesn't look like a coolors.co palette link.");
      return;
    }
    setImporting(true);
    try {
      await api<SavedPalette>("POST", "/palettes", { colors });
      await saved.reload();
      applyPalette(colors, "dark");
      setLink("");
      setLinkError(undefined);
    } catch (err) {
      setLinkError(errorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const removePalette = async (palette: SavedPalette) => {
    const ok = await confirm({ title: "Remove this palette?", description: "Pages that already use its colors keep them.", confirmLabel: "Remove", danger: true });
    if (!ok) return;
    try {
      await api("DELETE", `/palettes/${palette.id}`);
      await saved.reload();
      toast("Palette removed");
    } catch (err) {
      toast(errorMessage(err), true);
    }
  };

  const pickHint = "Pick the dark or light version of a palette, or click a single color to use it for one part.";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <SectionLabel>Basic</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {PRESETS.map((preset) => (
            <PresetCard
              key={preset.name}
              name={preset.name}
              theme={preset.theme}
              selected={sameTheme(preset.theme, theme)}
              onClick={() => {
                setSource(null);
                onChange(preset.theme);
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel hint={pickHint}>
          Trending on{" "}
          <a href="https://coolors.co/palettes/trending" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            coolors.co
          </a>
        </SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          {TRENDING_PALETTES.map((p) => (
            <PaletteCard
              key={p.name}
              label={p.name}
              colors={p.colors}
              selected={selectedVariant(p.colors)}
              onApply={(v) => applyPalette(p.colors, v)}
              onPickColor={toggleMenu}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel hint="Paste a coolors.co palette link to save it to your palettes.">Your palettes</SectionLabel>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void importLink();
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
          <Button type="submit" variant="secondary" loading={importing} disabled={!link.trim()}>
            Import
          </Button>
        </form>
        {linkError ? (
          <p className="mt-1.5 text-xs text-danger">{linkError}</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            Find a palette on{" "}
            <a href="https://coolors.co/palettes" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
              coolors.co <ExternalLink className="size-3" />
            </a>{" "}
            and paste its URL here.
          </p>
        )}
        {!!saved.data?.length && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {saved.data.map((p) => (
              <PaletteCard
                key={p.id}
                label={`Imported ${new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
                colors={p.colors}
                selected={selectedVariant(p.colors)}
                onApply={(v) => applyPalette(p.colors, v)}
                onPickColor={toggleMenu}
                onRemove={() => void removePalette(p)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel>Custom colors</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COLOR_FIELDS.map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-xs text-muted">{label}</span>
              <ColorInput label={label} value={theme[key]} onChange={(v) => setColor(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {menu && (
        <ColorRoleMenu
          color={menu.color}
          anchor={menu.anchor}
          theme={theme}
          onClose={() => setMenu(null)}
          onPick={(role) => {
            setColor(role, menu.color);
            setMenu(null);
            menu.anchor.focus();
          }}
        />
      )}
    </div>
  );
}
