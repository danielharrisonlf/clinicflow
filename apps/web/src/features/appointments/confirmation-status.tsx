import { Dot } from "@/components/ui/badge";
import type { NotificationStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { NOTIFICATION_STATUS_LABEL } from "./labels";
import { type NoShowRisk, RISK_META } from "./no-show-risk";

/** Risco de falta: dot + palavra. A cor nunca é o único sinal. */
export function RiskIndicator({
  risk,
  className,
}: {
  risk: NoShowRisk;
  className?: string;
}) {
  const meta = RISK_META[risk];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-label font-semibold",
        meta.ink,
        className,
      )}
    >
      <Dot pulse={meta.pulse} className="size-2" />
      {meta.label}
    </span>
  );
}

const NOTIFICATION_STYLE: Record<NotificationStatus, string> = {
  PENDENTE: "bg-warning-weak text-warning",
  SIMULADA: "border border-border-default text-ink-secondary",
  ENVIADA: "bg-accent-weak text-accent-ink",
  FALHOU: "bg-danger-weak text-danger",
  RESPONDIDA: "bg-revenue-weak text-revenue",
};

/** Selo pílula de um envio do histórico. */
export function NotificationStatusBadge({
  status,
}: {
  status: NotificationStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-micro font-semibold",
        NOTIFICATION_STYLE[status],
      )}
    >
      <Dot />
      {NOTIFICATION_STATUS_LABEL[status]}
    </span>
  );
}
