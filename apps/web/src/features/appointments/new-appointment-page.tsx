import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { Panel } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import {
  appointmentsApi,
  patientsApi,
  professionalsApi,
} from "@/lib/api/endpoints";
import { APPOINTMENT_TYPE, type AppointmentType } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { APPOINTMENT_TYPE_LABEL, todayISO } from "./labels";

export function NewAppointmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [patientTerm, setPatientTerm] = useState("");
  const [patientId, setPatientId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [type, setType] = useState<AppointmentType>("CONSULTA");
  const [notes, setNotes] = useState("");

  const search = useDebounced(patientTerm);

  const patients = useQuery({
    queryKey: qk.patients.list({ search, limit: 8 }),
    queryFn: () => patientsApi.list({ search, limit: 8 }),
    enabled: search.length >= 2,
  });

  const professionals = useQuery({
    queryKey: qk.professionals.list({ limit: 100 }),
    queryFn: () => professionalsApi.list({ limit: 100 }),
  });

  // Checa o encaixe antes de submeter: o aviso aparece enquanto a pessoa ainda
  // está no formulário, não depois de um erro de servidor.
  const availability = useQuery({
    queryKey: qk.appointments.slots(professionalId, `${date}T${time}`),
    queryFn: () =>
      appointmentsApi.checkAvailability({ professionalId, date, time }),
    enabled: Boolean(professionalId && date && time),
  });

  const create = useMutation({
    mutationFn: (allowOverbooking: boolean) =>
      appointmentsApi.create({
        patientId,
        professionalId,
        date,
        time,
        type,
        notes: notes || undefined,
        allowOverbooking,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: qk.appointments.all });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
      toast.push({
        tone: "success",
        title: "Consulta agendada",
        description: `${created.patientName} — ${created.time}`,
      });
      navigate(`/consultas/${created.id}`);
    },
  });

  const conflict = availability.data && !availability.data.available;
  const outsideSchedule =
    availability.data && !availability.data.withinSchedule;
  const ready = patientId && professionalId && date && time;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 md:gap-6">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 text-micro font-semibold text-ink-secondary hover:text-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Painel do dia
      </Link>

      <header>
        <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
          Nova consulta
        </h1>
        <p className="mt-0.5 text-body text-ink-secondary">
          O conflito de horário aparece antes de você salvar.
        </p>
      </header>

      <Panel className="p-4 md:p-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate(false);
          }}
        >
          <div>
            <Field
              label="Paciente"
              placeholder="Nome, CPF ou telefone"
              type="search"
              autoComplete="off"
              value={patientTerm}
              onChange={(event) => {
                setPatientTerm(event.target.value);
                setPatientId("");
              }}
              hint={
                patientId
                  ? "Paciente selecionado."
                  : "Digite ao menos duas letras para buscar."
              }
            />
            {search.length >= 2 && !patientId ? (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-control border border-border-subtle">
                {patients.data?.data.length === 0 ? (
                  <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-body text-ink-secondary">
                    Nenhum paciente com esse dado.
                    <Link
                      to="/pacientes/novo"
                      className="shrink-0 text-micro font-semibold text-accent hover:underline"
                    >
                      Cadastrar
                    </Link>
                  </li>
                ) : (
                  patients.data?.data.map((patient) => (
                    <li key={patient.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientId(patient.id);
                          setPatientTerm(patient.name);
                        }}
                        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left hover:bg-accent-weak"
                      >
                        <span className="text-body font-semibold text-ink-primary">
                          {patient.name}
                        </span>
                        <span className="font-mono text-micro text-ink-secondary">
                          {patient.phone}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          <SelectField
            label="Profissional"
            required
            value={professionalId}
            onChange={(event) => setProfessionalId(event.target.value)}
          >
            <option value="">Selecione</option>
            {professionals.data?.data.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.name} — {professional.specialty}
              </option>
            ))}
          </SelectField>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Data"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <Field
              label="Horário"
              type="time"
              required
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>

          <SelectField
            label="Tipo de consulta"
            value={type}
            onChange={(event) => setType(event.target.value as AppointmentType)}
          >
            {APPOINTMENT_TYPE.map((value) => (
              <option key={value} value={value}>
                {APPOINTMENT_TYPE_LABEL[value]}
              </option>
            ))}
          </SelectField>

          <TextareaField
            label="Observações (opcional)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />

          {conflict || outsideSchedule ? (
            <div className="rounded-control border border-warning/30 bg-warning-weak p-3">
              <p className="text-body font-semibold text-warning">
                {availability.data?.message ??
                  (conflict
                    ? "Já existe consulta nesse horário."
                    : "Horário fora da grade do profissional.")}
              </p>
              {availability.data?.conflicts.map((item) => (
                <p key={item.id} className="mt-1 text-micro text-ink-secondary">
                  <span className="font-mono">{item.time}</span> —{" "}
                  {item.patientName}
                </p>
              ))}
            </div>
          ) : null}

          {create.isError ? (
            <p className="text-body text-state-atrasada">
              {create.error instanceof ApiError
                ? create.error.message
                : "Não foi possível agendar."}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={create.isPending} disabled={!ready}>
              Agendar consulta
            </Button>
            {conflict ? (
              <Button
                type="button"
                variant="secondary"
                loading={create.isPending}
                onClick={() => create.mutate(true)}
              >
                Encaixar mesmo assim
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
