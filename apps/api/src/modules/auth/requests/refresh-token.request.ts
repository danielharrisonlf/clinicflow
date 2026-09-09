import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string({ required_error: "Refresh token é obrigatório." })
    .min(1, "Refresh token não pode ser vazio."),
});

export type RefreshToken = z.infer<typeof RefreshTokenSchema>;

export class RefreshTokenRequest implements RefreshToken {
  @ApiProperty({ description: "Refresh token opaco emitido no login" })
  refreshToken!: string;
}
