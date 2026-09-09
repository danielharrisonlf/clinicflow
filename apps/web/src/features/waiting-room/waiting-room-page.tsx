import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CardsSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { Metric, Panel, PanelHeader } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { subscribe } from "@/lib/api/client";
import { waitingRoomApi } from "@/lib/api/endpoints";
import type { WaitingRoomItem } from "@/lib/api/types";
import { qk } from "@/lib/query";

export function WaitingRoomPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const queue = useQuery({
    queryKey: qk.waitingRoom.list,
    queryFn: waitingRoomApi.list,
  });

  const metrics = useQuery({
    queryKey: qk.waitingRoom.metrics,
    queryFn: waitingRoomApi.metrics,
  });

  // A fila é a tela que mais envelhece: um minuto de atraso aqui é alguém
  // esperando em pé. O stream substitui o refetch por foco de janela.
  useEffect(() => {
    return subscribe<WaitingRoomItem[]>("/waiting-room/stream", (incoming) => {
      queryClient.setQueryData(qk.waitingRoom.list, incoming);
      void queryClient.invalidateQueries({ queryKey: qk.waitingRoom.metrics });
    });
  }, [queryClient]);

  const start = useMutation({
    mutationFn: (appointmentId: string) => waitingRoomApi.start(appointmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.waitingRoom.all });
      void queryClient.invalidateQueries({ queryKey: qk.appointments.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
    },
    onError: () =>
      toast.push({
        tone: "error",
        title: "Não foi possível iniciar",
        description: "A consulta pode ter mudado de estado em outro terminal.",
      }),
  });

  const callNext = useMutation({
    mutationFn: waitingRoomApi.callNext,
    onSuccess: (called) => {
      void queryClient.invalidateQueries({ queryKey: qk.waitingRoom.all });
      toast.push({
        tone: called ? "success" : "warning",
        title: called ? "Paciente chamado" : "Ninguém na fila",
        description: called
          ? `${called.patientName} apareceu no painel da sala.`
          : "Nenhum paciente aguardando para chamar.",
      });
    },
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
            Sala de espera
          </h1>
          <p className="mt-0.5 text-body text-ink-secondary">
            Fila física, ordenada por quem chegou primeiro.
          </p>
        </div>
        <Button
          variant="secondary"
          loading={callNext.isPending}
          onClick={() => callNext.mutate()}
        >
          Chamar próximo
        </Button>
      </header>

      <section aria-label="Métricas da fila" className="grid grid-cols-3 gap-3">
        <Metric
          label="Aguardando"
          value={metrics.data?.waitingCount ?? "—"}
          tone="warning"
        />
        <Metric
          label="Espera média"
          value={metrics.data ? `${metrics.data.averageWaitMinutes}min` : "—"}
        />
        <Metric
          label="Maior espera"
          value={metrics.data ? `${metrics.data.longestWaitMinutes}min` : "—"}
          tone={
            (metrics.data?.longestWaitMinutes ?? 0) >= 30 ? "danger" : "default"
          }
        />
      </section>

      <Panel>
        <PanelHeader
          title="Na fila"
          count={queue.data ? `${queue.data.length} pessoas` : undefined}
        />

        {queue.isPending ? (
          <div className="p-4">
            <CardsSkeleton cards={3} />
          </div>
        ) : queue.isError ? (
          <ErrorState
            error={queue.error}
            onRetry={() => void queue.refetch()}
          />
        ) : queue.data.length === 0 ? (
          <EmptyState
            title="Sala de espera vazia"
            description="Ninguém fez check-in ainda. Assim que alguém chegar, aparece aqui com o tempo de espera contando."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {queue.data.map((item) => (
              <li
                key={item.appointmentId}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body font-semibold text-ink-primary">
                    {item.patientName}
                  </span>
                  <span className="truncate text-micro text-ink-secondary">
                    {item.professionalName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-state-espera">
                  <Clock className="size-4" aria-hidden="true" />
                  <span className="font-mono text-body font-bold tabular-nums">
                    {item.waitingLabel}
                  </span>
                </div>

                <p className="flex w-full gap-4 font-mono text-micro text-ink-tertiary sm:w-auto">
                  <span>chegou {item.checkedInAtLabel}</span>
                  <span>previsto {item.scheduledAtLabel}</span>
                </p>

                <Button
                  size="sm"
                  className="max-sm:w-full"
                  loading={
                    start.isPending && start.variables === item.appointmentId
                  }
                  disabled={start.isPending}
                  onClick={() => start.mutate(item.appointmentId)}
                >
                  Iniciar atendimento
                </Button>
              </li>
            ))}
          </ul>
        )}

        {queue.data && queue.data.length > 0 ? (
          <p className="border-t border-border-subtle px-4 py-3 text-micro text-ink-tertiary">
            Fim da fila — {queue.data.length}{" "}
            {queue.data.length === 1
              ? "paciente aguardando"
              : "pacientes aguardando"}
            .
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
