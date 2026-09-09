import { Injectable } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import { ClockService } from "../../shared/clock/clock.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";

/** Faixa de métricas consolidadas do painel operacional do dia. */
export class TodaySummaryDto {
  @ApiProperty({ example: "2026-09-11" }) date!: string;
  @ApiProperty({ example: "Quinta-feira, 11 de setembro de 2026" })
  dateLabel!: string;
  @ApiProperty({ description: "Total de consultas do dia" }) scheduled!: number;
  @ApiProperty() confirmed!: number;
  @ApiProperty({ description: "Na sala de espera" }) waiting!: number;
  @ApiProperty() inProgress!: number;
  @ApiProperty() completed!: number;
  @ApiProperty({ description: "Derivado da tolerância de atraso" })
  late!: number;
  @ApiProperty() cancelled!: number;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  /**
   * Uma consulta agrupada por status resolve cinco dos seis números; o sexto
   * (atrasadas) é uma contagem à parte porque não é status, é relógio.
   */
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

    const [grouped, late] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      this.prisma.appointment.count({
        where: {
          ...where,
          // Mesma regra do selo da tabela: atrasado é quem ainda não chegou.
          status: {
            in: [AppointmentStatus.AGENDADA, AppointmentStatus.CONFIRMADA],
          },
          startsAt: {
            gte: start,
            lt: new Date(
              now.getTime() - settings.lateToleranceMinutes * 60_000,
            ),
          },
        },
      }),
    ]);

    const countOf = (status: AppointmentStatus): number =>
      grouped.find((row) => row.status === status)?._count._all ?? 0;

    const cancelled = countOf(AppointmentStatus.CANCELADA);
    const total = grouped.reduce((sum, row) => sum + row._count._all, 0);

    return {
      date: isoDate,
      dateLabel: formatDateLabel(start),
      // "18 agendadas" é o total do dia, não só as em estado AGENDADA:
      // é assim que a recepção lê a métrica.
      scheduled: total - cancelled - countOf(AppointmentStatus.REAGENDADA),
      confirmed: countOf(AppointmentStatus.CONFIRMADA),
      waiting: countOf(AppointmentStatus.CHECK_IN),
      inProgress: countOf(AppointmentStatus.EM_ATENDIMENTO),
      completed: countOf(AppointmentStatus.CONCLUIDA),
      late,
      cancelled,
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
