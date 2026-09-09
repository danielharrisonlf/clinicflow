import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { Kbd } from "./kbd";

type ToastTone = "success" | "warning" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Presente só enquanto a janela de desfazer do backend estiver aberta. */
  onUndo?: () => void;
}

interface ToastApi {
  push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLE: Record<ToastTone, string> = {
  success: "border-state-concluida/30",
  warning: "border-warning/30",
  error: "border-state-atrasada/30",
};

const TONE_DOT: Record<ToastTone, string> = {
  success: "bg-state-concluida",
  warning: "bg-state-espera-weak",
  error: "bg-state-atrasada",
};

const DISMISS_MS = 6000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  // [Z] desfaz a última ação enquanto o toast estiver na tela — o mesmo atalho
  // que a barra de ações anuncia. Só dispara fora de campo de texto.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "z" && event.key !== "Z") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;

      const undoable = [...toasts].reverse().find((toast) => toast.onUndo);
      if (!undoable?.onUndo) return;
      event.preventDefault();
      undoable.onUndo();
      dismiss(undoable.id);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toasts, dismiss]);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-raised border bg-surface-base p-3 shadow-panel ${TONE_STYLE[toast.tone]}`}
          >
            <span
              className={`mt-1.5 size-2 shrink-0 rounded-full ${TONE_DOT[toast.tone]}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-ink-primary">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="mt-0.5 text-micro text-ink-secondary">
                  {toast.description}
                </p>
              ) : null}
            </div>
            {toast.onUndo ? (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={() => {
                  toast.onUndo?.();
                  dismiss(toast.id);
                }}
              >
                Desfazer <Kbd>Z</Kbd>
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast precisa do ToastProvider acima.");
  return context;
}
