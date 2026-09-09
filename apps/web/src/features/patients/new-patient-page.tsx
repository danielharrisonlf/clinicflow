import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Field, TextareaField } from "@/components/ui/field";
import { Panel } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { patientsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";

/** Tela de cadastro ágil: a pessoa está no balcão com o paciente esperando. */
export function NewPatientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    birthDate: "",
    cpf: "",
    email: "",
    notes: "",
  });

  const create = useMutation({
    mutationFn: () =>
      patientsApi.create({
        name: form.name,
        phone: form.phone,
        birthDate: form.birthDate || undefined,
        cpf: form.cpf || undefined,
        email: form.email || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: (patient) => {
      void queryClient.invalidateQueries({ queryKey: qk.patients.all });
      toast.push({
        tone: "success",
        title: "Paciente cadastrado",
        description: patient.name,
      });
      navigate(`/pacientes/${patient.id}`);
    },
  });

  function set(field: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  /** O backend devolve a lista de campos inválidos em `details`. */
  const fieldError = (needle: string) =>
    create.error instanceof ApiError
      ? create.error.details?.find((detail) => detail.includes(needle))
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 md:gap-6">
      <Link
        to="/pacientes"
        className="inline-flex w-fit items-center gap-1.5 text-micro font-semibold text-ink-secondary hover:text-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Pacientes
      </Link>

      <header>
        <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
          Novo paciente
        </h1>
        <p className="mt-0.5 text-body text-ink-secondary">
          Nome e telefone bastam para agendar. O resto pode vir depois.
        </p>
      </header>

      <Panel className="p-4 md:p-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <Field
            label="Nome completo"
            required
            autoComplete="off"
            value={form.name}
            onChange={set("name")}
            error={fieldError("name")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Telefone / WhatsApp"
              type="tel"
              required
              placeholder="(11) 99721-4408"
              value={form.phone}
              onChange={set("phone")}
              error={fieldError("phone")}
            />
            <Field
              label="Data de nascimento"
              type="date"
              value={form.birthDate}
              onChange={set("birthDate")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="CPF"
              placeholder="412.907.338-20"
              autoComplete="off"
              value={form.cpf}
              onChange={set("cpf")}
              error={fieldError("cpf")}
            />
            <Field
              label="E-mail"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={set("email")}
              error={fieldError("email")}
            />
          </div>
          <TextareaField
            label="Observações clínicas e alergias"
            value={form.notes}
            onChange={set("notes")}
          />

          {create.isError &&
          !(create.error instanceof ApiError && create.error.isValidation) ? (
            <p className="text-body text-state-atrasada">
              {create.error instanceof ApiError
                ? create.error.message
                : "Não foi possível cadastrar."}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" loading={create.isPending}>
              Salvar paciente
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
