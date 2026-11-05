import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";

/**
 * Paginação do histórico de envios com o filtro por consulta.
 *
 * O filtro precisa estar declarado aqui: com `forbidNonWhitelisted`, um
 * `@Query() PageOptionsDto` puro recusava `?appointmentId=` com 400.
 */
export class ListNotificationsQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: "Apenas envios desta consulta" })
  @IsUUID()
  @IsOptional()
  readonly appointmentId?: string;
}
