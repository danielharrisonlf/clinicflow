import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Panel } from "@/components/ui/surface";
import { appointmentsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { todayISO } from "../appointments/labels";

/**
 * A grade encolhe de sete para três dias no tablet e vira lista de um dia no
 * celular. Não é a mesma grade espremida: sete colunas em 390px dariam 55px por
 * dia, largura em que nenhum nome cabe.
 */
export function AgendaPage() {
  const [anchor, setAnchor] = useState(todayISO());
  const [span, setSpan] = useState(() => spanForViewport());

  const from = shiftDays(anchor, 0);
  const to = shiftDays(anchor, span - 1);

  const calendar = useQuery({
    queryKey: qk.appointments.calendar(from, to),
    queryFn: () => appointmentsApi.calendar(from, to),
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
            Agenda
          </h1>
          <p className="mt-0.5 text-body text-ink-secondary">
            {span === 1 ? "Um dia por vez" : `${span} dias a partir de hoje`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Período anterior"
            onClick={() => setAnchor(shiftDays(anchor, -span))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAnchor(todayISO())}
          >
            Hoje
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Próximo período"
            onClick={() => setAnchor(shiftDays(anchor, span))}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <div className="hidden gap-1 rounded-control bg-surface-sunken p-0.5 lg:flex">
            {[3, 7].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSpan(value)}
                aria-pressed={span === value}
                className={`h-8 rounded-marker px-2.5 text-micro font-semibold ${
                  span === value
                    ? "bg-surface-base text-ink-primary shadow-raised"
                    : "text-ink-secondary"
                }`}
              >
                {value} dias
              </button>
            ))}
          </div>
        </div>
      </header>

      {calendar.isPending ? (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton h-64 rounded-card" />
          ))}
        </div>
      ) : calendar.isError ? (
        <ErrorState
          error={calendar.error}
          onRetry={() => void calendar.refetch()}
        />
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(span, calendar.data.length)}, minmax(0, 1fr))`,
          }}
        >
          {calendar.data.map((day) => (
            <Panel key={day.date} className="flex min-w-0 flex-col p-3">
              <p className="mb-2 text-micro font-semibold text-ink-secondary">
                {day.weekdayLabel}{" "}
                <span className="font-mono text-ink-primary">
                  {day.date.slice(8, 10)}
                </span>
              </p>

              {day.slots.length === 0 ? (
                <p className="py-6 text-center text-micro text-ink-tertiary">
                  Sem consultas
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {day.slots.map((slot) => (
                    <li key={slot.id}>
                      <Link
                        to={`/consultas/${slot.id}`}
                        className="block rounded-raised border border-border-subtle p-2 transition-colors hover:border-accent"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-micro font-semibold text-ink-primary">
                            {slot.time}
                          </span>
                          <StatusBadge state={slot.derivedState} />
                        </div>
                        <p className="mt-1 truncate text-micro font-semibold text-ink-primary">
                          {slot.patientName}
                        </p>
                        <p className="truncate text-micro text-ink-secondary">
                          {slot.professionalName}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      )}

      {calendar.data?.every((day) => day.slots.length === 0) ? (
        <EmptyState
          title="Nenhuma consulta no período"
          description="Avance os dias ou volte para hoje para ver a agenda cheia."
        />
      ) : null}
    </div>
  );
}

function spanForViewport(): number {
  if (typeof window === "undefined") return 3;
  if (window.matchMedia("(min-width: 1024px)").matches) return 7;
  if (window.matchMedia("(min-width: 768px)").matches) return 3;
  return 1;
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
