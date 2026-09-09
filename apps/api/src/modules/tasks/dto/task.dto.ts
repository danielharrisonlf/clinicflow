import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TaskStatus, TaskType } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";

export class CreateTaskDto {
  @ApiProperty() @IsUUID() readonly patientId!: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  readonly appointmentId?: string;

  @ApiProperty({ enum: TaskType })
  @IsEnum(TaskType)
  readonly type!: TaskType;

  @ApiProperty({ example: "Retorno 30 dias após ajuste medicamentoso" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  readonly title!: string;

  @ApiPropertyOptional({ example: "2026-09-15" })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly dueAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  readonly notes?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(200)
  @IsOptional()
  readonly title?: string;
  @ApiPropertyOptional()
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly dueAt?: string;
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  readonly notes?: string;
  @ApiPropertyOptional({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  @IsOptional()
  readonly status?: TaskStatus;
}

export class ResolveTaskDto {
  @ApiPropertyOptional({ example: "Retorno agendado para 20/09." })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  readonly notes?: string;
}

export class ListTasksQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: TaskType, isArray: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsEnum(TaskType, { each: true })
  @IsOptional()
  readonly type?: TaskType[];

  @ApiPropertyOptional({ enum: TaskStatus, isArray: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsEnum(TaskStatus, { each: true })
  @IsOptional()
  readonly status?: TaskStatus[];

  @ApiPropertyOptional({
    example: "2026-09-30",
    description: "Prazo até esta data",
  })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly dueBefore?: string;

  @ApiPropertyOptional() @IsUUID() @IsOptional() readonly patientId?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() readonly assigneeId?: string;
}

/** DTO de resposta de tarefa do funil operacional. */
export class TaskResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty() patientPhone!: string;
  @ApiProperty({ nullable: true, type: String }) appointmentId!: string | null;
  @ApiProperty({ enum: TaskType }) type!: TaskType;
  @ApiProperty({ enum: TaskStatus }) status!: TaskStatus;
  @ApiProperty({ example: "Retorno 30 dias após ajuste medicamentoso" })
  title!: string;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty({ nullable: true, type: String }) dueAt!: string | null;
  @ApiProperty({
    example: "Urgente (Hoje)",
    description: "Rótulo derivado do prazo",
  })
  dueLabel!: string;
  @ApiProperty({ description: "Prazo vencido ou vence hoje" })
  isUrgent!: boolean;
  @ApiProperty({
    example: "Agendar retorno",
    description: "Ação rápida sugerida",
  })
  suggestedAction!: string;
  @ApiProperty({ nullable: true, type: String }) lastContactAt!: string | null;
  @ApiProperty() createdAt!: string;
}

/** Métricas consolidadas do resumo de tarefas. */
export class TaskSummaryDto {
  @ApiProperty({ description: "Retornos a agendar (15–30 dias)" })
  returnsToSchedule!: number;
  @ApiProperty({ description: "Confirmações pendentes (24h)" })
  pendingConfirmations!: number;
  @ApiProperty({ description: "Cancelamentos com no-show a resgatar" })
  noShowsToRecover!: number;
  @ApiProperty({ description: "Tarefas resolvidas hoje" })
  resolvedToday!: number;
}
