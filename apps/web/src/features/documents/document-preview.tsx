import { Download, ExternalLink, FileWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Overlay } from "@/components/ui/overlay";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import type { DocumentItem } from "@/lib/api/types";
import { formatDate } from "../appointments/labels";
import { loadDocumentBlob, mimeFor } from "./use-open-document";

type Preview = { id: string; url: string };

/** Prévia contextual; o mesmo arquivo validado serve para abrir ou baixar. */
export function DocumentPreview({
  doc,
  onClose,
}: {
  doc: DocumentItem | null;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!doc) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setPreview(null);
    setError(null);
    void loadDocumentBlob(doc, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ id: doc.id, url: objectUrl });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc, retry]);

  const mime = doc ? mimeFor(doc.fileName) : "";
  const supported = mime === "application/pdf" || mime.startsWith("image/");
  const currentPreview = preview?.id === doc?.id ? preview : null;

  function download() {
    if (!currentPreview || !doc) return;
    const anchor = document.createElement("a");
    anchor.href = currentPreview.url;
    anchor.download = doc.fileName;
    anchor.click();
  }

  return (
    <Overlay
      open={Boolean(doc)}
      onClose={onClose}
      variant="sheet"
      initialFocus="container"
      title={doc?.fileName ?? "Documento"}
      description={
        doc
          ? `${doc.typeLabel} · ${doc.patientName} · ${formatDate(doc.createdAt)}`
          : undefined
      }
      footer={
        currentPreview ? (
          <>
            <Button variant="secondary" onClick={download}>
              <Download aria-hidden="true" />
              Baixar arquivo
            </Button>
            <Button
              onClick={() =>
                window.open(currentPreview.url, "_blank", "noopener,noreferrer")
              }
            >
              <ExternalLink aria-hidden="true" />
              Abrir original
            </Button>
          </>
        ) : undefined
      }
    >
      {!doc ? null : error ? (
        <Callout tone="danger" title="A prévia não carregou" live>
          <p>{errorMessage(error)}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setRetry((value) => value + 1)}
          >
            Tentar novamente
          </Button>
        </Callout>
      ) : !currentPreview ? (
        <div
          className="flex min-h-56 items-center justify-center gap-3 text-body text-ink-secondary"
          role="status"
        >
          <Spinner className="size-5" />
          Carregando documento…
        </div>
      ) : !supported ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center text-ink-secondary">
          <FileWarning aria-hidden="true" className="size-8" />
          <p>Este formato não tem prévia. Abra ou baixe o arquivo.</p>
        </div>
      ) : mime === "application/pdf" ? (
        <iframe
          title={`Prévia de ${doc.fileName}`}
          src={currentPreview.url}
          className="h-[min(65dvh,48rem)] w-full rounded-control border border-border-default bg-surface-app"
        />
      ) : (
        <img
          src={currentPreview.url}
          alt={`Prévia de ${doc.fileName}`}
          className="mx-auto max-h-[65dvh] max-w-full rounded-control border border-border-default object-contain"
        />
      )}
      {doc ? (
        <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border-subtle pt-3 text-label text-ink-secondary">
          <div className="flex gap-1">
            <dt>Formato:</dt>
            <dd className="font-mono">{doc.format}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Tamanho:</dt>
            <dd className="font-mono">{doc.sizeLabel}</dd>
          </div>
          {doc.source ? (
            <div className="flex gap-1">
              <dt>Origem:</dt>
              <dd>{doc.source}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </Overlay>
  );
}
