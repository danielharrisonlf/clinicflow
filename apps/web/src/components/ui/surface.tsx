import type * as React from "react";
import { cn, initials } from "@/lib/utils";

/**
 * Superfície de conteúdo. Nunca aninhe painéis: card dentro de card é o
 * container preguiçoso. Dentro do painel, a divisão é por linha fina.
 */
export function Panel({
  className,
  children,
  as: Tag = "section",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag
      className={cn(
        "min-w-0 rounded-card border border-border-default bg-surface-base",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  description,
  count,
  actions,
  level = 2,
  id,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Contagem do que o painel lista: "12 consultas". */
  count?: React.ReactNode;
  actions?: React.ReactNode;
  level?: 2 | 3;
  id?: string;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border-subtle px-4 py-3.5 md:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Heading id={id} className="text-card font-semibold text-ink-primary">
            {title}
          </Heading>
          {count !== undefined ? (
            <span className="tabular text-label text-ink-tertiary">
              {count}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 text-label text-ink-secondary">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** Corpo de painel com o mesmo respiro lateral do cabeçalho. */
export function PanelBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 py-4 md:px-5", className)} {...props} />;
}

/**
 * Contagem de resumo. Não é o "número gigante + rótulo pequeno" de template:
 * rótulo e número na mesma linha de leitura, e o número carrega a cor do
 * estado só quando o estado pede atenção.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "accent" | "warning" | "danger";
  icon?: React.ReactNode;
  className?: string;
}) {
  const toneClass = {
    default: "text-ink-primary",
    accent: "text-accent-ink",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-card border border-border-default bg-surface-base px-4 py-3",
        className,
      )}
    >
      {icon ? (
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-sunken [&_svg]:size-4",
            toneClass,
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-label text-ink-secondary">{label}</p>
        <p
          className={cn(
            "font-mono text-metric-sm font-semibold tabular-nums md:text-metric",
            toneClass,
          )}
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 text-micro text-ink-tertiary">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Lista rótulo/valor para fichas e detalhes. */
export function DescriptionList({
  items,
  columns = 2,
  className,
}: {
  items: { label: string; value: React.ReactNode; wide?: boolean }[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const grid = {
    1: "",
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-4", grid, className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("min-w-0", item.wide && "sm:col-span-full")}
        >
          <dt className="text-label text-ink-secondary">{item.label}</dt>
          <dd className="mt-0.5 break-words text-body text-ink-primary">
            {item.value ?? <span className="text-ink-tertiary">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Iniciais em círculo. O tom vem do nome, para a mesma pessoa ter sempre a mesma cor. */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const text = initials(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-surface-sunken font-semibold text-ink-secondary",
        size === "sm" && "size-7 text-micro",
        size === "md" && "size-9 text-label",
        size === "lg" && "size-12 text-card",
        className,
      )}
    >
      {text}
    </span>
  );
}
