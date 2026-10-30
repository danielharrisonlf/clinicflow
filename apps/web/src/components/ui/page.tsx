import { ChevronLeft } from "lucide-react";
import type * as React from "react";
import { useEffect } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

/** Título da aba do navegador. Com dez abas abertas, "ClinicFlow" não diz nada. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ClinicFlow`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/**
 * Cabeçalho de tela. Um único h1 por rota, com o caminho de volta acima quando
 * a tela é filha de outra — e a aba do navegador acompanha o título.
 */
export function PageHeader({
  title,
  description,
  back,
  actions,
  meta,
  documentTitle,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  back?: { to: string; label: string };
  actions?: React.ReactNode;
  /** Linha de contexto abaixo do título (selo de estado, código). */
  meta?: React.ReactNode;
  /** Texto da aba, quando o título é JSX. */
  documentTitle?: string;
  className?: string;
}) {
  useDocumentTitle(
    documentTitle ?? (typeof title === "string" ? title : undefined),
  );

  return (
    <header className={cn("mb-6 flex flex-col gap-3 md:mb-8", className)}>
      {back ? (
        <Link
          to={back.to}
          className="-ml-1 inline-flex w-fit items-center gap-0.5 rounded-marker px-1 py-0.5 text-label font-semibold text-ink-secondary transition-colors hover:text-ink-primary pointer-coarse:min-h-11"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-title-sm font-semibold tracking-tight text-ink-primary md:text-title">
            {title}
          </h1>
          {meta ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>
          ) : null}
          {description ? (
            <p className="mt-1 text-body text-ink-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

/** Seção com título dentro de uma página longa (ficha, configurações). */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={id} className="text-section font-semibold text-ink-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-label text-ink-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
