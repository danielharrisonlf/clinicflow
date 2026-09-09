import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AppointmentStatus,
  AppointmentType,
  CancelReason,
  Channel,
} from "@prisma/client";

/**
 * Estado exibido na tela, que não é o mesmo do banco.
 *
 * ATRASADA não existe no enum do Prisma de propósito: é uma leitura do relógio
 * sobre um estado real (agendada/confirmada que passou da tolerância). Se fosse
 * coluna, precisaria de um job escrevendo em milhares de linhas por dia só para
 * manter a tabela sincronizada com a hora.
 */
export type DerivedState = AppointmentStatus | "ATRASADA";

export class AppointmentListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Número curto do drawer ("Consulta #1042")' })
  code!: number;
  @ApiProperty() startsAt!: string;
  @ApiProperty() endsAt!: string;
  @ApiProperty({ example: "09:30", description: "Hora no fuso da clínica" })
  time!: string;
  @ApiProperty() durationMinutes!: number;

  @ApiProperty({ enum: AppointmentType }) type!: AppointmentType;
  @ApiProperty({ enum: AppointmentStatus }) status!: AppointmentStatus;
  @ApiProperty({ description: "Estado exibido, incluindo ATRASADA" })
  derivedState!: DerivedState;
  @ApiProperty({
    description: 'Rótulo pronto: "Atrasada 27min", "Aguardando 18min"',
  })
  stateLabel!: string;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: "Minutos desde o check-in",
  })
  waitingMinutes!: number | null;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: "Minutos de atraso",
  })
  lateMinutes!: number | null;

  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty() patientPhone!: string;
  @ApiProperty() professionalId!: string;
  @ApiProperty() professionalName!: string;

  @ApiPropertyOptional({ nullable: true, type: String }) room!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) notes!: string | null;

  @ApiProperty({
    enum: AppointmentStatus,
    isArray: true,
    description: "Transições permitidas — o front acende só os botões válidos",
  })
  allowedTransitions!: AppointmentStatus[];
}

export class AppointmentDetailDto extends AppointmentListItemDto {
  @ApiProperty({ nullable: true, type: String }) confirmedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) checkedInAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) startedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) completedAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) cancelledAt!: string | null;
  @ApiProperty({ enum: CancelReason, nullable: true })
  cancelReason!: CancelReason | null;
  @ApiProperty({ nullable: true, type: String }) cancelNote!: string | null;
  @ApiProperty({ description: "Documentos vinculados" })
  documentsCount!: number;
  @ApiProperty({ nullable: true, type: String }) rescheduledFromId!:
    | string
    | null;
}

/** Evento do histórico e auditoria da consulta. */
export class AppointmentEventDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AppointmentStatus, nullable: true })
  fromStatus!: AppointmentStatus | null;
  @ApiProperty({ enum: AppointmentStatus }) toStatus!: AppointmentStatus;
  @ApiProperty({ description: 'Rótulo pronto: "Check-in registrado"' })
  title!: string;
  @ApiProperty({ nullable: true, type: String }) actorName!: string | null;
  @ApiProperty({ enum: Channel }) channel!: Channel;
  @ApiProperty({ nullable: true, type: String }) reason!: string | null;
  @ApiProperty() createdAt!: string;
}

/** Bloco da grade semanal ou da agenda do profissional. */
export class CalendarSlotDto {
  @ApiProperty() id!: string;
  @ApiProperty() date!: string;
  @ApiProperty() time!: string;
  @ApiProperty() startsAt!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty() patientName!: string;
  @ApiProperty() professionalId!: string;
  @ApiProperty() professionalName!: string;
  @ApiProperty({ enum: AppointmentStatus }) status!: AppointmentStatus;
  @ApiProperty() derivedState!: DerivedState;
}

export class CalendarDayDto {
  @ApiProperty({ example: "2026-09-11" }) date!: string;
  @ApiProperty({ example: "Qui" }) weekdayLabel!: string;
  @ApiProperty({ type: [CalendarSlotDto] }) slots!: CalendarSlotDto[];
}

export class AvailabilityResultDto {
  @ApiProperty() available!: boolean;
  @ApiProperty({ type: [AppointmentListItemDto] })
  conflicts!: AppointmentListItemDto[];
  @ApiProperty({
    description: "Horário cai dentro da grade configurada do profissional",
  })
  withinSchedule!: boolean;
  @ApiProperty({ nullable: true, type: String }) message!: string | null;
}

export class TimeSlotDto {
  @ApiProperty({ example: "14:30" }) time!: string;
  @ApiProperty() startsAt!: string;
  @ApiProperty() available!: boolean;
}
