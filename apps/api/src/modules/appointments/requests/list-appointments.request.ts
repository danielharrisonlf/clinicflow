import { ApiPropertyOptional } from "@nestjs/swagger";
import { AppointmentStatus, AppointmentType } from "@prisma/client";
import { z } from "zod";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";

export const ListAppointmentsQuerySchema = z.object({
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  professionalId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
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
    description: "Filtrar por status",
  })
  status?: AppointmentStatus;

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
