import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-marker font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral:
          "border border-border-default bg-surface-base text-ink-secondary",
        accent: "bg-accent-weak text-accent-ink",
        warning: "bg-warning-weak text-warning",
        danger: "bg-danger-weak text-danger",
        success: "bg-success-weak text-success",
        info: "bg-info-weak text-info",
        outline: "border border-border-default text-ink-secondary",
      },
      size: {
        sm: "h-5 px-1.5 text-micro",
        md: "h-6 px-2 text-micro",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

/** Etiqueta curta de contexto: tipo de documento, contagem, "Inativo". */
export function Badge({
  className,
  tone,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
  );
}
