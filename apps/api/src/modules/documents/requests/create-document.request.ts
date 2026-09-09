import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import { z } from "zod";

export const CreateDocumentSchema = z.object({
  objectKey: z
    .string({ required_error: "objectKey é obrigatório." })
    .trim()
    .min(1, "objectKey não pode ser vazio."),
  patientId: z.string().uuid("ID do paciente inválido."),
  appointmentId: z.string().uuid("ID da consulta inválido.").optional(),
  fileName: z
    .string({ required_error: "fileName é obrigatório." })
    .trim()
    .min(1, "Nome do arquivo não pode ser vazio.")
    .max(180, "Nome do arquivo deve ter no máximo 180 caracteres."),
  type: z.nativeEnum(DocumentType).optional(),
  source: z.string().trim().max(120).optional(),
});

export type CreateDocument = z.infer<typeof CreateDocumentSchema>;

export class CreateDocumentRequest implements CreateDocument {
  @ApiProperty({ example: "documents/2026-09/018f....pdf" })
  objectKey!: string;

  @ApiProperty()
  patientId!: string;

  @ApiPropertyOptional({
    description: "Vincula também a uma consulta",
  })
  appointmentId?: string;

  @ApiProperty({ example: "Hemograma completo.pdf" })
  fileName!: string;

  @ApiPropertyOptional({
    enum: DocumentType,
    description: "Se omitido, é classificado pelo nome do arquivo.",
  })
  type?: DocumentType;

  @ApiPropertyOptional({ example: "Laboratório São Lucas" })
  source?: string;
}
