import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AppointmentListItem } from "@/lib/api/types";
import { APPOINTMENT_TYPE_LABEL } from "./labels";
import {
  actionsFor,
  useAppointmentTransition,
} from "./use-appointment-actions";

/**
 * Uma lista, duas formas. A tabela é certa no balcão, onde a pessoa varre uma
 * coluna de horários; no celular ela vira pilha de cards, porque tabela com
 * ação por linha em 390px obriga a rolagem horizontal — que ninguém faz.
 */
export function AppointmentList({
  items,
  emptyState,
}: {
  items: AppointmentListItem[];
  emptyState: React.ReactNode;
}) {
  if (items.length === 0) return <>{emptyState}</>;

  return (
    <>
      <table className="hidden w-full border-collapse md:table">
        <thead>
          <tr className="border-b border-border-subtle text-left">
            <th
              scope="col"
              className="w-20 px-4 py-2.5 text-micro font-semibold text-ink-secondary"
            >
              Hora
            </th>
            <th
              scope="col"
              className="px-4 py-2.5 text-micro font-semibold text-ink-secondary"
            >
              Paciente e profissional
            </th>
            <th
              scope="col"
              className="w-36 px-4 py-2.5 text-micro font-semibold text-ink-secondary lg:w-44"
            >
              Estado
            </th>
            {/* Largura reservada: o selo nunca encosta no botão. */}
            <th
              scope="col"
              className="w-40 px-4 py-2.5 text-right text-micro font-semibold text-ink-secondary lg:w-56"
            >
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {items.map((item) => (
            <AppointmentRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <AppointmentCard item={item} />
          </li>
        ))}
      </ul>
    </>
  );
}

function AppointmentRow({ item }: { item: AppointmentListItem }) {
  const transition = useAppointmentTransition();
  const actions = actionsFor(item.allowedTransitions);
  const pending = transition.isPending && transition.variables?.id === item.id;

  return (
    <tr className="transition-colors hover:bg-surface-app">
      <td className="px-4 py-3 align-middle font-mono text-body font-semibold whitespace-nowrap text-ink-primary">
        {item.time}
      </td>
      <td className="px-4 py-3 align-middle">
        <Link
          to={`/consultas/${item.id}`}
          className="text-body font-semibold text-ink-primary hover:text-accent"
        >
          {item.patientName}
        </Link>
        <p className="text-micro text-ink-secondary">
          {APPOINTMENT_TYPE_LABEL[item.type]} com {item.professionalName}
        </p>
      </td>
      <td className="px-4 py-3 align-middle">
        <StatusBadge state={item.derivedState} label={item.stateLabel} />
      </td>
      <td className="px-4 py-3 text-right align-middle">
        <div className="flex justify-end gap-2">
          {actions.slice(0, 2).map((action) => (
            <Button
              key={action.target}
              size="sm"
              variant={action.primary ? "primary" : "secondary"}
              loading={
                pending && transition.variables?.target === action.target
              }
              disabled={transition.isPending}
              onClick={() =>
                transition.mutate({
                  id: item.id,
                  target: action.target,
                  patientName: item.patientName,
                })
              }
            >
              {action.shortLabel}
            </Button>
          ))}
          {actions.length === 0 ? (
            <Link
              to={`/consultas/${item.id}`}
              className="text-micro font-semibold text-ink-tertiary hover:text-accent"
            >
              Ver detalhes
            </Link>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function AppointmentCard({ item }: { item: AppointmentListItem }) {
  const transition = useAppointmentTransition();
  const actions = actionsFor(item.allowedTransitions);
  const pending = transition.isPending && transition.variables?.id === item.id;

  return (
    <article className="rounded-card border border-border-subtle bg-surface-base p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-section font-bold text-ink-primary">
          {item.time}
        </span>
        <StatusBadge state={item.derivedState} label={item.stateLabel} />
      </div>

      <Link
        to={`/consultas/${item.id}`}
        className="mt-2 block text-card font-semibold text-ink-primary"
      >
        {item.patientName}
      </Link>
      <p className="text-micro text-ink-secondary">
        {APPOINTMENT_TYPE_LABEL[item.type]} com {item.professionalName}
      </p>

      {actions.length > 0 ? (
        <div className="mt-4 flex gap-2">
          {actions.slice(0, 2).map((action) => (
            <Button
              key={action.target}
              block
              variant={action.primary ? "primary" : "secondary"}
              loading={
                pending && transition.variables?.target === action.target
              }
              disabled={transition.isPending}
              onClick={() =>
                transition.mutate({
                  id: item.id,
                  target: action.target,
                  patientName: item.patientName,
                })
              }
            >
              {action.shortLabel}
            </Button>
          ))}
        </div>
      ) : null}
    </article>
  );
}
