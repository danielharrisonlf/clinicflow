import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { appointmentsApi } from "@/lib/api/endpoints";
import type { AppointmentStatus } from "@/lib/api/types";
import { qk } from "@/lib/query";

/**
 * Transição → como ela se apresenta na linha. Quem decide o que é permitido é
 * o backend (`allowedTransitions`); o front nunca infere a máquina de estados,
 * senão passam a existir duas fontes da verdade que divergem no primeiro bug.
 */
const ACTION_BY_TRANSITION: Record<
  string,
  { label: string; shortLabel: string; done: string }
> = {
  CONFIRMADA: {
    label: "Confirmar consulta",
    shortLabel: "Confirmar",
    done: "Consulta confirmada",
  },
  CHECK_IN: {
    label: "Registrar check-in",
    shortLabel: "Check-in",
    done: "Check-in registrado",
  },
  EM_ATENDIMENTO: {
    label: "Iniciar atendimento",
    shortLabel: "Iniciar",
    done: "Atendimento iniciado",
  },
  CONCLUIDA: {
    label: "Concluir consulta",
    shortLabel: "Concluir",
    done: "Consulta concluída",
  },
};

/**
 * A ordem do ciclo de vida da consulta, não uma ordem de importância inventada.
 *
 * A primária é sempre o **passo imediatamente seguinte**. Ordenar por
 * "urgência" põe Check-in como botão escuro numa consulta apenas agendada —
 * e o paciente ainda nem chegou na clínica.
 */
const LIFECYCLE: AppointmentStatus[] = [
  "CONFIRMADA",
  "CHECK_IN",
  "EM_ATENDIMENTO",
  "CONCLUIDA",
];

export interface AppointmentAction {
  target: AppointmentStatus;
  label: string;
  shortLabel: string;
  primary: boolean;
}

/** Uma ação primária — o próximo passo — e o resto como secundárias. */
export function actionsFor(
  allowedTransitions: AppointmentStatus[],
): AppointmentAction[] {
  const usable = LIFECYCLE.filter((status) =>
    allowedTransitions.includes(status),
  );
  return usable.map((target, index) => ({
    target,
    label: ACTION_BY_TRANSITION[target]?.label ?? target,
    shortLabel: ACTION_BY_TRANSITION[target]?.shortLabel ?? target,
    primary: index === 0,
  }));
}

const MUTATION_BY_TARGET: Record<string, (id: string) => Promise<unknown>> = {
  CONFIRMADA: appointmentsApi.confirm,
  CHECK_IN: appointmentsApi.checkIn,
  EM_ATENDIMENTO: appointmentsApi.start,
  CONCLUIDA: appointmentsApi.complete,
};

/**
 * Tudo o que deriva de uma consulta: painel, listas, fila, ficha do paciente
 * (histórico e próxima visita), pendências (concluir gera retorno, falta gera
 * resgate) e a agenda do profissional. Uma ação, todas as telas em dia.
 */
export function useInvalidateAppointmentViews() {
  const queryClient = useQueryClient();
  return () => {
    for (const queryKey of [
      qk.appointments.all,
      qk.dashboard.all,
      qk.waitingRoom.all,
      qk.patients.all,
      qk.tasks.all,
      qk.professionals.all,
    ]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
}

export function useAppointmentTransition() {
  const invalidate = useInvalidateAppointmentViews();
  const toast = useToast();

  const undo = useMutation({
    mutationFn: (id: string) => appointmentsApi.undo(id),
    onSuccess: (detail) => {
      invalidate();
      toast.push({
        tone: "success",
        title: "Ação desfeita",
        description: `${detail.patientName} voltou para "${detail.stateLabel}".`,
      });
    },
    onError: (error) => {
      toast.push({
        tone: "warning",
        title: "Não deu para desfazer",
        description:
          error instanceof ApiError
            ? error.message
            : "A janela de desfazer já fechou.",
      });
    },
  });

  const transition = useMutation({
    mutationFn: ({
      id,
      target,
    }: {
      id: string;
      target: AppointmentStatus;
      patientName: string;
    }) => {
      const run = MUTATION_BY_TARGET[target];
      if (!run) throw new Error(`Transição sem ação: ${target}`);
      return run(id);
    },

    onSuccess: (_data, variables) => {
      invalidate();
      toast.push({
        tone: "success",
        title:
          ACTION_BY_TRANSITION[variables.target]?.done ?? "Consulta atualizada",
        description: variables.patientName,
        onUndo: () => undo.mutate(variables.id),
      });
    },

    onError: (error) => {
      toast.push({
        tone: "error",
        title: "A ação não foi registrada",
        description:
          error instanceof ApiError
            ? error.message
            : "Sem conexão com o servidor. Nada foi alterado.",
      });
    },
  });

  return transition;
}
