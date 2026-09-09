import type * as React from "react";
import { cn } from "@/lib/utils";

/** Superfície de conteúdo. Nunca aninhe painéis: card dentro de card é o container preguiçoso. */
export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-border-subtle bg-surface-base",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  count,
  actions,
}: {
  title: string;
  count?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-card font-semibold text-ink-primary">{title}</h2>
        {count ? (
          <span className="font-mono text-micro text-ink-tertiary">
            {count}
          </span>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** Métrica do topo. Sem eyebrow em caixa-alta: o rótulo é frase, não etiqueta. */
export function Metric({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: number | string;
  tone?: "default" | "accent" | "warning" | "danger";
  className?: string;
}) {
  const toneClass = {
    default: "text-ink-primary",
    accent: "text-accent",
    warning: "text-state-espera",
    danger: "text-state-atrasada",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-card border border-border-subtle bg-surface-base px-4 py-3",
        className,
      )}
    >
      <p className="text-micro font-semibold text-ink-secondary">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-metric-sm font-bold tabular-nums md:text-metric",
          toneClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}
