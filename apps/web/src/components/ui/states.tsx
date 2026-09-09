import type * as React from "react";
import { ApiError } from "@/lib/api/client";
import { Button } from "./button";

/**
 * Empty state que ensina a interface. "Nada aqui" não é um estado, é uma
 * desistência: diga por que está vazio e ofereça o primeiro passo.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <p className="text-card font-semibold text-ink-primary">{title}</p>
      <p className="max-w-sm text-body text-ink-secondary">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** O erro nomeia o problema e a saída. */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : "A conexão com o servidor falhou. Verifique a rede da recepção.";

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="text-card font-semibold text-state-atrasada">
        Não foi possível carregar
      </p>
      <p className="max-w-sm text-body text-ink-secondary">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      ) : null}
    </div>
  );
}

/** Skeleton no formato do conteúdo que vem — não um spinner no vazio. */
export function RowsSkeleton({
  rows = 6,
  height = 56,
}: {
  rows?: number;
  height?: number;
}) {
  return (
    <div className="divide-y divide-border-subtle" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 px-4"
          style={{ height }}
        >
          <div className="skeleton h-4 w-12" />
          <div className="skeleton h-4 flex-1 max-w-56" />
          <div className="skeleton hidden h-4 w-40 sm:block" />
          <div className="skeleton ml-auto h-7 w-24" />
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          className="rounded-card border border-border-subtle bg-surface-base p-4"
        >
          <div className="skeleton h-4 w-24" />
          <div className="skeleton mt-3 h-5 w-48" />
          <div className="skeleton mt-2 h-4 w-64" />
          <div className="skeleton mt-4 h-11 w-full" />
        </div>
      ))}
    </div>
  );
}
