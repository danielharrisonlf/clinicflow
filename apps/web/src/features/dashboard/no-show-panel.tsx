import { useQuery } from "@tanstack/react-query";
import { Send, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ErrorState,
  InlineError,
  TextSkeleton,
} from "@/components/ui/states";
import { Panel, PanelHeader } from "@/components/ui/surface";
import { appointmentsApi, notificationsApi } from "@/lib/api/endpoints";
import type { AppointmentListItem, NotificationItem } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { cn, plural } from "@/lib/utils";
import { currentPath } from "../appointments/back-target";
import { RiskIndicator } from "../appointments/confirmation-status";
import {
  formatDateTime,
  formatTime,
  NOTIFICATION_STATUS_LABEL,
  toDateKey,
  todayISO,
} from "../appointments/labels";
import {
  latestByAppointment,
  type NoShowRisk,
  noShowRisk,
  RISK_META,
} from "../appointments/no-show-risk";
import { useResendConfirmation } from "../appointments/use-resend-confirmation";
import { queryFor } from "./filters";

/** Linhas visíveis na coluna viva; o resto fica no filtro "A confirmar". */
const VISIBLE_ROWS = 6;

/**
 * Uma página do histórico basta para o dia: o backend ordena do mais recente
 * para o mais antigo e o teto do `limit` é 100. Uma chamada só, correlacionada
 * no cliente — nunca uma requisição por consulta.
 */
const SENDS_QUERY = { limit: 100 };

/**
 * Prevenção de faltas: quem ainda não confirmou hoje, o que o WhatsApp já
 * tentou e o reenvio na própria linha. Crítico primeiro, depois por horário.
 */
export function NoShowPanel({
  date,
  onShowAll,
  className,
}: {
  date: string;
  /** Aplica o filtro "A confirmar" na lista principal. */
  onShowAll: () => void;
  className?: string;
}) {
  const location = useLocation();
  const query = queryFor("confirmar", date, 1);
  const pending = useQuery({
    queryKey: qk.appointments.list(query),
    queryFn: () => appointmentsApi.list(query),
  });
  const hasPending = (pending.data?.data.length ?? 0) > 0;
  const sends = useQuery({
    queryKey: qk.notifications.list(SENDS_QUERY),
    queryFn: () => notificationsApi.list(SENDS_QUERY),
    enabled: hasPending,
  });
  const resend = useResendConfirmation();

  const latest = sends.data ? latestByAppointment(sends.data.data) : null;
  const rows = (pending.data?.data ?? [])
    .map((item) => {
      const last = latest?.get(item.id);
      const risk: NoShowRisk | null = latest
        ? noShowRisk({ startsAt: item.startsAt, lastStatus: last?.status })
        : null;
      return { item, last, risk };
    })
    .sort(
      (a, b) =>
        (a.risk ? RISK_META[a.risk].order : 9) -
          (b.risk ? RISK_META[b.risk].order : 9) ||
        Date.parse(a.item.startsAt) - Date.parse(b.item.startsAt),
    );
  const critical = rows.filter((row) => row.risk === "CRITICO").length;
  const total = pending.data?.meta.itemCount ?? 0;

  return (
    <Panel aria-labelledby="prevencao-faltas" className={className}>
      <PanelHeader
        id="prevencao-faltas"
        title="Prevenção de faltas"
        count={
          pending.data ? plural(total, "a confirmar", "a confirmar") : undefined
        }
        description={
          critical > 0
            ? `${plural(critical, "consulta crítica", "consultas críticas")}: a mensagem não chegou ou o horário está perto sem resposta.`
            : undefined
        }
      />
      {pending.isPending ? (
        <div className="p-4 md:px-5">
          <TextSkeleton lines={4} />
        </div>
      ) : pending.isError ? (
        <ErrorState
          compact
          error={pending.error}
          title="As consultas a confirmar não carregaram"
          onRetry={() => void pending.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={ShieldCheck}
          title="Nenhuma consulta em risco"
          description="Todas as consultas de hoje estão confirmadas. Quem ficar sem confirmar aparece aqui, com o reenvio pelo WhatsApp."
        />
      ) : (
        <>
          {sends.isError ? (
            <div className="px-4 pt-3 md:px-5">
              <InlineError
                error={sends.error}
                onRetry={() => void sends.refetch()}
                label="O histórico de envios não carregou; o risco não foi calculado."
              />
            </div>
          ) : null}
          <ul className="divide-y divide-border-subtle">
            {rows.slice(0, VISIBLE_ROWS).map(({ item, last, risk }) => (
              <NoShowRow
                key={item.id}
                item={item}
                last={last}
                risk={risk}
                checked={Boolean(sends.data)}
                busy={
                  resend.isPending &&
                  resend.variables?.appointmentId === item.id
                }
                onResend={() =>
                  resend.mutate({
                    appointmentId: item.id,
                    patientName: item.patientName,
                  })
                }
                linkState={{
                  from: currentPath(location),
                  backgroundLocation: location,
                }}
              />
            ))}
          </ul>
          {total > VISIBLE_ROWS ? (
            <div className="border-t border-border-subtle px-4 py-2.5 md:px-5">
              <Button variant="link" size="sm" onClick={onShowAll}>
                Ver as {total} consultas a confirmar
              </Button>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}

function NoShowRow({
  item,
  last,
  risk,
  checked,
  busy,
  onResend,
  linkState,
}: {
  item: AppointmentListItem;
  last: NotificationItem | undefined;
  risk: NoShowRisk | null;
  /** O histórico de envios carregou: dá para afirmar "nenhum envio". */
  checked: boolean;
  busy: boolean;
  onResend: () => void;
  linkState: object;
}) {
  const at = last ? (last.sentAt ?? last.createdAt) : null;
  return (
    <li className="flex flex-col gap-2 px-4 py-3 md:px-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/consultas/${item.id}`}
            state={linkState}
            className="block truncate text-body font-semibold text-ink-primary hover:text-accent-ink hover:underline"
          >
            {item.patientName}
          </Link>
          <p className="truncate text-label text-ink-secondary">
            <span className="font-mono text-ink-primary tabular-nums">
              {item.time}
            </span>{" "}
            com {item.professionalName}
          </p>
        </div>
        {risk ? <RiskIndicator risk={risk} className="mt-0.5" /> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p
          className={cn(
            "min-w-0 text-label",
            last?.status === "FALHOU" ? "text-danger" : "text-ink-tertiary",
          )}
        >
          {last && at ? (
            <>
              Último envio: {NOTIFICATION_STATUS_LABEL[last.status]}{" "}
              <span className="font-mono tabular-nums">
                {toDateKey(at) === todayISO()
                  ? `às ${formatTime(at)}`
                  : formatDateTime(at)}
              </span>
            </>
          ) : checked ? (
            "Nenhuma mensagem enviada"
          ) : (
            "Envios não verificados"
          )}
        </p>
        <Button
          variant="secondary"
          size="sm"
          loading={busy}
          onClick={onResend}
          className="max-sm:h-11 max-sm:w-full"
        >
          <Send aria-hidden="true" />
          Reenviar WhatsApp
          <span className="sr-only"> para {item.patientName}</span>
        </Button>
      </div>
    </li>
  );
}
