import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { Panel } from "@/components/ui/surface";

/** Endereço que não existe. Antes caía em silêncio no Cockpit. */
export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Página não encontrada" className="sr-only" />
      <Panel as="div">
        <EmptyState
          icon={Compass}
          title="Esta página não existe"
          description="O endereço pode ter mudado ou o link estar incompleto. Volte ao Cockpit ou use a busca para encontrar o paciente."
          action={<ButtonLink to="/">Ir para o Cockpit</ButtonLink>}
        />
      </Panel>
    </>
  );
}
