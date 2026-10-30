import { ChevronDown, Eye, EyeOff } from "lucide-react";
import type * as React from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Família de campos. Todos dividem a mesma casca (`FieldShell`): rótulo em
 * cima, marcador de obrigatório, dica ou erro embaixo — e o erro sempre ligado
 * ao controle por `aria-describedby`, para o leitor de tela ler junto.
 */

export const controlClass = [
  "w-full rounded-control border bg-surface-base text-body text-ink-primary",
  "placeholder:text-ink-tertiary",
  "transition-[border-color,box-shadow] duration-150",
  "hover:border-border-strong",
  "focus-visible:border-accent-ink",
  "disabled:cursor-not-allowed disabled:border-border-default disabled:bg-surface-sunken disabled:text-ink-tertiary",
  "read-only:bg-surface-app",
  // iOS aplica zoom se a fonte do input for menor que 16px.
  "pointer-coarse:min-h-11 pointer-coarse:text-input-touch",
].join(" ");

const borderClass = (error?: string) =>
  error
    ? "border-danger hover:border-danger focus-visible:border-danger"
    : "border-border-strong";

interface ShellProps {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  /** Rótulo só para leitor de tela (busca com ícone, por exemplo). */
  hideLabel?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function describedBy(id: string, error?: string, hint?: unknown) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  hideLabel,
  className,
  children,
}: ShellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div
        className={cn("flex items-baseline gap-0.5", hideLabel && "sr-only")}
      >
        <label
          htmlFor={id}
          className="text-label font-medium text-ink-secondary"
        >
          {label}
        </label>
        {/* Fora do <label>: o asterisco não entra no nome acessível. O
            `required` do controle já anuncia a obrigatoriedade. */}
        {required ? (
          <span className="text-label text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1 text-label text-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-label text-ink-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface FieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: React.ReactNode;
  /** Mensagem de erro: nomeia o problema e a saída, não só "inválido". */
  error?: string;
  /** Ícone sobre o input, à esquerda — o clique continua focando o campo. */
  icon?: React.ReactNode;
  /** Conteúdo à direita dentro do campo (unidade, atalho). */
  suffix?: React.ReactNode;
  hideLabel?: boolean;
  containerClassName?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export function Field({
  label,
  hint,
  error,
  icon,
  suffix,
  hideLabel,
  className,
  containerClassName,
  required,
  ...props
}: FieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel={hideLabel}
      className={containerClassName}
    >
      <div className="relative">
        {icon ? (
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-tertiary [&_svg]:size-4"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(
            controlClass,
            borderClass(error),
            "h-10 px-3",
            icon && "pl-9",
            suffix && "pr-14",
            className,
          )}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-label text-ink-tertiary">
            {suffix}
          </span>
        ) : null}
      </div>
    </FieldShell>
  );
}

/**
 * Campo de senha com alternância de visibilidade.
 *
 * Quem digita no balcão erra a senha com o paciente olhando e não tem como
 * conferir. O botão fica dentro do campo e entra na ordem de tabulação depois
 * dele: quem usa teclado também precisa conseguir conferir.
 */
export function PasswordField({
  label,
  error,
  hint,
  className,
  required,
  ...props
}: Omit<FieldProps, "icon" | "type" | "suffix">) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
    >
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(
            controlClass,
            borderClass(error),
            "h-10 px-3 pr-12",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute inset-y-1 right-1 flex w-10 items-center justify-center rounded-marker text-ink-tertiary transition-colors hover:bg-surface-sunken hover:text-ink-primary"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </FieldShell>
  );
}

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  hideLabel?: boolean;
  containerClassName?: string;
}

export function SelectField({
  label,
  hint,
  error,
  hideLabel,
  className,
  containerClassName,
  required,
  children,
  ...props
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      hideLabel={hideLabel}
      className={containerClassName}
    >
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={cn(
            controlClass,
            borderClass(error),
            "h-10 cursor-pointer appearance-none pr-9 pl-3",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-tertiary"
          aria-hidden="true"
        />
      </div>
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  required,
  className,
  containerClassName,
  ...props
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  containerClassName?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id">) {
  const id = useId();
  return (
    <FieldShell
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={containerClassName}
    >
      <textarea
        id={id}
        rows={3}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(
          controlClass,
          borderClass(error),
          "min-h-20 resize-y px-3 py-2.5",
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}

/**
 * Interruptor binário. É um checkbox de verdade com `role="switch"`: teclado,
 * formulário e leitor de tela funcionam sem nada reimplementado.
 */
export function Switch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="block text-body font-semibold text-ink-primary">
          {label}
        </span>
        {description ? (
          <span
            id={`${id}-desc`}
            className="mt-0.5 block text-label text-ink-secondary"
          >
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          aria-describedby={description ? `${id}-desc` : undefined}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            "h-6 w-10 rounded-full border transition-colors duration-150",
            "border-border-strong bg-surface-sunken",
            "peer-checked:border-accent peer-checked:bg-accent",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-accent-ink peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-base",
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1 left-1 size-4 rounded-full bg-ink-tertiary shadow-panel transition-transform duration-150",
            "peer-checked:translate-x-4 peer-checked:bg-ink-onaccent",
          )}
        />
      </span>
    </label>
  );
}
