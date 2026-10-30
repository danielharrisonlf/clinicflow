import type * as React from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Menu suspenso (padrão `menu` do WAI-ARIA): abre por clique, Enter ou seta,
 * navega com setas, fecha com Esc, clique fora ou Tab, e devolve o foco ao
 * gatilho. Vai para o `body` para não ser cortado por `overflow` de barra lateral.
 */
export function Menu({
  trigger,
  children,
  label,
  placement = "bottom-end",
  className,
}: {
  /** Recebe as props que ligam o gatilho ao menu. */
  trigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
  }) => React.ReactNode;
  children: React.ReactNode;
  label: string;
  placement?: "bottom-end" | "bottom-start" | "top-start" | "right-end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusLast = useRef(false);
  const id = useId();

  const items = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled]):not([aria-disabled="true"]), [role="menuitemradio"]:not([aria-disabled="true"])',
      ) ?? [],
    );

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function updatePosition() {
      if (!triggerRef.current || !menuRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const menu = menuRef.current.getBoundingClientRect();
      const gap = 6;
      const margin = 8;
      const width = menu.width || 224;
      const height = menu.height || 200;
      let left = placement === "bottom-end" ? rect.right - width : rect.left;
      let top = rect.bottom + gap;
      if (placement === "top-start") top = rect.top - gap - height;
      if (placement === "right-end") {
        left = rect.right + gap;
        top = rect.bottom - height;
      }
      if (
        top + height > window.innerHeight - margin &&
        rect.top > height + gap
      ) {
        top = rect.top - gap - height;
      }
      setPosition({
        position: "fixed",
        left: Math.max(
          margin,
          Math.min(left, window.innerWidth - width - margin),
        ),
        top: Math.max(
          margin,
          Math.min(top, window.innerHeight - height - margin),
        ),
        maxWidth: window.innerWidth - margin * 2,
        maxHeight: window.innerHeight - margin * 2,
        overflowY: "auto",
      });
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placement]);

  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusLast.current ? list.at(-1) : list[0])?.focus();
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function close(restore = true) {
    setOpen(false);
    if (restore) triggerRef.current?.focus();
  }

  function onMenuKeyDown(event: React.KeyboardEvent) {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      list[(index + 1) % list.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      list[(index - 1 + list.length) % list.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      list[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      list.at(-1)?.focus();
    } else if (event.key === "Tab") {
      // Voltar ao gatilho antes do Tab nativo mantém a ordem da página.
      close();
    }
  }

  return (
    <>
      {trigger({
        ref: triggerRef,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": id,
        onClick: () => {
          focusLast.current = false;
          setOpen((current) => !current);
        },
        onKeyDown: (event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            focusLast.current = event.key === "ArrowUp";
            setOpen(true);
          }
        },
      })}
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={id}
              role="menu"
              aria-label={label}
              data-overlay-persist=""
              style={position}
              onKeyDown={onMenuKeyDown}
              onClick={(event) => {
                const el = (event.target as HTMLElement).closest(
                  '[role="menuitem"], [role="menuitemradio"]',
                );
                if (el && el.getAttribute("data-keep-open") === null) close();
              }}
              className={cn(
                "z-[70] min-w-56 rounded-raised border border-border-default bg-surface-raised p-1 shadow-raised animate-pop",
                className,
              )}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function MenuItem({
  children,
  onSelect,
  icon,
  tone = "default",
  hint,
  disabled = false,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-label font-medium outline-none transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
        "focus-visible:bg-surface-sunken hover:bg-surface-sunken pointer-coarse:min-h-11",
        "focus-visible:ring-2 focus-visible:ring-accent-ink",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger" ? "text-danger" : "text-ink-primary",
      )}
    >
      {icon ? (
        <span
          className={tone === "danger" ? "text-danger" : "text-ink-secondary"}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <span className="flex-1">{children}</span>
      {hint}
    </button>
  );
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-2 pb-1.5 text-label text-ink-secondary">
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <hr className="my-1 border-0 border-t border-border-subtle" />;
}
