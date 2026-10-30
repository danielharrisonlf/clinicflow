import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlarmClock,
  CalendarClock,
  CalendarPlus,
  Check,
  ClipboardCheck,
  ClipboardList,
  FileUser,
  MessageCircle,
  MoreHorizontal,
  PhoneCall,
  Plus,
  RotateCcw,
  UserX,
  X,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { PageHeader } from "@/components/ui/page";
import { clampPage, Pagination } from "@/components/ui/pagination";
import {
  EmptyState,
  ErrorState,
  InlineError,
  RowsSkeleton,
} from "@/components/ui/states";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/client";
import { tasksApi } from "@/lib/api/endpoints";
import {
  type ListTasksQuery,
  TASK_TYPE,
  type TaskItem,
  type TaskType,
} from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, phoneDigits, plural, whatsappUrl } from "@/lib/utils";
import {
  formatRelative,
  TASK_TYPE_LABEL,
  todayISO,
} from "../appointments/labels";
import { NewTaskOverlay } from "./new-task-overlay";
import { ResolveTaskOverlay } from "./resolve-task-overlay";

const PAGE_SIZE = 15;

/** Os três números do funil viram atalho para o filtro do mesmo tipo. */
const SUMMARY_TILES: {
  type: TaskType;
  label: string;
  key: "returnsToSchedule" | "pendingConfirmations" | "noShowsToRecover";
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "warning" | "danger";
}[] = [
  {
    type: "RETORNO_A_AGENDAR",
    label: "Retornos a agendar",
    key: "returnsToSchedule",
    icon: RotateCcw,
    tone: "default",
  },
  {
    type: "CONFIRMACAO_PENDENTE",
    label: "Confirmações pendentes",
    key: "pendingConfirmations",
    icon: PhoneCall,
    tone: "warning",
  },
  {
    type: "RESGATE_NO_SHOW",
    label: "Faltas a resgatar",
    key: "noShowsToRecover",
    icon: UserX,
    tone: "danger",
  },
];

/** Tudo o que deriva de uma pendência: a lista, o resumo, a ficha e o painel. */
function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => {
    for (const queryKey of [qk.tasks.all, qk.patients.all, qk.dashboard.all]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
}

/** Funil de pós-consulta. Existe para combater no-show, então prazo é o que ordena. */
export function TasksPage() {
  const toast = useToast();
  const invalidate = useInvalidateTasks();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [resolving, setResolving] = useState<TaskItem | null>(null);

  const types = params
    .getAll("tipo")
    .filter((value): value is TaskType =>
      (TASK_TYPE as readonly string[]).includes(value),
    );
  const dueToday = params.get("vence") === "hoje";
  const page = Number(params.get("pagina") ?? "1") || 1;
  const filtered = types.length > 0 || dueToday;

  function update(next: {
    tipos?: TaskType[];
    vence?: boolean;
    pagina?: number;
  }) {
    const search = new URLSearchParams(params);
    if (next.tipos) {
      search.delete("tipo");
      for (const type of next.tipos) search.append("tipo", type);
    }
    if (next.vence !== undefined) {
      if (next.vence) search.set("vence", "hoje");
      else search.delete("vence");
    }
    // Filtro novo sempre recomeça da primeira página.
    if (next.pagina && next.pagina > 1)
      search.set("pagina", String(next.pagina));
    else search.delete("pagina");
    setParams(search, { replace: true });
  }

  function toggleType(type: TaskType) {
    update({
      tipos: types.includes(type)
        ? types.filter((t) => t !== type)
        : [...types, type],
    });
  }

  const query: ListTasksQuery = {
    page,
    limit: PAGE_SIZE,
    status: ["ABERTA", "EM_ANDAMENTO"],
    type: types.length > 0 ? types : undefined,
    dueBefore: dueToday ? todayISO() : undefined,
  };

  const tasks = useQuery({
    queryKey: qk.tasks.list(query),
    queryFn: () => tasksApi.list(query),
    placeholderData: keepPreviousData,
  });

  const summary = useQuery({
    queryKey: qk.tasks.summary,
    queryFn: tasksApi.summary,
  });

  // Resolveu o último item da página 3: a página 3 deixou de existir.
  const meta = tasks.data?.meta;
  useEffect(() => {
    if (!meta || tasks.isPlaceholderData) return;
    const target = meta.pageCount === 0 ? 1 : clampPage(page, meta);
    if (target !== page) update({ pagina: target });
  });

  const contact = useMutation({
    mutationFn: (task: TaskItem) => tasksApi.contact(task.id),
    onSuccess: (_saved, task) => {
      invalidate();
      toast.push({
        tone: "success",
        title: "Contato registrado",
        description: `A pendência de ${task.patientName} ficou em andamento.`,
      });
    },
    onError: (error) =>
      toast.push({
        tone: "error",
        title: "O contato não foi registrado",
        description: errorMessage(error),
      }),
  });

  const list = tasks.data?.data ?? [];
  const s = summary.data;

  return (
    <>
      <PageHeader
        title="Pendências e retornos"
        description="O que precisa de um contato antes que vire falta."
        actions={
          <Button onClick={() => setCreating(true)} className="max-sm:w-full">
            <Plus aria-hidden="true" />
            Nova pendência
          </Button>
        }
      />

      <section
        aria-label="Resumo das pendências"
        className="mb-5 flex flex-col gap-3"
      >
        {summary.isError && !s ? (
          <InlineError
            error={summary.error}
            onRetry={() => void summary.refetch()}
            label="O resumo das pendências não carregou."
          />
        ) : null}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-4">
          {SUMMARY_TILES.map((tile) => (
            <SummaryTile
              key={tile.type}
              label={tile.label}
              icon={tile.icon}
              value={s ? s[tile.key] : undefined}
              tone={tile.tone}
              pressed={types.includes(tile.type)}
              onClick={() => toggleType(tile.type)}
            />
          ))}
          <SummaryTile
            label="Resolvidas hoje"
            icon={ClipboardCheck}
            value={s?.resolvedToday}
            tone="default"
          />
        </div>
      </section>

      <Panel aria-labelledby="em-aberto">
        <PanelHeader
          id="em-aberto"
          title="Em aberto"
          count={meta ? plural(meta.itemCount, "pendência") : undefined}
          description={
            filtered ? "Mostrando só o que bate com os filtros." : undefined
          }
        />

        <div className="flex items-center gap-2 overflow-x-auto border-b [scrollbar-width:none] sm:flex-wrap border-border-subtle px-4 py-3 md:px-5">
          <fieldset className="flex shrink-0 gap-2 sm:shrink sm:flex-wrap">
            <legend className="sr-only">Filtrar por tipo</legend>
            {TASK_TYPE.map((type) => (
              <FilterChip
                key={type}
                pressed={types.includes(type)}
                onClick={() => toggleType(type)}
              >
                {TASK_TYPE_LABEL[type]}
              </FilterChip>
            ))}
          </fieldset>
          <span
            aria-hidden="true"
            className="mx-1 hidden h-5 w-px bg-border-default sm:block"
          />
          <FilterChip
            pressed={dueToday}
            onClick={() => update({ vence: !dueToday })}
          >
            <AlarmClock className="size-3.5" aria-hidden="true" />
            Vence até hoje
          </FilterChip>
          {filtered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => update({ tipos: [], vence: false })}
            >
              <X aria-hidden="true" />
              Limpar filtros
            </Button>
          ) : null}
        </div>

        {tasks.isPending ? (
          <RowsSkeleton rows={5} />
        ) : tasks.isError && !tasks.data ? (
          <ErrorState
            error={tasks.error}
            onRetry={() => void tasks.refetch()}
          />
        ) : list.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma pendência com esses filtros"
              description="Tire um filtro para ver o resto do funil."
              action={
                <Button
                  variant="secondary"
                  onClick={() => update({ tipos: [], vence: false })}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhuma pendência aberta"
              description="Todo retorno foi agendado e toda confirmação foi respondida. Se lembrar de algo para acompanhar, registre aqui."
              action={
                <Button variant="secondary" onClick={() => setCreating(true)}>
                  <Plus aria-hidden="true" />
                  Nova pendência
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul
              className={cn(
                "divide-y divide-border-subtle transition-opacity duration-150",
                tasks.isPlaceholderData && "opacity-60",
              )}
            >
              {list.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  contacting={
                    contact.isPending && contact.variables?.id === task.id
                  }
                  onContact={() => contact.mutate(task)}
                  onResolve={() => setResolving(task)}
                />
              ))}
            </ul>
            {meta ? (
              <Pagination
                meta={meta}
                unit="pendências"
                fetching={tasks.isFetching && tasks.isPlaceholderData}
                onChange={(next) => update({ pagina: next })}
              />
            ) : null}
          </>
        )}
      </Panel>

      {creating ? <NewTaskOverlay onClose={() => setCreating(false)} /> : null}
      {resolving ? (
        <ResolveTaskOverlay
          task={resolving}
          onClose={() => setResolving(null)}
        />
      ) : null}
    </>
  );
}

/** Número do funil que também filtra. Botão de alternância, não link: fica na mesma tela. */
function SummaryTile({
  label,
  value,
  icon: Icon,
  tone,
  pressed,
  onClick,
}: {
  label: string;
  value?: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "warning" | "danger";
  pressed?: boolean;
  onClick?: () => void;
}) {
  const attention = value !== undefined && value > 0;
  const ink =
    attention && tone === "warning"
      ? "text-warning"
      : attention && tone === "danger"
        ? "text-danger"
        : "text-ink-primary";
  const chip =
    attention && tone === "warning"
      ? "bg-warning-weak text-warning"
      : attention && tone === "danger"
        ? "bg-danger-weak text-danger"
        : "bg-surface-sunken text-ink-secondary";
  const body = (
    <>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-control",
          chip,
        )}
        aria-hidden="true"
      >
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0">
        <span
          className={cn("block font-mono text-metric-sm font-semibold", ink)}
        >
          {value ?? "—"}
        </span>
        <span className="block text-label leading-tight text-ink-secondary">
          {label}
        </span>
      </span>
      {pressed ? (
        <Check
          className="ml-auto size-4 shrink-0 self-start text-accent-ink"
          aria-hidden="true"
        />
      ) : null}
    </>
  );
  const base =
    "flex min-w-0 items-center gap-3 bg-surface-base px-3.5 py-3 text-left";
  if (!onClick) {
    return <div className={base}>{body}</div>;
  }
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      title={pressed ? "Tirar este filtro" : "Incluir este tipo no filtro"}
      className={cn(
        base,
        "transition-colors",
        pressed ? "bg-accent-weak" : "hover:bg-surface-app",
      )}
    >
      {body}
    </button>
  );
}

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-label font-semibold transition-colors duration-150 pointer-coarse:min-h-11",
        pressed
          ? "border-accent bg-accent-weak text-accent-ink"
          : "border-border-default bg-surface-base text-ink-secondary hover:border-border-strong hover:text-ink-primary",
      )}
    >
      {pressed ? <Check className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

type PrimaryKind = "schedule" | "message" | "profile";

/**
 * A ação sugerida vem pronta do backend ("Agendar retorno", "Ligar WhatsApp").
 * Aqui ela vira o que diz: agendar abre a consulta nova já com o paciente,
 * contato abre o WhatsApp. Antes, qualquer botão resolvia a pendência.
 */
function primaryKind(task: TaskItem): PrimaryKind {
  const text = task.suggestedAction.toLowerCase();
  if (text.includes("agendar")) return "schedule";
  if (
    /whatsapp|confirmar|ligar|enviar|contat/.test(text) &&
    task.patientPhone
  ) {
    return "message";
  }
  return "profile";
}

function TaskRow({
  task,
  contacting,
  onContact,
  onResolve,
}: {
  task: TaskItem;
  contacting: boolean;
  onContact: () => void;
  onResolve: () => void;
}) {
  const kind = primaryKind(task);
  const actionClass = "max-md:h-11 max-md:text-body";

  return (
    <li className="grid grid-cols-1 gap-3 px-4 py-4 md:px-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start xl:gap-x-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/pacientes/${task.patientId}`}
            className="truncate text-card font-semibold text-ink-primary hover:text-accent-ink hover:underline"
          >
            {task.patientName}
          </Link>
          <Badge size="sm">{TASK_TYPE_LABEL[task.type]}</Badge>
          {task.status === "EM_ANDAMENTO" ? (
            <Badge tone="info" size="sm">
              Em andamento
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-body text-ink-primary">{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-secondary">
          {task.isUrgent ? (
            <Badge tone="danger" size="sm">
              <AlarmClock aria-hidden="true" />
              {task.dueLabel}
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {task.dueLabel}
            </span>
          )}
          {task.patientPhone ? (
            <a
              href={`tel:${phoneDigits(task.patientPhone)}`}
              className="inline-flex items-center rounded-marker font-mono hover:text-accent-ink hover:underline pointer-coarse:min-h-11"
            >
              <span className="sr-only">Ligar para </span>
              {task.patientPhone}
            </a>
          ) : null}
          <span>
            {task.lastContactAt
              ? `Último contato ${formatRelative(task.lastContactAt)}`
              : "Sem contato registrado"}
          </span>
        </div>
        {task.notes ? (
          <p className="mt-1.5 line-clamp-2 text-label text-ink-secondary">
            <span className="sr-only">Observações: </span>
            {task.notes}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 xl:justify-end">
        {kind === "schedule" ? (
          <ButtonLink
            to={`/consultas/nova?patientId=${task.patientId}${task.type === "RETORNO_A_AGENDAR" ? "&tipo=RETORNO" : ""}`}
            size="sm"
            className={cn("min-w-0 flex-1 sm:flex-none", actionClass)}
          >
            <CalendarPlus aria-hidden="true" />
            {task.suggestedAction}
          </ButtonLink>
        ) : kind === "message" ? (
          <ButtonAnchor
            href={whatsappUrl(task.patientPhone)}
            target="_blank"
            rel="noopener noreferrer"
            size="sm"
            className={cn("min-w-0 flex-1 sm:flex-none", actionClass)}
          >
            <MessageCircle aria-hidden="true" />
            {task.suggestedAction}
            <span className="sr-only"> (abre o WhatsApp em nova aba)</span>
          </ButtonAnchor>
        ) : (
          <ButtonLink
            to={`/pacientes/${task.patientId}`}
            size="sm"
            className={cn("min-w-0 flex-1 sm:flex-none", actionClass)}
          >
            <FileUser aria-hidden="true" />
            {task.suggestedAction}
          </ButtonLink>
        )}
        <Menu
          label={`Mais ações para ${task.patientName}`}
          trigger={(props) => (
            <Button
              {...props}
              variant="secondary"
              size="icon-sm"
              aria-label={`Mais ações para ${task.patientName}`}
              disabled={contacting}
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          )}
        >
          <MenuItem
            onSelect={onContact}
            icon={<PhoneCall />}
            disabled={contacting}
          >
            {contacting ? "Registrando contato…" : "Registrar contato"}
          </MenuItem>
          <MenuItem onSelect={onResolve} icon={<Check />}>
            Marcar como resolvida
          </MenuItem>
        </Menu>
      </div>
    </li>
  );
}
