import { ApiPropertyOptional } from "@nestjs/swagger";
import { AppointmentStatus, AppointmentType } from "@prisma/client";
import { z } from "zod";
import { ZodRequest } from "../../../common/decorators/zod-request.decorator";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";

export const ListAppointmentsQuerySchema = z.object({
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  professionalId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  // Aceita `?status=A` ou `?status=A&status=B` (mesma convenção de /tasks).
  status: z.preprocess(
    (val) => (Array.isArray(val) ? val : val ? [val] : undefined),
    z.array(z.nativeEnum(AppointmentStatus)).optional(),
  ),
  derivedState: z.enum(["ATRASADA", "NAO_COMPARECEU"]).optional(),
  type: z.nativeEnum(AppointmentType).optional(),
  search: z.string().trim().optional(),
  page: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).max(100).default(20),
  ),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

export type ListAppointmentsQuery = z.infer<typeof ListAppointmentsQuerySchema>;

/**
 * Validada pelo schema do Zod no controller; `@ZodRequest()` impede o pipe
 * global de reaplicar o class-validator herdado de `PageOptionsDto` e faz o
 * pipe do Zod devolver uma instância (com `skip` e `direction`).
 */
@ZodRequest()
export class ListAppointmentsQueryRequest
  extends PageOptionsDto
  implements ListAppointmentsQuery
{
  @ApiPropertyOptional({
    description: "Filtrar por dia específico (AAAA-MM-DD)",
    example: "2026-09-11",
  })
  date?: string;

  @ApiPropertyOptional({ description: "Início do intervalo (AAAA-MM-DD)" })
  from?: string;

  @ApiPropertyOptional({ description: "Fim do intervalo (AAAA-MM-DD)" })
  to?: string;

  @ApiPropertyOptional({ description: "Filtrar por profissional" })
  professionalId?: string;

  @ApiPropertyOptional({ description: "Filtrar por paciente" })
  patientId?: string;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    isArray: true,
    description: "Filtrar por status (repita o parâmetro para vários)",
  })
  status?: AppointmentStatus[];

  @ApiPropertyOptional({
    enum: ["ATRASADA", "NAO_COMPARECEU"],
    description: "Filtro de estado derivado do painel",
  })
  derivedState?: "ATRASADA" | "NAO_COMPARECEU";

  @ApiPropertyOptional({
    enum: AppointmentType,
    description: "Tipo de consulta",
  })
  type?: AppointmentType;

  @ApiPropertyOptional({
    enum: ["asc", "desc"],
    default: "asc",
    description: "Ordenação cronológica",
  })
  override get direction(): "asc" | "desc" {
    return super.direction;
  }

  override set direction(value: "asc" | "desc") {
    super.direction = value;
  }
}
