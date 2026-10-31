import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { Overlay } from "@/components/ui/overlay";
import { Spinner } from "@/components/ui/spinner";
import { InlineError } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError, errorMessage } from "@/lib/api/client";
import { patientsApi, tasksApi } from "@/lib/api/endpoints";
import { TASK_TYPE, type TaskType } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import { TASK_TYPE_LABEL, todayISO } from "../appointments/labels";

const TITLE_MAX = 200;
const NOTES_MAX = 1000;
const FORM_ID = "nova-pendencia";

type Errors = Partial<
  Record<"patientId" | "type" | "title" | "dueAt" | "notes", string>
>;

interface PickedPatient {
  id: string;
  name: string;
  phone: string;
}

/**
 * Pendência criada à mão: o retorno que o médico pediu de boca, o exame que o
 * paciente ficou de trazer. O funil automático não sabe dessas.
 */
export function NewTaskOverlay({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [term, setTerm] = useState("");
  const [type, setType] = useState<TaskType>("RETORNO_A_AGENDAR");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const search = useDebounced(term.trim(), 250);
  const patientQuery = { search, limit: 6 };
  const patients = useQuery({
    queryKey: qk.patients.list(patientQuery),
    queryFn: () => patientsApi.list(patientQuery),
    enabled: !patient && search.length >= 2,
  });

  const create = useMutation({
    mutationFn: () => {
      if (!patient) throw new Error("Sem paciente");
      return tasksApi.create({
        patientId: patient.id,
        type,
        title: title.trim() || TASK_TYPE_LABEL[type],
        dueAt: dueAt || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (task) => {
      for (const queryKey of [
        qk.tasks.all,
        qk.patients.all,
        qk.dashboard.all,
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      toast.push({
        tone: "success",
        title: "Pendência criada",
        description: `${task.patientName}: ${task.title}`,
      });
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError) setErrors(error.fieldErrors() as Errors);
    },
  });

  function validate(): Errors {
    const next: Errors = {};
    if (!patient) next.patientId = "Escolha o paciente desta pendência.";
    if (dueAt && dueAt < todayISO())
      next.dueAt = "O prazo não pode ficar no passado.";
    return next;
  }

  function submit() {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    create.mutate();
  }

  const typing = term.trim().length >= 2 && search !== term.trim();
  const generalError =
    create.isError &&
    !(
      create.error instanceof ApiError &&
      Object.keys(create.error.fieldErrors()).length > 0
    );

  return (
    <Overlay
      open
      onClose={onClose}
      variant="sheet"
      title="Nova pendência"
      description="Algo para acompanhar com um paciente: retorno, exame, documento."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={create.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={create.isPending}>
            Criar pendência
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {patient ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-label font-semibold text-ink-secondary">
              Paciente
            </span>
            <div className="flex items-center gap-3 rounded-control border border-border-strong bg-surface-app px-3 py-2">
              <UserRound
                className="size-4 shrink-0 text-ink-secondary"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-ink-primary">
                  {patient.name}
                </span>
                <span className="block font-mono text-label text-ink-secondary">
                  {patient.phone}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPatient(null);
                  setTerm("");
                }}
              >
                <X aria-hidden="true" />
                Trocar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Field
              label="Paciente"
              required
              type="search"
              icon={<Search />}
              placeholder="Nome, CPF ou telefone"
              autoComplete="off"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              error={errors.patientId}
              hint="Digite ao menos duas letras."
            />
            <PatientResults
              enabled={term.trim().length >= 2}
              pending={typing || patients.isFetching}
              error={patients.isError ? patients.error : null}
              onRetry={() => void patients.refetch()}
              items={patients.data?.data ?? []}
              term={search}
              onPick={(picked) => {
                setPatient(picked);
                setErrors((current) => ({ ...current, patientId: undefined }));
              }}
            />
          </div>
        )}

        <SelectField
          label="Tipo"
          required
          value={type}
          onChange={(event) => setType(event.target.value as TaskType)}
          error={errors.type}
        >
          {TASK_TYPE.map((value) => (
            <option key={value} value={value}>
              {TASK_TYPE_LABEL[value]}
            </option>
          ))}
        </SelectField>

        <Field
          label="O que precisa ser feito"
          maxLength={TITLE_MAX}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={TASK_TYPE_LABEL[type]}
          hint={`Em branco, fica “${TASK_TYPE_LABEL[type]}”.`}
          error={errors.title}
        />

        <Field
          label="Prazo"
          type="date"
          min={todayISO()}
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          hint="Opcional. Vence no fim do dia escolhido."
          error={errors.dueAt}
          containerClassName="sm:max-w-56"
        />

        <TextareaField
          label="Observações"
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          hint={notes ? `${notes.length}/${NOTES_MAX}` : "Opcional."}
          error={errors.notes}
        />

        {generalError ? (
          <Callout tone="danger" title="A pendência não foi criada" live>
            {errorMessage(create.error)}
          </Callout>
        ) : null}
      </form>
    </Overlay>
  );
}

function PatientResults({
  enabled,
  pending,
  error,
  onRetry,
  items,
  term,
  onPick,
}: {
  enabled: boolean;
  pending: boolean;
  error: unknown;
  onRetry: () => void;
  items: { id: string; name: string; phone: string; age: number | null }[];
  term: string;
  onPick: (patient: PickedPatient) => void;
}) {
  if (!enabled) return null;
  if (error) {
    return (
      <InlineError
        error={error}
        onRetry={onRetry}
        label="A busca de pacientes falhou."
      />
    );
  }
  if (items.length === 0) {
    return (
      <p
        className="flex items-center gap-2 rounded-control bg-surface-app px-3 py-2.5 text-label text-ink-secondary"
        aria-live="polite"
      >
        {pending ? (
          <>
            <Spinner className="size-3.5 text-accent" />
            Buscando pacientes…
          </>
        ) : (
          <>
            Nenhum paciente com “{term}”.{" "}
            <Link
              to="/pacientes/novo"
              className="font-semibold text-accent-ink underline-offset-4 hover:underline"
            >
              Cadastrar paciente
            </Link>
          </>
        )}
      </p>
    );
  }
  return (
    <ul
      aria-label="Pacientes encontrados"
      className={cn(
        "divide-y divide-border-subtle overflow-hidden rounded-control border border-border-default transition-opacity",
        pending && "opacity-60",
      )}
    >
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() =>
              onPick({ id: item.id, name: item.name, phone: item.phone })
            }
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover pointer-coarse:min-h-11"
          >
            <span className="min-w-0 truncate text-body font-semibold text-ink-primary">
              {item.name}
              {item.age !== null ? (
                <span className="font-normal text-ink-secondary">
                  {" "}
                  {item.age} anos
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-mono text-label text-ink-secondary">
              {item.phone}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
