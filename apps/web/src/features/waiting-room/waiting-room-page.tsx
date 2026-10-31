import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Armchair,
  Clock,
  Hourglass,
  Megaphone,
  Phone,
  Stethoscope,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import {
  CardsSkeleton,
  EmptyState,
  ErrorState,
  InlineError,
} from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel, StatTile } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { errorMessage, subscribe } from "@/lib/api/client";
import { waitingRoomApi } from "@/lib/api/endpoints";
import type { WaitingRoomItem } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, phoneDigits, plural } from "@/lib/utils";
import { currentPath } from "../appointments/back-target";
import { APPOINTMENT_TYPE_LABEL } from "../appointments/labels";
import { useAppointmentTransition } from "../appointments/use-appointment-actions";

/** Espera a partir da qual o número pede atenção mesmo sem atraso formal. */
const LONG_WAIT_MINUTES = 30;

/** Minutos em mono com a unidade recuada: o número é o que se lê de longe. */
function Minutes({ value }: { value: number }) {
  return (
    <>
      {value}
      <span className="ml-1 font-sans text-label font-medium text-ink-tertiary">
        min
      </span>
    </>
  );
}

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
  const longest = m ? m.longestWaitMinutes >= LONG_WAIT_MINUTES : false;

  return (
    <>
      <PageHeader
        title="Sala de espera"
        description="Fila por ordem de chegada. Atualiza sozinha a cada check-in."
        actions={
          <Button
            size="lg"
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
        className="mb-6 flex flex-col gap-3"
      >
        {metrics.isError && !m ? (
          <InlineError
            error={metrics.error}
            onRetry={() => void metrics.refetch()}
            label="Os números da fila não carregaram."
          />
        ) : null}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <StatTile
            label="Aguardando"
            icon={<Armchair />}
            value={m ? m.waitingCount : "—"}
            tone={m && m.waitingCount > 0 ? "warning" : "default"}
            dot={m && m.waitingCount > 0 ? "pulse" : "static"}
            hint="por ordem de chegada"
          />
          <StatTile
            label="Espera média"
            icon={<Hourglass />}
            value={m ? <Minutes value={m.averageWaitMinutes} /> : "—"}
            hint="de quem está na fila"
          />
          <StatTile
            label="Maior espera"
            icon={<Clock />}
            value={m ? <Minutes value={m.longestWaitMinutes} /> : "—"}
            tone={longest ? "danger" : "default"}
            dot={longest ? "pulse" : undefined}
            hint={
              longest
                ? `${LONG_WAIT_MINUTES} min ou mais: chame logo`
                : `atenção a partir de ${LONG_WAIT_MINUTES} min`
            }
          />
          <StatTile
            label="Em atendimento"
            icon={<Stethoscope />}
            value={m ? m.inProgressCount : "—"}
            dot={m && m.inProgressCount > 0 ? "pulse" : "static"}
            dotTone={m && m.inProgressCount > 0 ? "atendimento" : undefined}
            hint="nos consultórios agora"
          />
        </div>
      </section>

      <section aria-labelledby="fila" className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2 id="fila" className="text-section font-semibold text-ink-primary">
            Na fila
          </h2>
          {queue.data ? (
            <span className="tabular text-label text-ink-tertiary">
              {plural(items.length, "paciente")}
            </span>
          ) : null}
        </div>

        {queue.isPending ? (
          <CardsSkeleton cards={3} />
        ) : queue.isError && !queue.data ? (
          <Panel>
            <ErrorState
              error={queue.error}
              onRetry={() => void queue.refetch()}
            />
          </Panel>
        ) : items.length === 0 ? (
          <Panel>
            <EmptyState
              icon={Armchair}
              title="Ninguém aguardando"
              description="Quando a recepção registrar o check-in de um paciente, ele entra aqui com o tempo de espera contando."
              action={
                <ButtonLink to="/" variant="secondary">
                  Ir para o Cockpit do dia
                </ButtonLink>
              }
            />
          </Panel>
        ) : (
          <>
            <ol className="flex flex-col gap-3">
              {items.map((item, index) => (
                <QueueCard
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
            <p className="px-1 text-label text-ink-secondary">
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
      </section>
    </>
  );
}

/**
 * Cartão da fila. Lido de longe: posição, nome e o tempo de espera grande em
 * mono; o próximo passo é o único botão primário.
 */
function QueueCard({
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
  const urgent = item.isLate || long;

  return (
    <li
      className={cn(
        "grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-4 rounded-card border border-border-subtle bg-surface-base p-4 shadow-panel",
        "md:grid-cols-[2.75rem_minmax(0,1fr)_auto_auto] md:items-center md:gap-x-6 md:p-5",
      )}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-full font-mono text-card font-semibold tabular-nums md:size-11",
          position === 1
            ? "bg-accent-weak text-accent-ink"
            : "bg-surface-sunken text-ink-secondary",
        )}
      >
        <span className="sr-only">Posição </span>
        {position}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <Link
            to={`/pacientes/${item.patientId}`}
            className="truncate text-card font-semibold text-ink-primary hover:text-accent-ink hover:underline"
          >
            {item.patientName}
          </Link>
          <StatusBadge
            state={item.isLate ? "ATRASADA" : "CHECK_IN"}
            label={item.state}
          />
          {item.wasCalled ? (
            <Badge tone="info" size="sm" className="rounded-full">
              <Megaphone aria-hidden="true" />
              Chamado
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-label text-ink-secondary">
          {APPOINTMENT_TYPE_LABEL[item.type]} com {item.professionalName}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-secondary">
          <span>
            Chegou{" "}
            <span className="font-mono text-ink-primary tabular-nums">
              {item.checkedInAtLabel}
            </span>
          </span>
          <span>
            Marcada{" "}
            <span className="font-mono text-ink-primary tabular-nums">
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
          <Link
            to={`/consultas/${item.appointmentId}`}
            state={{
              from: currentPath(location),
              backgroundLocation: location,
            }}
            className="rounded-marker font-semibold text-accent-ink hover:underline pointer-coarse:min-h-11 pointer-coarse:inline-flex pointer-coarse:items-center"
          >
            Ver consulta
          </Link>
        </p>
      </div>

      <p className="col-start-2 flex items-baseline gap-2 md:col-start-auto md:flex-col md:items-end md:gap-0">
        <span
          className={cn(
            "font-mono text-metric-sm font-semibold tracking-tight tabular-nums md:text-metric",
            urgent ? "text-danger" : "text-ink-primary",
          )}
        >
          {item.waitingLabel}
        </span>
        <span className="text-label text-ink-tertiary">de espera</span>
      </p>

      <div className="col-span-2 md:col-span-1">
        <Button
          loading={busy}
          onClick={onStart}
          className="w-full max-md:h-11 max-md:text-body md:w-auto"
        >
          Iniciar atendimento
        </Button>
      </div>
    </li>
  );
}
