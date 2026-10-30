import { BrandMark } from "@/components/layout/brand";
import { useDocumentTitle } from "@/components/ui/page";

/**
 * Moldura das telas de acesso. O painel da marca é a única superfície do
 * produto que não está a serviço de uma tarefa — e mesmo assim é curto: quem
 * chega aqui quer entrar, não ler.
 */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  useDocumentTitle(title);

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-surface-app lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between px-12 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark size="lg" />
          <span className="text-section font-bold tracking-tight text-ink-primary">
            ClinicFlow
          </span>
        </div>

        <div className="max-w-md">
          <p className="text-hero font-bold tracking-tight text-balance text-ink-primary">
            Do agendamento ao retorno, num fluxo só.
          </p>
          <p className="mt-4 text-card text-ink-secondary">
            Agenda, sala de espera e pendências na mesma tela. Quem está no
            balcão vê quem chegou sem trocar de aba.
          </p>
        </div>

        <p className="text-label text-ink-tertiary">
          Acesso restrito à equipe da clínica.
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center bg-surface-base px-5 py-10 sm:px-8 lg:border-l lg:border-border-subtle">
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <BrandMark />
          <span className="text-section font-bold tracking-tight text-ink-primary">
            ClinicFlow
          </span>
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-title-sm font-bold tracking-tight text-ink-primary">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 text-body text-ink-secondary">{description}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
