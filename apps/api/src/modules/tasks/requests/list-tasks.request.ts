import { ApiPropertyOptional } from "@nestjs/swagger";
import { TaskStatus, TaskType } from "@prisma/client";
import { z } from "zod";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";

export const ListTasksQuerySchema = z.object({
  page: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).max(100).default(10),
  ),
  type: z.preprocess(
    (val) => (Array.isArray(val) ? val : val ? [val] : undefined),
    z.array(z.nativeEnum(TaskType)).optional(),
  ),
  status: z.preprocess(
    (val) => (Array.isArray(val) ? val : val ? [val] : undefined),
    z.array(z.nativeEnum(TaskStatus)).optional(),
  ),
  dueBefore: z.string().optional(),
  patientId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
});

export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;

export class ListTasksQueryRequest
  extends PageOptionsDto
  implements ListTasksQuery
{
  @ApiPropertyOptional({ enum: TaskType, isArray: true })
  type?: TaskType[];

  @ApiPropertyOptional({ enum: TaskStatus, isArray: true })
  status?: TaskStatus[];

  @ApiPropertyOptional({
    example: "2026-09-30",
    description: "Prazo até esta data",
  })
  dueBefore?: string;

  @ApiPropertyOptional()
  patientId?: string;

  @ApiPropertyOptional()
  assigneeId?: string;
}
