import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type * as React from "react";
import { useId } from "react";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { InlineError, Loading } from "@/components/ui/states";
import { appointmentsApi, professionalsApi } from "@/lib/api/endpoints";
import type { CheckAvailabilityInput, TimeSlot } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, plural } from "@/lib/utils";
import { formatDayLong, todayISO } from "./labels";

const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isDate = (value: string) => DATE_RE.test(value);
export const isTime = (value: string) => TIME_RE.test(value);
export const isDuration = (value: number) =>
  Number.isInteger(value) && value >= 5 && value <= 480;

/** Data já passou? Comparação de string vale porque o formato é `YYYY-MM-DD`. */
export const isPastDate = (value: string) =>
  isDate(value) && value < todayISO();

/** Mensagem da data, ou `undefined` quando está ok. */
export function dateError(value: string): string | undefined {
  if (!value) return "Escolha a data.";
  if (!isDate(value)) return "Data inválida. Use o calendário do campo.";
  if (isPastDate(value))
    return "Essa data já passou. Escolha hoje ou uma data futura.";
  return undefined;
}

export function durationError(value: number): string | undefined {
  return isDuration(value)
    ? undefined
    : "A duração vai de 5 a 480 minutos, em minutos inteiros.";
}

/**
 * Grade de horários do profissional no dia + campo de horário livre.
 *
 * A grade é um grupo de radios nativos: setas andam entre os horários livres e
 * pulam os ocupados sem nada reimplementado. O campo manual existe porque o
 * encaixe e o profissional sem grade configurada são rotina no balcão — a grade
 * vazia não pode travar o agendamento.
 */
export function TimePicker({
  professionalId,
  professionalName,
  date,
  durationMinutes,
  value,
  onChange,
  error,
  currentTime,
  excludeAppointmentId,
}: {
  professionalId: string;
  professionalName?: string;
  date: string;
  durationMinutes: number;
  value: string;
  onChange: (time: string) => void;
  error?: string;
  /** Reagendamento: o horário que a consulta ocupa hoje, marcado na grade. */
  currentTime?: string;
  /** Reagendamento: a própria consulta não ocupa a grade. */
  excludeAppointmentId?: string;
}) {
  const name = useId();
  const legendId = useId();
  const ready =
    Boolean(professionalId) &&
    isDate(date) &&
    !isPastDate(date) &&
    isDuration(durationMinutes);

  const slots = useQuery({
    queryKey: qk.appointments.slots(
      professionalId,
      date,
      durationMinutes,
      excludeAppointmentId,
    ),
    queryFn: () =>
      appointmentsApi.slots(
        professionalId,
        date,
        durationMinutes,
        excludeAppointmentId,
      ),
    enabled: ready,
    placeholderData: keepPreviousData,
  });

  const schedule = useQuery({
    queryKey: qk.professionals.schedule(professionalId),
    queryFn: () => professionalsApi.schedule(professionalId),
    enabled: Boolean(professionalId),
    staleTime: 5 * 60_000,
  });

  const now = Date.now();
  const isToday = date === todayISO();
  const list = slots.data ?? [];
  const usable = (slot: TimeSlot) =>
    slot.available && !(isToday && new Date(slot.startsAt).getTime() < now);
  const freeCount = list.filter(usable).length;

  let grid: React.ReactNode;
  if (!professionalId) {
    grid = (
      <p className="rounded-raised bg-surface-sunken px-3.5 py-3 text-body text-ink-secondary">
        Escolha o profissional para ver os horários livres.
      </p>
    );
  } else if (!ready) {
    grid = (
      <p className="rounded-raised bg-surface-sunken px-3.5 py-3 text-body text-ink-secondary">
        Corrija a data e a duração para ver os horários livres.
      </p>
    );
  } else if (slots.isPending) {
    grid = (
      <Loading label="Carregando horários…">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-2">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="skeleton h-10 rounded-control" />
          ))}
        </div>
      </Loading>
    );
  } else if (slots.isError) {
    grid = (
      <InlineError
        error={slots.error}
        onRetry={() => void slots.refetch()}
        label="Os horários não carregaram. Você ainda pode digitar o horário abaixo."
      />
    );
  } else if (list.length === 0) {
    grid = (
      <Callout tone="info" title="Sem grade de atendimento neste dia">
        {professionalName ?? "O profissional"} não tem horário configurado para{" "}
        {lowerFirst(formatDayLong(date))}
        {schedule.data?.summary ? ` (atende ${schedule.data.summary})` : ""}.
        Digite o horário abaixo para agendar mesmo assim.
      </Callout>
    );
  } else {
    grid = (
      <fieldset
        aria-labelledby={legendId}
        // Enquanto chega a grade do dia novo, a antiga fica visível mas inerte:
        // clicar num horário de outra data seria agendar errado.
        disabled={slots.isPlaceholderData}
        aria-busy={slots.isPlaceholderData || undefined}
        className={cn(
          "grid grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] gap-2 transition-opacity",
          slots.isPlaceholderData && "opacity-60",
        )}
      >
        {list.map((slot) => {
          const free = usable(slot);
          const checked = value === slot.time;
          const isCurrent = currentTime === slot.time;
          const status = isCurrent
            ? "horário atual"
            : checked && !free
              ? "ocupado, escolhido como encaixe"
              : !slot.available
                ? "ocupado"
                : free
                  ? "livre"
                  : "já passou";
          return (
            <label
              key={slot.startsAt}
              title={`${slot.time} — ${status}`}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-control border font-mono text-body font-semibold transition-colors duration-150 pointer-coarse:h-11",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-ink has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface-base",
                checked && free
                  ? "border-accent bg-accent text-ink-onaccent"
                  : checked
                    ? // Digitado à mão sobre um horário ocupado: é encaixe, não escolha limpa.
                      "border-warning bg-warning-weak text-warning"
                    : free
                      ? "cursor-pointer border-border-default bg-surface-base text-ink-primary hover:border-accent hover:bg-accent-weak"
                      : "cursor-not-allowed border-transparent bg-surface-sunken text-ink-tertiary line-through decoration-1",
                isCurrent &&
                  !checked &&
                  "border-dashed border-border-strong no-underline",
              )}
            >
              <input
                type="radio"
                name={name}
                value={slot.time}
                checked={checked}
                disabled={!free}
                onChange={() => onChange(slot.time)}
                className="sr-only"
              />
              {slot.time}
              <span className="sr-only">, {status}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p
          id={legendId}
          className="text-label font-semibold text-ink-secondary"
        >
          Horários do dia
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        </p>
        {ready && slots.data && list.length > 0 ? (
          <p className="flex items-center gap-1.5 text-label text-ink-tertiary">
            {slots.isFetching ? <Spinner className="size-3.5" /> : null}
            {freeCount === 0
              ? "Nenhum horário livre"
              : plural(freeCount, "horário livre", "horários livres")}
            {" de "}
            {list.length}
          </p>
        ) : null}
      </div>
      {grid}
      <Field
        label="Ou digite o horário"
        type="time"
        step={300}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        hint="Para encaixe ou horário fora da grade."
        containerClassName="sm:max-w-56"
      />
    </div>
  );
}

/**
 * Checagem de encaixe enquanto a pessoa ainda está no formulário. É um POST
 * usado como leitura (não grava nada), por isso mora numa query com chave
 * própria — repetir o mesmo horário não refaz a chamada.
 */
export function useAvailabilityCheck(input: CheckAvailabilityInput | null) {
  const fallback: CheckAvailabilityInput = {
    professionalId: "",
    date: "",
    time: "",
  };
  return useQuery({
    queryKey: qk.appointments.availability(input ?? fallback),
    queryFn: () => appointmentsApi.checkAvailability(input ?? fallback),
    enabled: input !== null,
    staleTime: 10_000,
  });
}

/**
 * O resultado da checagem em uma frase. Conflito pede decisão (encaixar ou
 * trocar); fora da grade só avisa; livre confirma baixinho para não gritar.
 */
export function AvailabilityNotice({
  check,
  overbookAction,
  outsideScheduleBlocks = false,
}: {
  check: ReturnType<typeof useAvailabilityCheck>;
  /** Botão "Encaixar mesmo assim" — só vem quando o resto do formulário está ok. */
  overbookAction?: React.ReactNode;
  /** Na criação o backend recusa fora da grade, mesmo com encaixe. */
  outsideScheduleBlocks?: boolean;
}) {
  if (check.fetchStatus === "idle" && check.isPending) return null;

  if (check.isPending) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-label text-ink-secondary"
      >
        <Spinner className="size-4" />
        Conferindo o horário na agenda…
      </p>
    );
  }

  if (check.isError) {
    return (
      <InlineError
        error={check.error}
        onRetry={() => void check.refetch()}
        label="Não deu para conferir o horário agora. O servidor confere de novo ao salvar."
      />
    );
  }

  const result = check.data;
  if (result.available) {
    return (
      <Callout tone="success" live>
        Horário livre na agenda.
      </Callout>
    );
  }

  const hasConflict = result.conflicts.length > 0;
  return (
    <Callout
      tone="warning"
      live
      title={
        hasConflict
          ? "Já existe consulta nesse horário"
          : "Fora da grade de atendimento"
      }
      action={
        hasConflict && !(outsideScheduleBlocks && !result.withinSchedule)
          ? overbookAction
          : undefined
      }
    >
      <p>
        {result.message ??
          (hasConflict
            ? "O profissional já está ocupado nesse intervalo."
            : "O horário não cabe na grade do profissional nesse dia.")}
      </p>
      {hasConflict ? (
        <ul className="mt-1.5 flex flex-col gap-0.5 text-label text-ink-secondary">
          {result.conflicts.map((item) => (
            <li key={item.id}>
              <span className="font-mono">{item.time}</span> {item.patientName}{" "}
              ({item.durationMinutes} min)
            </li>
          ))}
        </ul>
      ) : null}
      {!result.withinSchedule && outsideScheduleBlocks ? (
        <p className="mt-1.5 text-label text-ink-secondary">
          Escolha um horário dentro da grade — fora dela a consulta não é
          aceita.
        </p>
      ) : null}
    </Callout>
  );
}
