import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui/states";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { professionalsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";

export function ProfessionalsPage() {
  const [page, setPage] = useState(1);
  const query = { page, limit: 15, orderBy: "name" };

  const professionals = useQuery({
    queryKey: qk.professionals.list(query),
    queryFn: () => professionalsApi.list(query),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header>
        <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
          Profissionais
        </h1>
        <p className="mt-0.5 text-body text-ink-secondary">
          Corpo clínico, grade de atendimento e carga do dia.
        </p>
      </header>

      <Panel>
        <PanelHeader
          title="Corpo clínico"
          count={
            professionals.data
              ? `${professionals.data.meta.itemCount} profissionais`
              : undefined
          }
        />

        {professionals.isPending ? (
          <RowsSkeleton rows={6} />
        ) : professionals.isError ? (
          <ErrorState
            error={professionals.error}
            onRetry={() => void professionals.refetch()}
          />
        ) : professionals.data.data.length === 0 ? (
          <EmptyState
            title="Nenhum profissional cadastrado"
            description="Cadastre o corpo clínico para poder agendar consultas."
          />
        ) : (
          <>
            <ul className="divide-y divide-border-subtle">
              {professionals.data.data.map((professional) => (
                <li
                  key={professional.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/profissionais/${professional.id}`}
                      className="text-body font-semibold text-ink-primary hover:text-accent"
                    >
                      {professional.name}
                    </Link>
                    <p className="text-micro text-ink-secondary">
                      {professional.specialty}{" "}
                      <span className="font-mono text-ink-tertiary">
                        {professional.councilType} {professional.councilNumber}
                      </span>
                    </p>
                  </div>

                  <p className="text-micro text-ink-secondary">
                    <span className="font-mono tabular-nums text-ink-primary">
                      {professional.todayAppointmentsCount}
                    </span>{" "}
                    consultas hoje
                  </p>

                  {professional.openTasksCount > 0 ? (
                    <span className="rounded-full bg-warning-weak px-2.5 py-0.5 text-micro font-semibold text-warning">
                      {professional.openTasksCount} pendências
                    </span>
                  ) : null}

                  {!professional.active ? (
                    <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-micro font-semibold text-ink-tertiary">
                      Inativo
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <Pagination
              meta={professionals.data.meta}
              unit="profissionais"
              onChange={setPage}
            />
          </>
        )}
      </Panel>
    </div>
  );
}
