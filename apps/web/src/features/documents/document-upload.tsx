import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Search, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, FieldShell, SelectField } from "@/components/ui/field";
import { Overlay } from "@/components/ui/overlay";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { ApiError, errorMessage } from "@/lib/api/client";
import { documentsApi, patientsApi } from "@/lib/api/endpoints";
import {
  DOCUMENT_TYPE,
  type DocumentItem,
  type DocumentType,
} from "@/lib/api/types";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_LABEL } from "../appointments/labels";
import { useOpenDocument } from "./use-open-document";

/** Mesmos limites do `POST /uploads/sign`. */
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};
const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

interface PatientRef {
  id: string;
  name: string;
}

function sizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

/** Tipo efetivo: o navegador às vezes não informa (`""`) e a extensão decide. */
function mimeOf(file: File): string {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[extension] ?? "";
}

function fileProblem(file: File): string | null {
  if (!ACCEPTED[mimeOf(file)]) {
    return `“${file.name}” não é um formato aceito. Envie PDF, JPEG, PNG ou WebP — foto de celular em HEIC precisa ser convertida antes.`;
  }
  if (file.size > MAX_BYTES) {
    return `O arquivo tem ${sizeLabel(file.size)}; o limite é 10 MB. Reduza a resolução da foto ou divida o PDF.`;
  }
  if (file.size === 0)
    return "O arquivo está vazio. Escolha o arquivo de novo.";
  return null;
}

/** Erros do envio, com o que fazer em seguida. */
function uploadErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return errorMessage(error);
  switch (error.code) {
    case "UNSUPPORTED_MIME":
      return "O servidor recusou o formato. Envie PDF, JPEG, PNG ou WebP.";
    case "FILE_TOO_LARGE":
      return "O arquivo passa de 10 MB. Reduza a resolução ou divida o PDF.";
    case "UPLOAD_FAILED":
      return "Os bytes não chegaram ao armazenamento. Verifique a rede e envie de novo.";
    case "UPLOAD_NOT_FOUND":
      return "O armazenamento não confirmou o arquivo. Envie de novo.";
    case "RESOURCE_NOT_FOUND":
      return "O paciente escolhido não existe mais. Escolha outro paciente.";
    default:
      return error.message;
  }
}

/**
 * Diálogo de envio de documento, usado na tela de Documentos e na ficha do
 * paciente (com o paciente já preenchido). O envio é em três passos —
 * assinatura, bytes direto no storage, registro — e o `documentsApi.upload`
 * cuida da sequência.
 */
export function DocumentUpload({
  open,
  onClose,
  patient,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  /** Ficha do paciente: o vínculo já vem decidido. */
  patient?: PatientRef;
  onUploaded?: (doc: DocumentItem) => void;
}) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="Enviar documento"
      description={
        patient
          ? `Vai para a ficha de ${patient.name}.`
          : "Exame, atestado, laudo ou encaminhamento do paciente."
      }
    >
      {/* Montado só aberto: fechar descarta o rascunho e o próximo começa limpo. */}
      <UploadForm patient={patient} onClose={onClose} onUploaded={onUploaded} />
    </Overlay>
  );
}

function UploadForm({
  patient: fixedPatient,
  onClose,
  onUploaded,
}: {
  patient?: PatientRef;
  onClose: () => void;
  onUploaded?: (doc: DocumentItem) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { open: openDocument } = useOpenDocument();
  const fileId = useId();

  const [patient, setPatient] = useState<PatientRef | null>(
    fixedPatient ?? null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType | "">("");
  const [source, setSource] = useState("");
  const [errors, setErrors] = useState<{ patient?: string; file?: string }>({});
  const [dragging, setDragging] = useState(false);

  const upload = useMutation({
    mutationFn: () => {
      if (!file || !patient) throw new Error("incompleto");
      return documentsApi.upload(file, {
        patientId: patient.id,
        type: type || undefined,
        source: source.trim() || undefined,
      });
    },
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: qk.documents.all });
      void queryClient.invalidateQueries({ queryKey: qk.patients.all });
      toast.push({
        tone: "success",
        title: "Documento enviado",
        description: `${doc.fileName} — ${doc.typeLabel}, ficha de ${doc.patientName}`,
        action: { label: "Abrir", onClick: () => void openDocument(doc) },
      });
      onUploaded?.(doc);
      onClose();
    },
  });

  function pick(next: File | null | undefined) {
    if (!next) return;
    const problem = fileProblem(next);
    setErrors((current) => ({ ...current, file: problem ?? undefined }));
    setFile(problem ? null : next);
    upload.reset();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = {
      patient: patient ? undefined : "Escolha o paciente dono do documento.",
      file: file ? undefined : (errors.file ?? "Escolha o arquivo a enviar."),
    };
    setErrors(found);
    if (found.patient || found.file) return;
    upload.mutate();
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4"
      aria-busy={upload.isPending || undefined}
    >
      {fixedPatient ? null : (
        <PatientPicker
          value={patient}
          error={errors.patient}
          disabled={upload.isPending}
          onChange={(next) => {
            setPatient(next);
            if (next)
              setErrors((current) => ({ ...current, patient: undefined }));
          }}
        />
      )}

      <FieldShell
        id={fileId}
        label="Arquivo"
        required
        error={errors.file}
        hint="PDF, JPEG, PNG ou WebP, até 10 MB."
      >
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-raised border border-dashed px-4 py-4 text-center transition-colors",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-ink",
            errors.file ? "border-danger" : "border-border-strong",
            dragging
              ? "border-accent bg-accent-weak"
              : "bg-surface-app hover:border-accent",
          )}
        >
          <input
            id={fileId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={upload.isPending}
            aria-invalid={errors.file ? true : undefined}
            aria-describedby={
              errors.file ? `${fileId}-error` : `${fileId}-hint`
            }
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <FileUp className="size-5 text-ink-secondary" aria-hidden="true" />
          {file ? (
            <>
              <span className="max-w-full truncate text-body font-semibold text-ink-primary">
                {file.name}
              </span>
              <span className="font-mono tabular-nums text-label text-ink-secondary">
                {sizeLabel(file.size)} — clique para trocar
              </span>
            </>
          ) : (
            <>
              <span className="text-body font-semibold text-ink-primary">
                Escolher arquivo
              </span>
              <span className="text-label text-ink-secondary pointer-coarse:hidden">
                ou arraste para cá
              </span>
            </>
          )}
        </label>
      </FieldShell>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label="Tipo"
          hint="Sem escolha, o sistema deduz pelo nome do arquivo."
          value={type}
          disabled={upload.isPending}
          onChange={(event) => setType(event.target.value as DocumentType | "")}
        >
          <option value="">Detectar automaticamente</option>
          {DOCUMENT_TYPE.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_TYPE_LABEL[value]}
            </option>
          ))}
        </SelectField>
        <Field
          label="Origem"
          placeholder="Laboratório, médico, WhatsApp"
          maxLength={120}
          hint="Opcional. Quem mandou o documento."
          value={source}
          disabled={upload.isPending}
          onChange={(event) => setSource(event.target.value)}
        />
      </div>

      {upload.isError ? (
        <Callout tone="danger" live title="O documento não foi enviado">
          {uploadErrorMessage(upload.error)}
        </Callout>
      ) : null}

      <div className="flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={upload.isPending}
          className="max-sm:h-11"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={upload.isPending}
          className="max-sm:h-11"
        >
          {upload.isPending ? "Enviando…" : "Enviar documento"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Busca de paciente em combobox (padrão WAI-ARIA com lista): setas navegam e
 * Enter escolhe. Escolhido, vira uma linha com "Trocar".
 */
function PatientPicker({
  value,
  onChange,
  error,
  disabled,
}: {
  value: PatientRef | null;
  onChange: (patient: PatientRef | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const search = useDebounced(term.trim());
  const query = { search, limit: 6, orderBy: "name", order: "ASC" as const };
  const results = useQuery({
    queryKey: qk.patients.list(query),
    queryFn: () => patientsApi.list(query),
    enabled: search.length >= 2 && !value,
  });
  const items = results.data?.data ?? [];
  const showList = expanded && search.length >= 2 && !value;

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold text-ink-secondary">Paciente</p>
        <div className="flex h-10 items-center justify-between gap-2 rounded-control border border-border-default bg-surface-app pr-1 pl-3">
          <span className="min-w-0 truncate text-body font-semibold text-ink-primary">
            {value.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={`Trocar paciente (${value.name})`}
            onClick={() => {
              onChange(null);
              setTerm("");
            }}
          >
            <X aria-hidden="true" />
            Trocar
          </Button>
        </div>
      </div>
    );
  }

  function choose(index: number) {
    const item = items[index];
    if (!item) return;
    onChange({ id: item.id, name: item.name });
    setExpanded(false);
  }

  return (
    <div className="relative">
      <Field
        label="Paciente"
        required
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={
          showList && items[active] ? `${listId}-${active}` : undefined
        }
        autoComplete="off"
        placeholder="Nome, CPF ou telefone"
        icon={<Search />}
        suffix={results.isFetching ? <Spinner className="size-4" /> : undefined}
        error={error}
        hint={search.length < 2 ? "Digite ao menos 2 letras." : undefined}
        disabled={disabled}
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setActive(0);
          setExpanded(true);
        }}
        onFocus={() => setExpanded(true)}
        onBlur={() => window.setTimeout(() => setExpanded(false), 120)}
        onKeyDown={(event) => {
          if (!showList) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => Math.min(current + 1, items.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            choose(active);
          } else if (event.key === "Escape") {
            // Fecha só a lista; o diálogo de envio continua aberto.
            event.preventDefault();
            setExpanded(false);
          }
        }}
      />
      {showList ? (
        <div className="mt-1 max-h-60 overflow-y-auto rounded-raised border border-border-default bg-surface-base py-1 shadow-raised">
          {items.length > 0 ? (
            <div id={listId} role="listbox" aria-label="Pacientes encontrados">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  onKeyDown={() => {}}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 pointer-coarse:min-h-11",
                    index === active
                      ? "bg-accent-weak"
                      : "hover:bg-surface-hover",
                  )}
                >
                  <span className="min-w-0 truncate text-body font-semibold text-ink-primary">
                    {item.name}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-label text-ink-secondary">
                    {item.phone}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p
              role="status"
              className={cn(
                "px-3 py-2 text-label",
                results.isError ? "text-danger" : "text-ink-secondary",
              )}
            >
              {results.isPending
                ? "Buscando…"
                : results.isError
                  ? errorMessage(results.error)
                  : `Nenhum paciente com “${search}”. Cadastre em Pacientes antes de enviar.`}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
