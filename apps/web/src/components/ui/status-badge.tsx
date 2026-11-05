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
import { Dot } from "./badge";

/**
 * Selo de estado. Espelha a máquina de estados da consulta um para um.
 *
 * Cada estado tem matiz e ícone próprios: cor nunca é o único sinal (daltonismo,
 * monitor velho no balcão). Agendada é só contorno; os demais têm fundo
 * tingido. Concluída e cancelada recuam em tons frios: já saíram da fila.
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

/**
 * O dot pulsa só no que está acontecendo agora: paciente esperando, em
 * atendimento e atrasada. Com prefers-reduced-motion vira dot estático.
 */
export const LIVE_STATES: ReadonlySet<DerivedState> = new Set<DerivedState>([
  "CHECK_IN",
  "EM_ATENDIMENTO",
  "ATRASADA",
]);

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
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold",
        size === "sm" ? "h-5 px-2 text-micro" : "h-6 px-2.5 text-micro",
        STATE_STYLE[state],
        className,
      )}
    >
      <Dot pulse={LIVE_STATES.has(state)} />
      <Icon
        className="size-3.5 shrink-0"
        strokeWidth={2.25}
        aria-hidden="true"
      />
      {label ?? STATE_LABEL[state]}
    </span>
  );
}
