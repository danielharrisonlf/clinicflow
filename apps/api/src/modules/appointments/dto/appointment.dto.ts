import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AppointmentStatus,
  AppointmentType,
  CancelReason,
} from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateAppointmentDto {
  @ApiProperty() @IsUUID() readonly patientId!: string;
  @ApiProperty() @IsUUID() readonly professionalId!: string;

  @ApiProperty({
    example: "2026-09-12",
    description: "AAAA-MM-DD no fuso da clínica",
  })
  @IsISO8601({ strict: true })
  readonly date!: string;

  @ApiProperty({ example: "14:30" })
  @Matches(TIME_PATTERN, { message: "Hora deve estar no formato HH:mm." })
  readonly time!: string;

  @ApiPropertyOptional({
    example: 30,
    description: "Padrão: duração do profissional",
  })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  readonly durationMinutes?: number;

  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  readonly type!: AppointmentType;

  @ApiPropertyOptional({ example: "Trazer exames laboratoriais anteriores" })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  readonly notes?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(40)
  @IsOptional()
  readonly room?: string;

  @ApiPropertyOptional({
    description:
      "Encaixe explícito confirmado pelo usuário. Fica registrado na auditoria.",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  readonly allowOverbooking?: boolean;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  readonly notes?: string;
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(40)
  @IsOptional()
  readonly room?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ example: "2026-09-12" })
  @IsISO8601({ strict: true })
  readonly date!: string;

  @ApiProperty({ example: "14:00" })
  @Matches(TIME_PATTERN)
  readonly time!: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  readonly durationMinutes?: number;

  @ApiProperty({
    example: "Paciente solicitou alteração por compromisso pessoal",
    description: "Obrigatório: registrado no histórico de auditoria.",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: "Descreva o motivo do reagendamento." })
  @MaxLength(500)
  readonly reason!: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  readonly allowOverbooking?: boolean;
}

export class CancelAppointmentDto {
  @ApiProperty({
    enum: CancelReason,
    description: "Código do motivo de cancelamento (obrigatório).",
  })
  @IsEnum(CancelReason)
  readonly reasonCode!: CancelReason;

  @ApiPropertyOptional({
    example: "Paciente ligou informando sintomas gripais.",
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  readonly note?: string;
}

export class CheckAvailabilityDto {
  @ApiProperty() @IsUUID() readonly professionalId!: string;
  @ApiProperty({ example: "2026-09-12" })
  @IsISO8601({ strict: true })
  readonly date!: string;
  @ApiProperty({ example: "14:30" })
  @Matches(TIME_PATTERN)
  readonly time!: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  readonly durationMinutes?: number;

  @ApiPropertyOptional({
    description: "Ignora esta consulta na checagem (uso no reagendamento)",
  })
  @IsUUID()
  @IsOptional()
  readonly ignoreAppointmentId?: string;
}

export class ListSlotsQueryDto {
  @ApiProperty() @IsUUID() readonly professionalId!: string;
  @ApiProperty({ example: "2026-09-12" })
  @IsISO8601({ strict: true })
  readonly date!: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  readonly durationMinutes?: number;
}

export class ListAppointmentsQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({
    example: "2026-09-11",
    description: "Dia único (painel do dia)",
  })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly date?: string;

  @ApiPropertyOptional({ example: "2026-09-08" })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly from?: string;

  @ApiPropertyOptional({ example: "2026-09-13" })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly to?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  readonly professionalId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() readonly patientId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus, isArray: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsEnum(AppointmentStatus, { each: true })
  @IsOptional()
  readonly status?: AppointmentStatus[];

  @ApiPropertyOptional({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  @IsOptional()
  readonly type?: AppointmentType;

  @ApiPropertyOptional({
    description: "Somente atrasadas (derivado da tolerância da clínica)",
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  readonly onlyLate?: boolean;
}

export class CalendarQueryDto {
  @ApiProperty({ example: "2026-09-08" })
  @IsISO8601({ strict: true })
  readonly from!: string;
  @ApiProperty({ example: "2026-09-13" })
  @IsISO8601({ strict: true })
  readonly to!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  readonly professionalId?: string;
}
