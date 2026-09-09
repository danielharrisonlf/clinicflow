import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { SidePanel } from "@/components/ui/side-panel";
import { ErrorState, RowsSkeleton } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { appointmentsApi } from "@/lib/api/endpoints";
import { CANCEL_REASON, type CancelReason } from "@/lib/api/types";
import { qk } from "@/lib/query";
import {
  APPOINTMENT_TYPE_LABEL,
  CANCEL_REASON_LABEL,
  CHANNEL_LABEL,
  formatDateTime,
} from "./labels";
import {
  actionsFor,
  useAppointmentTransition,
} from "./use-appointment-actions";

export function AppointmentDetailPage() {
  const { id = "" } = useParams();
  const [panel, setPanel] = useState<"none" | "reschedule" | "cancel">("none");
  const transition = useAppointmentTransition();

  const appointment = useQuery({
    queryKey: qk.appointments.detail(id),
    queryFn: () => appointmentsApi.detail(id),
    enabled: Boolean(id),
  });

  const audit = useQuery({
    queryKey: qk.appointments.audit(id),
    queryFn: () => appointmentsApi.audit(id),
    enabled: Boolean(id),
  });

  if (appointment.isError) {
    return (
      <ErrorState
        error={appointment.error}
        onRetry={() => void appointment.refetch()}
      />
    );
  }

  const data = appointment.data;
  const actions = data ? actionsFor(data.allowedTransitions) : [];
  const canCancel = data?.allowedTransitions.includes("CANCELADA") ?? false;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 text-micro font-semibold text-ink-secondary hover:text-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Painel do dia
      </Link>

      {appointment.isPending || !data ? (
        <div className="skeleton h-24 rounded-card" />
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-micro text-ink-tertiary">
                Consulta #{data.code}
              </p>
              <h1 className="mt-0.5 text-title-sm font-bold text-ink-primary md:text-title">
                {data.patientName}
              </h1>
              <p className="mt-1 text-body text-ink-secondary">
                {APPOINTMENT_TYPE_LABEL[data.type]} com {data.professionalName}
              </p>
            </div>
            <StatusBadge state={data.derivedState} label={data.stateLabel} />
          </header>

          <Panel className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
            <Info
              label="Data e hora"
              value={formatDateTime(data.startsAt)}
              mono
            />
            <Info label="Duração" value={`${data.durationMinutes} min`} mono />
            <Info label="Sala" value={data.room ?? "Não definida"} />
            <Info label="Telefone" value={data.patientPhone} mono />
          </Panel>

          {data.notes ? (
            <Panel className="p-4">
              <p className="text-micro font-semibold text-ink-secondary">
                Observações
              </p>
              <p className="mt-1 text-body text-ink-primary">{data.notes}</p>
            </Panel>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.target}
                variant={action.primary ? "primary" : "secondary"}
                loading={
                  transition.isPending &&
                  transition.variables?.target === action.target
                }
                disabled={transition.isPending}
                onClick={() =>
                  transition.mutate({
                    id: data.id,
                    target: action.target,
                    patientName: data.patientName,
                  })
                }
              >
                {action.label}
              </Button>
            ))}
            {canCancel ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setPanel("reschedule")}
                >
                  Reagendar
                </Button>
                <Button variant="ghost" onClick={() => setPanel("cancel")}>
                  Cancelar consulta
                </Button>
              </>
            ) : null}
          </div>

          <Panel>
            <PanelHeader title="Histórico e auditoria" />
            {audit.isPending ? (
              <RowsSkeleton rows={4} height={52} />
            ) : audit.isError ? (
              <ErrorState error={audit.error} />
            ) : (
              <ol className="divide-y divide-border-subtle">
                {audit.data.data.map((event) => (
                  <li key={event.id} className="flex gap-3 px-4 py-3">
                    <span
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-border-default"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-body font-semibold text-ink-primary">
                        {event.title}
                      </p>
                      <p className="text-micro text-ink-secondary">
                        <span className="font-mono">
                          {formatDateTime(event.createdAt)}
                        </span>{" "}
                        {event.actorName
                          ? `por ${event.actorName}`
                          : CHANNEL_LABEL[event.channel]}
                        {event.reason ? ` — ${event.reason}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {panel === "reschedule" ? (
            <ReschedulePanel
              appointmentId={data.id}
              patientName={data.patientName}
              onClose={() => setPanel("none")}
            />
          ) : null}
          {panel === "cancel" ? (
            <CancelPanel
              appointmentId={data.id}
              patientName={data.patientName}
              onClose={() => setPanel("none")}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-micro font-semibold text-ink-secondary">{label}</p>
      <p
        className={`mt-0.5 text-body text-ink-primary ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ReschedulePanel({
  appointmentId,
  patientName,
  onClose,
}: {
  appointmentId: string;
  patientName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (allowOverbooking: boolean) =>
      appointmentsApi.reschedule(appointmentId, {
        date,
        time,
        reason,
        allowOverbooking,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.appointments.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.push({
        tone: "success",
        title: "Consulta reagendada",
        description: patientName,
      });
      onClose();
    },
    onError: (cause) => {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível reagendar. Tente de novo.",
      );
    },
  });

  const conflict =
    mutation.error instanceof ApiError && mutation.error.isOverbooking;

  return (
    <SidePanel
      title="Reagendar consulta"
      description={`${patientName} — a grade de fundo continua visível para você conferir o encaixe.`}
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          mutation.mutate(false);
        }}
      >
        <Field
          label="Nova data"
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Field
          label="Novo horário"
          type="time"
          required
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
        <TextareaField
          label="Motivo do reagendamento"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />

        {error ? (
          <div className="rounded-control border border-warning/30 bg-warning-weak p-3">
            <p className="text-body font-semibold text-warning">{error}</p>
            {conflict ? (
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                loading={mutation.isPending}
                onClick={() => mutation.mutate(true)}
              >
                Encaixar mesmo assim
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" block loading={mutation.isPending}>
            Confirmar novo horário
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Voltar
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}

function CancelPanel({
  appointmentId,
  patientName,
  onClose,
}: {
  appointmentId: string;
  patientName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [reasonCode, setReasonCode] =
    useState<CancelReason>("PACIENTE_DESMARCOU");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      appointmentsApi.cancel(appointmentId, {
        reasonCode,
        note: note || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.appointments.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.push({
        tone: "warning",
        title: "Consulta cancelada",
        description: patientName,
      });
      onClose();
    },
  });

  return (
    <SidePanel
      title="Cancelar consulta"
      description="O motivo fica registrado na auditoria e alimenta o funil de retorno."
      onClose={onClose}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <SelectField
          label="Motivo"
          value={reasonCode}
          onChange={(event) =>
            setReasonCode(event.target.value as CancelReason)
          }
        >
          {CANCEL_REASON.map((code) => (
            <option key={code} value={code}>
              {CANCEL_REASON_LABEL[code]}
            </option>
          ))}
        </SelectField>

        <TextareaField
          label="Observação (opcional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        {mutation.isError ? (
          <p className="text-body text-state-atrasada">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : "Não foi possível cancelar."}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="submit"
            variant="destructive"
            block
            loading={mutation.isPending}
          >
            Cancelar consulta
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Voltar
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}
