import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export const UpdateProfessionalSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  specialty: z.string().trim().min(1).max(80).optional(),
  councilType: z.string().trim().min(1).max(10).optional(),
  councilNumber: z.string().trim().min(1).max(30).optional(),
  defaultDurationMinutes: z.number().int().min(5).max(480).optional(),
  userId: z.string().uuid().nullable().optional(),
});

export type UpdateProfessional = z.infer<typeof UpdateProfessionalSchema>;

export class UpdateProfessionalRequest implements UpdateProfessional {
  @ApiPropertyOptional({ example: "Helena Prado" })
  name?: string;

  @ApiPropertyOptional({ example: "Clínica Geral" })
  specialty?: string;

  @ApiPropertyOptional({
    example: "CRM",
    description: "Conselho: CRM, CRP, CRN, CREFITO…",
  })
  councilType?: string;

  @ApiPropertyOptional({ example: "142.890" })
  councilNumber?: string;

  @ApiPropertyOptional({ example: 30 })
  defaultDurationMinutes?: number;

  @ApiPropertyOptional({
    description: "Vincula a um acesso existente do sistema",
  })
  userId?: string | null;
}
