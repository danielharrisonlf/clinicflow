import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateProfessionalDto {
  @ApiProperty({ example: "Helena Prado" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly name!: string;

  @ApiProperty({ example: "Clínica Geral" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  readonly specialty!: string;

  @ApiProperty({
    example: "CRM",
    description: "Conselho: CRM, CRP, CRN, CREFITO…",
  })
  @IsString()
  @MaxLength(10)
  readonly councilType!: string;

  @ApiProperty({ example: "142.890" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  readonly councilNumber!: string;

  @ApiPropertyOptional({ example: 30 })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  readonly defaultDurationMinutes?: number;

  @ApiPropertyOptional({
    description: "Vincula a um acesso existente do sistema",
  })
  @IsUUID()
  @IsOptional()
  readonly userId?: string;
}

export class UpdateProfessionalDto extends PartialType(CreateProfessionalDto) {}

export class ChangeProfessionalStatusDto {
  @ApiProperty() @IsBoolean() readonly isActive!: boolean;
}

/** Uma janela de atendimento da grade ("Quarta-feira 08:00 – 17:00"). */
export class ScheduleWindowDto {
  @ApiProperty({
    minimum: 0,
    maximum: 6,
    description: "0 = domingo … 6 = sábado",
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  readonly weekday!: number;

  @ApiProperty({ example: "08:00" })
  @Matches(TIME_PATTERN, { message: "Horário deve estar no formato HH:mm." })
  readonly startTime!: string;

  @ApiProperty({ example: "17:00" })
  @Matches(TIME_PATTERN, { message: "Horário deve estar no formato HH:mm." })
  readonly endTime!: string;

  @ApiPropertyOptional({ example: "Sala 2" })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  readonly room?: string;
}

export class ReplaceScheduleDto {
  @ApiProperty({ type: [ScheduleWindowDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ScheduleWindowDto)
  readonly windows!: ScheduleWindowDto[];
}

/** DTO de resposta para listagem de profissionais. */
export class ProfessionalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() specialty!: string;
  @ApiProperty({ example: "Clínica Geral (CRM 142.890)" }) credential!: string;
  @ApiProperty({ example: "Seg, Qua, Qui, Sex" }) workdaysLabel!: string;
  @ApiProperty() defaultDurationMinutes!: number;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ description: "Consultas de hoje" })
  todayAppointmentsCount!: number;
  @ApiProperty({ description: "Pendências abertas dos pacientes atendidos" })
  openTasksCount!: number;
  @ApiProperty({ nullable: true, type: String }) userId!: string | null;
}

export class ProfessionalScheduleDto {
  @ApiProperty() professionalId!: string;
  @ApiProperty({ type: [ScheduleWindowDto] }) windows!: ScheduleWindowDto[];
  @ApiProperty({ example: "Seg, Qua, Qui e Sex, 08:00 às 17:00" })
  summary!: string;
}
