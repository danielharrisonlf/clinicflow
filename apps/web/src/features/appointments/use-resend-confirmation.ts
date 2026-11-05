import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { notificationsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";

/**
 * Reenvia a confirmação por WhatsApp. O histórico recarrega mesmo no erro:
 * um envio que falhou também vira registro (`FALHOU`) e muda o risco da linha.
 */
export function useResendConfirmation() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      appointmentId,
    }: {
      appointmentId: string;
      patientName: string;
    }) => notificationsApi.resendConfirmation(appointmentId),

    onSuccess: (_data, variables) => {
      toast.push({
        tone: "success",
        title: "Confirmação reenviada",
        description: variables.patientName,
      });
    },

    onError: (error) => {
      toast.push({
        tone: "error",
        title: "A confirmação não foi reenviada",
        description:
          error instanceof ApiError
            ? error.message
            : "Sem conexão com o servidor. Nenhuma mensagem saiu.",
      });
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.notifications.all });
    },
  });
}
