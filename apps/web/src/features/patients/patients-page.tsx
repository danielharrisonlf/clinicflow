import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import {
  CardsSkeleton,
  EmptyState,
  ErrorState,
  RowsSkeleton,
} from "@/components/ui/states";
import { Panel } from "@/components/ui/surface";
import { patientsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { formatDate } from "../appointments/labels";

export function PatientsPage() {
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(term);

  const query = {
    page,
    limit: 15,
    search: search || undefined,
    orderBy: "name",
  };

  const patients = useQuery({
    queryKey: qk.patients.list(query),
    queryFn: () => patientsApi.list(query),
    // Sem isso a tabela pisca em branco a cada troca de página.
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
            Pacientes
          </h1>
          <p className="mt-0.5 text-body text-ink-secondary">
            {patients.data
              ? `${patients.data.meta.itemCount.toLocaleString("pt-BR")} cadastrados na Clínica Viver`
              : "Carregando cadastro…"}
          </p>
        </div>
        <ButtonLink to="/pacientes/novo">
          <Plus className="size-4" aria-hidden="true" />
          Novo paciente
        </ButtonLink>
      </header>

      <Panel>
        <div className="border-b border-border-subtle p-4">
          <Field
            label="Buscar"
            className="max-w-md"
            placeholder="Nome, CPF ou telefone"
            type="search"
            autoComplete="off"
            icon={<Search className="size-4" />}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {patients.isPending ? (
          <>
            <div className="hidden md:block">
              <RowsSkeleton rows={8} />
            </div>
            <div className="p-4 md:hidden">
              <CardsSkeleton cards={4} />
            </div>
          </>
        ) : patients.isError ? (
          <ErrorState
            error={patients.error}
            onRetry={() => void patients.refetch()}
          />
        ) : patients.data.data.length === 0 ? (
          <EmptyState
            title={search ? "Nenhum paciente encontrado" : "Cadastro vazio"}
            description={
              search
                ? `Nada casou com “${search}”. Verifique a grafia ou busque pelo telefone.`
                : "Cadastre o primeiro paciente para começar a agendar consultas."
            }
            action={<ButtonLink to="/pacientes/novo">Novo paciente</ButtonLink>}
          />
        ) : (
          <>
            <table className="hidden w-full border-collapse md:table">
              <thead>
                <tr className="border-b border-border-subtle text-left">
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-micro font-semibold text-ink-secondary"
                  >
                    Paciente
                  </th>
                  <th
                    scope="col"
                    className="w-44 px-4 py-2.5 text-micro font-semibold text-ink-secondary"
                  >
                    Telefone
                  </th>
                  <th
                    scope="col"
                    className="w-40 px-4 py-2.5 text-micro font-semibold text-ink-secondary"
                  >
                    Próxima
                  </th>
                  <th
                    scope="col"
                    className="w-32 px-4 py-2.5 text-micro font-semibold text-ink-secondary"
                  >
                    Pendências
                  </th>
                  <th
                    scope="col"
                    className="w-32 px-4 py-2.5 text-right text-micro font-semibold text-ink-secondary"
                  >
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {patients.data.data.map((patient) => (
                  <tr
                    key={patient.id}
                    className="transition-colors hover:bg-surface-app"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/pacientes/${patient.id}`}
                        className="text-body font-semibold text-ink-primary hover:text-accent"
                      >
                        {patient.name}
                      </Link>
                      <p className="text-micro text-ink-secondary">
                        {patient.age !== null
                          ? `${patient.age} anos`
                          : "Idade não informada"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-body whitespace-nowrap text-ink-secondary">
                      {patient.phone}
                    </td>
                    <td className="px-4 py-3 font-mono text-body whitespace-nowrap text-ink-secondary">
                      {formatDate(patient.nextVisitAt)}
                    </td>
                    <td className="px-4 py-3">
                      <PendencyBadge count={patient.openTasksCount} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/pacientes/${patient.id}`}
                        className="text-micro font-semibold text-accent hover:underline"
                      >
                        Abrir ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="flex flex-col gap-3 p-4 md:hidden">
              {patients.data.data.map((patient) => (
                <li key={patient.id}>
                  <Link
                    to={`/pacientes/${patient.id}`}
                    className="block rounded-card border border-border-subtle bg-surface-base p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-card font-semibold text-ink-primary">
                        {patient.name}
                      </span>
                      <PendencyBadge count={patient.openTasksCount} />
                    </div>
                    <p className="mt-1 font-mono text-micro text-ink-secondary">
                      {patient.phone}
                    </p>
                    <p className="mt-0.5 text-micro text-ink-tertiary">
                      Próxima consulta {formatDate(patient.nextVisitAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination
              meta={patients.data.meta}
              unit="pacientes"
              onChange={setPage}
            />
          </>
        )}
      </Panel>
    </div>
  );
}

function PendencyBadge({ count }: { count: number }) {
  if (count === 0) {
    return <span className="font-mono text-body text-ink-tertiary">—</span>;
  }
  return (
    <span className="inline-flex items-center rounded-full bg-warning-weak px-2.5 py-0.5 text-micro font-semibold text-warning">
      {count} {count === 1 ? "pendência" : "pendências"}
    </span>
  );
}
