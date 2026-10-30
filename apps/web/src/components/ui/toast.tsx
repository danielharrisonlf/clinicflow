import { CircleAlert, CircleCheck, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Kbd } from "./kbd";
import { overlayOpen } from "./overlay";

type ToastTone = "success" | "warning" | "error";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Presente só enquanto a janela de desfazer do backend estiver aberta. */
  onUndo?: () => void;
  /** Ação de continuação: "Ver nova consulta". */
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE: Record<
  ToastTone,
  { icon: typeof CircleCheck; ink: string; ms: number }
> = {
  success: { icon: CircleCheck, ink: "text-success", ms: 6000 },
  warning: { icon: TriangleAlert, ink: "text-warning", ms: 8000 },
  // Erro fica mais: quem estava olhando o paciente precisa de tempo para ler.
  error: { icon: CircleAlert, ink: "text-danger", ms: 10000 },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
  }, []);

  // [Z] desfaz a última ação enquanto o aviso estiver na tela — o mesmo atalho
  // que o botão anuncia. Fora de campo de texto e sem diálogo aberto por cima.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "z" && event.key !== "Z") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (overlayOpen()) return;

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
      {createPortal(
        <div
          data-overlay-persist=""
          className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--spacing-bottom-nav)+0.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
        >
          <div className="sr-only" role="status" aria-live="polite">
            {toasts
              .filter((toast) => toast.tone !== "error")
              .map((toast) => `${toast.title}. ${toast.description ?? ""}`)
              .join(" ")}
          </div>
          <div className="sr-only" role="alert">
            {toasts
              .filter((toast) => toast.tone === "error")
              .map((toast) => `${toast.title}. ${toast.description ?? ""}`)
              .join(" ")}
          </div>
          {toasts.map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const tone = TONE[toast.tone];
  const Icon = tone.icon;
  const [paused, setPaused] = useState(false);
  const remaining = useRef(tone.ms);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Pausa com o ponteiro ou o foco em cima: ninguém perde o "Desfazer" lendo.
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(
      () => onDismissRef.current(),
      remaining.current,
    );
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pausar o tempo no hover/foco não é interação, é cortesia de leitura
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-raised border border-border-default bg-surface-raised p-3 pr-2 shadow-overlay animate-toast"
    >
      <Icon
        className={cn("mt-0.5 size-5 shrink-0", tone.ink)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink-primary">
          {toast.title}
        </p>
        {toast.description ? (
          <p className="mt-0.5 text-label text-ink-secondary">
            {toast.description}
          </p>
        ) : null}
        {toast.onUndo || toast.action ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {toast.onUndo ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  toast.onUndo?.();
                  onDismiss();
                }}
              >
                Desfazer <Kbd className="max-sm:hidden">Z</Kbd>
              </Button>
            ) : null}
            {toast.action ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss();
                }}
              >
                {toast.action.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dispensar aviso"
        className="flex size-8 shrink-0 items-center justify-center rounded-marker text-ink-tertiary transition-colors hover:bg-surface-sunken hover:text-ink-primary pointer-coarse:size-11"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast precisa do ToastProvider acima.");
  return context;
}
