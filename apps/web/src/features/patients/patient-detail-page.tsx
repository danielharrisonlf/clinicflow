import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FileUp,
  MessageCircle,
  Pencil,
  Phone,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page";
import { clampPage, Pagination } from "@/components/ui/pagination";
import { TabPanel, Tabs } from "@/components/ui/segmented";
import {
  EmptyState,
  ErrorState,
  InlineError,
  RowsSkeleton,
  TextSkeleton,
} from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { DescriptionList, Panel, PanelHeader } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { ApiError, errorMessage } from "@/lib/api/client";
import { patientsApi, tasksApi } from "@/lib/api/endpoints";
import type { PatientDetail, PatientSummary, TaskItem } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, phoneDigits, whatsappUrl } from "@/lib/utils";
import { currentPath } from "../appointments/back-target";
import {
  APPOINTMENT_TYPE_LABEL,
  formatDate,
  formatRelative,
  TASK_TYPE_LABEL,
} from "../appointments/labels";
import { DocumentPreview } from "../documents/document-preview";
import { DocumentRow } from "../documents/document-row";
import { DocumentUpload } from "../documents/document-upload";
import { ageLabel, formatCpf } from "./patient-format";

type Tab = "consultas" | "documentos" | "pendencias";
const TABS: Tab[] = ["consultas", "documentos", "pendencias"];
const TAB_ID = "ficha";

export function PatientDetailPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("aba") as Tab | null;
  const tab: Tab = rawTab && TABS.includes(rawTab) ? rawTab : "consultas";

  const patient = useQuery({
    queryKey: qk.patients.detail(id),
    queryFn: () => patientsApi.detail(id),
    enabled: Boolean(id),
  });
  const summary = useQuery({
    queryKey: qk.patients.summary(id),
    queryFn: () => patientsApi.summary(id),
    enabled: Boolean(id) && !patient.isError,
  });

  function setTab(next: Tab) {
    const search = new URLSearchParams(params);
    if (next === "consultas") search.delete("aba");
    else search.set("aba", next);
    setParams(search, { replace: true });
  }

  if (patient.isError && !patient.data) {
    const notFound =
      patient.error instanceof ApiError && patient.error.statusCode === 404;
    return (
      <>
        <PageHeader
          title={notFound ? "Paciente não encontrado" : "Ficha do paciente"}
          back={{ to: "/pacientes", label: "Pacientes" }}
        />
        <Panel>
          {notFound ? (
            <EmptyState
              icon={UserX}
              title="Esta ficha não existe mais"
              description="O cadastro pode ter sido removido pela gestão ou o link está incompleto. Busque pelo nome, CPF ou telefone."
              action={<ButtonLink to="/pacientes">Buscar paciente</ButtonLink>}
            />
          ) : (
            <ErrorState
              error={patient.error}
              onRetry={() => void patient.refetch()}
            />
          )}
        </Panel>
      </>
    );
  }

  const p = patient.data;
  const s = summary.data;

  return (
    <>
      <PageHeader
        title={
          p ? (
            p.name
          ) : (
            <span className="skeleton inline-block h-8 w-64 max-w-full align-middle">
              <span className="sr-only">Carregando paciente…</span>
            </span>
          )
        }
        documentTitle={p?.name ?? "Ficha do paciente"}
        back={{ to: "/pacientes", label: "Pacientes" }}
        meta={
          p ? (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-body text-ink-secondary">
              {ageLabel(p.age) ? <span>{ageLabel(p.age)}</span> : null}
              <span>Paciente desde {formatDate(p.createdAt)}</span>
            </p>
          ) : null
        }
        actions={p ? <HeaderActions patient={p} /> : null}
      />

      {p?.notes ? (
        <Callout
          tone="warning"
          title="Observações clínicas e alergias"
          className="mb-5"
        >
          <p className="whitespace-pre-line">{p.notes}</p>
        </Callout>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        <Panel
          aria-labelledby="ficha-historico"
          className="xl:col-start-1 xl:row-start-1"
        >
          <h2 id="ficha-historico" className="sr-only">
            Histórico do paciente
          </h2>
          <Tabs
            label="Histórico do paciente"
            idPrefix={TAB_ID}
            className="px-2 md:px-3"
            value={tab}
            onChange={setTab}
            items={[
              {
                value: "consultas",
                label: "Consultas",
                count: s?.appointmentsCount,
              },
              {
                value: "documentos",
                label: "Documentos",
                count: s?.documentsCount,
              },
              {
                value: "pendencias",
                label: "Pendências",
                count: s?.openTasksCount,
              },
            ]}
          />
          <TabPanel idPrefix={TAB_ID} value={tab}>
            {tab === "consultas" ? <AppointmentsTab patientId={id} /> : null}
            {tab === "documentos" ? (
              <DocumentsTab patientId={id} patientName={p?.name} />
            ) : null}
            {tab === "pendencias" ? <TasksTab patientId={id} /> : null}
          </TabPanel>
        </Panel>
        <aside
          aria-label="Cadastro e resumo"
          className="flex min-w-0 flex-col gap-5 xl:col-start-2 xl:row-start-1"
        >
          <Panel aria-labelledby="ficha-cadastro">
            <PanelHeader
              id="ficha-cadastro"
              title="Cadastro"
              actions={
                <ButtonLink
                  to={`/pacientes/${id}/editar`}
                  variant="ghost"
                  size="sm"
                >
                  <Pencil aria-hidden="true" />
                  Editar
                </ButtonLink>
              }
            />
            <div className="px-4 py-4 md:px-5">
              {p ? <ContactList patient={p} /> : <TextSkeleton lines={4} />}
            </div>
          </Panel>
          <SummaryBlock
            summary={s}
            error={summary.isError ? summary.error : null}
            onRetry={() => void summary.refetch()}
          />
        </aside>
      </div>
    </>
  );
}

function HeaderActions({ patient }: { patient: PatientDetail }) {
  return (
    <>
      <ButtonLink
        to={`/consultas/nova?patientId=${patient.id}`}
        className="max-sm:w-full"
      >
        <CalendarPlus aria-hidden="true" />
        Agendar consulta
      </ButtonLink>
      <ButtonAnchor
        href={`tel:${phoneDigits(patient.phone)}`}
        variant="secondary"
        className="max-sm:flex-1"
        aria-label={`Ligar para ${patient.phone}`}
      >
        <Phone aria-hidden="true" />
        Ligar
      </ButtonAnchor>
      <ButtonAnchor
        href={whatsappUrl(patient.phone)}
        target="_blank"
        rel="noopener noreferrer"
        variant="secondary"
        className="max-sm:flex-1"
        aria-label={`WhatsApp de ${patient.name} (abre em nova aba)`}
      >
        <MessageCircle aria-hidden="true" />
        WhatsApp
      </ButtonAnchor>
      <ButtonLink
        to={`/pacientes/${patient.id}/editar`}
        variant="secondary"
        className="max-xl:hidden"
      >
        <Pencil aria-hidden="true" />
        Editar cadastro
      </ButtonLink>
    </>
  );
}

function ContactList({ patient }: { patient: PatientDetail }) {
  const missing = <span className="text-ink-tertiary">Não informado</span>;
  return (
    <DescriptionList
      columns={1}
      className="sm:grid-cols-2 xl:grid-cols-1"
      items={[
        {
          label: "Telefone / WhatsApp",
          value: (
            <a
              href={`tel:${phoneDigits(patient.phone)}`}
              className="font-mono text-ink-primary underline-offset-4 hover:underline"
            >
              {patient.phone}
            </a>
          ),
        },
        {
          label: "E-mail",
          value: patient.email ? (
            <a
              href={`mailto:${patient.email}`}
              className="text-ink-primary underline-offset-4 hover:underline"
            >
              {patient.email}
            </a>
          ) : (
            missing
          ),
        },
        {
          label: "CPF",
          value: patient.cpf ? (
            <span className="font-mono">{formatCpf(patient.cpf)}</span>
          ) : (
            missing
          ),
        },
        {
          label: "Data de nascimento",
          value: patient.birthDate ? (
            <span className="font-mono">{formatDate(patient.birthDate)}</span>
          ) : (
            missing
          ),
        },
      ]}
    />
  );
}

/** Contagens de apoio, compactas: o histórico detalhado está nas abas. */
function SummaryBlock({
  summary,
  error,
  onRetry,
}: {
  summary?: PatientSummary;
  error: unknown;
  onRetry: () => void;
}) {
  const items = [
    { label: "Consultas", value: summary?.appointmentsCount, tone: "" },
    { label: "Canceladas", value: summary?.cancelledCount, tone: "" },
    { label: "Documentos", value: summary?.documentsCount, tone: "" },
    {
      label: "Pendências",
      value: summary?.openTasksCount,
      tone: summary && summary.openTasksCount > 0 ? "text-warning" : "",
    },
  ];
  return (
    <Panel aria-labelledby="ficha-resumo">
      <PanelHeader id="ficha-resumo" title="Resumo" />
      <div className="px-4 py-3 md:px-5">
        {error ? (
          <InlineError
            error={error}
            onRetry={onRetry}
            label="O resumo não carregou."
          />
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 xl:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start xl:flex-row xl:items-baseline"
              >
                <dt className="text-label text-ink-secondary">{item.label}</dt>
                <dd
                  className={cn(
                    "font-mono text-card font-semibold text-ink-primary",
                    item.tone,
                  )}
                >
                  {item.value ?? (
                    <span className="skeleton inline-block h-4 w-6 align-middle" />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Panel>
  );
}

/** Histórico completo por cursor: 20 de cada vez, do mais recente para trás. */
function AppointmentsTab({ patientId }: { patientId: string }) {
  const location = useLocation();
  const query = useInfiniteQuery({
    queryKey: qk.patients.appointments(patientId),
    queryFn: ({ pageParam }) => patientsApi.appointments(patientId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.meta.hasNextPage ? (last.meta.nextCursor ?? undefined) : undefined,
  });

  if (query.isPending) return <RowsSkeleton rows={5} />;
  // Com dados na tela, erro é da página seguinte: mostra embaixo, não troca a lista.
  if (!query.data)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );

  const items = query.data.pages.flatMap((page) => page.data);
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nenhuma consulta ainda"
        description="Agende a primeira pelo botão no topo da ficha. Cada atendimento fica registrado aqui, com quem atendeu e quando."
        action={
          <ButtonLink to={`/consultas/nova?patientId=${patientId}`}>
            <CalendarPlus aria-hidden="true" />
            Agendar consulta
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-border-subtle">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={`/consultas/${item.id}`}
              state={{
                from: currentPath(location),
                backgroundLocation: location,
              }}
              aria-label={`Consulta de ${formatDate(item.startsAt)} às ${item.time}, ${item.stateLabel}`}
              className="group grid grid-cols-[7rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-app md:grid-cols-[7.5rem_minmax(0,1fr)_10rem_1rem] md:px-5"
            >
              <span className="font-mono">
                <span className="block text-body font-semibold whitespace-nowrap text-ink-primary">
                  {formatDate(item.startsAt)}
                </span>
                <span className="block text-label text-ink-secondary">
                  {item.time}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body text-ink-primary">
                  {APPOINTMENT_TYPE_LABEL[item.type]}
                </span>
                <span className="block truncate text-label text-ink-secondary">
                  {item.professionalName}
                </span>
              </span>
              <span className="max-md:col-start-2 max-md:row-start-2 max-md:justify-self-start">
                <StatusBadge
                  state={item.derivedState}
                  label={item.stateLabel}
                />
              </span>
              <ChevronRight
                className="size-4 text-ink-tertiary transition-colors group-hover:text-ink-primary max-md:col-start-3 max-md:row-span-2 max-md:row-start-1"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <div className="flex justify-center border-t border-border-subtle px-4 py-3">
          <Button
            variant="secondary"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
            className="max-sm:w-full"
          >
            Carregar consultas anteriores
          </Button>
        </div>
      ) : null}
      {query.isFetchNextPageError ? (
        <div className="px-4 pb-3">
          <InlineError
            error={query.error}
            onRetry={() => void query.fetchNextPage()}
            label="As consultas anteriores não carregaram."
          />
        </div>
      ) : null}
    </>
  );
}

const SUB_PAGE = 10;

function DocumentsTab({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName?: string;
}) {
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<
    import("@/lib/api/types").DocumentItem | null
  >(null);
  const query = useQuery({
    queryKey: qk.patients.documents(patientId, page),
    queryFn: () => patientsApi.documents(patientId, { page, limit: SUB_PAGE }),
    placeholderData: keepPreviousData,
  });

  const meta = query.data?.meta;
  useEffect(() => {
    if (meta && !query.isPlaceholderData)
      setPage((current) => clampPage(current, meta));
  }, [meta, query.isPlaceholderData]);

  const uploadButton = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        setPreview(null);
        setUploading(true);
      }}
      disabled={!patientName}
    >
      <FileUp aria-hidden="true" />
      Enviar documento
    </Button>
  );

  return (
    <>
      {query.isPending ? (
        <RowsSkeleton rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento na ficha"
          description="Exames, atestados e encaminhamentos que o paciente trouxer entram aqui. PDF ou foto, até 10 MB."
          action={
            <Button
              onClick={() => {
                setPreview(null);
                setUploading(true);
              }}
              disabled={!patientName}
            >
              <FileUp aria-hidden="true" />
              Enviar documento
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-2.5 md:px-5">
            <p className="text-label text-ink-secondary">
              Mais recentes primeiro
            </p>
            {uploadButton}
          </div>
          <ul className="divide-y divide-border-subtle">
            {query.data.data.map((doc) => (
              <li key={doc.id}>
                <DocumentRow
                  doc={doc}
                  showPatient={false}
                  opening={false}
                  onOpen={() => {
                    setUploading(false);
                    setPreview(doc);
                  }}
                />
              </li>
            ))}
          </ul>
          <Pagination
            meta={query.data.meta}
            unit="documentos"
            fetching={query.isFetching && query.isPlaceholderData}
            onChange={setPage}
          />
        </>
      )}
      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
      <DocumentUpload
        open={uploading}
        onClose={() => setUploading(false)}
        patient={patientName ? { id: patientId, name: patientName } : undefined}
        onUploaded={() => setPage(1)}
      />
    </>
  );
}

function TasksTab({ patientId }: { patientId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: qk.patients.tasks(patientId, page),
    queryFn: () => patientsApi.tasks(patientId, { page, limit: SUB_PAGE }),
    placeholderData: keepPreviousData,
  });

  const meta = query.data?.meta;
  useEffect(() => {
    if (meta && !query.isPlaceholderData)
      setPage((current) => clampPage(current, meta));
  }, [meta, query.isPlaceholderData]);

  if (query.isPending) return <RowsSkeleton rows={3} />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  if (query.data.data.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Nada pendente para este paciente"
        description="Retornos a agendar, confirmações e documentos em falta aparecem aqui quando surgirem."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-border-subtle">
        {query.data.data.map((task) => (
          <li key={task.id}>
            <TaskRow task={task} />
          </li>
        ))}
      </ul>
      <Pagination
        meta={query.data.meta}
        unit="pendências"
        fetching={query.isFetching && query.isPlaceholderData}
        onChange={setPage}
      />
    </>
  );
}

function TaskRow({ task }: { task: TaskItem }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: qk.tasks.all });
    void queryClient.invalidateQueries({ queryKey: qk.patients.all });
  }

  const contact = useMutation({
    mutationFn: () => tasksApi.contact(task.id),
    onSuccess: () => {
      invalidate();
      toast.push({
        tone: "success",
        title: "Contato registrado",
        description: `${task.title} — agora em andamento.`,
      });
    },
    onError: (error) =>
      toast.push({
        tone: "error",
        title: "O contato não foi registrado",
        description: errorMessage(error),
      }),
  });
  const resolve = useMutation({
    mutationFn: () => tasksApi.resolve(task.id),
    onSuccess: () => {
      invalidate();
      toast.push({
        tone: "success",
        title: "Pendência resolvida",
        description: task.title,
      });
    },
    onError: (error) =>
      toast.push({
        tone: "error",
        title: "A pendência não foi resolvida",
        description: errorMessage(error),
      }),
  });
  const busy = contact.isPending || resolve.isPending;

  return (
    <article
      aria-label={task.title}
      className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-4 md:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-body font-semibold text-ink-primary">
            {task.title}
          </p>
          <Badge tone={task.isUrgent ? "danger" : "neutral"}>
            {task.dueLabel}
          </Badge>
        </div>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-label text-ink-secondary">
          <span>{TASK_TYPE_LABEL[task.type] ?? task.type}</span>
          <span>Sugestão: {task.suggestedAction}</span>
          {task.status === "EM_ANDAMENTO" ? (
            <span className="text-info">
              Em andamento
              {task.lastContactAt
                ? `, último contato ${formatRelative(task.lastContactAt)}`
                : ""}
            </span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="secondary"
          size="sm"
          loading={contact.isPending}
          disabled={busy}
          onClick={() => contact.mutate()}
          className="max-md:h-11 max-md:flex-1"
        >
          <Phone aria-hidden="true" />
          Registrar contato
        </Button>
        <Button
          size="sm"
          loading={resolve.isPending}
          disabled={busy}
          onClick={() => resolve.mutate()}
          className="max-md:h-11 max-md:flex-1"
        >
          <ClipboardCheck aria-hidden="true" />
          Resolver
        </Button>
      </div>
    </article>
  );
}
