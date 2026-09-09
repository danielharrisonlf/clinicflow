import type { DerivedState } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Selo de estado. Espelha a máquina de estados da consulta um para um.
 *
 * Só CHECK_IN é preenchido sólido, porque é o único estado que pede ação
 * imediata da recepção — se todos fossem sólidos, nenhum chamaria atenção.
 * Âmbar como tinta sobre claro nunca é #F2C64B: vira #7A4A00, que passa em AA.
 */
const STATE_STYLE: Record<DerivedState, string> = {
  AGENDADA: "text-state-agendada border-border-default bg-transparent",
  CONFIRMADA:
    "text-state-confirmada border-state-confirmada/25 bg-state-confirmada-weak",
  CHECK_IN: "text-state-espera border-transparent bg-state-espera-weak",
  EM_ATENDIMENTO:
    "text-state-atendimento border-state-atendimento/25 bg-state-atendimento-weak",
  CONCLUIDA:
    "text-state-concluida border-state-concluida/25 bg-state-concluida-weak",
  CANCELADA: "text-ink-tertiary border-border-subtle bg-surface-sunken",
  REAGENDADA: "text-ink-tertiary border-border-subtle bg-surface-sunken",
  ATRASADA:
    "text-state-atrasada border-state-atrasada/25 bg-state-atrasada-weak",
};

const STATE_LABEL: Record<DerivedState, string> = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  CHECK_IN: "Aguardando",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  REAGENDADA: "Reagendada",
  ATRASADA: "Atrasada",
};

export function StatusBadge({
  state,
  label,
  className,
}: {
  state: DerivedState;
  /** O backend já manda pronto ("Atrasada 27min"). Sem ele, cai no rótulo fixo. */
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5",
        "text-micro font-semibold",
        // CHECK_IN é o único sólido: o peso vem do preenchimento, não do peso da fonte.
        state === "CHECK_IN" && "font-bold",
        STATE_STYLE[state],
        className,
      )}
    >
      {label ?? STATE_LABEL[state]}
    </span>
  );
}

export { STATE_LABEL };
