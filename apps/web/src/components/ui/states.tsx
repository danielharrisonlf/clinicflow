import type { LucideIcon } from "lucide-react";
import { CloudOff, RotateCw } from "lucide-react";
import type * as React from "react";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Empty state que ensina a interface. "Nada aqui" não é um estado, é uma
 * desistência: diga por que está vazio e ofereça o primeiro passo.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 text-center",
        compact ? "py-8" : "py-14",
        className,
      )}
    >
      {Icon ? (
        <span
          className="mb-1 flex size-11 items-center justify-center rounded-full bg-surface-sunken text-ink-secondary"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="text-card font-semibold text-ink-primary">{title}</p>
      {description ? (
        <p className="max-w-sm text-body text-ink-secondary">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

/** O erro nomeia o problema e a saída. */
export function ErrorState({
  error,
  onRetry,
  title = "Não foi possível carregar",
  compact = false,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
  className?: string;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : "A conexão com o servidor falhou. Verifique a rede da recepção.";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 text-center",
        compact ? "py-6" : "py-14",
        className,
      )}
    >
      <span
        className="mb-1 flex size-11 items-center justify-center rounded-full bg-danger-weak text-danger"
        aria-hidden="true"
      >
        <CloudOff className="size-5" />
      </span>
      <p className="text-card font-semibold text-ink-primary">{title}</p>
      <p className="max-w-sm text-body text-ink-secondary">{message}</p>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-2"
        >
          <RotateCw aria-hidden="true" />
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

/** Erro numa faixa de uma linha, para blocos secundários (resumo, contadores). */
export function InlineError({
  error,
  onRetry,
  label = "Não foi possível carregar este bloco.",
}: {
  error: unknown;
  onRetry?: () => void;
  label?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-raised bg-danger-weak px-3 py-2 text-label text-danger"
    >
      <CloudOff className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {label}{" "}
        {error instanceof ApiError ? (
          <span className="text-ink-secondary">{error.message}</span>
        ) : null}
      </span>
      {onRetry ? (
        <Button
          variant="link"
          size="sm"
          onClick={onRetry}
          className="text-danger"
        >
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Região que está carregando. Skeleton é decorativo (`aria-hidden`), então a
 * região anuncia `aria-busy` e um texto para quem não vê o desenho.
 */
export function Loading({
  label = "Carregando…",
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only" role="status">
        {label}
      </span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** Skeleton no formato do conteúdo que vem — não um spinner no vazio. */
export function RowsSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <Loading className={className}>
      <div className="divide-y divide-border-subtle">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex h-16 items-center gap-4 px-4 md:px-5"
          >
            <div className="skeleton h-4 w-12" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="skeleton h-4 w-full max-w-56" />
              <div className="skeleton h-3 w-full max-w-36" />
            </div>
            <div className="skeleton hidden h-6 w-24 sm:block" />
            <div className="skeleton h-8 w-20" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function CardsSkeleton({
  cards = 4,
  className,
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <Loading className={className}>
      <div className="flex flex-col gap-3">
        {Array.from({ length: cards }, (_, index) => (
          <div
            key={index}
            className="rounded-card border border-border-subtle bg-surface-base p-4 shadow-panel"
          >
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-3 h-5 w-48" />
            <div className="skeleton mt-2 h-4 w-64 max-w-full" />
            <div className="skeleton mt-4 h-11 w-full" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function TextSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <Loading className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={cn(
            "skeleton h-4",
            index === lines - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </Loading>
  );
}
