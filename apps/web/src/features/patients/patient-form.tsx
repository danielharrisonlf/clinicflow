import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, TextareaField } from "@/components/ui/field";
import { ApiError, errorMessage } from "@/lib/api/client";
import type { CreatePatientInput, PatientDetail } from "@/lib/api/types";
import { todayISO } from "../appointments/labels";
import {
  cpfDigits,
  formatCpf,
  formatPhoneInput,
  isValidCpf,
  PHONE_PATTERN,
} from "./patient-format";

export interface PatientFormValues {
  name: string;
  phone: string;
  birthDate: string;
  cpf: string;
  email: string;
  notes: string;
}

type FieldName = keyof PatientFormValues;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: PatientFormValues = {
  name: "",
  phone: "",
  birthDate: "",
  cpf: "",
  email: "",
  notes: "",
};

const NOTES_MAX = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS: FieldName[] = [
  "name",
  "phone",
  "birthDate",
  "cpf",
  "email",
  "notes",
];

export function valuesFrom(patient: PatientDetail): PatientFormValues {
  return {
    name: patient.name,
    phone: patient.phone,
    birthDate: patient.birthDate ?? "",
    cpf: formatCpf(patient.cpf),
    email: patient.email ?? "",
    notes: patient.notes ?? "",
  };
}

/**
 * Valida no cliente com as mesmas regras do backend. O servidor continua sendo
 * a palavra final, mas o erro chega antes do clique e no campo certo.
 */
function validate(
  values: PatientFormValues,
  initial?: PatientFormValues,
): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  if (!name) errors.name = "Informe o nome completo do paciente.";
  else if (name.length > 150)
    errors.name =
      "O nome passa de 150 caracteres. Abrevie os sobrenomes do meio.";

  const phone = values.phone.trim();
  if (!phone)
    errors.phone =
      "Informe um telefone para contato e confirmação por WhatsApp.";
  else if (!PHONE_PATTERN.test(phone))
    errors.phone =
      "Telefone fora do formato. Use só números, com DDD — por exemplo (11) 98765-4321.";

  if (values.birthDate) {
    if (values.birthDate > todayISO())
      errors.birthDate = "A data de nascimento está no futuro. Confira o ano.";
    else if (values.birthDate < "1900-01-01")
      errors.birthDate = "Data anterior a 1900. Confira o ano.";
  }

  const cpf = cpfDigits(values.cpf);
  if (cpf) {
    if (cpf.length !== 11)
      errors.cpf = `O CPF tem 11 dígitos; foram digitados ${cpf.length}.`;
    else if (!isValidCpf(cpf))
      errors.cpf =
        "CPF inválido: os dígitos verificadores não conferem. Confira com o documento.";
  }

  const email = values.email.trim();
  if (email && !EMAIL_PATTERN.test(email))
    errors.email = "E-mail incompleto. Use o formato nome@provedor.com.br.";

  if (values.notes.length > NOTES_MAX)
    errors.notes = `Passou de ${NOTES_MAX} caracteres. Resuma ou mova o detalhe para um documento.`;

  // A API não aceita apagar um dado já salvo (PATCH sem null): avisar no campo
  // é melhor do que salvar e o valor antigo voltar como se nada tivesse mudado.
  if (initial) {
    for (const field of ["birthDate", "cpf", "email", "notes"] as const) {
      if (initial[field].trim() && !values[field].trim()) {
        errors[field] =
          "Ainda não é possível apagar este dado. Corrija o valor em vez de deixá-lo vazio.";
      }
    }
  }
  return errors;
}

/** Corpo do cadastro: só os campos preenchidos, CPF só com dígitos. */
export function toCreateInput(values: PatientFormValues): CreatePatientInput {
  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    birthDate: values.birthDate || undefined,
    cpf: cpfDigits(values.cpf) || undefined,
    email: values.email.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}

/** Corpo da edição: só o que mudou e não está vazio. */
export function toUpdateInput(
  values: PatientFormValues,
  initial: PatientFormValues,
): Partial<CreatePatientInput> {
  const next = toCreateInput(values);
  const before = toCreateInput(initial);
  const out: Partial<CreatePatientInput> = {};
  for (const key of Object.keys(next) as (keyof CreatePatientInput)[]) {
    const value = next[key];
    if (value !== undefined && value !== before[key]) out[key] = value;
  }
  return out;
}

/**
 * Formulário único de cadastro e edição. Duas colunas a partir de `sm`, uma no
 * celular. Erros do servidor (`fieldErrors()`) e do cliente caem no mesmo
 * lugar: embaixo do campo.
 */
export function PatientForm({
  initial,
  mode,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: PatientFormValues;
  mode: "create" | "edit";
  submitting: boolean;
  error: unknown;
  onSubmit: (values: PatientFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<PatientFormValues>(initial ?? EMPTY);
  const [clientErrors, setClientErrors] = useState<Errors>({});
  // Erro do servidor some do campo assim que a pessoa mexe nele.
  const [touchedSinceSubmit, setTouched] = useState<Set<FieldName>>(new Set());

  const apiError = error instanceof ApiError ? error : null;
  const serverFields = apiError?.isValidation ? apiError.fieldErrors() : {};
  const duplicate = apiError?.code === "PATIENT_CPF_DUPLICATE";
  const duplicateId =
    duplicate && typeof apiError?.details?.patientId === "string"
      ? apiError.details.patientId
      : null;

  function errorFor(field: FieldName): string | undefined {
    if (clientErrors[field]) return clientErrors[field];
    if (touchedSinceSubmit.has(field)) return undefined;
    if (field === "cpf" && duplicate)
      return "Este CPF já pertence a outro paciente.";
    return serverFields[field];
  }

  // Erro de validação que não casa com nenhum campo, ou erro que não é de
  // validação: precisa aparecer em algum lugar, não sumir.
  const unmatched =
    error &&
    !duplicate &&
    !(apiError?.isValidation && FIELDS.some((f) => serverFields[f]));

  function set(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setTouched((current) => new Set(current).add(field));
    if (clientErrors[field]) {
      setClientErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(values, mode === "edit" ? initial : undefined);
    setClientErrors(found);
    const first = FIELDS.find((field) => found[field]);
    if (first) {
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setTouched(new Set());
    onSubmit(values);
  }

  const notesLeft = NOTES_MAX - values.notes.length;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {duplicate ? (
        <Callout
          tone="danger"
          live
          title="CPF já cadastrado"
          action={
            duplicateId ? (
              <Link
                to={`/pacientes/${duplicateId}`}
                className="text-body font-semibold text-accent-ink underline underline-offset-4"
              >
                Abrir ficha existente
              </Link>
            ) : undefined
          }
        >
          {apiError?.message} Confira o número ou use a ficha que já existe para
          não duplicar o histórico.
        </Callout>
      ) : unmatched ? (
        <Callout
          tone="danger"
          live
          title={
            mode === "create"
              ? "O cadastro não foi salvo"
              : "As alterações não foram salvas"
          }
        >
          {errorMessage(error)}
        </Callout>
      ) : null}

      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h2 className="text-section font-semibold text-ink-primary">
            Identificação e contato
          </h2>
          <p className="text-label text-ink-secondary">
            Nome e telefone são suficientes para começar.
          </p>
        </div>
        <Field
          label="Nome completo"
          name="name"
          required
          autoComplete="off"
          maxLength={150}
          containerClassName="sm:col-span-2"
          value={values.name}
          error={errorFor("name")}
          onChange={(event) => set("name", event.target.value)}
        />
        <Field
          label="Telefone / WhatsApp"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="off"
          placeholder="(11) 98765-4321"
          hint="Com DDD. É para onde vai a confirmação da consulta."
          className="font-mono tabular-nums"
          value={values.phone}
          error={errorFor("phone")}
          onChange={(event) => set("phone", event.target.value)}
          onBlur={(event) =>
            set("phone", formatPhoneInput(event.target.value.trim()))
          }
        />
        <Field
          label="Data de nascimento"
          name="birthDate"
          type="date"
          max={todayISO()}
          min="1900-01-01"
          className="font-mono tabular-nums"
          value={values.birthDate}
          error={errorFor("birthDate")}
          onChange={(event) => set("birthDate", event.target.value)}
        />
        <div className="border-t border-border-subtle pt-4 sm:col-span-2">
          <h2 className="text-section font-semibold text-ink-primary">
            Dados complementares
          </h2>
          <p className="text-label text-ink-secondary">
            Preencha quando disponíveis para facilitar a identificação e o
            atendimento.
          </p>
        </div>
        <Field
          label="CPF"
          name="cpf"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          hint="Opcional. Evita cadastro duplicado."
          className="font-mono tabular-nums"
          value={values.cpf}
          error={errorFor("cpf")}
          onChange={(event) => set("cpf", formatCpf(event.target.value))}
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="nome@provedor.com.br"
          value={values.email}
          error={errorFor("email")}
          onChange={(event) => set("email", event.target.value)}
        />
        <TextareaField
          label="Observações clínicas e alergias"
          name="notes"
          rows={4}
          containerClassName="sm:col-span-2"
          hint={
            notesLeft < 200
              ? `${notesLeft} caracteres restantes.`
              : "Aparece em destaque no topo da ficha — alergias, restrições, cuidados no atendimento."
          }
          value={values.notes}
          error={errorFor("notes")}
          onChange={(event) => set("notes", event.target.value)}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
          className="max-sm:h-11"
        >
          Cancelar
        </Button>
        <Button type="submit" loading={submitting} className="max-sm:h-11">
          {mode === "create" ? "Salvar paciente" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
