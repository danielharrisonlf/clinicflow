import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const CalendarQuerySchema = z.object({
  from: z
    .string()
    .regex(DATE_PATTERN, { message: "from deve estar no formato AAAA-MM-DD." }),
  to: z
    .string()
    .regex(DATE_PATTERN, { message: "to deve estar no formato AAAA-MM-DD." }),
  professionalId: z.string().uuid().optional(),
});

export type CalendarQuery = z.infer<typeof CalendarQuerySchema>;

export class CalendarQueryRequest implements CalendarQuery {
  @ApiProperty({
    description: "Início do período (AAAA-MM-DD)",
    example: "2026-09-07",
  })
  from!: string;

  @ApiProperty({
    description: "Fim do período (AAAA-MM-DD, máximo 31 dias)",
    example: "2026-09-13",
  })
  to!: string;

  @ApiPropertyOptional({
    description: "Filtrar por profissional específico",
    example: "0191e4a1-0000-7000-8000-000000000002",
  })
  professionalId?: string;
}
