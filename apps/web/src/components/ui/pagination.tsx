import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@/lib/api/types";
import { Button } from "./button";

/**
 * Rodapé de paginação. Só existe no desktop e no tablet: no celular a lista
 * rola, e a contagem vive no subcabeçalho. Página numerada é controle de
 * ponteiro — num aparelho de mão ela só ocupa a faixa da bottom nav.
 */
export function Pagination({
  meta,
  unit,
  onChange,
}: {
  meta: PageMeta;
  /** "pacientes", "documentos" — o que está sendo contado. */
  unit: string;
  onChange: (page: number) => void;
}) {
  if (meta.itemCount === 0) return null;

  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.itemCount);

  return (
    <div className="hidden flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3 md:flex">
      <p className="text-micro text-ink-secondary">
        Mostrando{" "}
        <span className="font-mono tabular-nums text-ink-primary">
          {first}–{last}
        </span>{" "}
        de{" "}
        <span className="font-mono tabular-nums text-ink-primary">
          {meta.itemCount.toLocaleString("pt-BR")}
        </span>{" "}
        {unit}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasPreviousPage}
          onClick={() => onChange(meta.page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </Button>
        <span className="font-mono text-micro tabular-nums text-ink-secondary">
          {meta.page} de {meta.pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => onChange(meta.page + 1)}
        >
          Próxima
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
