import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-control font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    // Alvo de toque: 44px em ponteiro grosso, sem inchar o desktop.
    "pointer-coarse:min-h-11",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-ink-onaccent hover:bg-accent-hover active:bg-accent-active",
        secondary:
          "border border-border-default bg-surface-base text-ink-primary hover:border-border-strong hover:bg-surface-app active:bg-surface-sunken",
        ghost:
          "bg-transparent text-ink-secondary hover:bg-surface-sunken hover:text-ink-primary active:bg-border-subtle",
        destructive:
          "bg-danger-fill text-ink-onaccent hover:bg-danger-fill-hover",
        "destructive-ghost":
          "bg-transparent text-danger hover:bg-danger-weak active:bg-danger-weak",
        link: "h-auto px-0 text-accent-ink underline-offset-4 hover:underline active:translate-y-0",
      },
      size: {
        sm: "h-9 px-3 text-label",
        md: "h-10 px-4 text-label",
        lg: "h-11 px-5 text-card",
        icon: "size-10 px-0 [&_svg]:size-4.5",
        "icon-sm": "size-9 px-0 pointer-coarse:min-w-11",
      },
      block: { true: "w-full", false: "" },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    ButtonVariants {
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * Botão. Carregando mantém a largura (o rótulo fica, o spinner entra antes) e
 * usa `aria-busy` — a pessoa vê que o clique foi aceito e não clica de novo.
 */
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
 * Botão só com ícone. O rótulo é obrigatório no tipo: ícone sem nome
 * acessível é um botão mudo para leitor de tela.
 */
export function IconButton({
  label,
  variant = "ghost",
  size = "icon",
  children,
  ...props
}: Omit<ButtonProps, "aria-label"> & { label: string }) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </Button>
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
}: React.ComponentProps<typeof Link> & ButtonVariants) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

/** Link externo (tel:, wa.me) com aparência de botão. */
export function ButtonAnchor({
  className,
  variant,
  size,
  block,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & ButtonVariants) {
  return (
    <a
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
