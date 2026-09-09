import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaskType } from "@prisma/client";
import { z } from "zod";

export const CreateTaskSchema = z.object({
  patientId: z.string().uuid("ID do paciente inválido."),
  appointmentId: z.string().uuid("ID da consulta inválido.").optional(),
  type: z.nativeEnum(TaskType, {
    errorMap: () => ({ message: "Tipo de tarefa inválido." }),
  }),
  title: z
    .string({ required_error: "Título é obrigatório." })
    .trim()
    .min(1, "Título não pode ser vazio.")
    .max(200, "Título deve ter no máximo 200 caracteres."),
  dueAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  notes: z
    .string()
    .max(1000, "Observações devem ter no máximo 1000 caracteres.")
    .optional(),
});

export type CreateTask = z.infer<typeof CreateTaskSchema>;

export class CreateTaskRequest implements CreateTask {
  @ApiProperty()
  patientId!: string;

  @ApiPropertyOptional()
  appointmentId?: string;

  @ApiProperty({ enum: TaskType })
  type!: TaskType;

  @ApiProperty({ example: "Retorno 30 dias após ajuste medicamentoso" })
  title!: string;

  @ApiPropertyOptional({ example: "2026-09-15" })
  dueAt?: string;

  @ApiPropertyOptional()
  notes?: string;
}
