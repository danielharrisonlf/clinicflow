import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, TextareaField } from "@/components/ui/field";
import { Overlay } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { ApiError, errorMessage } from "@/lib/api/client";
import { appointmentsApi } from "@/lib/api/endpoints";
import type {
  AppointmentDetail,
  CheckAvailabilityInput,
} from "@/lib/api/types";
import { formatDayLong, toDateKey, todayISO } from "./labels";
import {
  AvailabilityNotice,
  dateError,
  durationError,
  isDate,
  isDuration,
  isPastDate,
  isTime,
  TimePicker,
  useAvailabilityCheck,
} from "./slot-picker";
import { useInvalidateAppointmentViews } from "./use-appointment-actions";

type Errors = Partial<
  Record<"date" | "time" | "durationMinutes" | "reason", string>
>;

/**
 * Reagendar cria uma consulta nova (a antiga fica como REAGENDADA, ligada pela
 * `rescheduledFromId`). Por isso o sucesso leva para a consulta nova: ficar na
 * antiga deixa a recepção olhando um registro que já não vale.
 */
export function ReschedulePanel({
  appointment,
  open,
  onClose,
  from,
}: {
  appointment: AppointmentDetail;
  open: boolean;
  onClose: () => void;
  /** Origem da tela atual, repassada para o "voltar" da consulta nova. */
  from?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const invalidate = useInvalidateAppointmentViews();

  const originalDate = toDateKey(appointment.startsAt);
  const [date, setDate] = useState(
    originalDate < todayISO() ? todayISO() : originalDate,
  );
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(String(appointment.durationMinutes));
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [conflict, setConflict] = useState<string | null>(null);

  const durationMinutes = Number(duration);
  const trimmed = reason.trim();

  function validate(): Errors {
    const next: Errors = {};
    const dateProblem = dateError(date);
    if (dateProblem) next.date = dateProblem;
    if (!time)
      next.time = "Escolha um horário livre na grade ou digite o horário.";
    else if (!isTime(time))
      next.time = "Horário inválido. Use o formato 09:30.";
    else if (date === originalDate && time === appointment.time)
      next.time = "Esse já é o horário da consulta. Escolha outro.";
    const durationProblem = durationError(durationMinutes);
    if (durationProblem) next.durationMinutes = durationProblem;
    if (trimmed.length < 3)
      next.reason =
        "Conte o motivo em pelo menos 3 letras — ele fica no histórico.";
    else if (trimmed.length > 500)
      next.reason = "O motivo aceita até 500 letras.";
    return next;
  }
  const current = validate();
  const valid = Object.keys(current).length === 0;
  const shown = (field: keyof Errors) =>
    errors[field] ? current[field] : undefined;

  const input: CheckAvailabilityInput | null =
    isDate(date) &&
    !isPastDate(date) &&
    isTime(time) &&
    isDuration(durationMinutes)
      ? {
          professionalId: appointment.professionalId,
          date,
          time,
          durationMinutes,
          excludeAppointmentId: appointment.id,
        }
      : null;
  const availability = useAvailabilityCheck(input);

  const mutation = useMutation({
    mutationFn: (allowOverbooking: boolean) =>
      appointmentsApi.reschedule(appointment.id, {
        date,
        time,
        durationMinutes,
        reason: trimmed,
        allowOverbooking: allowOverbooking || undefined,
      }),
    onSuccess: (created) => {
      invalidate();
      onClose();
      // Sem "desfazer": desfazer o reagendamento devolve a antiga mas não apaga
      // a nova, e a agenda ficaria com duas consultas ativas.
      toast.push({
        tone: "success",
        title: "Consulta reagendada",
        description: `${created.patientName} — ${formatDayLong(date)} às ${created.time}`,
      });
      navigate(`/consultas/${created.id}`, {
        state: {
          from,
          backgroundLocation: (
            location.state as { backgroundLocation?: unknown } | null
          )?.backgroundLocation,
        },
        replace: Boolean(
          (location.state as { backgroundLocation?: unknown } | null)
            ?.backgroundLocation,
        ),
      });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.isOverbooking) {
        setConflict(error.message);
        return;
      }
      if (error instanceof ApiError) {
        const fields = error.fieldErrors();
        if (Object.keys(fields).length) setErrors(fields as Errors);
      }
    },
  });

  function submit(allowOverbooking: boolean) {
    setErrors(current);
    setConflict(null);
    if (!valid) return;
    mutation.mutate(allowOverbooking);
  }

  const overbook = valid ? (
    <Button
      variant="secondary"
      size="sm"
      loading={mutation.isPending && mutation.variables === true}
      disabled={mutation.isPending}
      onClick={() => submit(true)}
    >
      Encaixar mesmo assim
    </Button>
  ) : (
    <p className="text-label text-ink-secondary">
      Preencha o motivo para poder encaixar.
    </p>
  );

  const genericError =
    mutation.isError &&
    !(mutation.error instanceof ApiError && mutation.error.isOverbooking)
      ? errorMessage(
          mutation.error,
          "Sem conexão com o servidor. Nada foi alterado.",
        )
      : null;

  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="sheet"
      title="Reagendar consulta"
      description={
        <>
          {appointment.patientName} com {appointment.professionalName}. Hoje
          está em {formatDayLong(originalDate).toLowerCase()} às{" "}
          <span className="font-mono">{appointment.time}</span>.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button
            type="submit"
            form="reagendar-consulta"
            loading={mutation.isPending && mutation.variables === false}
            disabled={mutation.isPending}
          >
            Confirmar novo horário
          </Button>
        </>
      }
    >
      <form
        id="reagendar-consulta"
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8.5rem]">
          <Field
            label="Nova data"
            type="date"
            required
            min={todayISO()}
            value={date}
            error={
              shown("date") ?? (isPastDate(date) ? dateError(date) : undefined)
            }
            hint={isDate(date) ? formatDayLong(date) : undefined}
            onChange={(event) => {
              setDate(event.target.value);
              setTime("");
              setConflict(null);
            }}
          />
          <Field
            label="Duração"
            type="number"
            inputMode="numeric"
            required
            min={5}
            max={480}
            step={5}
            suffix="min"
            value={duration}
            error={shown("durationMinutes")}
            onChange={(event) => {
              setDuration(event.target.value);
              setConflict(null);
            }}
          />
        </div>

        <TimePicker
          excludeAppointmentId={appointment.id}
          professionalId={appointment.professionalId}
          professionalName={appointment.professionalName}
          date={date}
          durationMinutes={durationMinutes}
          value={time}
          onChange={(next) => {
            setTime(next);
            setConflict(null);
          }}
          error={shown("time")}
          currentTime={date === originalDate ? appointment.time : undefined}
        />

        <TextareaField
          label="Motivo do reagendamento"
          required
          maxLength={500}
          value={reason}
          error={shown("reason")}
          hint={`${trimmed.length}/500 — fica registrado no histórico da consulta.`}
          onChange={(event) => setReason(event.target.value)}
        />

        {conflict ? (
          <Callout
            live
            tone="warning"
            title="O horário foi ocupado agora há pouco"
            action={overbook}
          >
            {conflict}
          </Callout>
        ) : (
          <AvailabilityNotice check={availability} overbookAction={overbook} />
        )}

        {genericError ? (
          <Callout live tone="danger" title="O reagendamento não foi feito">
            {genericError}
          </Callout>
        ) : null}
      </form>
    </Overlay>
  );
}
