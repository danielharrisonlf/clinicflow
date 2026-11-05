import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { SelectField, TextareaField } from "@/components/ui/field";
import { Overlay } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { ApiError, errorMessage } from "@/lib/api/client";
import { appointmentsApi } from "@/lib/api/endpoints";
import {
  type AppointmentDetail,
  CANCEL_REASON,
  type CancelReason,
} from "@/lib/api/types";
import { CANCEL_REASON_LABEL, formatDayLong, toDateKey } from "./labels";
import { useInvalidateAppointmentViews } from "./use-appointment-actions";

/** O que cada motivo provoca depois — quem cancela precisa saber antes de confirmar. */
const REASON_HINT: Partial<Record<CancelReason, string>> = {
  NO_SHOW: "Cria uma pendência de resgate do paciente para os próximos 3 dias.",
  OUTRO: "Descreva o motivo na observação.",
};

export function CancelPanel({
  appointment,
  open,
  onClose,
}: {
  appointment: AppointmentDetail;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const invalidate = useInvalidateAppointmentViews();
  const [reason, setReason] = useState<CancelReason>("PACIENTE_DESMARCOU");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const trimmed = notes.trim();
  const notesError =
    reason === "OUTRO" && trimmed.length < 3
      ? "Com “Outro motivo”, explique em pelo menos 3 letras."
      : trimmed.length > 500
        ? "A observação aceita até 500 letras."
        : undefined;

  const undo = useMutation({
    mutationFn: () => appointmentsApi.undo(appointment.id),
    onSuccess: () => {
      invalidate();
      toast.push({
        tone: "success",
        title: "Cancelamento desfeito",
        description: appointment.patientName,
      });
    },
    onError: (error) => {
      toast.push({
        tone: "warning",
        title: "Não deu para desfazer",
        description: errorMessage(error, "A janela de desfazer já fechou."),
      });
    },
  });

  const mutation = useMutation({
    mutationFn: () =>
      appointmentsApi.cancel(appointment.id, {
        reason,
        notes: trimmed || undefined,
      }),
    onSuccess: () => {
      invalidate();
      onClose();
      toast.push({
        tone: "warning",
        title: "Consulta cancelada",
        description: `${appointment.patientName} — ${CANCEL_REASON_LABEL[reason]}`,
        onUndo: () => undo.mutate(),
      });
    },
  });

  const serverFields =
    mutation.error instanceof ApiError ? mutation.error.fieldErrors() : {};

  return (
    <Overlay
      open={open}
      onClose={onClose}
      variant="sheet"
      role="alertdialog"
      title="Cancelar esta consulta?"
      description={
        <>
          {appointment.patientName},{" "}
          {formatDayLong(toDateKey(appointment.startsAt)).toLowerCase()} às{" "}
          <span className="font-mono">{appointment.time}</span> com{" "}
          {appointment.professionalName}. O horário fica livre na agenda e o
          motivo vai para o histórico.
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Manter consulta
          </Button>
          <Button
            type="submit"
            form="cancelar-consulta"
            variant="destructive"
            loading={mutation.isPending}
          >
            Cancelar consulta
          </Button>
        </>
      }
    >
      <form
        id="cancelar-consulta"
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          if (notesError) return;
          mutation.mutate();
        }}
      >
        <SelectField
          label="Motivo"
          required
          value={reason}
          hint={REASON_HINT[reason]}
          error={serverFields.reason}
          onChange={(event) => setReason(event.target.value as CancelReason)}
        >
          {CANCEL_REASON.map((code) => (
            <option key={code} value={code}>
              {CANCEL_REASON_LABEL[code]}
            </option>
          ))}
        </SelectField>

        <TextareaField
          label={reason === "OUTRO" ? "Observação" : "Observação (opcional)"}
          required={reason === "OUTRO"}
          maxLength={500}
          value={notes}
          error={(submitted ? notesError : undefined) ?? serverFields.notes}
          hint={`${trimmed.length}/500`}
          onChange={(event) => setNotes(event.target.value)}
        />

        {mutation.isError && Object.keys(serverFields).length === 0 ? (
          <Callout live tone="danger" title="A consulta não foi cancelada">
            {errorMessage(
              mutation.error,
              "Sem conexão com o servidor. Nada foi alterado.",
            )}
          </Callout>
        ) : null}
      </form>
    </Overlay>
  );
}
