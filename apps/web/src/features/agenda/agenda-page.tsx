import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import {
  SegmentedControl,
  type SegmentOption,
} from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import {
  STATE_ICON,
  STATE_LABEL,
  StatusBadge,
} from "@/components/ui/status-badge";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { appointmentsApi, professionalsApi } from "@/lib/api/endpoints";
import type { CalendarSlot, DerivedState, Professional } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, plural } from "@/lib/utils";
import {
  addDays,
  formatDayLong,
  formatDayShort,
  formatMonthYear,
  todayISO,
  weekdayOf,
} from "../appointments/labels";
import { useMediaQuery } from "./use-media-query";

type View = "dia" | "3dias" | "semana";

const SPAN: Record<View, number> = { dia: 1, "3dias": 3, semana: 7 };

const VIEW_OPTIONS: SegmentOption<View>[] = [
  { value: "dia", label: "Dia" },
  { value: "3dias", label: "3 dias" },
  { value: "semana", label: "Semana" },
];

/** Cor do ícone de estado no cartão compacto da semana (o selo inteiro não cabe). */
const STATE_INK: Record<DerivedState, string> = {
  AGENDADA: "text-state-agendada",
  CONFIRMADA: "text-state-confirmada",
  CHECK_IN: "text-state-espera",
  EM_ATENDIMENTO: "text-state-atendimento",
  CONCLUIDA: "text-state-concluida",
  CANCELADA: "text-state-cancelada",
  REAGENDADA: "text-state-cancelada",
  ATRASADA: "text-state-atrasada",
};

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/** Mesma lista para o filtro e para o formulário de nova consulta: chave igual, cache igual. */
const PROFESSIONAL_OPTIONS = { limit: 100, order: "ASC" as const };

/**
 * Agenda da clínica. A grade não é a mesma espremida em todo tamanho: semana
 * só onde sete colunas cabem (≥1024px), três dias no tablet, um dia no celular.
 * A escolha da pessoa vai para a URL (`?visao=&data=&profissional=`): F5 e o
 * "voltar" do navegador devolvem a mesma semana.
 */
export function AgendaPage() {
  const [params, setParams] = useSearchParams();
  const isLg = useMediaQuery("(min-width: 1024px)");
  const isMd = useMediaQuery("(min-width: 768px)");

  const available: View[] = isLg
    ? ["dia", "3dias", "semana"]
    : isMd
      ? ["dia", "3dias"]
      : ["dia"];
  const requested = params.get("visao") as View | null;
  // Pediu semana num tablet: mostra o maior que cabe, sem reescrever a URL —
  // de volta ao monitor grande, a semana volta.
  const view: View =
    requested && available.includes(requested)
      ? requested
      : (available.at(-1) ?? "dia");
  const span = SPAN[view];

  const today = todayISO();
  const rawDate = params.get("data");
  const anchor = rawDate && DATE_PARAM.test(rawDate) ? rawDate : today;
  // Semana começa na segunda: é como a clínica pensa a escala.
  const from =
    view === "semana"
      ? addDays(anchor, -((weekdayOf(anchor) + 6) % 7))
      : anchor;
  const to = addDays(from, span - 1);
  const professionalId = params.get("profissional") ?? undefined;

  function update(next: {
    visao?: View;
    data?: string;
    profissional?: string | null;
  }) {
    const search = new URLSearchParams(params);
    if (next.visao) search.set("visao", next.visao);
    if (next.data !== undefined) {
      if (next.data === today) search.delete("data");
      else search.set("data", next.data);
    }
    if (next.profissional !== undefined) {
      if (next.profissional) search.set("profissional", next.profissional);
      else search.delete("profissional");
    }
    setParams(search, { replace: true });
  }

  const professionals = useQuery({
    queryKey: qk.professionals.list(PROFESSIONAL_OPTIONS),
    queryFn: () => professionalsApi.list(PROFESSIONAL_OPTIONS),
    staleTime: 5 * 60_000,
  });

  const calendar = useQuery({
    queryKey: qk.appointments.calendar(from, to, professionalId),
    queryFn: () => appointmentsApi.calendar(from, to, professionalId),
    // Trocar de semana não pisca skeleton: a anterior fica, esmaecida, até a nova chegar.
    placeholderData: keepPreviousData,
  });

  // O calendário omite dias sem consulta; a grade precisa de todos.
  const byDate = new Map(calendar.data?.map((day) => [day.date, day.slots]));
  const days = Array.from({ length: span }, (_, index) => {
    const date = addDays(from, index);
    return { date, slots: byDate.get(date) ?? [] };
  });
  const total = days.reduce((sum, day) => sum + day.slots.length, 0);
  const stale = calendar.isPlaceholderData;

  const activeProfessionals = (professionals.data?.data ?? []).filter(
    (professional) =>
      professional.isActive || professional.id === professionalId,
  );
  const selected = professionals.data?.data.find(
    (p) => p.id === professionalId,
  );

  const rangeLabel =
    span === 1
      ? `${formatDayLong(from)}${from === today ? " — hoje" : ""}`
      : `${formatDayShort(from)} a ${formatDayShort(to)}`;

  return (
    <>
      <PageHeader
        title="Agenda"
        description={rangeLabel}
        actions={
          <ButtonLink to={newAppointmentHref(undefined, professionalId)}>
            <CalendarPlus aria-hidden="true" />
            Nova consulta
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1.5">
            <IconButton
              label={span === 1 ? "Dia anterior" : "Período anterior"}
              variant="secondary"
              size="icon-sm"
              onClick={() => update({ data: addDays(from, -span) })}
            >
              <ChevronLeft aria-hidden="true" />
            </IconButton>
            <Button
              variant="secondary"
              size="sm"
              disabled={from <= today && today <= to}
              onClick={() => update({ data: today })}
            >
              Hoje
            </Button>
            <IconButton
              label={span === 1 ? "Próximo dia" : "Próximo período"}
              variant="secondary"
              size="icon-sm"
              onClick={() => update({ data: addDays(from, span) })}
            >
              <ChevronRight aria-hidden="true" />
            </IconButton>
          </div>
          <div className="min-w-0">
            <h2
              className="text-section font-semibold text-ink-primary"
              aria-live="polite"
            >
              {monthLabel(from, to)}
            </h2>
            <p className="flex items-center gap-1.5 text-label text-ink-secondary">
              {calendar.isFetching && stale ? (
                <Spinner className="size-3.5 text-accent" />
              ) : null}
              {calendar.data
                ? total === 0
                  ? "Nenhuma consulta no período"
                  : `${plural(total, "consulta")} no período`
                : "Carregando consultas…"}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          {available.length > 1 ? (
            <SegmentedControl
              label="Visualização da agenda"
              options={VIEW_OPTIONS.filter((option) =>
                available.includes(option.value),
              )}
              value={view}
              onChange={(value) => update({ visao: value })}
            />
          ) : null}
          <SelectField
            label="Filtrar por profissional"
            hideLabel
            containerClassName="min-w-0 flex-1 sm:w-60 sm:flex-none"
            value={professionalId ?? ""}
            onChange={(event) =>
              update({ profissional: event.target.value || null })
            }
            disabled={professionals.isPending && !professionals.data}
          >
            <option value="">Todos os profissionais</option>
            {activeProfessionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name}
                {professional.isActive ? "" : " (inativo)"}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      {calendar.isPending ? (
        <AgendaSkeleton span={span} />
      ) : calendar.isError && !calendar.data ? (
        <Panel>
          <ErrorState
            error={calendar.error}
            onRetry={() => void calendar.refetch()}
          />
        </Panel>
      ) : span === 1 ? (
        <DayList
          date={from}
          today={today}
          slots={days[0]?.slots ?? []}
          professional={selected}
          stale={stale}
        />
      ) : (
        <div
          aria-busy={stale || undefined}
          className={cn(
            "grid gap-2 transition-opacity duration-150 xl:gap-3",
            span === 7 ? "grid-cols-7" : "grid-cols-3",
            stale && "opacity-60",
          )}
        >
          {days.map((day) => (
            <DayColumn
              key={day.date}
              date={day.date}
              today={today}
              slots={day.slots}
              compact={span === 7}
              professionalId={professionalId}
            />
          ))}
        </div>
      )}
    </>
  );
}

function newAppointmentHref(date?: string, professionalId?: string): string {
  const search = new URLSearchParams();
  if (date) search.set("date", date);
  if (professionalId) search.set("professionalId", professionalId);
  const qs = search.toString();
  return `/consultas/nova${qs ? `?${qs}` : ""}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Outubro de 2026", ou "Setembro e outubro de 2026" quando a semana vira o mês. */
function monthLabel(from: string, to: string): string {
  const a = formatMonthYear(from);
  const b = formatMonthYear(to);
  if (a === b) return capitalize(a);
  if (from.slice(0, 4) === to.slice(0, 4)) {
    return capitalize(`${a.replace(/ de \d{4}$/, "")} e ${b}`);
  }
  return capitalize(`${a} e ${b}`);
}

/** Um dia, em lista: é a visão do celular e a de quem quer ler o dia inteiro. */
function DayList({
  date,
  today,
  slots,
  professional,
  stale,
}: {
  date: string;
  today: string;
  slots: CalendarSlot[];
  professional?: Professional;
  stale: boolean;
}) {
  const location = useLocation();
  const past = date < today;
  const href = newAppointmentHref(date, professional?.id);
  return (
    <Panel
      aria-labelledby={`dia-${date}`}
      aria-busy={stale || undefined}
      className={cn("transition-opacity duration-150", stale && "opacity-60")}
    >
      <PanelHeader
        id={`dia-${date}`}
        title={date === today ? "Consultas de hoje" : "Consultas do dia"}
        count={plural(slots.length, "consulta")}
        actions={
          past ? null : (
            <ButtonLink to={href} variant="secondary" size="sm">
              <Plus aria-hidden="true" />
              Agendar
            </ButtonLink>
          )
        }
      />
      {slots.length === 0 ? (
        <EmptyState
          compact
          icon={CalendarCheck}
          title={past ? "Nenhuma consulta neste dia" : "Dia livre"}
          description={
            professional
              ? `${professional.name} não tem consultas marcadas neste dia.`
              : "Nenhuma consulta marcada neste dia."
          }
          action={
            past ? undefined : (
              <ButtonLink to={href}>Agendar neste dia</ButtonLink>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {slots.map((slot) => {
            const finished = isFinished(slot.derivedState);
            return (
              <li key={slot.id}>
                <Link
                  to={`/consultas/${slot.id}`}
                  state={{
                    from: `${location.pathname}${location.search}`,
                    backgroundLocation: location,
                  }}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 px-4 py-3 transition-colors hover:bg-surface-app sm:grid-cols-[4rem_minmax(0,1fr)_auto] md:px-5"
                >
                  <span
                    className={cn(
                      "font-mono text-card font-semibold",
                      finished ? "text-ink-tertiary" : "text-ink-primary",
                    )}
                  >
                    {slot.time}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-body font-semibold text-ink-primary">
                      {slot.patientName}
                    </span>
                    <span className="block truncate text-label text-ink-secondary">
                      {slot.professionalName}
                      <span className="font-mono">
                        {" "}
                        {slot.durationMinutes} min
                      </span>
                    </span>
                  </span>
                  <span className="col-start-2 sm:col-start-auto">
                    <StatusBadge state={slot.derivedState} size="sm" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function isFinished(state: DerivedState): boolean {
  return (
    state === "CONCLUIDA" || state === "CANCELADA" || state === "REAGENDADA"
  );
}

/** Coluna de um dia na grade de 3 dias ou da semana. */
function DayColumn({
  date,
  today,
  slots,
  compact,
  professionalId,
}: {
  date: string;
  today: string;
  slots: CalendarSlot[];
  compact: boolean;
  professionalId?: string;
}) {
  const isToday = date === today;
  const past = date < today;
  const headingId = `dia-${date}`;
  const [weekday, dayMonth] = formatDayShort(date).split(", ");

  return (
    <Panel
      aria-labelledby={headingId}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden",
        isToday && "border-accent",
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-1 border-b border-border-subtle py-2",
          compact ? "px-2" : "px-3",
          isToday && "bg-accent-weak",
        )}
      >
        <h3 id={headingId} className="min-w-0">
          <span
            className={cn(
              "block text-label font-semibold",
              isToday ? "text-accent-ink" : "text-ink-secondary",
            )}
          >
            {isToday ? "Hoje" : weekday}
            <span className="sr-only">, {formatDayLong(date)}</span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "block truncate font-mono text-card font-semibold",
              isToday ? "text-accent-ink" : "text-ink-primary",
            )}
          >
            {compact ? dayMonth?.split(" ")[0] : dayMonth}
          </span>
        </h3>
        {past ? null : (
          <Link
            to={newAppointmentHref(date, professionalId)}
            aria-label={`Agendar em ${formatDayLong(date)}`}
            title="Agendar neste dia"
            className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-marker text-ink-secondary transition-colors hover:bg-surface-sunken hover:text-accent-ink pointer-coarse:size-11"
          >
            <Plus className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>

      {slots.length === 0 ? (
        <p className="px-2 py-6 text-center text-label text-ink-tertiary">
          Livre
        </p>
      ) : (
        <ul
          className={cn(
            "flex flex-col",
            compact ? "gap-1 p-1.5" : "gap-1.5 p-2",
          )}
        >
          {slots.map((slot) => (
            <li key={slot.id}>
              {compact ? <CompactSlot slot={slot} /> : <SlotCard slot={slot} />}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Cartão da semana: hora e paciente, mais nada. Numa coluna de ~100px o selo
 * "Em atendimento" não cabe — o estado vira ícone colorido, e o nome do estado
 * continua lá para leitor de tela e no `title`.
 */
function CompactSlot({ slot }: { slot: CalendarSlot }) {
  const location = useLocation();
  const Icon = STATE_ICON[slot.derivedState];
  const state = STATE_LABEL[slot.derivedState];
  const finished = isFinished(slot.derivedState);
  return (
    <Link
      to={`/consultas/${slot.id}`}
      state={{
        from: `${location.pathname}${location.search}`,
        backgroundLocation: location,
      }}
      title={`${slot.time} ${slot.patientName} — ${state}, ${slot.professionalName}`}
      className="block rounded-marker px-1.5 py-1 transition-colors hover:bg-surface-sunken"
    >
      <span className="flex items-center gap-1">
        <Icon
          className={cn("size-3.5 shrink-0", STATE_INK[slot.derivedState])}
          strokeWidth={2.25}
          aria-hidden="true"
        />
        <span
          className={cn(
            "font-mono text-micro font-semibold",
            finished ? "text-ink-tertiary" : "text-ink-primary",
          )}
        >
          {slot.time}
        </span>
      </span>
      <span
        className={cn(
          "block truncate text-micro",
          finished ? "text-ink-tertiary" : "text-ink-primary",
        )}
      >
        {slot.patientName}
      </span>
      <span className="sr-only">
        , {state}, com {slot.professionalName}
      </span>
    </Link>
  );
}

/** Cartão dos 3 dias: cabe o selo completo e o profissional. */
function SlotCard({ slot }: { slot: CalendarSlot }) {
  const location = useLocation();
  const finished = isFinished(slot.derivedState);
  return (
    <Link
      to={`/consultas/${slot.id}`}
      state={{
        from: `${location.pathname}${location.search}`,
        backgroundLocation: location,
      }}
      className="block rounded-raised border border-border-subtle bg-surface-base px-2.5 py-2 transition-colors hover:border-border-strong hover:bg-surface-app"
    >
      <span className="flex flex-wrap items-center justify-between gap-1.5">
        <span
          className={cn(
            "font-mono text-label font-semibold",
            finished ? "text-ink-tertiary" : "text-ink-primary",
          )}
        >
          {slot.time}
        </span>
        <StatusBadge state={slot.derivedState} size="sm" />
      </span>
      <span className="mt-1 block truncate text-label font-semibold text-ink-primary">
        {slot.patientName}
      </span>
      <span className="block truncate text-micro text-ink-secondary">
        {slot.professionalName}
      </span>
    </Link>
  );
}

function AgendaSkeleton({ span }: { span: number }) {
  if (span === 1) {
    return (
      <Panel>
        <Loading label="Carregando a agenda…">
          <div className="divide-y divide-border-subtle">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="flex h-16 items-center gap-4 px-4 md:px-5"
              >
                <div className="skeleton h-5 w-12" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="skeleton h-4 w-full max-w-56" />
                  <div className="skeleton h-3 w-full max-w-36" />
                </div>
              </div>
            ))}
          </div>
        </Loading>
      </Panel>
    );
  }
  return (
    <Loading label="Carregando a agenda…">
      <div
        className={cn(
          "grid gap-2 xl:gap-3",
          span === 7 ? "grid-cols-7" : "grid-cols-3",
        )}
      >
        {Array.from({ length: span }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-card border border-border-subtle bg-surface-base p-2"
          >
            <div className="skeleton h-9 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ))}
      </div>
    </Loading>
  );
}
