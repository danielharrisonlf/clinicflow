import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Spinner } from "./spinner";

/**
 * Rodapé de paginação. Existe em todos os tamanhos: no celular vira só
 * "Anterior / Próxima" de largura cheia, com a contagem compacta no meio.
 * (A versão anterior sumia abaixo de 768px e deixava a lista presa na página 1.)
 */
export function Pagination({
  meta,
  unit,
  onChange,
  fetching = false,
  className,
}: {
  meta: PageMeta;
  /** "pacientes", "documentos" — o que está sendo contado. */
  unit: string;
  onChange: (page: number) => void;
  /** Próxima página chegando (keepPreviousData): mostra que o clique valeu. */
  fetching?: boolean;
  className?: string;
}) {
  if (meta.itemCount === 0) return null;

  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.itemCount);
  const single = meta.pageCount <= 1;
  const start = Math.max(1, Math.min(meta.page - 2, meta.pageCount - 4));
  const pageNumbers = Array.from(
    { length: Math.min(5, meta.pageCount) },
    (_, index) => start + index,
  );

  return (
    <nav
      aria-label={`Paginação de ${unit}`}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3 md:px-5",
        className,
      )}
    >
      <p className="flex items-center gap-2 text-label text-ink-secondary">
        {fetching ? <Spinner className="size-3.5 text-accent" /> : null}
        <span className="max-sm:hidden">
          Mostrando{" "}
          <span className="font-mono text-ink-primary">
            {first}–{last}
          </span>{" "}
          de{" "}
          <span className="font-mono text-ink-primary">
            {meta.itemCount.toLocaleString("pt-BR")}
          </span>{" "}
          {unit}
        </span>
        <span className="font-mono sm:hidden">
          {first}–{last} de {meta.itemCount.toLocaleString("pt-BR")}
        </span>
      </p>

      {single ? null : (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!meta.hasPreviousPage}
            onClick={() => onChange(meta.page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden="true" />
            <span className="max-sm:hidden">Anterior</span>
          </Button>
          <div className="hidden items-center gap-1 sm:flex">
            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => onChange(page)}
                aria-label={`Página ${page}`}
                aria-current={page === meta.page ? "page" : undefined}
                className={cn(
                  "flex size-9 items-center justify-center rounded-control border text-label transition-colors",
                  page === meta.page
                    ? "border-ink-primary bg-surface-base font-semibold text-ink-primary"
                    : "border-border-default bg-surface-base text-ink-secondary hover:border-border-strong hover:text-ink-primary",
                )}
              >
                {page}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!meta.hasNextPage}
            onClick={() => onChange(meta.page + 1)}
            aria-label="Próxima página"
          >
            <span className="max-sm:hidden">Próxima</span>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}

/**
 * Página atual fora do alcance depois de uma ação (resolveu o último item da
 * página 3): volta para a última página que existe.
 */
export function clampPage(page: number, meta?: PageMeta): number {
  if (!meta || meta.pageCount === 0) return page;
  return Math.min(page, meta.pageCount);
}
