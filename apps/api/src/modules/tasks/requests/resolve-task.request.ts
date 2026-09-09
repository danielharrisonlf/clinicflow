import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export const ResolveTaskSchema = z.object({
  notes: z
    .string()
    .max(500, "Observações devem ter no máximo 500 caracteres.")
    .optional(),
});

export type ResolveTask = z.infer<typeof ResolveTaskSchema>;

export class ResolveTaskRequest implements ResolveTask {
  @ApiPropertyOptional({ example: "Retorno agendado para 20/09." })
  notes?: string;
}
