import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Ban,
  CheckCheck,
  CircleCheck,
  Clock3,
  Repeat,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import type { DerivedState } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Selo de estado. Espelha a máquina de estados da consulta um para um.
 *
 * Cada estado tem matiz e ícone próprios: cor nunca é o único sinal (daltonismo,
 * monitor velho no balcão). Só CHECK_IN é preenchido forte, porque é o único
 * estado que pede ação imediata — se todos gritassem, nenhum chamaria atenção.
 * Concluída e cancelada recuam: já saíram da fila de trabalho.
 */
const STATE_STYLE: Record<DerivedState, string> = {
  AGENDADA: "text-state-agendada border-border-default bg-transparent",
  CONFIRMADA:
    "text-state-confirmada border-transparent bg-state-confirmada-weak",
  CHECK_IN: "text-state-espera border-transparent bg-state-espera-weak",
  EM_ATENDIMENTO:
    "text-state-atendimento border-transparent bg-state-atendimento-weak",
  CONCLUIDA: "text-state-concluida border-transparent bg-state-concluida-weak",
  CANCELADA: "text-state-cancelada border-transparent bg-state-cancelada-weak",
  REAGENDADA: "text-state-cancelada border-transparent bg-state-cancelada-weak",
  ATRASADA: "text-state-atrasada border-transparent bg-state-atrasada-weak",
};

export const STATE_LABEL: Record<DerivedState, string> = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  CHECK_IN: "Aguardando",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  REAGENDADA: "Reagendada",
  ATRASADA: "Atrasada",
};

export const STATE_ICON: Record<DerivedState, LucideIcon> = {
  AGENDADA: Clock3,
  CONFIRMADA: CircleCheck,
  CHECK_IN: Armchair,
  EM_ATENDIMENTO: Stethoscope,
  CONCLUIDA: CheckCheck,
  CANCELADA: Ban,
  REAGENDADA: Repeat,
  ATRASADA: TriangleAlert,
};

/** Cor de traço do estado, para a barra da agenda e o marcador da timeline. */
export const STATE_SOLID: Record<DerivedState, string> = {
  AGENDADA: "bg-state-agendada",
  CONFIRMADA: "bg-state-confirmada",
  CHECK_IN: "bg-state-espera",
  EM_ATENDIMENTO: "bg-state-atendimento",
  CONCLUIDA: "bg-state-concluida",
  CANCELADA: "bg-state-cancelada",
  REAGENDADA: "bg-state-cancelada",
  ATRASADA: "bg-state-atrasada",
};

export function StatusBadge({
  state,
  label,
  size = "md",
  className,
}: {
  state: DerivedState;
  /** O backend já manda pronto ("Atrasada 27min"). Sem ele, cai no rótulo fixo. */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const Icon = STATE_ICON[state];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-semibold",
        size === "sm" ? "h-5 px-1.5 text-micro" : "h-6 px-2 text-micro",
        STATE_STYLE[state],
        className,
      )}
    >
      <Icon
        className="size-3.5 shrink-0"
        strokeWidth={2.25}
        aria-hidden="true"
      />
      {label ?? STATE_LABEL[state]}
    </span>
  );
}
