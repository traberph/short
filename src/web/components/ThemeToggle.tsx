import { Monitor, Moon, Sun } from "lucide-react";
import { cx } from "../lib/cx.js";
import { setThemePreference, useThemePreference, type ThemePreference } from "../lib/theme.js";
import { Button } from "./ui/button.js";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

// Three-way switch for the sidebar.
export function ThemeSwitch() {
  const current = useThemePreference();
  return (
    <div role="radiogroup" aria-label="Color mode" className="flex rounded-lg border border-border bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={current === value}
          title={label}
          onClick={() => setThemePreference(value)}
          className={cx(
            "flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition",
            current === value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

// Compact button that cycles system → light → dark, for the mobile top bar.
export function ThemeCycleButton() {
  const current = useThemePreference();
  const index = OPTIONS.findIndex((o) => o.value === current);
  const { icon: Icon, label } = OPTIONS[index]!;
  const next = OPTIONS[(index + 1) % OPTIONS.length]!;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setThemePreference(next.value)}
      aria-label={`Color mode: ${label}. Switch to ${next.label}`}
      title={`Color mode: ${label}`}
    >
      <Icon />
    </Button>
  );
}
