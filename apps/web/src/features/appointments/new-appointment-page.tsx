import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { InlineError } from "@/components/ui/states";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  appointmentsApi,
  patientsApi,
  professionalsApi,
} from "@/lib/api/endpoints";
import {
  APPOINTMENT_TYPE,
  type AppointmentType,
  type CheckAvailabilityInput,
} from "@/lib/api/types";
import { qk } from "@/lib/query";
import { backTargetFrom } from "./back-target";
import { APPOINTMENT_TYPE_LABEL, formatDayLong, todayISO } from "./labels";
import { PatientPicker, type PickedPatient } from "./patient-picker";
import {
  AvailabilityNotice,
  dateError,
  durationError,
  isDate,
  isDuration,
  isPastDate,
  isTime,
  TimePicker,
  useAvailabilityCheck,
} from "./slot-picker";
import { useInvalidateAppointmentViews } from "./use-appointment-actions";

type Errors = Partial<
  Record<
    | "patientId"
    | "professionalId"
    | "date"
    | "time"
    | "durationMinutes"
    | "notes"
    | "room",
    string
  >
>;

/** Erro do servidor que a tela sabe explicar melhor do que um toast genérico. */
type ServerProblem =
  | { kind: "conflict"; message: string }
  | { kind: "outside"; message: string }
  | { kind: "other"; message: string };

export function NewAppointmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const toast = useToast();
  const invalidate = useInvalidateAppointmentViews();
  const professionalRef = useRef<HTMLDivElement>(null);

  const prefillPatientId = params.get("patientId") ?? "";
  const prefillDate = params.get("date") ?? "";

  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [professionalId, setProfessionalId] = useState(
    params.get("professionalId") ?? "",
  );
  const [date, setDate] = useState(
    isDate(prefillDate) && !isPastDate(prefillDate) ? prefillDate : todayISO(),
  );
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("30");
  const [durationTouched, setDurationTouched] = useState(false);
  // `?tipo=RETORNO` vem do funil de pendências ("Agendar retorno").
  const prefillType = params.get("tipo") as AppointmentType | null;
  const [type, setType] = useState<AppointmentType>(
    prefillType && APPOINTMENT_TYPE.includes(prefillType)
      ? prefillType
      : "CONSULTA",
  );
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverFields, setServerFields] = useState<Errors>({});
  const [problem, setProblem] = useState<ServerProblem | null>(null);
  const [focusInvalid, setFocusInvalid] = useState(0);

  // Envio barrado: o foco vai ao primeiro campo com problema, para o aviso não
  // ficar fora da tela (e o leitor de tela ler o erro junto do campo).
  useEffect(() => {
    if (!focusInvalid) return;
    document
      .querySelector<HTMLElement>("#nova-consulta [aria-invalid='true']")
      ?.focus();
  }, [focusInvalid]);

  const back = backTargetFrom(
    location,
    prefillPatientId
      ? { to: `/pacientes/${prefillPatientId}`, label: "Ficha do paciente" }
      : undefined,
  );

  // `?patientId=` vem da ficha do paciente: o formulário já abre com ele.
  const prefill = useQuery({
    queryKey: qk.patients.detail(prefillPatientId),
    queryFn: () => patientsApi.detail(prefillPatientId),
    enabled: Boolean(prefillPatientId),
  });
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !prefill.data) return;
    prefilled.current = true;
    setPatient(
      (current) =>
        current ?? {
          id: prefill.data.id,
          name: prefill.data.name,
          phone: prefill.data.phone,
        },
    );
  }, [prefill.data]);

  const professionals = useQuery({
    queryKey: qk.professionals.list({ limit: 100 }),
    queryFn: () => professionalsApi.list({ limit: 100 }),
  });
  const active = useMemo(
    () =>
      (professionals.data?.data ?? [])
        .filter((item) => item.isActive)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [professionals.data],
  );
  const professional = active.find((item) => item.id === professionalId);
  const unknownProfessional =
    Boolean(professionalId) && professionals.isSuccess && !professional;

  // Duração segue o profissional até a pessoa mexer nela.
  useEffect(() => {
    if (professional && !durationTouched) {
      setDuration(String(professional.defaultDurationMinutes));
    }
  }, [professional, durationTouched]);

  const durationMinutes = Number(duration);
  const formErrors = validate();
  const formValid = Object.keys(formErrors).length === 0;

  const availabilityInput: CheckAvailabilityInput | null =
    professional &&
    isDate(date) &&
    !isPastDate(date) &&
    isTime(time) &&
    isDuration(durationMinutes)
      ? { professionalId: professional.id, date, time, durationMinutes }
      : null;
  const availability = useAvailabilityCheck(availabilityInput);

  function validate(): Errors {
    const next: Errors = {};
    if (!patient)
      next.patientId = "Escolha o paciente. Busque pelo nome, CPF ou telefone.";
    if (!professionalId || unknownProfessional)
      next.professionalId = "Escolha o profissional.";
    const dateProblem = dateError(date);
    if (dateProblem) next.date = dateProblem;
    if (!time)
      next.time = "Escolha um horário livre na grade ou digite o horário.";
    else if (!isTime(time))
      next.time = "Horário inválido. Use o formato 09:30.";
    const durationProblem = durationError(durationMinutes);
    if (durationProblem) next.durationMinutes = durationProblem;
    if (room.length > 40) next.room = "A sala aceita até 40 letras.";
    if (notes.length > 1000)
      next.notes = "As observações aceitam até 1000 letras.";
    return next;
  }

  const create = useMutation({
    mutationFn: (allowOverbooking: boolean) =>
      appointmentsApi.create({
        patientId: patient?.id ?? "",
        professionalId,
        date,
        time,
        durationMinutes,
        type,
        room: room.trim() || undefined,
        notes: notes.trim() || undefined,
        allowOverbooking: allowOverbooking || undefined,
      }),
    onSuccess: (created) => {
      invalidate();
      toast.push({
        tone: "success",
        title: "Consulta agendada",
        description: `${created.patientName} — ${formatDayLong(date)} às ${created.time}`,
      });
      // `replace`: voltar da consulta não reabre o formulário já usado.
      navigate(`/consultas/${created.id}`, {
        replace: true,
        state: { from: back.to },
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.isOverbooking) {
          setProblem({ kind: "conflict", message: error.message });
          return;
        }
        if (error.code === "PROFESSIONAL_OUTSIDE_SCHEDULE") {
          setProblem({ kind: "outside", message: error.message });
          return;
        }
        const fields = error.fieldErrors();
        if (Object.keys(fields).length) setServerFields(fields as Errors);
      }
      setProblem({
        kind: "other",
        message: errorMessage(
          error,
          "Sem conexão com o servidor. Nada foi agendado.",
        ),
      });
    },
  });

  function submit(allowOverbooking: boolean) {
    const found = validate();
    setErrors(found);
    setServerFields({});
    setProblem(null);
    if (Object.keys(found).length) {
      setFocusInvalid((n) => n + 1);
      return;
    }
    create.mutate(allowOverbooking);
  }

  function cancel() {
    // Sem histórico (link aberto direto), `navigate(-1)` sairia do sistema.
    if (location.key === "default") navigate(back.to);
    else navigate(-1);
  }

  // Erro some quando o campo é corrigido — sem esperar o próximo envio.
  const shown = (field: keyof Errors) =>
    (errors[field] ? formErrors[field] : undefined) ?? serverFields[field];
  const clearProblem = () => problem && setProblem(null);

  const overbookButton = formValid ? (
    <Button
      variant="secondary"
      size="sm"
      loading={create.isPending && create.variables === true}
      disabled={create.isPending}
      onClick={() => submit(true)}
    >
      Encaixar mesmo assim
    </Button>
  ) : (
    <p className="text-label text-ink-secondary">
      Complete o formulário para poder encaixar.
    </p>
  );

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Nova consulta"
        back={back}
        description="Os horários ocupados e os conflitos aparecem antes de salvar."
      />

      <form
        id="nova-consulta"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
        className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <div className="flex min-w-0 flex-col gap-5">
          <Panel aria-labelledby="nova-paciente">
            <PanelHeader id="nova-paciente" title="Paciente" />
            <PanelBody>
              {prefill.isPending && prefillPatientId && !patient ? (
                <div className="skeleton h-14 rounded-control" />
              ) : (
                <div className="flex flex-col gap-3">
                  {prefill.isError && !patient ? (
                    <InlineError
                      error={prefill.error}
                      label="O paciente do link não foi encontrado. Busque abaixo."
                    />
                  ) : null}
                  <PatientPicker
                    value={patient}
                    onChange={(next) => {
                      setPatient(next);
                      clearProblem();
                    }}
                    error={shown("patientId")}
                    onPicked={() =>
                      requestAnimationFrame(() =>
                        professionalRef.current
                          ?.querySelector("select")
                          ?.focus(),
                      )
                    }
                  />
                </div>
              )}
            </PanelBody>
          </Panel>

          <Panel aria-labelledby="nova-horario">
            <PanelHeader id="nova-horario" title="Profissional e horário" />
            <PanelBody className="flex flex-col gap-4">
              <div ref={professionalRef} className="flex flex-col gap-2">
                <SelectField
                  label="Profissional"
                  required
                  value={professional ? professionalId : ""}
                  disabled={professionals.isPending}
                  error={shown("professionalId")}
                  hint={
                    unknownProfessional
                      ? "O profissional do link está inativo ou não existe. Escolha outro."
                      : undefined
                  }
                  onChange={(event) => {
                    setProfessionalId(event.target.value);
                    setTime("");
                    clearProblem();
                  }}
                >
                  <option value="">
                    {professionals.isPending
                      ? "Carregando profissionais…"
                      : "Selecione"}
                  </option>
                  {active.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {item.specialty}
                    </option>
                  ))}
                </SelectField>
                {professionals.isError ? (
                  <InlineError
                    error={professionals.error}
                    onRetry={() => void professionals.refetch()}
                    label="A lista de profissionais não carregou."
                  />
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <Field
                  label="Data"
                  type="date"
                  required
                  min={todayISO()}
                  value={date}
                  error={
                    shown("date") ??
                    (isPastDate(date) ? dateError(date) : undefined)
                  }
                  hint={isDate(date) ? formatDayLong(date) : undefined}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setTime("");
                    clearProblem();
                  }}
                />
                <Field
                  label="Duração"
                  type="number"
                  inputMode="numeric"
                  required
                  min={5}
                  max={480}
                  step={5}
                  suffix="min"
                  value={duration}
                  error={
                    shown("durationMinutes") ??
                    (duration !== "" && !isDuration(durationMinutes)
                      ? durationError(durationMinutes)
                      : undefined)
                  }
                  onChange={(event) => {
                    setDuration(event.target.value);
                    setDurationTouched(true);
                    clearProblem();
                  }}
                />
              </div>

              <TimePicker
                professionalId={professional?.id ?? ""}
                professionalName={professional?.name}
                date={date}
                durationMinutes={durationMinutes}
                value={time}
                onChange={(next) => {
                  setTime(next);
                  clearProblem();
                }}
                error={shown("time")}
              />
            </PanelBody>
          </Panel>

          <Panel aria-labelledby="nova-detalhes">
            <PanelHeader id="nova-detalhes" title="Detalhes" />
            <PanelBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Tipo de consulta"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as AppointmentType)
                }
              >
                {APPOINTMENT_TYPE.map((value) => (
                  <option key={value} value={value}>
                    {APPOINTMENT_TYPE_LABEL[value]}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Sala (opcional)"
                placeholder="Consultório 2"
                maxLength={40}
                value={room}
                error={shown("room")}
                onChange={(event) => setRoom(event.target.value)}
              />
              <TextareaField
                label="Observações (opcional)"
                containerClassName="sm:col-span-2"
                maxLength={1000}
                value={notes}
                error={shown("notes")}
                hint="Aparece para a recepção e para o consultório."
                onChange={(event) => setNotes(event.target.value)}
              />
            </PanelBody>
          </Panel>
        </div>

        <aside
          aria-label="Resumo do agendamento"
          className="flex flex-col gap-4 lg:sticky lg:top-6"
        >
          <Panel>
            <PanelBody className="flex flex-col gap-4">
              <Summary
                patient={patient?.name}
                professional={professional?.name}
                date={isDate(date) ? formatDayLong(date) : undefined}
                time={isTime(time) ? time : undefined}
                duration={
                  isDuration(durationMinutes)
                    ? `${durationMinutes} min`
                    : undefined
                }
                type={APPOINTMENT_TYPE_LABEL[type]}
              />

              {problem ? (
                <Callout
                  live
                  tone={problem.kind === "other" ? "danger" : "warning"}
                  title={
                    problem.kind === "conflict"
                      ? "O horário foi ocupado agora há pouco"
                      : problem.kind === "outside"
                        ? "Fora da grade de atendimento"
                        : "A consulta não foi agendada"
                  }
                  action={
                    problem.kind === "conflict" ? overbookButton : undefined
                  }
                >
                  {problem.message}
                  {problem.kind === "outside"
                    ? " Escolha um horário da grade."
                    : null}
                </Callout>
              ) : (
                <AvailabilityNotice
                  check={availability}
                  overbookAction={overbookButton}
                  outsideScheduleBlocks
                />
              )}

              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  size="lg"
                  block
                  loading={create.isPending && create.variables === false}
                  disabled={create.isPending}
                >
                  Agendar consulta
                </Button>
                <Button type="button" variant="ghost" block onClick={cancel}>
                  Cancelar
                </Button>
              </div>
            </PanelBody>
          </Panel>
        </aside>
      </form>
    </div>
  );
}

/** O que vai ser gravado, numa leitura. Falta algo? A linha diz o quê. */
function Summary({
  patient,
  professional,
  date,
  time,
  duration,
  type,
}: {
  patient?: string;
  professional?: string;
  date?: string;
  time?: string;
  duration?: string;
  type: string;
}) {
  const rows = [
    { label: "Paciente", value: patient, missing: "Escolha o paciente" },
    {
      label: "Profissional",
      value: professional,
      missing: "Escolha o profissional",
    },
    { label: "Data", value: date, missing: "Escolha a data" },
    { label: "Horário", value: time, missing: "Escolha o horário", mono: true },
    {
      label: "Duração",
      value: duration,
      missing: "Defina a duração",
      mono: true,
    },
    { label: "Tipo", value: type, missing: "" },
  ];
  return (
    <div>
      <h2 className="text-card font-semibold text-ink-primary">Resumo</h2>
      <dl className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2"
          >
            <dt className="text-label text-ink-secondary">{row.label}</dt>
            <dd
              className={
                row.value
                  ? `min-w-0 break-words text-body font-semibold text-ink-primary ${row.mono ? "font-mono" : ""}`
                  : "text-body text-ink-tertiary"
              }
            >
              {row.value ?? row.missing}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
