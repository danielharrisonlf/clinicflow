import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Download, Search, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page";
import { clampPage, Pagination } from "@/components/ui/pagination";
import { SegmentedControl } from "@/components/ui/segmented";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui/states";
import { Panel } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/client";
import { patientsApi } from "@/lib/api/endpoints";
import type { ListPatientsQuery, PatientListItem } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { phoneDigits, plural } from "@/lib/utils";
import { formatDate } from "../appointments/labels";
import { downloadPatientsCsv } from "./export-csv";
import { ageLabel } from "./patient-format";

const PAGE_SIZE = 15;

type Scope = "todos" | "pendencias";
type Sort = "nome" | "recentes";

function queryFor(
  search: string,
  scope: Scope,
  sort: Sort,
  page: number,
): ListPatientsQuery {
  return {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    hasPendencies: scope === "pendencias" ? true : undefined,
    orderBy: sort === "recentes" ? "createdAt" : "name",
    order: sort === "recentes" ? "DESC" : "ASC",
  };
}

export function PatientsPage() {
  const [params, setParams] = useSearchParams();
  const urlSearch = params.get("busca") ?? "";
  const scope: Scope =
    params.get("filtro") === "pendencias" ? "pendencias" : "todos";
  const sort: Sort = params.get("ordem") === "recentes" ? "recentes" : "nome";
  const page = Math.max(1, Number(params.get("pagina") ?? "1") || 1);

  // O campo responde a cada tecla; a URL (e a consulta) só depois da pausa.
  const [term, setTerm] = useState(urlSearch);
  const debounced = useDebounced(term.trim());

  function update(next: {
    busca?: string;
    filtro?: Scope;
    ordem?: Sort;
    pagina?: number;
  }) {
    setParams(
      (current) => {
        const search = new URLSearchParams(current);
        const put = (
          key: string,
          value: string | undefined,
          fallback: string,
        ) => {
          if (!value || value === fallback) search.delete(key);
          else search.set(key, value);
        };
        if (next.busca !== undefined) put("busca", next.busca, "");
        if (next.filtro !== undefined) put("filtro", next.filtro, "todos");
        if (next.ordem !== undefined) put("ordem", next.ordem, "nome");
        // Qualquer mudança de recorte volta para a página 1.
        if (next.pagina !== undefined) put("pagina", String(next.pagina), "1");
        else search.delete("pagina");
        return search;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (debounced !== urlSearch) update({ busca: debounced });
    // Gatilho: só a busca pausada (`update` é recriada a cada render).
  }, [debounced]);

  // Voltar/avançar no navegador muda a URL por fora: o campo acompanha.
  useEffect(() => {
    setTerm((current) => (current.trim() === urlSearch ? current : urlSearch));
  }, [urlSearch]);

  const query = queryFor(urlSearch, scope, sort, page);
  const patients = useQuery({
    queryKey: qk.patients.list(query),
    queryFn: () => patientsApi.list(query),
    // Sem isso a tabela pisca em branco a cada troca de página.
    placeholderData: keepPreviousData,
  });

  // Página fora do alcance (link antigo, filtro que encolheu a lista).
  const meta = patients.data?.meta;
  useEffect(() => {
    if (!meta || patients.isPlaceholderData) return;
    const clamped = clampPage(page, meta);
    if (clamped !== page && clamped >= 1) update({ pagina: clamped });
  }, [meta, page, patients.isPlaceholderData]);

  const filtered = Boolean(urlSearch) || scope === "pendencias";
  const hasActiveControls = filtered || sort !== "nome";
  const count = meta
    ? filtered
      ? `${plural(meta.itemCount, "encontrado")}`
      : `${plural(meta.itemCount, "cadastrado")}`
    : undefined;

  return (
    <>
      <PageHeader
        title="Pacientes"
        description={
          count ??
          (patients.isError ? "Cadastro da clínica" : "Carregando cadastro…")
        }
        actions={
          <>
            <ExportButton query={query} />
            <ButtonLink to="/pacientes/novo">
              <UserPlus aria-hidden="true" />
              Novo paciente
            </ButtonLink>
          </>
        }
      />

      <Panel aria-label="Lista de pacientes">
        <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 md:px-5 lg:flex-row lg:items-end">
          <Field
            label="Buscar paciente"
            hideLabel
            type="search"
            autoComplete="off"
            placeholder="Nome, CPF ou telefone"
            icon={<Search />}
            containerClassName="min-w-0 lg:max-w-md lg:flex-1"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
            <SegmentedControl
              label="Filtrar pacientes"
              options={[
                { value: "todos", label: "Todos" },
                { value: "pendencias", label: "Com pendências" },
              ]}
              value={scope}
              onChange={(value) => update({ filtro: value })}
            />
            <SelectField
              label="Ordenar"
              hideLabel
              containerClassName="w-auto"
              className="h-9 w-auto"
              value={sort}
              onChange={(event) =>
                update({ ordem: event.target.value as Sort })
              }
            >
              <option value="nome">Nome (A–Z)</option>
              <option value="recentes">Cadastro mais recente</option>
            </SelectField>
            {hasActiveControls ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTerm("");
                  update({ busca: "", filtro: "todos", ordem: "nome" });
                }}
              >
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>

        {term.trim() !== urlSearch ||
        (patients.isFetching && patients.isPlaceholderData) ? (
          <p
            role="status"
            className="border-b border-border-subtle px-4 py-1.5 text-label text-ink-secondary md:px-5"
          >
            Atualizando resultados…
          </p>
        ) : null}

        {patients.isPending ? (
          <>
            <RowsSkeleton rows={8} className="max-md:hidden" />
            <RowsSkeleton rows={6} className="md:hidden" />
          </>
        ) : patients.isError ? (
          <ErrorState
            error={patients.error}
            onRetry={() => void patients.refetch()}
          />
        ) : patients.data.data.length === 0 ? (
          <PatientsEmpty
            search={urlSearch}
            scope={scope}
            onClear={() => {
              setTerm("");
              update({ busca: "", filtro: "todos" });
            }}
          />
        ) : (
          <>
            <PatientsTable items={patients.data.data} />
            <PatientsCards items={patients.data.data} />
            <Pagination
              meta={patients.data.meta}
              unit="pacientes"
              fetching={patients.isFetching && patients.isPlaceholderData}
              onChange={(next) => update({ pagina: next })}
            />
          </>
        )}
      </Panel>
    </>
  );
}

/**
 * Tabela a partir de `md`. Em 768px sobram ~650px: telefone e última visita
 * descem para baixo do nome em vez de espremer a coluna do nome (R1). Colunas
 * próprias só a partir de `xl`, onde cabem sem roubar a leitura do nome.
 */
function PatientsTable({ items }: { items: PatientListItem[] }) {
  return (
    <table className="hidden w-full table-fixed border-collapse md:table">
      <caption className="sr-only">Pacientes</caption>
      <thead className="bg-surface-app">
        <tr className="border-b border-border-subtle text-left text-label font-semibold text-ink-secondary">
          <th scope="col" className="px-5 py-2 font-semibold">
            Paciente
          </th>
          <th
            scope="col"
            className="hidden w-44 px-4 py-2 font-semibold xl:table-cell"
          >
            Telefone
          </th>
          <th
            scope="col"
            className="w-40 px-4 py-2 font-semibold whitespace-nowrap"
          >
            Próxima consulta
          </th>
          <th
            scope="col"
            className="hidden w-36 px-4 py-2 font-semibold xl:table-cell"
          >
            Última consulta
          </th>
          <th scope="col" className="w-32 px-4 py-2 font-semibold">
            Pendências
          </th>
          <th scope="col" className="w-14 px-4 py-2 font-semibold lg:w-32">
            <span className="sr-only lg:not-sr-only">Ação</span>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border-subtle">
        {items.map((patient) => (
          <tr
            key={patient.id}
            className="transition-colors hover:bg-surface-app"
          >
            <td className="min-w-0 px-5 py-3">
              <Link
                to={`/pacientes/${patient.id}`}
                className="block truncate text-body font-semibold text-ink-primary hover:text-accent-ink hover:underline"
              >
                {patient.name}
              </Link>
              <p className="flex min-w-0 gap-x-3 text-label text-ink-secondary">
                <span className="shrink-0">
                  {ageLabel(patient.age) ?? "Idade não informada"}
                </span>
                <span className="truncate xl:hidden">
                  <a
                    href={`tel:${phoneDigits(patient.phone)}`}
                    className="font-mono hover:text-ink-primary hover:underline"
                  >
                    {patient.phone}
                  </a>
                </span>
              </p>
            </td>
            <td className="hidden px-4 py-3 xl:table-cell">
              <a
                href={`tel:${phoneDigits(patient.phone)}`}
                className="font-mono text-body whitespace-nowrap text-ink-secondary hover:text-ink-primary hover:underline"
              >
                {patient.phone}
              </a>
            </td>
            <td className="px-4 py-3 font-mono text-label whitespace-nowrap text-ink-primary">
              <VisitDate value={patient.nextVisitAt} />
            </td>
            <td className="hidden px-4 py-3 font-mono text-label whitespace-nowrap text-ink-secondary xl:table-cell">
              <VisitDate value={patient.lastVisitAt} />
            </td>
            <td className="px-4 py-3">
              <PendencyBadge count={patient.openTasksCount} />
            </td>
            <td className="px-4 py-3 text-right">
              <ButtonLink
                to={`/pacientes/${patient.id}`}
                variant="ghost"
                size="sm"
                aria-label={`Abrir ficha de ${patient.name}`}
                className="max-lg:size-8 max-lg:px-0"
              >
                <span className="max-lg:hidden">Abrir ficha</span>
                <ChevronRight aria-hidden="true" />
              </ButtonLink>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Celular: uma linha larga por paciente, dentro do mesmo painel (cartão dentro
 * de cartão só repete borda). O nome é o link e cobre a linha inteira.
 */
function PatientsCards({ items }: { items: PatientListItem[] }) {
  return (
    <ul className="divide-y divide-border-subtle md:hidden">
      {items.map((patient) => (
        <li key={patient.id}>
          <article className="relative px-4 py-3 transition-colors active:bg-surface-app">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={`/pacientes/${patient.id}`}
                  className="block text-card font-semibold text-ink-primary after:absolute after:inset-0 after:content-['']"
                >
                  {patient.name}
                </Link>
                <p className="text-label text-ink-secondary">
                  {ageLabel(patient.age) ?? "Idade não informada"}
                </p>
              </div>
              <PendencyBadge count={patient.openTasksCount} hideZero />
            </div>
            <dl className="mt-1 grid grid-cols-2 gap-x-4 text-label">
              <div>
                <dt className="text-ink-tertiary">Telefone</dt>
                <dd>
                  <a
                    href={`tel:${phoneDigits(patient.phone)}`}
                    className="relative z-10 inline-flex min-h-11 items-center font-mono text-label whitespace-nowrap text-ink-primary underline underline-offset-4"
                  >
                    {patient.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-ink-tertiary">Próxima consulta</dt>
                <dd className="flex min-h-11 items-center font-mono text-label whitespace-nowrap text-ink-primary">
                  <VisitDate value={patient.nextVisitAt} />
                </dd>
              </div>
            </dl>
          </article>
        </li>
      ))}
    </ul>
  );
}

function VisitDate({ value }: { value: string | null }) {
  if (!value) return <span className="text-ink-tertiary">—</span>;
  return <>{formatDate(value)}</>;
}

function PendencyBadge({
  count,
  hideZero = false,
}: {
  count: number;
  hideZero?: boolean;
}) {
  if (count === 0) {
    return hideZero ? null : (
      <span className="text-label text-ink-tertiary">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Nenhuma pendência</span>
      </span>
    );
  }
  return (
    <Badge tone="warning">{plural(count, "pendência", "pendências")}</Badge>
  );
}

function PatientsEmpty({
  search,
  scope,
  onClear,
}: {
  search: string;
  scope: Scope;
  onClear: () => void;
}) {
  if (search) {
    return (
      <EmptyState
        icon={Search}
        title={`Nenhum paciente com “${search}”`}
        description={
          scope === "pendencias"
            ? "A busca está limitada a quem tem pendência aberta. Tire o filtro ou confira a grafia."
            : "Confira a grafia, ou busque pelo telefone ou CPF. Se for a primeira visita, cadastre agora."
        }
        action={
          <>
            <ButtonLink to="/pacientes/novo">
              <UserPlus aria-hidden="true" />
              Cadastrar paciente
            </ButtonLink>
            <Button variant="secondary" onClick={onClear}>
              Limpar busca
            </Button>
          </>
        }
      />
    );
  }
  if (scope === "pendencias") {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum paciente com pendência aberta"
        description="Retornos a agendar, confirmações e documentos em falta aparecem aqui quando surgirem."
        action={
          <Button variant="secondary" onClick={onClear}>
            Ver todos os pacientes
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      icon={Users}
      title="Nenhum paciente cadastrado"
      description="Cadastre o primeiro paciente com nome e telefone para começar a agendar consultas."
      action={
        <ButtonLink to="/pacientes/novo">
          <UserPlus aria-hidden="true" />
          Novo paciente
        </ButtonLink>
      }
    />
  );
}

function ExportButton({ query }: { query: ListPatientsQuery }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      loading={busy}
      className="max-sm:hidden"
      onClick={async () => {
        setBusy(true);
        try {
          await downloadPatientsCsv(query);
        } catch (error) {
          toast.push({
            tone: "error",
            title: "A exportação falhou",
            description: errorMessage(error),
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      <Download aria-hidden="true" />
      Exportar CSV
    </Button>
  );
}
