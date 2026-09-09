import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const CheckAvailabilitySchema = z.object({
  professionalId: z.string().uuid("professionalId deve ser um UUID válido."),
  date: z
    .string()
    .regex(DATE_PATTERN, { message: "date deve estar no formato AAAA-MM-DD." }),
  time: z
    .string()
    .regex(TIME_PATTERN, { message: "time deve estar no formato HH:mm." }),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  excludeAppointmentId: z.string().uuid().optional(),
});

export type CheckAvailability = z.infer<typeof CheckAvailabilitySchema>;

export class CheckAvailabilityRequest implements CheckAvailability {
  @ApiProperty({ description: "ID do profissional" })
  professionalId!: string;

  @ApiProperty({
    description: "Data consultada (AAAA-MM-DD)",
    example: "2026-09-12",
  })
  date!: string;

  @ApiProperty({ description: "Hora de início (HH:mm)", example: "14:30" })
  time!: string;

  @ApiPropertyOptional({
    description: "Duração personalizada em minutos",
    example: 30,
  })
  durationMinutes?: number;

  @ApiPropertyOptional({
    description:
      "ID de consulta a excluir da checagem (útil em reagendamentos)",
  })
  excludeAppointmentId?: string;
}
