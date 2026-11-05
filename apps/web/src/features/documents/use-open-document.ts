import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiError, errorMessage, resolveFileUrl } from "@/lib/api/client";
import { documentsApi } from "@/lib/api/endpoints";

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function mimeFor(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

/** Busca os bytes antes de oferecer visualização ou download. */
export async function loadDocumentBlob(
  doc: { id: string; fileName: string },
  signal?: AbortSignal,
): Promise<Blob> {
  const { url } = await documentsApi.download(doc.id);
  const file = await fetch(resolveFileUrl(url), { signal }).catch((error) => {
    if (signal?.aborted) throw error;
    return null;
  });
  if (!file?.ok) {
    throw new ApiError({
      statusCode: file?.status ?? 0,
      code: file ? "FILE_UNAVAILABLE" : "NETWORK_ERROR",
      message:
        file?.status === 404
          ? "O registro existe, mas o arquivo não está no armazenamento. Peça o documento de novo e envie outra vez."
          : file
            ? "O armazenamento recusou o arquivo. Tente de novo em instantes."
            : "Sem conexão com o armazenamento de arquivos. Verifique a rede e tente de novo.",
      path: "/uploads",
      timestamp: new Date().toISOString(),
    });
  }
  const raw = await file.blob();
  return new Blob([raw], { type: mimeFor(doc.fileName) });
}

/**
 * Abre um documento em nova aba.
 *
 * - A aba nasce no clique, antes de qualquer `await`: depois da resposta da
 *   API o navegador já não considera o gesto e bloqueia o pop-up.
 * - O arquivo é buscado antes de mostrar. Se o registro existe mas os bytes
 *   não (seed sem arquivo, arquivo purgado), a pessoa recebe um aviso que
 *   explica — em vez de uma aba com JSON de erro.
 * - O driver local grava tudo como `application/octet-stream`; o blob ganha o
 *   tipo pela extensão para o PDF e a imagem abrirem na aba, não baixarem.
 */
export function useOpenDocument() {
  const toast = useToast();
  const [openingId, setOpeningId] = useState<string | null>(null);

  async function open(doc: { id: string; fileName: string }) {
    const tab = window.open("", "_blank");
    if (tab) {
      tab.opener = null;
      tab.document.title = doc.fileName;
      tab.document.body.style.font = "15px system-ui, sans-serif";
      tab.document.body.textContent = `Abrindo ${doc.fileName}…`;
    }
    setOpeningId(doc.id);
    try {
      const href = URL.createObjectURL(await loadDocumentBlob(doc));
      window.setTimeout(() => URL.revokeObjectURL(href), 5 * 60_000);
      if (tab && !tab.closed) {
        tab.location.href = href;
      } else {
        // Pop-up bloqueado: o clique no aviso é um gesto novo e pode abrir.
        toast.push({
          tone: "warning",
          title: "O navegador bloqueou a nova aba",
          description: doc.fileName,
          action: {
            label: "Abrir",
            onClick: () => window.open(href, "_blank", "noopener"),
          },
        });
      }
    } catch (error) {
      tab?.close();
      toast.push({
        tone: "error",
        title: "Não foi possível abrir o documento",
        description: errorMessage(error),
      });
    } finally {
      setOpeningId(null);
    }
  }

  return { open, openingId };
}
