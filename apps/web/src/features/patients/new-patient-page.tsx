import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserX } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState, TextSkeleton } from "@/components/ui/states";
import { Panel, PanelBody } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { patientsApi } from "@/lib/api/endpoints";
import type { PatientDetail } from "@/lib/api/types";
import { qk } from "@/lib/query";
import {
  PatientForm,
  type PatientFormValues,
  toCreateInput,
  toUpdateInput,
  valuesFrom,
} from "./patient-form";

/** Cadastro ágil: a pessoa está no balcão com o paciente esperando. */
export function NewPatientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const create = useMutation({
    mutationFn: (values: PatientFormValues) =>
      patientsApi.create(toCreateInput(values)),
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

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Novo paciente"
        description="Nome e telefone bastam para agendar. O resto pode ser completado depois."
        back={{ to: "/pacientes", label: "Pacientes" }}
      />
      <Panel>
        <PanelBody className="md:py-5">
          <PatientForm
            mode="create"
            submitting={create.isPending}
            error={create.error}
            onSubmit={(values) => create.mutate(values)}
            // Rota direta (link colado, nova aba) não tem "voltar": vai pra lista.
            onCancel={() => navigate("/pacientes")}
          />
        </PanelBody>
      </Panel>
    </div>
  );
}

/** Edição do cadastro (`/pacientes/:id/editar`). Mesmo formulário do cadastro. */
export function EditPatientPage() {
  const { id = "" } = useParams();
  const patient = useQuery({
    queryKey: qk.patients.detail(id),
    queryFn: () => patientsApi.detail(id),
    enabled: Boolean(id),
  });

  const back = {
    to: id ? `/pacientes/${id}` : "/pacientes",
    label: patient.data?.name ?? "Ficha do paciente",
  };

  if (patient.isError && !patient.data) {
    const notFound =
      patient.error instanceof ApiError && patient.error.statusCode === 404;
    return (
      <div className="max-w-3xl">
        <PageHeader
          title="Editar cadastro"
          back={{ to: "/pacientes", label: "Pacientes" }}
        />
        <Panel>
          {notFound ? (
            <EmptyState
              icon={UserX}
              title="Paciente não encontrado"
              description="O cadastro pode ter sido removido pela gestão. Busque pelo nome, CPF ou telefone."
              action={
                <ButtonLink to="/pacientes">Voltar para Pacientes</ButtonLink>
              }
            />
          ) : (
            <ErrorState
              error={patient.error}
              onRetry={() => void patient.refetch()}
            />
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Editar cadastro"
        documentTitle={
          patient.data ? `Editar ${patient.data.name}` : "Editar cadastro"
        }
        description={patient.data?.name}
        back={back}
      />
      <Panel>
        <PanelBody className="md:py-5">
          {patient.isPending ? (
            <TextSkeleton lines={6} />
          ) : (
            // `key` remonta o formulário se o cadastro mudar por baixo (refetch).
            <EditForm key={patient.data.id} patient={patient.data} />
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}

function EditForm({ patient }: { patient: PatientDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const initial = valuesFrom(patient);
  const detailPath = `/pacientes/${patient.id}`;

  const update = useMutation({
    mutationFn: (values: PatientFormValues) =>
      patientsApi.update(patient.id, toUpdateInput(values, initial)),
    onSuccess: (saved) => {
      queryClient.setQueryData(qk.patients.detail(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: qk.patients.all });
      // Nome e telefone aparecem nas consultas, na fila e nas pendências.
      void queryClient.invalidateQueries({ queryKey: qk.appointments.all });
      void queryClient.invalidateQueries({ queryKey: qk.tasks.all });
      void queryClient.invalidateQueries({ queryKey: qk.waitingRoom.all });
      toast.push({
        tone: "success",
        title: "Cadastro atualizado",
        description: saved.name,
      });
      navigate(detailPath);
    },
  });

  return (
    <PatientForm
      mode="edit"
      initial={initial}
      submitting={update.isPending}
      error={update.error}
      onSubmit={(values) => {
        if (Object.keys(toUpdateInput(values, initial)).length === 0) {
          toast.push({
            tone: "warning",
            title: "Nada foi alterado",
            description: "O cadastro continua como estava.",
          });
          navigate(detailPath);
          return;
        }
        update.mutate(values);
      }}
      onCancel={() => navigate(detailPath)}
    />
  );
}
