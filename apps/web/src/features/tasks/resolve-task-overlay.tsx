import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { TextareaField } from "@/components/ui/field";
import { Overlay } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/client";
import { tasksApi } from "@/lib/api/endpoints";
import type { TaskItem } from "@/lib/api/types";
import { qk } from "@/lib/query";

const NOTE_MAX = 500;

/**
 * Confirmação de "resolver". Um passo a mais de propósito: resolver tira a
 * pendência do funil, e a observação é o único registro de como foi resolvida.
 */
export function ResolveTaskOverlay({
  task,
  onClose,
}: {
  task: TaskItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [note, setNote] = useState("");

  const resolve = useMutation({
    mutationFn: () => tasksApi.resolve(task.id, note.trim() || undefined),
    onSuccess: () => {
      for (const queryKey of [
        qk.tasks.all,
        qk.patients.all,
        qk.dashboard.all,
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      toast.push({
        tone: "success",
        title: "Pendência resolvida",
        description: `${task.patientName}: ${task.title}`,
      });
      onClose();
    },
  });

  const formId = `resolver-${task.id}`;

  return (
    <Overlay
      open
      onClose={onClose}
      size="sm"
      title="Resolver pendência"
      description={
        <>
          <span className="font-semibold text-ink-primary">
            {task.patientName}
          </span>
          <span className="block">{task.title}</span>
        </>
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={resolve.isPending}
          >
            Voltar
          </Button>
          <Button type="submit" form={formId} loading={resolve.isPending}>
            Marcar como resolvida
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          resolve.mutate();
        }}
      >
        <TextareaField
          label="Como foi resolvida (opcional)"
          hint={`Substitui a observação atual da pendência. ${note.length}/${NOTE_MAX}`}
          maxLength={NOTE_MAX}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ex.: retorno marcado para 15/10 por telefone"
        />
        {resolve.isError ? (
          <Callout tone="danger" title="A pendência continua aberta" live>
            {errorMessage(resolve.error)}
          </Callout>
        ) : null}
      </form>
    </Overlay>
  );
}
