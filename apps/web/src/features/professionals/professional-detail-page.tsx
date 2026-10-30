import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page";
import { Spinner } from "@/components/ui/spinner";
import {
  EmptyState,
  ErrorState,
  InlineError,
  RowsSkeleton,
  TextSkeleton,
} from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DescriptionList,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/ui/surface";
import { ApiError } from "@/lib/api/client";
import { professionalsApi } from "@/lib/api/endpoints";
import type { ScheduleWindow } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, plural } from "@/lib/utils";
import { currentPath } from "../appointments/back-target";
import {
  addDays,
  formatDayLong,
  todayISO,
  weekdayOf,
} from "../appointments/labels";

const WEEKDAY_NAME = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/** Segunda primeiro: é a ordem da escala da clínica, não a do `Date`. */
function weekOrder(weekday: number): number {
  return (weekday + 6) % 7;
}

/** Ficha do profissional: grade semanal e a agenda de um dia, navegável. */
export function ProfessionalDetailPage() {
  const location = useLocation();
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const today = todayISO();
  const raw = params.get("data");
  const date = raw && DATE_PARAM.test(raw) ? raw : today;

  function setDate(next: string) {
    const search = new URLSearchParams(params);
    if (next === today) search.delete("data");
    else search.set("data", next);
    setParams(search, { replace: true });
  }

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

  // O endpoint aceita `YYYY-MM-DD` (ISO 8601 estrito) e lê o dia no fuso da clínica.
  const agenda = useQuery({
    queryKey: qk.professionals.agenda(id, date, date),
    queryFn: () => professionalsApi.appointments(id, date, date),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

  if (professional.isError && !professional.data) {
    const notFound =
      professional.error instanceof ApiError &&
      professional.error.statusCode === 404;
    return (
      <>
        <PageHeader
          title={notFound ? "Profissional não encontrado" : "Profissional"}
          back={{ to: "/profissionais", label: "Profissionais" }}
        />
        <Panel>
          <ErrorState
            title={
              notFound
                ? "Este cadastro não existe mais"
                : "Não foi possível carregar"
            }
            error={professional.error}
            onRetry={notFound ? undefined : () => void professional.refetch()}
          />
        </Panel>
      </>
    );
  }

  const p = professional.data;
  const windows = [...(schedule.data?.windows ?? [])].sort(
    (a, b) =>
      weekOrder(a.weekday) - weekOrder(b.weekday) ||
      a.startTime.localeCompare(b.startTime),
  );
  const worksOnDate = windows.some(
    (window) => window.weekday === weekdayOf(date),
  );
  const slots = agenda.data?.find((day) => day.date === date)?.slots ?? [];
  const past = date < today;
  const bookHref = (withDate?: string) => {
    const search = new URLSearchParams({ professionalId: id });
    if (withDate) search.set("date", withDate);
    return `/consultas/nova?${search.toString()}`;
  };

  return (
    <>
      <PageHeader
        title={
          p ? (
            p.name
          ) : (
            <span className="skeleton inline-block h-8 w-64 align-middle" />
          )
        }
        documentTitle={p?.name ?? "Profissional"}
        back={{ to: "/profissionais", label: "Profissionais" }}
        meta={
          p ? (
            <>
              <span className="text-body text-ink-secondary">
                {p.credential}
              </span>
              {p.isActive ? (
                <Badge tone="success" size="sm">
                  Ativo
                </Badge>
              ) : (
                <Badge tone="outline" size="sm">
                  Inativo
                </Badge>
              )}
            </>
          ) : null
        }
        actions={
          p?.isActive ? (
            <ButtonLink to={bookHref()} className="max-sm:w-full">
              <CalendarPlus aria-hidden="true" />
              Agendar com este profissional
            </ButtonLink>
          ) : null
        }
      />

      {p && !p.isActive ? (
        <Callout tone="warning" title="Profissional inativo" className="mb-5">
          Não recebe novas consultas. As já marcadas continuam na agenda abaixo.
        </Callout>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel aria-labelledby="agenda-dia">
          <PanelHeader
            id="agenda-dia"
            title={date === today ? "Agenda de hoje" : formatDayLong(date)}
            description={date === today ? formatDayLong(date) : undefined}
            count={agenda.data ? plural(slots.length, "consulta") : undefined}
            actions={
              <div className="flex items-center gap-1.5">
                {agenda.isFetching && agenda.isPlaceholderData ? (
                  <Spinner className="size-4 text-accent" />
                ) : null}
                <IconButton
                  label="Dia anterior"
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => setDate(addDays(date, -1))}
                >
                  <ChevronLeft aria-hidden="true" />
                </IconButton>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={date === today}
                  onClick={() => setDate(today)}
                >
                  Hoje
                </Button>
                <IconButton
                  label="Próximo dia"
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => setDate(addDays(date, 1))}
                >
                  <ChevronRight aria-hidden="true" />
                </IconButton>
              </div>
            }
          />

          {agenda.isPending ? (
            <RowsSkeleton rows={4} />
          ) : agenda.isError && !agenda.data ? (
            <ErrorState
              error={agenda.error}
              onRetry={() => void agenda.refetch()}
            />
          ) : slots.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarCheck}
              title={past ? "Nenhuma consulta neste dia" : "Dia sem consultas"}
              description={
                schedule.data && !worksOnDate
                  ? `Fora da grade: não atende ${weekdayOf(date) % 6 === 0 ? "aos" : "às"} ${WEEKDAY_NAME[weekdayOf(date)]?.toLowerCase()}s.`
                  : "Nenhum paciente marcado para este dia."
              }
              action={
                !past && p?.isActive ? (
                  <ButtonLink to={bookHref(date)} variant="secondary">
                    Agendar neste dia
                  </ButtonLink>
                ) : undefined
              }
            />
          ) : (
            <ul
              className={cn(
                "divide-y divide-border-subtle transition-opacity duration-150",
                agenda.isPlaceholderData && "opacity-60",
              )}
            >
              {slots.map((slot) => (
                <li key={slot.id}>
                  <Link
                    to={`/consultas/${slot.id}`}
                    state={{
                      from: currentPath(location),
                      backgroundLocation: location,
                    }}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-surface-app sm:grid-cols-[4rem_minmax(0,1fr)_auto] md:px-5"
                  >
                    <span className="font-mono text-card font-semibold text-ink-primary">
                      {slot.time}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-body font-semibold text-ink-primary">
                        {slot.patientName}
                      </span>
                      <span className="block font-mono text-label text-ink-secondary">
                        {slot.durationMinutes} min
                      </span>
                    </span>
                    <span className="col-start-2 sm:col-start-auto">
                      <StatusBadge state={slot.derivedState} size="sm" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel aria-labelledby="grade">
            <PanelHeader
              id="grade"
              title="Grade de atendimento"
              description={schedule.data?.summary}
            />
            {schedule.isPending ? (
              <PanelBody>
                <TextSkeleton lines={4} />
              </PanelBody>
            ) : schedule.isError ? (
              <PanelBody>
                <InlineError
                  error={schedule.error}
                  onRetry={() => void schedule.refetch()}
                  label="A grade de atendimento não carregou."
                />
              </PanelBody>
            ) : windows.length === 0 ? (
              <EmptyState
                compact
                title="Sem grade configurada"
                description="A gestão ainda não definiu os horários deste profissional. Consultas podem ser marcadas em qualquer horário."
              />
            ) : (
              <ScheduleTable windows={windows} highlight={weekdayOf(date)} />
            )}
          </Panel>

          <Panel aria-labelledby="resumo-profissional">
            <PanelHeader id="resumo-profissional" title="Resumo" />
            <PanelBody>
              {p ? (
                <DescriptionList
                  columns={1}
                  items={[
                    {
                      label: "Consultas hoje",
                      value: (
                        <span className="font-mono">
                          {p.todayAppointmentsCount}
                        </span>
                      ),
                    },
                    {
                      label: "Pendências abertas",
                      value: (
                        <span className="font-mono">{p.openTasksCount}</span>
                      ),
                    },
                    {
                      label: "Duração padrão da consulta",
                      value: (
                        <span className="font-mono">
                          {p.defaultDurationMinutes} min
                        </span>
                      ),
                    },
                  ]}
                />
              ) : (
                <TextSkeleton lines={3} />
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </>
  );
}

function ScheduleTable({
  windows,
  highlight,
}: {
  windows: ScheduleWindow[];
  highlight: number;
}) {
  const hasRoom = windows.some((window) => window.room);
  return (
    <table className="w-full text-left text-body">
      <caption className="sr-only">
        Janelas de atendimento por dia da semana
      </caption>
      <thead>
        <tr className="border-b border-border-subtle bg-surface-app text-label text-ink-secondary">
          <th scope="col" className="px-4 py-2 font-semibold md:px-5">
            Dia
          </th>
          <th scope="col" className="px-2 py-2 font-semibold">
            Horário
          </th>
          {hasRoom ? (
            <th scope="col" className="px-4 py-2 font-semibold md:pr-5">
              Sala
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-border-subtle">
        {windows.map((window) => (
          <tr
            key={`${window.weekday}-${window.startTime}`}
            className={cn(window.weekday === highlight && "bg-accent-weak")}
          >
            <th
              scope="row"
              className="px-4 py-2.5 font-semibold text-ink-primary md:px-5"
            >
              {WEEKDAY_NAME[window.weekday]}
              {window.weekday === highlight ? (
                <span className="sr-only"> (dia exibido na agenda)</span>
              ) : null}
            </th>
            <td className="px-2 py-2.5 font-mono text-ink-primary">
              {window.startTime}–{window.endTime}
            </td>
            {hasRoom ? (
              <td className="px-4 py-2.5 text-ink-secondary md:pr-5">
                {window.room ?? "—"}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
