import { ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import { z } from "zod";
import { ZodRequest } from "../../../common/decorators/zod-request.decorator";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";

export const ListDocumentsQuerySchema = z.object({
  page: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).max(100).default(10),
  ),
  type: z.nativeEnum(DocumentType).optional(),
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z.string().trim().optional(),
});

export type ListDocumentsQuery = z.infer<typeof ListDocumentsQuerySchema>;

/**
 * Validada pelo schema do Zod no controller; `@ZodRequest()` impede o pipe
 * global de reaplicar o class-validator herdado de `PageOptionsDto` e faz o
 * pipe do Zod devolver uma instância (com `skip` e `direction`).
 */
@ZodRequest()
export class ListDocumentsQueryRequest
  extends PageOptionsDto
  implements ListDocumentsQuery
{
  @ApiPropertyOptional({ enum: DocumentType })
  type?: DocumentType;

  @ApiPropertyOptional()
  patientId?: string;

  @ApiPropertyOptional()
  appointmentId?: string;

  @ApiPropertyOptional({ example: "2026-08-01" })
  from?: string;

  @ApiPropertyOptional({ example: "2026-09-30" })
  to?: string;
}
