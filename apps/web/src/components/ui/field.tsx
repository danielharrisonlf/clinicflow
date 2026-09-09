import { Eye, EyeOff } from "lucide-react";
import type * as React from "react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

const controlBase = [
  "w-full rounded-control border bg-surface-base",
  "px-3 text-body text-ink-primary placeholder:text-ink-tertiary",
  "transition-colors duration-150",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-tertiary",
  // iOS aplica zoom se a fonte do input for menor que 16px.
  "pointer-coarse:min-h-11 pointer-coarse:text-[16px]",
].join(" ");

export interface FieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  /** Mensagem de erro: nomeia o problema e a saída, não só "inválido". */
  error?: string;
  /** Ícone posicionado sobre o input, não ao lado — o clique foca o campo. */
  icon?: React.ReactNode;
}

export function Field({
  label,
  hint,
  error,
  icon,
  className,
  ...props
}: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-label font-semibold text-ink-secondary"
      >
        {label}
      </label>

      <div className="relative">
        {icon ? (
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-tertiary"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            controlBase,
            "h-10",
            icon && "pl-10",
            error
              ? "border-state-atrasada"
              : "border-border-default hover:border-ink-tertiary",
            className,
          )}
          {...props}
        />
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-micro text-state-atrasada">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-micro text-ink-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Campo de senha com alternância de visibilidade.
 *
 * Quem digita no balcão erra a senha com o paciente olhando e não tem como
 * conferir. O botão fica dentro do campo, à direita, e não entra na ordem de
 * tabulação: quem usa teclado quer ir do campo para o botão de entrar.
 */
export function PasswordField({
  label,
  error,
  hint,
  className,
  ...props
}: Omit<FieldProps, "icon" | "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-label font-semibold text-ink-secondary"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            controlBase,
            "h-10 pr-11",
            error
              ? "border-state-atrasada"
              : "border-border-default hover:border-ink-tertiary",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-control text-ink-tertiary transition-colors hover:text-ink-primary"
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-micro text-state-atrasada">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-micro text-ink-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  error?: string;
}

export function SelectField({
  label,
  error,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-label font-semibold text-ink-secondary"
      >
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          controlBase,
          "h-10 appearance-none pr-8",
          error ? "border-state-atrasada" : "border-border-default",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-micro text-state-atrasada">{error}</p> : null}
    </div>
  );
}

export function TextareaField({
  label,
  error,
  className,
  ...props
}: {
  label: string;
  error?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id">) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-label font-semibold text-ink-secondary"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        className={cn(
          controlBase,
          "py-2.5 leading-relaxed",
          error ? "border-state-atrasada" : "border-border-default",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-micro text-state-atrasada">{error}</p> : null}
    </div>
  );
}
