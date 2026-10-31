import { BrandMark } from "@/components/layout/brand";
import { Dot } from "@/components/ui/badge";
import { useDocumentTitle } from "@/components/ui/page";

/**
 * Pilares do produto no painel da marca. Só o que o sistema faz — nenhum
 * número: a interface não inventa métrica, nem na vitrine.
 */
const PILLARS = [
  {
    label: "Sala de espera ao vivo",
    dot: "text-amber-300",
    pulse: true,
  },
  {
    label: "Confirmação pelo WhatsApp antes da consulta",
    dot: "text-emerald-400",
    pulse: false,
  },
  {
    label: "Resgate de faltas e retornos a agendar",
    dot: "text-rose-400",
    pulse: false,
  },
];

/**
 * Moldura das telas de acesso. O painel da marca é a vitrine do Cockpit:
 * sempre escuro (slate-950), nos dois temas — por isso usa a paleta slate
 * direto em vez dos tokens, que seguem o tema do `<html>`. O formulário, ao
 * lado, continua no tema corrente. Curto: quem chega aqui quer entrar.
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
    <div className="grid min-h-dvh grid-cols-1 bg-surface-base lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-slate-950 px-12 py-12 text-slate-200 lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark size="lg" />
          <span className="text-section font-bold tracking-tight text-slate-100">
            ClinicFlow
          </span>
        </div>

        <div className="max-w-md">
          <p className="text-hero font-bold tracking-tight text-balance text-slate-50">
            Quem chegou, quem pode faltar e o próximo clique.
          </p>
          <p className="mt-4 text-card text-slate-400">
            Agenda, sala de espera e resgate de faltas num só cockpit. Quem está
            no balcão vê o dia inteiro sem trocar de aba.
          </p>
          <ul className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6">
            {PILLARS.map((pillar) => (
              <li
                key={pillar.label}
                className="flex items-center gap-2.5 text-body text-slate-300"
              >
                <Dot pulse={pillar.pulse} className={`size-2 ${pillar.dot}`} />
                {pillar.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-label text-slate-400">
          Acesso restrito à equipe da clínica.
        </p>
      </aside>

      <main className="flex flex-col items-center justify-center bg-surface-base px-5 py-10 sm:px-8">
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
