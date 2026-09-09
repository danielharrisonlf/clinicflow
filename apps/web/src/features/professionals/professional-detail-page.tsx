import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { professionalsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { todayISO } from "../appointments/labels";

/** Agenda do dia de um profissional, por sala e horário. */
export function ProfessionalDetailPage() {
  const { id = "" } = useParams();
  const date = todayISO();

  const professional = useQuery({
    queryKey: qk.professionals.detail(id),
    queryFn: () => professionalsApi.detail(id),
    enabled: Boolean(id),
  });

  const schedule = useQuery({
    queryKey: qk.professionals.schedule(id),
    queryFn: () => professionalsApi.schedule(id),
    enabled: Boolean(id),
  });

  const agenda = useQuery({
    queryKey: qk.professionals.agenda(id, date, date),
    queryFn: () => professionalsApi.appointments(id, date, date),
    enabled: Boolean(id),
  });

  if (professional.isError) {
    return (
      <ErrorState
        error={professional.error}
        onRetry={() => void professional.refetch()}
      />
    );
  }

  const slots = agenda.data?.[0]?.slots ?? [];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link
        to="/profissionais"
        className="inline-flex w-fit items-center gap-1.5 text-micro font-semibold text-ink-secondary hover:text-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Profissionais
      </Link>

      <header>
        {professional.isPending ? (
          <div className="skeleton h-8 w-64" />
        ) : (
          <>
            <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
              {professional.data.name}
            </h1>
            <p className="mt-1 text-body text-ink-secondary">
              {professional.data.specialty}{" "}
              <span className="font-mono text-ink-tertiary">
                {professional.data.councilType}{" "}
                {professional.data.councilNumber}
              </span>
            </p>
            {schedule.data ? (
              <p className="mt-0.5 text-micro text-ink-tertiary">
                Atende {schedule.data.summary}
              </p>
            ) : null}
          </>
        )}
      </header>

      <Panel>
        <PanelHeader
          title="Agenda de hoje"
          count={`${slots.length} consultas`}
        />

        {agenda.isPending ? (
          <RowsSkeleton rows={5} height={52} />
        ) : agenda.isError ? (
          <ErrorState
            error={agenda.error}
            onRetry={() => void agenda.refetch()}
          />
        ) : slots.length === 0 ? (
          <EmptyState
            title="Nenhuma consulta hoje"
            description="Este profissional não tem atendimentos marcados para a data de hoje."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {slots.map((slot) => (
              <li key={slot.id}>
                <Link
                  to={`/consultas/${slot.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-surface-app"
                >
                  <span className="font-mono text-body font-semibold text-ink-primary">
                    {slot.time}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body text-ink-primary">
                    {slot.patientName}
                  </span>
                  <span className="font-mono text-micro text-ink-tertiary">
                    {slot.durationMinutes} min
                  </span>
                  <StatusBadge state={slot.derivedState} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
