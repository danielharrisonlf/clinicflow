import { ApiPropertyOptional } from "@nestjs/swagger";
import { TaskStatus } from "@prisma/client";
import { z } from "zod";

export const UpdateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  dueAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  notes: z.string().max(1000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

export class UpdateTaskRequest implements UpdateTask {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  dueAt?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  status?: TaskStatus;
}
