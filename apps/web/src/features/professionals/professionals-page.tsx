import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, Stethoscope, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { clampPage, Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui/states";
import { Avatar, Panel, PanelHeader } from "@/components/ui/surface";
import { professionalsApi } from "@/lib/api/endpoints";
import type { Professional } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { cn, plural } from "@/lib/utils";

const PAGE_SIZE = 15;

/** Corpo clínico: quem atende, em que dias, e quanto já tem marcado hoje. */
export function ProfessionalsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("pagina") ?? "1") || 1;
  const [term, setTerm] = useState(params.get("busca") ?? "");
  const search = useDebounced(term.trim(), 300);

  // A busca vai para a URL só depois de parar de digitar, e sempre volta à página 1.
  useEffect(() => {
    const current = params.get("busca") ?? "";
    if (current === search) return;
    const next = new URLSearchParams(params);
    if (search) next.set("busca", search);
    else next.delete("busca");
    next.delete("pagina");
    setParams(next, { replace: true });
  }, [search, params, setParams]);

  function goTo(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete("pagina");
    else next.set("pagina", String(nextPage));
    setParams(next, { replace: true });
  }

  const query = {
    page,
    limit: PAGE_SIZE,
    order: "ASC" as const,
    search: search || undefined,
  };

  const professionals = useQuery({
    queryKey: qk.professionals.list(query),
    queryFn: () => professionalsApi.list(query),
    placeholderData: keepPreviousData,
  });

  // Página que deixou de existir (link antigo, cadastro desativado): volta para a última.
  const meta = professionals.data?.meta;
  useEffect(() => {
    if (!meta || professionals.isPlaceholderData) return;
    const target = meta.pageCount === 0 ? 1 : clampPage(page, meta);
    if (target !== page) goTo(target);
  });

  const list = professionals.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Profissionais"
        description="Corpo clínico, dias de atendimento e a carga de hoje."
      />

      <Panel aria-labelledby="corpo-clinico">
        <PanelHeader
          id="corpo-clinico"
          title="Corpo clínico"
          count={
            meta
              ? plural(meta.itemCount, "profissional", "profissionais")
              : undefined
          }
          actions={
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Field
                label="Buscar profissional"
                hideLabel
                type="search"
                placeholder="Nome ou especialidade"
                icon={<Search />}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                containerClassName="min-w-0 flex-1 sm:w-72"
              />
              {term ? (
                <Button variant="ghost" size="sm" onClick={() => setTerm("")}>
                  Limpar
                </Button>
              ) : null}
            </div>
          }
          className="[&>div:last-child]:w-full sm:[&>div:last-child]:w-auto"
        />

        {term.trim() !== search ||
        (professionals.isFetching && professionals.isPlaceholderData) ? (
          <p
            role="status"
            className="border-b border-border-subtle px-4 py-1.5 text-label text-ink-secondary md:px-5"
          >
            Atualizando resultados…
          </p>
        ) : null}

        {professionals.isPending ? (
          <RowsSkeleton rows={5} />
        ) : professionals.isError && !professionals.data ? (
          <ErrorState
            error={professionals.error}
            onRetry={() => void professionals.refetch()}
          />
        ) : list.length === 0 ? (
          search ? (
            <EmptyState
              icon={Search}
              title={`Nenhum profissional para “${search}”`}
              description="Confira a grafia ou busque pela especialidade, como “Cardiologia”."
              action={
                <Button variant="secondary" onClick={() => setTerm("")}>
                  <X aria-hidden="true" />
                  Limpar busca
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Stethoscope}
              title="Nenhum profissional cadastrado"
              description="O cadastro do corpo clínico é feito pela gestão da clínica. Sem profissionais, não há como agendar."
            />
          )
        ) : (
          <>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1fr)_10rem_8rem_8rem_2rem] gap-4 border-b border-border-subtle bg-surface-app px-5 py-2 text-label font-semibold text-ink-secondary lg:grid"
            >
              <span>Profissional</span>
              <span>Atende</span>
              <span>Hoje</span>
              <span>Pendências</span>
              <span />
            </div>
            <ul
              className={cn(
                "divide-y divide-border-subtle transition-opacity duration-150",
                professionals.isPlaceholderData && "opacity-60",
              )}
            >
              {list.map((professional) => (
                <ProfessionalRow
                  key={professional.id}
                  professional={professional}
                />
              ))}
            </ul>
            {meta ? (
              <Pagination
                meta={meta}
                unit="profissionais"
                fetching={
                  professionals.isFetching && professionals.isPlaceholderData
                }
                onChange={goTo}
              />
            ) : null}
          </>
        )}
      </Panel>
    </>
  );
}

function ProfessionalRow({ professional }: { professional: Professional }) {
  const href = `/profissionais/${professional.id}`;
  return (
    <li className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-surface-hover md:px-5 lg:grid-cols-[minmax(0,1fr)_10rem_8rem_8rem_2rem] lg:gap-4">
      <div className="col-span-2 flex min-w-0 items-center gap-3 lg:col-span-1">
        <Avatar name={professional.name} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              to={href}
              className="truncate text-card font-semibold text-ink-primary after:absolute after:inset-0 after:content-[''] hover:text-accent-ink hover:underline"
            >
              {professional.name}
            </Link>
            {professional.isActive ? null : (
              <Badge tone="outline" size="sm">
                Inativo
              </Badge>
            )}
          </div>
          <p className="truncate text-label text-ink-secondary">
            {professional.credential}
          </p>
          <p className="truncate text-label text-ink-secondary lg:hidden">
            Atende {professional.workdaysLabel}
          </p>
        </div>
      </div>

      <p className="hidden truncate text-label text-ink-primary lg:block">
        {professional.workdaysLabel}
      </p>

      <p className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-secondary lg:col-start-auto lg:contents">
        <span className="lg:text-ink-primary">
          <span className="font-mono tabular-nums font-semibold text-ink-primary">
            {professional.todayAppointmentsCount}
          </span>{" "}
          {professional.todayAppointmentsCount === 1
            ? "consulta hoje"
            : "consultas hoje"}
        </span>
        <span>
          {professional.openTasksCount > 0 ? (
            <Badge tone="warning" size="sm">
              {plural(professional.openTasksCount, "pendência")}
            </Badge>
          ) : (
            <span className="text-ink-tertiary max-lg:hidden">Nenhuma</span>
          )}
        </span>
      </p>

      <ChevronRight
        aria-hidden="true"
        className="col-start-3 row-span-2 row-start-1 size-4 text-ink-tertiary lg:col-start-auto lg:row-span-1 lg:row-start-auto lg:justify-self-end"
      />
    </li>
  );
}
