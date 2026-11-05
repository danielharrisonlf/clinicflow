import { X } from "lucide-react";
import type * as React from "react";
import { useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { IconButton } from "./button";

/**
 * Motor único de sobreposição (diálogo, painel lateral, folha inferior, paleta).
 *
 * - Portal no `body` e `inert` em tudo o que fica atrás: Tab e leitor de tela
 *   não escapam para a tela de baixo.
 * - Pilha: Esc fecha só a camada do topo (a paleta aberta sobre um painel não
 *   derruba os dois).
 * - Foco entra no primeiro campo (ou em `[data-autofocus]`) e volta para quem
 *   abriu quando fecha.
 * - `onClose` fica numa ref: re-render do pai (refetch, relógio) não reexecuta
 *   o efeito e não rouba o foco de quem está digitando.
 */

const stack: string[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useOverlay(
  open: boolean,
  onClose: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
  options: { initialFocus?: "field" | "container" } = {},
) {
  const id = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const initialFocus = options.initialFocus ?? "field";

  useLayoutEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    stack.push(id);

    // Tudo no body que não é esta camada nem região de aviso fica inerte.
    const touched: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.contains(container)) continue;
      if (child.dataset.overlayPersist !== undefined) continue;
      if (child.inert) continue;
      child.inert = true;
      touched.push(child);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const target =
      container.querySelector<HTMLElement>("[data-autofocus]") ??
      (initialFocus === "field"
        ? container.querySelector<HTMLElement>(
            "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])",
          )
        : null) ??
      container;
    // Em toque, focar campo abre o teclado e cobre metade da folha.
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    (coarse && target !== container ? container : target).focus({
      preventScroll: true,
    });

    function onKeyDown(event: KeyboardEvent) {
      if (stack.at(-1) !== id) return;
      if (event.key === "Escape") {
        // Fase de bolha + `defaultPrevented`: uma lista aberta dentro do
        // diálogo (busca de paciente) fecha primeiro e consome o Esc.
        if (event.defaultPrevented) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !container) return;
      const items = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === container)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === container) {
        event.preventDefault();
        first?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = stack.lastIndexOf(id);
      if (index !== -1) stack.splice(index, 1);
      for (const child of touched) child.inert = false;
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, id, containerRef, initialFocus]);
}

/** Existe alguma sobreposição aberta? Atalhos globais param quando sim. */
export function overlayOpen(): boolean {
  return stack.length > 0;
}

type Variant = "dialog" | "sheet";

/**
 * Diálogo centrado (desktop) que vira folha inferior no celular, ou painel
 * lateral (`variant="sheet"`) que também vira folha inferior no celular.
 */
export function Overlay({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = "dialog",
  size = "md",
  role = "dialog",
  initialFocus,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Barra de ações fixa no rodapé — fica visível mesmo com o corpo rolando. */
  footer?: React.ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  role?: "dialog" | "alertdialog";
  initialFocus?: "field" | "container";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useOverlay(open, onClose, ref, { initialFocus });

  if (!open) return null;

  const sheet = variant === "sheet";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center",
        sheet ? "sm:items-stretch sm:justify-end" : "sm:items-center",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-scrim animate-fade"
      />
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role é dialog ou alertdialog, ambos aceitam aria-modal */}
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          // Camada sobreposta: o único lugar (com a paleta e o header móvel)
          // onde o vidro entra.
          "relative flex max-h-[92dvh] w-full flex-col border border-border-subtle bg-surface-glass shadow-overlay outline-none backdrop-blur-md",
          "rounded-t-modal animate-sheet-up",
          sheet
            ? "sm:h-dvh sm:max-h-dvh sm:w-panel sm:max-w-[calc(100vw-2rem)] sm:rounded-none sm:rounded-l-modal sm:animate-sheet-left"
            : cn(
                "sm:mx-4 sm:rounded-modal sm:animate-pop",
                size === "sm" && "sm:max-w-md",
                size === "md" && "sm:max-w-lg",
                size === "lg" && "sm:max-w-2xl",
              ),
          className,
        )}
      >
        {/* Alça da folha inferior: diz "isto arrasta/fecha" no celular. */}
        <span
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border-default sm:hidden"
        />
        <div className="flex shrink-0 items-start gap-3 border-b border-border-subtle px-5 pt-3 pb-4 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-section font-semibold text-ink-primary"
            >
              {title}
            </h2>
            {description ? (
              <div id={descId} className="mt-1 text-body text-ink-secondary">
                {description}
              </div>
            ) : null}
          </div>
          <IconButton
            label="Fechar"
            size="icon-sm"
            onClick={onClose}
            className="-mr-1.5"
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {children}
        </div>
        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-subtle px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
