import { ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import { z } from "zod";

export const UpdateDocumentSchema = z.object({
  type: z.nativeEnum(DocumentType).optional(),
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().nullable().optional(),
  source: z.string().trim().max(120).nullable().optional(),
});

export type UpdateDocument = z.infer<typeof UpdateDocumentSchema>;

export class UpdateDocumentRequest implements UpdateDocument {
  @ApiPropertyOptional({ enum: DocumentType })
  type?: DocumentType;

  @ApiPropertyOptional()
  patientId?: string;

  @ApiPropertyOptional()
  appointmentId?: string | null;

  @ApiPropertyOptional()
  source?: string | null;
}
