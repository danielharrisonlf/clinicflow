import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";
import { Order, PageOptionsDto } from "../../../common/dto/page-options.dto";

export const ListPatientsQuerySchema = z.object({
  page: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).default(1),
  ),
  limit: z.preprocess(
    (val) => (typeof val === "string" && val.trim() !== "" ? Number(val) : val),
    z.number().int().min(1).max(100).default(10),
  ),
  order: z.preprocess(
    (val) => (typeof val === "string" ? val.toUpperCase() : val),
    z.nativeEnum(Order).default(Order.ASC),
  ),
  orderBy: z.enum(["name", "createdAt"]).default("name"),
  search: z.string().trim().max(120).optional(),
  hasPendencies: z.preprocess((val) => {
    if (typeof val === "string") {
      if (val.toLowerCase() === "true") return true;
      if (val.toLowerCase() === "false") return false;
    }
    return val;
  }, z.boolean().optional()),
});

export type ListPatientsQuery = z.infer<typeof ListPatientsQuerySchema>;

export class ListPatientsQueryRequest
  extends PageOptionsDto
  implements ListPatientsQuery
{
  @ApiPropertyOptional({
    enum: ["name", "createdAt"],
    default: "name",
    description: "Campo de ordenação",
  })
  override orderBy: "name" | "createdAt" = "name";

  @ApiPropertyOptional({ description: "Apenas pacientes com pendência aberta" })
  hasPendencies?: boolean;
}
