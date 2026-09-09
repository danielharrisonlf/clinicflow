import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-control font-semibold transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-45",
    // Alvo de toque: 44px em ponteiro grosso, sem inchar o desktop.
    "pointer-coarse:min-h-11",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-ink-onaccent hover:bg-accent-hover active:bg-accent-active",
        secondary:
          "bg-surface-base text-ink-primary border border-border-default hover:bg-surface-app active:bg-surface-sunken",
        ghost:
          "bg-transparent text-ink-secondary hover:bg-surface-sunken hover:text-ink-primary active:bg-border-subtle",
        destructive:
          "bg-state-atrasada text-ink-onaccent hover:brightness-95 active:brightness-90",
      },
      size: {
        sm: "h-9 px-3 text-micro",
        md: "h-10 px-4 text-body",
        lg: "h-11 px-6 text-card",
        icon: "size-10 px-0",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      // Botão desabilitado sai da ordem de tabulação e nunca é anunciado.
      // Durante o envio isso é aceitável — é estado transitório, não regra.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
}

/**
 * Mesma aparência, semântica de link. Existe porque `<button>` envolvendo `<a>`
 * é HTML inválido — e porque navegação tem que continuar abrindo em nova aba
 * com ⌘+clique, o que um `onClick` com `navigate()` quebra.
 */
export function ButtonLink({
  className,
  variant,
  size,
  block,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
