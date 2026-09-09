import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export enum Order {
  ASC = "ASC",
  DESC = "DESC",
}

/**
 * Entrada padrão de toda listagem por offset.
 *
 * O `Max(100)` no limite não é decoração: sem teto, um `?limit=100000` derruba
 * a memória do processo e é o DoS mais barato que existe contra uma API de tabela.
 */
export class PageOptionsDto {
  @ApiPropertyOptional({
    description: "Número da página (inicia em 1)",
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @ApiPropertyOptional({
    description: "Itens por página",
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  readonly limit: number = 10;

  @ApiPropertyOptional({ enum: Order, default: Order.ASC })
  @IsEnum(Order)
  @IsOptional()
  readonly order: Order = Order.ASC;

  @ApiPropertyOptional({
    description: "Campo de ordenação (whitelist por módulo)",
  })
  @IsString()
  @IsOptional()
  readonly orderBy?: string;

  @ApiPropertyOptional({ description: "Busca textual livre" })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  readonly search?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  /** Direção em minúsculas, como o Prisma espera. */
  get direction(): "asc" | "desc" {
    return this.order === Order.DESC ? "desc" : "asc";
  }

  set direction(val: "asc" | "desc") {
    (this as { order: Order }).order = val === "desc" ? Order.DESC : Order.ASC;
  }
}
