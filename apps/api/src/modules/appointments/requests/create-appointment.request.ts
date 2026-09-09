import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AppointmentType } from "@prisma/client";
import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const CreateAppointmentSchema = z.object({
  patientId: z.string().uuid("patientId deve ser um UUID válido."),
  professionalId: z.string().uuid("professionalId deve ser um UUID válido."),
  date: z
    .string()
    .regex(DATE_PATTERN, { message: "Data deve estar no formato AAAA-MM-DD." }),
  time: z
    .string()
    .regex(TIME_PATTERN, { message: "Hora deve estar no formato HH:mm." }),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  type: z.nativeEnum(AppointmentType, {
    errorMap: () => ({ message: "Tipo de consulta inválido." }),
  }),
  notes: z.string().max(1000).optional(),
  room: z.string().max(40).optional(),
  allowOverbooking: z.boolean().optional(),
});

export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;

export class CreateAppointmentRequest implements CreateAppointment {
  @ApiProperty({
    description: "ID do paciente",
    example: "0191e4a1-0000-7000-8000-000000000001",
  })
  patientId!: string;

  @ApiProperty({
    description: "ID do profissional",
    example: "0191e4a1-0000-7000-8000-000000000002",
  })
  professionalId!: string;

  @ApiProperty({
    description: "Data da consulta (AAAA-MM-DD no fuso da clínica)",
    example: "2026-09-12",
  })
  date!: string;

  @ApiProperty({ description: "Horário de início (HH:mm)", example: "14:30" })
  time!: string;

  @ApiPropertyOptional({
    description: "Duração em minutos (padrão: duração do profissional)",
    example: 30,
  })
  durationMinutes?: number;

  @ApiProperty({
    enum: AppointmentType,
    description: "Tipo da consulta",
    example: AppointmentType.PRIMEIRA_CONSULTA,
  })
  type!: AppointmentType;

  @ApiPropertyOptional({
    description: "Observações da recepção",
    example: "Trazer exames laboratoriais anteriores",
  })
  notes?: string;

  @ApiPropertyOptional({
    description: "Sala de atendimento",
    example: "Consultório 1",
  })
  room?: string;

  @ApiPropertyOptional({
    description:
      'Encaixe explícito ("Deseja encaixar mesmo assim?"). Registrado em auditoria.',
    default: false,
  })
  allowOverbooking?: boolean;
}
