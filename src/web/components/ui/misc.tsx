import { useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cx } from "../../lib/cx.js";
import { linkHandler } from "../../router.js";
import { Button } from "./button.js";
import { useToast } from "./toast.js";

// In-app link: a normal <a> that navigates without a page reload.
export function Link({ to, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return <a href={to} onClick={linkHandler(to)} {...rest} />;
}

export function publicUrl(path: string): string {
  return `${location.origin}${path}`;
}

export function CopyButton({ value, label, size = "icon-sm" }: { value: string; label?: string; size?: "icon-sm" | "sm" }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Couldn't access the clipboard", true);
    }
  };
  return (
    <Button
      variant={label ? "secondary" : "ghost"}
      size={label ? "sm" : size}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void copy();
      }}
      aria-label={label ?? "Copy"}
      title="Copy URL"
      icon={copied ? <Check className="text-success" /> : <Copy />}
    >
      {label && (copied ? "Copied" : label)}
    </Button>
  );
}

// Website favicon placeholder: the first letter of the destination's hostname.
export function DomainIcon({ url, className }: { url: string | null; className?: string }) {
  let host = "";
  try {
    host = url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    // Keep the placeholder.
  }
  return (
    <span
      className={cx(
        "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-xs font-semibold text-muted uppercase",
        className,
      )}
      aria-hidden
    >
      {host.charAt(0) || "?"}
    </span>
  );
}

export function Tabs({ tabs, active }: { tabs: { id: string; label: string; to: string; icon?: ReactNode }[]; active: string }) {
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0" aria-label="Sections">
      <div className="flex gap-1">
        {tabs.map((t) => (
          <Link
            key={t.id}
            to={t.to}
            aria-current={t.id === active ? "page" : undefined}
            className={cx(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors [&_svg]:size-4",
              t.id === active ? "border-accent text-fg" : "border-transparent text-muted hover:border-border-strong hover:text-fg",
            )}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Stat({ label, value, icon, hint }: { label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-3 shadow-xs sm:p-4">
      <div className="flex items-center justify-between gap-2 truncate text-xs text-muted sm:text-sm [&_svg]:hidden [&_svg]:size-4 sm:[&_svg]:block">
        {label}
        {icon}
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-fg tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="mt-1 truncate text-xs text-muted">{hint}</div>}
    </div>
  );
}
