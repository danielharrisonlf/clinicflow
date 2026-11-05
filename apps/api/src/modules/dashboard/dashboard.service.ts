import { Injectable } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import { ClockService } from "../../shared/clock/clock.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import {
  APPOINTMENT_INCLUDE,
  toAppointmentListItem,
} from "../appointments/appointment.mapper";
import { AppointmentListItemDto } from "../appointments/dto/appointment-response.dto";
import { SettingsService } from "../settings/settings.service";

/** Faixa de métricas consolidadas do painel operacional do dia. */
export class TodaySummaryDto {
  @ApiProperty({ example: "2026-09-11" }) date!: string;
  @ApiProperty({ example: "Quinta-feira, 11 de setembro de 2026" })
  dateLabel!: string;
  @ApiProperty({
    description: "Consultas do dia exceto canceladas e reagendadas",
  })
  scheduled!: number;
  @ApiProperty({
    description:
      "Todas as consultas do dia, inclusive canceladas e reagendadas",
  })
  total!: number;
  @ApiProperty({
    description: "Consultas ainda abertas no fluxo de atendimento",
  })
  open!: number;
  @ApiProperty({ description: "Consultas aguardando confirmação" })
  unconfirmed!: number;
  @ApiProperty() rescheduled!: number;
  @ApiProperty() confirmed!: number;
  @ApiProperty({ description: "Na sala de espera" }) waiting!: number;
  @ApiProperty() inProgress!: number;
  @ApiProperty() completed!: number;
  @ApiProperty({ description: "Derivado da tolerância de atraso" })
  late!: number;
  @ApiProperty() cancelled!: number;
  @ApiProperty({ type: AppointmentListItemDto, nullable: true })
  nextArrival!: AppointmentListItemDto | null;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  /** Agrupa estados do dia; atraso e próxima chegada dependem do relógio. */
  async today(
    date?: string,
    professionalId?: string,
  ): Promise<TodaySummaryDto> {
    const now = this.clock.now();
    const isoDate = date ?? ClinicTime.isoDateOf(now);
    const { start, end } = ClinicTime.dayRange(isoDate);
    const settings = await this.settings.get();

    const where: Prisma.AppointmentWhereInput = {
      startsAt: { gte: start, lt: end },
      ...(professionalId ? { professionalId } : {}),
    };

    const lateUntil = new Date(
      Math.min(
        end.getTime(),
        now.getTime() - settings.lateToleranceMinutes * 60_000,
      ),
    );

    const [grouped, late, nextArrival] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      lateUntil > start
        ? this.prisma.appointment.count({
            where: {
              ...where,
              // Mesma regra do selo da tabela: atrasado é quem ainda não chegou.
              status: {
                in: [AppointmentStatus.AGENDADA, AppointmentStatus.CONFIRMADA],
              },
              startsAt: {
                gte: start,
                lt: lateUntil,
              },
            },
          })
        : Promise.resolve(0),
      now < end
        ? this.prisma.appointment.findFirst({
            where: {
              ...where,
              startsAt: { gte: now > start ? now : start, lt: end },
              status: {
                in: [AppointmentStatus.AGENDADA, AppointmentStatus.CONFIRMADA],
              },
            },
            include: APPOINTMENT_INCLUDE,
            orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          })
        : Promise.resolve(null),
    ]);

    const countOf = (status: AppointmentStatus): number =>
      grouped.find((row) => row.status === status)?._count._all ?? 0;

    const cancelled = countOf(AppointmentStatus.CANCELADA);
    const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
    const rescheduled = countOf(AppointmentStatus.REAGENDADA);
    const unconfirmed = countOf(AppointmentStatus.AGENDADA);
    const confirmed = countOf(AppointmentStatus.CONFIRMADA);
    const waiting = countOf(AppointmentStatus.CHECK_IN);
    const inProgress = countOf(AppointmentStatus.EM_ATENDIMENTO);

    return {
      date: isoDate,
      dateLabel: formatDateLabel(start),
      // Mantém a semântica de scheduled consumida pelos clientes existentes.
      scheduled: total - cancelled - rescheduled,
      total,
      open: unconfirmed + confirmed + waiting + inProgress,
      unconfirmed,
      rescheduled,
      confirmed,
      waiting,
      inProgress,
      completed: countOf(AppointmentStatus.CONCLUIDA),
      late,
      cancelled,
      nextArrival: nextArrival
        ? toAppointmentListItem(nextArrival, now, settings.lateToleranceMinutes)
        : null,
    };
  }
}

/** Formata a data por extenso para exibição no painel ("Quinta-feira, 11 de setembro de 2026"). */
function formatDateLabel(instant: Date): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: ClinicTime.zone,
  }).format(instant);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
