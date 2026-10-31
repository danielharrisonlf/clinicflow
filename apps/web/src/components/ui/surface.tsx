import type * as React from "react";
import { Link, type To } from "react-router";
import { cn, initials } from "@/lib/utils";
import { Dot } from "./badge";

/**
 * Superfície de conteúdo do bento: base + micro-borda + sombra difusa (no
 * escuro, só a micro-borda). Nunca aninhe painéis: card dentro de card é o
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
        "min-w-0 rounded-card border border-border-subtle bg-surface-base shadow-panel",
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

const STAT_TONE = {
  default: "text-ink-primary",
  accent: "text-accent-ink",
  revenue: "text-revenue",
  warning: "text-warning",
  danger: "text-danger",
  /** Violeta do "Em atendimento": só para o dot, o valor fica neutro. */
  atendimento: "text-state-atendimento",
} as const;

type StatTone = keyof typeof STAT_TONE;

/**
 * Stat card do bento. Anatomia fixa: rótulo em caixa-alta pequena, valor em
 * mono, linha de apoio ("3 sem resposta") e, quando o valor é vivo, um dot
 * de estado. O valor carrega a cor do tom só quando o estado pede atenção.
 * Sem sparkline nem tendência: a interface não inventa série histórica.
 *
 * Clicável é atalho, não troféu: `to` vira link (abre em nova aba com ⌘) e
 * `onClick` vira botão (aplica um filtro na mesma tela). O conteúdo é todo
 * `span` para continuar HTML válido dentro de `<a>`/`<button>`.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
  icon,
  dot,
  dotTone,
  to,
  onClick,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Exclude<StatTone, "atendimento">;
  icon?: React.ReactNode;
  /** Dot ao lado do rótulo, na cor do tom. `pulse` só para o que está vivo agora. */
  dot?: "static" | "pulse";
  /** Cor do dot quando ela difere da do valor (ex.: atendimento em violeta). */
  dotTone?: StatTone;
  /** Atalho para outra tela. */
  to?: To;
  /** Atalho na própria tela (aplicar filtro). Ignorado quando há `to`. */
  onClick?: () => void;
  className?: string;
}) {
  const toneClass = STAT_TONE[tone];
  const dotClass = dotTone
    ? STAT_TONE[dotTone]
    : tone === "default"
      ? "text-ink-tertiary"
      : toneClass;

  const body = (
    <>
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-micro font-semibold tracking-wider text-ink-tertiary uppercase">
          {dot ? <Dot pulse={dot === "pulse"} className={dotClass} /> : null}
          <span className="truncate">{label}</span>
        </span>
        {icon ? (
          // No celular o tile tem meia coluna: o rótulo vale mais que o ícone.
          <span
            className="flex shrink-0 text-ink-tertiary max-sm:hidden [&_svg]:size-4"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "block font-mono text-metric-sm font-semibold tracking-tight tabular-nums md:text-metric",
          toneClass,
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="block text-label text-ink-secondary">{hint}</span>
      ) : null}
    </>
  );

  const base =
    "flex min-w-0 flex-col gap-2 rounded-card border border-border-subtle bg-surface-base p-4 text-left shadow-panel";
  const interactive =
    "transition-[background-color,border-color,transform] duration-150 hover:border-border-default hover:bg-surface-hover active:translate-y-px";

  if (to !== undefined) {
    return (
      <Link to={to} className={cn(base, interactive, className)}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(base, interactive, className)}
      >
        {body}
      </button>
    );
  }
  return <div className={cn(base, className)}>{body}</div>;
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
