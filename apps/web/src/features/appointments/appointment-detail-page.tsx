import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarPlus,
  CalendarSearch,
  CalendarX2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, TextareaField } from "@/components/ui/field";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Overlay } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DescriptionList,
  Panel,
  PanelBody,
  PanelHeader,
} from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { ApiError, errorMessage } from "@/lib/api/client";
import { appointmentsApi } from "@/lib/api/endpoints";
import type { AppointmentDetail } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, plural, whatsappUrl } from "@/lib/utils";
import { AppointmentHistory } from "./appointment-history";
import { backTargetFrom, currentPath } from "./back-target";
import { CancelPanel } from "./cancel-panel";
import {
  APPOINTMENT_TYPE_LABEL,
  CANCEL_REASON_LABEL,
  formatDateTime,
  formatDayLong,
  toDateKey,
} from "./labels";
import { ReschedulePanel } from "./reschedule-panel";
import {
  actionsFor,
  useAppointmentTransition,
  useInvalidateAppointmentViews,
} from "./use-appointment-actions";

type PanelName = "none" | "reschedule" | "cancel" | "edit";

export function AppointmentDetailPage({
  onClose,
}: {
  onClose?: () => void;
} = {}) {
  const { id = "" } = useParams();
  const location = useLocation();
  const back = backTargetFrom(location);
  const [panel, setPanel] = useState<PanelName>("none");

  const appointment = useQuery({
    queryKey: qk.appointments.detail(id),
    queryFn: () => appointmentsApi.detail(id),
    enabled: Boolean(id),
  });

  if (appointment.isPending) {
    const content = <DetailSkeleton back={back} />;
    return onClose ? (
      <Overlay
        open
        onClose={onClose}
        variant="sheet"
        title="Consulta"
        initialFocus="container"
      >
        {content}
      </Overlay>
    ) : (
      content
    );
  }

  if (appointment.isError && !appointment.data) {
    const error = appointment.error;
    // Id malformado volta 400 do validador; para quem colou o link é a mesma coisa.
    const notFound =
      error instanceof ApiError &&
      (error.statusCode === 404 || error.statusCode === 400);
    const content = (
      <>
        <PageHeader
          title={notFound ? "Consulta não encontrada" : "Consulta"}
          back={back}
        />
        <Panel>
          {notFound ? (
            <EmptyState
              icon={CalendarSearch}
              title="Essa consulta não existe ou foi removida"
              description="Confira o link ou procure pelo paciente na agenda do dia."
              action={
                <>
                  <ButtonLink to={back.to} variant="secondary">
                    Voltar para {back.label.toLowerCase()}
                  </ButtonLink>
                  <ButtonLink to="/agenda">Abrir agenda</ButtonLink>
                </>
              }
            />
          ) : (
            <ErrorState
              error={error}
              onRetry={() => void appointment.refetch()}
            />
          )}
        </Panel>
      </>
    );
    return onClose ? (
      <Overlay
        open
        onClose={onClose}
        variant="sheet"
        title="Consulta"
        initialFocus="container"
      >
        {content}
      </Overlay>
    ) : (
      content
    );
  }

  const data = appointment.data;
  const detail = (
    <DetailView
      data={data}
      back={back}
      from={currentPath(location)}
      onOpen={setPanel}
      inSheet={Boolean(onClose)}
    />
  );
  return (
    <>
      {onClose ? (
        panel === "none" ? (
          <Overlay
            open
            onClose={onClose}
            variant="sheet"
            title={data.patientName}
            description={`${formatDayLong(toDateKey(data.startsAt))} às ${data.time}`}
            initialFocus="container"
          >
            {detail}
          </Overlay>
        ) : null
      ) : (
        detail
      )}
      {/* Montados só quando abertos: cada abertura começa com o formulário limpo. */}
      {panel === "reschedule" ? (
        <ReschedulePanel
          open
          appointment={data}
          onClose={() => setPanel("none")}
          from={back.to}
        />
      ) : null}
      {panel === "cancel" ? (
        <CancelPanel open appointment={data} onClose={() => setPanel("none")} />
      ) : null}
      {panel === "edit" ? (
        <EditDetailsDialog
          appointment={data}
          onClose={() => setPanel("none")}
        />
      ) : null}
    </>
  );
}

function DetailView({
  data,
  back,
  from,
  onOpen,
  inSheet,
}: {
  data: AppointmentDetail;
  back: { to: string; label: string };
  from: string;
  onOpen: (panel: PanelName) => void;
  inSheet: boolean;
}) {
  const transition = useAppointmentTransition();
  const actions = actionsFor(data.allowedTransitions);
  const [primary, ...secondary] = actions;
  const canReschedule = data.allowedTransitions.includes("REAGENDADA");
  const canCancel = data.allowedTransitions.includes("CANCELADA");
  const dateKey = toDateKey(data.startsAt);
  const hasActions = actions.length > 0 || canReschedule || canCancel;
  const notes = data.notes?.trim();
  const room = data.room?.trim();

  return (
    <>
      {!inSheet ? (
        <PageHeader
          back={back}
          documentTitle={`${data.patientName} · Consulta #${data.code}`}
          title={
            <Link
              to={`/pacientes/${data.patientId}`}
              state={{ from }}
              className="rounded-marker decoration-2 underline-offset-4 hover:underline"
            >
              {data.patientName}
            </Link>
          }
          meta={
            <>
              <StatusBadge state={data.derivedState} label={data.stateLabel} />
              {data.isOverbooked ? <Badge tone="warning">Encaixe</Badge> : null}
              <span className="tabular text-label text-ink-tertiary">
                Consulta #{data.code}
              </span>
            </>
          }
          description={
            <>
              {formatDayLong(dateKey)} às{" "}
              <span className="font-mono">{data.time}</span>, com{" "}
              {data.professionalName}
            </>
          }
        />
      ) : (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge state={data.derivedState} label={data.stateLabel} />
          {data.isOverbooked ? <Badge tone="warning">Encaixe</Badge> : null}
          <span className="font-mono text-label text-ink-secondary">
            #{data.code}
          </span>
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-5",
          !inSheet && "lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start",
        )}
      >
        <div className="flex min-w-0 flex-col gap-5">
          {hasActions ? (
            <section
              aria-label="Ações da consulta"
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
            >
              {primary ? (
                <Button
                  variant="primary"
                  loading={
                    transition.isPending &&
                    transition.variables?.target === primary.target
                  }
                  disabled={transition.isPending}
                  onClick={() =>
                    transition.mutate({
                      id: data.id,
                      target: primary.target,
                      patientName: data.patientName,
                    })
                  }
                >
                  {primary.label}
                </Button>
              ) : null}
              {secondary.length > 0 || canReschedule || canCancel ? (
                <Menu
                  label="Outras ações da consulta"
                  trigger={(props) => (
                    <button
                      type="button"
                      {...props}
                      disabled={transition.isPending}
                      className="inline-flex min-h-10 items-center gap-2 rounded-control border border-border-default bg-surface-base px-3 text-body font-semibold text-ink-primary hover:bg-surface-sunken"
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />{" "}
                      Outras ações
                    </button>
                  )}
                >
                  {secondary.map((action) => (
                    <MenuItem
                      key={action.target}
                      disabled={transition.isPending}
                      onSelect={() =>
                        transition.mutate({
                          id: data.id,
                          target: action.target,
                          patientName: data.patientName,
                        })
                      }
                    >
                      {action.label}
                    </MenuItem>
                  ))}
                  {canReschedule ? (
                    <MenuItem
                      icon={<CalendarClock />}
                      onSelect={() => onOpen("reschedule")}
                    >
                      Reagendar
                    </MenuItem>
                  ) : null}
                  {canCancel ? (
                    <MenuItem
                      icon={<CalendarX2 />}
                      tone="danger"
                      onSelect={() => onOpen("cancel")}
                    >
                      Cancelar consulta
                    </MenuItem>
                  ) : null}
                </Menu>
              ) : null}
            </section>
          ) : (
            <ClosedNotice data={data} from={from} />
          )}

          <Panel aria-labelledby="consulta-detalhes">
            <PanelHeader
              id="consulta-detalhes"
              title="Detalhes"
              actions={
                // Consulta que já saiu da agenda não muda mais de sala.
                data.status === "CANCELADA" ||
                data.status === "REAGENDADA" ? undefined : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpen("edit")}
                  >
                    <Pencil aria-hidden="true" />
                    Editar sala e observações
                  </Button>
                )
              }
            />
            <PanelBody>
              <DescriptionList
                columns={2}
                items={[
                  {
                    label: "Data e hora",
                    value: (
                      <>
                        {formatDayLong(dateKey)} às{" "}
                        <span className="font-mono font-semibold">
                          {data.time}
                        </span>
                      </>
                    ),
                  },
                  {
                    label: "Duração",
                    value: (
                      <span className="font-mono">
                        {data.durationMinutes} min
                      </span>
                    ),
                  },
                  { label: "Tipo", value: APPOINTMENT_TYPE_LABEL[data.type] },
                  {
                    label: "Profissional",
                    value: (
                      <Link
                        to={`/profissionais/${data.professionalId}`}
                        state={{ from }}
                        className="font-semibold text-accent-ink hover:underline"
                      >
                        {data.professionalName}
                      </Link>
                    ),
                  },
                  {
                    label: "Sala",
                    value: room || (
                      <span className="text-ink-tertiary">Não definida</span>
                    ),
                  },
                  {
                    label: "Documentos",
                    value:
                      data.documentsCount > 0 ? (
                        plural(data.documentsCount, "documento")
                      ) : (
                        <span className="text-ink-tertiary">
                          Nenhum anexado
                        </span>
                      ),
                  },
                  ...(data.rescheduledFromId
                    ? [
                        {
                          label: "Origem",
                          wide: true,
                          value: (
                            <>
                              Reagendada a partir de outra consulta.{" "}
                              <Link
                                to={`/consultas/${data.rescheduledFromId}`}
                                state={{ from }}
                                className="font-semibold text-accent-ink underline underline-offset-2"
                              >
                                Ver consulta original
                              </Link>
                            </>
                          ),
                        },
                      ]
                    : []),
                  {
                    label: "Telefone",
                    wide: true,
                    value: (
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`tel:${data.patientPhone.replace(/[^\d+]/g, "")}`}
                          className="inline-flex items-center gap-1.5 rounded-marker font-mono font-semibold text-ink-primary hover:text-accent-ink hover:underline pointer-coarse:min-h-11"
                        >
                          <Phone className="size-4" aria-hidden="true" />
                          {data.patientPhone}
                        </a>
                        <ButtonAnchor
                          href={whatsappUrl(data.patientPhone)}
                          target="_blank"
                          rel="noreferrer"
                          size="sm"
                          variant="secondary"
                        >
                          <MessageCircle aria-hidden="true" />
                          WhatsApp
                        </ButtonAnchor>
                      </div>
                    ),
                  },
                  {
                    label: "Observações",
                    wide: true,
                    value: notes ? (
                      <span className="whitespace-pre-line">{notes}</span>
                    ) : (
                      <span className="text-ink-tertiary">
                        Nenhuma observação
                      </span>
                    ),
                  },
                ]}
              />
            </PanelBody>
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Lifecycle data={data} />
          <AppointmentHistory appointmentId={data.id} />
        </div>
      </div>
    </>
  );
}

/**
 * Consulta sem próximo passo: diz por quê (cancelada, reagendada, concluída)
 * num aviso só e oferece o caminho que sobra — agendar de novo.
 */
function ClosedNotice({
  data,
  from,
}: {
  data: AppointmentDetail;
  from: string;
}) {
  const again = (
    <ButtonLink
      size="sm"
      variant="secondary"
      to={`/consultas/nova?patientId=${data.patientId}&professionalId=${data.professionalId}`}
      state={{ from }}
    >
      <CalendarPlus aria-hidden="true" />
      {data.status === "CONCLUIDA"
        ? "Agendar retorno"
        : "Agendar nova consulta"}
    </ButtonLink>
  );

  if (data.status === "CANCELADA") {
    return (
      <Callout tone="warning" title="Consulta cancelada" action={again}>
        {data.cancelReason
          ? CANCEL_REASON_LABEL[data.cancelReason]
          : "Sem motivo registrado"}
        {data.cancelledAt ? `, em ${formatDateTime(data.cancelledAt)}` : ""}.
        {data.cancelNote ? (
          <span className="mt-1 block text-ink-secondary">
            {data.cancelNote}
          </span>
        ) : null}
      </Callout>
    );
  }
  if (data.status === "REAGENDADA") {
    return (
      <Callout tone="info" title="Esta consulta foi reagendada">
        O novo horário é outra consulta, na agenda do paciente. O motivo está no
        histórico.
      </Callout>
    );
  }
  return (
    <Callout tone="info" title="Consulta encerrada" action={again}>
      Não há próximo passo para esta consulta.
    </Callout>
  );
}

/** Marcos do dia da consulta, na ordem em que acontecem. Só o que já aconteceu tem hora. */
function Lifecycle({ data }: { data: AppointmentDetail }) {
  const steps = [
    { label: "Confirmada", at: data.confirmedAt },
    { label: "Check-in", at: data.checkedInAt },
    { label: "Atendimento iniciado", at: data.startedAt },
    { label: "Concluída", at: data.completedAt },
  ];
  if (data.cancelledAt)
    steps.push({ label: "Cancelada", at: data.cancelledAt });

  return (
    <Panel aria-labelledby="consulta-andamento">
      <PanelHeader id="consulta-andamento" title="Andamento" />
      <ol className="flex flex-col gap-2 px-4 py-3 md:px-5">
        {steps.map((step) => (
          <li
            key={step.label}
            className="flex items-baseline justify-between gap-3"
          >
            <span
              className={cn(
                "text-body",
                step.at
                  ? "font-semibold text-ink-primary"
                  : "text-ink-tertiary",
              )}
            >
              {step.label}
            </span>
            {step.at ? (
              <time
                dateTime={step.at}
                className="font-mono text-label text-ink-secondary"
              >
                {formatDateTime(step.at)}
              </time>
            ) : (
              <span className="text-label text-ink-tertiary">
                <span aria-hidden="true">—</span>
                <span className="sr-only">ainda não</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** Sala e observação mudam no dia (consultório trocado, recado do paciente). */
function EditDetailsDialog({
  appointment,
  onClose,
}: {
  appointment: AppointmentDetail;
  onClose: () => void;
}) {
  const toast = useToast();
  const invalidate = useInvalidateAppointmentViews();
  const [room, setRoom] = useState(appointment.room ?? "");
  const [notes, setNotes] = useState(appointment.notes ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      appointmentsApi.update(appointment.id, {
        room: room.trim(),
        notes: notes.trim(),
      }),
    onSuccess: () => {
      invalidate();
      onClose();
      toast.push({
        tone: "success",
        title: "Consulta atualizada",
        description: appointment.patientName,
      });
    },
  });
  const fields =
    mutation.error instanceof ApiError ? mutation.error.fieldErrors() : {};
  const unchanged =
    room.trim() === (appointment.room ?? "").trim() &&
    notes.trim() === (appointment.notes ?? "").trim();

  return (
    <Overlay
      open
      onClose={onClose}
      size="md"
      title="Editar sala e observações"
      description={appointment.patientName}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Voltar
          </Button>
          <Button
            type="submit"
            form="editar-consulta"
            loading={mutation.isPending}
            disabled={unchanged}
          >
            Salvar alterações
          </Button>
        </>
      }
    >
      <form
        id="editar-consulta"
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!unchanged) mutation.mutate();
        }}
      >
        <Field
          label="Sala"
          placeholder="Consultório 2"
          maxLength={40}
          value={room}
          error={fields.room}
          onChange={(event) => setRoom(event.target.value)}
        />
        <TextareaField
          label="Observações"
          maxLength={1000}
          rows={4}
          value={notes}
          error={fields.notes}
          hint={`${notes.trim().length}/1000`}
          onChange={(event) => setNotes(event.target.value)}
        />
        {mutation.isError && Object.keys(fields).length === 0 ? (
          <Callout live tone="danger" title="Nada foi salvo">
            {errorMessage(
              mutation.error,
              "Sem conexão com o servidor. Tente de novo.",
            )}
          </Callout>
        ) : null}
      </form>
    </Overlay>
  );
}

function DetailSkeleton({ back }: { back: { to: string; label: string } }) {
  return (
    <>
      <PageHeader
        back={back}
        title={
          <>
            <span className="sr-only">Carregando a consulta…</span>
            <span
              aria-hidden="true"
              className="skeleton inline-block h-8 w-64 max-w-full align-middle"
            />
          </>
        }
        documentTitle="Consulta"
      />
      <Loading label="Carregando a consulta…">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-5">
            <div className="flex gap-2">
              <div className="skeleton h-10 w-44 rounded-control" />
              <div className="skeleton h-10 w-32 rounded-control" />
            </div>
            <div className="rounded-card border border-border-subtle bg-surface-base p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="skeleton h-3 w-20" />
                    <div className="skeleton h-4 w-40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface-base p-5">
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="skeleton h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </Loading>
    </>
  );
}
