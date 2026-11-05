import { Badge, Dot } from "@/components/ui/badge";
import type { TaskType } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { TASK_TYPE_LABEL } from "../appointments/labels";

/**
 * Tipos que recuperam receita que já estava na agenda: falta a resgatar e
 * confirmação sem resposta. São os "Resgates" — vêm antes do resto da fila.
 */
export const RESCUE_TYPES: ReadonlySet<TaskType> = new Set<TaskType>([
  "RESGATE_NO_SHOW",
  "CONFIRMACAO_PENDENTE",
]);

/**
 * Matiz do dot por tipo. Rosa = risco (falta), âmbar = sem resposta,
 * esmeralda = receita futura (retorno a agendar). O resto fica neutro: o
 * acento é sinal, não enfeite.
 */
export const TASK_TYPE_INK: Record<TaskType, string> = {
  RESGATE_NO_SHOW: "text-danger",
  CONFIRMACAO_PENDENTE: "text-warning",
  RETORNO_A_AGENDAR: "text-revenue",
  ENVIO_DOCUMENTO: "text-ink-tertiary",
  AGUARDANDO_EXAME: "text-ink-tertiary",
  OUTRO: "text-ink-tertiary",
};

/** Etiqueta do tipo com o dot do matiz. O rótulo carrega o significado; a cor só reforça. */
export function TaskTypeTag({
  type,
  className,
}: {
  type: TaskType;
  className?: string;
}) {
  return (
    <Badge size="sm" className={cn("gap-1.5", className)}>
      <Dot className={TASK_TYPE_INK[type]} />
      {TASK_TYPE_LABEL[type] ?? type}
    </Badge>
  );
}
