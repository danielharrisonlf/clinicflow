import { ExternalLink, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import type { DocumentItem } from "@/lib/api/types";
import { formatDate } from "../appointments/labels";

/**
 * Linha de documento. No balcão a pessoa procura pelo paciente ou pelo nome
 * do arquivo: os dois ficam na coluna de leitura; formato, tamanho e data vão
 * para a linha secundária. Ações à direita; no celular descem e ocupam a largura.
 */
export function DocumentRow({
  doc,
  opening,
  onOpen,
  onDelete,
  showPatient = true,
}: {
  doc: DocumentItem;
  opening: boolean;
  onOpen: () => void;
  onDelete?: () => void;
  showPatient?: boolean;
}) {
  return (
    <article
      aria-label={doc.fileName}
      className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-surface-app sm:flex-row sm:items-center sm:gap-4 md:px-5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Badge tone="outline" className="mt-0.5 w-12 justify-center font-mono">
          {doc.format}
        </Badge>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-body font-semibold text-ink-primary"
            title={doc.fileName}
          >
            {doc.fileName}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-label text-ink-secondary">
            <span>{doc.typeLabel}</span>
            {showPatient ? (
              <Link
                to={`/pacientes/${doc.patientId}`}
                className="font-semibold text-ink-primary hover:text-accent-ink hover:underline"
              >
                {doc.patientName}
              </Link>
            ) : null}
            <span className="font-mono text-ink-tertiary">{doc.sizeLabel}</span>
            <span className="font-mono text-ink-tertiary">
              {formatDate(doc.createdAt)}
            </span>
            {doc.source ? (
              <span className="text-ink-tertiary">Origem: {doc.source}</span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 max-sm:pl-15">
        <Button
          variant="secondary"
          size="sm"
          loading={opening}
          onClick={onOpen}
          aria-label={`Abrir ${doc.fileName}`}
          className="max-sm:h-11 max-sm:flex-1"
        >
          <ExternalLink aria-hidden="true" />
          Abrir
        </Button>
        {onDelete ? (
          <IconButton
            label={`Excluir ${doc.fileName}`}
            variant="destructive-ghost"
            size="icon-sm"
            onClick={onDelete}
            className="max-sm:size-11"
          >
            <Trash2 aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>
    </article>
  );
}
