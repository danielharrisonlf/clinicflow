import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Armchair,
  CalendarClock,
  CalendarPlus,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock3,
  TriangleAlert,
} from "lucide-react";
import { useEffect } from "react";
import {
  Link,
  useLocation,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { clampPage, Pagination } from "@/components/ui/pagination";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/ui/segmented";
import {
  EmptyState,
  ErrorState,
  InlineError,
  RowsSkeleton,
  TextSkeleton,
} from "@/components/ui/states";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { subscribe } from "@/lib/api/client";
import {
  appointmentsApi,
  dashboardApi,
  tasksApi,
  waitingRoomApi,
} from "@/lib/api/endpoints";
import type {
  AppointmentStatus,
  ListAppointmentsQuery,
  TodaySummary,
} from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, plural } from "@/lib/utils";
import { AppointmentList } from "../appointments/appointment-list";
import { todayISO } from "../appointments/labels";

type Filter = "abertas" | "confirmar" | "atrasadas" | "concluidas" | "todas";

/** Estados que ainda pedem algo da recepção. É o filtro padrão do turno. */
const OPEN_STATUSES: AppointmentStatus[] = [
  "AGENDADA",
  "CONFIRMADA",
  "CHECK_IN",
  "EM_ATENDIMENTO",
];

const PAGE_SIZE = 50;

function queryFor(
  filter: Filter,
  date: string,
  page: number,
): ListAppointmentsQuery {
  const base = { date, page, limit: PAGE_SIZE, direction: "asc" as const };
  if (filter === "abertas") return { ...base, status: OPEN_STATUSES };
  if (filter === "confirmar") return { ...base, status: ["AGENDADA"] };
  if (filter === "concluidas") return { ...base, status: ["CONCLUIDA"] };
  if (filter === "atrasadas") return { ...base, derivedState: "ATRASADA" };
  return base;
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const context = useOutletContext<{ detailOpen: boolean } | undefined>();
  const [params, setParams] = useSearchParams();
  const requestedFilter = params.get("filtro");
  const filter: Filter =
    requestedFilter === "confirmar" ||
    requestedFilter === "atrasadas" ||
    requestedFilter === "concluidas" ||
    requestedFilter === "todas"
      ? requestedFilter
      : "abertas";
  const requestedPage = Number(params.get("pagina") ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const date = todayISO();

  function update(next: { filtro?: Filter; pagina?: number }) {
    const search = new URLSearchParams(params);
    if (next.filtro) {
      search.set("filtro", next.filtro);
      search.delete("pagina");
    }
    if (next.pagina) search.set("pagina", String(next.pagina));
    setParams(search, { replace: true });
  }

  const summary = useQuery({
    queryKey: qk.dashboard.today(date),
    queryFn: () => dashboardApi.today(date),
  });

  const query = queryFor(filter, date, page);
  const appointments = useQuery({
    queryKey: qk.appointments.list(query),
    queryFn: () => appointmentsApi.list(query),
    placeholderData: keepPreviousData,
  });

  // Uma transição pode remover o último item da página filtrada.
  const meta = appointments.data?.meta;
  useEffect(() => {
    // O painel no fundo não navega enquanto alguém trabalha na folha de detalhe.
    if (!meta || appointments.isPlaceholderData || context?.detailOpen) return;
    const target = meta.pageCount === 0 ? 1 : clampPage(page, meta);
    if (target !== page) update({ pagina: target });
  });

  // O painel fica aberto o dia todo. O stream evita que a recepção chame
  // alguém que o consultório já atendeu. Só as listas e a fila recarregam —
  // invalidar todo `appointments` refazia detalhes e auditorias abertos.
  useEffect(() => {
    return subscribe<TodaySummary>("/dashboard/stream", (incoming) => {
      queryClient.setQueryData(qk.dashboard.today(date), incoming);
      void queryClient.invalidateQueries({
        queryKey: ["appointments", "list"],
      });
      void queryClient.invalidateQueries({ queryKey: qk.waitingRoom.all });
    });
  }, [queryClient, date]);

  const s = summary.data;
  const open = s
    ? (s.open ?? Math.max(s.scheduled - s.completed, 0))
    : undefined;
  const options: SegmentOption<Filter>[] = [
    { value: "abertas", label: "Em aberto", count: open },
    {
      value: "confirmar",
      label: "A confirmar",
      count: s?.unconfirmed,
      tone: "warning",
    },
    { value: "atrasadas", label: "Atrasadas", count: s?.late, tone: "danger" },
    { value: "concluidas", label: "Concluídas", count: s?.completed },
    {
      value: "todas",
      label: "Todas",
      count: s ? (s.total ?? s.scheduled + s.cancelled) : undefined,
    },
  ];

  return (
    <>
      <PageHeader
        title="Painel do dia"
        description={
          s?.dateLabel ?? (summary.isError ? "Hoje" : "Carregando o dia…")
        }
        actions={
          <ButtonLink to="/consultas/nova" className="md:hidden">
            <CalendarPlus aria-hidden="true" />
            Nova consulta
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <NowStrip
            summary={s}
            error={summary.error}
            onRetry={() => void summary.refetch()}
            onLate={() => update({ filtro: "atrasadas" })}
            onUnconfirmed={() => update({ filtro: "confirmar" })}
            onCompleted={() => update({ filtro: "concluidas" })}
            className="xl:hidden"
          />
          <div className="xl:hidden">
            <NextArrival
              id="proxima-chegada-mobile"
              appointment={s?.nextArrival}
              loading={summary.isPending}
            />
          </div>

          <Panel aria-labelledby="consultas-hoje">
            <PanelHeader
              id="consultas-hoje"
              title="Consultas de hoje"
              count={
                appointments.data
                  ? plural(appointments.data.meta.itemCount, "consulta")
                  : undefined
              }
              actions={
                <SegmentedControl
                  label="Filtrar consultas"
                  options={options}
                  value={filter}
                  onChange={(value) => update({ filtro: value })}
                />
              }
            />

            {appointments.isPending ? (
              <RowsSkeleton rows={7} />
            ) : appointments.isError ? (
              <ErrorState
                error={appointments.error}
                onRetry={() => void appointments.refetch()}
              />
            ) : (
              <>
                <AppointmentList
                  items={appointments.data.data}
                  emptyState={<DashboardEmpty filter={filter} />}
                />
                <Pagination
                  meta={appointments.data.meta}
                  unit="consultas"
                  fetching={
                    appointments.isFetching && appointments.isPlaceholderData
                  }
                  onChange={(next) => update({ pagina: next })}
                />
              </>
            )}
          </Panel>
        </div>

        <aside
          aria-label="Agora na clínica"
          className="hidden flex-col gap-5 xl:flex"
        >
          <NowStrip
            summary={s}
            error={summary.error}
            onRetry={() => void summary.refetch()}
            onLate={() => update({ filtro: "atrasadas" })}
            onUnconfirmed={() => update({ filtro: "confirmar" })}
            onCompleted={() => update({ filtro: "concluidas" })}
            stacked
          />
          <NextArrival
            id="proxima-chegada-desktop"
            appointment={s?.nextArrival}
            loading={summary.isPending}
          />
          <QueuePreview />
          <UrgentTasks />
        </aside>
      </div>
    </>
  );
}

/**
 * O que está acontecendo agora. São atalhos, não troféus: cada contagem leva
 * para onde a pessoa resolve aquilo.
 */
function NowStrip({
  summary,
  error,
  onRetry,
  onLate,
  onUnconfirmed,
  onCompleted,
  stacked = false,
  className,
}: {
  summary?: TodaySummary;
  error: unknown;
  onRetry: () => void;
  onLate: () => void;
  onUnconfirmed: () => void;
  onCompleted: () => void;
  stacked?: boolean;
  className?: string;
}) {
  if (error && !summary) {
    return (
      <div className={className}>
        <InlineError
          error={error}
          onRetry={onRetry}
          label="O resumo do dia não carregou."
        />
      </div>
    );
  }

  const value = (n?: number) => (n === undefined ? "—" : n);
  const tiles = [
    {
      key: "espera",
      label: "Aguardando",
      value: value(summary?.waiting),
      icon: Armchair,
      tone: summary && summary.waiting > 0 ? "warning" : "default",
      to: "/sala-de-espera",
    },
    {
      key: "confirmar",
      label: "A confirmar",
      value: value(summary?.unconfirmed),
      icon: CalendarClock,
      tone: summary && summary.unconfirmed > 0 ? "warning" : "default",
      onClick: onUnconfirmed,
    },
    {
      key: "atrasadas",
      label: "Atrasadas",
      value: value(summary?.late),
      icon: TriangleAlert,
      tone: summary && summary.late > 0 ? "danger" : "default",
      onClick: onLate,
    },
    {
      key: "concluidas",
      label: "Concluídas",
      value: value(summary?.completed),
      icon: CheckCheck,
      tone: "default",
      onClick: onCompleted,
    },
  ] as const;

  return (
    <section
      aria-label="Resumo de agora"
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle shadow-panel",
        stacked ? "" : "md:grid-cols-4",
        className,
      )}
    >
      {tiles.map((tile) => {
        const toneInk =
          tile.tone === "warning"
            ? "text-warning"
            : tile.tone === "danger"
              ? "text-danger"
              : "text-ink-primary";
        const body = (
          <>
            <span
              className={cn(
                "flex shrink-0 items-center justify-center",
                toneInk,
              )}
              aria-hidden="true"
            >
              <tile.icon className="size-4.5" />
            </span>
            <span className="min-w-0 flex flex-1 items-center justify-between gap-2">
              <span className="text-label text-ink-secondary">
                {tile.label}
              </span>
              <span
                className={cn("font-mono text-card font-semibold", toneInk)}
              >
                {tile.value}
              </span>
            </span>
          </>
        );
        const base =
          "flex min-h-12 min-w-0 items-center gap-2 bg-surface-base px-3 py-3 text-left";
        const interactive =
          "transition-colors hover:bg-surface-app focus-visible:z-10";
        if ("to" in tile) {
          return (
            <Link key={tile.key} to={tile.to} className={cn(base, interactive)}>
              {body}
            </Link>
          );
        }
        return (
          <button
            key={tile.key}
            type="button"
            onClick={tile.onClick}
            className={cn(base, interactive)}
          >
            {body}
          </button>
        );
      })}
    </section>
  );
}

function NextArrival({
  id,
  appointment,
  loading,
}: {
  id: string;
  appointment?: TodaySummary["nextArrival"];
  loading: boolean;
}) {
  const location = useLocation();
  return (
    <Panel aria-labelledby={id}>
      <PanelHeader id={id} title="Próxima chegada" />
      {loading ? (
        <div className="p-4">
          <TextSkeleton lines={2} />
        </div>
      ) : appointment ? (
        <div className="flex items-center gap-3 px-4 py-3 md:px-5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-ink-secondary"
            aria-hidden="true"
          >
            <Clock3 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-ink-primary">
              {appointment.patientName}
            </p>
            <p className="truncate text-label text-ink-secondary">
              <span className="font-mono">{appointment.time}</span> com{" "}
              {appointment.professionalName}
            </p>
          </div>
          <Link
            to={`/consultas/${appointment.id}`}
            state={{
              from: `${location.pathname}${location.search}`,
              backgroundLocation: location,
            }}
            className="rounded-control px-2 py-2 text-label font-semibold text-accent-ink hover:bg-accent-weak"
          >
            Abrir{" "}
            <span className="sr-only">
              consulta de {appointment.patientName}
            </span>
          </Link>
        </div>
      ) : (
        <p className="px-4 py-3 text-label text-ink-secondary md:px-5">
          Sem novas chegadas previstas para hoje.
        </p>
      )}
    </Panel>
  );
}

/** Quem está esperando agora, na ordem de chegada. A sala completa vive na tela própria. */
function QueuePreview() {
  const queue = useQuery({
    queryKey: qk.waitingRoom.list,
    queryFn: waitingRoomApi.list,
  });

  return (
    <Panel aria-labelledby="fila-agora">
      <PanelHeader
        id="fila-agora"
        title="Sala de espera"
        count={queue.data ? plural(queue.data.length, "paciente") : undefined}
        actions={
          <Link
            to="/sala-de-espera"
            className="inline-flex items-center gap-0.5 rounded-marker text-label font-semibold text-accent-ink hover:underline"
          >
            Abrir
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      {queue.isPending ? (
        <div className="p-4">
          <TextSkeleton lines={3} />
        </div>
      ) : queue.isError ? (
        <div className="p-4">
          <InlineError
            error={queue.error}
            onRetry={() => void queue.refetch()}
          />
        </div>
      ) : queue.data.length === 0 ? (
        <EmptyState
          compact
          icon={Armchair}
          title="Ninguém esperando"
          description="Quem fizer check-in aparece aqui."
        />
      ) : (
        <ol className="divide-y divide-border-subtle">
          {queue.data.slice(0, 5).map((item) => (
            <li
              key={item.appointmentId}
              className="flex items-center gap-3 px-4 py-2.5 md:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-semibold text-ink-primary">
                  {item.patientName}
                </p>
                <p className="truncate text-label text-ink-secondary">
                  {item.professionalName}
                </p>
              </div>
              <span
                className={cn(
                  "font-mono text-label font-semibold",
                  item.isLate ? "text-danger" : "text-warning",
                )}
              >
                {item.waitingLabel}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/** Pendências que vencem hoje. */
function UrgentTasks() {
  const query = { limit: 5, dueBefore: todayISO() };
  const tasks = useQuery({
    queryKey: qk.tasks.list(query),
    queryFn: () => tasksApi.list(query),
  });

  return (
    <Panel aria-labelledby="pendencias-hoje">
      <PanelHeader
        id="pendencias-hoje"
        title="Vencem até hoje"
        count={tasks.data ? String(tasks.data.meta.itemCount) : undefined}
        actions={
          <Link
            to="/pendencias"
            className="inline-flex items-center gap-0.5 rounded-marker text-label font-semibold text-accent-ink hover:underline"
          >
            Ver todas
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      {tasks.isPending ? (
        <div className="p-4">
          <TextSkeleton lines={3} />
        </div>
      ) : tasks.isError ? (
        <div className="p-4">
          <InlineError
            error={tasks.error}
            onRetry={() => void tasks.refetch()}
          />
        </div>
      ) : tasks.data.data.length === 0 ? (
        <EmptyState
          compact
          icon={ClipboardList}
          title="Nada vencendo"
          description="Retornos e confirmações com prazo para hoje aparecem aqui."
        />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {tasks.data.data.map((task) => (
            <li key={task.id} className="px-4 py-2.5 md:px-5">
              <Link
                to={`/pacientes/${task.patientId}`}
                className="block truncate text-body font-semibold text-ink-primary hover:text-accent-ink hover:underline"
              >
                {task.patientName}
              </Link>
              <p className="truncate text-label text-ink-secondary">
                {task.title}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function DashboardEmpty({ filter }: { filter: Filter }) {
  if (filter === "confirmar") {
    return (
      <EmptyState
        icon={CheckCheck}
        title="Nenhuma confirmação pendente"
        description="As consultas agendadas que precisam de confirmação aparecem aqui."
      />
    );
  }
  if (filter === "atrasadas") {
    return (
      <EmptyState
        icon={CheckCheck}
        title="Nenhuma consulta atrasada"
        description="Tudo dentro da tolerância de atraso configurada para a clínica."
      />
    );
  }
  if (filter === "concluidas") {
    return (
      <EmptyState
        icon={CheckCheck}
        title="Nenhuma consulta concluída ainda"
        description="Consultas finalizadas pelo consultório aparecem aqui ao longo do dia."
      />
    );
  }
  return (
    <EmptyState
      icon={CalendarPlus}
      title={
        filter === "abertas"
          ? "Nenhuma consulta em aberto"
          : "Agenda de hoje vazia"
      }
      description="Agende pelo botão abaixo ou pela busca, com o nome, CPF ou telefone do paciente."
      action={
        <ButtonLink to="/consultas/nova">Agendar uma consulta</ButtonLink>
      }
    />
  );
}
