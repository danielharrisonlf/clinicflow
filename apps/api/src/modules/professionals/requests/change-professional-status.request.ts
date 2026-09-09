import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const ChangeProfessionalStatusSchema = z.object({
  isActive: z.boolean({ required_error: "isActive é obrigatório." }),
});

export type ChangeProfessionalStatus = z.infer<
  typeof ChangeProfessionalStatusSchema
>;

export class ChangeProfessionalStatusRequest
  implements ChangeProfessionalStatus
{
  @ApiProperty({ description: "Novo status ativo/inativo" })
  isActive!: boolean;
}
