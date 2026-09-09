import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { Metric, Panel, PanelHeader } from "@/components/ui/surface";
import { patientsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import {
  APPOINTMENT_TYPE_LABEL,
  DOCUMENT_TYPE_LABEL,
  formatDate,
  formatDateTime,
} from "../appointments/labels";

type Tab = "consultas" | "documentos" | "pendencias";

export function PatientDetailPage() {
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("consultas");

  const patient = useQuery({
    queryKey: qk.patients.detail(id),
    queryFn: () => patientsApi.detail(id),
    enabled: Boolean(id),
  });

  const summary = useQuery({
    queryKey: qk.patients.summary(id),
    queryFn: () => patientsApi.summary(id),
    enabled: Boolean(id),
  });

  if (patient.isError) {
    return (
      <ErrorState
        error={patient.error}
        onRetry={() => void patient.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Link
        to="/pacientes"
        className="inline-flex w-fit items-center gap-1.5 text-micro font-semibold text-ink-secondary hover:text-accent"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Pacientes
      </Link>

      <header>
        {patient.isPending ? (
          <div className="skeleton h-8 w-64" />
        ) : (
          <>
            <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
              {patient.data.name}
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-body text-ink-secondary">
              {patient.data.age !== null ? (
                <span>{patient.data.age} anos</span>
              ) : null}
              <span className="font-mono">{patient.data.phone}</span>
              {patient.data.cpf ? (
                <span className="font-mono">{patient.data.cpf}</span>
              ) : null}
              {patient.data.email ? <span>{patient.data.email}</span> : null}
            </div>
          </>
        )}
      </header>

      {patient.data?.notes ? (
        <Panel className="border-warning/30 bg-warning-weak p-4">
          <p className="text-micro font-semibold text-warning">
            Observações clínicas
          </p>
          <p className="mt-1 text-body text-ink-primary">
            {patient.data.notes}
          </p>
        </Panel>
      ) : null}

      <section
        aria-label="Resumo do paciente"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <Metric
          label="Consultas"
          value={summary.data?.appointmentsCount ?? "—"}
        />
        <Metric
          label="Canceladas"
          value={summary.data?.cancelledCount ?? "—"}
        />
        <Metric
          label="Documentos"
          value={summary.data?.documentsCount ?? "—"}
        />
        <Metric
          label="Pendências"
          value={summary.data?.openTasksCount ?? "—"}
          tone={(summary.data?.openTasksCount ?? 0) > 0 ? "warning" : "default"}
        />
      </section>

      <Panel>
        <PanelHeader
          title="Histórico"
          actions={
            <div
              role="tablist"
              className="flex gap-1 rounded-control bg-surface-sunken p-0.5"
            >
              {(
                [
                  ["consultas", "Consultas"],
                  ["documentos", "Documentos"],
                  ["pendencias", "Pendências"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`h-8 rounded-marker px-2.5 text-micro font-semibold transition-colors ${
                    tab === value
                      ? "bg-surface-base text-ink-primary shadow-raised"
                      : "text-ink-secondary hover:text-ink-primary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        {tab === "consultas" ? <AppointmentsTab patientId={id} /> : null}
        {tab === "documentos" ? <DocumentsTab patientId={id} /> : null}
        {tab === "pendencias" ? <TasksTab patientId={id} /> : null}
      </Panel>
    </div>
  );
}

function AppointmentsTab({ patientId }: { patientId: string }) {
  const query = useQuery({
    queryKey: qk.patients.appointments(patientId),
    queryFn: () => patientsApi.appointments(patientId),
  });

  if (query.isPending) return <RowsSkeleton rows={5} height={52} />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  if (query.data.data.length === 0) {
    return (
      <EmptyState
        title="Sem consultas registradas"
        description="Quando este paciente for atendido, o histórico aparece aqui com quem atendeu e quando."
      />
    );
  }

  return (
    <ul className="divide-y divide-border-subtle">
      {query.data.data.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
        >
          <span className="font-mono text-body text-ink-primary">
            {formatDateTime(item.startsAt)}
          </span>
          <span className="min-w-0 flex-1 truncate text-body text-ink-secondary">
            {APPOINTMENT_TYPE_LABEL[item.type]} com {item.professionalName}
          </span>
          <StatusBadge state={item.derivedState} />
          <Link
            to={`/consultas/${item.id}`}
            className="text-micro font-semibold text-accent hover:underline"
          >
            Ver detalhes
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DocumentsTab({ patientId }: { patientId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [...qk.patients.documents(patientId), page],
    queryFn: () => patientsApi.documents(patientId, { page, limit: 10 }),
  });

  if (query.isPending) return <RowsSkeleton rows={4} height={52} />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  if (query.data.data.length === 0) {
    return (
      <EmptyState
        title="Nenhum documento anexado"
        description="Exames, atestados e encaminhamentos recebidos por WhatsApp entram aqui catalogados."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-border-subtle">
        {query.data.data.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
          >
            <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink-primary">
              {doc.fileName}
            </span>
            <span className="text-micro text-ink-secondary">
              {DOCUMENT_TYPE_LABEL[doc.type]}
            </span>
            <span className="font-mono text-micro text-ink-tertiary">
              {doc.sizeLabel}
            </span>
            <span className="font-mono text-micro text-ink-tertiary">
              {formatDate(doc.createdAt)}
            </span>
          </li>
        ))}
      </ul>
      <Pagination meta={query.data.meta} unit="documentos" onChange={setPage} />
    </>
  );
}

function TasksTab({ patientId }: { patientId: string }) {
  const query = useQuery({
    queryKey: qk.patients.tasks(patientId),
    queryFn: () => patientsApi.tasks(patientId, { limit: 20 }),
  });

  if (query.isPending) return <RowsSkeleton rows={3} height={52} />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  if (query.data.data.length === 0) {
    return (
      <EmptyState
        title="Nada pendente"
        description="Retornos a agendar, confirmações e documentos em falta apareceriam aqui."
      />
    );
  }

  return (
    <ul className="divide-y divide-border-subtle">
      {query.data.data.map((task) => (
        <li
          key={task.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
        >
          <span className="min-w-0 flex-1 text-body text-ink-primary">
            {task.title}
          </span>
          <span
            className={
              task.isUrgent
                ? "text-micro font-semibold text-state-atrasada"
                : "text-micro text-ink-secondary"
            }
          >
            {task.dueLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}
