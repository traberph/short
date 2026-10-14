import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "../../lib/cx.js";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-xs text-danger">{error}</p> : hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("control h-9", className)} {...props} />;
}

// An input with a fixed, non-editable prefix such as "/alice/".
export function PrefixInput({ prefix, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { prefix: string }) {
  return (
    <div className="flex rounded-lg shadow-xs focus-within:ring-3 focus-within:ring-accent/20">
      <span className="flex max-w-[55%] items-center overflow-hidden rounded-l-lg border border-r-0 border-border bg-surface-2 px-3 font-mono text-xs text-muted">
        {prefix}
      </span>
      <input className={cx("control h-9 rounded-l-none font-mono shadow-none focus:ring-0", className)} {...props} />
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("control min-h-24 resize-y py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx("control h-9 cursor-pointer appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

// A row of mutually exclusive options, e.g. "7d / 30d / 90d".
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex w-fit rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-7 cursor-pointer rounded-md px-3 text-sm font-medium transition",
            o.value === value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1 pr-3 shadow-xs">
      <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border" style={{ background: value }}>
        <span className="sr-only">{label}</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <span className="font-mono text-xs text-muted uppercase">{value}</span>
    </div>
  );
}
