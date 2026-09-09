import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const RescheduleAppointmentSchema = z.object({
  date: z
    .string()
    .regex(DATE_PATTERN, { message: "Data deve estar no formato AAAA-MM-DD." }),
  time: z
    .string()
    .regex(TIME_PATTERN, { message: "Hora deve estar no formato HH:mm." }),
  reason: z
    .string()
    .min(3, "Motivo deve ter no mínimo 3 caracteres.")
    .max(500, "Motivo deve ter no máximo 500 caracteres."),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  allowOverbooking: z.boolean().optional(),
});

export type RescheduleAppointment = z.infer<typeof RescheduleAppointmentSchema>;

export class RescheduleAppointmentRequest implements RescheduleAppointment {
  @ApiProperty({
    description: "Nova data da consulta (AAAA-MM-DD)",
    example: "2026-09-15",
  })
  date!: string;

  @ApiProperty({ description: "Novo horário (HH:mm)", example: "14:00" })
  time!: string;

  @ApiProperty({
    description: "Motivo do reagendamento (obrigatório para auditoria)",
    example:
      "Paciente viajou a trabalho e pediu remarcação para a próxima semana.",
  })
  reason!: string;

  @ApiPropertyOptional({
    description: "Duração personalizada em minutos",
    example: 30,
  })
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: "Permitir encaixe sobre outro horário",
    default: false,
  })
  allowOverbooking?: boolean;
}
