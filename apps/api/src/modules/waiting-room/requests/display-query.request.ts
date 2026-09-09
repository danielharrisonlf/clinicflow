import { ApiProperty } from "@nestjs/swagger";
import { z } from "zod";

export const DisplayQuerySchema = z.object({
  token: z.string({ required_error: "Token é obrigatório." }).min(1),
});

export type DisplayQuery = z.infer<typeof DisplayQuerySchema>;

export class DisplayQueryRequest implements DisplayQuery {
  @ApiProperty({ description: "Token de autorização do painel de TV" })
  token!: string;
}
