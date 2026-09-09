import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const LoginSchema = z.object({
  email: z
    .string({ required_error: "E-mail é obrigatório." })
    .trim()
    .toLowerCase()
    .email("Informe um e-mail válido."),
  password: z
    .string({ required_error: "Senha é obrigatória." })
    .min(8, "A senha tem no mínimo 8 caracteres.")
    .max(128),
});

export type Login = z.infer<typeof LoginSchema>;

export class LoginRequest implements Login {
  @ApiProperty({ example: "renata.souza@clinicaviver.com.br" })
  email!: string;

  @ApiProperty({ example: "clinicflow123" })
  password!: string;
}
