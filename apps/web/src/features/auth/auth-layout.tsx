/**
 * Moldura das telas de acesso. O lado esquerdo é a única superfície do produto
 * que não está a serviço de uma tarefa, então é onde a marca aparece.
 */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh grid-cols-1 items-center gap-10 px-6 py-12 md:grid-cols-2 md:px-16">
      <section className="mx-auto w-full max-w-md md:mx-0 md:justify-self-end md:pr-10">
        <p className="font-mono text-entity font-bold tracking-tight text-accent">
          ClinicFlow
        </p>
        <h1 className="mt-4 text-title-sm font-bold text-ink-primary md:text-title">
          Do agendamento ao retorno, num fluxo só.
        </h1>
        <p className="mt-3 max-w-sm text-body text-ink-secondary">
          Agenda, fila de espera e pendências na mesma tela. Quem está no balcão
          não troca de aba para saber quem chegou.
        </p>
      </section>

      <section className="mx-auto w-full max-w-sm md:mx-0">
        <div className="rounded-card border border-border-subtle bg-surface-base p-6 shadow-raised">
          <h2 className="text-section font-semibold text-ink-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 mb-4 text-micro text-ink-secondary">
              {description}
            </p>
          ) : (
            <div className="mb-4" />
          )}
          {children}
        </div>
      </section>
    </main>
  );
}
