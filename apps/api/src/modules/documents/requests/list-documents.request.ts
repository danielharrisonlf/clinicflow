import { ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import { z } from "zod";
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
