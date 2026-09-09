import { DocumentType, Prisma } from "@prisma/client";
import { DocumentResponseDto } from "./dto/document.dto";

export const TYPE_LABEL: Record<DocumentType, string> = {
  EXAME_LABORATORIAL: "Exame laboratorial",
  EXAME_IMAGEM: "Exame de imagem",
  ATESTADO: "Atestado",
  ENCAMINHAMENTO: "Encaminhamento",
  LAUDO: "Laudo especializado",
  RECEITA: "Receita",
  OUTRO: "Outro",
};

export type DocumentWithPatient = Prisma.DocumentGetPayload<{
  include: { patient: { select: { id: true; name: true } } };
}>;

export function toDocumentResponse(
  document: DocumentWithPatient,
): DocumentResponseDto {
  return {
    id: document.id,
    fileName: document.fileName,
    format: document.fileName.split(".").at(-1)?.toUpperCase() ?? "?",
    type: document.type,
    typeLabel: TYPE_LABEL[document.type],
    patientId: document.patient.id,
    patientName: document.patient.name,
    appointmentId: document.appointmentId,
    byteSize: document.byteSize,
    sizeLabel: formatBytes(document.byteSize),
    source: document.source,
    createdAt: document.createdAt.toISOString(),
  };
}

/** "1,2 MB" / "340 KB" — no formato brasileiro, como está desenhado. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
