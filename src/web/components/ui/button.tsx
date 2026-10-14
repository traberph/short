import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cx } from "../../lib/cx.js";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg shadow-sm hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-fg shadow-xs hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg",
  danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  icon: "size-9",
  "icon-sm": "size-8",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cx(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant, size, loading, icon, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? <LoaderCircle className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
