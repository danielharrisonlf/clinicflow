import { AppointmentStatus, AppointmentType } from "@prisma/client";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import type { ClockService } from "../../shared/clock/clock.service";
import type { PrismaService } from "../../shared/prisma/prisma.service";
import type { AppointmentWithRelations } from "../appointments/appointment.mapper";
import type { SettingsService } from "../settings/settings.service";
import { DashboardService } from "./dashboard.service";

const now = new Date("2026-09-11T12:00:00.000Z");
const appointment = {
  id: "appointment-1",
  code: 1042,
  startsAt: new Date("2026-09-11T12:30:00.000Z"),
  endsAt: new Date("2026-09-11T13:00:00.000Z"),
  type: AppointmentType.CONSULTA,
  status: AppointmentStatus.CONFIRMADA,
  checkedInAt: null,
  room: null,
  notes: null,
  isOverbooked: false,
  patient: { id: "patient-1", name: "Maria Silva", phone: "11999999999" },
  professional: { id: "professional-1", name: "Dra. Ana" },
} as AppointmentWithRelations;

function setup() {
  const groupBy = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const findFirst = jest.fn().mockResolvedValue(null);
  const prisma = {
    appointment: { groupBy, count, findFirst },
  } as unknown as PrismaService;
  const settings = {
    get: jest.fn().mockResolvedValue({ lateToleranceMinutes: 15 }),
  } as unknown as SettingsService;
  const clock = {
    now: jest.fn().mockReturnValue(now),
  } as unknown as ClockService;
  return {
    service: new DashboardService(prisma, settings, clock),
    groupBy,
    count,
    findFirst,
  };
}

describe("DashboardService.today", () => {
  it("mantém os contadores coerentes com todos os estados e filtra por profissional", async () => {
    const { service, groupBy, count, findFirst } = setup();
    const counts = [
      [AppointmentStatus.AGENDADA, 3],
      [AppointmentStatus.CONFIRMADA, 2],
      [AppointmentStatus.CHECK_IN, 1],
      [AppointmentStatus.EM_ATENDIMENTO, 1],
      [AppointmentStatus.CONCLUIDA, 4],
      [AppointmentStatus.CANCELADA, 2],
      [AppointmentStatus.REAGENDADA, 1],
    ] as const;
    groupBy.mockResolvedValue(
      counts.map(([status, n]) => ({ status, _count: { _all: n } })),
    );
    count.mockResolvedValue(1);
    findFirst.mockResolvedValue(appointment);

    const result = await service.today("2026-09-11", "professional-1");
    const { start, end } = ClinicTime.dayRange("2026-09-11");
    expect(result).toMatchObject({
      date: "2026-09-11",
      total: 14,
      scheduled: 11,
      open: 7,
      unconfirmed: 3,
      confirmed: 2,
      waiting: 1,
      inProgress: 1,
      completed: 4,
      cancelled: 2,
      rescheduled: 1,
      late: 1,
    });
    expect(result.nextArrival).toMatchObject({
      id: "appointment-1",
      patientName: "Maria Silva",
      status: AppointmentStatus.CONFIRMADA,
    });
    expect(groupBy.mock.calls[0][0].where).toEqual({
      startsAt: { gte: start, lt: end },
      professionalId: "professional-1",
    });
    expect(findFirst.mock.calls[0][0].where).toMatchObject({
      startsAt: { gte: now, lt: end },
      professionalId: "professional-1",
      status: {
        in: [AppointmentStatus.AGENDADA, AppointmentStatus.CONFIRMADA],
      },
    });
  });

  it("limita atrasos ao fim do dia solicitado e não procura chegada futura em dia passado", async () => {
    const { service, count, findFirst } = setup();
    await service.today("2026-09-10");
    const { start, end } = ClinicTime.dayRange("2026-09-10");
    expect(count.mock.calls[0][0].where.startsAt).toEqual({
      gte: start,
      lt: end,
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("retorna zero atrasos e chegada nula quando o dia ainda não começou", async () => {
    const { service, count, findFirst } = setup();
    const result = await service.today("2026-09-12");
    const { start, end } = ClinicTime.dayRange("2026-09-12");
    expect(count).not.toHaveBeenCalled();
    expect(findFirst.mock.calls[0][0].where.startsAt).toEqual({
      gte: start,
      lt: end,
    });
    expect(result.late).toBe(0);
    expect(result.nextArrival).toBeNull();
  });
});
