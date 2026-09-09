import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const ForgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "E-mail é obrigatório." })
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido."),
});

export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>;

export class ForgotPasswordRequest implements ForgotPassword {
  @ApiProperty({ example: "gestao@clinicaviver.com.br" })
  email!: string;
}
