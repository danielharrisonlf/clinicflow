import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, TextSkeleton } from "@/components/ui/states";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { notificationsApi } from "@/lib/api/endpoints";
import type { AppointmentDetail } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { plural } from "@/lib/utils";
import { NotificationStatusBadge, RiskIndicator } from "./confirmation-status";
import { formatDateTime } from "./labels";
import { latestByAppointment, noShowRisk } from "./no-show-risk";
import { useResendConfirmation } from "./use-resend-confirmation";

/**
 * Prevenção de faltas na folha da consulta: o que o paciente recebeu pelo
 * WhatsApp, se respondeu, e o reenvio enquanto a consulta não foi confirmada.
 */
export function ConfirmationPanel({ data }: { data: AppointmentDetail }) {
  const query = { appointmentId: data.id, limit: 20 };
  const history = useQuery({
    queryKey: qk.notifications.list(query),
    queryFn: () => notificationsApi.list(query),
  });
  const resend = useResendConfirmation();

  const items = history.data?.data ?? [];
  const pending = data.status === "AGENDADA";
  const last = latestByAppointment(items).get(data.id);
  const risk =
    pending && history.data
      ? noShowRisk({ startsAt: data.startsAt, lastStatus: last?.status })
      : null;

  return (
    <Panel aria-labelledby="consulta-confirmacao">
      <PanelHeader
        id="consulta-confirmacao"
        title="Confirmação WhatsApp"
        count={
          history.data
            ? plural(history.data.meta.itemCount, "envio")
            : undefined
        }
        description={risk ? <RiskIndicator risk={risk} /> : undefined}
        actions={
          pending ? (
            <Button
              variant="secondary"
              size="sm"
              loading={resend.isPending}
              onClick={() =>
                resend.mutate({
                  appointmentId: data.id,
                  patientName: data.patientName,
                })
              }
            >
              <Send aria-hidden="true" />
              Reenviar WhatsApp
            </Button>
          ) : undefined
        }
      />
      {history.isPending ? (
        <div className="px-4 py-4 md:px-5">
          <TextSkeleton lines={3} />
        </div>
      ) : history.isError ? (
        <ErrorState
          compact
          error={history.error}
          title="Os envios não carregaram"
          onRetry={() => void history.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          compact
          icon={MessageCircle}
          title="Nenhuma mensagem enviada"
          description={
            pending
              ? "Sem confirmação, a consulta corre risco de falta. Envie o lembrete pelo botão acima."
              : "Os lembretes de confirmação enviados ao paciente aparecem aqui."
          }
        />
      ) : (
        <ol className="divide-y divide-border-subtle">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 px-4 py-3 md:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <NotificationStatusBadge status={item.status} />
                <time
                  dateTime={item.sentAt ?? item.createdAt}
                  className="font-mono text-label text-ink-secondary tabular-nums"
                >
                  {formatDateTime(item.sentAt ?? item.createdAt)}
                </time>
              </div>
              <p className="font-mono text-label text-ink-tertiary">
                {item.to}
              </p>
              {item.error ? (
                <p className="text-label text-danger">{item.error}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
