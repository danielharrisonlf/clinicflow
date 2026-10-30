import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem } from "@/components/ui/menu";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AppointmentListItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { currentPath } from "./back-target";
import { APPOINTMENT_TYPE_LABEL, formatDate } from "./labels";
import {
  actionsFor,
  useAppointmentTransition,
} from "./use-appointment-actions";

/**
 * Lista de consultas do dia. Um componente, duas formas: no balcão é uma linha
 * em grade (a pessoa varre a coluna de horário); no celular a mesma linha vira
 * cartão com ação de largura cheia — tabela com ação por linha em 390px obriga
 * a rolagem horizontal, que ninguém faz.
 *
 * O que aparece de botão vem de `allowedTransitions`: o front não conhece a
 * máquina de estados.
 */
export function AppointmentList({
  items,
  emptyState,
  showDate = false,
}: {
  items: AppointmentListItem[];
  emptyState: React.ReactNode;
  /** Lista de vários dias (histórico do paciente): mostra a data junto da hora. */
  showDate?: boolean;
}) {
  const transition = useAppointmentTransition();

  if (items.length === 0) return <>{emptyState}</>;

  return (
    <div>
      {/* Cabeçalho de colunas só onde existe coluna. */}
      <div
        aria-hidden="true"
        className="hidden grid-cols-[4.5rem_minmax(0,1fr)_9.5rem_11rem] gap-4 border-b border-border-subtle bg-surface-app px-5 py-2 text-label font-semibold text-ink-secondary lg:grid"
      >
        <span>Hora</span>
        <span>Paciente</span>
        <span>Estado</span>
        <span className="text-right">Próximo passo</span>
      </div>
      <ul className="flex flex-col gap-3 p-3 md:gap-0 md:divide-y md:divide-border-subtle md:p-0">
        {items.map((item) => (
          <li key={item.id}>
            <AppointmentRow
              item={item}
              showDate={showDate}
              transition={transition}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AppointmentRow({
  item,
  showDate,
  transition,
}: {
  item: AppointmentListItem;
  showDate: boolean;
  transition: ReturnType<typeof useAppointmentTransition>;
}) {
  const location = useLocation();
  const actionState = {
    from: currentPath(location),
    backgroundLocation: location,
  };
  const [primary, ...secondary] = actionsFor(item.allowedTransitions);
  const busyHere = transition.isPending && transition.variables?.id === item.id;
  const finished =
    item.derivedState === "CONCLUIDA" ||
    item.derivedState === "CANCELADA" ||
    item.derivedState === "REAGENDADA";

  return (
    <article
      aria-label={`${item.time} — ${item.patientName}, ${item.stateLabel}`}
      className={cn(
        "group relative grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3",
        // Celular: cartão.
        "rounded-card border border-border-subtle bg-surface-base p-4 shadow-panel",
        // Tablet e desktop: linha.
        "md:grid-cols-[4.5rem_minmax(0,1fr)_auto] md:items-center md:gap-4 md:rounded-none md:border-0 md:px-5 md:py-3 md:shadow-none",
        "lg:grid-cols-[4.5rem_minmax(0,1fr)_9.5rem_11rem]",
        "transition-colors md:hover:bg-surface-app",
      )}
    >
      <div className="flex items-center gap-2 md:block">
        <div>
          <p
            className={cn(
              "font-mono text-card font-semibold",
              finished ? "text-ink-tertiary" : "text-ink-primary",
            )}
          >
            {item.time}
          </p>
          <p className="text-micro text-ink-tertiary">
            {showDate
              ? formatDate(item.startsAt)
              : `${item.durationMinutes} min`}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <Link
          to={`/consultas/${item.id}`}
          state={actionState}
          className={cn(
            "block truncate text-card font-semibold text-ink-primary hover:text-accent-ink hover:underline",
            // O link cobre o cartão inteiro no celular: alvo grande, um toque abre.
            "after:absolute after:inset-0 after:content-[''] md:after:hidden",
          )}
        >
          {item.patientName}
        </Link>
        <p className="truncate text-label text-ink-secondary">
          {APPOINTMENT_TYPE_LABEL[item.type]} com {item.professionalName}
          {item.room ? ` — ${item.room}` : ""}
        </p>
        {item.isOverbooked ? (
          <Badge tone="warning" size="sm" className="mt-1">
            Encaixe
          </Badge>
        ) : null}
        <div className="mt-2 lg:hidden">
          <StatusBadge state={item.derivedState} label={item.stateLabel} />
        </div>
      </div>

      <div className="hidden lg:block">
        <StatusBadge state={item.derivedState} label={item.stateLabel} />
      </div>

      <div
        className={cn(
          "relative z-10 col-span-2 flex gap-2 md:col-span-1 md:justify-end",
          !primary && "max-md:hidden",
        )}
      >
        {primary ? (
          <Button
            size="sm"
            variant="primary"
            className="max-md:h-11 max-md:flex-1 max-md:text-body"
            loading={
              busyHere && transition.variables?.target === primary.target
            }
            disabled={busyHere}
            onClick={() =>
              transition.mutate({
                id: item.id,
                target: primary.target,
                patientName: item.patientName,
              })
            }
          >
            {primary.shortLabel}
          </Button>
        ) : null}
        {secondary.length > 0 ? (
          <Menu
            label={`Mais ações para ${item.patientName}`}
            trigger={(props) => (
              <button
                type="button"
                {...props}
                aria-label={`Mais ações para ${item.patientName}`}
                disabled={busyHere}
                className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-control text-ink-secondary hover:bg-surface-sunken pointer-coarse:size-11"
              >
                <MoreHorizontal className="size-5" aria-hidden="true" />
              </button>
            )}
          >
            {secondary.map((action) => (
              <MenuItem
                key={action.target}
                onSelect={() =>
                  transition.mutate({
                    id: item.id,
                    target: action.target,
                    patientName: item.patientName,
                  })
                }
              >
                {action.label}
              </MenuItem>
            ))}
          </Menu>
        ) : null}
        <Link
          to={`/consultas/${item.id}`}
          state={actionState}
          aria-label={`Abrir consulta de ${item.patientName}`}
          title="Abrir consulta"
          className="hidden size-8 shrink-0 items-center justify-center rounded-control text-ink-tertiary transition-colors hover:bg-surface-sunken hover:text-ink-primary md:flex pointer-coarse:size-11"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
