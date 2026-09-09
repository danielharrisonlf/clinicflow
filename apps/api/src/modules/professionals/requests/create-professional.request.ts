import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export const CreateProfessionalSchema = z.object({
  name: z
    .string({ required_error: "Nome é obrigatório." })
    .trim()
    .min(1, "Nome não pode ser vazio.")
    .max(120, "Nome deve ter no máximo 120 caracteres."),
  specialty: z
    .string({ required_error: "Especialidade é obrigatória." })
    .trim()
    .min(1, "Especialidade não pode ser vazia.")
    .max(80),
  councilType: z
    .string({ required_error: "Tipo de conselho é obrigatório." })
    .trim()
    .min(1, "Tipo de conselho não pode ser vazio.")
    .max(10),
  councilNumber: z
    .string({ required_error: "Número do conselho é obrigatório." })
    .trim()
    .min(1, "Número do conselho não pode ser vazio.")
    .max(30),
  defaultDurationMinutes: z
    .number()
    .int()
    .min(5, "Duração mínima é de 5 minutos.")
    .max(480, "Duração máxima é de 480 minutos.")
    .optional(),
  userId: z.string().uuid("ID de usuário inválido.").optional(),
});

export type CreateProfessional = z.infer<typeof CreateProfessionalSchema>;

export class CreateProfessionalRequest implements CreateProfessional {
  @ApiProperty({ example: "Helena Prado" })
  name!: string;

  @ApiProperty({ example: "Clínica Geral" })
  specialty!: string;

  @ApiProperty({
    example: "CRM",
    description: "Conselho: CRM, CRP, CRN, CREFITO…",
  })
  councilType!: string;

  @ApiProperty({ example: "142.890" })
  councilNumber!: string;

  @ApiPropertyOptional({ example: 30 })
  defaultDurationMinutes?: number;

  @ApiPropertyOptional({
    description: "Vincula a um acesso existente do sistema",
  })
  userId?: string;
}
