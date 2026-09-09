import { Injectable } from "@nestjs/common";
import { Professional } from "@prisma/client";
import { AppException } from "../../common/exceptions/app.exception";
import { ClinicTime, minutesOfDay } from "../../common/utils/clinic-time.util";
import { ClockService } from "../../shared/clock/clock.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import {
  APPOINTMENT_INCLUDE,
  toAppointmentListItem,
} from "./appointment.mapper";
import { ACTIVE_STATUSES } from "./appointment-status.machine";
import { CheckAvailabilityDto, ListSlotsQueryDto } from "./dto/appointment.dto";
import {
  AvailabilityResultDto,
  TimeSlotDto,
} from "./dto/appointment-response.dto";

/**
 * Disponibilidade da agenda: verificação de conflitos e horários livres.
 *
 * Separado de `AppointmentsService` porque é leitura pura e sem efeito colateral.
 */
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async resolveDuration(
    professional: Professional,
    requested?: number,
  ): Promise<number> {
    if (requested) return requested;
    if (professional.defaultDurationMinutes)
      return professional.defaultDurationMinutes;
    const settings = await this.settings.get();
    return settings.defaultDurationMinutes;
  }

  async getProfessionalOrThrow(id: string): Promise<Professional> {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });
    if (!professional) throw AppException.notFound("Profissional", id);
    if (!professional.isActive) {
      throw AppException.unprocessable(
        "PROFESSIONAL_INACTIVE",
        `${professional.name} está inativo e não recebe novos agendamentos.`,
      );
    }
    return professional;
  }

  /** Checagem prévia (POST /appointments/availability). Não grava nada. */
  async check(dto: CheckAvailabilityDto): Promise<AvailabilityResultDto> {
    const professional = await this.getProfessionalOrThrow(dto.professionalId);
    const durationMinutes = await this.resolveDuration(
      professional,
      dto.durationMinutes,
    );
    const startsAt = ClinicTime.combine(dto.date, dto.time);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

    const [conflicts, withinSchedule, settings] = await Promise.all([
      this.findOverlapping(
        dto.professionalId,
        startsAt,
        endsAt,
        dto.ignoreAppointmentId,
      ),
      this.isWithinSchedule(dto.professionalId, startsAt, endsAt),
      this.settings.get(),
    ]);

    const now = this.clock.now();
    const conflictItems = conflicts.map((c) =>
      toAppointmentListItem(c, now, settings.lateToleranceMinutes),
    );

    return {
      available: conflicts.length === 0 && withinSchedule,
      conflicts: conflictItems,
      withinSchedule,
      message: buildMessage(
        professional.name,
        conflictItems,
        withinSchedule,
        dto.time,
      ),
    };
  }

  /**
   * Consultas do profissional que se sobrepõem ao intervalo.
   *
   * Sobreposição é `início < fimNovo && fim > inícioNovo`: comparar só o horário
   * de início deixaria passar uma consulta de 60 min começando 30 min antes.
   */
  async findOverlapping(
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
    ignoreAppointmentId?: string,
  ) {
    return this.prisma.appointment.findMany({
      where: {
        professionalId,
        status: { in: ACTIVE_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startsAt: "asc" },
    });
  }

  /** O horário cai dentro de alguma janela configurada de atendimento? */
  async isWithinSchedule(
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<boolean> {
    const weekday = ClinicTime.weekdayOf(startsAt);
    const windows = await this.prisma.scheduleWindow.findMany({
      where: { professionalId, weekday },
    });

    // Sem grade configurada, a agenda é considerada livre
    if (windows.length === 0) return true;

    const start = minutesOfDay(ClinicTime.timeOf(startsAt));
    const end = minutesOfDay(ClinicTime.timeOf(endsAt));

    return windows.some(
      (window) =>
        start >= minutesOfDay(window.startTime) &&
        end <= minutesOfDay(window.endTime),
    );
  }

  /** Horários livres do dia (GET /appointments/slots), usado pelas telas 05 e 06. */
  async listSlots(query: ListSlotsQueryDto): Promise<TimeSlotDto[]> {
    const professional = await this.getProfessionalOrThrow(
      query.professionalId,
    );
    const durationMinutes = await this.resolveDuration(
      professional,
      query.durationMinutes,
    );
    const { start, end } = ClinicTime.dayRange(query.date);
    const weekday = ClinicTime.weekdayOf(start);

    const [windows, busy] = await Promise.all([
      this.prisma.scheduleWindow.findMany({
        where: { professionalId: query.professionalId, weekday },
        orderBy: { startTime: "asc" },
      }),
      this.prisma.appointment.findMany({
        where: {
          professionalId: query.professionalId,
          status: { in: ACTIVE_STATUSES },
          startsAt: { gte: start, lt: end },
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    if (windows.length === 0) return [];

    const slots: TimeSlotDto[] = [];
    for (const window of windows) {
      const windowStart = minutesOfDay(window.startTime);
      const windowEnd = minutesOfDay(window.endTime);

      for (
        let minute = windowStart;
        minute + durationMinutes <= windowEnd;
        minute += durationMinutes
      ) {
        const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
        const slotStart = ClinicTime.combine(query.date, time);
        const slotEnd = new Date(
          slotStart.getTime() + durationMinutes * 60_000,
        );

        const taken = busy.some(
          (appointment) =>
            appointment.startsAt < slotEnd && appointment.endsAt > slotStart,
        );

        slots.push({
          time,
          startsAt: slotStart.toISOString(),
          available: !taken,
        });
      }
    }

    return slots;
  }
}

function buildMessage(
  professionalName: string,
  conflicts: { patientName: string; durationMinutes: number }[],
  withinSchedule: boolean,
  time: string,
): string | null {
  const first = conflicts[0];
  if (first) {
    return (
      `${professionalName} já tem consulta às ${time}. ` +
      `${first.patientName} agendou ${first.durationMinutes} min. Deseja encaixar mesmo assim?`
    );
  }
  if (!withinSchedule) {
    return `${time} está fora da grade de atendimento configurada para ${professionalName}.`;
  }
  return null;
}
