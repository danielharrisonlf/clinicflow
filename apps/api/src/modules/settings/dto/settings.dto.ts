import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CursorOptionsDto } from "../../../common/dto/cursor-page.dto";

/** Parâmetros operacionais da aba "Horários e Grade". */
export class UpdateSettingsDto {
  @ApiPropertyOptional({
    example: 30,
    description: "Duração padrão da consulta",
  })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  readonly defaultDurationMinutes?: number;

  @ApiPropertyOptional({
    example: 48,
    description: "Antecedência de envio da confirmação",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(240)
  @IsOptional()
  readonly confirmationLeadHours?: number;

  @ApiPropertyOptional({
    example: 30,
    description: "Prazo limite para retorno sem custo",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  readonly returnWindowDays?: number;

  @ApiPropertyOptional({
    example: 15,
    description: "Tolerância de atraso no check-in",
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  @IsOptional()
  readonly lateToleranceMinutes?: number;
}

/** Configurações de automação do WhatsApp. */
export class UpdateWhatsappSettingsDto {
  @ApiProperty()
  @IsBoolean()
  readonly whatsappEnabled!: boolean;

  @ApiProperty({
    description:
      "Placeholders: {{paciente}}, {{profissional}}, {{data}}, {{hora}}",
  })
  @IsString()
  @MaxLength(1000)
  readonly whatsappTemplate!: string;
}

export class SettingsResponseDto {
  @ApiProperty() clinicName!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() defaultDurationMinutes!: number;
  @ApiProperty() confirmationLeadHours!: number;
  @ApiProperty() returnWindowDays!: number;
  @ApiProperty() lateToleranceMinutes!: number;
}

export class WhatsappSettingsResponseDto {
  @ApiProperty() whatsappEnabled!: boolean;
  @ApiProperty() whatsappTemplate!: string;
  @ApiProperty({
    description: "Transporte configurado: log (dev) ou http (produção)",
  })
  transport!: string;
}

export class AuditLogQueryDto extends CursorOptionsDto {
  @ApiPropertyOptional() @IsUUID() @IsOptional() readonly actorId?: string;
  @ApiPropertyOptional({ example: "Appointment" })
  @IsString()
  @IsOptional()
  readonly entity?: string;
  @ApiPropertyOptional({ example: "appointment.cancelled" })
  @IsString()
  @IsOptional()
  readonly action?: string;

  @ApiPropertyOptional({ example: "2026-09-01" })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly from?: string;

  @ApiPropertyOptional({ example: "2026-09-30" })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly to?: string;
}

export class AuditLogItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true, type: String }) actorName!: string | null;
  @ApiProperty() action!: string;
  @ApiProperty() entity!: string;
  @ApiProperty() entityId!: string;
  @ApiProperty() channel!: string;
  @ApiProperty() createdAt!: string;
}
