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
  CalendarX,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FileUp,
  Mail,
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
import { PageHeader, useDocumentTitle } from "@/components/ui/page";
import { clampPage, Pagination } from "@/components/ui/pagination";
import { TabPanel, Tabs } from "@/components/ui/segmented";
import {
  EmptyState,
  ErrorState,
  InlineError,
  RowsSkeleton,
  TextSkeleton,
} from "@/components/ui/states";
import { STATE_SOLID, StatusBadge } from "@/components/ui/status-badge";
import {
  Avatar,
  DescriptionList,
  Panel,
  PanelHeader,
  StatTile,
} from "@/components/ui/surface";
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
} from "../appointments/labels";
import { DocumentPreview } from "../documents/document-preview";
import { DocumentRow } from "../documents/document-row";
import { DocumentUpload } from "../documents/document-upload";
import { TaskTypeTag } from "../tasks/task-type";
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
      <PatientHero patient={p} />

      {/* Alergia e observação clínica antes de qualquer outra coisa: quem abre a ficha não pode passar por cima. */}
      {p?.notes ? (
        <Callout
          tone="warning"
          title="Observações clínicas e alergias"
          className="mb-4 border border-warning/30 px-4 py-3.5 md:px-5"
        >
          <p className="text-card whitespace-pre-line">{p.notes}</p>
        </Callout>
      ) : null}

      <SummaryBlock
        summary={s}
        error={summary.isError ? summary.error : null}
        onRetry={() => void summary.refetch()}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
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
          aria-label="Cadastro"
          className="flex min-w-0 flex-col gap-4 xl:col-start-2 xl:row-start-1"
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
        </aside>
      </div>
    </>
  );
}

/**
 * Cabeçalho-herói da ficha: quem é, como falar com a pessoa e o próximo
 * clique (agendar). Contatos em mono, como todo número que se dita ao telefone.
 */
function PatientHero({ patient }: { patient?: PatientDetail }) {
  useDocumentTitle(patient?.name ?? "Ficha do paciente");
  const age = patient ? ageLabel(patient.age) : null;
  return (
    <header className="mb-4 flex flex-col gap-3">
      <Link
        to="/pacientes"
        className="-ml-1 inline-flex w-fit items-center gap-0.5 rounded-marker px-1 py-0.5 text-label font-semibold text-ink-secondary transition-colors hover:text-ink-primary pointer-coarse:min-h-11"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Pacientes
      </Link>
      <Panel
        as="div"
        className="flex flex-col gap-4 p-4 md:p-5 xl:flex-row xl:items-center xl:justify-between"
      >
        <div className="flex min-w-0 items-start gap-4">
          {patient ? (
            <Avatar
              name={patient.name}
              size="lg"
              className="size-14 text-section max-sm:size-12 max-sm:text-card"
            />
          ) : (
            <span className="skeleton size-14 shrink-0 rounded-full max-sm:size-12" />
          )}
          <div className="min-w-0">
            <h1 className="text-entity font-semibold tracking-tight text-balance text-ink-primary">
              {patient ? (
                patient.name
              ) : (
                <span className="skeleton inline-block h-7 w-64 max-w-full align-middle">
                  <span className="sr-only">Carregando paciente…</span>
                </span>
              )}
            </h1>
            {patient ? (
              <>
                <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-label text-ink-secondary">
                  {age ? (
                    <>
                      <span>{age}</span>
                      <span aria-hidden="true" className="text-ink-tertiary">
                        ·
                      </span>
                    </>
                  ) : null}
                  <span>
                    Paciente desde{" "}
                    <span className="font-mono tabular-nums">
                      {formatDate(patient.createdAt)}
                    </span>
                  </span>
                </p>
                <ul
                  aria-label="Contatos"
                  className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-body"
                >
                  <li className="flex min-w-0 items-center gap-1.5">
                    <Phone
                      className="size-4 shrink-0 text-ink-tertiary"
                      aria-hidden="true"
                    />
                    <a
                      href={`tel:${phoneDigits(patient.phone)}`}
                      className="inline-flex items-center rounded-marker font-mono tabular-nums text-ink-primary underline-offset-4 hover:text-accent-ink hover:underline pointer-coarse:min-h-11"
                    >
                      <span className="sr-only">Telefone: </span>
                      {patient.phone}
                    </a>
                  </li>
                  {patient.email ? (
                    <li className="flex min-w-0 items-center gap-1.5">
                      <Mail
                        className="size-4 shrink-0 text-ink-tertiary"
                        aria-hidden="true"
                      />
                      <a
                        href={`mailto:${patient.email}`}
                        className="inline-flex min-w-0 items-center truncate rounded-marker font-mono text-label text-ink-primary underline-offset-4 hover:text-accent-ink hover:underline pointer-coarse:min-h-11"
                      >
                        <span className="sr-only">E-mail: </span>
                        {patient.email}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </>
            ) : (
              <span className="skeleton mt-2 block h-4 w-48 max-w-full" />
            )}
          </div>
        </div>
        {patient ? (
          <div className="flex flex-wrap items-center gap-2 xl:shrink-0">
            <HeaderActions patient={patient} />
          </div>
        ) : null}
      </Panel>
    </header>
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

/** Dados de cadastro de referência. Telefone e e-mail já estão no herói, com ação. */
function ContactList({ patient }: { patient: PatientDetail }) {
  const missing = <span className="text-ink-tertiary">Não informado</span>;
  return (
    <DescriptionList
      columns={1}
      className="sm:grid-cols-3 xl:grid-cols-1"
      items={[
        {
          label: "CPF",
          value: patient.cpf ? (
            <span className="font-mono tabular-nums">
              {formatCpf(patient.cpf)}
            </span>
          ) : (
            missing
          ),
        },
        {
          label: "Data de nascimento",
          value: patient.birthDate ? (
            <span className="font-mono tabular-nums">
              {formatDate(patient.birthDate)}
            </span>
          ) : (
            missing
          ),
        },
        {
          label: "E-mail",
          value: patient.email ? (
            <a
              href={`mailto:${patient.email}`}
              className="font-mono text-label text-ink-primary underline-offset-4 hover:text-accent-ink hover:underline"
            >
              {patient.email}
            </a>
          ) : (
            missing
          ),
        },
      ]}
    />
  );
}

/**
 * Faixa de stat cards da jornada. Só as contagens que a API entrega
 * (`GET patients/:id/summary`) — nada de taxa ou tendência calculada aqui.
 */
function SummaryBlock({
  summary,
  error,
  onRetry,
}: {
  summary?: PatientSummary;
  error: unknown;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <Panel as="div" className="mb-4 px-4 py-3 md:px-5">
        <InlineError
          error={error}
          onRetry={onRetry}
          label="O resumo não carregou."
        />
      </Panel>
    );
  }
  const pending = summary ? summary.openTasksCount > 0 : false;
  const loading = (
    <span className="skeleton inline-block h-6 w-8 align-middle">
      <span className="sr-only">Carregando…</span>
    </span>
  );
  return (
    <section
      aria-label="Resumo do paciente"
      className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
    >
      <StatTile
        label="Consultas"
        value={summary?.appointmentsCount ?? loading}
        icon={<CalendarClock />}
      />
      <StatTile
        label="Canceladas"
        value={summary?.cancelledCount ?? loading}
        icon={<CalendarX />}
      />
      <StatTile
        label="Documentos"
        value={summary?.documentsCount ?? loading}
        icon={<FileText />}
      />
      <StatTile
        label="Pendências"
        value={summary?.openTasksCount ?? loading}
        icon={<ClipboardCheck />}
        tone={pending ? "warning" : "default"}
        dot={pending ? "static" : undefined}
        hint={pending ? "Ver na aba Pendências" : undefined}
      />
    </section>
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

  const lastIndex = items.length - 1;
  return (
    <>
      {/* Linha do tempo da jornada: trilho fino à esquerda, um marcador na cor do estado por consulta. */}
      <ol className="px-2 py-2 md:px-3">
        {items.map((item, index) => (
          <li key={item.id} className="relative pl-7">
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-[13px] w-px bg-border-default",
                lastIndex === 0 && !query.hasNextPage && "hidden",
                index === 0 ? "top-5" : "top-0",
                index === lastIndex && !query.hasNextPage ? "h-5" : "bottom-0",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-4 left-[9px] size-2.5 rounded-full ring-4 ring-surface-base",
                STATE_SOLID[item.derivedState],
              )}
            />
            <Link
              to={`/consultas/${item.id}`}
              state={{
                from: currentPath(location),
                backgroundLocation: location,
              }}
              aria-label={`Consulta de ${formatDate(item.startsAt)} às ${item.time}, ${item.stateLabel}`}
              className="group grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-raised px-3 py-2.5 transition-colors duration-150 hover:bg-surface-hover md:grid-cols-[7rem_minmax(0,1fr)_auto_1rem]"
            >
              <span className="font-mono tabular-nums">
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
      </ol>
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
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-secondary">
          <TaskTypeTag type={task.type} />
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
