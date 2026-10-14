import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { errorMessage } from "../../api.js";

type Toast = { id: number; message: string; error: boolean };
const ToastContext = createContext<(message: string, error?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string, error = false) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, error }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), error ? 5000 : 3000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:right-6 lg:bottom-6 lg:left-auto lg:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-sm animate-pop-in items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-lg"
          >
            {t.error ? <CircleAlert className="size-4 shrink-0 text-danger" /> : <CircleCheck className="size-4 shrink-0 text-success" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// Runs an async action with a busy flag and reports the outcome as a toast.
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (action: () => Promise<unknown>, success?: string): Promise<boolean> => {
      setBusy(true);
      try {
        await action();
        if (success) toast(success);
        return true;
      } catch (err) {
        toast(errorMessage(err), true);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );
  return { busy, run };
}
