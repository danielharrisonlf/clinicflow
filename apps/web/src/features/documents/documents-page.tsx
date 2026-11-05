import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { FileText, FileUp, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, SelectField } from "@/components/ui/field";
import { Overlay } from "@/components/ui/overlay";
import { PageHeader } from "@/components/ui/page";
import { clampPage, Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/ui/states";
import { Panel } from "@/components/ui/surface";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/client";
import { documentsApi } from "@/lib/api/endpoints";
import {
  DOCUMENT_TYPE,
  type DocumentItem,
  type DocumentType,
  type ListDocumentsQuery,
} from "@/lib/api/types";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { plural } from "@/lib/utils";
import { DOCUMENT_TYPE_LABEL } from "../appointments/labels";
import { useAuth } from "../auth/auth-context";
import { DocumentPreview } from "./document-preview";
import { DocumentRow } from "./document-row";
import { DocumentUpload } from "./document-upload";

const PAGE_SIZE = 15;

function isDocumentType(value: string | null): value is DocumentType {
  return (
    Boolean(value) &&
    (DOCUMENT_TYPE as readonly string[]).includes(value as string)
  );
}

export function DocumentsPage() {
  const { user } = useAuth();
  const canDelete = user?.role === "GESTOR";
  const [params, setParams] = useSearchParams();
  const urlSearch = params.get("busca") ?? "";
  const rawType = params.get("tipo");
  const type = isDocumentType(rawType) ? rawType : undefined;
  const page = Math.max(1, Number(params.get("pagina") ?? "1") || 1);

  const [term, setTerm] = useState(urlSearch);
  const debounced = useDebounced(term.trim());
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);
  const [preview, setPreview] = useState<DocumentItem | null>(null);

  function update(next: {
    busca?: string;
    tipo?: DocumentType | "";
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
        if (next.tipo !== undefined) put("tipo", next.tipo, "");
        // Mudou o recorte: volta para a página 1.
        if (next.pagina !== undefined) put("pagina", String(next.pagina), "1");
        else search.delete("pagina");
        return search;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (debounced !== urlSearch) update({ busca: debounced });
  }, [debounced]);

  useEffect(() => {
    setTerm((current) => (current.trim() === urlSearch ? current : urlSearch));
  }, [urlSearch]);

  const query: ListDocumentsQuery = {
    page,
    limit: PAGE_SIZE,
    search: urlSearch || undefined,
    type,
  };
  const documents = useQuery({
    queryKey: qk.documents.list(query),
    queryFn: () => documentsApi.list(query),
    placeholderData: keepPreviousData,
  });

  const meta = documents.data?.meta;
  useEffect(() => {
    if (!meta || documents.isPlaceholderData) return;
    const clamped = clampPage(page, meta);
    if (clamped !== page && clamped >= 1) update({ pagina: clamped });
  }, [meta, page, documents.isPlaceholderData]);

  const filtered = Boolean(urlSearch || type);

  return (
    <>
      <PageHeader
        title="Documentos"
        description={
          meta
            ? filtered
              ? plural(
                  meta.itemCount,
                  "documento encontrado",
                  "documentos encontrados",
                )
              : "Exames, atestados e encaminhamentos vinculados à ficha do paciente."
            : "Exames, atestados e encaminhamentos vinculados à ficha do paciente."
        }
        actions={
          <Button
            onClick={() => {
              setPreview(null);
              setUploading(true);
            }}
          >
            <FileUp aria-hidden="true" />
            Enviar documento
          </Button>
        }
      />

      <Panel aria-label="Lista de documentos">
        <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 sm:flex-row sm:items-end md:px-5">
          <Field
            label="Buscar documento"
            hideLabel
            type="search"
            autoComplete="off"
            placeholder="Nome do arquivo ou do paciente"
            icon={<Search />}
            containerClassName="min-w-0 sm:max-w-md sm:flex-1"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
          <SelectField
            label="Tipo de documento"
            hideLabel
            containerClassName="sm:w-56"
            value={type ?? ""}
            onChange={(event) =>
              update({ tipo: event.target.value as DocumentType | "" })
            }
          >
            <option value="">Todos os tipos</option>
            {DOCUMENT_TYPE.map((value) => (
              <option key={value} value={value}>
                {DOCUMENT_TYPE_LABEL[value]}
              </option>
            ))}
          </SelectField>
          {filtered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTerm("");
                update({ busca: "", tipo: "" });
              }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </div>

        {term.trim() !== urlSearch ||
        (documents.isFetching && documents.isPlaceholderData) ? (
          <p
            role="status"
            className="border-b border-border-subtle px-4 py-1.5 text-label text-ink-secondary md:px-5"
          >
            Atualizando resultados…
          </p>
        ) : null}

        {documents.isPending ? (
          <RowsSkeleton rows={7} />
        ) : documents.isError ? (
          <ErrorState
            error={documents.error}
            onRetry={() => void documents.refetch()}
          />
        ) : documents.data.data.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={Search}
              title={
                urlSearch
                  ? `Nenhum documento com “${urlSearch}”`
                  : `Nenhum documento do tipo ${DOCUMENT_TYPE_LABEL[type as DocumentType].toLowerCase()}`
              }
              description="A busca olha o nome do arquivo e o nome do paciente. Confira a grafia ou tire o filtro de tipo."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTerm("");
                    update({ busca: "", tipo: "" });
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="Nenhum documento ainda"
              description="Exames e atestados que o paciente trouxer ou mandar por WhatsApp entram aqui, vinculados à ficha."
              action={
                <Button onClick={() => setUploading(true)}>
                  <FileUp aria-hidden="true" />
                  Enviar o primeiro documento
                </Button>
              }
            />
          )
        ) : (
          <>
            <ul className="divide-y divide-border-subtle">
              {documents.data.data.map((doc) => (
                <li key={doc.id}>
                  <DocumentRow
                    doc={doc}
                    opening={false}
                    onOpen={() => {
                      setUploading(false);
                      setToDelete(null);
                      setPreview(doc);
                    }}
                    onDelete={
                      canDelete
                        ? () => {
                            setPreview(null);
                            setToDelete(doc);
                          }
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
            <Pagination
              meta={documents.data.meta}
              unit="documentos"
              fetching={documents.isFetching && documents.isPlaceholderData}
              onChange={(next) => update({ pagina: next })}
            />
          </>
        )}
      </Panel>

      <DocumentPreview doc={preview} onClose={() => setPreview(null)} />
      <DocumentUpload open={uploading} onClose={() => setUploading(false)} />
      {canDelete ? (
        <DeleteDialog doc={toDelete} onClose={() => setToDelete(null)} />
      ) : null}
    </>
  );
}

/** Exclusão só para gestão, com confirmação: some da ficha para todo mundo. */
function DeleteDialog({
  doc,
  onClose,
}: {
  doc: DocumentItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.documents.all });
      void queryClient.invalidateQueries({ queryKey: qk.patients.all });
      toast.push({
        tone: "success",
        title: "Documento excluído",
        description: doc?.fileName,
      });
      onClose();
    },
  });

  return (
    <Overlay
      open={Boolean(doc)}
      onClose={() => {
        if (!remove.isPending) {
          remove.reset();
          onClose();
        }
      }}
      role="alertdialog"
      size="sm"
      initialFocus="container"
      title="Excluir documento?"
      description={
        doc ? `“${doc.fileName}”, da ficha de ${doc.patientName}.` : undefined
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={remove.isPending}
            className="max-sm:h-11"
          >
            Manter documento
          </Button>
          <Button
            variant="destructive"
            loading={remove.isPending}
            onClick={() => doc && remove.mutate(doc.id)}
            className="max-sm:h-11"
          >
            Excluir documento
          </Button>
        </>
      }
    >
      <p className="text-body text-ink-secondary">
        O documento sai da ficha e da lista para toda a equipe. O arquivo fica
        guardado por 30 dias antes de ser apagado de vez.
      </p>
      {remove.isError ? (
        <Callout
          tone="danger"
          live
          title="O documento não foi excluído"
          className="mt-4"
        >
          {errorMessage(remove.error)}
        </Callout>
      ) : null}
    </Overlay>
  );
}
