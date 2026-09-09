import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const ListSlotsQuerySchema = z.object({
  professionalId: z.string().uuid("professionalId deve ser um UUID válido."),
  date: z
    .string()
    .regex(DATE_PATTERN, { message: "date deve estar no formato AAAA-MM-DD." }),
  durationMinutes: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(5).max(480).optional(),
  ),
});

export type ListSlotsQuery = z.infer<typeof ListSlotsQuerySchema>;

export class ListSlotsQueryRequest implements ListSlotsQuery {
  @ApiProperty({ description: "ID do profissional" })
  professionalId!: string;

  @ApiProperty({
    description: "Dia consultado (AAAA-MM-DD)",
    example: "2026-09-12",
  })
  date!: string;

  @ApiPropertyOptional({
    description: "Duração personalizada em minutos",
    example: 30,
  })
  durationMinutes?: number;
}
