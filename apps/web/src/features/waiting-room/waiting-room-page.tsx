import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Armchair,
  Clock,
  Hourglass,
  Megaphone,
  Phone,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import {
  EmptyState,
  ErrorState,
  InlineError,
  RowsSkeleton,
} from "@/components/ui/states";
import { Panel, PanelHeader, StatTile } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { errorMessage, subscribe } from "@/lib/api/client";
import { waitingRoomApi } from "@/lib/api/endpoints";
import type { WaitingRoomItem } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, phoneDigits, plural } from "@/lib/utils";
import { APPOINTMENT_TYPE_LABEL } from "../appointments/labels";
import { useAppointmentTransition } from "../appointments/use-appointment-actions";

/** Espera a partir da qual o número pede atenção mesmo sem atraso formal. */
const LONG_WAIT_MINUTES = 30;

export function WaitingRoomPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const transition = useAppointmentTransition();

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

  const callNext = useMutation({
    mutationFn: waitingRoomApi.callNext,
    onSuccess: (called) => {
      for (const queryKey of [
        qk.waitingRoom.all,
        qk.appointments.all,
        qk.dashboard.all,
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      toast.push(
        called
          ? {
              tone: "success",
              title: "Paciente chamado",
              description: `Chamando ${called.patientName} para ${called.professionalName}.`,
            }
          : {
              tone: "warning",
              title: "Ninguém na fila",
              description: "Não há paciente aguardando para chamar.",
            },
      );
    },
    onError: (error) =>
      toast.push({
        tone: "error",
        title: "Não foi possível chamar o próximo",
        description: errorMessage(error),
      }),
  });

  const items = queue.data ?? [];
  const empty = queue.isSuccess && items.length === 0;

  const m = metrics.data;

  return (
    <>
      <PageHeader
        title="Sala de espera"
        description="Fila por ordem de chegada. Atualiza sozinha a cada check-in."
        actions={
          <Button
            loading={callNext.isPending}
            disabled={
              empty || queue.isPending || (queue.isError && !queue.data)
            }
            onClick={() => callNext.mutate()}
            className="max-sm:w-full"
          >
            <Megaphone aria-hidden="true" />
            Chamar próximo
          </Button>
        }
      />

      <section
        aria-label="Números da fila"
        className="mb-5 flex flex-col gap-3"
      >
        {metrics.isError && !m ? (
          <InlineError
            error={metrics.error}
            onRetry={() => void metrics.refetch()}
            label="Os números da fila não carregaram."
          />
        ) : null}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Aguardando"
            icon={<Armchair />}
            value={m ? m.waitingCount : "—"}
            tone={m && m.waitingCount > 0 ? "warning" : "default"}
          />
          <StatTile
            label="Espera média"
            icon={<Hourglass />}
            value={m ? `${m.averageWaitMinutes} min` : "—"}
          />
          <StatTile
            label="Maior espera"
            icon={<Clock />}
            value={m ? `${m.longestWaitMinutes} min` : "—"}
            tone={
              m && m.longestWaitMinutes >= LONG_WAIT_MINUTES
                ? "danger"
                : "default"
            }
          />
          <StatTile
            label="Em atendimento"
            icon={<Stethoscope />}
            value={m ? m.inProgressCount : "—"}
          />
        </div>
      </section>

      <Panel aria-labelledby="fila">
        <PanelHeader
          id="fila"
          title="Na fila"
          count={queue.data ? plural(items.length, "paciente") : undefined}
        />

        {queue.isPending ? (
          <RowsSkeleton rows={4} />
        ) : queue.isError && !queue.data ? (
          <ErrorState
            error={queue.error}
            onRetry={() => void queue.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Armchair}
            title="Ninguém aguardando"
            description="Quando a recepção registrar o check-in de um paciente, ele entra aqui com o tempo de espera contando."
            action={
              <ButtonLink to="/" variant="secondary">
                Ir para o painel do dia
              </ButtonLink>
            }
          />
        ) : (
          <>
            <ol className="divide-y divide-border-subtle">
              {items.map((item, index) => (
                <QueueRow
                  key={item.appointmentId}
                  item={item}
                  position={index + 1}
                  busy={
                    transition.isPending &&
                    transition.variables?.id === item.appointmentId
                  }
                  onStart={() =>
                    transition.mutate({
                      id: item.appointmentId,
                      target: "EM_ATENDIMENTO",
                      patientName: item.patientName,
                    })
                  }
                />
              ))}
            </ol>
            <p className="border-t border-border-subtle px-4 py-3 text-label text-ink-secondary md:px-5">
              Fim da fila —{" "}
              {plural(
                items.length,
                "paciente aguardando",
                "pacientes aguardando",
              )}
              .
            </p>
          </>
        )}
      </Panel>
    </>
  );
}

function QueueRow({
  item,
  position,
  busy,
  onStart,
}: {
  item: WaitingRoomItem;
  position: number;
  busy: boolean;
  onStart: () => void;
}) {
  const location = useLocation();
  const long = item.waitingMinutes >= LONG_WAIT_MINUTES;
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 px-4 py-3.5 md:grid-cols-[2rem_minmax(0,1fr)_auto_auto] md:gap-x-5 md:items-center md:px-5">
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full font-mono text-label font-semibold",
          "bg-surface-sunken text-ink-secondary",
        )}
      >
        <span className="sr-only">Posição </span>
        {position}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            to={`/pacientes/${item.patientId}`}
            className="truncate text-card font-semibold text-ink-primary hover:text-accent-ink hover:underline"
          >
            {item.patientName}
          </Link>
          {item.wasCalled ? (
            <Badge tone="info" size="sm">
              <Megaphone aria-hidden="true" />
              Chamado
            </Badge>
          ) : null}
          {item.isLate ? (
            <Badge tone="danger" size="sm">
              <TriangleAlert aria-hidden="true" />
              {item.state}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-label text-ink-secondary">
          {APPOINTMENT_TYPE_LABEL[item.type]} com {item.professionalName}
        </p>
        <Link
          to={`/consultas/${item.appointmentId}`}
          state={{
            from: `${location.pathname}${location.search}`,
            backgroundLocation: location,
          }}
          className="inline-block rounded-marker text-label font-semibold text-accent-ink hover:underline"
        >
          Ver consulta
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-secondary">
          <span>
            Chegou{" "}
            <span className="font-mono text-ink-primary">
              {item.checkedInAtLabel}
            </span>
          </span>
          <span>
            Marcada{" "}
            <span className="font-mono text-ink-primary">
              {item.scheduledAtLabel}
            </span>
          </span>
          {item.patientPhone ? (
            <a
              href={`tel:${phoneDigits(item.patientPhone)}`}
              className="inline-flex items-center gap-1 rounded-marker font-mono text-ink-secondary hover:text-accent-ink hover:underline pointer-coarse:min-h-11"
            >
              <Phone className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Ligar para </span>
              {item.patientPhone}
            </a>
          ) : null}
        </p>
      </div>

      <p
        className={cn(
          "col-start-2 flex items-center gap-1.5 md:col-start-auto",
          item.isLate || long ? "text-danger" : "text-warning",
        )}
      >
        <Clock className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-mono text-card font-semibold">
          {item.waitingLabel}
        </span>
        <span className="whitespace-nowrap text-label">de espera</span>
      </p>

      <div className="col-span-2 flex gap-2 md:col-span-1 md:justify-end">
        <Button
          size="sm"
          loading={busy}
          onClick={onStart}
          className="max-md:h-11 max-md:flex-1 max-md:text-body"
        >
          Iniciar atendimento
        </Button>
      </div>
    </li>
  );
}
