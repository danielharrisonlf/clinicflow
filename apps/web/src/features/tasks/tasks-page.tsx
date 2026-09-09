import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui/states";
import { Metric, Panel, PanelHeader } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { tasksApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { TASK_TYPE_LABEL } from "../appointments/labels";

/** Funil de pós-consulta. Existe para combater no-show, então prazo é o que ordena. */
export function TasksPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);

  const query = {
    page,
    limit: 15,
    status: ["ABERTA" as const, "EM_ANDAMENTO" as const],
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

  const resolve = useMutation({
    mutationFn: (id: string) => tasksApi.resolve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.tasks.all });
      void queryClient.invalidateQueries({ queryKey: qk.patients.all });
      toast.push({ tone: "success", title: "Pendência resolvida" });
    },
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header>
        <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
          Pendências e retornos
        </h1>
        <p className="mt-0.5 text-body text-ink-secondary">
          O que precisa de um contato antes que vire falta.
        </p>
      </header>

      <section
        aria-label="Resumo das pendências"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <Metric
          label="Retornos a agendar"
          value={summary.data?.returnsToSchedule ?? "—"}
        />
        <Metric
          label="Confirmações pendentes"
          value={summary.data?.pendingConfirmations ?? "—"}
          tone="warning"
        />
        <Metric
          label="Faltas a resgatar"
          value={summary.data?.noShowsToRecover ?? "—"}
          tone="danger"
        />
        <Metric
          label="Resolvidas hoje"
          value={summary.data?.resolvedToday ?? "—"}
        />
      </section>

      <Panel>
        <PanelHeader
          title="Em aberto"
          count={
            tasks.data ? `${tasks.data.meta.itemCount} pendências` : undefined
          }
        />

        {tasks.isPending ? (
          <RowsSkeleton rows={6} />
        ) : tasks.isError ? (
          <ErrorState
            error={tasks.error}
            onRetry={() => void tasks.refetch()}
          />
        ) : tasks.data.data.length === 0 ? (
          <EmptyState
            title="Nenhuma pendência aberta"
            description="Todo retorno foi agendado e toda confirmação foi respondida. O funil está limpo."
          />
        ) : (
          <>
            <ul className="divide-y divide-border-subtle">
              {tasks.data.data.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/pacientes/${task.patientId}`}
                      className="text-body font-semibold text-ink-primary hover:text-accent"
                    >
                      {task.patientName}
                    </Link>
                    <p className="text-micro text-ink-secondary">
                      {task.title}
                    </p>
                    <p className="text-micro text-ink-tertiary">
                      {TASK_TYPE_LABEL[task.type]}
                    </p>
                  </div>

                  <span
                    className={
                      task.isUrgent
                        ? "shrink-0 rounded-full bg-state-atrasada-weak px-2.5 py-0.5 text-micro font-semibold text-state-atrasada"
                        : "shrink-0 text-micro text-ink-secondary"
                    }
                  >
                    {task.dueLabel}
                  </span>

                  <Button
                    size="sm"
                    variant="secondary"
                    className="max-sm:w-full"
                    loading={resolve.isPending && resolve.variables === task.id}
                    onClick={() => resolve.mutate(task.id)}
                  >
                    {task.suggestedAction}
                  </Button>
                </li>
              ))}
            </ul>
            <Pagination
              meta={tasks.data.meta}
              unit="pendências"
              onChange={setPage}
            />
          </>
        )}
      </Panel>
    </div>
  );
}
