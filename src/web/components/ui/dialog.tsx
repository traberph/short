import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "../../lib/cx.js";
import { Button } from "./button.js";

// Modal dialog built on the native <dialog> element (focus trapping, Escape and top layer for free).
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  onSubmit,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** When set, the dialog body is a form and the footer buttons can submit it. */
  onSubmit?: (e: FormEvent) => void;
  size?: "sm" | "md";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const Body = onSubmit ? "form" : "div";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-border bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[2px] open:animate-pop-in",
        size === "sm" ? "max-w-md" : "max-w-lg",
      )}
    >
      {open && (
        <Body
          onSubmit={
            onSubmit &&
            ((e: FormEvent) => {
              e.preventDefault();
              onSubmit(e);
            })
          }
        >
          <div className={cx("flex items-start justify-between gap-4 px-6 pt-5", !children && "pb-5")}>
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {description && <p className="mt-1 text-sm text-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close" className="-mr-2">
              <X />
            </Button>
          </div>
          {children && <div className="flex flex-col gap-4 px-6 py-5">{children}</div>}
          {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t border-border bg-surface-2/50 px-6 py-3">{footer}</div>}
        </Body>
      )}
    </dialog>
  );
}

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

// Promise-based replacement for window.confirm: `if (await confirm({...})) …`
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...options, resolve })), []);
  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        description={state?.description}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={state?.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
              {state?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
