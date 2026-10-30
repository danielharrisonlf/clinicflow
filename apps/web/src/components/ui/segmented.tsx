import type * as React from "react";
import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Contagem ao lado do rótulo: o filtro já diz quanto tem antes do clique. */
  count?: number;
  icon?: React.ReactNode;
  /** Tom da contagem quando ela pede atenção (atrasadas > 0). */
  tone?: "default" | "warning" | "danger";
}

/**
 * Filtro de escolha única. São radios de verdade: setas navegam, o grupo é
 * anunciado como escolha única, e nada disso precisa ser reimplementado.
 * Não é `tablist` — trocar o filtro não troca de painel, filtra o mesmo.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  /** Nome do grupo para leitor de tela. */
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset
      className={cn(
        "relative inline-flex min-w-0 max-w-full gap-0.5 overflow-x-auto rounded-control border border-border-default bg-surface-base p-0.5",
        "[scrollbar-width:none]",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-marker px-3 font-medium whitespace-nowrap transition-colors duration-150",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-ink",
              size === "sm" ? "h-7 text-label" : "h-8 text-label",
              "pointer-coarse:min-h-10",
              active
                ? "bg-accent-weak text-accent-ink"
                : "text-ink-secondary hover:text-ink-primary",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  "min-w-5 rounded-marker px-1 text-center font-mono text-micro",
                  option.tone === "danger" && option.count > 0
                    ? "bg-danger-weak text-danger"
                    : option.tone === "warning" && option.count > 0
                      ? "bg-warning-weak text-warning"
                      : active
                        ? "bg-surface-sunken text-ink-secondary"
                        : "text-ink-tertiary",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Abas de verdade (troca de painel). Roving tabindex: Tab entra na aba ativa,
 * setas trocam, Home/End vão às pontas — o padrão WAI-ARIA, inteiro.
 */
export function Tabs<T extends string>({
  label,
  items,
  value,
  onChange,
  idPrefix,
  className,
}: {
  label: string;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Prefixo dos ids que ligam aba e painel (`${idPrefix}-tab-x`). */
  idPrefix: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    const item = items[next];
    if (!item) return;
    onChange(item.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-border-subtle [scrollbar-width:none]",
        className,
      )}
    >
      {items.map((item, index) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.value}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${item.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative -mb-px flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-label font-medium whitespace-nowrap transition-colors",
              active
                ? "border-accent text-accent-ink"
                : "border-transparent text-ink-secondary hover:text-ink-primary",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="rounded-marker bg-surface-sunken px-1.5 font-mono text-micro text-ink-secondary">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  idPrefix,
  value,
  children,
  className,
}: {
  idPrefix: string;
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${value}`}
      aria-labelledby={`${idPrefix}-tab-${value}`}
      className={className}
    >
      {children}
    </div>
  );
}
