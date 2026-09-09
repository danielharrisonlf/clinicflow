import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Painel lateral, não modal. Reagendar e cancelar precisam que a grade do fundo
 * continue visível — a pessoa está conferindo o encaixe enquanto decide. Modal
 * aqui seria interrupção sem foco protegido a ganhar.
 *
 * Vira sheet ancorado no rodapé abaixo de 640px, onde 540px de painel lateral
 * não cabem.
 */
export function SidePanel({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    // O primeiro campo recebe o foco: quem abriu o painel já quer digitar.
    panelRef.current
      ?.querySelector<HTMLElement>("input, select, textarea, button")
      ?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="absolute inset-0 bg-ink-primary/30"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-modal bg-surface-base shadow-panel sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[min(540px,100vw)] sm:max-h-none sm:rounded-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border-subtle p-4">
          <div>
            <h2 className="text-section font-semibold text-ink-primary">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-micro text-ink-secondary">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-11 shrink-0 items-center justify-center rounded-control text-ink-secondary transition-colors hover:bg-surface-sunken"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
