import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Field } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui/states";
import { Panel } from "@/components/ui/surface";
import { documentsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { DOCUMENT_TYPE_LABEL, formatDate } from "../appointments/labels";

export function DocumentsPage() {
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(term);

  const query = { page, limit: 15, search: search || undefined };

  const documents = useQuery({
    queryKey: qk.documents.list(query),
    queryFn: () => documentsApi.list(query),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header>
        <h1 className="text-title-sm font-bold text-ink-primary md:text-title">
          Documentos
        </h1>
        <p className="mt-0.5 text-body text-ink-secondary">
          Exames, atestados e encaminhamentos vinculados ao paciente.
        </p>
      </header>

      <Panel>
        <div className="border-b border-border-subtle p-4">
          <Field
            label="Buscar"
            className="max-w-md"
            placeholder="Nome do arquivo ou paciente"
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

        {documents.isPending ? (
          <RowsSkeleton rows={7} />
        ) : documents.isError ? (
          <ErrorState
            error={documents.error}
            onRetry={() => void documents.refetch()}
          />
        ) : documents.data.data.length === 0 ? (
          <EmptyState
            title={
              search ? "Nenhum arquivo encontrado" : "Nenhum documento ainda"
            }
            description={
              search
                ? `Nada casou com “${search}”.`
                : "Documentos recebidos por WhatsApp entram aqui já catalogados e vinculados à ficha."
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-border-subtle">
              {documents.data.data.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold text-ink-primary">
                      {doc.fileName}
                    </p>
                    <p className="text-micro text-ink-secondary">
                      {doc.patientId && doc.patientName ? (
                        <Link
                          to={`/pacientes/${doc.patientId}`}
                          className="hover:text-accent"
                        >
                          {doc.patientName}
                        </Link>
                      ) : (
                        "Sem paciente vinculado"
                      )}
                    </p>
                  </div>

                  <span className="text-micro text-ink-secondary">
                    {DOCUMENT_TYPE_LABEL[doc.type]}
                  </span>
                  <span className="rounded-marker bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary uppercase">
                    {doc.format}
                  </span>
                  <span className="font-mono text-micro text-ink-tertiary">
                    {doc.sizeLabel}
                  </span>
                  <span className="font-mono text-micro text-ink-tertiary">
                    {formatDate(doc.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
            <Pagination
              meta={documents.data.meta}
              unit="documentos"
              onChange={setPage}
            />
          </>
        )}
      </Panel>
    </div>
  );
}
