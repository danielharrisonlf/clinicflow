import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "danger" | "success";

const TONE: Record<Tone, { box: string; icon: LucideIcon; ink: string }> = {
  info: { box: "bg-info-weak", icon: Info, ink: "text-info" },
  warning: { box: "bg-warning-weak", icon: TriangleAlert, ink: "text-warning" },
  danger: { box: "bg-danger-weak", icon: CircleAlert, ink: "text-danger" },
  success: { box: "bg-revenue-weak", icon: CircleCheck, ink: "text-revenue" },
};

/**
 * Aviso dentro do fluxo: conflito de horário, alergia, modo de teste.
 * Fundo tingido inteiro e ícone — nada de barra colorida na lateral.
 * `role="alert"` só quando o aviso nasce de uma ação (erro de envio); aviso
 * permanente da tela não deve interromper o leitor de tela.
 */
export function Callout({
  tone = "info",
  title,
  children,
  action,
  live = false,
  className,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  live?: boolean;
  className?: string;
}) {
  const style = TONE[tone];
  const Icon = style.icon;
  return (
    <div
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
      className={cn(
        "flex gap-3 rounded-raised px-3.5 py-3",
        style.box,
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-4.5 shrink-0", style.ink)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 text-body text-ink-primary">
        {title ? (
          <p className={cn("font-semibold", style.ink)}>{title}</p>
        ) : null}
        {children ? (
          <div className={cn("text-ink-primary", title && "mt-0.5")}>
            {children}
          </div>
        ) : null}
        {action ? (
          <div className="mt-2.5 flex flex-wrap gap-2">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
