import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";

/** Endereço que não existe. Antes caía em silêncio no painel. */
export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Página não encontrada" className="sr-only" />
      <EmptyState
        icon={Compass}
        title="Esta página não existe"
        description="O endereço pode ter mudado ou o link estar incompleto. Volte ao painel ou use a busca para encontrar o paciente."
        action={<ButtonLink to="/">Ir para o painel do dia</ButtonLink>}
      />
    </>
  );
}
