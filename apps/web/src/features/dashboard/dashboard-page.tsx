import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { CommandTrigger } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import {
  CardsSkeleton,
  EmptyState,
  ErrorState,
  RowsSkeleton,
} from "@/components/ui/states";
import { Metric, Panel, PanelHeader } from "@/components/ui/surface";
import { subscribe } from "@/lib/api/client";
import { appointmentsApi, dashboardApi } from "@/lib/api/endpoints";
import type { AppointmentStatus, TodaySummary } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { AppointmentList } from "../appointments/appointment-list";
import { todayISO } from "../appointments/labels";

type Filter = "TODAS" | "ATIVAS" | "ATRASADAS" | "CONCLUIDAS";

/** Estados que ainda pedem algo da recepção. É o filtro padrão do turno. */
const ACTIVE_STATUSES: AppointmentStatus[] = [
  "AGENDADA",
  "CONFIRMADA",
  "CHECK_IN",
  "EM_ATENDIMENTO",
];

export function DashboardPage({
  onOpenCommand,
}: {
  onOpenCommand: () => void;
}) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("ATIVAS");
  const date = todayISO();

  const summary = useQuery({
    queryKey: qk.dashboard.today(date),
    queryFn: () => dashboardApi.today(date),
  });

  const query = {
    date,
    limit: 50,
    orderBy: "startsAt",
    ...(filter === "ATIVAS" ? { status: ACTIVE_STATUSES } : {}),
    ...(filter === "CONCLUIDAS" ? { status: ["CONCLUIDA" as const] } : {}),
    ...(filter === "ATRASADAS" ? { onlyLate: true } : {}),
  };

  const appointments = useQuery({
    queryKey: qk.appointments.list(query),
    queryFn: () => appointmentsApi.list(query),
  });

  // O painel é a tela que fica aberta o dia todo. O stream evita que a
  // recepcionista chame alguém que o consultório já atendeu.
  useEffect(() => {
    return subscribe<TodaySummary>("/dashboard/stream", (incoming) => {
      queryClient.setQueryData(qk.dashboard.today(date), incoming);
      void queryClient.invalidateQueries({ queryKey: qk.appointments.all });
    });
  }, [queryClient, date]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
            Painel do dia
          </h1>
          <p className="mt-0.5 text-body text-ink-secondary">
            {summary.data?.dateLabel ?? "Carregando o dia…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CommandTrigger onClick={onOpenCommand} />
          <ButtonLink to="/consultas/nova">
            <Plus className="size-4" aria-hidden="true" />
            Nova consulta
          </ButtonLink>
        </div>
      </header>

      <section
        aria-label="Resumo do dia"
        className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
      >
        {summary.isPending ? (
          Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="skeleton h-[74px] rounded-card" />
          ))
        ) : summary.data ? (
          <>
            <Metric label="Consultas hoje" value={summary.data.scheduled} />
            <Metric
              label="Na sala de espera"
              value={summary.data.waiting}
              tone="warning"
            />
            <Metric
              label="Em atendimento"
              value={summary.data.inProgress}
              tone="accent"
            />
            <Metric
              label="Atrasadas"
              value={summary.data.late}
              tone={summary.data.late > 0 ? "danger" : "default"}
            />
            <Metric
              label="Concluídas"
              value={summary.data.completed}
              className="col-span-2 md:col-span-1"
            />
          </>
        ) : null}
      </section>

      <Panel>
        <PanelHeader
          title="Consultas de hoje"
          count={
            appointments.data
              ? `${appointments.data.meta.itemCount} no filtro`
              : undefined
          }
          actions={
            <div
              role="tablist"
              aria-label="Filtrar consultas"
              className="flex gap-1 rounded-control bg-surface-sunken p-0.5"
            >
              {(
                [
                  ["ATIVAS", "Em aberto"],
                  ["ATRASADAS", "Atrasadas"],
                  ["CONCLUIDAS", "Concluídas"],
                  ["TODAS", "Todas"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                  className={`h-8 rounded-marker px-2.5 text-micro font-semibold transition-colors ${
                    filter === value
                      ? "bg-surface-base text-ink-primary shadow-raised"
                      : "text-ink-secondary hover:text-ink-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />

        {appointments.isPending ? (
          <>
            <div className="hidden md:block">
              <RowsSkeleton rows={7} />
            </div>
            <div className="p-4 md:hidden">
              <CardsSkeleton cards={3} />
            </div>
          </>
        ) : appointments.isError ? (
          <ErrorState
            error={appointments.error}
            onRetry={() => void appointments.refetch()}
          />
        ) : (
          <div className="md:p-0 max-md:p-4">
            <AppointmentList
              items={appointments.data.data}
              emptyState={
                <EmptyState
                  title={
                    filter === "ATIVAS"
                      ? "Nenhuma consulta em aberto"
                      : "Nenhuma consulta neste filtro"
                  }
                  description={
                    filter === "ATIVAS"
                      ? "Tudo que estava marcado para hoje já foi atendido ou encerrado."
                      : "Troque o filtro para ver as demais consultas do dia."
                  }
                  action={
                    <ButtonLink to="/consultas/nova">
                      Agendar uma consulta
                    </ButtonLink>
                  }
                />
              }
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
