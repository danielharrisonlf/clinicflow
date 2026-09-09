import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const ResetPasswordSchema = z.object({
  token: z
    .string({ required_error: "Token é obrigatório." })
    .min(1, "Token não pode ser vazio."),
  password: z
    .string({ required_error: "Nova senha é obrigatória." })
    .min(8, "A senha precisa ter ao menos 8 caracteres.")
    .max(128),
});

export type ResetPassword = z.infer<typeof ResetPasswordSchema>;

export class ResetPasswordRequest implements ResetPassword {
  @ApiProperty({ description: "Token recebido por e-mail" })
  token!: string;

  @ApiProperty({ minLength: 8, example: "novaSenhaForte123" })
  password!: string;
}
