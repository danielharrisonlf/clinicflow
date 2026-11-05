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
  LifeBuoy,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { useEffect } from "react";
import {
  Link,
  useLocation,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { Dot } from "@/components/ui/badge";
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
import { Panel, PanelHeader, StatTile } from "@/components/ui/surface";
import { subscribe } from "@/lib/api/client";
import {
  appointmentsApi,
  dashboardApi,
  tasksApi,
  waitingRoomApi,
} from "@/lib/api/endpoints";
import type {
  ListTasksQuery,
  TaskItem,
  TaskType,
  TodaySummary,
} from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, plural } from "@/lib/utils";
import { AppointmentList } from "../appointments/appointment-list";
import {
  APPOINTMENT_TYPE_LABEL,
  TASK_TYPE_LABEL,
  todayISO,
} from "../appointments/labels";
import { type Filter, queryFor } from "./filters";
import { NoShowPanel } from "./no-show-panel";

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

  // O Cockpit fica aberto o dia todo. O stream evita que a recepção chame
  // alguém que o consultório já atendeu. Só as listas, a fila e os envios
  // recarregam — invalidar todo `appointments` refazia detalhes e auditorias
  // abertos. A resposta do paciente no WhatsApp chega por aqui também.
  useEffect(() => {
    return subscribe<TodaySummary>("/dashboard/stream", (incoming) => {
      queryClient.setQueryData(qk.dashboard.today(date), incoming);
      void queryClient.invalidateQueries({
        queryKey: ["appointments", "list"],
      });
      void queryClient.invalidateQueries({ queryKey: qk.waitingRoom.all });
      void queryClient.invalidateQueries({ queryKey: qk.notifications.all });
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
        title="Cockpit do dia"
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

      <div className="flex flex-col gap-5">
        <HeroStats
          summary={s}
          error={summary.error}
          onRetry={() => void summary.refetch()}
          onLate={() => update({ filtro: "atrasadas" })}
          onUnconfirmed={() => update({ filtro: "confirmar" })}
          onCompleted={() => update({ filtro: "concluidas" })}
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <NextArrival
              id="proxima-chegada-mobile"
              appointment={s?.nextArrival}
              loading={summary.isPending}
              className="xl:hidden"
            />

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

          {/* Coluna viva. Abaixo de xl só a Prevenção de faltas desce para
              baixo da lista: a sala e as pendências têm tela própria na
              navegação, o risco de falta só existe aqui. */}
          <aside aria-label="Agora na clínica" className="flex flex-col gap-5">
            <QueuePreview className="hidden xl:block" />
            <NextArrival
              id="proxima-chegada-desktop"
              appointment={s?.nextArrival}
              loading={summary.isPending}
              className="hidden xl:block"
            />
            <NoShowPanel
              date={date}
              onShowAll={() => update({ filtro: "confirmar" })}
            />
            <RescueTasks className="hidden xl:block" />
          </aside>
        </div>
      </div>
    </>
  );
}

/**
 * Faixa hero do bento. São atalhos, não troféus: cada contagem leva para onde
 * a pessoa resolve aquilo. Os dois números vivos (sala e consultório) ganham
 * mais largura; o dot pulsa só quando há alguém ali agora.
 */
function HeroStats({
  summary,
  error,
  onRetry,
  onLate,
  onUnconfirmed,
  onCompleted,
}: {
  summary?: TodaySummary;
  error: unknown;
  onRetry: () => void;
  onLate: () => void;
  onUnconfirmed: () => void;
  onCompleted: () => void;
}) {
  if (error && !summary) {
    return (
      <InlineError
        error={error}
        onRetry={onRetry}
        label="O resumo do dia não carregou."
      />
    );
  }

  const value = (n?: number) => (n === undefined ? "—" : n);
  const live = (n?: number) => (n !== undefined && n > 0 ? "pulse" : "static");
  const waiting = summary?.waiting;
  const inProgress = summary?.inProgress;
  const late = summary?.late;
  const unconfirmed = summary?.unconfirmed;
  const completed = summary?.completed;

  return (
    <section
      aria-label="Resumo de agora"
      className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4 xl:grid-cols-12"
    >
      <StatTile
        label="Aguardando"
        value={value(waiting)}
        tone={waiting ? "warning" : "default"}
        dot={live(waiting)}
        icon={<Armchair />}
        hint={
          waiting
            ? `${waiting === 1 ? "paciente" : "pacientes"} na sala de espera`
            : "Sala de espera vazia"
        }
        to="/sala-de-espera"
        className="col-span-2 md:col-span-3 xl:col-span-3"
      />
      <StatTile
        label="Em atendimento"
        value={value(inProgress)}
        dot={live(inProgress)}
        dotTone={inProgress ? "atendimento" : undefined}
        icon={<Stethoscope />}
        hint="nos consultórios agora"
        className="md:col-span-3 xl:col-span-3"
      />
      <StatTile
        label="A confirmar"
        value={value(unconfirmed)}
        tone={unconfirmed ? "warning" : "default"}
        icon={<CalendarClock />}
        hint={summary ? `${summary.confirmed} já confirmadas` : undefined}
        onClick={onUnconfirmed}
        className="md:col-span-2"
      />
      <StatTile
        label="Atrasadas"
        value={value(late)}
        tone={late ? "danger" : "default"}
        dot={late ? "pulse" : undefined}
        icon={<TriangleAlert />}
        hint="fora da tolerância"
        onClick={onLate}
        className="md:col-span-2"
      />
      <StatTile
        label="Concluídas"
        value={value(completed)}
        tone={completed ? "revenue" : "default"}
        dot="static"
        dotTone={completed ? "revenue" : undefined}
        icon={<CheckCheck />}
        hint={summary ? `de ${summary.scheduled} no dia` : undefined}
        onClick={onCompleted}
        className="md:col-span-2"
      />
    </section>
  );
}

function NextArrival({
  id,
  appointment,
  loading,
  className,
}: {
  id: string;
  appointment?: TodaySummary["nextArrival"];
  loading: boolean;
  className?: string;
}) {
  const location = useLocation();
  return (
    <Panel aria-labelledby={id} className={className}>
      <PanelHeader id={id} title="Próxima chegada" />
      {loading ? (
        <div className="p-4 md:px-5">
          <TextSkeleton lines={2} />
        </div>
      ) : appointment ? (
        <div className="flex items-center gap-4 px-4 py-3.5 md:px-5">
          <p className="shrink-0 font-mono text-metric-sm font-semibold tracking-tight text-ink-primary tabular-nums">
            {appointment.time}
          </p>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-ink-primary">
              {appointment.patientName}
            </p>
            <p className="truncate text-label text-ink-secondary">
              {APPOINTMENT_TYPE_LABEL[appointment.type]} com{" "}
              {appointment.professionalName}
            </p>
          </div>
          <Link
            to={`/consultas/${appointment.id}`}
            state={{
              from: `${location.pathname}${location.search}`,
              backgroundLocation: location,
            }}
            className="inline-flex shrink-0 items-center gap-0.5 rounded-control px-2 py-2 text-label font-semibold text-accent-ink transition-colors hover:bg-accent-weak pointer-coarse:min-h-11"
          >
            Abrir
            <span className="sr-only">
              consulta de {appointment.patientName}
            </span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <p className="px-4 py-3.5 text-label text-ink-secondary md:px-5">
          Sem novas chegadas previstas para hoje.
        </p>
      )}
    </Panel>
  );
}

/** Quem está esperando agora, na ordem de chegada. A sala completa vive na tela própria. */
function QueuePreview({ className }: { className?: string }) {
  const queue = useQuery({
    queryKey: qk.waitingRoom.list,
    queryFn: waitingRoomApi.list,
  });

  return (
    <Panel aria-labelledby="fila-agora" className={className}>
      <PanelHeader
        id="fila-agora"
        title="Sala de espera"
        count={queue.data ? plural(queue.data.length, "paciente") : undefined}
        actions={<PanelLink to="/sala-de-espera">Abrir</PanelLink>}
      />
      {queue.isPending ? (
        <div className="p-4 md:px-5">
          <TextSkeleton lines={3} />
        </div>
      ) : queue.isError ? (
        <div className="p-4 md:px-5">
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
          {queue.data.slice(0, 5).map((item, index) => (
            <li
              key={item.appointmentId}
              className="flex items-center gap-3 px-4 py-2.5 md:px-5"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-micro font-semibold text-ink-secondary">
                <span className="sr-only">Posição </span>
                {index + 1}
              </span>
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
                  "inline-flex shrink-0 items-center gap-1.5 font-mono text-label font-semibold tabular-nums",
                  item.isLate ? "text-danger" : "text-warning",
                )}
              >
                <Dot pulse />
                {item.waitingLabel}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

const RESCUE_TYPES: TaskType[] = ["RESGATE_NO_SHOW", "CONFIRMACAO_PENDENTE"];

/**
 * Resgates do dia: faltas a recuperar e confirmações pendentes que vencem até
 * hoje. Sem nenhum resgate, o painel volta a ser "Vencem até hoje" com as
 * demais pendências — a coluna nunca fica com um painel vazio à toa.
 */
function RescueTasks({ className }: { className?: string }) {
  const today = todayISO();
  const rescueQuery: ListTasksQuery = {
    limit: 5,
    dueBefore: today,
    type: RESCUE_TYPES,
  };
  const rescues = useQuery({
    queryKey: qk.tasks.list(rescueQuery),
    queryFn: () => tasksApi.list(rescueQuery),
  });
  const fallback = rescues.isSuccess && rescues.data.data.length === 0;
  const dueQuery: ListTasksQuery = { limit: 5, dueBefore: today };
  const due = useQuery({
    queryKey: qk.tasks.list(dueQuery),
    queryFn: () => tasksApi.list(dueQuery),
    enabled: fallback,
  });
  const tasks = fallback ? due : rescues;

  return (
    <Panel aria-labelledby="pendencias-hoje" className={className}>
      <PanelHeader
        id="pendencias-hoje"
        title={fallback ? "Vencem até hoje" : "Resgates do dia"}
        count={tasks.data ? String(tasks.data.meta.itemCount) : undefined}
        actions={<PanelLink to="/pendencias">Ver todas</PanelLink>}
      />
      {tasks.isPending ? (
        <div className="p-4 md:px-5">
          <TextSkeleton lines={3} />
        </div>
      ) : tasks.isError ? (
        <div className="p-4 md:px-5">
          <InlineError
            error={tasks.error}
            onRetry={() => void tasks.refetch()}
          />
        </div>
      ) : tasks.data.data.length === 0 ? (
        <EmptyState
          compact
          icon={fallback ? ClipboardList : LifeBuoy}
          title="Nada vencendo"
          description="Retornos, resgates de falta e confirmações com prazo para hoje aparecem aqui."
        />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {tasks.data.data.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TaskRow({ task }: { task: TaskItem }) {
  return (
    <li className="flex items-start gap-3 px-4 py-2.5 md:px-5">
      <span
        className={cn(
          "mt-2 flex",
          task.isUrgent ? "text-danger" : "text-ink-tertiary",
        )}
      >
        <Dot className="size-2" />
      </span>
      <div className="min-w-0 flex-1">
        <Link
          to={`/pacientes/${task.patientId}`}
          className="block truncate text-body font-semibold text-ink-primary hover:text-accent-ink hover:underline"
        >
          {task.patientName}
        </Link>
        <p className="truncate text-label text-ink-secondary">
          {TASK_TYPE_LABEL[task.type]} · {task.title}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-label font-semibold",
          task.isUrgent ? "text-danger" : "text-ink-tertiary",
        )}
      >
        {task.dueLabel}
      </span>
    </li>
  );
}

function PanelLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 rounded-marker text-label font-semibold text-accent-ink hover:underline pointer-coarse:min-h-11"
    >
      {children}
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
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
